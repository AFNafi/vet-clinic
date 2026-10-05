-- Roles, least-privilege grants, and a transaction-control demonstration.
-- Run this script as the schema owner with CREATE ROLE privilege, or as a DBA.

-- Administrator-only role setup. Existing project role names are kept on reruns.
DECLARE
    PROCEDURE create_role_if_needed(p_role_name IN VARCHAR2) IS
    BEGIN
        EXECUTE IMMEDIATE 'CREATE ROLE ' || p_role_name;
    EXCEPTION
        WHEN OTHERS THEN
            -- ORA-01921 means that the role name already exists.
            IF SQLCODE <> -1921 THEN
                RAISE;
            END IF;
    END create_role_if_needed;
BEGIN
    create_role_if_needed('receptionist');
    create_role_if_needed('vet');
    create_role_if_needed('admin');
END;
/

-- Receptionist: manage owners, pets, appointments, invoices, and payments.
GRANT SELECT, INSERT, UPDATE ON owners TO receptionist;
GRANT SELECT, INSERT, UPDATE ON pets TO receptionist;
GRANT SELECT ON species TO receptionist;
GRANT SELECT ON breeds TO receptionist;
GRANT SELECT ON veterinarians TO receptionist;
GRANT SELECT ON services TO receptionist;
GRANT SELECT ON medications TO receptionist;
GRANT SELECT, INSERT, UPDATE ON appointments TO receptionist;
GRANT SELECT, INSERT, UPDATE ON invoices TO receptionist;
GRANT SELECT, INSERT ON payments TO receptionist;
GRANT SELECT ON vw_upcoming_appointments TO receptionist;
GRANT SELECT ON vw_owner_outstanding_balances TO receptionist;
GRANT EXECUTE ON vet_clinic_pkg TO receptionist;

-- Vet: view clinic records and record clinical services, prescriptions, and vaccinations.
GRANT SELECT ON owners TO vet;
GRANT SELECT ON pets TO vet;
GRANT SELECT ON species TO vet;
GRANT SELECT ON breeds TO vet;
GRANT SELECT ON veterinarians TO vet;
GRANT SELECT, UPDATE ON appointments TO vet;
GRANT SELECT ON services TO vet;
GRANT SELECT, INSERT, UPDATE ON appointment_services TO vet;
GRANT SELECT ON medications TO vet;
GRANT SELECT, INSERT ON prescriptions TO vet;
GRANT SELECT, INSERT, UPDATE ON vaccinations TO vet;
GRANT SELECT ON vw_upcoming_appointments TO vet;
GRANT SELECT ON vw_vaccinations_due_soon TO vet;
GRANT EXECUTE ON vet_clinic_pkg TO vet;

-- Admin: full data-management access, including audit history and reporting views.
GRANT SELECT, INSERT, UPDATE, DELETE ON owners TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON species TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON breeds TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON pets TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON veterinarians TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointment_services TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON medications TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON prescriptions TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON vaccinations TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO admin;
GRANT SELECT ON appointment_audit TO admin;
GRANT SELECT ON vw_upcoming_appointments TO admin;
GRANT SELECT ON vw_owner_outstanding_balances TO admin;
GRANT SELECT ON vw_veterinarian_workload TO admin;
GRANT SELECT ON vw_vaccinations_due_soon TO admin;
GRANT EXECUTE ON vet_clinic_pkg TO admin;

-- Transaction demonstration: make a temporary change, roll it back, then commit.
SAVEPOINT security_demo_start;

UPDATE medications
SET stock_quantity = stock_quantity + 1
WHERE medication_id = (SELECT MIN(medication_id) FROM medications);

ROLLBACK TO security_demo_start;
COMMIT;

-- Administrator-only user creation section.
-- No CREATE USER statements are included here because credentials must never be stored in this project.
-- A DBA may create real database users outside this repository, then grant one role:
--   GRANT receptionist TO a_reception_user;
--   GRANT vet TO a_vet_user;
--   GRANT admin TO an_admin_user;

PROMPT Roles, least-privilege grants, and transaction demonstration completed.
