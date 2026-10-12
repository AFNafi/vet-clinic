const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { after, before, test } = require('node:test');

const suffix = crypto.randomUUID();
const adminInvitationCode = crypto.randomBytes(24).toString('base64url');
const veterinarianInvitationCode = crypto.randomBytes(24).toString('base64url');
const adminPassword = crypto.randomBytes(24).toString('base64url');
const veterinarianPassword = crypto.randomBytes(24).toString('base64url');
const adminEmail = `test-admin-${suffix}@example.test`;
const veterinarianEmail = `test-vet-${suffix}@example.test`;
const veterinarianLicense = `TEST-${suffix}`;
const speciesName = `Test species ${suffix.slice(0, 8)}`;
const breedName = `Test breed ${suffix.slice(0, 8)}`;
const patientName = `Test pet ${suffix.slice(0, 8)}`;
const appointmentReason = `Integration test ${suffix}`;

process.env.ADMIN_REGISTRATION_CODE = adminInvitationCode;
process.env.VETERINARIAN_REGISTRATION_CODE = veterinarianInvitationCode;

const app = require('../server');
const { closeDatabase, getConnection, initializeDatabase } = require('../database');
const oracledb = require('oracledb');

let databaseReady = false;
let server;
let baseUrl;
let patientId;
let appointmentId;
let invoiceId;
let serviceId;

before(async () => {
  await initializeDatabase();
  databaseReady = true;
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }

  if (databaseReady) {
    const connection = await getConnection();
    try {
      const veterinarianResult = await connection.execute(
        'SELECT veterinarian_id FROM veterinarians WHERE email = :email',
        { email: veterinarianEmail }
      );
      const testVeterinarianId = veterinarianResult.rows[0]?.VETERINARIAN_ID;
      const patientResult = await connection.execute(
        `SELECT pet_id, owner_id FROM pets WHERE pet_name = :name`,
        { name: patientName }
      );
      const testPatientId = patientResult.rows[0]?.PET_ID;
      const testOwnerId = patientResult.rows[0]?.OWNER_ID;
      const appointmentResult = testPatientId && testVeterinarianId
        ? await connection.execute(
            `SELECT appointment_id FROM appointments
             WHERE pet_id = :pet_id
               AND veterinarian_id = :veterinarian_id
               AND reason = :reason`,
            {
              pet_id: testPatientId,
              veterinarian_id: testVeterinarianId,
              reason: appointmentReason
            }
          )
        : { rows: [] };
      const testAppointmentId = appointmentResult.rows[0]?.APPOINTMENT_ID;
      const invoiceResult = testAppointmentId
        ? await connection.execute(
            'SELECT invoice_id FROM invoices WHERE appointment_id = :id',
            { id: testAppointmentId }
          )
        : { rows: [] };
      const testInvoiceId = invoiceResult.rows[0]?.INVOICE_ID;
      if (testInvoiceId) {
        await connection.execute('DELETE FROM payments WHERE invoice_id = :id', {
          id: testInvoiceId
        });
      }
      if (testAppointmentId) {
        await connection.execute('DELETE FROM appointment_services WHERE appointment_id = :id', {
          id: testAppointmentId
        });
        await connection.execute('DELETE FROM invoices WHERE appointment_id = :id', {
          id: testAppointmentId
        });
        await connection.execute('DELETE FROM appointment_audit WHERE appointment_id = :id', {
          id: testAppointmentId
        });
        await connection.execute('DELETE FROM appointments WHERE appointment_id = :id', {
          id: testAppointmentId
        });
      }
      await connection.execute('DELETE FROM services WHERE service_name = :name', {
        name: `Test service ${suffix}`
      });
      if (testPatientId) {
        await connection.execute('DELETE FROM pets WHERE pet_id = :id', { id: testPatientId });
      }
      if (testOwnerId) {
        await connection.execute('DELETE FROM owners WHERE owner_id = :id', { id: testOwnerId });
      }
      await connection.execute(
        `DELETE FROM breeds
         WHERE LOWER(breed_name) = LOWER(:breed_name)
           AND species_id = (
             SELECT species_id FROM species WHERE LOWER(species_name) = LOWER(:species_name)
           )`,
        { breed_name: breedName, species_name: speciesName }
      );
      await connection.execute(
        'DELETE FROM species WHERE LOWER(species_name) = LOWER(:species_name)',
        { species_name: speciesName }
      );
      await connection.execute('DELETE FROM staff_accounts WHERE email = :email', {
        email: adminEmail
      });
      await connection.execute('DELETE FROM staff_accounts WHERE email = :email', {
        email: veterinarianEmail
      });
      await connection.execute('DELETE FROM veterinarians WHERE email = :email', {
        email: veterinarianEmail
      });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.close();
      await closeDatabase();
    }
  }
});

const request = (route, { method = 'GET', cookie, body } = {}) => fetch(`${baseUrl}${route}`, {
  method,
  headers: {
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(cookie ? { cookie } : {})
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
});

const cookieFrom = (response) => {
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie, 'the auth response should set a session cookie');
  return cookie.split(';', 1)[0];
};

