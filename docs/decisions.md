# Design Decisions

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

The Express server ends with a catch-all that returns `public/index.html` for client-side routes.
Because it also matched unknown `/api/...` paths, an API mistake returned HTTP 200 with an HTML
body, which hides client errors. A `/api` handler that returns `404` with `{"error":"Not found"}`
now runs before the catch-all.

## 2026-10-06: Sidebar and content column flex fixes in the demo UI

Two layout defects were fixed in `web/public/styles.css`:

- `.sidebar` used `position: sticky` but the flex default `align-items: stretch` stretched it to
  the full page height, so sticky never engaged and the navigation scrolled out of view on long
  pages. It now uses `flex: 0 0 244px`, `height: 100vh` and `align-self: flex-start`.
- `.content` is a flex item with the default `min-width: auto`, so the wide data tables pushed the
  whole page wider than the viewport. It now sets `min-width: 0`, which lets the tables scroll
  inside `.table-wrap` instead of overflowing the page.

## 2026-10-06: The console loads one dashboard payload from the API

`index.html` renders four areas that need data: stat cards, upcoming visits, alert cards, and the
clinic facts panel. Rather than four small requests, `GET /api/dashboard` returns all of them in
one JSON object (`stats`, `upcoming`, `alerts`, `clinic`), derived from the same in-memory records
that back the other routes. The page still fetches patients, veterinarians, appointments, and
invoices separately because those lists are re-rendered by their own views and filters.

## 2026-10-06: Refresh the console appearance without changing its features

The dashboard keeps its existing navigation, API requests, filters, search, and booking flow. Its
styles use a clearer visual hierarchy, more responsive layouts, restrained motion, and reduced
motion support. The booking action remains visible on small screens, where the previous layout
hid it. A later visual pass added a small dialog entrance transition and sticky table headings to
make long lists easier to scan. The console now uses a dark, Golden Gate-inspired Liquid Glass palette: warm sunset gold and
bridge-coral accents sit over cool bay-blue glass, with layered surfaces, backdrop blur, and fine
highlights. Interface typography uses the native system font stack, so the page no longer needs
remote font downloads. The treatment follows Apple's high-level Liquid Glass guidance for layered
material and context-aware translucency, with a solid-surface fallback for reduced-transparency
settings and browsers without backdrop-filter support. The named macOS 27 Golden Gate reference
was not independently verifiable in public search, so the colors are an original interpretation
of its name rather than a claim of pixel-matched system UI. No Apple branding or assets are used.

The visual direction was informed by the task-focused, clinician-centered presentation on
[Shepherd](https://www.shepherd.vet/) and [Vetspire](https://www.vetspire.ai/), checked on
2026-10-06. These were used only as high-level references for clarity and workflow readability;
their branding, assets, and product UI were not copied.

## 2026-10-06: Booking dates and times are validated as real calendar values

A regular expression only checks shape, so `2026-13-45` and `25:99` passed the first version of
`POST /api/appointments`. The route now rebuilds the date from its numeric parts and compares the
read-back components (rejecting month 13, day 45, and Feb 29 in non-leap years), and checks that
hour and minute are 0-23 and 0-59. The comparison deliberately avoids `toISOString()` because
local midnight can fall on a different UTC day, which would reject valid dates.

## 2026-10-06: The front end is an ES module at public/js/main.js

`index.html` loads `<script type="module" src="js/main.js">`, so the old non-module `public/app.js`
was replaced by `public/js/main.js`, which wires all four views including the booking dialog and
the billing table that the old script never rendered. `web/check_dom.js` verifies that every id
and class the script queries still exists in the markup.
