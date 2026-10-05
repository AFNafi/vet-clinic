# Veterinary Clinic Database Design

## Overview

This design uses 14 tables. It meets the required clinic scope and keeps each type of information in one clear place. All primary keys will use `NUMBER GENERATED ALWAYS AS IDENTITY`. Names, telephone numbers, email addresses, and addresses in sample data will be fake.

## Tables

### OWNERS

Stores one record for each pet owner.

| Column | Oracle type | Rules |
|---|---|---|
| owner_id | NUMBER | Identity primary key |
| first_name | VARCHAR2(50) | NOT NULL |
| last_name | VARCHAR2(50) | NOT NULL |
| phone | VARCHAR2(30) | NOT NULL |
| email | VARCHAR2(100) | NOT NULL, UNIQUE |
| address_line | VARCHAR2(200) | NOT NULL |
| created_at | DATE | NOT NULL, DEFAULT `SYSDATE` |

### SPECIES

Stores each animal species once, for example Dog, Cat, or Rabbit.

| Column | Oracle type | Rules |
|---|---|---|
| species_id | NUMBER | Identity primary key |
| species_name | VARCHAR2(50) | NOT NULL, UNIQUE |

### BREEDS

Stores breeds and links every breed to one species.

| Column | Oracle type | Rules |
|---|---|---|
| breed_id | NUMBER | Identity primary key |
| species_id | NUMBER | NOT NULL, foreign key to `SPECIES` |
| breed_name | VARCHAR2(100) | NOT NULL; unique together with `species_id` |

### PETS

Stores pet details. Every pet belongs to one owner and has one breed.

| Column | Oracle type | Rules |
|---|---|---|
| pet_id | NUMBER | Identity primary key |
| owner_id | NUMBER | NOT NULL, foreign key to `OWNERS` |
| breed_id | NUMBER | NOT NULL, foreign key to `BREEDS` |
| pet_name | VARCHAR2(80) | NOT NULL |
| birth_date | DATE | Optional |
| sex | VARCHAR2(1) | NOT NULL, CHECK (`sex` IN ('M', 'F', 'U')) |
| microchip_number | VARCHAR2(50) | UNIQUE; optional |
| is_active | VARCHAR2(1) | NOT NULL, DEFAULT 'Y', CHECK (`is_active` IN ('Y', 'N')) |

### VETERINARIANS

Stores veterinarians who can perform appointments.

| Column | Oracle type | Rules |
|---|---|---|
| veterinarian_id | NUMBER | Identity primary key |
| first_name | VARCHAR2(50) | NOT NULL |
| last_name | VARCHAR2(50) | NOT NULL |
| license_number | VARCHAR2(50) | NOT NULL, UNIQUE |
| phone | VARCHAR2(30) | NOT NULL |
| email | VARCHAR2(100) | NOT NULL, UNIQUE |
| is_active | VARCHAR2(1) | NOT NULL, DEFAULT 'Y', CHECK (`is_active` IN ('Y', 'N')) |

### APPOINTMENTS

Stores a visit between one pet and one veterinarian.

