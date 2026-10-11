// Fictional practice records for the Vetwise Clinic console.
// The local JSON store persists changes until Oracle is connected.

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Move by calendar days with setDate(). Adding 24 hours of milliseconds gives the
// wrong day when a daylight-saving change makes a day 23 or 25 hours long.
const dateFromToday = (dayOffset) => {
  const date = startOfToday();
  date.setDate(date.getDate() + dayOffset);
  return date;
};

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const clinic = {
  name: 'Vetwise Clinic',
  addressLine: '18 Rowan Street, Northgate',
  phone: '555-0100',
  emergencyLine: '555-0199',
  openingHours: 'Monday to Saturday, 08:00 - 18:00'
};

const veterinarians = [
  { id: 1, name: 'Dr. Olivia Bennett', email: 'olivia.bennett@vetwise.test', specialty: 'Small Animal Medicine' },
  { id: 2, name: 'Dr. Ethan Parker', email: 'ethan.parker@vetwise.test', specialty: 'Surgery' },
  { id: 3, name: 'Dr. Mia Thompson', email: 'mia.thompson@vetwise.test', specialty: 'Dermatology' },
  { id: 4, name: 'Dr. Noah Williams', email: 'noah.williams@vetwise.test', specialty: 'Cardiology' },
  { id: 5, name: 'Dr. Ava Johnson', email: 'ava.johnson@vetwise.test', specialty: 'Emergency Care' },
  { id: 6, name: 'Dr. Liam Anderson', email: 'liam.anderson@vetwise.test', specialty: 'Dentistry' },
  { id: 7, name: 'Dr. Sophia Martinez', email: 'sophia.martinez@vetwise.test', specialty: 'Feline Medicine' },
  { id: 8, name: 'Dr. Lucas Brown', email: 'lucas.brown@vetwise.test', specialty: 'Orthopedics' },
  { id: 9, name: 'Dr. Isabella Davis', email: 'isabella.davis@vetwise.test', specialty: 'Oncology' },
  { id: 10, name: 'Dr. Mason Wilson', email: 'mason.wilson@vetwise.test', specialty: 'Exotic Animal Medicine' },
  { id: 11, name: 'Dr. Maya Chen', email: 'maya.chen@vetwise.test', specialty: 'Internal Medicine' }
];

const firstAppointmentDayOffset = dateFromToday(0).getDay() === 0 ? 1 : 0;

const patients = [
  { id: 1, name: 'Daisy', species: 'Dog', breed: 'Golden Retriever', owner: 'Avery Bennett', status: 'Active', lastVisit: toIsoDate(dateFromToday(-14)) },
  { id: 2, name: 'Milo', species: 'Dog', breed: 'Beagle', owner: 'Jordan Ellis', status: 'Active', lastVisit: toIsoDate(dateFromToday(-11)) },
  { id: 3, name: 'Juniper', species: 'Cat', breed: 'Domestic Shorthair', owner: 'Morgan Rivera', status: 'Vaccination due', lastVisit: toIsoDate(dateFromToday(-3)) },
  { id: 4, name: 'Fig', species: 'Cat', breed: 'Siamese', owner: 'Casey Chen', status: 'Active', lastVisit: toIsoDate(dateFromToday(-6)) },
  { id: 5, name: 'Pip', species: 'Rabbit', breed: 'Holland Lop', owner: 'Riley Morgan', status: 'Vaccination due', lastVisit: toIsoDate(dateFromToday(-9)) },
  { id: 6, name: 'Sunny', species: 'Bird', breed: 'Budgerigar', owner: 'Sam Patel', status: 'Active', lastVisit: toIsoDate(dateFromToday(-19)) },
  { id: 7, name: 'Otis', species: 'Dog', breed: 'Labrador Retriever', owner: 'Taylor Brooks', status: 'Active', lastVisit: toIsoDate(dateFromToday(-21)) },
  { id: 8, name: 'Clover', species: 'Cat', breed: 'Maine Coon', owner: 'Alexis Kim', status: 'Active', lastVisit: toIsoDate(dateFromToday(-2)) }
];

