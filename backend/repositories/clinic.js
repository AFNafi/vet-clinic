const crypto = require('node:crypto');
const oracledb = require('oracledb');
const { getConnection } = require('../database');

async function withConnection(callback) {
  const connection = await getConnection();
  try {
    return await callback(connection);
  } finally {
    await connection.close();
  }
}

function mapAppointment(row) {
  const status = row.APPOINTMENT_STATUS === 'COMPLETED'
    ? 'Completed'
    : row.APPOINTMENT_STATUS === 'CANCELLED'
      ? 'Cancelled'
      : row.CONFIRMATION_STATUS === 'PENDING'
        ? 'Pending confirmation'
        : row.CONFIRMATION_STATUS === 'ACCEPTED'
          ? 'Confirmed'
          : 'Scheduled';

  return {
    id: row.APPOINTMENT_ID,
    date: row.APPOINTMENT_DATE,
    time: row.APPOINTMENT_TIME,
    patientId: row.PET_ID,
    patient: row.PATIENT_NAME,
    owner: row.OWNER_NAME,
    veterinarianId: row.VETERINARIAN_ID,
    veterinarian: row.VETERINARIAN_NAME,
    reason: row.REASON,
    status
  };
}

async function getPatients(connection, search = '') {
  const searchClause = search
    ? `WHERE INSTR(LOWER(p.pet_name), :search) > 0
        OR INSTR(LOWER(s.species_name), :search) > 0
        OR INSTR(LOWER(b.breed_name), :search) > 0
        OR INSTR(LOWER(o.first_name || ' ' || o.last_name), :search) > 0`
    : '';
  const result = await connection.execute(
    `SELECT p.pet_id,
            p.pet_name,
            s.species_name,
            b.breed_name,
            TRIM(o.first_name || ' ' || o.last_name) AS owner_name,
            CASE
                WHEN p.is_active = 'N' THEN 'Inactive'
                WHEN EXISTS (
                    SELECT 1
                    FROM vaccinations vac
                    WHERE vac.pet_id = p.pet_id
                      AND vac.due_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 30
                ) THEN 'Vaccination due'
                ELSE 'Active'
            END AS patient_status,
            TO_CHAR(NVL((
                SELECT MAX(a.appointment_date)
                FROM appointments a
                WHERE a.pet_id = p.pet_id
                  AND a.appointment_status = 'COMPLETED'
            ), p.last_visit_date), 'YYYY-MM-DD') AS last_visit
     FROM pets p
     JOIN owners o ON o.owner_id = p.owner_id
     JOIN breeds b ON b.breed_id = p.breed_id
     JOIN species s ON s.species_id = b.species_id
     ${searchClause}
     ORDER BY p.pet_name, p.pet_id`,
    search ? { search: search.toLowerCase() } : {}
  );
  return result.rows.map((row) => ({
    id: row.PET_ID,
    name: row.PET_NAME,
    species: row.SPECIES_NAME,
    breed: row.BREED_NAME,
    owner: row.OWNER_NAME,
    status: row.PATIENT_STATUS,
    lastVisit: row.LAST_VISIT || null
  }));
}

async function getVeterinarians(connection) {
  const result = await connection.execute(
    `SELECT v.veterinarian_id,
            'Dr. ' || v.first_name || ' ' || v.last_name AS veterinarian_name,
            v.email,
            v.specialty
     FROM veterinarians v
     JOIN staff_accounts a ON a.veterinarian_id = v.veterinarian_id
     WHERE a.account_role = 'VETERINARIAN'
       AND v.is_active = 'Y'
     ORDER BY v.last_name, v.first_name`
  );
  return result.rows.map((row) => ({
    id: row.VETERINARIAN_ID,
    name: row.VETERINARIAN_NAME,
    email: row.EMAIL,
    specialty: row.SPECIALTY
  }));
}

