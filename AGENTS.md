# Veterinary Clinic Database (Oracle)

- Use Oracle Database Free SQL only: VARCHAR2, NUMBER, DATE, GENERATED ALWAYS AS IDENTITY, FETCH FIRST and SYSDATE.
- Keep SQL files in /sql and documentation in /docs.
- Name SQL scripts:
  00_drop_all.sql
  01_ddl.sql
  02_data.sql
  03_queries.sql
  04_views.sql
  05_package.sql
  06_triggers.sql
  07_security.sql
  08_tests.sql
  run_all.sql
- Scripts must run from the project root.
- Make every script safe to run on a fresh schema.
- Use fake data only. Never save passwords in files.
- Explain work in simple English.
- Record design decisions in docs/decisions.md.
- Do not change files outside this project folder.