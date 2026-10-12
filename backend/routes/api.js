const express = require('express');
const {
  createPatient,
  findPatient,
  getAppointment,
  getAppointments,
  getInvoices,
  getPatients,
  getVeterinarians,
  insertAppointment,
  withConnection
} = require('../repositories/clinic');
const { getConnection } = require('../database');
const { requireAuth, requireRole } = require('./auth');
const { clinic, dateFromToday, toIsoDate } = require('../data/clinic');

const router = express.Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_TIME = /^\d{2}:\d{2}$/;
const MAX_REASON_LENGTH = 120;
const APPOINTMENT_DURATION_MINUTES = 30;
const ACTIVE_APPOINTMENT_STATUSES = new Set([
  'Pending confirmation', 'Confirmed', 'Scheduled'
]);
const validPatientFields = {
  name: ['Patient name', 60],
  species: ['Species', 40],
  breed: ['Breed', 60],
  owner: ['Owner name', 80]
};

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
  return hours <= 23 && minutes <= 59 && minutes % 5 === 0;
};

const isWithinClinicHours = (date, time) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  const minutesSinceMidnight = hours * 60 + minutes;
  return weekday !== 0 &&
    minutesSinceMidnight >= 8 * 60 &&
    minutesSinceMidnight + APPOINTMENT_DURATION_MINUTES <= 18 * 60;
};

const bySchedule = (first, second) =>
  `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`);

function appointmentIsActive(row) {
  return row.APPOINTMENT_STATUS === 'SCHEDULED';
}

router.get('/overview', (request, response) => {
  response.json({ clinic });
});

router.get('/dashboard', async (request, response) => {
  const today = toIsoDate(dateFromToday(0));
  const isAdmin = request.user.role === 'admin';
  const veterinarianId = request.user.veterinarianId;
  const [activeVeterinarians, patients, allAppointments, invoices] = await Promise.all([
    withConnection(getVeterinarians),
    withConnection((connection) => getPatients(connection)),
    withConnection((connection) =>
      getAppointments(connection, isAdmin ? null : veterinarianId)),
    isAdmin ? withConnection(getInvoices) : Promise.resolve([])
  ]);
  const relevantAppointments = allAppointments.filter((appointment) =>
    ACTIVE_APPOINTMENT_STATUSES.has(appointment.status));
  const upcoming = relevantAppointments
    .filter((appointment) => appointment.date >= today)
    .sort(bySchedule)
    .slice(0, 20);
  const duePatients = patients.filter((patient) => patient.status === 'Vaccination due');
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'Paid');
  const openTotal = openInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const todayCount = relevantAppointments.filter((appointment) =>
    appointment.date === today).length;
  const pendingCount = relevantAppointments.filter((appointment) =>
    appointment.date >= today && appointment.status === 'Pending confirmation').length;
  const doctorPatients = new Set(upcoming.map((appointment) => appointment.patientId)).size;

  return response.json({
    stats: [
      {
        label: 'Visits today',
        value: todayCount,
        detail: isAdmin ? 'Across the clinic schedule' : 'Assigned to you',
        tone: 'blue'
      },
      ...(!isAdmin ? [{
        label: 'Awaiting your confirmation',
        value: pendingCount,
        detail: 'Accept visits assigned to you',
        tone: 'orange'
      }] : []),
      {
        label: 'Registered patients',
        value: isAdmin ? patients.length : doctorPatients,
        detail: isAdmin ? `${duePatients.length} need a vaccination` : 'In your upcoming schedule',
        tone: 'green'
      },
      ...(isAdmin ? [{
        label: 'Open invoices',
        value: openInvoices.length,
        detail: `${openTotal.toFixed(2)} outstanding`,
        tone: 'orange'
      }] : []),
      {
        label: 'Veterinarians',
        value: activeVeterinarians.length,
        detail: 'All on the rota this week',
        tone: 'purple'
      }
    ],
    upcoming,
    clinic
  });
});

router.get('/patients', async (request, response) => {
  const search = String(request.query.search || '').trim();
  return response.json(await withConnection((connection) => getPatients(connection, search)));
});

