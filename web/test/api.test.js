const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const accountsPath = path.join(__dirname, `.staff-accounts-${crypto.randomUUID()}.json`);
const adminInvitationCode = crypto.randomBytes(24).toString('base64url');
const veterinarianPassword = crypto.randomBytes(24).toString('base64url');
const administratorPassword = crypto.randomBytes(24).toString('base64url');
process.env.AUTH_STORE_PATH = accountsPath;
process.env.ADMIN_REGISTRATION_CODE = adminInvitationCode;

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
});

const get = (route, cookie = administratorCookie) =>
  fetch(`${baseUrl}${route}`, { headers: cookie ? { cookie } : {} });

const cookieFrom = (response) => {
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie, 'auth response should set or clear a session cookie');
  return cookie.split(';', 1)[0];
};

const postAppointment = (payload) => fetch(`${baseUrl}/api/appointments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: administratorCookie },
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
  assert.deepEqual(await options.json(), { adminRegistrationEnabled: true });

  const veterinarianRegistration = await fetch(`${baseUrl}/api/auth/register`, {
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
  assert.equal(veterinarianRegistration.status, 201);
  veterinarianCookie = cookieFrom(veterinarianRegistration);
  assert.match(veterinarianRegistration.headers.get('set-cookie'), /HttpOnly/);
  assert.match(veterinarianRegistration.headers.get('set-cookie'), /SameSite=Lax/);
  const veterinarian = (await veterinarianRegistration.json()).user;
  assert.equal(veterinarian.role, 'veterinarian');
  assert.equal(veterinarian.title, 'Veterinarian · Dermatology');
  assert.equal('passwordHash' in veterinarian, false);

  const shortPassword = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Short Password',
      email: 'short@example.test',
      password: 'short',
      role: 'veterinarian',
      specialty: 'General practice'
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
      specialty: 'Surgery'
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
  assert.equal((await patchRecord('/api/invoices/1043', { status: 'Paid' }, veterinarianCookie)).status, 403);
  assert.equal((await patchRecord('/api/appointments/67', { status: 'Cancelled' }, veterinarianCookie)).status, 403);

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

test('returns dashboard and clinic summary data', async () => {
  const dashboardResponse = await get('/api/dashboard');
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await dashboardResponse.json();
  assert.equal(dashboard.stats.length, 4);
  assert.ok(Array.isArray(dashboard.upcoming));
  assert.ok(dashboard.clinic);
  assert.equal('alerts' in dashboard, false);

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
  assert.equal((await vetsResponse.json()).length, 5);

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
  assert.equal(patient.lastVisit, dateFromToday(0));

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
    time: '09:37',
    reason: 'Automated API test booking'
  };

  const createdResponse = await postAppointment(payload);
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.patientId, payload.patientId);
  assert.equal(created.veterinarianId, payload.veterinarianId);
  assert.equal(created.reason, payload.reason);
  assert.equal(created.status, 'Scheduled');

  const duplicateResponse = await postAppointment(payload);
  assert.equal(duplicateResponse.status, 409);
  assert.match((await duplicateResponse.json()).errors[0], /already booked/);
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
    time: '09:37',
    reason: 'Past appointment test'
  });
  assert.equal(pastResponse.status, 400);
  assert.match((await pastResponse.json()).errors[0], /today or a later date/);

  const longReasonResponse = await postAppointment({
    patientId: 1,
    veterinarianId: 4,
    date: dateFromToday(46),
    time: '09:37',
    reason: 'x'.repeat(121)
  });
  assert.equal(longReasonResponse.status, 400);
  assert.match((await longReasonResponse.json()).errors[0], /120 characters or fewer/);
});

test('updates scheduled visits and rejects invalid appointment transitions', async () => {
  const futureVisit = await patchRecord('/api/appointments/67', { status: 'Completed' });
  assert.equal(futureVisit.status, 409);

  const completed = await patchRecord('/api/appointments/61', { status: 'Completed' });
  assert.equal(completed.status, 200);
  assert.equal((await completed.json()).status, 'Completed');

  const duplicate = await patchRecord('/api/appointments/61', { status: 'Cancelled' });
  assert.equal(duplicate.status, 409);

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
