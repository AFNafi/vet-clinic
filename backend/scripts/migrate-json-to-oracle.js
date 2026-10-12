const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const oracledb = require('oracledb');
const { closeDatabase, getConnection, initializeDatabase } = require('../database');
const {
  patients,
  veterinarians,
  appointments,
  invoices
} = require('../data/clinic');

const migrationName = 'json-demo-data-to-oracle-v1';
const accountsPath = process.env.AUTH_STORE_PATH ||
  path.join(__dirname, '..', 'data', 'staff-accounts.json');
const accounts = fs.existsSync(accountsPath)
  ? JSON.parse(fs.readFileSync(accountsPath, 'utf8'))
  : [];

const vetIdMap = new Map();
const patientIdMap = new Map();
const ownerIdMap = new Map();
const sourceAccounts = Array.isArray(accounts) ? accounts : [];
const profiles = Array.isArray(veterinarians) ? veterinarians : [];

function normalizeName(value) {
  return String(value || '').replace(/^Dr\.?\s+/i, '').trim().toLowerCase();
}

function splitName(value) {
  const parts = String(value || '').replace(/^Dr\.?\s+/i, '').trim().split(/\s+/);
  if (parts.length < 2 || !parts[0]) {
    return [parts[0] || 'Demo', 'Veterinarian'];
  }
  return [parts.slice(0, -1).join(' '), parts.at(-1)];
}

async function insertReturning(connection, sql, binds, outputName, outputType) {
  const result = await connection.execute(sql, {
    ...binds,
    [outputName]: { dir: oracledb.BIND_OUT, type: outputType }
  });
  return result.outBinds[outputName][0];
}

async function ensureOwner(connection, name) {
  const normalized = normalizeName(name);
  if (ownerIdMap.has(normalized)) return ownerIdMap.get(normalized);

  const [firstName, lastName] = String(name).trim().split(/\s+/).length === 1
    ? [String(name).trim(), 'Owner']
    : [
        String(name).trim().split(/\s+/).slice(0, -1).join(' '),
        String(name).trim().split(/\s+/).at(-1)
      ];
  const ownerId = await insertReturning(
    connection,
    `INSERT INTO owners (first_name, last_name, phone, email, address_line)
     VALUES (:first_name, :last_name, :phone, :email, :address_line)
     RETURNING owner_id INTO :owner_id`,
    {
      first_name: firstName,
      last_name: lastName,
      phone: '555-0100',
      email: `legacy-owner-${crypto.randomUUID()}@example.test`,
      address_line: '1 Sample Lane'
    },
    'owner_id',
    oracledb.NUMBER
  );
  ownerIdMap.set(normalized, ownerId);
  return ownerId;
}

async function ensureBreed(connection, speciesName, breedName) {
  let result = await connection.execute(
    `SELECT b.breed_id
     FROM breeds b
     JOIN species s ON s.species_id = b.species_id
     WHERE LOWER(s.species_name) = LOWER(:species_name)
       AND LOWER(b.breed_name) = LOWER(:breed_name)`,
    { species_name: speciesName, breed_name: breedName }
  );
  if (result.rows.length) return result.rows[0].BREED_ID;

  result = await connection.execute(
    'SELECT species_id FROM species WHERE LOWER(species_name) = LOWER(:species_name)',
    { species_name: speciesName }
  );
  let speciesId = result.rows[0]?.SPECIES_ID;
  if (!speciesId) {
    speciesId = await insertReturning(
      connection,
      `INSERT INTO species (species_name)
       VALUES (:species_name)
       RETURNING species_id INTO :species_id`,
      { species_name: speciesName },
      'species_id',
      oracledb.NUMBER
    );
  }

  return insertReturning(
    connection,
    `INSERT INTO breeds (species_id, breed_name)
     VALUES (:species_id, :breed_name)
     RETURNING breed_id INTO :breed_id`,
    { species_id: speciesId, breed_name: breedName },
    'breed_id',
    oracledb.NUMBER
  );
}

async function addVeterinarian(connection, profile) {
  const email = String(profile.email || '').trim().toLowerCase();
  if (email) {
    const existing = await connection.execute(
      `SELECT veterinarian_id
       FROM veterinarians
       WHERE LOWER(email) = :email`,
      { email }
    );
    if (existing.rows.length) {
      const veterinarianId = existing.rows[0].VETERINARIAN_ID;
      await connection.execute(
        `UPDATE veterinarians
         SET specialty = COALESCE(specialty, :specialty)
         WHERE veterinarian_id = :veterinarian_id`,
        {
          specialty: String(profile.specialty || 'General Practice').slice(0, 100),
          veterinarian_id: veterinarianId
        }
      );
      return veterinarianId;
    }
  }
  const [firstName, lastName] = splitName(profile.name);
  const veterinarianEmail = email.length <= 100
    ? email
    : `legacy-vet-${crypto.randomUUID()}@example.test`;
  return insertReturning(
    connection,
    `INSERT INTO veterinarians (
         first_name, last_name, license_number, phone, email, specialty
     )
     VALUES (
         :first_name, :last_name, :license_number, :phone, :email, :specialty
     )
     RETURNING veterinarian_id INTO :veterinarian_id`,
    {
      first_name: firstName,
      last_name: lastName,
      license_number: `WEB-${String(profile.id || crypto.randomUUID()).slice(0, 40)}`,
      phone: '555-0200',
      email: veterinarianEmail,
      specialty: String(profile.specialty || 'General Practice').slice(0, 100)
    },
    'veterinarian_id',
    oracledb.NUMBER
  );
}

