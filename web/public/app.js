const state = { dashboard: null, patients: [], appointments: [] };

const get = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.json();
};

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);

const className = (value) => String(value).toLowerCase().replace(/[^a-z]+/g, '-');
const prettyDate = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`));

function renderDashboard() {
  const { stats, upcoming, alerts } = state.dashboard;
  document.querySelector('#summary-grid').innerHTML = stats.map((stat) => `
    <article class="stat-card ${className(stat.tone)}">
      <p>${escapeHtml(stat.label)}</p><strong>${escapeHtml(stat.value)}</strong><p>${escapeHtml(stat.detail)}</p>
    </article>`).join('');
  document.querySelector('#upcoming-list').innerHTML = upcoming.map((appointment) => `
    <article class="schedule-item">
      <span class="schedule-time">${escapeHtml(appointment.time)}</span>
      <div><strong>${escapeHtml(appointment.patient)}</strong><p>${escapeHtml(appointment.reason)} · ${escapeHtml(appointment.veterinarian)}</p></div>
      <span class="chip">${prettyDate(appointment.date)}</span>
    </article>`).join('');
  document.querySelector('#alert-list').innerHTML = alerts.map((alert) => `
    <article class="alert-card"><h3>${escapeHtml(alert.title)}</h3><p>${escapeHtml(alert.text)}</p><button data-view-target="${alert.action === 'Review patients' ? 'patients' : 'appointments'}" type="button">${escapeHtml(alert.action)} →</button></article>`).join('');
}

function renderPatients(rows = state.patients) {
  document.querySelector('#patients-table-body').innerHTML = rows.map((patient) => `
    <tr><td><strong>${escapeHtml(patient.name)}</strong><small>ID #${escapeHtml(patient.id)}</small></td>
      <td>${escapeHtml(patient.species)}<small>${escapeHtml(patient.breed)}</small></td>
      <td>${escapeHtml(patient.owner)}</td><td>${prettyDate(patient.lastVisit)}</td>
      <td><span class="status ${className(patient.status)}">${escapeHtml(patient.status)}</span></td></tr>`).join('') || '<tr><td class="empty-state" colspan="5">No patient records match this search.</td></tr>';
}

function renderAppointments(rows = state.appointments) {
  document.querySelector('#appointments-table-body').innerHTML = rows.map((appointment) => `
    <tr><td><strong>${prettyDate(appointment.date)}</strong><small>${escapeHtml(appointment.time)}</small></td>
      <td><strong>${escapeHtml(appointment.patient)}</strong><small>${escapeHtml(appointment.owner)}</small></td>
      <td>${escapeHtml(appointment.veterinarian)}</td><td>${escapeHtml(appointment.reason)}</td>
      <td><span class="status ${className(appointment.status)}">${escapeHtml(appointment.status)}</span></td></tr>`).join('') || '<tr><td class="empty-state" colspan="5">No appointments match this filter.</td></tr>';
}

function showView(view) {
  document.querySelectorAll('.view').forEach((section) => section.classList.toggle('active', section.id === `${view}-view`));
  document.querySelectorAll('.nav-item').forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#page-title').textContent = {
    dashboard: 'Good morning, clinic team.',
    patients: 'Patient records.',
    appointments: 'Appointment schedule.'
  }[view];
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.remove('open');
  const menuButton = document.querySelector('#menu-button');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
}

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = `${message} is a demo action.`;
  element.classList.add('show');
  window.setTimeout(() => element.classList.remove('show'), 2600);
}

function showError(error) {
  console.error(error);
  const message = document.querySelector('#load-error');
  message.textContent = 'Demo data could not be loaded. Check that the Express server is running, then refresh this page.';
  message.hidden = false;
}

async function start() {
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  try {
    [state.dashboard, state.patients, state.appointments] = await Promise.all([
      get('/api/dashboard'), get('/api/patients'), get('/api/appointments')
    ]);
    renderDashboard(); renderPatients(); renderAppointments();
  } catch (error) {
    showError(error);
  }
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const nav = event.target.closest('[data-view]');
  const target = event.target.closest('[data-view-target]');
  const action = event.target.closest('[data-toast]');
  if (nav) showView(nav.dataset.view);
  if (target) showView(target.dataset.viewTarget);
  if (action) toast(action.dataset.toast);
});

document.querySelector('#menu-button').addEventListener('click', (event) => {
  const sidebar = document.querySelector('.sidebar');
  const isOpen = sidebar.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(isOpen));
  event.currentTarget.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});
document.querySelector('#new-appointment-button').addEventListener('click', () => toast('New appointment'));
document.querySelector('#patient-search').addEventListener('input', (event) => {
  const search = event.currentTarget.value.trim().toLowerCase();
  renderPatients(state.patients.filter((patient) => Object.values(patient)
    .some((value) => String(value).toLowerCase().includes(search))));
});
document.querySelector('#appointment-filter').addEventListener('change', (event) => {
  const status = event.currentTarget.value.toLowerCase();
  renderAppointments(state.appointments.filter((appointment) => status === 'all'
    || appointment.status.toLowerCase() === status));
});

start();
