# Vetwise Clinic demo

This is a responsive, fictional veterinary clinic UI served by Express. Its dashboard, patient
list, appointment list, and billing list are rendered in the browser by `public/js/main.js`
from JSON served by `server.js`. The records live in `data/clinic.js`; no Oracle schema or
database is used by the demo.

## Project layout

```text
server.js          Express app: static files, /api router, JSON 404 for unknown API paths
routes/api.js      Demo endpoints: /api/dashboard, /api/patients, /api/veterinarians,
                   /api/appointments (GET + POST), /api/invoices, /api/overview
data/clinic.js     In-memory fictional records (no real personal data)
public/index.html  Single-page layout: dashboard, patients, appointments, billing views
public/js/main.js  Front-end module: fetches the API and renders each view
public/styles.css  Design tokens and component styles
check_dom.js       Sanity check that every id/class main.js queries exists in index.html
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
- **New appointment** opens a dialog that posts to `POST /api/appointments`. Try a missing field
  (validation errors), or double-booking the same veterinarian, date, and time (a 409 conflict).
- The patients view has a live search box; appointments and billing have status filters.
- Unknown `/api/...` paths return `404 {"error":"Not found"}` instead of the HTML page.

Run `node check_dom.js` after changing the markup or the front-end script to confirm every
element reference still exists.

## Security note

The browser requests only the demo API routes served by Express. Keep any future Oracle
credentials and database access on the server; never put them in `public/` files.