async function importPatients(connection) {
  for (const patient of patients) {
    const ownerId = await ensureOwner(connection, patient.owner);
    const breedId = await ensureBreed(connection, patient.species, patient.breed);
    const patientId = await insertReturning(
      connection,
      `INSERT INTO pets (
           owner_id, breed_id, pet_name, sex, is_active, last_visit_date
       )
       VALUES (
           :owner_id, :breed_id, :pet_name, 'U', :is_active,
           CASE WHEN :last_visit IS NULL THEN NULL
                ELSE TO_DATE(:last_visit, 'YYYY-MM-DD') END
       )
       RETURNING pet_id INTO :pet_id`,
      {
        owner_id: ownerId,
        breed_id: breedId,
        pet_name: patient.name,
        is_active: patient.status === 'Inactive' ? 'N' : 'Y',
        last_visit: patient.lastVisit || null
      },
      'pet_id',
      oracledb.NUMBER
    );
    patientIdMap.set(patient.id, patientId);

    if (patient.status === 'Vaccination due') {
      await connection.execute(
        `INSERT INTO vaccinations (
             pet_id, vaccine_name, vaccination_date, due_date, notes
         )
         VALUES (
             :pet_id, 'Legacy demo vaccination',
             TRUNC(SYSDATE) - 335, TRUNC(SYSDATE) + 14,
             'Migrated from the local demo store'
         )`,
        { pet_id: patientId }
      );
    }
  }
}

async function importAppointments(connection) {
  for (const appointment of appointments) {
    const patientId = patientIdMap.get(appointment.patientId);
    let veterinarianId = vetIdMap.get(appointment.veterinarianId);
    if (!veterinarianId) {
      const profile = profiles.find((item) => item.id === appointment.veterinarianId);
      if (!profile) throw new Error(`No veterinarian profile maps to legacy ID ${appointment.veterinarianId}.`);
      veterinarianId = await addVeterinarian(connection, profile);
      vetIdMap.set(appointment.veterinarianId, veterinarianId);
    }
    if (!patientId) throw new Error(`No patient maps to legacy ID ${appointment.patientId}.`);
    const status = String(appointment.status || '').toLowerCase();
    const appointmentStatus = status === 'completed'
      ? 'COMPLETED'
      : status === 'cancelled'
        ? 'CANCELLED'
        : 'SCHEDULED';
    const confirmationStatus = status === 'pending confirmation'
      ? 'PENDING'
      : status === 'confirmed'
        ? 'ACCEPTED'
        : 'CONFIRMED';

    await connection.execute(
      `INSERT INTO appointments (
           pet_id, veterinarian_id, appointment_date, appointment_status,
           confirmation_status, reason
       )
       VALUES (
           :pet_id, :veterinarian_id,
           TO_DATE(:appointment_datetime, 'YYYY-MM-DD HH24:MI'),
           :appointment_status, :confirmation_status, :reason
       )`,
      {
        pet_id: patientId,
        veterinarian_id: veterinarianId,
        appointment_datetime: `${appointment.date} ${appointment.time}`,
        appointment_status: appointmentStatus,
        confirmation_status: confirmationStatus,
        reason: appointment.reason
      }
    );
  }
}

