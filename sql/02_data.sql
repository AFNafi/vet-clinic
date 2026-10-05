-- Insert fictional sample data. Identity columns are intentionally omitted.

SET DEFINE OFF

-- Parent tables.
INSERT ALL
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner01', 'Sample01', '555-0101', 'owner01@example.test', '1 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner02', 'Sample02', '555-0102', 'owner02@example.test', '2 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner03', 'Sample03', '555-0103', 'owner03@example.test', '3 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner04', 'Sample04', '555-0104', 'owner04@example.test', '4 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner05', 'Sample05', '555-0105', 'owner05@example.test', '5 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner06', 'Sample06', '555-0106', 'owner06@example.test', '6 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner07', 'Sample07', '555-0107', 'owner07@example.test', '7 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner08', 'Sample08', '555-0108', 'owner08@example.test', '8 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner09', 'Sample09', '555-0109', 'owner09@example.test', '9 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner10', 'Sample10', '555-0110', 'owner10@example.test', '10 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner11', 'Sample11', '555-0111', 'owner11@example.test', '11 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner12', 'Sample12', '555-0112', 'owner12@example.test', '12 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner13', 'Sample13', '555-0113', 'owner13@example.test', '13 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner14', 'Sample14', '555-0114', 'owner14@example.test', '14 Sample Lane')
    INTO owners (first_name, last_name, phone, email, address_line)
        VALUES ('Owner15', 'Sample15', '555-0115', 'owner15@example.test', '15 Sample Lane')
SELECT 1 FROM dual;

INSERT ALL
    INTO species (species_name) VALUES ('Dog')
    INTO species (species_name) VALUES ('Cat')
    INTO species (species_name) VALUES ('Rabbit')
    INTO species (species_name) VALUES ('Bird')
SELECT 1 FROM dual;

INSERT INTO breeds (species_id, breed_name)
SELECT species_id, 'Golden Retriever' FROM species WHERE species_name = 'Dog';
INSERT INTO breeds (species_id, breed_name)
SELECT species_id, 'Beagle' FROM species WHERE species_name = 'Dog';
INSERT INTO breeds (species_id, breed_name)
SELECT species_id, 'Persian' FROM species WHERE species_name = 'Cat';
INSERT INTO breeds (species_id, breed_name)
SELECT species_id, 'Siamese' FROM species WHERE species_name = 'Cat';
INSERT INTO breeds (species_id, breed_name)
SELECT species_id, 'Holland Lop' FROM species WHERE species_name = 'Rabbit';
INSERT INTO breeds (species_id, breed_name)
SELECT species_id, 'Netherland Dwarf' FROM species WHERE species_name = 'Rabbit';
INSERT INTO breeds (species_id, breed_name)
SELECT species_id, 'Budgerigar' FROM species WHERE species_name = 'Bird';
INSERT INTO breeds (species_id, breed_name)
SELECT species_id, 'Cockatiel' FROM species WHERE species_name = 'Bird';

INSERT ALL
    INTO veterinarians (first_name, last_name, license_number, phone, email)
        VALUES ('Vet01', 'Clinic01', 'VET-001', '555-0201', 'vet01@example.test')
    INTO veterinarians (first_name, last_name, license_number, phone, email)
        VALUES ('Vet02', 'Clinic02', 'VET-002', '555-0202', 'vet02@example.test')
    INTO veterinarians (first_name, last_name, license_number, phone, email)
        VALUES ('Vet03', 'Clinic03', 'VET-003', '555-0203', 'vet03@example.test')
    INTO veterinarians (first_name, last_name, license_number, phone, email)
        VALUES ('Vet04', 'Clinic04', 'VET-004', '555-0204', 'vet04@example.test')
    INTO veterinarians (first_name, last_name, license_number, phone, email)
        VALUES ('Vet05', 'Clinic05', 'VET-005', '555-0205', 'vet05@example.test')
    INTO veterinarians (first_name, last_name, license_number, phone, email)
        VALUES ('Vet06', 'Clinic06', 'VET-006', '555-0206', 'vet06@example.test')
SELECT 1 FROM dual;

INSERT ALL
    INTO services (service_name, standard_price) VALUES ('Consultation', 35)
    INTO services (service_name, standard_price) VALUES ('Wellness Exam', 50)
    INTO services (service_name, standard_price) VALUES ('Vaccination Service', 25)
    INTO services (service_name, standard_price) VALUES ('Dental Cleaning', 120)
    INTO services (service_name, standard_price) VALUES ('X-Ray', 95)
    INTO services (service_name, standard_price) VALUES ('Lab Test', 45)
    INTO services (service_name, standard_price) VALUES ('Wound Care', 40)
    INTO services (service_name, standard_price) VALUES ('Nail Trim', 20)
