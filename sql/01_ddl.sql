-- Create the Veterinary Clinic schema for Oracle Database Free.

SET DEFINE OFF

CREATE TABLE owners (
    owner_id     NUMBER GENERATED ALWAYS AS IDENTITY,
    first_name   VARCHAR2(50)  NOT NULL,
    last_name    VARCHAR2(50)  NOT NULL,
    phone        VARCHAR2(30)  NOT NULL,
    email        VARCHAR2(100) NOT NULL,
    address_line VARCHAR2(200) NOT NULL,
    created_at   DATE DEFAULT SYSDATE NOT NULL,
    CONSTRAINT pk_owners PRIMARY KEY (owner_id),
    CONSTRAINT uq_owners_email UNIQUE (email)
);

CREATE TABLE species (
    species_id   NUMBER GENERATED ALWAYS AS IDENTITY,
    species_name VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_species PRIMARY KEY (species_id),
    CONSTRAINT uq_species_name UNIQUE (species_name)
);

CREATE TABLE breeds (
    breed_id     NUMBER GENERATED ALWAYS AS IDENTITY,
    species_id   NUMBER NOT NULL,
    breed_name   VARCHAR2(100) NOT NULL,
    CONSTRAINT pk_breeds PRIMARY KEY (breed_id),
    CONSTRAINT uq_breeds_species_name UNIQUE (species_id, breed_name),
    CONSTRAINT fk_breeds_species FOREIGN KEY (species_id)
        REFERENCES species (species_id)
);

CREATE TABLE veterinarians (
    veterinarian_id NUMBER GENERATED ALWAYS AS IDENTITY,
    first_name      VARCHAR2(50)  NOT NULL,
    last_name       VARCHAR2(50)  NOT NULL,
    license_number  VARCHAR2(50)  NOT NULL,
    phone           VARCHAR2(30)  NOT NULL,
    email           VARCHAR2(100) NOT NULL,
    is_active       VARCHAR2(1) DEFAULT 'Y' NOT NULL,
    CONSTRAINT pk_veterinarians PRIMARY KEY (veterinarian_id),
    CONSTRAINT uq_vets_license UNIQUE (license_number),
    CONSTRAINT uq_vets_email UNIQUE (email),
    CONSTRAINT ck_vets_active CHECK (is_active IN ('Y', 'N'))
);

CREATE TABLE services (
    service_id     NUMBER GENERATED ALWAYS AS IDENTITY,
    service_name   VARCHAR2(100) NOT NULL,
    standard_price NUMBER(10,2) NOT NULL,
    is_active      VARCHAR2(1) DEFAULT 'Y' NOT NULL,
    CONSTRAINT pk_services PRIMARY KEY (service_id),
    CONSTRAINT uq_services_name UNIQUE (service_name),
    CONSTRAINT ck_services_price CHECK (standard_price >= 0),
    CONSTRAINT ck_services_active CHECK (is_active IN ('Y', 'N'))
);

CREATE TABLE medications (
    medication_id   NUMBER GENERATED ALWAYS AS IDENTITY,
    medication_name VARCHAR2(150) NOT NULL,
    stock_quantity  NUMBER(10,2) DEFAULT 0 NOT NULL,
    unit_price      NUMBER(10,2) NOT NULL,
    is_active       VARCHAR2(1) DEFAULT 'Y' NOT NULL,
    CONSTRAINT pk_medications PRIMARY KEY (medication_id),
    CONSTRAINT uq_medications_name UNIQUE (medication_name),
    CONSTRAINT ck_medications_stock CHECK (stock_quantity >= 0),
    CONSTRAINT ck_medications_price CHECK (unit_price >= 0),
    CONSTRAINT ck_medications_active CHECK (is_active IN ('Y', 'N'))
);