function futureClinicDate(daysAhead = 45) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  while (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

test('Oracle-backed staff, patient, appointment, and invoice workflows', async () => {
  const publicPage = await request('/');
  assert.equal(publicPage.status, 200);
  assert.match(await publicPage.text(), /name="licenseNumber"/);
  assert.equal((await request('/api/dashboard')).status, 401);

  const options = await (await request('/api/auth/options')).json();
  assert.deepEqual(options, {
    adminRegistrationEnabled: true,
    veterinarianRegistrationEnabled: true
  });

  const adminResponse = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Test Administrator',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      invitationCode: adminInvitationCode
    }
  });
  assert.equal(adminResponse.status, 201);
  const adminUser = (await adminResponse.json()).user;
  assert.equal(adminUser.role, 'admin');
  const adminCookie = cookieFrom(adminResponse);

  const veterinarianResponse = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Dr. Test Veterinarian',
      email: veterinarianEmail,
      password: veterinarianPassword,
      role: 'veterinarian',
      specialty: 'General Practice',
      licenseNumber: veterinarianLicense,
      phone: '555-0199',
      invitationCode: veterinarianInvitationCode
    }
  });
  assert.equal(veterinarianResponse.status, 201);
  const veterinarian = (await veterinarianResponse.json()).user;
  const veterinarianCookie = cookieFrom(veterinarianResponse);
  assert.equal(Number.isInteger(veterinarian.veterinarianId), true);
  assert.equal('passwordHash' in veterinarian, false);

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: veterinarianEmail, password: veterinarianPassword }
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).user.id, veterinarian.id);

  const patientResponse = await request('/api/patients', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      name: patientName,
      species: speciesName,
      breed: breedName,
      owner: `Test Owner ${suffix.slice(0, 8)}`
    }
  });
  assert.equal(patientResponse.status, 201);
  const patient = await patientResponse.json();
  patientId = patient.id;
  assert.equal(patient.lastVisit, null);
  assert.equal(patient.status, 'Active');

  const connection = await getConnection();
  try {
    const ownerResult = await connection.execute(
      'SELECT owner_id FROM pets WHERE pet_id = :id',
      { id: patientId }
    );
    assert.ok(ownerResult.rows[0]?.OWNER_ID);
    const serviceResult = await connection.execute(
      `INSERT INTO services (service_name, standard_price)
       VALUES (:name, 75)
       RETURNING service_id INTO :id`,
      {
        name: `Test service ${suffix}`,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    serviceId = serviceResult.outBinds.id[0];
    await connection.commit();
  } finally {
    await connection.close();
  }

  const search = await request(`/api/patients?search=${encodeURIComponent(patientName)}`, {
    cookie: veterinarianCookie
  });
  assert.equal(search.status, 200);
  assert.deepEqual((await search.json()).map((row) => row.id), [patientId]);
  assert.equal((await request('/api/invoices', { cookie: veterinarianCookie })).status, 403);
  assert.equal((await request('/api/patients', {
    method: 'POST',
    cookie: veterinarianCookie,
    body: { name: 'Forbidden', species: 'Cat', breed: 'Tabby', owner: 'Test Owner' }
  })).status, 403);

  const appointmentPayload = {
    patientId,
    veterinarianId: veterinarian.veterinarianId,
    date: futureClinicDate(),
    time: '10:00',
    reason: appointmentReason
  };
  const appointmentResponse = await request('/api/appointments', {
    method: 'POST',
    cookie: adminCookie,
    body: appointmentPayload
  });
  assert.equal(appointmentResponse.status, 201);
  const appointment = await appointmentResponse.json();
  appointmentId = appointment.id;
  assert.equal(appointment.status, 'Pending confirmation');

  const conflict = await request('/api/appointments', {
    method: 'POST',
    cookie: adminCookie,
    body: appointmentPayload
  });
  assert.equal(conflict.status, 409);

  const vetAppointments = await (await request('/api/appointments', {
    cookie: veterinarianCookie
  })).json();
  assert.deepEqual(vetAppointments.map((row) => row.id), [appointmentId]);

  const confirm = await request(`/api/appointments/${appointmentId}`, {
    method: 'PATCH',
    cookie: veterinarianCookie,
    body: { status: 'Confirmed' }
  });
  assert.equal(confirm.status, 200);
  assert.equal((await confirm.json()).status, 'Confirmed');

  const db = await getConnection();
  try {
    const invoiceResult = await db.execute(
      `INSERT INTO invoices (appointment_id)
       VALUES (:appointment_id)
       RETURNING invoice_id INTO :invoice_id`,
      {
        appointment_id: appointmentId,
        invoice_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    invoiceId = invoiceResult.outBinds.invoice_id[0];
    await db.execute(
      `INSERT INTO appointment_services (
           appointment_id, service_id, quantity, unit_price
       )
       VALUES (:appointment_id, :service_id, 1, 75)`,
      { appointment_id: appointmentId, service_id: serviceId }
    );
    await db.commit();
  } finally {
    await db.close();
  }

  const paid = await request(`/api/invoices/${invoiceId}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { status: 'Paid' }
  });
  assert.equal(paid.status, 200);
  const paidInvoice = await paid.json();
  assert.equal(paidInvoice.id, invoiceId);
  assert.equal(paidInvoice.status, 'Paid');
  assert.equal(paidInvoice.amount, 75);

  const cancelled = await request(`/api/appointments/${appointmentId}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { status: 'Cancelled' }
  });
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).status, 'Cancelled');

  const logout = await request('/api/auth/logout', {
    method: 'POST',
    cookie: adminCookie
  });
  assert.equal(logout.status, 200);
  assert.equal((await (await request('/api/auth/me', {
    cookie: cookieFrom(logout)
  })).json()).user, null);
});
