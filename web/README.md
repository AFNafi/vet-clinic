# Vetwise Clinic demo

This is a responsive, fictional veterinary clinic UI served by Express. Its dashboard, patient
list, appointment list, and billing list are rendered in the browser by `public/js/main.js`
from JSON served by `server.js`. Clinic records live in `data/clinic.js`; staff accounts use
password hashes in an ignored local data file. Each veterinarian account is linked to one
veterinarian profile; the schedule only offers linked accounts. The web demo does not connect
to Oracle.

## Project layout

```text
server.js          Express app: static files, /api router, JSON 404 for unknown API paths
routes/api.js      Authenticated endpoints for dashboard, patients, veterinarians,
                   appointments, invoices, and the clinic overview
routes/auth.js     Staff registration, sign-in, sessions, and server-side role checks
data/clinic.js     Fictional clinic records and local JSON persistence
public/index.html  Single-page layout: dashboard, patients, appointments, billing views
public/js/main.js  Front-end module: fetches the API and renders each view
public/styles.css  Design tokens and component styles
check_dom.js       Sanity check that every id/class main.js queries exists in index.html
test/api.test.js   Repeatable API tests using Node's built-in test runner
```

## Run locally

1. Install Node.js 18.11 or newer.
2. From a terminal, enter the web folder: `cd web`.
3. Install dependencies: `npm install`.
4. Start the development server with automatic restart: `npm run dev`.
5. Open <http://localhost:3000>.

For a regular start without automatic restart, run `npm start` from `web/`. Staff registration
requires a private invitation code configured by the clinic owner. In zsh, set the veterinarian
and administrator invitation codes without putting their values in shell history, then start the
server:

```zsh
read -s "ADMIN_REGISTRATION_CODE?Choose an administrator invitation code: "
export ADMIN_REGISTRATION_CODE
read -s "VETERINARIAN_REGISTRATION_CODE?Choose a veterinarian invitation code: "
export VETERINARIAN_REGISTRATION_CODE
npm run dev
```

Keep each code private and share it only with the appropriate staff. Either code must be at least
16 characters. If an invitation code is not configured, registration for that role is disabled.
A server owner may also set `PORT` for a different local port. Never put passwords or invitation
codes in project files.

## Try the demo features

- The dashboard loads its stat cards, daily visits, and clinic facts from the API. Veterinarians
  see only the appointments assigned to their linked profile; administrators see the clinic-wide
  schedule.
- Select a day on the seven-day agenda strip to inspect that day's visits. Use the Appointments menu
  for the complete schedule; dashboard stat cards are informational, not duplicate navigation.
- Administrators can use **New appointment** to book a 30-minute visit. Booking accepts Monday
  through Saturday, 08:00-17:30, in five-minute start-time increments; the same veterinarian or
  patient cannot have overlapping scheduled visits.
- The patients view has a live search box; appointments and billing have status filters.
- Register an individual staff account with the appropriate invitation code, or sign in with email
  and password.
- A veterinarian account is automatically added to the staff roster and appointment booking
  list. Existing roster entries are shown only when they are linked to a veterinarian account.
- The clinic store saves patient, roster, appointment, and invoice changes locally. It is ignored
  by Git alongside the private staff account hashes.
- Administrators can create and cancel appointments, view the full schedule and invoices, register
  patients, and mark invoices paid. New bookings wait for the assigned veterinarian's confirmation.
- Veterinarians see only their assigned appointment list and dashboard. They can confirm their own
  pending visits, but cannot view another veterinarian's schedule, manage clinic-wide bookings, or
  access billing data. A visit cannot be completed before its scheduled date and time.
- API routes enforce sign-in and role checks on the server. Sessions are kept in memory and end
  when the server restarts; account password hashes are kept in the ignored
  `data/staff-accounts.json` file. This local demo is not a production identity system.
- Unknown `/api/...` paths return `404 {"error":"Not found"}` instead of the HTML page.

Newly registered patients have no last-visit date until a visit is recorded. Run
`node check_dom.js` after changing the markup or the front-end script to confirm every element
reference still exists. Run `npm test` to test the page, invitation-gated staff registration,
login/logout, server-side role checks, API routes, filtering, search, patient registration,
appointment booking rules and status transitions, invoice payments, input validation, and JSON
errors. The test server binds to an ephemeral local port and does not need a running clinic server
or Oracle database.

The API supports `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`,
`POST /api/patients`,
`PATCH /api/appointments/:id` (`Confirmed` by the assigned veterinarian, `Completed` or
`Cancelled` by an administrator), and
`PATCH /api/invoices/:id` (`Paid`). Clinic changes are saved to the local ignored
`data/clinic-store.json` file.

## Security note

The browser requests only the demo API routes served by Express. Keep any future Oracle
credentials and database access on the server; never put them in `public/` files.