const appointments = [
  { id: 61, date: toIsoDate(dateFromToday(firstAppointmentDayOffset)), time: '09:00', patientId: 1, patient: 'Daisy', owner: 'Avery Bennett', veterinarianId: 1, veterinarian: 'Dr. Olivia Bennett', reason: 'Annual wellness exam', status: 'Scheduled' },
  { id: 62, date: toIsoDate(dateFromToday(firstAppointmentDayOffset)), time: '10:30', patientId: 2, patient: 'Milo', owner: 'Jordan Ellis', veterinarianId: 2, veterinarian: 'Dr. Ethan Parker', reason: 'Ear check', status: 'Scheduled' },
  { id: 63, date: toIsoDate(dateFromToday(firstAppointmentDayOffset)), time: '11:15', patientId: 3, patient: 'Juniper', owner: 'Morgan Rivera', veterinarianId: 3, veterinarian: 'Dr. Mia Thompson', reason: 'Vaccination visit', status: 'Scheduled' },
  { id: 64, date: toIsoDate(dateFromToday(firstAppointmentDayOffset)), time: '13:00', patientId: 4, patient: 'Fig', owner: 'Casey Chen', veterinarianId: 6, veterinarian: 'Dr. Liam Anderson', reason: 'Dental check', status: 'Scheduled' },
  { id: 65, date: toIsoDate(dateFromToday(firstAppointmentDayOffset)), time: '14:30', patientId: 5, patient: 'Pip', owner: 'Riley Morgan', veterinarianId: 7, veterinarian: 'Dr. Sophia Martinez', reason: 'Nail trim', status: 'Scheduled' },
  { id: 66, date: toIsoDate(dateFromToday(firstAppointmentDayOffset)), time: '15:15', patientId: 6, patient: 'Sunny', owner: 'Sam Patel', veterinarianId: 10, veterinarian: 'Dr. Mason Wilson', reason: 'Wing examination', status: 'Scheduled' },
  { id: 67, date: toIsoDate(dateFromToday(firstAppointmentDayOffset + 1)), time: '09:00', patientId: 7, patient: 'Otis', owner: 'Taylor Brooks', veterinarianId: 8, veterinarian: 'Dr. Lucas Brown', reason: 'Mobility follow-up', status: 'Scheduled' },
  { id: 68, date: toIsoDate(dateFromToday(firstAppointmentDayOffset + 1)), time: '10:30', patientId: 8, patient: 'Clover', owner: 'Alexis Kim', veterinarianId: 9, veterinarian: 'Dr. Isabella Davis', reason: 'Skin review', status: 'Scheduled' },
  { id: 54, date: toIsoDate(dateFromToday(-5)), time: '10:00', patientId: 4, patient: 'Fig', owner: 'Casey Chen', veterinarianId: 4, veterinarian: 'Dr. Noah Williams', reason: 'Routine check-up', status: 'Completed' },
  { id: 55, date: toIsoDate(dateFromToday(-8)), time: '13:00', patientId: 8, patient: 'Clover', owner: 'Alexis Kim', veterinarianId: 5, veterinarian: 'Dr. Ava Johnson', reason: 'Wellness exam', status: 'Completed' }
];

const invoices = [
  { id: 1043, patient: 'Juniper', owner: 'Morgan Rivera', issued: toIsoDate(dateFromToday(-3)), amount: 96.5, status: 'Unpaid' },
  { id: 1042, patient: 'Pip', owner: 'Riley Morgan', issued: toIsoDate(dateFromToday(-9)), amount: 45, status: 'Unpaid' },
  { id: 1041, patient: 'Otis', owner: 'Taylor Brooks', issued: toIsoDate(dateFromToday(-21)), amount: 210, status: 'Part paid' },
  { id: 1040, patient: 'Clover', owner: 'Alexis Kim', issued: toIsoDate(dateFromToday(-2)), amount: 60, status: 'Paid' },
  { id: 1039, patient: 'Fig', owner: 'Casey Chen', issued: toIsoDate(dateFromToday(-6)), amount: 120, status: 'Paid' },
  { id: 1038, patient: 'Sunny', owner: 'Sam Patel', issued: toIsoDate(dateFromToday(-19)), amount: 75, status: 'Paid' }
];

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const clinicStorePath = process.env.CLINIC_STORE_PATH ||
  path.join(__dirname, 'clinic-store.json');
const persistedCollections = { patients, veterinarians, appointments, invoices };

if (fs.existsSync(clinicStorePath)) {
  const stored = JSON.parse(fs.readFileSync(clinicStorePath, 'utf8'));
  for (const [name, collection] of Object.entries(persistedCollections)) {
    if (!Array.isArray(stored[name])) {
      throw new Error(`Clinic data store is missing its ${name} collection.`);
    }
    collection.splice(0, collection.length, ...stored[name]);
  }
}

function persistClinicData() {
  fs.mkdirSync(path.dirname(clinicStorePath), { recursive: true });
  const temporaryPath = `${clinicStorePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(persistedCollections, null, 2), { mode: 0o600 });
  fs.renameSync(temporaryPath, clinicStorePath);
  fs.chmodSync(clinicStorePath, 0o600);
}

module.exports = {
  clinic,
  patients,
  veterinarians,
  appointments,
  invoices,
  persistClinicData,
  toIsoDate,
  dateFromToday
};
