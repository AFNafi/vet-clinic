# Veterinary Clinic Database Checklist

Use this checklist to track every project deliverable and grading criterion.

## Project scope and tools

- [x] Build an Oracle Database system for a small veterinary clinic.
- [x] Use Oracle Database Free.
- [x] Run SQL with SQLcl.
- [x] Use VS Code for development.
- [x] Use Git for version control.
- [x] Use Oracle SQL syntax only.
- [x] Keep any optional front end limited to Node.js, Express, and Oracle node-oracledb.
- [x] Make the database fully rebuildable from SQL scripts.

## Required business capabilities

- [x] Store pet-owner information accurately.
- [x] Store pet information accurately.
- [x] Record appointments between pets and veterinarians.
- [x] Record services performed during appointments.
- [x] Track medications and prescriptions.
- [x] Store vaccination records and identify vaccinations due soon.
- [x] Create invoices and record payments.
- [x] Produce useful business queries and reports.
- [x] Protect data through constraints, roles, and privileges.

## ERD and database design

- [x] Create a Mermaid ER diagram.
- [x] Include a short explanation of the purpose of every table.
- [x] Explain normalization through Third Normal Form (3NF).
- [x] Define a primary key for every table.
- [x] Define foreign keys for every relationship.
- [x] Use `NOT NULL` constraints where appropriate.
- [x] Use `UNIQUE` constraints where appropriate.
- [x] Use `CHECK` constraints where appropriate.
- [x] Use `DEFAULT` constraints where appropriate.
- [x] Use `GENERATED ALWAYS AS IDENTITY` for identity primary keys.
- [x] Create indexes for foreign-key columns.
- [x] Create indexes for commonly searched fields.
- [x] Include at least one many-to-many relationship: appointments to services through `APPOINTMENT_SERVICES`.

## Required tables and DDL

- [x] Create `OWNERS` for pet-owner information.
- [x] Create `SPECIES` for animal species.
- [x] Create `BREEDS`, linked to `SPECIES`.
- [x] Create `PETS`, linked to an owner and breed.
- [x] Create `VETERINARIANS` for veterinarian information.
- [x] Create `APPOINTMENTS`, linking pets and veterinarians.
- [x] Create `SERVICES` for clinic services and prices.
- [x] Create `APPOINTMENT_SERVICES` for services performed during an appointment.
- [x] Create `MEDICATIONS` for medication stock and prices.
- [x] Create `PRESCRIPTIONS` for medications prescribed during appointments.
- [x] Create `VACCINATIONS` for pet vaccination records.
- [x] Create `INVOICES` for appointment charges.
- [x] Create `PAYMENTS` for payments against invoices.
- [x] Create `APPOINTMENT_AUDIT` for appointment-change history.

## Sample data

- [x] Use fake data only.
- [x] Do not store real names, phone numbers, email addresses, or addresses.
- [x] Insert at least 15 owners.
- [x] Insert at least 25 pets.
- [x] Insert at least 6 veterinarians.
- [x] Insert at least 60 appointments spanning six months.
- [x] Insert realistic services.
- [x] Insert realistic medications.
- [x] Insert realistic prescriptions.
- [x] Insert realistic vaccination records.
- [x] Insert realistic invoices.
- [x] Insert realistic payments.
- [x] Include unpaid-invoice edge cases.
- [x] Include pets with multiple appointments.
- [x] Include vaccinations due within 30 days.

## Queries and reports

- [x] Create at least 18 useful Oracle SQL queries.
- [x] Add a comment to every query explaining its business question.
- [x] Include an inner join query.
- [x] Include a left or outer join query.
- [x] Include a multi-table join query.
- [x] Include `GROUP BY` and `HAVING`.
- [x] Include subqueries.
- [x] Include `EXISTS` or `NOT EXISTS`.
- [x] Include analytic functions, including `RANK()` and `SUM() OVER`.
- [x] Include a top-N query using `FETCH FIRST`.
- [x] Include filtering, sorting, and date-based searching.

## Views

- [x] Create an upcoming appointments view.
- [x] Create an owner outstanding balances view.
- [x] Create a veterinarian workload by month view.
- [x] Create a vaccinations due soon view.

## PL/SQL

- [x] Create the `vet_clinic_pkg` package.
- [x] Add a procedure to book an appointment.
- [x] Add a function to calculate an invoice total.
- [x] Add a procedure to register a vaccination.
- [x] Add a procedure that prints vaccination reminders using an explicit cursor and loop.
- [x] Implement proper exception handling.
- [x] Use `RAISE_APPLICATION_ERROR` with custom error messages.

## Triggers

- [x] Audit appointment changes.
- [x] Reduce medication stock when a prescription is created.
- [x] Prevent medication stock from becoming negative.
- [x] Set a missing invoice date automatically.

