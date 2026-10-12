// Vetwise Clinic console - loads demo data from the Express API and renders
// the dashboard, patients, appointments, and billing views.

const state = {
  dashboard: null,
  user: null,
  patients: [],
  veterinarians: [],
  appointments: [],
  invoices: [],
  dashboardDate: null
};

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !url.startsWith('/api/auth/')) {
      state.user = null;
      showAuthScreen('Your sign-in has expired. Please sign in again.');
    }
    const error = new Error(data.errors?.join(' ') || data.error || `Could not complete ${url}`);
    error.fieldErrors = data.errors || [data.error || 'The request failed.'];
    error.status = response.status;
    throw error;
  }
  return data;
}

const jsonRequest = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const get = (url) => request(url);
const post = (url, body) => request(url, jsonRequest('POST', body));
const patch = (url, body) => request(url, jsonRequest('PATCH', body));

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));

const className = (value) => String(value).toLowerCase().replace(/[^a-z]+/g, '-');
const prettyDate = (value) => value
  ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
    .format(new Date(`${value}T12:00:00`))
  : 'Not yet';
const localIsoDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addCalendarDays = (date, days) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return result;
};
const money = (value) => Number(value).toFixed(2);
const isActiveAppointment = (appointment) =>
  ['Pending confirmation', 'Confirmed', 'Scheduled'].includes(appointment.status);

