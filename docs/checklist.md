# Veterinary Clinic Database Checklist

Use this checklist to track every project deliverable and grading criterion.

## Project scope and tools

- [ ] Build an Oracle Database system for a small veterinary clinic.
- [ ] Use Oracle Database Free.
- [ ] Run SQL with SQLcl.
- [ ] Use VS Code for development.
- [ ] Use Git for version control.
- [ ] Use Oracle SQL syntax only.
- [ ] Keep any optional front end limited to Node.js, Express, and Oracle node-oracledb.
- [ ] Make the database fully rebuildable from SQL scripts.

## Required business capabilities

- [ ] Store pet-owner information accurately.
- [ ] Store pet information accurately.
- [ ] Record appointments between pets and veterinarians.
- [ ] Record services performed during appointments.
- [ ] Track medications and prescriptions.
- [ ] Store vaccination records and identify vaccinations due soon.
- [ ] Create invoices and record payments.
- [ ] Produce useful business queries and reports.
- [ ] Protect data through constraints, roles, and privileges.

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

- [ ] Create the `vet_clinic_pkg` package.
- [ ] Add a procedure to book an appointment.
- [ ] Add a function to calculate an invoice total.
- [ ] Add a procedure to register a vaccination.
- [ ] Add a procedure that prints vaccination reminders using an explicit cursor and loop.
- [ ] Implement proper exception handling.
- [ ] Use `RAISE_APPLICATION_ERROR` with custom error messages.

## Triggers

- [ ] Audit appointment changes.
- [ ] Reduce medication stock when a prescription is created.
- [ ] Prevent medication stock from becoming negative.
- [ ] Set a missing invoice date automatically.

## Security and transactions

- [ ] Create the `receptionist` role.
- [ ] Create the `vet` role.
- [ ] Create the `admin` role.
- [ ] Grant each role only the privileges required for its job.
- [ ] Demonstrate `COMMIT`.
- [ ] Demonstrate `ROLLBACK`.
- [ ] Demonstrate `SAVEPOINT`.
- [ ] Do not save passwords in the repository.

## Testing

- [ ] Test invalid foreign-key values.
- [ ] Test duplicate unique values.
- [ ] Test invalid `CHECK` constraint values.
- [ ] Test valid PL/SQL procedure calls.
- [ ] Test invalid PL/SQL procedure calls.
- [ ] Test PL/SQL function results.
- [ ] Test trigger behavior.
- [ ] Test a complete rebuild from an empty schema.
- [ ] Print clear `PASS` or `FAIL` messages through `DBMS_OUTPUT`.

## Required files and documentation

- [x] Create `sql/00_drop_all.sql`.
- [x] Create `sql/01_ddl.sql`.
- [x] Create `sql/02_data.sql`.
- [x] Create `sql/03_queries.sql`.
- [x] Create `sql/04_views.sql`.
- [ ] Create `sql/05_package.sql`.
- [ ] Create `sql/06_triggers.sql`.
- [ ] Create `sql/07_security.sql`.
- [ ] Create `sql/08_tests.sql`.
- [x] Create `sql/run_all.sql`.
- [ ] Keep `docs/requirements.md`.
- [ ] Create `docs/checklist.md`.
- [x] Create `docs/design.md`.
- [x] Create `docs/erd.md`.
- [x] Create `docs/normalization.md`.
- [x] Create `docs/decisions.md`.
- [ ] Create `docs/backup.md`.
- [ ] Create `README.md`.
- [ ] Keep `AGENTS.md`.

## Completion criteria

- [ ] Confirm `@sql/run_all.sql` rebuilds the database successfully.
- [ ] Confirm all required tables exist.
- [ ] Confirm all required constraints exist.
- [ ] Confirm all required views exist.
- [ ] Confirm the required package exists.
- [ ] Confirm all required triggers exist.
- [ ] Confirm all required roles exist.
- [ ] Confirm sample data was inserted successfully.
- [ ] Confirm tests show the expected `PASS` results.
- [ ] Confirm documentation explains the design clearly.
- [ ] Confirm no passwords or real personal data appear in the repository.
- [ ] Be prepared to explain every important SQL and PL/SQL decision.

## Questions to resolve

- [ ] What exact columns, data types, and business rules should each required table use?
- [ ] Which fields are considered “commonly searched” and therefore require indexes?
- [ ] What appointment statuses, service categories, invoice statuses, payment methods, and medication units should be supported?
- [ ] How should invoice totals be calculated: services only, prescriptions only, or both, and are taxes or discounts required?
- [ ] Should a single appointment have one invoice only, and can an invoice be partially paid through multiple payments?
- [ ] What exact appointment changes must be captured in `APPOINTMENT_AUDIT`, and how long must audit records be retained?
- [ ] What counts as a vaccination being “due soon” beyond the required 30-day sample-data edge case?
- [ ] What specific privileges should `receptionist`, `vet`, and `admin` receive?
- [ ] Which report outputs, if any, are expected in addition to the required query script and views?
- [ ] Is the optional Node.js/Express front end expected, or is it explicitly out of scope?
