// Vetwise Clinic console - loads demo data from the Express API and renders
// the dashboard, patients, appointments, and billing views.

const state = {
  dashboard: null,
  profiles: [],
  currentProfile: null,
  patients: [],
  veterinarians: [],
  appointments: [],
  invoices: []
};

const get = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.json();
};

const post = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('The request failed.');
    error.fieldErrors = data.errors || [data.error || 'The request failed.'];
    error.status = response.status;
    throw error;
  }
  return data;
};

const patch = async (url, body) => {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('The request failed.');
    error.fieldErrors = data.errors || [data.error || 'The request failed.'];
    error.status = response.status;
    throw error;
  }
  return data;
};

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));

const className = (value) => String(value).toLowerCase().replace(/[^a-z]+/g, '-');
const prettyDate = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
  .format(new Date(`${value}T12:00:00`));
const money = (value) => Number(value).toFixed(2);

function renderDashboard() {
  const { stats, upcoming, alerts, clinic } = state.dashboard;

  document.querySelector('#summary-grid').innerHTML = stats.map((stat) => `
    <article class="stat-card ${className(stat.tone)}">
      <p>${escapeHtml(stat.label)}</p>
      <strong>${escapeHtml(stat.value)}</strong>
      <p>${escapeHtml(stat.detail)}</p>
    </article>`).join('');

  document.querySelector('#upcoming-list').innerHTML = upcoming.map((appointment) => `
    <article class="schedule-item">
      <span class="schedule-time">${escapeHtml(appointment.time)}</span>
      <div><strong>${escapeHtml(appointment.patient)}</strong>
        <p>${escapeHtml(appointment.reason)} · ${escapeHtml(appointment.veterinarian)}</p></div>
      <span class="chip">${prettyDate(appointment.date)}</span>
    </article>`).join('') || '<p class="empty-state">No upcoming visits booked.</p>';

  document.querySelector('#alert-list').innerHTML = alerts.map((alert) => `
    <article class="alert-card">
      <h3>${escapeHtml(alert.title)}</h3>
      <p>${escapeHtml(alert.text)}</p>
      <button type="button" data-view-target="${escapeHtml(alert.view)}">${escapeHtml(alert.action)} →</button>
    </article>`).join('');

  document.querySelector('#clinic-name').textContent = clinic.name;
  document.querySelector('#clinic-facts').innerHTML = [
    ['Address', clinic.addressLine],
    ['Phone', clinic.phone],
    ['Emergency line', clinic.emergencyLine],
    ['Opening hours', clinic.openingHours]
  ].map(([label, value]) => `
    <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
}

function renderPatients(rows = state.patients) {
  document.querySelector('#patients-table-body').innerHTML = rows.map((patient) => `
    <tr>
      <td><strong>${escapeHtml(patient.name)}</strong><small>ID #${escapeHtml(patient.id)}</small></td>
      <td>${escapeHtml(patient.species)}<small>${escapeHtml(patient.breed)}</small></td>
      <td>${escapeHtml(patient.owner)}</td>
      <td>${prettyDate(patient.lastVisit)}</td>
      <td><span class="status ${className(patient.status)}">${escapeHtml(patient.status)}</span></td>
    </tr>`).join('') || '<tr><td class="empty-state" colspan="5">No patient records match this search.</td></tr>';
}

function filterPatients(search) {
  return state.patients.filter((patient) => Object.values(patient)
    .some((value) => String(value).toLowerCase().includes(search)));
}

function renderAppointments(rows = state.appointments) {
  const role = state.currentProfile?.role;
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const canManage = role === 'admin' || role === 'veterinarian';
  const actionHeading = document.querySelector('.appointment-actions-heading');
  actionHeading.hidden = !canManage;
  document.querySelector('#appointments-table-body').innerHTML = rows.map((appointment) => {
    const canComplete = appointment.date <= todayIso;
    const actions = appointment.status === 'Scheduled' && canManage
      ? `<td class="row-actions">${canComplete ? `<button class="table-action" type="button" data-appointment-action="completed" data-id="${appointment.id}">Complete</button>` : ''}
          ${role === 'admin' ? `<button class="table-action danger-action" type="button" data-appointment-action="cancelled" data-id="${appointment.id}">Cancel</button>` : ''}</td>`
      : canManage ? '<td></td>' : '';
    return `
    <tr>
      <td><strong>${prettyDate(appointment.date)}</strong><small>${escapeHtml(appointment.time)}</small></td>
      <td><strong>${escapeHtml(appointment.patient)}</strong><small>${escapeHtml(appointment.owner)}</small></td>
      <td>${escapeHtml(appointment.veterinarian)}</td>
      <td>${escapeHtml(appointment.reason)}</td>
      <td><span class="status ${className(appointment.status)}">${escapeHtml(appointment.status)}</span></td>
      ${actions}
    </tr>`;
  }).join('') || `<tr><td class="empty-state" colspan="${canManage ? 6 : 5}">No appointments match this filter.</td></tr>`;
}

function renderInvoices(rows = state.invoices) {
  const isAdmin = state.currentProfile?.role === 'admin';
  document.querySelector('.invoice-actions-heading').hidden = !isAdmin;
  document.querySelector('#invoices-table-body').innerHTML = rows.map((invoice) => `
    <tr>
      <td><strong>#${escapeHtml(invoice.id)}</strong></td>
      <td>${escapeHtml(invoice.patient)}</td>
      <td>${escapeHtml(invoice.owner)}</td>
      <td>${prettyDate(invoice.issued)}</td>
      <td>${money(invoice.amount)}</td>
      <td><span class="status ${className(invoice.status)}">${escapeHtml(invoice.status)}</span></td>
      ${isAdmin ? `<td class="row-actions">${invoice.status !== 'Paid' ? `<button class="table-action" type="button" data-invoice-action="paid" data-id="${invoice.id}">Mark paid</button>` : ''}</td>` : ''}
    </tr>`).join('') || `<tr><td class="empty-state" colspan="${isAdmin ? 7 : 6}">No invoices match this filter.</td></tr>`;
}

function renderProfile() {
  const profile = state.currentProfile;
  if (!profile) return;
  document.querySelector('#profile-avatar').textContent = profile.initials;
  document.querySelector('#profile-name').textContent = profile.name;
  document.querySelector('#profile-title').textContent = profile.title;
  document.querySelector('#profile-select').value = profile.id;
  document.querySelectorAll('.admin-only').forEach((element) => {
    element.hidden = profile.role !== 'admin';
  });
  renderAppointments(filterRows(state.appointments, document.querySelector('#appointment-filter').value));
  renderInvoices(filterRows(state.invoices, document.querySelector('#invoice-filter').value));
}

function showView(view) {
  document.querySelectorAll('.view').forEach((section) =>
    section.classList.toggle('active', section.id === `${view}-view`));
  document.querySelectorAll('.nav-item').forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#page-title').textContent = {
    dashboard: 'Good morning, clinic team.',
    patients: 'Patient records.',
    appointments: 'Appointment schedule.',
    billing: 'Invoices and payments.'
  }[view] || 'Clinic overview.';
  document.querySelector('.sidebar').classList.remove('open');
  const menuButton = document.querySelector('#menu-button');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
}

let toastTimer;
function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove('show'), 2600);
}

function showError(error) {
  console.error(error);
  const message = document.querySelector('#load-error');
  message.textContent = 'Demo data could not be loaded. Check that the Express server is running, then refresh this page.';
  message.hidden = false;
}

// --- Booking dialog -------------------------------------------------------

const dialog = document.querySelector('#booking-dialog');
const bookingForm = document.querySelector('#booking-form');
const bookingError = document.querySelector('#booking-error');
const patientDialog = document.querySelector('#patient-dialog');
const patientForm = document.querySelector('#patient-form');
const patientError = document.querySelector('#patient-error');

function resetBookingForm() {
  bookingForm.reset();
  bookingError.hidden = true;
  bookingError.textContent = '';
}

function openBookingDialog() {
  resetBookingForm();

  const patientSelect = document.querySelector('#booking-patient');
  patientSelect.innerHTML = '<option value="">Choose a patient</option>' +
    state.patients.map((patient) =>
      `<option value="${patient.id}">${escapeHtml(patient.name)} · ${escapeHtml(patient.owner)}</option>`).join('');

  const vetSelect = document.querySelector('#booking-veterinarian');
  vetSelect.innerHTML = '<option value="">Choose a veterinarian</option>' +
    state.veterinarians.map((veterinarian) =>
      `<option value="${veterinarian.id}">${escapeHtml(veterinarian.name)}</option>`).join('');

  const today = new Date();
  document.querySelector('#booking-date').min =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  dialog.showModal();
  patientSelect.focus();
}

function closeBookingDialog() {
  dialog.close();
  resetBookingForm();
}

async function submitBooking(event) {
  event.preventDefault();

  const payload = {
    patientId: Number(document.querySelector('#booking-patient').value),
    veterinarianId: Number(document.querySelector('#booking-veterinarian').value),
    date: document.querySelector('#booking-date').value,
    time: document.querySelector('#booking-time').value,
    reason: document.querySelector('#booking-reason').value.trim()
  };

  try {
    await post('/api/appointments', payload);
    closeBookingDialog();
    await refreshData();
    const pretty = new Date(`${payload.date}T12:00:00`)
      .toLocaleDateString('en', { month: 'short', day: 'numeric' });
    toast(`Appointment booked for ${pretty} at ${payload.time}.`);
  } catch (error) {
    if (error.status) {
      bookingError.textContent = error.fieldErrors.join(' ');
      bookingError.hidden = false;
    } else {
      showError(error);
    }
  }
}

function openPatientDialog() {
  patientForm.reset();
  patientError.hidden = true;
  patientError.textContent = '';
  patientDialog.showModal();
  document.querySelector('#patient-name').focus();
}

function closePatientDialog() {
  patientDialog.close();
  patientForm.reset();
  patientError.hidden = true;
  patientError.textContent = '';
}

async function submitPatient(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(patientForm).entries());
  for (const [field, value] of Object.entries(payload)) payload[field] = String(value).trim();

  try {
    const patient = await post('/api/patients', payload);
    await refreshData();
    closePatientDialog();
    toast(`${patient.name} added to the patient register.`);
  } catch (error) {
    if (error.status) {
      patientError.textContent = error.fieldErrors.join(' ');
      patientError.hidden = false;
    } else {
      showError(error);
    }
  }
}

async function updateAppointment(id, status) {
  try {
    await patch(`/api/appointments/${id}`, { status });
    await refreshData();
    toast(`Appointment marked ${status}.`);
  } catch (error) {
    if (error.status) toast(error.fieldErrors.join(' '));
    else showError(error);
  }
}

async function updateInvoice(id) {
  try {
    await patch(`/api/invoices/${id}`, { status: 'Paid' });
    await refreshData();
    toast(`Invoice #${id} marked paid.`);
  } catch (error) {
    if (error.status) toast(error.fieldErrors.join(' '));
    else showError(error);
  }
}