function renderDashboard() {
  const { stats, clinic } = state.dashboard;
  const isVeterinarian = state.user.role === 'veterinarian';

  document.querySelector('#summary-grid').innerHTML = stats.map((stat) => `
    <article class="stat-card ${className(stat.tone)}">
      <span class="stat-label">${escapeHtml(stat.label)}</span>
      <strong>${escapeHtml(stat.value)}</strong>
      <span class="stat-detail">${escapeHtml(stat.detail)}</span>
    </article>`).join('');

  const today = localIsoDate();
  const futureAppointments = state.appointments
    .filter((appointment) => isActiveAppointment(appointment) && appointment.date >= today)
    .sort((first, second) => `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = localIsoDate(addCalendarDays(new Date(), index));
    const count = futureAppointments.filter((appointment) => appointment.date === date).length;
    return { date, count };
  });
  const maxCount = Math.max(1, ...days.map((day) => day.count));

  document.querySelector('#agenda-timeline').innerHTML = days.map(({ date, count }) => {
    const dateObject = new Date(`${date}T12:00:00`);
    const weekday = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(dateObject);
    const dayNumber = dateObject.getDate();
    const isSelected = state.dashboardDate === date;
    return `<button type="button" class="agenda-day${isSelected ? ' selected' : ''}" data-agenda-date="${date}" aria-pressed="${isSelected}" aria-label="Show ${weekday}, ${prettyDate(date)}: ${count} ${count === 1 ? 'appointment' : 'appointments'}">
      <span>${escapeHtml(weekday)}</span><strong>${dayNumber}</strong>
      <span class="agenda-bar" aria-hidden="true"><span style="--bar-height:${Math.max(12, count / maxCount * 100)}%"></span></span>
      <small>${count}</small>
    </button>`;
  }).join('');

  document.querySelector('#agenda-timeline').hidden = isVeterinarian;
  const selectedDate = state.dashboardDate || today;
  const visibleAppointments = isVeterinarian
    ? futureAppointments
    : futureAppointments.filter((appointment) => appointment.date === selectedDate);
  const selectedDateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
    .format(new Date(`${selectedDate}T12:00:00`));
  document.querySelector('#agenda-caption').textContent =
    isVeterinarian
      ? `${visibleAppointments.length} upcoming ${visibleAppointments.length === 1 ? 'appointment' : 'appointments'} assigned to you`
      : `${visibleAppointments.length} ${visibleAppointments.length === 1 ? 'appointment' : 'appointments'} · ${selectedDateLabel}`;
  document.querySelector('#upcoming-list').innerHTML = visibleAppointments.map((appointment) => `
    <article class="schedule-item">
      <span class="schedule-time">${escapeHtml(appointment.time)}</span>
      <div><strong>${escapeHtml(appointment.patient)}</strong>
        <p>${escapeHtml(appointment.reason)} · ${escapeHtml(appointment.veterinarian)}</p></div>
      <div class="schedule-meta">
        <span class="chip">${prettyDate(appointment.date)}</span>
        <span class="status ${className(appointment.status)}">${escapeHtml(appointment.status)}</span>
        ${isVeterinarian && appointment.status === 'Pending confirmation'
          ? `<button class="table-action" type="button" data-appointment-action="confirmed" data-id="${appointment.id}">Confirm visit</button>`
          : ''}
      </div>
    </article>`).join('') || '<p class="empty-state">No upcoming visits booked.</p>';

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
  const role = state.user?.role;
  const now = new Date();
  const canManage = role === 'admin';
  const actionHeading = document.querySelector('.appointment-actions-heading');
  actionHeading.hidden = !canManage;
  document.querySelector('#appointments-table-body').innerHTML = rows.map((appointment) => {
    const canComplete = new Date(`${appointment.date}T${appointment.time}:00`) <= now;
    const activeAppointment = isActiveAppointment(appointment);
    const canCompleteAppointment = activeAppointment &&
      appointment.status !== 'Pending confirmation' && canComplete;
    const actions = activeAppointment && canManage
      ? `<td class="row-actions">${canCompleteAppointment ? `<button class="table-action" type="button" data-appointment-action="completed" data-id="${appointment.id}">Complete</button>` : ''}
          <button class="table-action danger-action" type="button" data-appointment-action="cancelled" data-id="${appointment.id}">Cancel</button></td>`
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
  const isAdmin = state.user?.role === 'admin';
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
  const profile = state.user;
  if (!profile) return;
  document.querySelector('#profile-avatar').textContent = profile.initials;
  document.querySelector('#profile-name').textContent = profile.name;
  document.querySelector('#profile-title').textContent = profile.title;
  document.querySelectorAll('.admin-only').forEach((element) => {
    element.hidden = profile.role !== 'admin';
  });
  const isVeterinarian = profile.role === 'veterinarian';
  document.querySelector('#dashboard-schedule-label').textContent =
    isVeterinarian ? 'Your worklist' : 'Daily overview';
  document.querySelector('#dashboard-schedule-title').textContent =
    isVeterinarian ? 'All upcoming appointments' : 'Clinic appointments';
  document.querySelector('#page-title').textContent = isVeterinarian
    ? `Welcome, ${profile.name}.`
    : 'Clinic overview.';
  renderAppointments(filterRows(state.appointments, document.querySelector('#appointment-filter').value));
  renderInvoices(filterRows(state.invoices, document.querySelector('#invoice-filter').value));
}

function showView(view) {
  if (['appointments', 'billing'].includes(view) && state.user?.role !== 'admin') {
    view = 'dashboard';
  }
  document.querySelectorAll('.view').forEach((section) =>
    section.classList.toggle('active', section.id === `${view}-view`));
  document.querySelectorAll('.nav-item').forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#page-title').textContent = {
    dashboard: state.user?.role === 'veterinarian'
      ? `Welcome, ${state.user.name}.`
      : 'Clinic overview.',
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
  message.textContent = 'Clinic data could not be loaded. Check that the server is running, then refresh this page.';
  message.hidden = false;
}

function showAuthScreen(message = '') {
  document.querySelector('#app-shell').hidden = true;
  document.querySelector('#auth-screen').hidden = false;
  document.querySelector('#auth-feedback').textContent = message;
  document.querySelector('#auth-feedback').hidden = !message;
  setAuthView('login');
}

function setAuthView(view) {
  const registration = view === 'register';
  document.querySelector('#login-form').hidden = registration;
  document.querySelector('#register-form').hidden = !registration;
  document.querySelector('#auth-title').textContent = registration ? 'Join your team.' : 'Welcome back.';
  document.querySelector('#auth-feedback').hidden = true;
}

function setRegistrationRole(role) {
  const isAdmin = role === 'admin';
  const specialty = document.querySelector('#specialty-field');
  const specialtyInput = specialty.querySelector('input');
  specialty.hidden = isAdmin;
  specialtyInput.required = !isAdmin;
  for (const fieldId of ['license-field', 'phone-field']) {
    const field = document.querySelector(`#${fieldId}`);
    field.hidden = isAdmin;
    field.querySelector('input').required = !isAdmin;
  }
  const invitation = document.querySelector('#invitation-field');
  const invitationInput = invitation.querySelector('input');
  invitation.hidden = false;
  invitationInput.required = true;
  document.querySelector('#invitation-label').textContent =
    isAdmin ? 'Administrator invitation code' : 'Staff invitation code';
}

