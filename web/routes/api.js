const express = require('express');
const {
  clinic, profiles, patients, veterinarians, appointments, invoices, toIsoDate, dateFromToday
} = require('../data/clinic');

const router = express.Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_TIME = /^\d{2}:\d{2}$/;
const MAX_REASON_LENGTH = 120; // Matches maxlength on the booking form input.
const validPatientFields = {
  name: ['Patient name', 60],
  species: ['Species', 40],
  breed: ['Breed', 60],
  owner: ['Owner name', 80]
};

// Shape checks are not enough: 2026-13-45 matches ISO_DATE but is not a real
// date. Build a Date from the numeric parts and read the parts back - this
// rolls over invalid values (month 13, day 45, Feb 29 in a non-leap year)
// and also avoids the UTC shift of toISOString().
const isRealDate = (value) => {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;
};

const isRealTime = (value) => {
  if (!CLOCK_TIME.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours <= 23 && minutes <= 59;
};

const bySchedule = (first, second) =>
  `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`);

const nextAppointmentId = () =>
  appointments.reduce((highest, appointment) => Math.max(highest, appointment.id), 0) + 1;

router.get('/overview', (request, response) => {
  response.json({ clinic });
});

router.get('/profiles', (request, response) => {
  response.json(profiles);
});

// Dashboard summary: four stat cards, the next visits, and clinic facts.
// Everything is derived from in-memory demo data in one request.
router.get('/dashboard', (request, response) => {
  const today = toIsoDate(dateFromToday(0));
  const upcoming = appointments
    .filter((appointment) => appointment.status === 'Scheduled' && appointment.date >= today)
    .sort(bySchedule)
    .slice(0, 5)
    .map(({ date, time, patient, reason, veterinarian }) => ({
      date, time, patient, reason, veterinarian
    }));

  const duePatients = patients.filter((patient) => patient.status === 'Vaccination due');
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'Paid');
  const openTotal = openInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const todayCount = appointments.filter(
    (appointment) => appointment.date === today && appointment.status === 'Scheduled'
  ).length;

  response.json({
    stats: [
      {
        label: 'Visits today',
        value: todayCount,
        detail: 'Select a date to preview visits',
        tone: 'blue'
      },
      {
        label: 'Registered patients',
        value: patients.length,
        detail: `${duePatients.length} need a vaccination`,
        tone: 'green'
      },
      {
        label: 'Open invoices',
        value: openInvoices.length,
        detail: `${openTotal.toFixed(2)} outstanding`,
        tone: 'orange'
      },
      {
        label: 'Veterinarians',
        value: veterinarians.length,
        detail: 'All on the rota this week',
        tone: 'purple'
      }
    ],
    upcoming,
    clinic
  });
});

router.get('/patients', (request, response) => {
  const search = String(request.query.search || '').trim().toLowerCase();
  const matches = search
    ? patients.filter((patient) =>
        Object.values(patient).some((value) => String(value).toLowerCase().includes(search)))
    : patients;

  response.json(matches);
});

router.post('/patients', (request, response) => {
  const body = request.body || {};
  const values = Object.fromEntries(Object.entries(validPatientFields)
    .map(([field]) => [field, String(body[field] || '').trim()]));
  const errors = [];

  for (const [field, [label, maxLength]] of Object.entries(validPatientFields)) {
    const value = values[field];
    if (!value) errors.push(`${label} is required.`);
    else if (value.length > maxLength) errors.push(`${label} must be ${maxLength} characters or fewer.`);
  }

  if (errors.length) return response.status(400).json({ errors });

  const patient = {
    id: patients.reduce((highest, item) => Math.max(highest, item.id), 0) + 1,
    ...values,
    status: 'Active',
    lastVisit: toIsoDate(dateFromToday(0))
  };
  patients.push(patient);
  return response.status(201).json(patient);
});

router.get('/veterinarians', (request, response) => {
  response.json(veterinarians);
});

router.get('/appointments', (request, response) => {
  const status = String(request.query.status || 'all').toLowerCase();
  const matches = status === 'all'
    ? appointments
    : appointments.filter((appointment) => appointment.status.toLowerCase() === status);

  response.json([...matches].sort(bySchedule));
});

router.get('/invoices', (request, response) => {
  const status = String(request.query.status || 'all').toLowerCase();
  const matches = status === 'all'
    ? invoices
    : invoices.filter((invoice) => invoice.status.toLowerCase() === status);

  response.json([...matches].sort((first, second) => second.issued.localeCompare(first.issued)));
});

router.post('/appointments', (request, response) => {
  const body = request.body || {};
  const patient = patients.find((item) => item.id === Number(body.patientId));
  const veterinarian = veterinarians.find((item) => item.id === Number(body.veterinarianId));
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const reason = String(body.reason || '').trim();

  const errors = [];
  if (!patient) errors.push('Select a registered patient.');
  if (!veterinarian) errors.push('Select a veterinarian.');
  if (!isRealDate(date)) errors.push('Choose a valid date.');
  else if (date < toIsoDate(dateFromToday(0))) errors.push('Choose today or a later date.');
  if (!isRealTime(time)) errors.push('Choose a valid time.');
  if (!reason) errors.push('Enter the reason for the visit.');
  else if (reason.length > MAX_REASON_LENGTH) {
    errors.push(`Keep the reason to ${MAX_REASON_LENGTH} characters or fewer.`);
  }

  if (errors.length > 0) {
    return response.status(400).json({ errors });
  }

  const clash = appointments.find((appointment) =>
    appointment.veterinarianId === veterinarian.id &&
    appointment.date === date &&
    appointment.time === time &&
    appointment.status === 'Scheduled');

  if (clash) {
    return response.status(409).json({
      errors: [`${veterinarian.name} is already booked at ${time} on ${date}.`]
    });
  }

  const appointment = {
    id: nextAppointmentId(),
    date,
    time,
    patientId: patient.id,
    patient: patient.name,
    owner: patient.owner,
    veterinarianId: veterinarian.id,
    veterinarian: veterinarian.name,
    reason,
    status: 'Scheduled'
  };

  appointments.push(appointment);
  return response.status(201).json(appointment);
});

router.patch('/appointments/:id', (request, response) => {
  const appointment = appointments.find((item) => item.id === Number(request.params.id));
  if (!appointment) return response.status(404).json({ errors: ['Appointment not found.'] });

  const status = String(request.body?.status || '').trim().toLowerCase();
  if (!['completed', 'cancelled'].includes(status)) {
    return response.status(400).json({ errors: ['Choose Completed or Cancelled.'] });
  }
  if (appointment.status !== 'Scheduled') {
    return response.status(409).json({ errors: ['Only scheduled appointments can be updated.'] });
  }
  if (status === 'completed' && appointment.date > toIsoDate(dateFromToday(0))) {
    return response.status(409).json({ errors: ['An upcoming appointment cannot be completed.'] });
  }

  appointment.status = status === 'completed' ? 'Completed' : 'Cancelled';
  return response.json(appointment);
});

router.patch('/invoices/:id', (request, response) => {
  const invoice = invoices.find((item) => item.id === Number(request.params.id));
  if (!invoice) return response.status(404).json({ errors: ['Invoice not found.'] });
  if (String(request.body?.status || '').trim().toLowerCase() !== 'paid') {
    return response.status(400).json({ errors: ['Invoice status can only be changed to Paid.'] });
  }
  if (invoice.status === 'Paid') {
    return response.status(409).json({ errors: ['This invoice is already paid.'] });
  }

  invoice.status = 'Paid';
  return response.json(invoice);
});

module.exports = router;