router.post('/patients', requireRole('admin'), async (request, response) => {
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

  const connection = await getConnection();
  let patientId;
  try {
    patientId = await createPatient(connection, values);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
  const patients = await withConnection((db) => getPatients(db));
  const patient = patients.find((item) => item.id === patientId);
  if (!patient) throw new Error('The new patient was committed but could not be read back.');
  return response.status(201).json(patient);
});

router.get('/veterinarians', async (request, response) => {
  return response.json(await withConnection(getVeterinarians));
});

router.get('/appointments', async (request, response) => {
  const veterinarianId = request.user.role === 'admin'
    ? null
    : request.user.veterinarianId;
  const status = String(request.query.status || 'all').toLowerCase();
  const appointments = await withConnection((connection) =>
    getAppointments(connection, veterinarianId));
  const matches = status === 'all'
    ? appointments
    : appointments.filter((appointment) => appointment.status.toLowerCase() === status);
  return response.json(matches.sort(bySchedule));
});

router.get('/invoices', requireRole('admin'), async (request, response) => {
  const status = String(request.query.status || 'all').toLowerCase();
  const invoices = await withConnection(getInvoices);
  const matches = status === 'all'
    ? invoices
    : invoices.filter((invoice) => invoice.status.toLowerCase() === status);
  return response.json([...matches].sort((first, second) =>
    second.issued.localeCompare(first.issued)));
});

router.post('/appointments', requireRole('admin'), async (request, response) => {
  const body = request.body || {};
  const patientId = Number(body.patientId);
  const veterinarianId = Number(body.veterinarianId);
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const reason = String(body.reason || '').trim();
  const errors = [];

  if (!Number.isInteger(patientId) || patientId <= 0) errors.push('Select a registered patient.');
  if (!Number.isInteger(veterinarianId) || veterinarianId <= 0) errors.push('Select a veterinarian.');
  if (!isRealDate(date)) errors.push('Choose a valid date.');
  else if (date < toIsoDate(dateFromToday(0))) errors.push('Choose today or a later date.');
  if (!isRealTime(time)) errors.push('Choose a valid time.');
  else if (isRealDate(date) && !isWithinClinicHours(date, time)) {
    errors.push('Choose a Monday to Saturday appointment between 08:00 and 17:30.');
  } else if (date === toIsoDate(dateFromToday(0)) &&
      new Date(`${date}T${time}:00`) <= new Date()) {
    errors.push('Choose a time later than now.');
  }
  if (!reason) errors.push('Enter the reason for the visit.');
  else if (reason.length > MAX_REASON_LENGTH) {
    errors.push(`Keep the reason to ${MAX_REASON_LENGTH} characters or fewer.`);
  }
  if (errors.length) return response.status(400).json({ errors });

  const connection = await getConnection();
  try {
    const veterinarianResult = await connection.execute(
      `SELECT v.veterinarian_id
       FROM veterinarians v
       JOIN staff_accounts a ON a.veterinarian_id = v.veterinarian_id
       WHERE v.veterinarian_id = :veterinarian_id
         AND v.is_active = 'Y'
         AND a.account_role = 'VETERINARIAN'
       FOR UPDATE`,
      { veterinarian_id: veterinarianId }
    );
    const patient = await findPatient(connection, patientId);
    if (!veterinarianResult.rows.length || !patient) {
      await connection.rollback();
      return response.status(400).json({
        errors: [patient ? 'Select a veterinarian.' : 'Select a registered patient.']
      });
    }

    await connection.execute(
      'SELECT pet_id FROM pets WHERE pet_id = :patient_id FOR UPDATE',
      { patient_id: patientId }
    );
    const existing = await getAppointments(connection);
    const startTime = new Date(`${date}T${time}:00`).getTime();
    const overlaps = (appointment) => appointment.date === date &&
      ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) &&
      Math.abs(new Date(`${appointment.date}T${appointment.time}:00`).getTime() - startTime) <
        APPOINTMENT_DURATION_MINUTES * 60 * 1000;
    const veterinarianClash = existing.find((appointment) =>
      appointment.veterinarianId === veterinarianId && overlaps(appointment));
    if (veterinarianClash) {
      await connection.rollback();
      return response.status(409).json({
        errors: [`The veterinarian is already booked within 30 minutes of ${time} on ${date}.`]
      });
    }
    const patientClash = existing.find((appointment) =>
      appointment.patientId === patientId && overlaps(appointment));
    if (patientClash) {
      await connection.rollback();
      return response.status(409).json({
        errors: [`${patient.PET_NAME} already has a visit within 30 minutes of ${time} on ${date}.`]
      });
    }

    const appointmentId = await insertAppointment(connection, {
      patientId,
      veterinarianId,
      date,
      time,
      reason
    });
    await connection.commit();
    const appointment = await getAppointment(connection, appointmentId);
    return response.status(201).json(appointment);
  } catch (error) {
    await connection.rollback();
    if (error.errorNum === 1) {
      return response.status(409).json({
        errors: [`The veterinarian is already booked at ${time} on ${date}.`]
      });
    }
    throw error;
  } finally {
    await connection.close();
  }
});