function configureRegistration(options) {
  const veterinarianOption = document.querySelector('#veterinarian-registration-option');
  const administratorOption = document.querySelector('#admin-registration-option');
  veterinarianOption.disabled = !options.veterinarianRegistrationEnabled;
  administratorOption.disabled = !options.adminRegistrationEnabled;
  if (veterinarianOption.disabled) veterinarianOption.textContent = 'Veterinarian · staff invite required';
  else veterinarianOption.textContent = 'Veterinarian';
  if (administratorOption.disabled) administratorOption.textContent = 'Administrator · invite setup required';
  else administratorOption.textContent = 'Administrator';

  const roleSelect = document.querySelector('#registration-role');
  const hasAvailableRole = options.veterinarianRegistrationEnabled || options.adminRegistrationEnabled;
  roleSelect.disabled = !hasAvailableRole;
  if (roleSelect.selectedOptions[0]?.disabled) {
    roleSelect.value = options.adminRegistrationEnabled ? 'admin' : 'veterinarian';
  }
  document.querySelector('#register-submit').disabled = !hasAvailableRole;

  const notice = document.querySelector('#registration-notice');
  notice.hidden = hasAvailableRole;
  notice.textContent = 'Account creation is disabled until the clinic owner configures private staff invitations.';
  setRegistrationRole(roleSelect.value);
}

async function loadClinicData() {
  const isAdmin = state.user.role === 'admin';
  const [dashboard, patients, veterinarians, appointments, invoices] = await Promise.all([
    get('/api/dashboard'),
    get('/api/patients'),
    get('/api/veterinarians'),
    get('/api/appointments'),
    isAdmin ? get('/api/invoices') : Promise.resolve([])
  ]);
  state.dashboard = dashboard;
  state.patients = patients;
  state.veterinarians = veterinarians;
  state.appointments = appointments;
  state.invoices = invoices;
  state.dashboardDate = localIsoDate();

  document.querySelector('#app-shell').hidden = false;
  document.querySelector('#auth-screen').hidden = true;
  renderProfile();
  renderDashboard();
  renderPatients();
  renderAppointments();
  renderInvoices();
}

async function handleAuthSubmit(event, endpoint) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  const feedback = document.querySelector('#auth-feedback');
  feedback.hidden = true;
  try {
    const result = await post(endpoint, payload);
    state.user = result.user;
    await loadClinicData();
  } catch (error) {
    if (!error.status) console.error(error);
    feedback.textContent = error.fieldErrors?.join(' ') ||
      'Could not load the clinic workspace. Check the server and try again.';
    feedback.hidden = false;
  }
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
  const bookingTime = document.querySelector('#booking-time');
  bookingTime.min = '08:00';
  bookingTime.max = '17:30';

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
    toast(status === 'confirmed'
      ? 'Visit confirmed and added to your schedule.'
      : `Appointment marked ${status}.`);
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
  if (status === 'open') return rows.filter((row) => row.status.toLowerCase() !== 'paid');
  return status === 'all' ? rows : rows.filter((row) => row.status.toLowerCase() === status);
};

async function refreshData() {
  const isAdmin = state.user?.role === 'admin';
  const [dashboard, patients, appointments, invoices] = await Promise.all([
    get('/api/dashboard'),
    get('/api/patients'),
    get('/api/appointments'),
    isAdmin ? get('/api/invoices') : Promise.resolve([])
  ]);
  state.dashboard = dashboard;
  state.patients = patients;
  state.appointments = appointments;
  state.invoices = invoices;
  if (!state.dashboardDate) state.dashboardDate = localIsoDate();
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
    const [options, session] = await Promise.all([get('/api/auth/options'), get('/api/auth/me')]);
    configureRegistration(options);
    if (session.user) {
      state.user = session.user;
      await loadClinicData();
    } else {
      showAuthScreen();
    }
  } catch (error) {
    console.error(error);
    showAuthScreen('Unable to connect to the clinic server. Refresh the page and try again.');
  }
}

// --- Event wiring ---------------------------------------------------------

document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;
  const nav = event.target.closest('[data-view]');
  const appointmentAction = event.target.closest('[data-appointment-action]');
  const invoiceAction = event.target.closest('[data-invoice-action]');
  const agendaDate = event.target.closest('[data-agenda-date]');
  const authView = event.target.closest('[data-auth-view]');
  if (nav) {
    event.preventDefault();
    showView(nav.dataset.view);
  }
  if (authView) setAuthView(authView.dataset.authView);
  if (agendaDate) {
    state.dashboardDate = agendaDate.dataset.agendaDate;
    renderDashboard();
  }
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

document.querySelector('#login-form').addEventListener('submit', (event) =>
  handleAuthSubmit(event, '/api/auth/login'));
document.querySelector('#register-form').addEventListener('submit', (event) =>
  handleAuthSubmit(event, '/api/auth/register'));
document.querySelector('#registration-role').addEventListener('change', (event) =>
  setRegistrationRole(event.currentTarget.value));
document.querySelector('#logout-button').addEventListener('click', async () => {
  try {
    await post('/api/auth/logout', {});
    state.user = null;
    document.querySelector('#login-form').reset();
    document.querySelector('#register-form').reset();
    showAuthScreen('You have signed out.');
  } catch (error) {
    showError(error);
  }
});

start();
