const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const app = require('../server');

let baseUrl;
let server;

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
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
});

const get = (path) => fetch(`${baseUrl}${path}`);

const postAppointment = (payload) => fetch(`${baseUrl}/api/appointments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const patchRecord = (path, payload) => fetch(`${baseUrl}${path}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
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
  assert.match(await page.text(), /Vetwise Clinic/);

  const styles = await get('/styles.css');
  assert.equal(styles.status, 200);
  assert.match(styles.headers.get('content-type'), /text\/css/);
});

test('returns dashboard and clinic summary data', async () => {
  const dashboardResponse = await get('/api/dashboard');
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await dashboardResponse.json();
  assert.equal(dashboard.stats.length, 4);
  assert.ok(Array.isArray(dashboard.upcoming));
  assert.ok(Array.isArray(dashboard.alerts));
  assert.match(dashboard.alerts.find((alert) => alert.title === 'Outstanding billing').text, /^3 invoices are unpaid/);

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

test('provides separate veterinarian and administrator demo profiles', async () => {
  const response = await get('/api/profiles');
  assert.equal(response.status, 200);
  const profiles = await response.json();
  assert.deepEqual(profiles.map(({ role }) => role), ['veterinarian', 'admin']);
  assert.ok(profiles.some((profile) => profile.name === 'Dr. Hannibal Lecter'));
});

test('registers patients and validates required details', async () => {
  const response = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
