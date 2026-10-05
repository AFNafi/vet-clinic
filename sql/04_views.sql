-- Reusable reporting views for the Veterinary Clinic database.

-- Scheduled appointments during the next 30 days.
CREATE OR REPLACE VIEW vw_upcoming_appointments AS
SELECT a.appointment_id,
       a.appointment_date,
       p.pet_id,
       p.pet_name,
       o.owner_id,
       o.first_name || ' ' || o.last_name AS owner_name,
       v.veterinarian_id,
       v.first_name || ' ' || v.last_name AS veterinarian_name,
       a.reason
FROM appointments a
JOIN pets p ON p.pet_id = a.pet_id
JOIN owners o ON o.owner_id = p.owner_id
JOIN veterinarians v ON v.veterinarian_id = a.veterinarian_id
WHERE a.appointment_status = 'SCHEDULED'
  AND a.appointment_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 30;

-- Non-void invoices that still have a positive outstanding balance.
CREATE OR REPLACE VIEW vw_owner_outstanding_balances AS
SELECT o.owner_id,
       o.first_name || ' ' || o.last_name AS owner_name,
       i.invoice_id,
       i.invoice_date,
       i.invoice_status,
       NVL(s.service_total, 0) + NVL(r.prescription_total, 0) AS invoice_total,
       NVL(py.payment_total, 0) AS payment_total,
       NVL(s.service_total, 0) + NVL(r.prescription_total, 0) - NVL(py.payment_total, 0) AS outstanding_balance
FROM invoices i
JOIN appointments a ON a.appointment_id = i.appointment_id
JOIN pets p ON p.pet_id = a.pet_id
JOIN owners o ON o.owner_id = p.owner_id
LEFT JOIN (
    SELECT appointment_id, SUM(quantity * unit_price) AS service_total
    FROM appointment_services
    GROUP BY appointment_id
) s ON s.appointment_id = a.appointment_id
LEFT JOIN (
    SELECT appointment_id, SUM(quantity * unit_price) AS prescription_total
    FROM prescriptions
    GROUP BY appointment_id
) r ON r.appointment_id = a.appointment_id
LEFT JOIN (
    SELECT invoice_id, SUM(amount) AS payment_total
    FROM payments
    GROUP BY invoice_id
) py ON py.invoice_id = i.invoice_id
WHERE i.invoice_status <> 'VOID'
  AND NVL(s.service_total, 0) + NVL(r.prescription_total, 0) - NVL(py.payment_total, 0) > 0;

-- Number of appointments handled by each veterinarian in each calendar month.
CREATE OR REPLACE VIEW vw_veterinarian_workload AS
SELECT v.veterinarian_id,
       v.first_name || ' ' || v.last_name AS veterinarian_name,
       TRUNC(a.appointment_date, 'MM') AS workload_month,
       COUNT(a.appointment_id) AS total_appointments,
       SUM(CASE WHEN a.appointment_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_appointments,
       SUM(CASE WHEN a.appointment_status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled_appointments
FROM veterinarians v
JOIN appointments a ON a.veterinarian_id = v.veterinarian_id
GROUP BY v.veterinarian_id,
         v.first_name,
         v.last_name,
         TRUNC(a.appointment_date, 'MM');

-- Vaccinations due from today through the next 30 days.
CREATE OR REPLACE VIEW vw_vaccinations_due_soon AS
SELECT va.vaccination_id,
       va.due_date,
       va.vaccine_name,
       p.pet_id,
       p.pet_name,
       o.owner_id,
       o.first_name || ' ' || o.last_name AS owner_name,
       o.phone,
       o.email
FROM vaccinations va
JOIN pets p ON p.pet_id = va.pet_id
JOIN owners o ON o.owner_id = p.owner_id
WHERE va.due_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 30;

PROMPT Reporting views created.
