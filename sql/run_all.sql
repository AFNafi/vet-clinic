-- Run this script from the project root with: @sql/run_all.sql
-- Connection details are intentionally not stored in this repository.

WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET DEFINE OFF

PROMPT === Resetting Veterinary Clinic objects ===
@@00_drop_all.sql

PROMPT === Creating Veterinary Clinic schema ===
@@01_ddl.sql

PROMPT === Inserting fictional sample data ===
@@02_data.sql

PROMPT === Running business queries ===
@@03_queries.sql

PROMPT === Creating reporting views ===
@@04_views.sql

PROMPT === Creating PL/SQL package ===
@@05_package.sql

PROMPT === Creating triggers and running trigger tests ===
@@06_triggers.sql

PROMPT === Creating roles and grants ===
@@07_security.sql

PROMPT === Running final tests ===
@@08_tests.sql

PROMPT === Database rebuild and tests completed successfully ===
