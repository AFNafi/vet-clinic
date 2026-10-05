# Veterinary Clinic Database - Project Requirements

## 1. Project overview

This project will create an Oracle Database system for a small veterinary clinic. The database will store information about pet owners, pets, veterinarians, appointments, clinical services, medications, vaccinations and payments.

The goal is to demonstrate database design, Oracle SQL, PL/SQL, security and testing skills through a realistic business scenario.

## 2. Project objectives

The system must:

- Store owner and pet information accurately.
- Record appointments between pets and veterinarians.
- Record services performed during appointments.
- Track medications and prescriptions.
- Store vaccination records and identify vaccinations due soon.
- Create invoices and record payments.
- Produce useful business queries and reports.
- Protect data with constraints, roles and privileges.
- Be fully rebuildable from SQL scripts.

## 3. Technology requirements

- Database: Oracle Database Free.
- SQL tool: SQLcl.
- Development environment: VS Code.
- Version control: Git.
- Optional front end: Node.js, Express and Oracle node-oracledb.
- All SQL must use Oracle syntax only.

## 4. Required database tables

The database must contain at least the following tables:

1. `OWNERS` - pet owner information.
2. `SPECIES` - animal species, such as dog, cat or rabbit.
3. `BREEDS` - breeds linked to a species.
4. `PETS` - pet details linked to an owner and breed.
5. `VETERINARIANS` - veterinarian information.
6. `APPOINTMENTS` - appointments between pets and veterinarians.
7. `SERVICES` - clinic services and prices.
8. `APPOINTMENT_SERVICES` - services performed during an appointment.
9. `MEDICATIONS` - medication stock and prices.
10. `PRESCRIPTIONS` - medications prescribed during appointments.
11. `VACCINATIONS` - pet vaccination records.
12. `INVOICES` - charges for appointments.
13. `PAYMENTS` - payments made against invoices.
14. `APPOINTMENT_AUDIT` - audit history for appointment changes.

The project must include at least one many-to-many relationship. `APPOINTMENT_SERVICES` will connect appointments and services.

## 5. Data requirements

- Use fake data only.
- Do not store real names, phone numbers, email addresses or addresses.
- Include at least 15 owners.
- Include at least 25 pets.
- Include at least 6 veterinarians.
- Include at least 60 appointments across six months.
- Include realistic services, medications, prescriptions, vaccinations, invoices and payments.
- Include useful edge cases, such as unpaid invoices, pets with multiple appointments and vaccinations due within 30 days.

## 6. Database design requirements

The design must include:

- Primary keys on every table.
- Foreign keys for all relationships.
- `NOT NULL`, `UNIQUE`, `CHECK` and `DEFAULT` constraints where appropriate.
- Identity primary keys using `GENERATED ALWAYS AS IDENTITY`.
- Indexes on foreign-key columns and commonly searched fields.
- A Mermaid ER diagram.
- A written explanation of normalization up to Third Normal Form (3NF).
- A short explanation of the purpose of every table.

## 7. SQL query requirements

The project must contain at least 18 useful Oracle SQL queries.

The queries must demonstrate:

- Inner joins.
- Left or outer joins.
- Multi-table joins.
- `GROUP BY` and `HAVING`.
- Subqueries.
- `EXISTS` or `NOT EXISTS`.
- Analytic functions such as `RANK()` and `SUM() OVER`.
- A top-N query using `FETCH FIRST`.
- Filtering, sorting and date-based searching.

Every query must have a comment explaining the business question it answers.

## 8. Views requirements

The project must create at least four views:

1. Upcoming appointments.
2. Owner outstanding balances.
3. Veterinarian workload by month.
4. Vaccinations due soon.

## 9. PL/SQL requirements

The project must include a package named `vet_clinic_pkg`.

The package must include:

- A procedure to book an appointment.
- A function to calculate an invoice total.
- A procedure to register a vaccination.
- A procedure to print vaccination reminders using an explicit cursor and loop.
- Proper exception handling.
- Custom error messages using `RAISE_APPLICATION_ERROR`.

## 10. Trigger requirements

The project must include triggers that:

- Audit changes to appointments.
- Reduce medication stock when a prescription is created.
- Prevent medication stock from becoming negative.
- Automatically set an invoice date when it is missing.

## 11. Security and transaction requirements

The project must include these roles:

- `receptionist`
- `vet`
- `admin`

Each role must receive only the privileges needed for its job.

The project must also demonstrate:

- `COMMIT`
- `ROLLBACK`
- `SAVEPOINT`

## 12. Testing requirements

The project must include tests for:

- Invalid foreign-key values.
- Duplicate unique values.
- Invalid `CHECK` constraint values.
- Valid and invalid PL/SQL procedure calls.
- PL/SQL function results.
- Trigger behavior.
- A complete rebuild from an empty schema.

Tests must print clear `PASS` or `FAIL` messages through `DBMS_OUTPUT`.

## 13. Required project files

```text
sql/00_drop_all.sql
sql/01_ddl.sql
sql/02_data.sql
sql/03_queries.sql
sql/04_views.sql
sql/05_package.sql
sql/06_triggers.sql
sql/07_security.sql
sql/08_tests.sql
sql/run_all.sql

docs/requirements.md
docs/checklist.md
docs/design.md
docs/erd.md
docs/normalization.md
docs/decisions.md
docs/backup.md

README.md
AGENTS.md
```

## 14. Completion criteria

The project is complete when:

- `@sql/run_all.sql` rebuilds the database successfully.
- All required tables, constraints, views, package, triggers and roles exist.
- Sample data has been inserted successfully.
- Tests show the expected `PASS` results.
- Documentation explains the design clearly.
- No passwords or real personal data appear in the repository.
- The student can explain every important SQL and PL/SQL decision.