async function importInvoices(connection) {
  for (const invoice of invoices) {
    const patient = patients.find((item) =>
      item.name === invoice.patient && item.owner === invoice.owner);
    const patientId = patientIdMap.get(patient?.id);
    const veterinarianId = vetIdMap.values().next().value;
    const amount = Number(invoice.amount);
    if (!patientId || !veterinarianId || !Number.isFinite(amount) || amount < 0) {
      throw new Error(`Legacy invoice ${invoice.id} cannot be mapped to a valid pet or amount.`);
    }

    const appointmentId = await insertReturning(
      connection,
      `INSERT INTO appointments (
           pet_id, veterinarian_id, appointment_date,
           appointment_status, confirmation_status, reason
       )
       VALUES (
           :pet_id, :veterinarian_id,
           TO_DATE(:appointment_datetime, 'YYYY-MM-DD HH24:MI'),
           'COMPLETED', 'CONFIRMED', 'Migrated demo invoice'
       )
       RETURNING appointment_id INTO :appointment_id`,
      {
        pet_id: patientId,
        veterinarian_id: veterinarianId,
        appointment_datetime: `${invoice.issued} 12:00`
      },
      'appointment_id',
      oracledb.NUMBER
    );
    const serviceId = await insertReturning(
      connection,
      `INSERT INTO services (service_name, standard_price)
       VALUES (:service_name, :standard_price)
       RETURNING service_id INTO :service_id`,
      {
        service_name: `Migrated demo invoice ${invoice.id}`,
        standard_price: amount
      },
      'service_id',
      oracledb.NUMBER
    );
    await connection.execute(
      `INSERT INTO appointment_services (
           appointment_id, service_id, quantity, unit_price, notes
       )
       VALUES (
           :appointment_id, :service_id, 1, :unit_price,
           'Migrated from the local demo invoice'
       )`,
      { appointment_id: appointmentId, service_id: serviceId, unit_price: amount }
    );
    const invoiceId = await insertReturning(
      connection,
      `INSERT INTO invoices (appointment_id, invoice_date, invoice_status)
       VALUES (
           :appointment_id, TO_DATE(:invoice_date, 'YYYY-MM-DD'), 'UNPAID'
       )
       RETURNING invoice_id INTO :invoice_id`,
      {
        appointment_id: appointmentId,
        invoice_date: invoice.issued
      },
      'invoice_id',
      oracledb.NUMBER
    );

    const oldStatus = String(invoice.status || '').toLowerCase();
    const paymentAmount = oldStatus === 'paid'
      ? amount
      : oldStatus === 'part paid'
        ? Math.round(amount / 2 * 100) / 100
        : 0;
    if (paymentAmount > 0) {
      await connection.execute(
        `INSERT INTO payments (invoice_id, amount, payment_method)
         VALUES (:invoice_id, :amount, 'CASH')`,
        { invoice_id: invoiceId, amount: paymentAmount }
      );
    }
  }
}

async function importAccounts(connection) {
  for (const account of sourceAccounts) {
    const role = String(account.role || '').toLowerCase();
    let veterinarianId = null;
    let specialty = null;
    if (role === 'veterinarian') {
      const profile = profiles.find((item) =>
        item.id === account.veterinarianId ||
        item.email?.toLowerCase() === account.email?.toLowerCase() ||
        normalizeName(item.name) === normalizeName(account.name));
      const sourceId = profile?.id;
      if (sourceId !== undefined && vetIdMap.has(sourceId)) {
        veterinarianId = vetIdMap.get(sourceId);
      } else {
        veterinarianId = await addVeterinarian(connection, {
          id: sourceId || account.id,
          name: profile?.name || account.name,
          email: profile?.email || account.email,
          specialty: profile?.specialty || account.specialty || 'General Practice'
        });
        if (sourceId !== undefined) vetIdMap.set(sourceId, veterinarianId);
      }
      specialty = String(profile?.specialty || account.specialty ||
        account.title?.split('·')[1]?.trim() || 'General Practice').slice(0, 60);
    } else if (role !== 'admin') {
      throw new Error(`Legacy account ${account.id} has an unsupported role.`);
    }

    const salt = String(account.salt || '');
    const passwordHash = String(account.passwordHash || '');
    if (!salt || !passwordHash) {
      throw new Error(`Legacy account ${account.id} has no stored password hash.`);
    }
    await connection.execute(
      `INSERT INTO staff_accounts (
           account_id, email, full_name, title, account_role, initials,
           password_salt, password_hash, specialty, veterinarian_id
       )
       VALUES (
           :account_id, :email, :full_name, :title, :account_role, :initials,
           :password_salt, :password_hash, :specialty, :veterinarian_id
       )`,
      {
        account_id: account.id,
        email: String(account.email).toLowerCase(),
        full_name: account.name,
        title: account.title || (role === 'admin'
          ? 'Clinic administrator'
          : `Veterinarian · ${specialty}`),
        account_role: role.toUpperCase(),
        initials: account.initials || String(account.name).trim().split(/\s+/)
          .slice(0, 2).map((part) => part[0].toUpperCase()).join(''),
        password_salt: salt,
        password_hash: passwordHash,
        specialty,
        veterinarian_id: veterinarianId
      }
    );
  }
}

async function migrate() {
  await initializeDatabase();
  const connection = await getConnection();
  try {
    const existing = await connection.execute(
      'SELECT migration_name FROM backend_migrations WHERE migration_name = :name',
      { name: migrationName }
    );
    if (existing.rows.length) {
      console.log('The local JSON migration has already completed; no data was changed.');
      return;
    }

    for (const profile of profiles) {
      vetIdMap.set(profile.id, await addVeterinarian(connection, profile));
    }
    await importPatients(connection);
    await importAppointments(connection);
    await importInvoices(connection);
    await importAccounts(connection);
    await connection.execute(
      'INSERT INTO backend_migrations (migration_name) VALUES (:name)',
      { name: migrationName }
    );
    await connection.commit();
    console.log(
      `Migrated ${patients.length} patients, ${appointments.length} appointments, ` +
      `${invoices.length} invoices, and ${sourceAccounts.length} staff accounts.`
    );
    console.log('The original JSON files were left untouched as a backup.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
    await closeDatabase();
  }
}

migrate().catch((error) => {
  console.error('The local JSON migration failed and was rolled back.', error);
  process.exitCode = 1;
});
