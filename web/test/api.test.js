const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const accountsPath = path.join(__dirname, `.staff-accounts-${crypto.randomUUID()}.json`);
const clinicStorePath = path.join(__dirname, `.clinic-store-${crypto.randomUUID()}.json`);
const adminInvitationCode = crypto.randomBytes(24).toString('base64url');
const veterinarianInvitationCode = crypto.randomBytes(24).toString('base64url');
const veterinarianPassword = crypto.randomBytes(24).toString('base64url');
const administratorPassword = crypto.randomBytes(24).toString('base64url');
process.env.AUTH_STORE_PATH = accountsPath;
process.env.CLINIC_STORE_PATH = clinicStorePath;
process.env.ADMIN_REGISTRATION_CODE = adminInvitationCode;
process.env.VETERINARIAN_REGISTRATION_CODE = veterinarianInvitationCode;

const { veterinarians, appointments } = require('../data/clinic');
const seededAccounts = veterinarians.map((veterinarian) => {
  const name = veterinarian.name.replace(/^Dr\.\s*/, '');
  const salt = crypto.randomBytes(16);
  const passwordHash = crypto.scryptSync(
    'unused-seeded-test-password',
    salt,
    64,
    { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
  );
  return {
    id: crypto.randomUUID(),
    email: veterinarian.email,
    name,
    title: `Veterinarian · ${veterinarian.specialty}`,
    role: 'veterinarian',
    initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]).join(''),
    specialty: veterinarian.specialty,
    veterinarianId: veterinarian.id,
    salt: salt.toString('base64url'),
    passwordHash: passwordHash.toString('base64url')
  };
});
fs.writeFileSync(accountsPath, JSON.stringify(seededAccounts, null, 2), { mode: 0o600 });

const app = require('../server');

let baseUrl;
let server;
let administratorCookie = '';
let veterinarianCookie = '';

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
  fs.rmSync(accountsPath, { force: true });
  fs.rmSync(clinicStorePath, { force: true });
});

const get = (route, cookie = administratorCookie) =>
  fetch(`${baseUrl}${route}`, { headers: cookie ? { cookie } : {} });

const cookieFrom = (response) => {
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie, 'auth response should set or clear a session cookie');
  return cookie.split(';', 1)[0];
};

const postAppointment = (payload, cookie = administratorCookie) => fetch(`${baseUrl}/api/appointments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(payload)
});

const patchRecord = (route, payload, cookie = administratorCookie) => fetch(`${baseUrl}${route}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(payload)
});

const dateFromToday = (daysAhead) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
};

