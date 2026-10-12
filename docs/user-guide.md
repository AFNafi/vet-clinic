# Vetwise Clinic - User Guide

Audience: clinic administrators and veterinarians using the local demonstration website.
The website is a course demo, not a production medical-record or billing system.

<!-- PAGE BREAK -->

# 1. Open the website

The app runs on the computer that starts the Node server. On that computer:

1. Open Terminal and change to the project backend folder: `cd /path/to/vet-clinic/backend`.
2. Ask the project administrator to confirm the Oracle database is available and configured.
3. If this is the first run, install the JavaScript dependencies: `npm install`.
4. Start the site: `npm start`. For automatic restarts during development, use `npm run dev`.
5. Leave that terminal window running while using the website.
6. Open `http://localhost:3000` in a browser on the same computer.

The terminal prints a startup message when ready. `Ctrl+C` in that terminal stops the app. If
port 3000 is occupied, set `PORT` in a private local `backend/.env` file, then use that port in the
browser address. Do not put credentials in `.env` or share it.

<!-- PAGE BREAK -->

# 2. Sign in

The opening page is the staff sign-in screen. Enter the email address and password supplied by
the clinic owner, then choose **Sign in**. Passwords are case-sensitive. This guide deliberately
does not print account passwords; ask the owner for current demo credentials separately.

New accounts require a clinic-owner invitation. If registration is disabled or the invitation is
rejected, ask the owner to configure the appropriate private staff invitation. Do not try to
register as an administrator unless the clinic owner has authorized the account.

Use **Sign out** in the lower left of the navigation before leaving a shared computer. Sessions
are stored in server memory and expire after 12 hours; restarting the server signs everyone out.

<!-- PAGE BREAK -->

# 3. Roles at a glance

The page content depends on your signed-in role.

* **Administrator:** sees clinic metrics, all upcoming appointments, the full appointment list,
  patients, and billing. Can add patients, book visits, cancel active visits, complete eligible
  visits, and mark open invoices paid.
* **Veterinarian:** sees their own worklist and patient directory. Can confirm a pending visit
  assigned to their own veterinarian profile. Cannot see another doctor's visits or clinic
  billing, create clinic-wide bookings, cancel visits, or mark invoices paid.

The server applies these rules even if someone manually sends an API request. A button being
hidden in the browser is not the only permission check.

<!-- PAGE BREAK -->

# 4. Administrator dashboard

The dashboard opens after administrator sign-in. The summary cards show today's active visits,
registered patients, open invoices and clinic veterinarian count. Click one of the seven day
buttons in the schedule overview to inspect that date; this is a compact preview, not the full
schedule.

Use the left navigation for the single full **Appointments** page, the **Patients** list, and
**Billing**. Choose **Dashboard** to return. The **New appointment** button opens the booking
form. Dashboard cards display facts only; the navigation is the one route to each full work area.

The practice card shows the demo clinic address, phone and opening hours. Those are fictional
demo details. Confirm real operational details with your clinic owner.

<!-- PAGE BREAK -->

# 5. Book an appointment (administrator)

1. Choose **New appointment**.
2. Select a registered patient.
3. Select the veterinarian who should receive the request.
4. Choose a date and local clinic time.
5. Enter a short reason for the visit, then choose **Book appointment**.

The new visit is created as **Pending confirmation**. It is a request awaiting acceptance, not an
already confirmed appointment. The selected veterinarian can see it in their worklist and confirm
it there. The admin appointment list shows its current status.

The same veterinarian and the same patient cannot have overlapping active 30-minute visits. If
there is a conflict, select another valid time. The form reports server validation errors beside
the booking form.

<!-- PAGE BREAK -->

# 6. Valid booking dates and times

Appointments must be:

* Today or later. When booking for today, the chosen time must still be in the future.
* Monday through Saturday. Sunday is closed for bookings.
* Between 08:00 and 17:30 as a start time, in five-minute increments.
* At least 30 minutes apart from another active visit for the same veterinarian or patient.

Examples of valid start times include 09:00, 09:05 and 17:30. A time such as 09:02, 07:55,
18:00, or a past time today is invalid. Each appointment is treated as 30 minutes long.

<!-- PAGE BREAK -->

# 7. Appointment statuses and next actions

* **Pending confirmation:** a newly booked request. The assigned veterinarian can confirm it.
  An administrator can cancel it but cannot complete it before the doctor accepts it.
