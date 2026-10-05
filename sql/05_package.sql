-- Package for the main Veterinary Clinic business actions.

CREATE OR REPLACE PACKAGE vet_clinic_pkg AS
    PROCEDURE book_appointment (
        p_pet_id           IN NUMBER,
        p_veterinarian_id  IN NUMBER,
        p_appointment_date IN DATE,
        p_reason           IN VARCHAR2
    );

    FUNCTION calculate_invoice_total (
        p_invoice_id IN NUMBER
    ) RETURN NUMBER;

    PROCEDURE register_vaccination (
        p_pet_id           IN NUMBER,
        p_vaccine_name     IN VARCHAR2,
        p_vaccination_date IN DATE DEFAULT SYSDATE
    );

    PROCEDURE vaccination_reminders (
        p_days_ahead IN NUMBER DEFAULT 30
    );
END vet_clinic_pkg;
/

CREATE OR REPLACE PACKAGE BODY vet_clinic_pkg AS

    PROCEDURE book_appointment (
        p_pet_id           IN NUMBER,
        p_veterinarian_id  IN NUMBER,
        p_appointment_date IN DATE,
        p_reason           IN VARCHAR2
    ) IS
        v_pet_count NUMBER;
        v_vet_count NUMBER;
        v_conflict_count NUMBER;
    BEGIN
        IF p_pet_id IS NULL THEN
            RAISE_APPLICATION_ERROR(-20001, 'A pet ID is required.');
        END IF;

        IF p_veterinarian_id IS NULL THEN
            RAISE_APPLICATION_ERROR(-20002, 'A veterinarian ID is required.');
        END IF;

        IF p_appointment_date IS NULL OR p_appointment_date < TRUNC(SYSDATE) THEN
            RAISE_APPLICATION_ERROR(-20003, 'The appointment date must be today or later.');
        END IF;

        IF p_reason IS NULL OR TRIM(p_reason) IS NULL THEN
            RAISE_APPLICATION_ERROR(-20004, 'An appointment reason is required.');
        END IF;

        SELECT COUNT(*)
        INTO v_pet_count
        FROM pets
        WHERE pet_id = p_pet_id;

        IF v_pet_count = 0 THEN
            RAISE_APPLICATION_ERROR(-20005, 'The selected pet does not exist.');
        END IF;

        SELECT COUNT(*)
        INTO v_vet_count
        FROM veterinarians
        WHERE veterinarian_id = p_veterinarian_id
          AND is_active = 'Y';

        IF v_vet_count = 0 THEN
            RAISE_APPLICATION_ERROR(-20006, 'The selected veterinarian does not exist or is inactive.');
        END IF;

        SELECT COUNT(*)
        INTO v_conflict_count
        FROM appointments
        WHERE veterinarian_id = p_veterinarian_id
          AND appointment_date = p_appointment_date
          AND appointment_status = 'SCHEDULED';

        IF v_conflict_count > 0 THEN
            RAISE_APPLICATION_ERROR(-20007, 'The veterinarian is not free at that appointment time.');
        END IF;

        INSERT INTO appointments (
            pet_id,
            veterinarian_id,
            appointment_date,
            appointment_status,
            reason
        )
        VALUES (
            p_pet_id,
            p_veterinarian_id,
            p_appointment_date,
            'SCHEDULED',
            TRIM(p_reason)
        );

        DBMS_OUTPUT.PUT_LINE('Appointment booked successfully.');
    END book_appointment;

    FUNCTION calculate_invoice_total (
        p_invoice_id IN NUMBER
    ) RETURN NUMBER IS
        v_appointment_id NUMBER;
        v_service_total NUMBER(10,2);
        v_prescription_total NUMBER(10,2);
    BEGIN
        IF p_invoice_id IS NULL THEN
            RAISE_APPLICATION_ERROR(-20010, 'An invoice ID is required.');
        END IF;

        SELECT appointment_id
        INTO v_appointment_id
        FROM invoices
        WHERE invoice_id = p_invoice_id;

        SELECT NVL(SUM(quantity * unit_price), 0)
        INTO v_service_total
        FROM appointment_services
        WHERE appointment_id = v_appointment_id;

        SELECT NVL(SUM(quantity * unit_price), 0)
        INTO v_prescription_total
        FROM prescriptions
        WHERE appointment_id = v_appointment_id;

        RETURN v_service_total + v_prescription_total;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20011, 'The selected invoice does not exist.');
    END calculate_invoice_total;

    PROCEDURE register_vaccination (
        p_pet_id           IN NUMBER,
        p_vaccine_name     IN VARCHAR2,
        p_vaccination_date IN DATE
    ) IS
        v_pet_count NUMBER;
        v_due_date DATE;
    BEGIN
        IF p_pet_id IS NULL THEN
            RAISE_APPLICATION_ERROR(-20020, 'A pet ID is required.');
        END IF;

        IF p_vaccine_name IS NULL OR TRIM(p_vaccine_name) IS NULL THEN
            RAISE_APPLICATION_ERROR(-20021, 'A vaccine name is required.');
        END IF;

        IF p_vaccination_date IS NULL OR p_vaccination_date > TRUNC(SYSDATE) THEN
            RAISE_APPLICATION_ERROR(-20022, 'The vaccination date cannot be in the future.');
        END IF;

        SELECT COUNT(*)
        INTO v_pet_count
        FROM pets
        WHERE pet_id = p_pet_id;

        IF v_pet_count = 0 THEN
            RAISE_APPLICATION_ERROR(-20023, 'The selected pet does not exist.');
        END IF;

        v_due_date := p_vaccination_date + 365;

        INSERT INTO vaccinations (
            pet_id,
            vaccine_name,
            vaccination_date,
            due_date,
            notes
        )
        VALUES (
            p_pet_id,
            TRIM(p_vaccine_name),
            p_vaccination_date,
            v_due_date,
            'Registered through vet_clinic_pkg'
        );

        DBMS_OUTPUT.PUT_LINE(
            'Vaccination registered. Next due date: ' || TO_CHAR(v_due_date, 'YYYY-MM-DD')
        );
    END register_vaccination;

    PROCEDURE vaccination_reminders (
        p_days_ahead IN NUMBER
    ) IS
        CURSOR c_reminders (cp_days_ahead NUMBER) IS
            SELECT p.pet_name,
                   o.first_name || ' ' || o.last_name AS owner_name,
                   va.vaccine_name,
                   va.due_date
            FROM vaccinations va
            JOIN pets p ON p.pet_id = va.pet_id
            JOIN owners o ON o.owner_id = p.owner_id
            WHERE va.due_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + cp_days_ahead
            ORDER BY va.due_date, p.pet_name;

        v_reminder c_reminders%ROWTYPE;
        v_found BOOLEAN := FALSE;
    BEGIN
        IF p_days_ahead IS NULL OR p_days_ahead < 0 THEN
            RAISE_APPLICATION_ERROR(-20030, 'Days ahead must be zero or greater.');
        END IF;

        OPEN c_reminders(p_days_ahead);
        LOOP
            FETCH c_reminders INTO v_reminder;
            EXIT WHEN c_reminders%NOTFOUND;

            v_found := TRUE;
            DBMS_OUTPUT.PUT_LINE(
                'Reminder: ' || v_reminder.pet_name || ' (' || v_reminder.owner_name ||
                ') needs ' || v_reminder.vaccine_name || ' by ' ||
                TO_CHAR(v_reminder.due_date, 'YYYY-MM-DD')
            );
        END LOOP;
        CLOSE c_reminders;

        IF NOT v_found THEN
            DBMS_OUTPUT.PUT_LINE('No vaccinations are due in the selected period.');
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            IF c_reminders%ISOPEN THEN
                CLOSE c_reminders;
            END IF;
            RAISE;
    END vaccination_reminders;

