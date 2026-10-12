# Design Decisions

## 2026-10-12: Separate frontend, backend and Oracle scripts

Browser assets live in `frontend/`, the Express server, API, fictional data and tests live in
`backend/`, and Oracle scripts remain in `sql/` to preserve the required SQL layout and root-run
entry point. Express serves the static frontend from `frontend/public/`.

## 2026-10-12: Use object format for Oracle query results

The `node-oracledb` driver returns query rows as positional arrays by default (`OUT_FORMAT_ARRAY`).
The application sets `oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT` globally in `backend/database.js`
so queries consistently return rows as column-keyed objects (`row.COLUMN_NAME`). This ensures row
mappings across auth, repositories, and migration correctly extract fields like password salts,
patient names, and IDs without relying on fragile array indices.

## 2026-10-12: Retain appointments and audit only creations and changes

Appointments are clinical history, so administrators do not receive `DELETE` permission for the
`APPOINTMENTS` table. `APPOINTMENT_AUDIT` now accepts only `INSERT` and `UPDATE` actions. This
matches its trigger and its foreign key: a retained appointment always has a valid audit trail.

## 2026-10-12: Treat stock and invoice status as derived transaction state

Prescription stock is adjusted for inserts, edits, medication changes, and deletions. This keeps
`MEDICATIONS.stock_quantity` correct for the full lifecycle of a prescription, rather than only
when it is first entered.

An invoice's status is checked against its line-item total and recorded payments. Payment changes
automatically set the status to `UNPAID`, `PARTIAL`, or `PAID`; overpayments and mismatched manual
statuses are rejected. A void invoice cannot have payments. Service and prescription lines cannot
be changed after a payment is recorded, preserving the total that was paid.

## 2026-10-12: Use half-open 30-day date ranges

Upcoming-appointment and vaccination queries use a range starting at today's midnight and ending
before midnight after day 30. This includes every time on the thirtieth day, unlike an inclusive
upper bound at that day's midnight.

## 2026-10-12: Enforce one active scheduled time slot per veterinarian

A function-based unique index permits only one `SCHEDULED` appointment for the same veterinarian
and exact timestamp. Completed and cancelled appointments remain valid history and do not occupy
the live scheduled slot.

## 2026-10-06: Use all 14 required tables

The project uses the 14 tables listed in the requirements. The earlier 9–12-table target was not sufficient because the required `APPOINTMENT_SERVICES` and `APPOINTMENT_AUDIT` tables must both exist.

## 2026-10-06: Keep appointment services as a bridge table

`APPOINTMENT_SERVICES` records each service performed during an appointment. This allows one appointment to contain many services and one service to appear in many appointments.

## 2026-10-06: Keep charged prices with clinical line items

`APPOINTMENT_SERVICES` and `PRESCRIPTIONS` store the price charged at the time. The service and medication tables keep current catalogue prices. This preserves the correct historical invoice amount when catalogue prices change.

## 2026-10-06: Calculate invoice totals from line items

`INVOICES` stores invoice status and date, but not a copied total. The total will be calculated from appointment-service and prescription line items so it cannot become stale.

## 2026-10-06: Reset schema objects without connection details

`00_drop_all.sql` safely removes this project's schema objects. It does not contain usernames or passwords, and it does not drop database-level roles because role management requires separate database-level privileges.

## 2026-10-06: Keep the web UI on fictional server data

The initial clinic UI uses fictional records served by Express. It does not connect to Oracle or change the database schema. Future database credentials and queries must stay on the Express server, not in browser files.

## 2026-10-06: Seed parent rows with single-row inserts, not INSERT ALL

`02_data.sql` inserts owners, species, veterinarians, services and medications. All of these
tables use `GENERATED ALWAYS AS IDENTITY` primary keys. A multi-table `INSERT ALL` is a single
Oracle statement, so the identity column is evaluated only once for the whole statement and
every row receives the same ID. The first row inserted, the rest failed with
`ORA-00001: unique constraint (VET.PK_OWNERS) violated`.

