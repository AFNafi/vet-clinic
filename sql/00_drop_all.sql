-- Safely remove objects owned by this veterinary-clinic schema.
-- Missing objects are ignored so this script can run against a fresh schema.

SET DEFINE OFF

DECLARE
    PROCEDURE drop_if_exists(p_statement IN VARCHAR2) IS
    BEGIN
        EXECUTE IMMEDIATE p_statement;
    EXCEPTION
        WHEN OTHERS THEN
            -- ORA-00942: table or view does not exist
            -- ORA-04043: object does not exist
            -- ORA-04080: trigger does not exist
            IF SQLCODE NOT IN (-942, -4043, -4080) THEN
                RAISE;
            END IF;
    END drop_if_exists;
BEGIN
    -- Future project objects are dropped first when they exist.
    drop_if_exists('DROP VIEW vw_upcoming_appointments');
    drop_if_exists('DROP VIEW vw_owner_outstanding_balances');
    drop_if_exists('DROP VIEW vw_veterinarian_workload');
    drop_if_exists('DROP VIEW vw_vaccinations_due_soon');

    drop_if_exists('DROP PACKAGE vet_clinic_pkg');

    -- Negative-stock prevention lives inside trg_reduce_medication_stock,
    -- so there is no separate stock-protection trigger to drop.
    drop_if_exists('DROP TRIGGER trg_appointment_audit');
    drop_if_exists('DROP TRIGGER trg_reduce_medication_stock');
    drop_if_exists('DROP TRIGGER trg_set_invoice_date');

    -- Drop child tables before parent tables to preserve referential integrity.
    drop_if_exists('DROP TABLE payments CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE invoices CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE appointment_audit CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE prescriptions CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE appointment_services CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE vaccinations CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE appointments CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE medications CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE services CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE pets CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE veterinarians CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE breeds CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE species CASCADE CONSTRAINTS PURGE');
    drop_if_exists('DROP TABLE owners CASCADE CONSTRAINTS PURGE');
END;
/

PROMPT Project objects removed or confirmed absent.