| Column | Oracle type | Rules |
|---|---|---|
| appointment_id | NUMBER | Identity primary key |
| pet_id | NUMBER | NOT NULL, foreign key to `PETS` |
| veterinarian_id | NUMBER | NOT NULL, foreign key to `VETERINARIANS` |
| appointment_date | DATE | NOT NULL |
| appointment_status | VARCHAR2(20) | NOT NULL, DEFAULT 'SCHEDULED', CHECK (`appointment_status` IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')) |
| reason | VARCHAR2(500) | NOT NULL |
| clinical_notes | VARCHAR2(2000) | Optional |
| created_at | DATE | NOT NULL, DEFAULT `SYSDATE` |

### SERVICES

Stores the clinic's service catalogue and normal prices.

| Column | Oracle type | Rules |
|---|---|---|
| service_id | NUMBER | Identity primary key |
| service_name | VARCHAR2(100) | NOT NULL, UNIQUE |
| standard_price | NUMBER(10,2) | NOT NULL, CHECK (`standard_price` >= 0) |
| is_active | VARCHAR2(1) | NOT NULL, DEFAULT 'Y', CHECK (`is_active` IN ('Y', 'N')) |

### APPOINTMENT_SERVICES

Records services performed during an appointment. This is the required many-to-many bridge: an appointment can have many services, and a service can appear in many appointments.

| Column | Oracle type | Rules |
|---|---|---|
| appointment_service_id | NUMBER | Identity primary key |
| appointment_id | NUMBER | NOT NULL, foreign key to `APPOINTMENTS` |
| service_id | NUMBER | NOT NULL, foreign key to `SERVICES` |
| quantity | NUMBER(8,2) | NOT NULL, DEFAULT 1, CHECK (`quantity` > 0) |
| unit_price | NUMBER(10,2) | NOT NULL, CHECK (`unit_price` >= 0); price charged at the time |
| notes | VARCHAR2(500) | Optional |

The pair `appointment_id` and `service_id` is unique so the same service is not accidentally entered twice for one appointment.

### MEDICATIONS

Stores medicine stock and current selling prices.

| Column | Oracle type | Rules |
|---|---|---|
| medication_id | NUMBER | Identity primary key |
| medication_name | VARCHAR2(150) | NOT NULL, UNIQUE |
| stock_quantity | NUMBER(10,2) | NOT NULL, DEFAULT 0, CHECK (`stock_quantity` >= 0) |
| unit_price | NUMBER(10,2) | NOT NULL, CHECK (`unit_price` >= 0) |
| is_active | VARCHAR2(1) | NOT NULL, DEFAULT 'Y', CHECK (`is_active` IN ('Y', 'N')) |

### PRESCRIPTIONS

Records medication prescribed during an appointment. It also forms a many-to-many relationship between appointments and medications.

| Column | Oracle type | Rules |
|---|---|---|
| prescription_id | NUMBER | Identity primary key |
| appointment_id | NUMBER | NOT NULL, foreign key to `APPOINTMENTS` |
| medication_id | NUMBER | NOT NULL, foreign key to `MEDICATIONS` |
| dosage | VARCHAR2(100) | NOT NULL |
| frequency | VARCHAR2(100) | NOT NULL |
| duration_days | NUMBER(4) | NOT NULL, CHECK (`duration_days` > 0) |
| quantity | NUMBER(10,2) | NOT NULL, CHECK (`quantity` > 0) |
| unit_price | NUMBER(10,2) | NOT NULL, CHECK (`unit_price` >= 0); price charged at the time |

### VACCINATIONS

Stores a pet's vaccination history and its next due date.

| Column | Oracle type | Rules |
|---|---|---|
| vaccination_id | NUMBER | Identity primary key |
| pet_id | NUMBER | NOT NULL, foreign key to `PETS` |
| vaccine_name | VARCHAR2(150) | NOT NULL |
| vaccination_date | DATE | NOT NULL |
| due_date | DATE | NOT NULL, CHECK (`due_date` >= `vaccination_date`) |
| notes | VARCHAR2(500) | Optional |

### INVOICES

Stores the invoice state for an appointment. Service and prescription line amounts are calculated from their linked records, rather than copied into this table.

| Column | Oracle type | Rules |
|---|---|---|
| invoice_id | NUMBER | Identity primary key |
| appointment_id | NUMBER | NOT NULL, UNIQUE, foreign key to `APPOINTMENTS` |
| invoice_date | DATE | NOT NULL, DEFAULT `SYSDATE` |
| invoice_status | VARCHAR2(20) | NOT NULL, DEFAULT 'UNPAID', CHECK (`invoice_status` IN ('UNPAID', 'PARTIAL', 'PAID', 'VOID')) |
| notes | VARCHAR2(500) | Optional |

### PAYMENTS

Stores each payment against an invoice. Separating payments allows an invoice to be paid in several parts.

| Column | Oracle type | Rules |
|---|---|---|
| payment_id | NUMBER | Identity primary key |
| invoice_id | NUMBER | NOT NULL, foreign key to `INVOICES` |
| payment_date | DATE | NOT NULL, DEFAULT `SYSDATE` |
| amount | NUMBER(10,2) | NOT NULL, CHECK (`amount` > 0) |
| payment_method | VARCHAR2(20) | NOT NULL, CHECK (`payment_method` IN ('CASH', 'CARD', 'TRANSFER')) |
| reference_number | VARCHAR2(100) | Optional |

### APPOINTMENT_AUDIT

Stores the history of appointment changes. It is filled by a trigger later in the project.

| Column | Oracle type | Rules |
|---|---|---|
| audit_id | NUMBER | Identity primary key |
| appointment_id | NUMBER | NOT NULL, foreign key to `APPOINTMENTS` |
| action_type | VARCHAR2(10) | NOT NULL, CHECK (`action_type` IN ('INSERT', 'UPDATE', 'DELETE')) |
| old_status | VARCHAR2(20) | Optional |
| new_status | VARCHAR2(20) | Optional |
| old_appointment_date | DATE | Optional; appointment date before the change |
| new_appointment_date | DATE | Optional; appointment date after the change |
| old_veterinarian_id | NUMBER | Optional; veterinarian before the change |
| new_veterinarian_id | NUMBER | Optional; veterinarian after the change |
| old_reason | VARCHAR2(500) | Optional; reason before the change |
| new_reason | VARCHAR2(500) | Optional; reason after the change |
| changed_at | DATE | NOT NULL, DEFAULT `SYSDATE` |
| changed_by | VARCHAR2(128) | NOT NULL, DEFAULT `USER` |

## Relationship and integrity rules

- One owner can have many pets; each pet has one owner.
- One species can have many breeds; each breed belongs to one species.
- One breed can have many pets; each pet has one breed.
- One pet and one veterinarian can each have many appointments.
- `APPOINTMENT_SERVICES` joins appointments and services.
- `PRESCRIPTIONS` joins appointments and medications.
- One pet can have many vaccination records.
- One appointment has at most one invoice; one invoice can have many payments.
- One appointment can have many audit entries.
- Parent records should not be deleted while child records still refer to them. This protects clinic history.

## Planned indexes

- Index every foreign-key column: `BREEDS.species_id`, `PETS.owner_id`, `PETS.breed_id`, `APPOINTMENTS.pet_id`, `APPOINTMENTS.veterinarian_id`, `APPOINTMENT_SERVICES.appointment_id`, `APPOINTMENT_SERVICES.service_id`, `PRESCRIPTIONS.appointment_id`, `PRESCRIPTIONS.medication_id`, `VACCINATIONS.pet_id`, `PAYMENTS.invoice_id`, and `APPOINTMENT_AUDIT.appointment_id`.
- Create an index on `OWNERS.last_name` for owner lookups.
- Create an index on `APPOINTMENTS.appointment_date` for daily schedules and date searches.
- Create an index on `VACCINATIONS.due_date` for vaccination reminders.

## Scope decisions

- The project requires 14 tables. This is more than the earlier 9–12-table target because the required `APPOINTMENT_SERVICES` and `APPOINTMENT_AUDIT` tables must be included.
- Invoice totals will be calculated from appointment services and prescriptions. This avoids storing a duplicate total that can become out of date.
- All sample personal details will be fictional. No passwords will be stored in documentation or scripts.