const filterRows = (rows, value) => {
  const status = String(value || 'all').toLowerCase();
  return status === 'all' ? rows : rows.filter((row) => row.status.toLowerCase() === status);
};

async function refreshData() {
  const [dashboard, patients, appointments, invoices] = await Promise.all([
    get('/api/dashboard'), get('/api/patients'), get('/api/appointments'), get('/api/invoices')
  ]);
  state.dashboard = dashboard;
  state.patients = patients;
  state.appointments = appointments;
  state.invoices = invoices;
  renderDashboard();
  renderPatients(filterPatients(document.querySelector('#patient-search').value.trim().toLowerCase()));
  renderAppointments(filterRows(state.appointments, document.querySelector('#appointment-filter').value));
  renderInvoices(filterRows(state.invoices, document.querySelector('#invoice-filter').value));
}

// --- Data loading ---------------------------------------------------------

async function start() {
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('en', {
    weekday: 'long', month: 'long', day: 'numeric'
  }).format(new Date());

  try {
    const [dashboard, profiles, patients, veterinarians, appointments, invoices] = await Promise.all([
      get('/api/dashboard'), get('/api/profiles'), get('/api/patients'), get('/api/veterinarians'),
      get('/api/appointments'), get('/api/invoices')
    ]);
    state.dashboard = dashboard;
    state.profiles = profiles;
    state.currentProfile = profiles.find((profile) => profile.id === 'vet-hannibal');
    state.patients = patients;
    state.veterinarians = veterinarians;
    state.appointments = appointments;
    state.invoices = invoices;

    renderDashboard();
    document.querySelector('#profile-select').innerHTML = profiles.map((profile) =>
      `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)} · ${escapeHtml(profile.title)}</option>`
    ).join('');
    renderProfile();
    renderPatients();
    renderAppointments();
    renderInvoices();
  } catch (error) {
    showError(error);
  }
}