## Security and transactions

- [x] Create the `receptionist` role.
- [x] Create the `vet` role.
- [x] Create the `admin` role.
- [x] Grant each role only the privileges required for its job.
- [x] Demonstrate `COMMIT`.
- [x] Demonstrate `ROLLBACK`.
- [x] Demonstrate `SAVEPOINT`.
- [x] Do not save passwords in the repository.

## Testing

- [x] Test invalid foreign-key values.
- [x] Test duplicate unique values.
- [x] Test invalid `CHECK` constraint values.
- [x] Test valid PL/SQL procedure calls.
- [x] Test invalid PL/SQL procedure calls.
- [x] Test PL/SQL function results.
- [x] Test trigger behavior.
- [x] Test a complete rebuild from an empty schema.
- [x] Print clear `PASS` or `FAIL` messages through `DBMS_OUTPUT`.

## Required files and documentation

- [x] Create `sql/00_drop_all.sql`.
- [x] Create `sql/01_ddl.sql`.
- [x] Create `sql/02_data.sql`.
- [x] Create `sql/03_queries.sql`.
- [x] Create `sql/04_views.sql`.
- [x] Create `sql/05_package.sql`.
- [x] Create `sql/06_triggers.sql`.
- [x] Create `sql/07_security.sql`.
- [x] Create `sql/08_tests.sql`.
- [x] Create `sql/run_all.sql`.
- [x] Keep `docs/requirements.md`.
- [x] Create `docs/checklist.md`.
- [x] Create `docs/design.md`.
- [x] Create `docs/erd.md`.
- [x] Create `docs/normalization.md`.
- [x] Create `docs/decisions.md`.
- [x] Create `docs/backup.md`.
- [x] Create `README.md`.
- [x] Keep `AGENTS.md`.

## Completion criteria

- [x] Confirm `@sql/run_all.sql` rebuilds the database successfully.
- [x] Confirm all required tables exist.
- [x] Confirm all required constraints exist.
- [x] Confirm all required views exist.
- [x] Confirm the required package exists.
- [x] Confirm all required triggers exist.
- [x] Confirm all required roles exist.
- [x] Confirm sample data was inserted successfully.
- [x] Confirm tests show the expected `PASS` results.
- [x] Confirm documentation explains the design clearly.
- [x] Confirm no passwords or real personal data appear in the repository.
- [x] Be prepared to explain every important SQL and PL/SQL decision.

## Questions resolved

- **What exact columns, data types, and business rules should each required table use?**
  Answered in [design.md](./design.md); the shipped DDL in `sql/01_ddl.sql` matches it.
- **Which fields are considered "commonly searched" and therefore require indexes?**
  `OWNERS.last_name`, `APPOINTMENTS.appointment_date`, and `VACCINATIONS.due_date`, plus every
  foreign-key column. All are created in `sql/01_ddl.sql`.
- **What appointment statuses, invoice statuses, and payment methods should be supported?**
  Appointments: `SCHEDULED`, `COMPLETED`, `CANCELLED`. Invoices: `UNPAID`, `PARTIAL`, `PAID`,
  `VOID`. Payments: `CASH`, `CARD`, `TRANSFER`. Medication quantities use `NUMBER(10,2)` units.
- **How should invoice totals be calculated, and are taxes or discounts required?**
  Totals are the sum of `APPOINTMENT_SERVICES` and `PRESCRIPTIONS` line items. No taxes or
  discounts are in scope; nothing is copied onto `INVOICES`, so a total can never go stale.
- **Should a single appointment have one invoice only, and can it be partially paid?**
  Yes to both: `UQ_INVOICES_APPT` allows one invoice per appointment, and `PAYMENTS` holds many
  rows per invoice so an invoice can be paid in parts.
- **What appointment changes must be captured in `APPOINTMENT_AUDIT`, and how long is retention?**
  Inserts plus updates to date, status, veterinarian, and reason, with old and new values and
  who/when. Retention is indefinite (no purge job); the table is append-only in normal use.
- **What counts as a vaccination being "due soon"?**
  `due_date` between today and today + 30 days, used by `vw_vaccinations_due_soon`, Q13, and the
  sample-data edge cases.
- **What privileges should `receptionist`, `vet`, and `admin` receive?**
  Least privilege per role in `sql/07_security.sql`; see the role blocks and their comments.
- **Which report outputs are expected beyond the query script and views?**
  None; `sql/03_queries.sql` (18 queries) and the four views are the required reports.
- **Is the Node.js/Express front end expected?**
  It is optional. The shipped `web/` demo runs on fictional in-memory data and never connects to
  Oracle; any future credentials stay on the Express server only.
