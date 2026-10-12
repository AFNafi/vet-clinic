-- Extend the clinic schema for the Express application.
-- Run after the main schema exists. This script preserves current clinic data.

DECLARE
BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE veterinarians ADD (specialty VARCHAR2(100))';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE <> -1430 THEN
            RAISE;
        END IF;
END;
/

DECLARE
BEGIN
    EXECUTE IMMEDIATE
        'ALTER TABLE appointments ADD (confirmation_status VARCHAR2(12) DEFAULT ''CONFIRMED'' NOT NULL)';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE <> -1430 THEN
            RAISE;
        END IF;
END;
/

DECLARE
BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE pets ADD (last_visit_date DATE)';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE <> -1430 THEN
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE appointments DROP CONSTRAINT ck_appt_confirmation';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE <> -2443 THEN
            RAISE;
        END IF;
END;
/

ALTER TABLE appointments ADD CONSTRAINT ck_appt_confirmation CHECK (
    confirmation_status IN ('PENDING', 'CONFIRMED', 'ACCEPTED')
);

DECLARE
BEGIN
    EXECUTE IMMEDIATE q'~
        CREATE TABLE staff_accounts (
            account_id       VARCHAR2(36)   NOT NULL,
            email            VARCHAR2(254)  NOT NULL,
            full_name        VARCHAR2(80)   NOT NULL,
            title            VARCHAR2(100)  NOT NULL,
            account_role     VARCHAR2(20)   NOT NULL,
            initials         VARCHAR2(10)   NOT NULL,
            password_salt    VARCHAR2(128)  NOT NULL,
            password_hash    VARCHAR2(128)  NOT NULL,
            specialty        VARCHAR2(60),
            veterinarian_id  NUMBER,
            created_at       DATE DEFAULT SYSDATE NOT NULL,
            CONSTRAINT pk_staff_accounts PRIMARY KEY (account_id),
            CONSTRAINT uq_staff_accounts_email UNIQUE (email),
            CONSTRAINT uq_staff_accounts_vet UNIQUE (veterinarian_id),
            CONSTRAINT fk_staff_accounts_vet FOREIGN KEY (veterinarian_id)
                REFERENCES veterinarians (veterinarian_id),
            CONSTRAINT ck_staff_accounts_role CHECK (
                (account_role = 'ADMIN' AND veterinarian_id IS NULL AND specialty IS NULL)
                OR
                (account_role = 'VETERINARIAN' AND veterinarian_id IS NOT NULL AND specialty IS NOT NULL)
            )
        )~';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE <> -955 THEN
            RAISE;
        END IF;
END;
/

DECLARE
BEGIN
    EXECUTE IMMEDIATE q'~
        CREATE TABLE backend_migrations (
            migration_name VARCHAR2(100) NOT NULL,
            completed_at DATE DEFAULT SYSDATE NOT NULL,
            CONSTRAINT pk_backend_migrations PRIMARY KEY (migration_name)
        )~';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE <> -955 THEN
            RAISE;
        END IF;
END;
/

PROMPT Backend account and appointment fields created.