// --- Event wiring ---------------------------------------------------------

document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;
  const nav = event.target.closest('[data-view]');
  const target = event.target.closest('[data-view-target]');
  const appointmentAction = event.target.closest('[data-appointment-action]');
  const invoiceAction = event.target.closest('[data-invoice-action]');
  if (nav) {
    event.preventDefault();
    showView(nav.dataset.view);
  }
  if (target) showView(target.dataset.viewTarget);
  if (appointmentAction) await updateAppointment(appointmentAction.dataset.id, appointmentAction.dataset.appointmentAction);
  if (invoiceAction) await updateInvoice(invoiceAction.dataset.id);
});

document.querySelector('#menu-button').addEventListener('click', (event) => {
  const sidebar = document.querySelector('.sidebar');
  const isOpen = sidebar.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(isOpen));
  event.currentTarget.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

document.querySelector('#new-appointment-button').addEventListener('click', openBookingDialog);
document.querySelector('#new-patient-button').addEventListener('click', openPatientDialog);
document.querySelector('#patient-dismiss').addEventListener('click', closePatientDialog);
document.querySelector('#patient-cancel').addEventListener('click', closePatientDialog);
patientForm.addEventListener('submit', submitPatient);
patientDialog.addEventListener('click', (event) => {
  if (event.target === patientDialog) closePatientDialog();
});
document.querySelector('#booking-dismiss').addEventListener('click', closeBookingDialog);
document.querySelector('#booking-cancel').addEventListener('click', closeBookingDialog);
bookingForm.addEventListener('submit', submitBooking);
// Clicking the backdrop (the dialog element itself) closes it.
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeBookingDialog();
});

document.querySelector('#profile-select').addEventListener('change', (event) => {
  state.currentProfile = state.profiles.find((profile) => profile.id === event.currentTarget.value);
  renderProfile();
});

document.querySelector('#patient-search').addEventListener('input', (event) => {
  const search = event.currentTarget.value.trim().toLowerCase();
  renderPatients(filterPatients(search));
});

document.querySelector('#appointment-filter').addEventListener('change', (event) => {
  renderAppointments(filterRows(state.appointments, event.currentTarget.value));
});

document.querySelector('#invoice-filter').addEventListener('change', (event) => {
  renderInvoices(filterRows(state.invoices, event.currentTarget.value));
});

start();
