-- Veterinary Clinic business queries.

-- Q1. Which completed appointments were handled by each veterinarian for each pet?
SELECT a.appointment_id,
       a.appointment_date,
       p.pet_name,
       o.first_name || ' ' || o.last_name AS owner_name,
       v.first_name || ' ' || v.last_name AS veterinarian_name,
       a.reason
FROM appointments a
JOIN pets p ON p.pet_id = a.pet_id
JOIN owners o ON o.owner_id = p.owner_id
JOIN veterinarians v ON v.veterinarian_id = a.veterinarian_id
WHERE a.appointment_status = 'COMPLETED'
ORDER BY a.appointment_date DESC;

-- Q2. Which pets have no appointments yet, and how many visits has every other pet had?
SELECT p.pet_id,
       p.pet_name,
       o.first_name || ' ' || o.last_name AS owner_name,
       COUNT(a.appointment_id) AS appointment_count
FROM pets p
JOIN owners o ON o.owner_id = p.owner_id
LEFT JOIN appointments a ON a.pet_id = p.pet_id
GROUP BY p.pet_id, p.pet_name, o.first_name, o.last_name
ORDER BY appointment_count, p.pet_name;

-- Q3. What services and prescribed medications were recorded for each completed appointment?
SELECT a.appointment_id,
       a.appointment_date,
       p.pet_name,
       s.service_name,
       aps.quantity AS service_quantity,
       m.medication_name,
       pr.quantity AS medication_quantity
FROM appointments a
JOIN pets p ON p.pet_id = a.pet_id
JOIN appointment_services aps ON aps.appointment_id = a.appointment_id
JOIN services s ON s.service_id = aps.service_id
LEFT JOIN prescriptions pr ON pr.appointment_id = a.appointment_id
LEFT JOIN medications m ON m.medication_id = pr.medication_id
WHERE a.appointment_status = 'COMPLETED'
ORDER BY a.appointment_date DESC, p.pet_name;

-- Q4. Which veterinarians completed more than five appointments?
SELECT v.veterinarian_id,
       v.first_name || ' ' || v.last_name AS veterinarian_name,
       COUNT(a.appointment_id) AS completed_appointments
FROM veterinarians v
JOIN appointments a ON a.veterinarian_id = v.veterinarian_id
WHERE a.appointment_status = 'COMPLETED'
GROUP BY v.veterinarian_id, v.first_name, v.last_name
HAVING COUNT(a.appointment_id) > 5
ORDER BY completed_appointments DESC;

-- Q5. Which non-void invoices still have money outstanding?
-- Select the owner and invoice columns that will identify the balance to the clinic.
SELECT o.first_name || ' ' || o.last_name AS owner_name,
       i.invoice_id,
       i.invoice_date,
       NVL(s.service_total, 0) + NVL(r.prescription_total, 0) AS invoice_total,
       NVL(py.payment_total, 0) AS payment_total,
       NVL(s.service_total, 0) + NVL(r.prescription_total, 0) - NVL(py.payment_total, 0) AS outstanding_balance
-- Start with invoices, then follow their appointment, pet, and owner links.
FROM invoices i
JOIN appointments a ON a.appointment_id = i.appointment_id
JOIN pets p ON p.pet_id = a.pet_id
JOIN owners o ON o.owner_id = p.owner_id
-- Total all service lines once per appointment before joining them to the invoice.
LEFT JOIN (
    SELECT appointment_id, SUM(quantity * unit_price) AS service_total
    FROM appointment_services
    GROUP BY appointment_id
) s ON s.appointment_id = a.appointment_id
-- Total all prescription lines once per appointment for the same reason.
LEFT JOIN (
    SELECT appointment_id, SUM(quantity * unit_price) AS prescription_total
    FROM prescriptions
    GROUP BY appointment_id
) r ON r.appointment_id = a.appointment_id
-- Total all payments once per invoice so payments are not counted more than once.
LEFT JOIN (
    SELECT invoice_id, SUM(amount) AS payment_total
    FROM payments
    GROUP BY invoice_id
) py ON py.invoice_id = i.invoice_id
-- Ignore void invoices and return only balances greater than zero.
WHERE i.invoice_status <> 'VOID'
  AND NVL(s.service_total, 0) + NVL(r.prescription_total, 0) - NVL(py.payment_total, 0) > 0
ORDER BY outstanding_balance DESC, i.invoice_date;

-- Q6. Which pets have attended more appointments than the average pet?
SELECT p.pet_id,
       p.pet_name,
       COUNT(a.appointment_id) AS appointment_count
FROM pets p
JOIN appointments a ON a.pet_id = p.pet_id
GROUP BY p.pet_id, p.pet_name
HAVING COUNT(a.appointment_id) > (
    SELECT AVG(appointment_count)
    FROM (
        SELECT COUNT(*) AS appointment_count
        FROM appointments
        GROUP BY pet_id
    )
)
ORDER BY appointment_count DESC, p.pet_name;

-- Q7. Which active services have never been used in an appointment?
SELECT s.service_id,
       s.service_name,
       s.standard_price
FROM services s
WHERE s.is_active = 'Y'
  AND NOT EXISTS (
      SELECT 1
      FROM appointment_services aps
      WHERE aps.service_id = s.service_id
  )
ORDER BY s.service_name;

-- Q8. Which appointments are scheduled in the next 30 days?
SELECT a.appointment_id,
       a.appointment_date,
       p.pet_name,
       v.first_name || ' ' || v.last_name AS veterinarian_name,
       a.reason
FROM appointments a
JOIN pets p ON p.pet_id = a.pet_id
JOIN veterinarians v ON v.veterinarian_id = a.veterinarian_id
WHERE a.appointment_status = 'SCHEDULED'
  AND a.appointment_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 30