async function getAppointments(connection, veterinarianId) {
  const veterinarianFilter = veterinarianId == null
    ? ''
    : 'WHERE a.veterinarian_id = :veterinarian_id';
  const result = await connection.execute(
    `SELECT a.appointment_id,
            TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
            TO_CHAR(a.appointment_date, 'HH24:MI') AS appointment_time,
            a.pet_id,
            p.pet_name AS patient_name,
            TRIM(o.first_name || ' ' || o.last_name) AS owner_name,
            a.veterinarian_id,
            'Dr. ' || v.first_name || ' ' || v.last_name AS veterinarian_name,
            a.reason,
            a.appointment_status,
            a.confirmation_status
     FROM appointments a
     JOIN pets p ON p.pet_id = a.pet_id
     JOIN owners o ON o.owner_id = p.owner_id
     JOIN veterinarians v ON v.veterinarian_id = a.veterinarian_id
     ${veterinarianFilter}
     ORDER BY a.appointment_date, a.appointment_id`,
    veterinarianId == null ? {} : { veterinarian_id: veterinarianId }
  );
  return result.rows.map(mapAppointment);
}

async function getInvoices(connection) {
  const result = await connection.execute(
    `SELECT i.invoice_id,
            p.pet_name AS patient_name,
            TRIM(o.first_name || ' ' || o.last_name) AS owner_name,
            TO_CHAR(i.invoice_date, 'YYYY-MM-DD') AS issued,
            NVL((
                SELECT SUM(s.quantity * s.unit_price)
                FROM appointment_services s
                WHERE s.appointment_id = i.appointment_id
            ), 0) +
            NVL((
                SELECT SUM(rx.quantity * rx.unit_price)
                FROM prescriptions rx
                WHERE rx.appointment_id = i.appointment_id
            ), 0) AS invoice_amount,
            i.invoice_status
     FROM invoices i
     JOIN appointments a ON a.appointment_id = i.appointment_id
     JOIN pets p ON p.pet_id = a.pet_id
     JOIN owners o ON o.owner_id = p.owner_id
     ORDER BY i.invoice_date DESC, i.invoice_id DESC`
  );
  return result.rows.map((row) => ({
    id: row.INVOICE_ID,
    patient: row.PATIENT_NAME,
    owner: row.OWNER_NAME,
    issued: row.ISSUED,
    amount: Number(row.INVOICE_AMOUNT),
    status: row.INVOICE_STATUS === 'PARTIAL'
      ? 'Part paid'
      : row.INVOICE_STATUS[0] + row.INVOICE_STATUS.slice(1).toLowerCase()
  }));
}

async function findPatient(connection, patientId) {
  const result = await connection.execute(
    `SELECT p.pet_id,
            p.pet_name,
            TRIM(o.first_name || ' ' || o.last_name) AS owner_name
     FROM pets p
     JOIN owners o ON o.owner_id = p.owner_id
     WHERE p.pet_id = :patient_id
       AND p.is_active = 'Y'`,
    { patient_id: patientId }
  );
  return result.rows[0] || null;
}