CREATE TABLE pets (
    pet_id           NUMBER GENERATED ALWAYS AS IDENTITY,
    owner_id         NUMBER NOT NULL,
    breed_id         NUMBER NOT NULL,
    pet_name         VARCHAR2(80) NOT NULL,
    birth_date       DATE,
    sex              VARCHAR2(1) NOT NULL,
    microchip_number VARCHAR2(50),
    is_active        VARCHAR2(1) DEFAULT 'Y' NOT NULL,
    CONSTRAINT pk_pets PRIMARY KEY (pet_id),
    CONSTRAINT uq_pets_microchip UNIQUE (microchip_number),
    CONSTRAINT fk_pets_owner FOREIGN KEY (owner_id)
        REFERENCES owners (owner_id),
    CONSTRAINT fk_pets_breed FOREIGN KEY (breed_id)
        REFERENCES breeds (breed_id),
    CONSTRAINT ck_pets_sex CHECK (sex IN ('M', 'F', 'U')),
    CONSTRAINT ck_pets_active CHECK (is_active IN ('Y', 'N'))
);

CREATE TABLE appointments (
    appointment_id     NUMBER GENERATED ALWAYS AS IDENTITY,
    pet_id             NUMBER NOT NULL,
    veterinarian_id    NUMBER NOT NULL,
    appointment_date   DATE NOT NULL,
    appointment_status VARCHAR2(20) DEFAULT 'SCHEDULED' NOT NULL,
    reason             VARCHAR2(500) NOT NULL,
    clinical_notes     VARCHAR2(2000),
    created_at         DATE DEFAULT SYSDATE NOT NULL,
    CONSTRAINT pk_appointments PRIMARY KEY (appointment_id),
    CONSTRAINT fk_appts_pet FOREIGN KEY (pet_id)
        REFERENCES pets (pet_id),
    CONSTRAINT fk_appts_vet FOREIGN KEY (veterinarian_id)
        REFERENCES veterinarians (veterinarian_id),
    CONSTRAINT ck_appts_status CHECK (
        appointment_status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')
    )
);

CREATE TABLE appointment_services (
    appointment_service_id NUMBER GENERATED ALWAYS AS IDENTITY,
    appointment_id         NUMBER NOT NULL,
    service_id             NUMBER NOT NULL,
    quantity               NUMBER(8,2) DEFAULT 1 NOT NULL,
    unit_price             NUMBER(10,2) NOT NULL,
    notes                  VARCHAR2(500),
    CONSTRAINT pk_appt_services PRIMARY KEY (appointment_service_id),
    CONSTRAINT uq_appt_service UNIQUE (appointment_id, service_id),
    CONSTRAINT fk_appt_svc_appt FOREIGN KEY (appointment_id)
        REFERENCES appointments (appointment_id),
    CONSTRAINT fk_appt_svc_service FOREIGN KEY (service_id)
        REFERENCES services (service_id),
    CONSTRAINT ck_appt_svc_qty CHECK (quantity > 0),
    CONSTRAINT ck_appt_svc_price CHECK (unit_price >= 0)
);

CREATE TABLE prescriptions (
    prescription_id NUMBER GENERATED ALWAYS AS IDENTITY,
    appointment_id  NUMBER NOT NULL,
    medication_id   NUMBER NOT NULL,
    dosage          VARCHAR2(100) NOT NULL,
    frequency       VARCHAR2(100) NOT NULL,
    duration_days   NUMBER(4) NOT NULL,
    quantity        NUMBER(10,2) NOT NULL,
    unit_price      NUMBER(10,2) NOT NULL,
    CONSTRAINT pk_prescriptions PRIMARY KEY (prescription_id),
    CONSTRAINT fk_rx_appt FOREIGN KEY (appointment_id)
        REFERENCES appointments (appointment_id),
    CONSTRAINT fk_rx_medication FOREIGN KEY (medication_id)
        REFERENCES medications (medication_id),
    CONSTRAINT ck_rx_duration CHECK (duration_days > 0),
    CONSTRAINT ck_rx_quantity CHECK (quantity > 0),
    CONSTRAINT ck_rx_price CHECK (unit_price >= 0)
);