ORDER BY a.appointment_date, p.pet_name;

-- Q9. How does each veterinarian rank by completed appointment count?
-- The inner query produces one completed-visit count for every veterinarian.
SELECT veterinarian_name,
       completed_appointments,
-- RANK assigns the same rank to tied counts and leaves a gap after a tie.
       RANK() OVER (ORDER BY completed_appointments DESC) AS workload_rank
-- Build the set that the analytic RANK function will evaluate.
FROM (
    SELECT v.first_name || ' ' || v.last_name AS veterinarian_name,
-- Count only completed appointments for each veterinarian.
           COUNT(a.appointment_id) AS completed_appointments
    FROM veterinarians v
    LEFT JOIN appointments a
        ON a.veterinarian_id = v.veterinarian_id
       AND a.appointment_status = 'COMPLETED'
-- Group rows so every veterinarian receives one count, including zero.
    GROUP BY v.veterinarian_id, v.first_name, v.last_name
)
-- Sort the final report from the busiest veterinarian to the least busy.
ORDER BY workload_rank, veterinarian_name;

-- Q10. What is each owner's running total of payments over time?
-- Select each payment and the owner reached through invoice, appointment, and pet.
SELECT o.first_name || ' ' || o.last_name AS owner_name,
       py.payment_date,
       py.payment_id,
       py.amount,
-- SUM OVER adds payments within each owner group without collapsing individual payment rows.
       SUM(py.amount) OVER (
           PARTITION BY o.owner_id
           ORDER BY py.payment_date, py.payment_id
           ROWS UNBOUNDED PRECEDING
       ) AS running_payment_total
-- Follow the payment's relationships back to the owner.
FROM payments py
JOIN invoices i ON i.invoice_id = py.invoice_id
JOIN appointments a ON a.appointment_id = i.appointment_id
JOIN pets p ON p.pet_id = a.pet_id
JOIN owners o ON o.owner_id = p.owner_id
-- Present each owner's payments from oldest to newest.
ORDER BY owner_name, py.payment_date, py.payment_id;

-- Q11. Which five services generated the most billed revenue?
SELECT s.service_name,
       SUM(aps.quantity * aps.unit_price) AS service_revenue
FROM appointment_services aps
JOIN services s ON s.service_id = aps.service_id
GROUP BY s.service_name
ORDER BY service_revenue DESC
FETCH FIRST 5 ROWS ONLY;

-- Q12. Which medications have stock below the average medication stock level?
SELECT medication_name,
       stock_quantity,
       unit_price
FROM medications
WHERE stock_quantity < (
    SELECT AVG(stock_quantity)
    FROM medications
)
ORDER BY stock_quantity, medication_name;

-- Q13. Which pets have vaccinations due in the next 30 days?
SELECT p.pet_name,
       o.first_name || ' ' || o.last_name AS owner_name,
       va.vaccine_name,
       va.due_date
FROM vaccinations va
JOIN pets p ON p.pet_id = va.pet_id
JOIN owners o ON o.owner_id = p.owner_id
WHERE va.due_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 30
ORDER BY va.due_date, p.pet_name;

-- Q14. What amount has each invoice received, including invoices with no payments?
SELECT i.invoice_id,
       i.invoice_status,
       NVL(SUM(py.amount), 0) AS amount_paid
FROM invoices i
LEFT JOIN payments py ON py.invoice_id = i.invoice_id
GROUP BY i.invoice_id, i.invoice_status
ORDER BY amount_paid, i.invoice_id;

-- Q15. What was the latest completed appointment for every pet that has visited the clinic?
SELECT p.pet_name,
       a.appointment_date AS last_completed_appointment,
       a.reason
FROM appointments a
JOIN pets p ON p.pet_id = a.pet_id
WHERE a.appointment_status = 'COMPLETED'
  AND a.appointment_date = (
      SELECT MAX(a2.appointment_date)
      FROM appointments a2
      WHERE a2.pet_id = a.pet_id
        AND a2.appointment_status = 'COMPLETED'
  )
ORDER BY a.appointment_date DESC, p.pet_name;

-- Q16. Which owners have at least one pet with a vaccination due soon?
SELECT o.owner_id,
       o.first_name || ' ' || o.last_name AS owner_name,
       o.phone,
       o.email
FROM owners o
WHERE EXISTS (
    SELECT 1
    FROM pets p
    JOIN vaccinations va ON va.pet_id = p.pet_id
    WHERE p.owner_id = o.owner_id
      AND va.due_date BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE) + 30
)
ORDER BY owner_name;

-- Q17. Which scheduled appointments do not have an invoice yet?
SELECT a.appointment_id,
       a.appointment_date,
       p.pet_name,
       a.reason
FROM appointments a
JOIN pets p ON p.pet_id = a.pet_id
LEFT JOIN invoices i ON i.appointment_id = a.appointment_id
WHERE a.appointment_status = 'SCHEDULED'
  AND i.invoice_id IS NULL
ORDER BY a.appointment_date;

-- Q18. How many completed appointments did each species have in the last 90 days?
SELECT sp.species_name,
       COUNT(a.appointment_id) AS completed_appointments
FROM appointments a
JOIN pets p ON p.pet_id = a.pet_id
JOIN breeds b ON b.breed_id = p.breed_id
JOIN species sp ON sp.species_id = b.species_id
WHERE a.appointment_status = 'COMPLETED'
  AND a.appointment_date >= TRUNC(SYSDATE) - 90
GROUP BY sp.species_name
ORDER BY completed_appointments DESC, sp.species_name;