SELECT 1 FROM dual;

INSERT ALL
    INTO medications (medication_name, stock_quantity, unit_price) VALUES ('AmoxiPet', 200, 2.50)
    INTO medications (medication_name, stock_quantity, unit_price) VALUES ('PainRelief Vet', 150, 1.75)
    INTO medications (medication_name, stock_quantity, unit_price) VALUES ('EarCare Drops', 80, 8.50)
    INTO medications (medication_name, stock_quantity, unit_price) VALUES ('SkinHeal Cream', 90, 6.25)
    INTO medications (medication_name, stock_quantity, unit_price) VALUES ('Digestive Aid', 120, 3.00)
    INTO medications (medication_name, stock_quantity, unit_price) VALUES ('EyeClear Drops', 75, 7.00)
    INTO medications (medication_name, stock_quantity, unit_price) VALUES ('Joint Support', 100, 4.50)
    INTO medications (medication_name, stock_quantity, unit_price) VALUES ('Parasite Guard', 180, 5.00)
SELECT 1 FROM dual;

-- Child records: 25 pets, linked to the owners and breeds above.
DECLARE
    v_owner_id NUMBER;
    v_breed_id NUMBER;
    v_breed_name VARCHAR2(100);
BEGIN
    FOR i IN 1 .. 25 LOOP
        v_breed_name := CASE MOD(i - 1, 8)
            WHEN 0 THEN 'Golden Retriever'
            WHEN 1 THEN 'Beagle'
            WHEN 2 THEN 'Persian'
            WHEN 3 THEN 'Siamese'
            WHEN 4 THEN 'Holland Lop'
            WHEN 5 THEN 'Netherland Dwarf'
            WHEN 6 THEN 'Budgerigar'
            ELSE 'Cockatiel'
        END;

        SELECT owner_id
        INTO v_owner_id
        FROM owners
        WHERE email = 'owner' || LPAD(TO_CHAR(MOD(i - 1, 15) + 1), 2, '0') || '@example.test';

        SELECT breed_id
        INTO v_breed_id
        FROM breeds
        WHERE breed_name = v_breed_name;

        INSERT INTO pets (owner_id, breed_id, pet_name, birth_date, sex, microchip_number)
        VALUES (
            v_owner_id,
            v_breed_id,
            'Pet-' || LPAD(TO_CHAR(i), 2, '0'),
            TRUNC(SYSDATE) - (365 + (i * 100)),
            CASE WHEN MOD(i, 2) = 0 THEN 'F' ELSE 'M' END,
            'MC-' || LPAD(TO_CHAR(i), 3, '0')
        );
    END LOOP;
END;
/

-- One vaccination record per pet. Several are due within the next 30 days.
DECLARE
    v_pet_id NUMBER;
BEGIN
    FOR i IN 1 .. 25 LOOP
        SELECT pet_id
        INTO v_pet_id
        FROM pets
        WHERE microchip_number = 'MC-' || LPAD(TO_CHAR(i), 3, '0');

        INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, due_date, notes)
        VALUES (
            v_pet_id,
            CASE WHEN MOD(i, 2) = 0 THEN 'Core Vaccine B' ELSE 'Core Vaccine A' END,
            TRUNC(SYSDATE) - 335,
            CASE
                WHEN i IN (1, 5, 9, 13, 17) THEN TRUNC(SYSDATE) + (i + 5)
                ELSE TRUNC(SYSDATE) + 180
            END,
            'Fictional vaccination record'
        );
    END LOOP;
END;
/

-- Create 60 appointments across six months. The same pets repeat in the cycle.
DECLARE
    v_pet_id NUMBER;
    v_veterinarian_id NUMBER;
BEGIN
    FOR i IN 1 .. 60 LOOP
        SELECT pet_id
        INTO v_pet_id
        FROM pets
        WHERE microchip_number = 'MC-' || LPAD(TO_CHAR(MOD(i - 1, 25) + 1), 3, '0');

        SELECT veterinarian_id
        INTO v_veterinarian_id
        FROM veterinarians
        WHERE license_number = 'VET-' || LPAD(TO_CHAR(MOD(i - 1, 6) + 1), 3, '0');

        INSERT INTO appointments (
            pet_id, veterinarian_id, appointment_date, appointment_status, reason, clinical_notes
        )
        VALUES (
            v_pet_id,
            v_veterinarian_id,
            CASE
                WHEN i <= 55 THEN TRUNC(SYSDATE) - (181 - ((i - 1) * 3))
                ELSE TRUNC(SYSDATE) + (i - 55)
            END,
            CASE WHEN i <= 55 THEN 'COMPLETED' ELSE 'SCHEDULED' END,
            CASE MOD(i - 1, 6)
                WHEN 0 THEN 'Routine wellness visit'
                WHEN 1 THEN 'Vaccination follow-up'
                WHEN 2 THEN 'Skin concern'
                WHEN 3 THEN 'Dental check'
                WHEN 4 THEN 'Digestive concern'
                ELSE 'Mobility review'
            END,
            'Fictional clinical note for demonstration'
        );
    END LOOP;
