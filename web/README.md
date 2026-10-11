# Vetwise Clinic demo

This is a responsive, fictional veterinary clinic UI served by Express. Its dashboard, patient
list, appointment list, and billing list are rendered in the browser by `public/js/main.js`
from JSON served by `server.js`. Clinic records live in `data/clinic.js`; staff accounts use
password hashes in an ignored local data file. The web demo does not connect to Oracle.

## Project layout

```text
server.js          Express app: static files, /api router, JSON 404 for unknown API paths
routes/api.js      Authenticated endpoints for dashboard, patients, veterinarians,
                   appointments, invoices, and the clinic overview
routes/auth.js     Staff registration, sign-in, sessions, and server-side role checks
data/clinic.js     In-memory fictional records (no real personal data)
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

For a regular start without automatic restart, run `npm start` from `web/`. Administrator
registration is invitation-only. In zsh, set the invitation code without putting its value in
shell history, then start the server:

```zsh
read -s "ADMIN_REGISTRATION_CODE?Choose an administrator invitation code: "
export ADMIN_REGISTRATION_CODE
npm run dev
```

Keep the code private and provide it only to the intended administrator. A server owner may also
set `PORT` for a different local port. Never put passwords or invitation codes in project files.
The invitation code must be at least 16 characters.

## Try the demo features

- The dashboard loads its stat cards, daily visits, and clinic facts from `GET /api/dashboard`.
- Select a day on the seven-day agenda strip to inspect that day's visits. Use the Appointments menu
  for the complete schedule; dashboard stat cards are informational, not duplicate navigation.
- **New appointment** opens a dialog that posts to `POST /api/appointments`. Try a missing field
  (validation errors), or double-booking the same veterinarian, date, and time (a 409 conflict).
- The patients view has a live search box; appointments and billing have status filters.
- Register individual veterinarian accounts or sign in with email and password. Administrator
  registration requires the server's invitation code.
- The administrator can register patients, cancel appointments, and mark invoices paid.
- A veterinarian can complete today's scheduled appointments. Future visits cannot be completed.
- API routes enforce sign-in and role checks on the server. Sessions are kept in memory and end
  when the server restarts; account password hashes are kept in the ignored
  `data/staff-accounts.json` file. This local demo is not a production identity system.
- Unknown `/api/...` paths return `404 {"error":"Not found"}` instead of the HTML page.

Run `node check_dom.js` after changing the markup or the front-end script to confirm every
element reference still exists. Run `npm test` to test the page, staff registration, login/logout,
server-side role checks, API routes, filtering, search, patient registration, appointment booking
and status transitions, invoice payments, input validation, and JSON errors. The test server binds
to an ephemeral local port and does not need a running clinic server or Oracle database.

The API supports `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`,
`POST /api/patients`,
`PATCH /api/appointments/:id` (`Completed` or `Cancelled`), and
`PATCH /api/invoices/:id` (`Paid`). All changes update the in-memory demo records.

## Security note

The browser requests only the demo API routes served by Express. Keep any future Oracle
credentials and database access on the server; never put them in `public/` files.