router.patch('/appointments/:id', async (request, response) => {
  const appointmentId = Number(request.params.id);
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    return response.status(404).json({ errors: ['Appointment not found.'] });
  }

  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT appointment_id,
              TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date,
              TO_CHAR(appointment_date, 'HH24:MI') AS appointment_time,
              appointment_status,
              confirmation_status,
              veterinarian_id
       FROM appointments
       WHERE appointment_id = :appointment_id
       FOR UPDATE`,
      { appointment_id: appointmentId }
    );
    const row = result.rows[0];
    if (!row) {
      await connection.rollback();
      return response.status(404).json({ errors: ['Appointment not found.'] });
    }
    const isAdmin = request.user.role === 'admin';
    if (!isAdmin && row.VETERINARIAN_ID !== request.user.veterinarianId) {
      await connection.rollback();
      return response.status(404).json({ errors: ['Appointment not found.'] });
    }

    const status = String(request.body?.status || '').trim().toLowerCase();
    if (status === 'confirmed' && !isAdmin) {
      if (row.APPOINTMENT_STATUS !== 'SCHEDULED' ||
          row.CONFIRMATION_STATUS !== 'PENDING') {
        await connection.rollback();
        return response.status(409).json({
          errors: ['Only visits awaiting confirmation can be accepted.']
        });
      }
      await connection.execute(
        `UPDATE appointments
         SET confirmation_status = 'ACCEPTED'
         WHERE appointment_id = :appointment_id`,
        { appointment_id: appointmentId }
      );
    } else if (!isAdmin) {
      await connection.rollback();
      return response.status(403).json({ errors: ['Your account cannot perform this action.'] });
    } else if (!['completed', 'cancelled'].includes(status)) {
      await connection.rollback();
      return response.status(400).json({ errors: ['Choose Completed or Cancelled.'] });
    } else {
      if (!appointmentIsActive(row)) {
        await connection.rollback();
        return response.status(409).json({ errors: ['Only active appointments can be updated.'] });
      }
      if (status === 'completed' && row.CONFIRMATION_STATUS === 'PENDING') {
        await connection.rollback();
        return response.status(409).json({
          errors: ['A veterinarian must confirm this appointment before it can be completed.']
        });
      }
      if (status === 'completed' &&
          new Date(`${row.APPOINTMENT_DATE}T${row.APPOINTMENT_TIME}:00`) > new Date()) {
        await connection.rollback();
        return response.status(409).json({
          errors: ['An appointment cannot be completed before its scheduled time.']
        });
      }
      await connection.execute(
        `UPDATE appointments
         SET appointment_status = :appointment_status
         WHERE appointment_id = :appointment_id`,
        {
          appointment_status: status === 'completed' ? 'COMPLETED' : 'CANCELLED',
          appointment_id: appointmentId
        }
      );
    }
    await connection.commit();
    return response.json(await getAppointment(connection, appointmentId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
});

router.patch('/invoices/:id', requireRole('admin'), async (request, response) => {
  const invoiceId = Number(request.params.id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return response.status(404).json({ errors: ['Invoice not found.'] });
  }
  if (String(request.body?.status || '').trim().toLowerCase() !== 'paid') {
    return response.status(400).json({ errors: ['Invoice status can only be changed to Paid.'] });
  }

  const connection = await getConnection();
  try {
    const invoiceResult = await connection.execute(
      `SELECT i.invoice_id,
              i.invoice_status,
              i.appointment_id,
              NVL((
                  SELECT SUM(s.quantity * s.unit_price)
                  FROM appointment_services s
                  WHERE s.appointment_id = i.appointment_id
              ), 0) +
              NVL((
                  SELECT SUM(rx.quantity * rx.unit_price)
                  FROM prescriptions rx
                  WHERE rx.appointment_id = i.appointment_id
              ), 0) AS invoice_total,
              (SELECT NVL(SUM(p.amount), 0)
               FROM payments p
               WHERE p.invoice_id = i.invoice_id) AS payment_total
       FROM invoices i
       WHERE i.invoice_id = :invoice_id
       FOR UPDATE`,
      { invoice_id: invoiceId }
    );
    const invoice = invoiceResult.rows[0];
    if (!invoice) {
      await connection.rollback();
      return response.status(404).json({ errors: ['Invoice not found.'] });
    }
    if (invoice.INVOICE_STATUS === 'PAID') {
      await connection.rollback();
      return response.status(409).json({ errors: ['This invoice is already paid.'] });
    }
    const balance = Number(invoice.INVOICE_TOTAL) - Number(invoice.PAYMENT_TOTAL);
    if (balance <= 0) {
      await connection.rollback();
      return response.status(409).json({
        errors: ['This invoice has no outstanding balance to pay.']
      });
    }
    await connection.execute(
      `INSERT INTO payments (invoice_id, amount, payment_method)
       VALUES (:invoice_id, :amount, 'CASH')`,
      { invoice_id: invoiceId, amount: balance }
    );
    await connection.commit();
    const invoices = await getInvoices(connection);
    return response.json(invoices.find((item) => item.id === invoiceId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
});

module.exports = router;
