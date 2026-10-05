-- Triggers for auditing, medication stock, and invoice dates.

CREATE OR REPLACE TRIGGER trg_appointment_audit
AFTER INSERT OR UPDATE OF appointment_date, appointment_status, veterinarian_id, reason
ON appointments
FOR EACH ROW
DECLARE
    v_action_type VARCHAR2(10);
    v_old_status VARCHAR2(20);
    v_old_appointment_date DATE;
    v_old_veterinarian_id NUMBER;
    v_old_reason VARCHAR2(500);
BEGIN
    IF INSERTING THEN
        v_action_type := 'INSERT';
    ELSE
        v_action_type := 'UPDATE';
        v_old_status := :OLD.appointment_status;
        v_old_appointment_date := :OLD.appointment_date;
        v_old_veterinarian_id := :OLD.veterinarian_id;
        v_old_reason := :OLD.reason;
    END IF;

    INSERT INTO appointment_audit (
        appointment_id,
        action_type,
        old_status,
        new_status,
        old_appointment_date,
        new_appointment_date,
        old_veterinarian_id,
        new_veterinarian_id,
        old_reason,
        new_reason,
        changed_at,
        changed_by
    )
    VALUES (
        :NEW.appointment_id,
        v_action_type,
        v_old_status,
        :NEW.appointment_status,
        v_old_appointment_date,
        :NEW.appointment_date,
        v_old_veterinarian_id,
        :NEW.veterinarian_id,
        v_old_reason,
        :NEW.reason,
        SYSDATE,
        USER
    );
END;
/

CREATE OR REPLACE TRIGGER trg_reduce_medication_stock
BEFORE INSERT ON prescriptions
FOR EACH ROW
DECLARE
    v_medication_count NUMBER;
BEGIN
    IF :NEW.quantity IS NULL OR :NEW.quantity <= 0 THEN
        RAISE_APPLICATION_ERROR(-20040, 'Prescription quantity must be greater than zero.');
    END IF;

    UPDATE medications
    SET stock_quantity = stock_quantity - :NEW.quantity
    WHERE medication_id = :NEW.medication_id
      AND stock_quantity >= :NEW.quantity;

    IF SQL%ROWCOUNT = 0 THEN
        SELECT COUNT(*)
        INTO v_medication_count
        FROM medications
        WHERE medication_id = :NEW.medication_id;

        IF v_medication_count = 0 THEN
            RAISE_APPLICATION_ERROR(-20041, 'The selected medication does not exist.');
        END IF;

        RAISE_APPLICATION_ERROR(-20042, 'Prescription would make medication stock negative.');
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_set_invoice_date
BEFORE INSERT ON invoices
FOR EACH ROW
BEGIN
    IF :NEW.invoice_date IS NULL THEN
        :NEW.invoice_date := SYSDATE;
    END IF;
END;
/

-- Check trigger compilation errors. No rows means compilation succeeded.
SELECT type, name, line, position, text
FROM user_errors
WHERE type = 'TRIGGER'
  AND name IN (
      'TRG_APPOINTMENT_AUDIT',
      'TRG_REDUCE_MEDICATION_STOCK',
      'TRG_SET_INVOICE_DATE'
  )
ORDER BY name, sequence;

SET SERVEROUTPUT ON

-- Passing audit-trigger test: an appointment update must create an audit record.
DECLARE
    v_appointment_id NUMBER;
    v_audit_count NUMBER;
BEGIN
    SAVEPOINT audit_trigger_pass;

    SELECT MIN(appointment_id)
    INTO v_appointment_id
    FROM appointments;

    UPDATE appointments
    SET reason = reason || ' - audit test'
    WHERE appointment_id = v_appointment_id;

    SELECT COUNT(*)
    INTO v_audit_count
    FROM appointment_audit
    WHERE appointment_id = v_appointment_id
      AND action_type = 'UPDATE';

    IF v_audit_count > 0 THEN
        DBMS_OUTPUT.PUT_LINE('PASS: appointment audit trigger recorded an update.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: appointment audit trigger did not record an update.');
    END IF;

    ROLLBACK TO audit_trigger_pass;
END;
/

-- Failing audit-trigger test: an invalid status must be rejected and not audited.
DECLARE
    v_appointment_id NUMBER;
    v_before_count NUMBER;
    v_after_count NUMBER;
BEGIN
    SAVEPOINT audit_trigger_fail;

    SELECT MIN(appointment_id)
    INTO v_appointment_id
    FROM appointments;

    SELECT COUNT(*)
    INTO v_before_count
    FROM appointment_audit
    WHERE appointment_id = v_appointment_id;

    BEGIN
        UPDATE appointments
        SET appointment_status = 'INVALID'
        WHERE appointment_id = v_appointment_id;

        DBMS_OUTPUT.PUT_LINE('FAIL: invalid appointment status was accepted.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -2290 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: invalid appointment status was rejected.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected audit test error ' || SQLCODE || '.');
            END IF;
    END;

    SELECT COUNT(*)
    INTO v_after_count
    FROM appointment_audit
    WHERE appointment_id = v_appointment_id;

    IF v_after_count = v_before_count THEN
        DBMS_OUTPUT.PUT_LINE('PASS: rejected change did not create an audit record.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: rejected change created an audit record.');
    END IF;

    ROLLBACK TO audit_trigger_fail;
