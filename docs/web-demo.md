# Vetwise Clinic web application

The browser application uses Express as its API server. Express stores clinic
records and staff accounts in the project's Oracle schema; browser code never
connects directly to the database. The local JSON files under `backend/data/`
provide fictional initial data for the one-time import and remain as a backup.

## Project layout

```text
frontend/public/     Browser HTML, CSS and JavaScript; check_dom.js validates markup selectors
backend/server.js    Express app: static files, /api router, JSON 404 for unknown API paths
backend/routes/      Authenticated API and staff registration/session handlers
backend/repositories/Oracle queries and row-to-API mapping
backend/database.js  Oracle connection pool setup and lifecycle
backend/data/        Fictional demo records for one-time migration
backend/scripts/     Database health check and one-time JSON importer
backend/test/        Backend tests
sql/                 Oracle schema and backend extension scripts
```

## Configure and start

1. Install Node.js 18.11 or newer and Oracle Database Free.
2. Ensure the schema owner has run `@sql/run_all.sql`, or run
   `@sql/09_backend.sql` as `VET` for an existing database.
3. In `backend/`, install dependencies with `npm install`.
4. Copy `backend/.env.example` to `backend/.env`. Set the Oracle username,
   password, connect string, and private invitation codes in `.env`. Never put
   credentials or invitation codes in frontend files or commit them.
5. Verify the database connection with `npm run db:check`.
6. Import existing local demo data once with `npm run db:migrate`. The importer
   is transactional and records its completion in Oracle; the JSON files remain
   available as a backup.
7. Start the server with `npm run dev` and open <http://localhost:3000>.

Set each staff invitation code to a private value at least 16 characters long.
If the code for a role is missing, registration for that role is disabled.
`PORT` may also be set in `.env`. Startup fails explicitly when Oracle is
unavailable or misconfigured; the application has no local-JSON fallback.

## Application behavior

- The dashboard, patient list, veterinarian roster, appointments, and invoices
  are read from Oracle through the Express API.
- Administrators can register patients, create and cancel appointments, view the
  full schedule and invoices, and mark invoices paid.
- Veterinarians can only see their own schedule and confirm their pending
  appointments. They cannot access billing or clinic-wide booking controls.
- New appointments require veterinarian confirmation. The booking API enforces
  Monday-Saturday clinic hours and prevents overlapping scheduled visits for the
  same veterinarian or patient.
- Staff account records and password hashes are stored in Oracle. Passwords are
  never stored in plaintext; sessions are in memory and end when the server
  restarts.
- Veterinarian registration collects specialty, license number, and work phone.
  The administrator form does not request veterinarian-only fields.
- Unknown `/api/...` paths return `404 {"error":"Not found"}`.

New patients have no last-visit date until one is recorded. Run
`node frontend/check_dom.js` from the project root after changing the markup or
front-end script to confirm that referenced elements exist. The backend test
suite is run from `backend/` with `npm test`.

## Data migration notes

`npm run db:migrate` imports the existing fictional patients, veterinarian
profiles, appointments, invoices, and staff account hashes into the normalized
Oracle tables. Where the simpler demo data lacks relational fields, the
importer creates clearly synthetic contact values and maps invoice totals to
service lines and payments. It does not delete or alter the local JSON backup.
Do not rerun the database rebuild script after importing, as
`@sql/run_all.sql` drops and recreates the Oracle project tables.