async function ensureSpecies(connection, speciesName) {
  let result = await connection.execute(
    'SELECT species_id FROM species WHERE LOWER(species_name) = LOWER(:name)',
    { name: speciesName }
  );
  if (result.rows.length) return result.rows[0].SPECIES_ID;

  try {
    result = await connection.execute(
      `INSERT INTO species (species_name)
       VALUES (:name)
       RETURNING species_id INTO :species_id`,
      {
        name: speciesName,
        species_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    return result.outBinds.species_id[0];
  } catch (error) {
    if (error.errorNum !== 1) throw error;
    result = await connection.execute(
      'SELECT species_id FROM species WHERE LOWER(species_name) = LOWER(:name)',
      { name: speciesName }
    );
    if (!result.rows.length) throw error;
    return result.rows[0].SPECIES_ID;
  }
}

async function ensureBreed(connection, speciesId, breedName) {
  let result = await connection.execute(
    `SELECT breed_id FROM breeds
     WHERE species_id = :species_id AND LOWER(breed_name) = LOWER(:name)`,
    { species_id: speciesId, name: breedName }
  );
  if (result.rows.length) return result.rows[0].BREED_ID;

  try {
    result = await connection.execute(
      `INSERT INTO breeds (species_id, breed_name)
       VALUES (:species_id, :name)
       RETURNING breed_id INTO :breed_id`,
      {
        species_id: speciesId,
        name: breedName,
        breed_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    return result.outBinds.breed_id[0];
  } catch (error) {
    if (error.errorNum !== 1) throw error;
    result = await connection.execute(
      `SELECT breed_id FROM breeds
       WHERE species_id = :species_id AND LOWER(breed_name) = LOWER(:name)`,
      { species_id: speciesId, name: breedName }
    );
    if (!result.rows.length) throw error;
    return result.rows[0].BREED_ID;
  }
}

function splitOwnerName(value) {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], 'Owner'];
  return [parts.slice(0, -1).join(' '), parts.at(-1)];
}

async function createPatient(connection, values) {
  const [firstName, lastName] = splitOwnerName(values.owner);
  const ownerResult = await connection.execute(
    `INSERT INTO owners (first_name, last_name, phone, email, address_line)
     VALUES (:first_name, :last_name, :phone, :email, :address_line)
     RETURNING owner_id INTO :owner_id`,
    {
      first_name: firstName,
      last_name: lastName,
      phone: '555-0100',
      email: `owner-${crypto.randomUUID()}@example.test`,
      address_line: '1 Sample Lane',
      owner_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    }
  );
  const speciesId = await ensureSpecies(connection, values.species);
  const breedId = await ensureBreed(connection, speciesId, values.breed);
  const petResult = await connection.execute(
    `INSERT INTO pets (owner_id, breed_id, pet_name, sex)
     VALUES (:owner_id, :breed_id, :pet_name, 'U')
     RETURNING pet_id INTO :pet_id`,
    {
      owner_id: ownerResult.outBinds.owner_id[0],
      breed_id: breedId,
      pet_name: values.name,
      pet_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    }
  );
  return petResult.outBinds.pet_id[0];
}

async function insertAppointment(connection, values) {
  const result = await connection.execute(
    `INSERT INTO appointments (
         pet_id, veterinarian_id, appointment_date, appointment_status,
         confirmation_status, reason
     )
     VALUES (
         :pet_id, :veterinarian_id,
         TO_DATE(:appointment_datetime, 'YYYY-MM-DD HH24:MI'),
         'SCHEDULED', 'PENDING', :reason
     )
     RETURNING appointment_id INTO :appointment_id`,
    {
      pet_id: values.patientId,
      veterinarian_id: values.veterinarianId,
      appointment_datetime: `${values.date} ${values.time}`,
      reason: values.reason,
      appointment_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    }
  );
  return result.outBinds.appointment_id[0];
}

async function getAppointment(connection, appointmentId) {
  const result = await connection.execute(
    `SELECT a.appointment_id,
            TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
            TO_CHAR(a.appointment_date, 'HH24:MI') AS appointment_time,
            a.pet_id,
            p.pet_name AS patient_name,
            TRIM(o.first_name || ' ' || o.last_name) AS owner_name,
            a.veterinarian_id,
            'Dr. ' || v.first_name || ' ' || v.last_name AS veterinarian_name,
            a.reason,
            a.appointment_status,
            a.confirmation_status
     FROM appointments a
     JOIN pets p ON p.pet_id = a.pet_id
     JOIN owners o ON o.owner_id = p.owner_id
     JOIN veterinarians v ON v.veterinarian_id = a.veterinarian_id
     WHERE a.appointment_id = :appointment_id`,
    { appointment_id: appointmentId }
  );
  return result.rows[0] ? mapAppointment(result.rows[0]) : null;
}

module.exports = {
  createPatient,
  findPatient,
  getAppointment,
  getAppointments,
  getInvoices,
  getPatients,
  getVeterinarians,
  insertAppointment,
  withConnection
};