END;
/

-- Passing prescription-trigger test: stock must fall by the prescribed quantity.
DECLARE
    v_appointment_id NUMBER;
    v_medication_id NUMBER;
    v_stock_before NUMBER(10,2);
    v_stock_after NUMBER(10,2);
    v_unit_price NUMBER(10,2);
BEGIN
    SAVEPOINT prescription_trigger_pass;

    SELECT MIN(appointment_id)
    INTO v_appointment_id
    FROM appointments
    WHERE appointment_status = 'COMPLETED';

    SELECT medication_id, stock_quantity, unit_price
    INTO v_medication_id, v_stock_before, v_unit_price
    FROM medications
    WHERE medication_name = 'AmoxiPet';

    INSERT INTO prescriptions (
        appointment_id, medication_id, dosage, frequency, duration_days, quantity, unit_price
    )
    VALUES (v_appointment_id, v_medication_id, '1 unit', 'Once daily', 1, 1, v_unit_price);

    SELECT stock_quantity
    INTO v_stock_after
    FROM medications
    WHERE medication_id = v_medication_id;

    IF v_stock_after = v_stock_before - 1 THEN
        DBMS_OUTPUT.PUT_LINE('PASS: prescription trigger reduced medication stock.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: prescription trigger did not reduce stock correctly.');
    END IF;

    ROLLBACK TO prescription_trigger_pass;
END;
/

-- Failing prescription-trigger test: a quantity above stock must be rejected.
DECLARE
    v_appointment_id NUMBER;
    v_medication_id NUMBER;
    v_stock NUMBER(10,2);
    v_unit_price NUMBER(10,2);
BEGIN
    SAVEPOINT prescription_trigger_fail;

    SELECT MIN(appointment_id)
    INTO v_appointment_id
    FROM appointments
    WHERE appointment_status = 'COMPLETED';

    SELECT medication_id, stock_quantity, unit_price
    INTO v_medication_id, v_stock, v_unit_price
    FROM medications
    WHERE medication_name = 'AmoxiPet';

    BEGIN
        INSERT INTO prescriptions (
            appointment_id, medication_id, dosage, frequency, duration_days, quantity, unit_price
        )
        VALUES (
            v_appointment_id, v_medication_id, '1 unit', 'Once daily', 1,
            v_stock + 1, v_unit_price
        );

        DBMS_OUTPUT.PUT_LINE('FAIL: negative medication stock was allowed.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20042 THEN
                DBMS_OUTPUT.PUT_LINE('PASS: negative medication stock was blocked.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected prescription test error ' || SQLCODE || '.');
            END IF;
    END;

    ROLLBACK TO prescription_trigger_fail;
END;
/

-- Passing invoice-date test: a NULL invoice date must be replaced with SYSDATE.
DECLARE
    v_appointment_id NUMBER;
    v_invoice_id NUMBER;
    v_invoice_date DATE;
BEGIN
    SAVEPOINT invoice_date_trigger_pass;

    SELECT MIN(a.appointment_id)
    INTO v_appointment_id
    FROM appointments a
    LEFT JOIN invoices i ON i.appointment_id = a.appointment_id
    WHERE a.appointment_status = 'SCHEDULED'
      AND i.invoice_id IS NULL;

    INSERT INTO invoices (appointment_id, invoice_date, invoice_status, notes)
    VALUES (v_appointment_id, NULL, 'UNPAID', 'Invoice date trigger test')
    RETURNING invoice_id INTO v_invoice_id;

    SELECT invoice_date
    INTO v_invoice_date
    FROM invoices
    WHERE invoice_id = v_invoice_id;

    IF v_invoice_date IS NOT NULL THEN
        DBMS_OUTPUT.PUT_LINE('PASS: invoice-date trigger supplied a date.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('FAIL: invoice-date trigger left the date NULL.');
    END IF;

    ROLLBACK TO invoice_date_trigger_pass;
END;
/

-- Failing invoice-date test: an invoice for a missing appointment must be rejected.
DECLARE
    v_error_seen BOOLEAN := FALSE;
BEGIN
    SAVEPOINT invoice_date_trigger_fail;

    BEGIN
        INSERT INTO invoices (appointment_id, invoice_date, invoice_status, notes)
        VALUES (-999, NULL, 'UNPAID', 'Invalid invoice test');

        DBMS_OUTPUT.PUT_LINE('FAIL: invoice with a missing appointment was accepted.');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -2291 THEN
                v_error_seen := TRUE;
                DBMS_OUTPUT.PUT_LINE('PASS: invoice with a missing appointment was rejected.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('FAIL: unexpected invoice test error ' || SQLCODE || '.');
            END IF;
    END;

    IF NOT v_error_seen THEN
        DBMS_OUTPUT.PUT_LINE('FAIL: invoice-date failure test did not get the expected error.');
    END IF;

    ROLLBACK TO invoice_date_trigger_fail;
END;
/

PROMPT Triggers created and trigger tests completed.