END;
/

-- Add service lines, prescriptions, invoices, and payments for completed visits.
DECLARE
    v_appointment_id NUMBER;
    v_service_id NUMBER;
    v_service_price NUMBER(10,2);
    v_medication_id NUMBER;
    v_medication_price NUMBER(10,2);
    v_invoice_id NUMBER;
    v_total NUMBER(10,2);
    v_quantity NUMBER(10,2);
    v_service_name VARCHAR2(100);
    v_medication_name VARCHAR2(150);
BEGIN
    FOR i IN 1 .. 55 LOOP
        SELECT a.appointment_id
        INTO v_appointment_id
        FROM appointments a
        JOIN pets p ON p.pet_id = a.pet_id
        WHERE p.microchip_number = 'MC-' || LPAD(TO_CHAR(MOD(i - 1, 25) + 1), 3, '0')
          AND a.appointment_date = TRUNC(SYSDATE) - (181 - ((i - 1) * 3));

        v_service_name := CASE MOD(i - 1, 8)
            WHEN 0 THEN 'Consultation'
            WHEN 1 THEN 'Wellness Exam'
            WHEN 2 THEN 'Vaccination Service'
            WHEN 3 THEN 'Dental Cleaning'
            WHEN 4 THEN 'X-Ray'
            WHEN 5 THEN 'Lab Test'
            WHEN 6 THEN 'Wound Care'
            ELSE 'Nail Trim'
        END;

        SELECT service_id, standard_price
        INTO v_service_id, v_service_price
        FROM services
        WHERE service_name = v_service_name;

        INSERT INTO appointment_services (appointment_id, service_id, quantity, unit_price, notes)
        VALUES (v_appointment_id, v_service_id, 1, v_service_price, 'Fictional service line');

        v_total := v_service_price;

        IF MOD(i, 3) = 0 THEN
            v_medication_name := CASE MOD(i - 1, 8)
                WHEN 0 THEN 'AmoxiPet'
                WHEN 1 THEN 'PainRelief Vet'
                WHEN 2 THEN 'EarCare Drops'
                WHEN 3 THEN 'SkinHeal Cream'
                WHEN 4 THEN 'Digestive Aid'
                WHEN 5 THEN 'EyeClear Drops'
                WHEN 6 THEN 'Joint Support'
                ELSE 'Parasite Guard'
            END;

            SELECT medication_id, unit_price
            INTO v_medication_id, v_medication_price
            FROM medications
            WHERE medication_name = v_medication_name;

            v_quantity := MOD(i, 4) + 1;

            INSERT INTO prescriptions (
                appointment_id, medication_id, dosage, frequency, duration_days, quantity, unit_price
            )
            VALUES (
                v_appointment_id, v_medication_id, '1 unit', 'Twice daily', 7,
                v_quantity, v_medication_price
            );

            v_total := v_total + (v_medication_price * v_quantity);
        END IF;

        INSERT INTO invoices (appointment_id, invoice_date, invoice_status, notes)
        VALUES (
            v_appointment_id,
            TRUNC(SYSDATE) - (181 - ((i - 1) * 3)),
            CASE
                WHEN i IN (7, 21, 35, 49, 55) THEN 'UNPAID'
                WHEN i IN (8, 22, 36) THEN 'PARTIAL'
                ELSE 'PAID'
            END,
            'Fictional invoice'
        )
        RETURNING invoice_id INTO v_invoice_id;

        IF i NOT IN (7, 21, 35, 49, 55) THEN
            INSERT INTO payments (invoice_id, payment_date, amount, payment_method, reference_number)
            VALUES (
                v_invoice_id,
                TRUNC(SYSDATE) - (180 - ((i - 1) * 3)),
                CASE WHEN i IN (8, 22, 36) THEN v_total / 2 ELSE v_total END,
                CASE WHEN MOD(i, 2) = 0 THEN 'CARD' ELSE 'CASH' END,
                'PAY-' || LPAD(TO_CHAR(i), 3, '0')
            );
        END IF;
    END LOOP;
END;
/

COMMIT;

PROMPT Fictional sample data inserted and committed.
