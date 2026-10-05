# Veterinary Clinic Database (Oracle)

A database system for a small veterinary clinic, built for Oracle Database Free (26ai). It stores
owners, pets, veterinarians, appointments, services, medications, prescriptions, vaccinations,
invoices and payments, and demonstrates Oracle SQL, PL/SQL, security and testing.

An optional Express demo dashboard lives in `web/` and runs on fictional in-memory data.

## What is in the project

```text
sql/     Oracle scripts, run in numeric order by run_all.sql
docs/    Requirements, design, ER diagram, normalization, decisions, backup notes
web/     Optional Node/Express dashboard demo (fictional data only)
```

The fourteen tables are `OWNERS`, `SPECIES`, `BREEDS`, `PETS`, `VETERINARIANS`, `APPOINTMENTS`,
`SERVICES`, `APPOINTMENT_SERVICES`, `MEDICATIONS`, `PRESCRIPTIONS`, `VACCINATIONS`, `INVOICES`,
`PAYMENTS` and `APPOINTMENT_AUDIT`. See [docs/design.md](docs/design.md) and
[docs/erd.md](docs/erd.md) for the columns, constraints and relationships.

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

Every test prints `PASS` or `FAIL` through `DBMS_OUTPUT` (23 `PASS` messages and no `FAIL`), and
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

## Run the demo dashboard

The web app is a separate, optional deliverable. It serves fictional records from
`web/data/clinic.js` through the API routes in `web/routes/api.js` and never connects to Oracle.

```text
cd web
npm install
npm run dev
```

Open <http://localhost:3000>. Set `PORT` in an uncommitted `web/.env` to change the port; see
`web/.env.example`. Keep any future Oracle credentials on the Express server, never in
`web/public/`.

## Sample data

All names, phone numbers, email addresses and addresses are fictional (`Owner01`, `555-0101`,
`owner01@example.test`, `1 Sample Lane`). The data set contains 15 owners, 25 pets,
6 veterinarians, 60 appointments across six months, plus services, medications, prescriptions,
vaccinations, invoices and payments, and it deliberately includes unpaid and partially paid
invoices and vaccinations due within 30 days.

No passwords appear anywhere in this repository.