const clinicDateFromToday = (daysAhead) => {
  const date = new Date(`${dateFromToday(daysAhead)}T12:00:00`);
  if (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
};

test('serves the clinic page and static assets', async () => {
  const page = await get('/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  const html = await page.text();
  assert.match(html, /Vetwise Clinic/);
  assert.match(html, /id="agenda-timeline"/);
  assert.doesNotMatch(html, /data-view-target="appointments"/);
  assert.doesNotMatch(html, /data-dashboard-range/);
  assert.match(html, /id="login-form"/);
  assert.match(html, /id="register-form"/);

  const styles = await get('/styles.css');
  assert.equal(styles.status, 200);
  assert.match(styles.headers.get('content-type'), /text\/css/);
});

test('registers individual staff accounts, signs in, and enforces clinic roles', async () => {
  const unauthenticated = await fetch(`${baseUrl}/api/dashboard`);
  assert.equal(unauthenticated.status, 401);

  const options = await get('/api/auth/options', '');
  assert.deepEqual(await options.json(), {
    adminRegistrationEnabled: true,
    veterinarianRegistrationEnabled: true
  });

  const invalidVeterinarianRegistration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Taylor Morgan',
      email: 'taylor@example.test',
      password: veterinarianPassword,
      role: 'veterinarian',
      specialty: 'Dermatology'
    })
  });
  assert.equal(invalidVeterinarianRegistration.status, 403);

  const veterinarianRegistration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Taylor Morgan',
      email: 'taylor@example.test',
      password: veterinarianPassword,
      role: 'veterinarian',
      specialty: 'Dermatology',
      invitationCode: veterinarianInvitationCode
    })
  });
  assert.equal(veterinarianRegistration.status, 201);
  veterinarianCookie = cookieFrom(veterinarianRegistration);
  assert.match(veterinarianRegistration.headers.get('set-cookie'), /HttpOnly/);
  assert.match(veterinarianRegistration.headers.get('set-cookie'), /SameSite=Lax/);
  const veterinarian = (await veterinarianRegistration.json()).user;
  assert.equal(veterinarian.role, 'veterinarian');
  assert.equal(veterinarian.title, 'Veterinarian · Dermatology');
  assert.equal(Number.isInteger(veterinarian.veterinarianId), true);
  assert.equal('passwordHash' in veterinarian, false);
  const rosterAfterRegistration = await (await get('/api/veterinarians', veterinarianCookie)).json();
  const registeredVeterinarian = rosterAfterRegistration.find((item) =>
    item.email === veterinarian.email);
  assert.ok(registeredVeterinarian);
  assert.equal(registeredVeterinarian.name, 'Dr. Taylor Morgan');

  const shortPassword = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Short Password',
      email: 'short@example.test',
      password: 'short',
      role: 'veterinarian',
      specialty: 'General practice',
      invitationCode: veterinarianInvitationCode
    })
  });
  assert.equal(shortPassword.status, 400);

  const duplicateEmail = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Another Vet',
      email: 'TAYLOR@example.test',
      password: veterinarianPassword,
      role: 'veterinarian',
      specialty: 'Surgery',
      invitationCode: veterinarianInvitationCode
    })
  });
  assert.equal(duplicateEmail.status, 409);

  const veterinarianLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'TAYLOR@example.test', password: veterinarianPassword })
  });
  assert.equal(veterinarianLogin.status, 200);
  assert.equal((await veterinarianLogin.json()).user.id, veterinarian.id);

  const invalidPassword = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'taylor@example.test', password: crypto.randomBytes(24).toString('base64url') })
  });
  assert.equal(invalidPassword.status, 401);

  const invalidAdminRegistration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Jordan Ellis',
      email: 'jordan@example.test',
      password: administratorPassword,
      role: 'admin',
      invitationCode: 'wrong-code'
    })
  });
  assert.equal(invalidAdminRegistration.status, 403);

  const administratorRegistration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Jordan Ellis',
      email: 'jordan@example.test',
      password: administratorPassword,
      role: 'admin',
      invitationCode: adminInvitationCode
    })
  });
  assert.equal(administratorRegistration.status, 201);
  administratorCookie = cookieFrom(administratorRegistration);
  assert.equal((await administratorRegistration.json()).user.role, 'admin');

  const storedAccounts = fs.readFileSync(accountsPath, 'utf8');
  assert.equal(storedAccounts.includes(veterinarianPassword), false);
  assert.equal(storedAccounts.includes(administratorPassword), false);

  const veterinarianCannotRegisterPatient = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: veterinarianCookie },
    body: JSON.stringify({ name: 'Moss', species: 'Cat', breed: 'Tabby', owner: 'Jamie Doe' })
  });
  assert.equal(veterinarianCannotRegisterPatient.status, 403);
  const veterinarianAppointments = await get('/api/appointments', veterinarianCookie);
  assert.equal(veterinarianAppointments.status, 200);
  assert.deepEqual(await veterinarianAppointments.json(), []);
  assert.equal((await get('/api/invoices', veterinarianCookie)).status, 403);
  const veterinarianDashboard = await (await get('/api/dashboard', veterinarianCookie)).json();
  assert.deepEqual(veterinarianDashboard.stats.map((stat) => stat.label), [
    'Visits today',
    'Awaiting your confirmation',
    'Registered patients',
    'Veterinarians'
  ]);
  assert.deepEqual(veterinarianDashboard.upcoming, []);
  assert.equal(JSON.stringify(veterinarianDashboard).includes('outstanding'), false);
  assert.equal((await postAppointment({
    patientId: 1,
    veterinarianId: 1,
    date: dateFromToday(45),
    time: '09:35',
    reason: 'Role check'
  }, veterinarianCookie)).status, 403);
  assert.equal((await patchRecord('/api/appointments/61', { status: 'Completed' }, veterinarianCookie)).status, 404);
  assert.equal((await patchRecord('/api/invoices/1043', { status: 'Paid' }, veterinarianCookie)).status, 403);
  assert.equal((await patchRecord('/api/appointments/67', { status: 'Cancelled' }, veterinarianCookie)).status, 404);

  const signin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jordan@example.test', password: administratorPassword })
  });
  assert.equal(signin.status, 200);
  const signinCookie = cookieFrom(signin);
  assert.equal((await (await get('/api/auth/me', signinCookie)).json()).user.role, 'admin');
  const signout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: signinCookie }
  });
  assert.equal(signout.status, 200);
  assert.equal((await (await get('/api/auth/me', signinCookie)).json()).user, null);
});

