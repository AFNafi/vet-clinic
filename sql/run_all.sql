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

-- Add the remaining project scripts here as they are created:
-- @@03_queries.sql
-- @@04_views.sql
-- @@05_package.sql
-- @@06_triggers.sql
-- @@07_security.sql
-- @@08_tests.sql

PROMPT === Schema setup completed successfully ===
