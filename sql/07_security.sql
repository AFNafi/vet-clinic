-- Roles, least-privilege grants, and a transaction-control demonstration.
--
-- Two database-level facts shape this script:
--
--   1. CREATE ROLE needs a system privilege that a plain schema owner does not
--      have by default, so the setup below only runs when the privilege exists.
--   2. Oracle does not allow a role and a user to share a name. The customary
--      schema owner for this project is the user VET, so a role named "vet"
--      cannot be created while that user exists (ORA-01921). The script detects
--      this and reports it instead of pretending the role was created.
--
-- Either way the script finishes, so @sql/run_all.sql never aborts here.
-- A DBA can enable full role setup with:
--   GRANT CREATE ROLE TO <schema_owner>;
-- and can only obtain a "vet" role by owning the schema under a name other than VET.

SET SERVEROUTPUT ON

DECLARE
    v_can_create_role BOOLEAN := FALSE;
    v_priv_count      PLS_INTEGER;

    v_receptionist_ready BOOLEAN := FALSE;
    v_vet_ready          BOOLEAN := FALSE;
    v_admin_ready        BOOLEAN := FALSE;

    -- True when a database user already uses this name, which blocks CREATE ROLE.
    FUNCTION user_uses_name (p_name IN VARCHAR2) RETURN BOOLEAN IS
        v_user_count PLS_INTEGER;
    BEGIN
        SELECT COUNT(*)
        INTO v_user_count
        FROM all_users
        WHERE username = UPPER(p_name);

        RETURN v_user_count > 0;
    END user_uses_name;

    -- Create the role unless a user owns the name. p_ready reports whether the
    -- role exists afterwards and may therefore receive grants.
    PROCEDURE prepare_role (p_role_name IN VARCHAR2, p_ready OUT BOOLEAN) IS
    BEGIN
        IF user_uses_name(p_role_name) THEN
            p_ready := FALSE;
            DBMS_OUTPUT.PUT_LINE(
                'NOTICE: the ' || p_role_name || ' role was NOT created. ORA-01921: a user named ' ||
                UPPER(p_role_name) || ' already exists and Oracle does not allow a role and a ' ||
                'user to share a name.'
            );
            RETURN;
        END IF;

        BEGIN
            EXECUTE IMMEDIATE 'CREATE ROLE ' || p_role_name;
        EXCEPTION
            WHEN OTHERS THEN
                -- ORA-01921 also means the role itself already exists, which is fine.
                IF SQLCODE <> -1921 THEN
                    RAISE;
                END IF;
        END;

        p_ready := TRUE;
    END prepare_role;

    -- Grant one role a privilege on one object, or a system privilege when no
    -- object is supplied.
    PROCEDURE grant_to_role (
        p_privilege IN VARCHAR2,
        p_object    IN VARCHAR2,
        p_role_name IN VARCHAR2
    ) IS
    BEGIN
        EXECUTE IMMEDIATE 'GRANT ' || p_privilege || ' ON ' || p_object ||
                          ' TO ' || p_role_name;
    END grant_to_role;