END vet_clinic_pkg;
/

-- Check compilation errors after running this file. No rows means compilation succeeded.
SELECT type, line, position, text
FROM user_errors
WHERE name = 'VET_CLINIC_PKG'
ORDER BY sequence;

-- Valid examples: run one block at a time after enabling output with SET SERVEROUTPUT ON.
-- BEGIN
--     vet_clinic_pkg.book_appointment(1, 1, TRUNC(SYSDATE) + 14, 'Package test appointment');
-- END;
-- /
--
-- SELECT vet_clinic_pkg.calculate_invoice_total(1) AS invoice_total FROM dual;
--
-- BEGIN
--     vet_clinic_pkg.register_vaccination(1, 'Package Test Vaccine', TRUNC(SYSDATE));
--     vet_clinic_pkg.vaccination_reminders(30);
-- END;
-- /

-- Invalid examples: each block should raise the stated custom error.
-- BEGIN
--     vet_clinic_pkg.book_appointment(-999, 1, TRUNC(SYSDATE) + 14, 'Invalid pet test');
-- END;
-- /
--
-- BEGIN
--     vet_clinic_pkg.register_vaccination(1, NULL, TRUNC(SYSDATE));
-- END;
-- /
--
-- SELECT vet_clinic_pkg.calculate_invoice_total(-999) AS invoice_total FROM dual;