The parent rows are now inserted with one `INSERT ... VALUES` statement per row. Child tables
(pets, vaccinations, appointments, and the billing rows) already used PL/SQL loops and were
not affected.

## 2026-10-06: Role setup must not break the rebuild

`07_security.sql` creates the `receptionist`, `vet` and `admin` roles. `CREATE ROLE` is a
database-level privilege that a plain schema owner does not hold, so the script previously
aborted `@sql/run_all.sql` with `ORA-01031: insufficient privileges`.

The script now checks `session_privs` for `CREATE ROLE` first. When the privilege is missing it
prints a notice and continues, so the rebuild always finishes; when the privilege is present it
creates the roles and grants their least-privilege access. This keeps the database rebuildable
by the schema owner while still creating the roles whenever a DBA has allowed it.

## 2026-10-06: The `vet` role cannot exist while the schema owner is the user `VET`

Oracle does not allow a role and a user to share a name. The project's schema owner is the user
`VET`, so `CREATE ROLE vet` fails with `ORA-01921: role name 'VET' conflicts with another user
or role name`. The old script swallowed that error as "role already exists" and reported success
even though no role was created, and the grants for `vet` were silently no-ops because a user
cannot grant privileges to itself.

The script now detects the name clash up front and reports it explicitly instead of pretending
the role exists. To obtain a real `vet` role the schema must be owned by a user whose name is not
`VET`, for example `VETCLINIC`; the requirement lists `vet` as a role name, so the schema owner
name is the side that has to change. `receptionist` and `admin` are unaffected and are created
normally.

## 2026-10-06: Unknown API routes answer with JSON, not HTML

The Express server ends with a catch-all that returns `frontend/public/index.html` for client-side routes.
Because it also matched unknown `/api/...` paths, an API mistake returned HTTP 200 with an HTML
body, which hides client errors. A `/api` handler that returns `404` with `{"error":"Not found"}`
now runs before the catch-all.

## 2026-10-06: Sidebar and content column flex fixes in the demo UI

Two layout defects were fixed in `frontend/public/styles.css`:

- `.sidebar` used `position: sticky` but the flex default `align-items: stretch` stretched it to
  the full page height, so sticky never engaged and the navigation scrolled out of view on long
  pages. It now uses `flex: 0 0 244px`, `height: 100vh` and `align-self: flex-start`.
- `.content` is a flex item with the default `min-width: auto`, so the wide data tables pushed the
  whole page wider than the viewport. It now sets `min-width: 0`, which lets the tables scroll
  inside `.table-wrap` instead of overflowing the page.

## 2026-10-06: Keep dashboard navigation distinct from the full schedule

The dashboard is a compact overview: informational metrics, a selectable seven-day appointment
preview, and clinic facts. The Appointments navigation item is the single entry to the full
schedule. Duplicate "See all" links, schedule alert shortcuts, and metric-card navigation were
removed so each dashboard control has one clear purpose. `GET /api/dashboard` returns `stats`,
`upcoming`, and `clinic`; detailed records remain available from their dedicated views.

## 2026-10-06: Refresh the console appearance without changing its features

The dashboard keeps its existing navigation, API requests, filters, search, and booking flow. Its
styles use a clearer visual hierarchy, more responsive layouts, restrained motion, and reduced
motion support. The booking action remains visible on small screens, where the previous layout
hid it. A later visual pass added a small dialog entrance transition and sticky table headings to
make long lists easier to scan. The console uses a dark Liquid Glass-inspired style with deep
navy shades, translucent layered surfaces, backdrop blur, fine highlights, and soft blue-green
accents. This changes presentation only; the clinic's existing navigation, data, search, filters,
and booking flow are unchanged. Native system font stacks avoid remote font downloads.
Translucent surfaces have solid dark fallbacks for reduced-transparency settings and browsers
without backdrop-filter support. Apple was used as a style reference only; no Apple branding,
assets, content, or page components are used.

