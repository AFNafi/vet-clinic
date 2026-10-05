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
