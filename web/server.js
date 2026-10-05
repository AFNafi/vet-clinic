const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fictional demo records. Keep future Oracle queries and credentials server-side.
const patients = [
  { id: 1, name: 'Daisy', species: 'Dog', breed: 'Golden Retriever', owner: 'Avery Bennett', status: 'Active', lastVisit: '2026-09-21' },
  { id: 2, name: 'Milo', species: 'Dog', breed: 'Beagle', owner: 'Jordan Ellis', status: 'Active', lastVisit: '2026-09-18' },
  { id: 3, name: 'Juniper', species: 'Cat', breed: 'Domestic shorthair', owner: 'Morgan Rivera', status: 'Vaccine due', lastVisit: '2026-09-11' },
  { id: 4, name: 'Fig', species: 'Cat', breed: 'Siamese', owner: 'Casey Chen', status: 'Active', lastVisit: '2026-09-08' },
  { id: 5, name: 'Pip', species: 'Rabbit', breed: 'Holland Lop', owner: 'Riley Morgan', status: 'Vaccine due', lastVisit: '2026-08-29' },
  { id: 6, name: 'Sunny', species: 'Bird', breed: 'Budgerigar', owner: 'Sam Patel', status: 'Active', lastVisit: '2026-08-22' },
  { id: 7, name: 'Otis', species: 'Dog', breed: 'Labrador Retriever', owner: 'Taylor Brooks', status: 'Active', lastVisit: '2026-08-16' },
  { id: 8, name: 'Clover', species: 'Cat', breed: 'Maine Coon', owner: 'Alex Kim', status: 'Active', lastVisit: '2026-08-12' }
];

const appointments = [
  { id: 61, date: '2026-10-06', time: '09:00', patient: 'Daisy', owner: 'Avery Bennett', veterinarian: 'Dr. Maya Chen', reason: 'Annual wellness exam', status: 'Scheduled' },
  { id: 62, date: '2026-10-06', time: '10:30', patient: 'Milo', owner: 'Jordan Ellis', veterinarian: 'Dr. Theo Martin', reason: 'Ear check', status: 'Scheduled' },
  { id: 63, date: '2026-10-06', time: '11:15', patient: 'Juniper', owner: 'Morgan Rivera', veterinarian: 'Dr. Maya Chen', reason: 'Vaccination visit', status: 'Scheduled' },
  { id: 64, date: '2026-10-06', time: '13:00', patient: 'Fig', owner: 'Casey Chen', veterinarian: 'Dr. Priya Shah', reason: 'Dental check', status: 'Scheduled' },
  { id: 65, date: '2026-10-06', time: '14:30', patient: 'Pip', owner: 'Riley Morgan', veterinarian: 'Dr. Theo Martin', reason: 'Nail trim', status: 'Scheduled' },
  { id: 66, date: '2026-10-06', time: '15:15', patient: 'Sunny', owner: 'Sam Patel', veterinarian: 'Dr. Priya Shah', reason: 'Wing examination', status: 'Scheduled' },
  { id: 67, date: '2026-10-07', time: '09:00', patient: 'Otis', owner: 'Taylor Brooks', veterinarian: 'Dr. Maya Chen', reason: 'Mobility follow-up', status: 'Scheduled' },
  { id: 68, date: '2026-10-07', time: '10:30', patient: 'Clover', owner: 'Alex Kim', veterinarian: 'Dr. Theo Martin', reason: 'Wellness review', status: 'Scheduled' },
  { id: 54, date: '2026-09-28', time: '10:00', patient: 'Fig', owner: 'Casey Chen', veterinarian: 'Dr. Maya Chen', reason: 'Routine check-up', status: 'Completed' },
  { id: 55, date: '2026-09-25', time: '13:00', patient: 'Clover', owner: 'Alex Kim', veterinarian: 'Dr. Priya Shah', reason: 'Wellness exam', status: 'Completed' }
];

app.get('/api/dashboard', (request, response) => {
  response.json({
    stats: [
      { label: 'Active patients', value: patients.length, detail: 'Across dogs, cats & more', tone: 'blue' },
      { label: 'Today\'s appointments', value: appointments.filter((appointment) => appointment.date === '2026-10-06' && appointment.status === 'Scheduled').length, detail: 'Your clinic day at a glance', tone: 'green' },
      { label: 'Vaccines due soon', value: patients.filter((patient) => patient.status === 'Vaccine due').length, detail: 'Follow up with their people', tone: 'orange' },
      { label: 'Outstanding invoices', value: 3, detail: 'Fictional demo data', tone: 'purple' }
    ],
    upcoming: appointments.filter((appointment) => appointment.status === 'Scheduled').slice(0, 4),
    alerts: [
      { title: 'Vaccination reminders', text: 'Juniper and Pip are due for a vaccination follow-up.', action: 'Review patients' },
      { title: 'Reception follow-up', text: '3 fictional invoices are waiting for a friendly reminder.', action: 'View appointments' }
    ]
  });
});

app.get('/api/patients', (request, response) => {
  const search = String(request.query.search || '').trim().toLowerCase();
  const filteredPatients = search
    ? patients.filter((patient) => Object.values(patient).some((value) => String(value).toLowerCase().includes(search)))
    : patients;

  response.json(filteredPatients);
});

app.get('/api/appointments', (request, response) => {
  const status = String(request.query.status || 'all').toLowerCase();
  const filteredAppointments = status === 'all'
    ? appointments
    : appointments.filter((appointment) => appointment.status.toLowerCase() === status);

  response.json(filteredAppointments);
});

app.get('/{*path}', (request, response) => {
  response.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Vet Clinic UI is running at http://localhost:${port}`);
});
