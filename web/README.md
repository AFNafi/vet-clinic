# Vetwise Clinic demo

This is a responsive, fictional veterinary clinic UI served by Express. Its dashboard, patient
list, appointment list, and billing list are rendered in the browser by `public/js/main.js`
from JSON served by `server.js`. The records live in `data/clinic.js`; no Oracle schema or
database is used by the demo.

## Project layout

```text
server.js          Express app: static files, /api router, JSON 404 for unknown API paths
routes/api.js      Demo endpoints for dashboard, profiles, patients, veterinarians,
                   appointments, invoices, and the clinic overview
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

For a regular start without automatic restart, run `npm start` from `web/`. Set `PORT` in a local,
uncommitted `web/.env` file to use a different port. The example is `web/.env.example`.

## Try the demo features

- The dashboard loads from `GET /api/dashboard` (stat cards, upcoming visits, alert cards).
- Dashboard KPI cards link to their relevant records. The appointment agenda can switch between
  today, the next seven days, and all upcoming visits, or be narrowed to a specific day using the
  interactive seven-day activity strip.
- **New appointment** opens a dialog that posts to `POST /api/appointments`. Try a missing field
  (validation errors), or double-booking the same veterinarian, date, and time (a 409 conflict).
- The patients view has a live search box; appointments and billing have status filters.
- Use the **Demo profile** selector to switch between the veterinarian and clinic administrator.
- The administrator can register patients, cancel appointments, and mark invoices paid.
- The veterinarian can complete today's scheduled appointments. Future visits cannot be completed.
- These profiles demonstrate role-aware UI only. The API has no authentication or authorization
  and must not be exposed as a real multi-user clinic system.
- Unknown `/api/...` paths return `404 {"error":"Not found"}` instead of the HTML page.

Run `node check_dom.js` after changing the markup or the front-end script to confirm every
element reference still exists. Run `npm test` to test the page, API routes, filtering, search,
demo profiles, patient registration, appointment booking and status transitions, invoice payments,
input validation, and JSON error responses. The test server binds to an ephemeral local port and
does not need a running clinic server or Oracle database.

The API supports `GET /api/profiles`, `POST /api/patients`,
`PATCH /api/appointments/:id` (`Completed` or `Cancelled`), and
`PATCH /api/invoices/:id` (`Paid`). All changes update the in-memory demo records.

## Security note

The browser requests only the demo API routes served by Express. Keep any future Oracle
credentials and database access on the server; never put them in `public/` files.