test('scopes veterinarian schedules and lets only the assigned doctor confirm a visit', async () => {
  const payload = {
    patientId: 8,
    veterinarianId: 12,
    date: clinicDateFromToday(70),
    time: '09:35',
    reason: 'Assigned veterinarian confirmation test'
  };
  const createdResponse = await postAppointment(payload);
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.status, 'Pending confirmation');

  const doctorScheduleResponse = await get('/api/appointments', veterinarianCookie);
  assert.equal(doctorScheduleResponse.status, 200);
  const doctorSchedule = await doctorScheduleResponse.json();
  assert.deepEqual(doctorSchedule.map((appointment) => appointment.id), [created.id]);
  assert.ok(doctorSchedule.every((appointment) => appointment.veterinarianId === 12));

  const doctorDashboard = await (await get('/api/dashboard', veterinarianCookie)).json();
  assert.ok(doctorDashboard.upcoming.every((appointment) => appointment.veterinarianId === 12));
  assert.equal(doctorDashboard.upcoming[0].status, 'Pending confirmation');

  const unrelatedVisit = await patchRecord(
    '/api/appointments/61',
    { status: 'Confirmed' },
    veterinarianCookie
  );
  assert.equal(unrelatedVisit.status, 404);

  const unauthorizedCancellation = await patchRecord(
    `/api/appointments/${created.id}`,
    { status: 'Cancelled' },
    veterinarianCookie
  );
  assert.equal(unauthorizedCancellation.status, 403);

  const prematureCompletion = await patchRecord(
    `/api/appointments/${created.id}`,
    { status: 'Completed' }
  );
  assert.equal(prematureCompletion.status, 409);

  const seededVeterinarianLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: seededAccounts[0].email,
      password: 'unused-seeded-test-password'
    })
  });
  assert.equal(seededVeterinarianLogin.status, 200);
  const seededVeterinarianCookie = cookieFrom(seededVeterinarianLogin);
  const otherDoctorSchedule = await (await get('/api/appointments', seededVeterinarianCookie)).json();
  assert.ok(otherDoctorSchedule.some((appointment) => appointment.id === 61));
  assert.ok(otherDoctorSchedule.every((appointment) => appointment.veterinarianId === 1));
  assert.ok(otherDoctorSchedule.every((appointment) => appointment.id !== created.id));

  const confirmed = await patchRecord(
    `/api/appointments/${created.id}`,
    { status: 'Confirmed' },
    veterinarianCookie
  );
  assert.equal(confirmed.status, 200);
  assert.equal((await confirmed.json()).status, 'Confirmed');

  const duplicateConfirmation = await patchRecord(
    `/api/appointments/${created.id}`,
    { status: 'Confirmed' },
    veterinarianCookie
  );
  assert.equal(duplicateConfirmation.status, 409);

  const adminSchedule = await (await get('/api/appointments')).json();
  assert.ok(adminSchedule.some((appointment) => appointment.id === created.id));
});