The visual direction was informed by the task-focused, clinician-centered presentation on
[Shepherd](https://www.shepherd.vet/) and [Vetspire](https://www.vetspire.ai/), checked on
2026-10-06. These were used only as high-level references for clarity and workflow readability;
their branding, assets, and product UI were not copied.

## 2026-10-11: Scope veterinarian schedules and require confirmation

Each veterinarian account is linked to one veterinarian profile. The API returns only that
profile's appointments to the veterinarian, while administrators retain the clinic-wide schedule
and billing access. New bookings begin as `Pending confirmation`; only the assigned veterinarian
can confirm one. Administrators can cancel active appointments and complete confirmed or legacy
`Scheduled` visits only after their scheduled time. The dashboard uses the role-scoped schedule,
so veterinarians can review and confirm all their upcoming visits from one worklist, including
appointments more than seven days away, without seeing another doctor's appointments. The
dashboard's seven-day date selector remains for the administrator's clinic-wide overview. The API
enforces these permissions independently of the interface.

Staff self-registration requires role-appropriate invitation codes, preventing anonymous visitors
from creating veterinarian accounts. Booking enforces the clinic's published Monday-Saturday
hours, five-minute start-time increments, and a 30-minute appointment duration. It prevents
overlapping visits for either a veterinarian or patient and rejects same-day appointments in the
past. A newly registered patient has no last-visit date until an actual visit is recorded.

## 2026-10-11: Keep veterinarian profiles linked to staff accounts

The appointment picker must never offer a veterinarian who cannot sign in. The veterinarian
directory is therefore filtered to account-backed profiles. When a veterinarian registers, the
server creates and saves their roster profile using the same email and a stable veterinarian ID;
existing profiles are linked by email and older name-only profiles are matched by name. The
dashboard count and visible schedule use the same linked roster. Patient, veterinarian,
appointment, and invoice changes were initially persisted in the ignored local clinic store.
Dr. Maya Chen is retained as a veterinarian profile and account. The later Oracle integration
decision below supersedes local JSON as the active backend store.

## 2026-10-11: Protect staff workflows with individual sign-in

Veterinarian and administrator account registration each require a role-appropriate invitation
code provided to the server through `VETERINARIAN_REGISTRATION_CODE` and
`ADMIN_REGISTRATION_CODE`; visitors cannot grant themselves staff access by choosing a role.
Passwords are verified with Node's scrypt and only salts and derived hashes are stored in an
ignored, permission-restricted local account file. Session tokens are random, HttpOnly,
SameSite cookies and expire after 12 hours. Protected API routes enforce role permissions;
hiding controls in the UI is not the security boundary. Sessions are in-memory and cleared when
the demo server restarts. This avoids claiming production readiness without durable session
storage, HTTPS deployment configuration, account recovery, and operational security review.

## 2026-10-12: Connect the Express application to the normalized Oracle schema

The Express API uses the existing normalized clinic tables instead of maintaining a parallel web
database. A small additive SQL extension stores staff accounts and fields needed by the web app.
The backend owns the Oracle connection pool, parameterized queries, and transaction boundaries;
browser code never receives database credentials. A one-time transactional importer maps the
fictional JSON demo data to Oracle and keeps the source files as a backup. Startup fails clearly
when Oracle is unavailable rather than silently falling back to local files.

## 2026-10-06: Booking dates and times are validated as real calendar values

A regular expression only checks shape, so `2026-13-45` and `25:99` passed the first version of
`POST /api/appointments`. The route now rebuilds the date from its numeric parts and compares the
read-back components (rejecting month 13, day 45, and Feb 29 in non-leap years), and checks that
hour and minute are 0-23 and 0-59. The comparison deliberately avoids `toISOString()` because
local midnight can fall on a different UTC day, which would reject valid dates.

## 2026-10-06: The front end is an ES module at frontend/public/js/main.js

`index.html` loads `<script type="module" src="js/main.js">`, so the old non-module
`frontend/public/app.js` was replaced by `frontend/public/js/main.js`, which wires all four views,
including the booking dialog and the billing table that the old script never rendered.
`frontend/check_dom.js` verifies that every id and class the script queries still exists in the
markup.
