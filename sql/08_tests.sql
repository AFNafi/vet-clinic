-- Final automated checks for the Veterinary Clinic database.
-- All temporary test changes are rolled back.

SET SERVEROUTPUT ON

-- Test 1: invalid foreign key values must be rejected.
DECLARE
    v_breed_id NUMBER;
BEGIN
    SAVEPOINT test_invalid_fk;
    SELECT MIN(breed_id) INTO v_breed_id FROM breeds;

    BEGIN
        INSERT INTO pets (owner_id, breed_id, pet_name, sex, microchip_number)
        VALUES (-999, v_breed_id, 'Invalid FK Pet', 'U', 'TEST-FK-001');
        DBMS_OUTPUT.PUT_LINE('FAIL: invalid foreign key was accepted.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -2291 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: invalid foreign key was rejected.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected foreign-key error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO test_invalid_fk;
END;
/

-- Test 2: duplicate unique values must be rejected.
BEGIN
    SAVEPOINT test_duplicate_unique;

    BEGIN
        INSERT INTO species (species_name) VALUES ('Dog');
        DBMS_OUTPUT.PUT_LINE('FAIL: duplicate unique value was accepted.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -1 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: duplicate unique value was rejected.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected unique-value error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO test_duplicate_unique;
END;
/

-- Test 3: invalid CHECK values must be rejected.
BEGIN
    SAVEPOINT test_invalid_check;

    BEGIN
        INSERT INTO services (service_name, standard_price)
        VALUES ('Invalid Price Service', -1);
        DBMS_OUTPUT.PUT_LINE('FAIL: invalid CHECK value was accepted.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -2290 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: invalid CHECK value was rejected.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected CHECK error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO test_invalid_check;
END;
/

-- Test 4: book_appointment must create a valid scheduled appointment.
DECLARE
    v_pet_id NUMBER;
    v_veterinarian_id NUMBER;
    v_appointment_count NUMBER;
    v_test_date DATE := TRUNC(SYSDATE) + 90;
BEGIN
    SAVEPOINT test_book_appointment_valid;
    SELECT MIN(pet_id) INTO v_pet_id FROM pets;
    SELECT MIN(veterinarian_id) INTO v_veterinarian_id FROM veterinarians;

    vet_clinic_pkg.book_appointment(
        v_pet_id,
        v_veterinarian_id,
        v_test_date,
        'Valid package booking test'
    );

    SELECT COUNT(*)
    INTO v_appointment_count
    FROM appointments
    WHERE pet_id = v_pet_id
      AND veterinarian_id = v_veterinarian_id
      AND appointment_date = v_test_date
      AND reason = 'Valid package booking test'
      AND appointment_status = 'SCHEDULED';

    IF v_appointment_count = 1 THEN
        DBMS_OUTPUT.PUT_LINE('PASS: book_appointment created an appointment.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: book_appointment did not create the expected appointment.');
    END IF;

    ROLLBACK TO test_book_appointment_valid;
END;
/

-- Test 5: book_appointment must reject a missing pet.
BEGIN
    SAVEPOINT test_book_appointment_invalid;

    BEGIN
        vet_clinic_pkg.book_appointment(
            -999,
            1,
            TRUNC(SYSDATE) + 90,
            'Invalid package booking test'
        );
        DBMS_OUTPUT.PUT_LINE('FAIL: book_appointment accepted a missing pet.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20005 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: book_appointment rejected a missing pet.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected book_appointment error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO test_book_appointment_invalid;
END;
/

-- Test 6: calculate_invoice_total must return a positive total for a real invoice.
DECLARE
    v_invoice_id NUMBER;
    v_total NUMBER(10,2);
BEGIN
    SELECT MIN(invoice_id) INTO v_invoice_id FROM invoices;
    v_total := vet_clinic_pkg.calculate_invoice_total(v_invoice_id);

    IF v_total > 0 THEN
        DBMS_OUTPUT.PUT_LINE('PASS: calculate_invoice_total returned ' || v_total || '.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: calculate_invoice_total did not return a positive total.');
    END IF;
END;
/

-- Test 7: calculate_invoice_total must reject a missing invoice.
BEGIN
    BEGIN
        DECLARE
            v_total NUMBER(10,2);
        BEGIN
            v_total := vet_clinic_pkg.calculate_invoice_total(-999);
            DBMS_OUTPUT.PUT_LINE('FAIL: calculate_invoice_total accepted a missing invoice.');
        END;
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20011 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: calculate_invoice_total rejected a missing invoice.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected invoice-total error ' || SQLCODE || '.');
            END IF;
    END;
END;
/

-- Test 8: register_vaccination must create a vaccination with the next due date.
DECLARE
    v_pet_id NUMBER;
    v_before_count NUMBER;
    v_after_count NUMBER;
    v_due_date DATE;
BEGIN
    SAVEPOINT test_register_vaccination_valid;
    SELECT MIN(pet_id) INTO v_pet_id FROM pets;

    SELECT COUNT(*) INTO v_before_count
    FROM vaccinations
    WHERE pet_id = v_pet_id
      AND vaccine_name = 'Valid Package Vaccine';

    vet_clinic_pkg.register_vaccination(
        v_pet_id,
        'Valid Package Vaccine',
        TRUNC(SYSDATE)
    );

    SELECT COUNT(*), MAX(due_date)
    INTO v_after_count, v_due_date
    FROM vaccinations
    WHERE pet_id = v_pet_id
      AND vaccine_name = 'Valid Package Vaccine';

    IF v_after_count = v_before_count + 1
       AND v_due_date = TRUNC(SYSDATE) + 365 THEN
        DBMS_OUTPUT.PUT_LINE('PASS: register_vaccination created the expected record.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: register_vaccination did not create the expected record.');
    END IF;

    ROLLBACK TO test_register_vaccination_valid;
END;
/

-- Test 9: register_vaccination must reject a missing vaccine name.
BEGIN
    SAVEPOINT test_register_vaccination_invalid;

    BEGIN
        vet_clinic_pkg.register_vaccination(1, NULL, TRUNC(SYSDATE));
        DBMS_OUTPUT.PUT_LINE('FAIL: register_vaccination accepted a missing vaccine name.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20021 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: register_vaccination rejected a missing vaccine name.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected vaccination error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO test_register_vaccination_invalid;
END;
/

-- Test 10: vaccination_reminders must run successfully with a valid number of days.
BEGIN
    vet_clinic_pkg.vaccination_reminders(30);
    DBMS_OUTPUT.PUT_LINE('PASS: vaccination_reminders ran for 30 days.');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('FAIL: vaccination_reminders raised error ' || SQLCODE || '.');
END;
/

-- Test 11: vaccination_reminders must reject a negative number of days.
BEGIN
    BEGIN
        vet_clinic_pkg.vaccination_reminders(-1);
        DBMS_OUTPUT.PUT_LINE('FAIL: vaccination_reminders accepted negative days.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20030 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: vaccination_reminders rejected negative days.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected reminder error ' || SQLCODE || '.');
            END IF;
    END;
END;
/

-- Test 12: the audit trigger must record an appointment update.
DECLARE
    v_appointment_id NUMBER;
    v_before_count NUMBER;
    v_after_count NUMBER;
BEGIN
    SAVEPOINT test_audit_trigger;
    SELECT MIN(appointment_id) INTO v_appointment_id FROM appointments;
    SELECT COUNT(*) INTO v_before_count
    FROM appointment_audit
    WHERE appointment_id = v_appointment_id;

    UPDATE appointments
    SET reason = reason || ' - final audit test'
    WHERE appointment_id = v_appointment_id;

    SELECT COUNT(*) INTO v_after_count
    FROM appointment_audit
    WHERE appointment_id = v_appointment_id;

    IF v_after_count = v_before_count + 1 THEN
        DBMS_OUTPUT.PUT_LINE('PASS: appointment audit trigger recorded a change.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: appointment audit trigger did not record one change.');
    END IF;

    ROLLBACK TO test_audit_trigger;
END;
/

-- Test 13: the prescription trigger must reduce medication stock.
DECLARE
    v_appointment_id NUMBER;
    v_medication_id NUMBER;
    v_stock_before NUMBER(10,2);
    v_stock_after NUMBER(10,2);
    v_unit_price NUMBER(10,2);
BEGIN
    SAVEPOINT test_prescription_trigger_pass;
    SELECT MIN(a.appointment_id) INTO v_appointment_id
    FROM appointments a
    JOIN invoices i ON i.appointment_id = a.appointment_id
    WHERE a.appointment_status = 'COMPLETED'
      AND i.invoice_status = 'UNPAID';
    SELECT medication_id, stock_quantity, unit_price
    INTO v_medication_id, v_stock_before, v_unit_price
    FROM medications WHERE medication_name = 'AmoxiPet';

    INSERT INTO prescriptions (
        appointment_id, medication_id, dosage, frequency, duration_days, quantity, unit_price
    ) VALUES (
        v_appointment_id, v_medication_id, '1 unit', 'Once daily', 1, 1, v_unit_price
    );

    SELECT stock_quantity INTO v_stock_after
    FROM medications WHERE medication_id = v_medication_id;

    IF v_stock_after = v_stock_before - 1 THEN
        DBMS_OUTPUT.PUT_LINE('PASS: prescription trigger reduced stock.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: prescription trigger did not reduce stock.');
    END IF;

    ROLLBACK TO test_prescription_trigger_pass;
END;
/

-- Test 14: the prescription trigger must block negative stock.
DECLARE
    v_appointment_id NUMBER;
    v_medication_id NUMBER;
    v_stock NUMBER(10,2);
    v_unit_price NUMBER(10,2);
BEGIN
    SAVEPOINT test_prescription_trigger_fail;
    SELECT MIN(a.appointment_id) INTO v_appointment_id
    FROM appointments a
    JOIN invoices i ON i.appointment_id = a.appointment_id
    WHERE a.appointment_status = 'COMPLETED'
      AND i.invoice_status = 'UNPAID';
    SELECT medication_id, stock_quantity, unit_price
    INTO v_medication_id, v_stock, v_unit_price
    FROM medications WHERE medication_name = 'AmoxiPet';

    BEGIN
        INSERT INTO prescriptions (
            appointment_id, medication_id, dosage, frequency, duration_days, quantity, unit_price
        ) VALUES (
            v_appointment_id, v_medication_id, '1 unit', 'Once daily', 1,
            v_stock + 1, v_unit_price
        );
        DBMS_OUTPUT.PUT_LINE('FAIL: prescription trigger allowed negative stock.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20042 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: prescription trigger blocked negative stock.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected stock error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO test_prescription_trigger_fail;
END;
/

-- Test 15: the invoice-date trigger must replace a missing invoice date.
DECLARE
    v_appointment_id NUMBER;
    v_invoice_id NUMBER;
    v_invoice_date DATE;
BEGIN
    SAVEPOINT test_invoice_date_trigger;
    SELECT MIN(a.appointment_id)
    INTO v_appointment_id
    FROM appointments a
    LEFT JOIN invoices i ON i.appointment_id = a.appointment_id
    WHERE a.appointment_status = 'SCHEDULED'
      AND i.invoice_id IS NULL;

    INSERT INTO invoices (appointment_id, invoice_date, invoice_status, notes)
    VALUES (v_appointment_id, NULL, 'UNPAID', 'Final invoice-date test')
    RETURNING invoice_id INTO v_invoice_id;

    SELECT invoice_date INTO v_invoice_date
    FROM invoices WHERE invoice_id = v_invoice_id;

    IF v_invoice_date IS NOT NULL THEN
        DBMS_OUTPUT.PUT_LINE('PASS: invoice-date trigger supplied a date.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: invoice-date trigger left the date NULL.');
    END IF;

    ROLLBACK TO test_invoice_date_trigger;
END;
/

-- Test 16: the unique index must block duplicate scheduled veterinarian time slots.
DECLARE
    v_appointment_id NUMBER;
    v_pet_id NUMBER;
    v_veterinarian_id NUMBER;
    v_appointment_date DATE;
BEGIN
    SAVEPOINT test_scheduled_slot_unique;
    SELECT appointment_id, pet_id, veterinarian_id, appointment_date
    INTO v_appointment_id, v_pet_id, v_veterinarian_id, v_appointment_date
    FROM appointments
    WHERE appointment_status = 'SCHEDULED'
    FETCH FIRST 1 ROW ONLY;

    BEGIN
        INSERT INTO appointments (
            pet_id, veterinarian_id, appointment_date, appointment_status, reason
        ) VALUES (
            v_pet_id, v_veterinarian_id, v_appointment_date, 'SCHEDULED',
            'Duplicate scheduled-slot test'
        );
        DBMS_OUTPUT.PUT_LINE('FAIL: duplicate scheduled veterinarian time was accepted.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -1 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: duplicate scheduled veterinarian time was rejected.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected scheduled-slot error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO test_scheduled_slot_unique;
END;
/

-- Test 17: prescription insert, edit, and delete must keep stock accurate.
DECLARE
    v_appointment_id NUMBER;
    v_medication_id NUMBER;
    v_replacement_medication_id NUMBER;
    v_prescription_id NUMBER;
    v_stock_before NUMBER(10,2);
    v_stock_after NUMBER(10,2);
    v_replacement_stock_before NUMBER(10,2);
    v_replacement_stock_after NUMBER(10,2);
    v_unit_price NUMBER(10,2);
    v_replacement_unit_price NUMBER(10,2);
BEGIN
    SAVEPOINT test_prescription_stock_lifecycle;
    SELECT MIN(a.appointment_id) INTO v_appointment_id
    FROM appointments a
    JOIN invoices i ON i.appointment_id = a.appointment_id
    WHERE a.appointment_status = 'COMPLETED'
      AND i.invoice_status = 'UNPAID';
    SELECT medication_id, stock_quantity, unit_price
    INTO v_medication_id, v_stock_before, v_unit_price
    FROM medications WHERE medication_name = 'AmoxiPet';
    SELECT medication_id, stock_quantity, unit_price
    INTO v_replacement_medication_id, v_replacement_stock_before, v_replacement_unit_price
    FROM medications WHERE medication_name = 'PainRelief Vet';

    INSERT INTO prescriptions (
        appointment_id, medication_id, dosage, frequency, duration_days, quantity, unit_price
    ) VALUES (
        v_appointment_id, v_medication_id, '1 unit', 'Once daily', 1, 2, v_unit_price
    ) RETURNING prescription_id INTO v_prescription_id;

    UPDATE prescriptions
    SET medication_id = v_replacement_medication_id,
        quantity = 3,
        unit_price = v_replacement_unit_price
    WHERE prescription_id = v_prescription_id;

    DELETE FROM prescriptions
    WHERE prescription_id = v_prescription_id;

    SELECT stock_quantity INTO v_stock_after
    FROM medications WHERE medication_id = v_medication_id;
    SELECT stock_quantity INTO v_replacement_stock_after
    FROM medications WHERE medication_id = v_replacement_medication_id;

    IF v_stock_after = v_stock_before
       AND v_replacement_stock_after = v_replacement_stock_before THEN
        DBMS_OUTPUT.PUT_LINE('PASS: prescription edits, medicine changes, and deletion restored stock.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: prescription edits left medication stock incorrect.');
    END IF;

    ROLLBACK TO test_prescription_stock_lifecycle;
END;
/

-- Test 18: payment lifecycle must derive invoice status and reject overpayment.
DECLARE
    v_invoice_id NUMBER;
    v_payment_id NUMBER;
    v_total NUMBER(10,2);
    v_status VARCHAR2(20);
BEGIN
    SAVEPOINT test_payment_lifecycle;
    SELECT MIN(invoice_id) INTO v_invoice_id
    FROM invoices
    WHERE invoice_status = 'UNPAID';
    v_total := vet_clinic_pkg.calculate_invoice_total(v_invoice_id);

    INSERT INTO payments (invoice_id, amount, payment_method, reference_number)
    VALUES (v_invoice_id, v_total / 2, 'CARD', 'TEST-PARTIAL')
    RETURNING payment_id INTO v_payment_id;

    SELECT invoice_status INTO v_status FROM invoices WHERE invoice_id = v_invoice_id;
    IF v_status = 'PARTIAL' THEN
        DBMS_OUTPUT.PUT_LINE('PASS: a partial payment set invoice status to PARTIAL.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: a partial payment did not set PARTIAL status.');
    END IF;

    UPDATE payments SET amount = v_total WHERE payment_id = v_payment_id;
    SELECT invoice_status INTO v_status FROM invoices WHERE invoice_id = v_invoice_id;
    IF v_status = 'PAID' THEN
        DBMS_OUTPUT.PUT_LINE('PASS: a full payment set invoice status to PAID.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: a full payment did not set PAID status.');
    END IF;

    BEGIN
        UPDATE appointment_services
        SET notes = 'Attempted paid-line edit'
        WHERE appointment_id = (
            SELECT appointment_id FROM invoices WHERE invoice_id = v_invoice_id
        );
        DBMS_OUTPUT.PUT_LINE('FAIL: a paid invoice service line was changed.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20053 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: paid invoice line items were protected.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected paid-line error ' || SQLCODE || '.');
            END IF;
    END;

    DELETE FROM payments WHERE payment_id = v_payment_id;
    SELECT invoice_status INTO v_status FROM invoices WHERE invoice_id = v_invoice_id;
    IF v_status = 'UNPAID' THEN
        DBMS_OUTPUT.PUT_LINE('PASS: deleting a payment reset invoice status to UNPAID.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: deleting a payment did not reset UNPAID status.');
    END IF;

    BEGIN
        INSERT INTO payments (invoice_id, amount, payment_method, reference_number)
        VALUES (v_invoice_id, v_total + 1, 'CARD', 'TEST-OVERPAY');
        DBMS_OUTPUT.PUT_LINE('FAIL: overpayment was accepted.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20051 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: overpayment was rejected.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected overpayment error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO test_payment_lifecycle;
END;
/

-- Test 19: a manually mismatched invoice status must be rejected.
DECLARE
    v_invoice_id NUMBER;
BEGIN
    SAVEPOINT test_invoice_status_validation;
    SELECT MIN(invoice_id) INTO v_invoice_id
    FROM invoices
    WHERE invoice_status = 'UNPAID';

    BEGIN
        UPDATE invoices SET invoice_status = 'PAID' WHERE invoice_id = v_invoice_id;
        DBMS_OUTPUT.PUT_LINE('FAIL: mismatched invoice status was accepted.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20052 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: mismatched invoice status was rejected.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected invoice-status error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO test_invoice_status_validation;
END;
/

-- Test 20: the 30-day window includes appointments later on day 30.
DECLARE
    v_pet_id NUMBER;
    v_veterinarian_id NUMBER;
    v_appointment_id NUMBER;
    v_count NUMBER;
BEGIN
    SAVEPOINT test_thirty_day_endpoint;
    SELECT MIN(pet_id) INTO v_pet_id FROM pets;
    SELECT MIN(veterinarian_id) INTO v_veterinarian_id FROM veterinarians;

    INSERT INTO appointments (
        pet_id, veterinarian_id, appointment_date, appointment_status, reason
    ) VALUES (
        v_pet_id, v_veterinarian_id, TRUNC(SYSDATE) + 30 + 0.75,
        'SCHEDULED', 'Thirty-day endpoint test'
    ) RETURNING appointment_id INTO v_appointment_id;

    SELECT COUNT(*) INTO v_count
    FROM vw_upcoming_appointments
    WHERE appointment_id = v_appointment_id;

    IF v_count = 1 THEN
        DBMS_OUTPUT.PUT_LINE('PASS: the 30-day window includes day 30 after midnight.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: the 30-day window excluded part of day 30.');
    END IF;

    ROLLBACK TO test_thirty_day_endpoint;
END;
/

-- Test 21: audited appointments must be retained instead of deleted.
DECLARE
    v_appointment_id NUMBER;
    v_pet_id NUMBER;
    v_veterinarian_id NUMBER;
BEGIN
    SAVEPOINT test_appointment_retention;
    SELECT MIN(pet_id) INTO v_pet_id FROM pets;
    SELECT MIN(veterinarian_id) INTO v_veterinarian_id FROM veterinarians;
    INSERT INTO appointments (
        pet_id, veterinarian_id, appointment_date, appointment_status, reason
    ) VALUES (
        v_pet_id, v_veterinarian_id, TRUNC(SYSDATE) + 70,
        'SCHEDULED', 'Retention test appointment'
    ) RETURNING appointment_id INTO v_appointment_id;

    BEGIN
        DELETE FROM appointments WHERE appointment_id = v_appointment_id;
        DBMS_OUTPUT.PUT_LINE('FAIL: an audited appointment was deleted.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -2292 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: audited appointment deletion was blocked.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected retention error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO test_appointment_retention;
END;
/

-- Test 22: reaching this point confirms the full run_all rebuild reached its final test stage.
BEGIN
    DBMS_OUTPUT.PUT_LINE('PASS: full rebuild reached the final test stage.');
END;
/

PROMPT All final tests completed. Review DBMS_OUTPUT for PASS and FAIL messages.