test('returns dashboard and clinic summary data', async () => {
  const dashboardResponse = await get('/api/dashboard');
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await dashboardResponse.json();
  assert.equal(dashboard.stats.length, 4);
  assert.ok(Array.isArray(dashboard.upcoming));
  assert.ok(dashboard.clinic);
  assert.equal('alerts' in dashboard, false);
  assert.ok(dashboard.upcoming.every((appointment) => {
    const [year, month, day] = appointment.date.split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    const [hours, minutes] = appointment.time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    return weekday !== 0 && startMinutes >= 480 && startMinutes + 30 <= 1080;
  }));

  const overviewResponse = await get('/api/overview');
  assert.equal(overviewResponse.status, 200);
  assert.equal((await overviewResponse.json()).clinic.name, 'Vetwise Clinic');
});

test('returns searchable records and status-filtered lists', async () => {
  const patientsResponse = await get('/api/patients?search=JUNIPER');
  assert.equal(patientsResponse.status, 200);
  assert.deepEqual((await patientsResponse.json()).map((patient) => patient.name), ['Juniper']);

  const vetsResponse = await get('/api/veterinarians');
  assert.equal(vetsResponse.status, 200);
  const roster = await vetsResponse.json();
  assert.equal(roster.length, seededAccounts.length + 1);
  assert.deepEqual(
    roster.filter((item) => item.email !== 'taylor@example.test').map((item) => item.email).sort(),
    seededAccounts.map((item) => item.email).sort()
  );

  const completedResponse = await get('/api/appointments?status=completed');
  assert.equal(completedResponse.status, 200);
  const completed = await completedResponse.json();
  assert.ok(completed.length > 0);
  assert.ok(completed.every((appointment) => appointment.status === 'Completed'));

  const unpaidResponse = await get('/api/invoices?status=unpaid');
  assert.equal(unpaidResponse.status, 200);
  const unpaid = await unpaidResponse.json();
  assert.ok(unpaid.length > 0);
  assert.ok(unpaid.every((invoice) => invoice.status === 'Unpaid'));
});

test('registers patients and validates required details', async () => {
  const response = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: administratorCookie },
    body: JSON.stringify({
      name: 'Maple',
      species: 'Dog',
      breed: 'Mixed breed',
      owner: 'Jamie Park'
    })
  });
  assert.equal(response.status, 201);
  const patient = await response.json();
  assert.equal(patient.name, 'Maple');
  assert.equal(patient.status, 'Active');
  assert.equal(patient.lastVisit, null);

  const invalid = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: administratorCookie },
    body: JSON.stringify({ name: '', species: '', breed: '', owner: '' })
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).errors.length, 4);
});

test('books a valid appointment and rejects a duplicate time slot', async () => {
  const payload = {
    patientId: 1,
    veterinarianId: 5,
    date: dateFromToday(45),
    time: '09:35',
    reason: 'Automated API test booking'
  };

  const createdResponse = await postAppointment(payload);
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.patientId, payload.patientId);
  assert.equal(created.veterinarianId, payload.veterinarianId);
  assert.equal(created.reason, payload.reason);
  assert.equal(created.status, 'Pending confirmation');

  const duplicateResponse = await postAppointment(payload);
  assert.equal(duplicateResponse.status, 409);
  assert.match((await duplicateResponse.json()).errors[0], /already booked/);

  const patientDoubleBooking = await postAppointment({ ...payload, veterinarianId: 4 });
  assert.equal(patientDoubleBooking.status, 409);
  assert.match((await patientDoubleBooking.json()).errors[0], /already has a visit/);

  const overlappingVisit = await postAppointment({
    ...payload,
    patientId: 2,
    time: '10:00'
  });
  assert.equal(overlappingVisit.status, 409);
  assert.match((await overlappingVisit.json()).errors[0], /already booked within 30 minutes/);
});

