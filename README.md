# Veterinary Clinic Database (Oracle)

A database system for a small veterinary clinic, built for Oracle Database Free (26ai). It stores
owners, pets, veterinarians, appointments, services, medications, prescriptions, vaccinations,
invoices and payments, and demonstrates Oracle SQL, PL/SQL, security and testing.

The Express dashboard connects to Oracle for clinic records and staff accounts.
It can import the existing fictional JSON demo data into the normalized Oracle
tables without deleting the local files.

## What is in the project

```text
sql/       Oracle scripts, run in numeric order by run_all.sql
docs/      Requirements, design, ER diagram, guides and decisions
frontend/  Browser HTML, CSS, JavaScript and markup checker
backend/   Optional Node/Express server, API, demo data and tests
```

The fourteen tables are `OWNERS`, `SPECIES`, `BREEDS`, `PETS`, `VETERINARIANS`, `APPOINTMENTS`,
`SERVICES`, `APPOINTMENT_SERVICES`, `MEDICATIONS`, `PRESCRIPTIONS`, `VACCINATIONS`, `INVOICES`,
`PAYMENTS` and `APPOINTMENT_AUDIT`. See [docs/design.md](docs/design.md) and
[docs/erd.md](docs/erd.md) for the columns, constraints and relationships.

## Handover guides

- [User guide PDF](docs/user-guide.pdf) - website instructions for administrators and veterinarians.
- [Technical handover PDF](docs/technical-handover.pdf) - project architecture, files, SQL,
  frontend/backend flow, tests and limitations.
- Editable Markdown sources and the PDF builder are in `docs/`. Regenerate both PDFs on macOS
  with `node docs/build_pdf_guides.js`.

## Rebuild the database

Connect with SQLcl as the schema owner, then run the single entry point from the project root:

```text
@sql/run_all.sql
```

`run_all.sql` drops the project objects, recreates the schema, loads fictional sample data, runs
the business queries, creates the four views, compiles the `vet_clinic_pkg` package, creates the
triggers, configures the roles, and finally runs the automated tests. It stops on the first SQL
error.

### Expected result

Every test prints `PASS` or `FAIL` through `DBMS_OUTPUT` (34 `PASS` messages and no `FAIL`), and
the run ends with:

```text
Database rebuild and tests completed successfully
```

### Privilege note

`07_security.sql` creates the `receptionist`, `vet` and `admin` roles. `CREATE ROLE` is a
database-level privilege, so a plain schema owner does not have it. When it is missing the script
prints a notice and continues instead of stopping the rebuild:

```text
NOTICE: this user cannot create roles, so the role setup was skipped.
```

A DBA can enable the full role setup once with `GRANT CREATE ROLE TO <schema_owner>;` and then
rerun `sql/07_security.sql`.

**Oracle does not allow a role and a user to share a name.** The schema owner is normally the user
`VET` (see [docs/backup.md](docs/backup.md)), which means `CREATE ROLE vet` fails with
`ORA-01921`. The script detects this and says so instead of reporting a role that was never
created:

```text
NOTICE: the vet role was NOT created. ORA-01921: a user named VET already exists ...
Role setup finished. receptionist=granted, vet=skipped, admin=granted.
```

To obtain a real `vet` role, own the schema under a user name other than `VET` (for example
`VETCLINIC`). `receptionist` and `admin` are unaffected.

## Connect and run the dashboard

The database schema must include the backend additions from `sql/09_backend.sql`.
Fresh schemas get them from `sql/run_all.sql`; for an existing schema, connect with
SQLcl as `VET` and run `@sql/09_backend.sql` from the project root. This extension
is additive and safe to rerun.

```text
cd backend
npm install
npm run db:check
npm run db:migrate
npm run dev
```

Before the first run, copy `.env.example` to `.env` and privately set the Oracle
connection values and role invitation codes. The application requires the
database; it does not fall back to JSON storage. `db:migrate` imports the existing
fictional clinic records and staff password hashes exactly once. It keeps the
original JSON files as backup. Open <http://localhost:3000> after `npm run dev`.
Keep database credentials and invitation codes on the server, never in
`frontend/`.

`npm run db:check` verifies the configured Oracle connection. The migration
requires the original local demo records; run it before removing or moving those
files. Set `PORT` in the private `.env` to use a different HTTP port.

## Sample data

All names, phone numbers, email addresses and addresses are fictional (`Owner01`, `555-0101`,
`owner01@example.test`, `1 Sample Lane`). The data set contains 15 owners, 25 pets,
6 veterinarians, 60 appointments across six months, plus services, medications, prescriptions,
vaccinations, invoices and payments, and it deliberately includes unpaid and partially paid
invoices and vaccinations due within 30 days.

No passwords appear anywhere in this repository.
