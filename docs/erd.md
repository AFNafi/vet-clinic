# Veterinary Clinic ER Diagram

The diagram shows the 14 required tables and their relationships. `APPOINTMENT_SERVICES` is the required many-to-many bridge between appointments and services. `PRESCRIPTIONS` is also a many-to-many bridge between appointments and medications.

```mermaid
erDiagram
    OWNERS ||--o{ PETS : owns
    SPECIES ||--o{ BREEDS : has
    BREEDS ||--o{ PETS : classifies
    PETS ||--o{ APPOINTMENTS : attends
    VETERINARIANS ||--o{ APPOINTMENTS : conducts
    APPOINTMENTS ||--o{ APPOINTMENT_SERVICES : includes
    SERVICES ||--o{ APPOINTMENT_SERVICES : performed_as
    APPOINTMENTS ||--o{ PRESCRIPTIONS : creates
    MEDICATIONS ||--o{ PRESCRIPTIONS : prescribed
    PETS ||--o{ VACCINATIONS : receives
    APPOINTMENTS ||--o| INVOICES : billed_by
    INVOICES ||--o{ PAYMENTS : receives
    APPOINTMENTS ||--o{ APPOINTMENT_AUDIT : records

    OWNERS {
        NUMBER owner_id PK
        VARCHAR2 first_name
        VARCHAR2 last_name
        VARCHAR2 phone
        VARCHAR2 email UK
    }
    SPECIES {
        NUMBER species_id PK
        VARCHAR2 species_name UK
    }
    BREEDS {
        NUMBER breed_id PK
        NUMBER species_id FK
        VARCHAR2 breed_name
    }
    PETS {
        NUMBER pet_id PK
        NUMBER owner_id FK
        NUMBER breed_id FK
        VARCHAR2 pet_name
        DATE birth_date
        VARCHAR2 sex
    }
    VETERINARIANS {
        NUMBER veterinarian_id PK
        VARCHAR2 first_name
        VARCHAR2 last_name
        VARCHAR2 license_number UK
    }
    APPOINTMENTS {
        NUMBER appointment_id PK
        NUMBER pet_id FK
        NUMBER veterinarian_id FK
        DATE appointment_date
        VARCHAR2 appointment_status
    }
    SERVICES {
        NUMBER service_id PK
        VARCHAR2 service_name UK
        NUMBER standard_price
    }
    APPOINTMENT_SERVICES {
        NUMBER appointment_service_id PK
        NUMBER appointment_id FK
        NUMBER service_id FK
        NUMBER quantity
        NUMBER unit_price
    }
    MEDICATIONS {
        NUMBER medication_id PK
        VARCHAR2 medication_name UK
        NUMBER stock_quantity
        NUMBER unit_price
    }
    PRESCRIPTIONS {
        NUMBER prescription_id PK
        NUMBER appointment_id FK
        NUMBER medication_id FK
        NUMBER quantity
        NUMBER unit_price
    }
    VACCINATIONS {
        NUMBER vaccination_id PK
        NUMBER pet_id FK
        VARCHAR2 vaccine_name
        DATE due_date
    }
    INVOICES {
        NUMBER invoice_id PK
        NUMBER appointment_id FK
        DATE invoice_date
        VARCHAR2 invoice_status
    }
    PAYMENTS {
        NUMBER payment_id PK
        NUMBER invoice_id FK
        DATE payment_date
        NUMBER amount
    }
    APPOINTMENT_AUDIT {
        NUMBER audit_id PK
        NUMBER appointment_id FK
        VARCHAR2 action_type
        VARCHAR2 old_status
        VARCHAR2 new_status
        DATE changed_at
    }
```

The exact columns, rules, and indexes are documented in [design.md](./design.md).
