// In-memory practice records for the Vetwise Clinic console.
// Swap these for Oracle queries (node-oracledb) when the database is connected.

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
  { id: 1, name: 'Dr. Maya Chen', specialty: 'Internal medicine' },
  { id: 2, name: 'Dr. Theo Martin', specialty: 'Surgery' },
  { id: 3, name: 'Dr. Priya Shah', specialty: 'Dentistry' },
  { id: 4, name: 'Dr. Lena Novak', specialty: 'Exotic animals' },
  { id: 5, name: 'Dr. Omar Haddad', specialty: 'Dermatology' }
];

const profiles = [
  { id: 'vet-hannibal', name: 'Dr. Hannibal Lecter', title: 'Lead veterinarian', role: 'veterinarian', initials: 'HL' },
  { id: 'admin-jordan', name: 'Jordan Ellis', title: 'Clinic administrator', role: 'admin', initials: 'JE' }
];

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
  { id: 61, date: toIsoDate(dateFromToday(0)), time: '09:00', patientId: 1, patient: 'Daisy', owner: 'Avery Bennett', veterinarianId: 1, veterinarian: 'Dr. Maya Chen', reason: 'Annual wellness exam', status: 'Scheduled' },
  { id: 62, date: toIsoDate(dateFromToday(0)), time: '10:30', patientId: 2, patient: 'Milo', owner: 'Jordan Ellis', veterinarianId: 2, veterinarian: 'Dr. Theo Martin', reason: 'Ear check', status: 'Scheduled' },
  { id: 63, date: toIsoDate(dateFromToday(0)), time: '11:15', patientId: 3, patient: 'Juniper', owner: 'Morgan Rivera', veterinarianId: 1, veterinarian: 'Dr. Maya Chen', reason: 'Vaccination visit', status: 'Scheduled' },
  { id: 64, date: toIsoDate(dateFromToday(0)), time: '13:00', patientId: 4, patient: 'Fig', owner: 'Casey Chen', veterinarianId: 3, veterinarian: 'Dr. Priya Shah', reason: 'Dental check', status: 'Scheduled' },
  { id: 65, date: toIsoDate(dateFromToday(0)), time: '14:30', patientId: 5, patient: 'Pip', owner: 'Riley Morgan', veterinarianId: 2, veterinarian: 'Dr. Theo Martin', reason: 'Nail trim', status: 'Scheduled' },
  { id: 66, date: toIsoDate(dateFromToday(0)), time: '15:15', patientId: 6, patient: 'Sunny', owner: 'Sam Patel', veterinarianId: 4, veterinarian: 'Dr. Lena Novak', reason: 'Wing examination', status: 'Scheduled' },
  { id: 67, date: toIsoDate(dateFromToday(1)), time: '09:00', patientId: 7, patient: 'Otis', owner: 'Taylor Brooks', veterinarianId: 1, veterinarian: 'Dr. Maya Chen', reason: 'Mobility follow-up', status: 'Scheduled' },
  { id: 68, date: toIsoDate(dateFromToday(1)), time: '10:30', patientId: 8, patient: 'Clover', owner: 'Alexis Kim', veterinarianId: 5, veterinarian: 'Dr. Omar Haddad', reason: 'Skin review', status: 'Scheduled' },
  { id: 54, date: toIsoDate(dateFromToday(-5)), time: '10:00', patientId: 4, patient: 'Fig', owner: 'Casey Chen', veterinarianId: 1, veterinarian: 'Dr. Maya Chen', reason: 'Routine check-up', status: 'Completed' },
  { id: 55, date: toIsoDate(dateFromToday(-8)), time: '13:00', patientId: 8, patient: 'Clover', owner: 'Alexis Kim', veterinarianId: 3, veterinarian: 'Dr. Priya Shah', reason: 'Wellness exam', status: 'Completed' }
];

const invoices = [
  { id: 1043, patient: 'Juniper', owner: 'Morgan Rivera', issued: toIsoDate(dateFromToday(-3)), amount: 96.5, status: 'Unpaid' },
  { id: 1042, patient: 'Pip', owner: 'Riley Morgan', issued: toIsoDate(dateFromToday(-9)), amount: 45, status: 'Unpaid' },
  { id: 1041, patient: 'Otis', owner: 'Taylor Brooks', issued: toIsoDate(dateFromToday(-21)), amount: 210, status: 'Part paid' },
  { id: 1040, patient: 'Clover', owner: 'Alexis Kim', issued: toIsoDate(dateFromToday(-2)), amount: 60, status: 'Paid' },
  { id: 1039, patient: 'Fig', owner: 'Casey Chen', issued: toIsoDate(dateFromToday(-6)), amount: 120, status: 'Paid' },
  { id: 1038, patient: 'Sunny', owner: 'Sam Patel', issued: toIsoDate(dateFromToday(-19)), amount: 75, status: 'Paid' }
];

module.exports = {
  clinic,
  profiles,
  patients,
  veterinarians,
  appointments,
  invoices,
  toIsoDate,
  dateFromToday
};