test('admin can schedule every veterinarian with a registered account', async () => {
  const roster = await (await get('/api/veterinarians')).json();
  assert.equal(roster.length, seededAccounts.length + 1);
  const date = clinicDateFromToday(60);

  for (const [index, veterinarian] of roster.entries()) {
    const minutes = 8 * 60 + index * 30;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    const response = await postAppointment({
      patientId: (index % 8) + 1,
      veterinarianId: veterinarian.id,
      date,
      time,
      reason: `Account-linked booking for ${veterinarian.name}`
    });
    assert.equal(response.status, 201, `Could not schedule ${veterinarian.name}.`);
    const appointment = await response.json();
    assert.equal(appointment.veterinarianId, veterinarian.id);
    assert.equal(appointment.veterinarian, veterinarian.name);
    assert.equal(appointment.status, 'Pending confirmation');
  }

  const persisted = JSON.parse(fs.readFileSync(clinicStorePath, 'utf8'));
  assert.equal(
    persisted.appointments.filter((item) =>
      item.date === date &&
      item.reason.startsWith('Account-linked booking for ')).length,
    roster.length
  );
});

test('rejects invalid booking fields and dates in the past', async () => {
  const invalidResponse = await postAppointment({
    patientId: 999,
    veterinarianId: 5,
    date: '2026-13-45',
    time: '25:99',
    reason: ''
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal((await invalidResponse.json()).errors.length, 4);

  const pastResponse = await postAppointment({
    patientId: 1,
    veterinarianId: 4,
    date: '2020-01-01',
    time: '09:35',
    reason: 'Past appointment test'
  });
  assert.equal(pastResponse.status, 400);
  assert.match((await pastResponse.json()).errors[0], /today or a later date/);

  const longReasonResponse = await postAppointment({
    patientId: 1,
    veterinarianId: 4,
    date: clinicDateFromToday(46),
    time: '09:35',
    reason: 'x'.repeat(121)
  });
  assert.equal(longReasonResponse.status, 400);
  assert.match((await longReasonResponse.json()).errors[0], /120 characters or fewer/);

  const today = new Date();
  if (today.getDay() !== 0 && (today.getHours() > 8 ||
      (today.getHours() === 8 && today.getMinutes() > 0))) {
    const pastToday = await postAppointment({
      patientId: 1,
      veterinarianId: 4,
      date: dateFromToday(0),
      time: '08:00',
      reason: 'Same-day past appointment test'
    });
    assert.equal(pastToday.status, 400);
    assert.match((await pastToday.json()).errors[0], /later than now/);
  }
});

test('rejects non-five-minute, off-hours, and Sunday bookings', async () => {
  const basePayload = {
    patientId: 1,
    veterinarianId: 4,
    date: clinicDateFromToday(45),
    time: '09:35',
    reason: 'Booking rules test'
  };
  const invalidIncrement = await postAppointment({ ...basePayload, time: '09:37' });
  assert.equal(invalidIncrement.status, 400);
  assert.match((await invalidIncrement.json()).errors[0], /valid time/);

  const beforeOpening = await postAppointment({ ...basePayload, time: '07:55' });
  assert.equal(beforeOpening.status, 400);
  assert.match((await beforeOpening.json()).errors[0], /08:00 and 17:30/);

  const atClosing = await postAppointment({ ...basePayload, time: '18:00' });
  assert.equal(atClosing.status, 400);
  assert.match((await atClosing.json()).errors[0], /08:00 and 17:30/);

  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));
  const sunday = [
    nextSunday.getFullYear(),
    String(nextSunday.getMonth() + 1).padStart(2, '0'),
    String(nextSunday.getDate()).padStart(2, '0')
  ].join('-');
  const closedDay = await postAppointment({ ...basePayload, date: sunday });
  assert.equal(closedDay.status, 400);
  assert.match((await closedDay.json()).errors[0], /Monday to Saturday/);
});

