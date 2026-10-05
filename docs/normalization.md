# Normalization to Third Normal Form (3NF)

## What 3NF means

This design follows three simple rules:

1. **First Normal Form (1NF):** each column holds one value, and each row can be identified by a primary key.
2. **Second Normal Form (2NF):** non-key columns describe the whole row, not only part of a key.
3. **Third Normal Form (3NF):** non-key columns do not describe other non-key columns. Facts are stored in the table they belong to.

Every table has an identity primary key. The bridge tables use a single identity key, so their detail columns depend on the complete row. Lookup data, owner details, pet details, appointment details, and financial details are kept separate to avoid repeated or conflicting facts.

## Table-by-table explanation

### OWNERS

- One row represents one owner, identified by `owner_id`.
- The name, phone, email, and address describe that owner only.
- Pet information is not repeated here; it belongs in `PETS`.
- This keeps `OWNERS` in 3NF.

### SPECIES

- One row represents one species, identified by `species_id`.
- `species_name` describes only that species.
- Species names are not repeatedly stored in breeds or pets.
- This table is in 3NF.

### BREEDS

- One row represents one breed, identified by `breed_id`.
- `species_id` says which species the breed belongs to.
- The species name is stored only in `SPECIES`, so it cannot become inconsistent.
- This table is in 3NF.

### PETS

- One row represents one pet, identified by `pet_id`.
- `owner_id` and `breed_id` are links, not copied owner or breed details.
- Pet name, birth date, sex, and microchip number describe the pet.
- This table is in 3NF.

### VETERINARIANS

- One row represents one veterinarian, identified by `veterinarian_id`.
- The name, licence number, contact details, and active flag describe that veterinarian.
- Appointment details are kept in `APPOINTMENTS`.
- This table is in 3NF.

### APPOINTMENTS

- One row represents one scheduled clinic visit, identified by `appointment_id`.
- The pet and veterinarian are stored as foreign keys rather than copied names.
- The date, status, reason, and notes describe that visit.
- Services, medications, payments, and audit history are stored in separate related tables.
- This table is in 3NF.

### SERVICES

- One row represents one service type, identified by `service_id`.
- The service name and normal price describe the service type.
- Actual service prices charged during a visit are stored in `APPOINTMENT_SERVICES`, because they may differ later.
- This table is in 3NF.

### APPOINTMENT_SERVICES

- One row represents one service performed for one appointment, identified by `appointment_service_id`.
- The appointment and service are foreign keys.
- Quantity, charged price, and notes describe that specific service occurrence.
- The unique appointment-service pair prevents an accidental duplicate line.
- This table is in 3NF and resolves the appointment-to-service many-to-many relationship.

### MEDICATIONS

- One row represents one medication, identified by `medication_id`.
- Medication name, stock quantity, current unit price, and active flag describe that medication.
- Prescription instructions belong in `PRESCRIPTIONS`, not here.
- This table is in 3NF.

### PRESCRIPTIONS

- One row represents one medication prescribed during one appointment, identified by `prescription_id`.
- The appointment and medication are foreign keys.
- Dosage, frequency, duration, quantity, and charged price describe this particular prescription.
- This table is in 3NF and resolves the appointment-to-medication many-to-many relationship.

### VACCINATIONS

- One row represents one vaccination event, identified by `vaccination_id`.
- The pet is linked with `pet_id`.
- Vaccine name, vaccination date, due date, and notes describe that one event.
- Owner and pet details are not copied into the vaccination record.
- This table is in 3NF.

### INVOICES

- One row represents the billing state for one appointment, identified by `invoice_id`.
- `appointment_id` is unique, so one appointment has at most one invoice.
- Invoice date, status, and notes describe that invoice.
- The total is calculated from related service and prescription lines instead of being duplicated in the invoice.
- This table is in 3NF.

### PAYMENTS

- One row represents one payment, identified by `payment_id`.
- `invoice_id` links the payment to its invoice.
- Payment date, amount, method, and reference describe that payment.
- Owner and appointment data are available through the invoice relationship and are not repeated.
- This table is in 3NF.

### APPOINTMENT_AUDIT

- One row represents one appointment change, identified by `audit_id`.
- `appointment_id` links it to the changed appointment.
- Action type, old status, new status, time, and actor describe that audit event.
- Current appointment details stay in `APPOINTMENTS`; historical changes stay here.
- This table is in 3NF.

## Deliberate price snapshots

`SERVICES.standard_price` and `MEDICATIONS.unit_price` hold current catalogue prices. `APPOINTMENT_SERVICES.unit_price` and `PRESCRIPTIONS.unit_price` hold the price actually charged at the time. This is deliberate: old invoices must not change when the catalogue price changes.