* **Confirmed:** accepted by the assigned veterinarian. The administrator may cancel it. It can
  be completed only after its appointment time has arrived.
* **Scheduled:** a legacy seeded appointment from the original demo data. It remains active and
  can be managed by an administrator like a confirmed visit.
* **Completed:** finished; no further appointment transition is allowed.
* **Cancelled:** stopped; no further appointment transition is allowed.

The interface does not offer veterinarians a reject, cancel, complete, or reschedule action.
Contact the administrator if the requested visit needs to change.

<!-- PAGE BREAK -->

# 8. Veterinarian worklist

After veterinarian sign-in, the dashboard is personalized to that doctor. The summary includes
today's visits assigned to the doctor and the count of upcoming visits waiting for confirmation.
The worklist displays every future active appointment assigned to that veterinarian, including
dates more than seven days away. It is not restricted to the administrator's seven-day overview.

Each row shows the visit time, patient, reason, appointment date and status. A **Pending
confirmation** visit also has a **Confirm visit** button. Confirm only visits that belong to you
and that the clinic has actually arranged with you.

The worklist refreshes after a status change. The awaiting-confirmation count decreases after a
successful confirmation, and the status changes to **Confirmed**.

<!-- PAGE BREAK -->

# 9. Confirm an assigned visit

1. Sign in using the veterinarian account linked to the appointment.
2. On the dashboard, find the visit by its displayed date, patient or reason.
3. Check that the status is **Pending confirmation** and the date/time are correct.
4. Choose **Confirm visit** once.
5. Wait for the success message and confirm that the row now says **Confirmed**.

If the button says the visit is not awaiting confirmation, refresh the page; another authorized
action may already have changed it. If the visit does not appear, verify that you signed in to
the doctor assigned by the administrator. The application intentionally does not let a doctor
confirm a different doctor's appointment.

<!-- PAGE BREAK -->

# 10. Patients

Both roles can open **Patients** and search the visible patient directory. Type part of a pet
name, owner, species or breed in the search box; results update as you type. Clear the search
text to restore the list.

Administrators can choose **Add patient** and enter the required patient name, species, breed
and owner. A newly added patient starts as active with no recorded last-visit date. Adding a
patient does not create an appointment; use the booking form separately.

Veterinarians can read this demo directory but cannot create or edit patient records from the
current site. Contact the administrator if a record needs correction.

<!-- PAGE BREAK -->

# 11. Full schedule and billing (administrator)

Choose **Appointments** to view the clinic schedule. Use the status selector to narrow the list.
Administrators can cancel active visits. Once a confirmed or legacy scheduled visit's time has
passed, **Complete** becomes available. Pending requests must be accepted before completion.

Choose **Billing** to see invoices. The status filter separates all, open, unpaid, part-paid and
paid records. **Mark paid** changes an unpaid or part-paid record to **Paid**. This demo does not
record a payment amount, payment method or receipt, and an invoice cannot be set back to open
through this action.

Veterinarians do not have access to the full clinic schedule or billing view. This is intentional.

<!-- PAGE BREAK -->

# 12. Common problems

**The page will not load:** check that `npm start` is still running in the `web` folder. Open the
same port shown in the terminal. If another application occupies the port, ask the owner to
change the local port setting.

**Sign-in fails:** check the email spelling, password case and role/account. Ask the clinic owner
to verify the account. Do not use a new registration unless you have an invitation.

**A time is rejected:** use Monday-Saturday, a future date, and a five-minute start increment
from 08:00 through 17:30. A visit on today must be later than the current time.

**There is a schedule conflict:** the patient or veterinarian already has a visit within the
30-minute slot. Choose a different time.

**A veterinarian cannot see a visit:** verify the assigned doctor, sign in to that doctor's
account, and reload the dashboard. Future visits beyond a week appear in the same all-upcoming
worklist, with their date.

<!-- PAGE BREAK -->

# 13. Safe demo use and support

This is a fictional demonstration. It is not a production medical record, messaging system, or
payment processor. Do not enter real client data, health information, passwords, or payment
details. Do not treat the clinic card's phone or hours as real.

The web application reads and writes clinic records and staff accounts in its configured Oracle
schema. The browser communicates only with Express. Keep the computer's private configuration
secure; do not email it as part of the course handover.

If a visit, patient, or invoice appears incorrect, do not edit data files manually. Record what
you expected, what the site showed, and the account role you used; send that description to the
person maintaining the project.
