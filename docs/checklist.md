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

- [ ] Create a Mermaid ER diagram.
- [ ] Include a short explanation of the purpose of every table.
- [ ] Explain normalization through Third Normal Form (3NF).
- [ ] Define a primary key for every table.
- [ ] Define foreign keys for every relationship.
- [ ] Use `NOT NULL` constraints where appropriate.
- [ ] Use `UNIQUE` constraints where appropriate.
- [ ] Use `CHECK` constraints where appropriate.
- [ ] Use `DEFAULT` constraints where appropriate.
- [ ] Use `GENERATED ALWAYS AS IDENTITY` for identity primary keys.
- [ ] Create indexes for foreign-key columns.
- [ ] Create indexes for commonly searched fields.
- [ ] Include at least one many-to-many relationship: appointments to services through `APPOINTMENT_SERVICES`.

## Required tables and DDL

- [ ] Create `OWNERS` for pet-owner information.
- [ ] Create `SPECIES` for animal species.
- [ ] Create `BREEDS`, linked to `SPECIES`.
- [ ] Create `PETS`, linked to an owner and breed.
- [ ] Create `VETERINARIANS` for veterinarian information.
- [ ] Create `APPOINTMENTS`, linking pets and veterinarians.
- [ ] Create `SERVICES` for clinic services and prices.
- [ ] Create `APPOINTMENT_SERVICES` for services performed during an appointment.
- [ ] Create `MEDICATIONS` for medication stock and prices.
- [ ] Create `PRESCRIPTIONS` for medications prescribed during appointments.
- [ ] Create `VACCINATIONS` for pet vaccination records.
- [ ] Create `INVOICES` for appointment charges.
- [ ] Create `PAYMENTS` for payments against invoices.
- [ ] Create `APPOINTMENT_AUDIT` for appointment-change history.

## Sample data

- [ ] Use fake data only.
- [ ] Do not store real names, phone numbers, email addresses, or addresses.
- [ ] Insert at least 15 owners.
- [ ] Insert at least 25 pets.
- [ ] Insert at least 6 veterinarians.
- [ ] Insert at least 60 appointments spanning six months.
- [ ] Insert realistic services.
- [ ] Insert realistic medications.
- [ ] Insert realistic prescriptions.
- [ ] Insert realistic vaccination records.
- [ ] Insert realistic invoices.
- [ ] Insert realistic payments.
- [ ] Include unpaid-invoice edge cases.
- [ ] Include pets with multiple appointments.
- [ ] Include vaccinations due within 30 days.

## Queries and reports

- [ ] Create at least 18 useful Oracle SQL queries.
- [ ] Add a comment to every query explaining its business question.
- [ ] Include an inner join query.
- [ ] Include a left or outer join query.
- [ ] Include a multi-table join query.
- [ ] Include `GROUP BY` and `HAVING`.
- [ ] Include subqueries.
- [ ] Include `EXISTS` or `NOT EXISTS`.
- [ ] Include analytic functions, including `RANK()` and `SUM() OVER`.
- [ ] Include a top-N query using `FETCH FIRST`.
- [ ] Include filtering, sorting, and date-based searching.

## Views

- [ ] Create an upcoming appointments view.
- [ ] Create an owner outstanding balances view.
- [ ] Create a veterinarian workload by month view.
- [ ] Create a vaccinations due soon view.

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

- [ ] Create `sql/00_drop_all.sql`.
- [ ] Create `sql/01_ddl.sql`.
- [ ] Create `sql/02_data.sql`.
- [ ] Create `sql/03_queries.sql`.
- [ ] Create `sql/04_views.sql`.
- [ ] Create `sql/05_package.sql`.
- [ ] Create `sql/06_triggers.sql`.
- [ ] Create `sql/07_security.sql`.
- [ ] Create `sql/08_tests.sql`.
- [ ] Create `sql/run_all.sql`.
- [ ] Keep `docs/requirements.md`.
- [ ] Create `docs/checklist.md`.
- [ ] Create `docs/design.md`.
- [ ] Create `docs/erd.md`.
- [ ] Create `docs/normalization.md`.
- [ ] Create `docs/decisions.md`.
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