test('updates scheduled visits and rejects invalid appointment transitions', async () => {
  const futureVisit = await patchRecord('/api/appointments/67', { status: 'Completed' });
  assert.equal(futureVisit.status, 409);

  const shortlyAhead = new Date(Date.now() + 60_000);
  if (dateFromToday(0) === [
    shortlyAhead.getFullYear(),
    String(shortlyAhead.getMonth() + 1).padStart(2, '0'),
    String(shortlyAhead.getDate()).padStart(2, '0')
  ].join('-')) {
    const sameDayFutureVisit = {
      id: 9000,
      date: dateFromToday(0),
      time: `${String(shortlyAhead.getHours()).padStart(2, '0')}:${String(shortlyAhead.getMinutes()).padStart(2, '0')}`,
      patientId: 1,
      patient: 'Daisy',
      owner: 'Avery Bennett',
      veterinarianId: 1,
      veterinarian: 'Dr. Maya Chen',
      reason: 'Premature completion check',
      status: 'Scheduled'
    };
    appointments.push(sameDayFutureVisit);
    try {
      const prematureCompletion = await patchRecord('/api/appointments/9000', { status: 'Completed' });
      assert.equal(prematureCompletion.status, 409);
      assert.match((await prematureCompletion.json()).errors[0], /before its scheduled time/);
    } finally {
      appointments.splice(appointments.indexOf(sameDayFutureVisit), 1);
    }
  }

  const elapsedVisit = {
    id: 9001,
    date: dateFromToday(-1),
    time: '12:00',
    patientId: 1,
    patient: 'Daisy',
    owner: 'Avery Bennett',
    veterinarianId: 1,
    veterinarian: 'Dr. Maya Chen',
    reason: 'Completion permission test',
    status: 'Scheduled'
  };
  appointments.push(elapsedVisit);
  try {
    const completed = await patchRecord('/api/appointments/9001', { status: 'Completed' });
    assert.equal(completed.status, 200);
    assert.equal((await completed.json()).status, 'Completed');

    const duplicate = await patchRecord('/api/appointments/9001', { status: 'Cancelled' });
    assert.equal(duplicate.status, 409);
  } finally {
    appointments.splice(appointments.indexOf(elapsedVisit), 1);
  }

  const cancelled = await patchRecord('/api/appointments/62', { status: 'Cancelled' });
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).status, 'Cancelled');

  const missing = await patchRecord('/api/appointments/9999', { status: 'Completed' });
  assert.equal(missing.status, 404);
});

test('marks an open invoice paid and rejects repeated or unsupported transitions', async () => {
  const paid = await patchRecord('/api/invoices/1043', { status: 'Paid' });
  assert.equal(paid.status, 200);
  assert.equal((await paid.json()).status, 'Paid');

  const duplicate = await patchRecord('/api/invoices/1043', { status: 'Paid' });
  assert.equal(duplicate.status, 409);

  const unsupported = await patchRecord('/api/invoices/1042', { status: 'Unpaid' });
  assert.equal(unsupported.status, 400);

  const missing = await patchRecord('/api/invoices/9999', { status: 'Paid' });
  assert.equal(missing.status, 404);
});

test('returns JSON errors for unknown API routes and malformed JSON', async () => {
  const unknownResponse = await get('/api/not-a-route');
  assert.equal(unknownResponse.status, 404);
  assert.deepEqual(await unknownResponse.json(), { error: 'Not found' });

  const malformedResponse = await fetch(`${baseUrl}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{'
  });
  assert.equal(malformedResponse.status, 400);
  assert.match((await malformedResponse.json()).errors[0], /not valid JSON/);
});