CREATE TABLE vaccinations (
    vaccination_id   NUMBER GENERATED ALWAYS AS IDENTITY,
    pet_id           NUMBER NOT NULL,
    vaccine_name     VARCHAR2(150) NOT NULL,
    vaccination_date DATE NOT NULL,
    due_date         DATE NOT NULL,
    notes            VARCHAR2(500),
    CONSTRAINT pk_vaccinations PRIMARY KEY (vaccination_id),
    CONSTRAINT fk_vaccinations_pet FOREIGN KEY (pet_id)
        REFERENCES pets (pet_id),
    CONSTRAINT ck_vaccination_dates CHECK (due_date >= vaccination_date)
);

CREATE TABLE invoices (
    invoice_id     NUMBER GENERATED ALWAYS AS IDENTITY,
    appointment_id NUMBER NOT NULL,
    invoice_date   DATE DEFAULT SYSDATE NOT NULL,
    invoice_status VARCHAR2(20) DEFAULT 'UNPAID' NOT NULL,
    notes          VARCHAR2(500),
    CONSTRAINT pk_invoices PRIMARY KEY (invoice_id),
    CONSTRAINT uq_invoices_appt UNIQUE (appointment_id),
    CONSTRAINT fk_invoices_appt FOREIGN KEY (appointment_id)
        REFERENCES appointments (appointment_id),
    CONSTRAINT ck_invoices_status CHECK (
        invoice_status IN ('UNPAID', 'PARTIAL', 'PAID', 'VOID')
    )
);

CREATE TABLE payments (
    payment_id       NUMBER GENERATED ALWAYS AS IDENTITY,
    invoice_id       NUMBER NOT NULL,
    payment_date     DATE DEFAULT SYSDATE NOT NULL,
    amount           NUMBER(10,2) NOT NULL,
    payment_method   VARCHAR2(20) NOT NULL,
    reference_number VARCHAR2(100),
    CONSTRAINT pk_payments PRIMARY KEY (payment_id),
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices (invoice_id),
    CONSTRAINT ck_payments_amount CHECK (amount > 0),
    CONSTRAINT ck_payments_method CHECK (
        payment_method IN ('CASH', 'CARD', 'TRANSFER')
    )
);

CREATE TABLE appointment_audit (
    audit_id       NUMBER GENERATED ALWAYS AS IDENTITY,
    appointment_id NUMBER NOT NULL,
    action_type    VARCHAR2(10) NOT NULL,
    old_status     VARCHAR2(20),
    new_status     VARCHAR2(20),
    changed_at     DATE DEFAULT SYSDATE NOT NULL,
    changed_by     VARCHAR2(128) DEFAULT USER NOT NULL,
    CONSTRAINT pk_appointment_audit PRIMARY KEY (audit_id),
    CONSTRAINT fk_audit_appt FOREIGN KEY (appointment_id)
        REFERENCES appointments (appointment_id),
    CONSTRAINT ck_audit_action CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Foreign-key indexes.
CREATE INDEX ix_breeds_species ON breeds (species_id);
CREATE INDEX ix_pets_owner ON pets (owner_id);
CREATE INDEX ix_pets_breed ON pets (breed_id);
CREATE INDEX ix_appts_pet ON appointments (pet_id);
CREATE INDEX ix_appts_vet ON appointments (veterinarian_id);
CREATE INDEX ix_appt_svc_appt ON appointment_services (appointment_id);
CREATE INDEX ix_appt_svc_service ON appointment_services (service_id);
CREATE INDEX ix_rx_appt ON prescriptions (appointment_id);
CREATE INDEX ix_rx_medication ON prescriptions (medication_id);
CREATE INDEX ix_vaccinations_pet ON vaccinations (pet_id);
CREATE INDEX ix_payments_invoice ON payments (invoice_id);
CREATE INDEX ix_audit_appt ON appointment_audit (appointment_id);

-- Common search indexes.
CREATE INDEX ix_owners_last_name ON owners (last_name);
CREATE INDEX ix_appts_date ON appointments (appointment_date);
CREATE INDEX ix_vaccinations_due_date ON vaccinations (due_date);

PROMPT Veterinary Clinic tables, constraints, and indexes created.
