const express = require('express');
const {
  clinic, patients, veterinarians, appointments, invoices, toIsoDate, dateFromToday
} = require('../data/clinic');

const router = express.Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_TIME = /^\d{2}:\d{2}$/;
const MAX_REASON_LENGTH = 120; // Matches maxlength on the booking form input.

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

// Dashboard summary: four stat cards, the next visits, alert cards, and the
// clinic facts panel. Everything is derived from the in-memory demo data, so
// one call gives the page all the information the dashboard view needs.
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
        detail: `${upcoming.length} upcoming on the board`,
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
    alerts: [
      {
        title: 'Vaccinations due',
        text: `${duePatients.length} patients are due a vaccination within the next 30 days.`,
        action: 'Review patients',
        view: 'patients'
      },
      {
        title: 'Outstanding billing',
        text: `${openInvoices.length} invoices are unpaid or part paid, totalling ${openTotal.toFixed(2)}.`,
        action: 'Open billing',
        view: 'billing'
      },
      {
        title: "Today's schedule",
        text: `${todayCount} visits are booked for today.`,
        action: 'See appointments',
        view: 'appointments'
      }
    ],
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

module.exports = router;