BEGIN
    SELECT COUNT(*)
    INTO v_priv_count
    FROM session_privs
    WHERE privilege = 'CREATE ROLE';

    v_can_create_role := (v_priv_count > 0);

    IF NOT v_can_create_role THEN
        DBMS_OUTPUT.PUT_LINE('NOTICE: this user cannot create roles, so the role setup was skipped.');
        DBMS_OUTPUT.PUT_LINE('        As a DBA run: GRANT CREATE ROLE TO ' || USER || ';');
        DBMS_OUTPUT.PUT_LINE('        Then rerun this script to create receptionist, vet and admin.');
    ELSE
        prepare_role('receptionist', v_receptionist_ready);
        prepare_role('vet', v_vet_ready);
        prepare_role('admin', v_admin_ready);

        -- Receptionist: manage owners, pets, appointments, invoices, and payments.
        IF v_receptionist_ready THEN
            grant_to_role('SELECT, INSERT, UPDATE', 'owners', 'receptionist');
            grant_to_role('SELECT, INSERT, UPDATE', 'pets', 'receptionist');
            grant_to_role('SELECT', 'species', 'receptionist');
            grant_to_role('SELECT', 'breeds', 'receptionist');
            grant_to_role('SELECT', 'veterinarians', 'receptionist');
            grant_to_role('SELECT', 'services', 'receptionist');
            grant_to_role('SELECT', 'medications', 'receptionist');
            grant_to_role('SELECT, INSERT, UPDATE', 'appointments', 'receptionist');
            grant_to_role('SELECT, INSERT, UPDATE', 'invoices', 'receptionist');
            grant_to_role('SELECT, INSERT', 'payments', 'receptionist');
            grant_to_role('SELECT', 'vw_upcoming_appointments', 'receptionist');
            grant_to_role('SELECT', 'vw_owner_outstanding_balances', 'receptionist');
            grant_to_role('EXECUTE', 'vet_clinic_pkg', 'receptionist');
        END IF;

        -- Vet: read clinic records and record clinical work.
        IF v_vet_ready THEN
            grant_to_role('SELECT', 'owners', 'vet');
            grant_to_role('SELECT', 'pets', 'vet');
            grant_to_role('SELECT', 'species', 'vet');
            grant_to_role('SELECT', 'breeds', 'vet');
            grant_to_role('SELECT', 'veterinarians', 'vet');
            grant_to_role('SELECT, UPDATE', 'appointments', 'vet');
            grant_to_role('SELECT', 'services', 'vet');
            grant_to_role('SELECT, INSERT, UPDATE', 'appointment_services', 'vet');
            grant_to_role('SELECT', 'medications', 'vet');
            grant_to_role('SELECT, INSERT', 'prescriptions', 'vet');
            grant_to_role('SELECT, INSERT, UPDATE', 'vaccinations', 'vet');
            grant_to_role('SELECT', 'vw_upcoming_appointments', 'vet');
            grant_to_role('SELECT', 'vw_vaccinations_due_soon', 'vet');
            grant_to_role('EXECUTE', 'vet_clinic_pkg', 'vet');
        END IF;

        -- Admin: full data management plus reporting and audit history.
        IF v_admin_ready THEN
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'owners', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'species', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'breeds', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'pets', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'veterinarians', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'appointments', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'services', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'appointment_services', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'medications', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'prescriptions', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'vaccinations', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'invoices', 'admin');
            grant_to_role('SELECT, INSERT, UPDATE, DELETE', 'payments', 'admin');
            grant_to_role('SELECT', 'appointment_audit', 'admin');
            grant_to_role('SELECT', 'vw_upcoming_appointments', 'admin');
            grant_to_role('SELECT', 'vw_owner_outstanding_balances', 'admin');
            grant_to_role('SELECT', 'vw_veterinarian_workload', 'admin');
            grant_to_role('SELECT', 'vw_vaccinations_due_soon', 'admin');
            grant_to_role('EXECUTE', 'vet_clinic_pkg', 'admin');
        END IF;

        DBMS_OUTPUT.PUT_LINE('Role setup finished. receptionist=' ||
            CASE WHEN v_receptionist_ready THEN 'granted' ELSE 'skipped' END || ', vet=' ||
            CASE WHEN v_vet_ready THEN 'granted' ELSE 'skipped' END || ', admin=' ||
            CASE WHEN v_admin_ready THEN 'granted' ELSE 'skipped' END || '.');
    END IF;
END;
/

-- Transaction demonstration: make a temporary change, roll it back, then commit.
SAVEPOINT security_demo_start;

UPDATE medications
SET stock_quantity = stock_quantity + 1
WHERE medication_id = (SELECT MIN(medication_id) FROM medications);

ROLLBACK TO security_demo_start;
COMMIT;

-- No CREATE USER statements are included here because credentials must never be
-- stored in this project. A DBA may create real database users outside this
-- repository, then grant one role:
--   GRANT receptionist TO a_reception_user;
--   GRANT vet TO a_vet_user;
--   GRANT admin TO an_admin_user;

PROMPT Roles, least-privilege grants, and transaction demonstration completed.
