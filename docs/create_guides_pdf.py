from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Flowable, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
    TableStyle
)


DOCS = Path(__file__).resolve().parent
BLUE = colors.HexColor('#173F5F')
TEAL = colors.HexColor('#1E6F68')
PALE = colors.HexColor('#EAF2F8')
LINE = colors.HexColor('#B8C4CE')
TEXT = colors.HexColor('#1E2A33')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='GuideTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=25,
    leading=30, textColor=colors.black, alignment=TA_CENTER, spaceAfter=16
))
styles.add(ParagraphStyle(
    name='GuideSubtitle', parent=styles['BodyText'], fontName='Helvetica', fontSize=11,
    leading=16, textColor=TEXT, alignment=TA_CENTER, spaceAfter=24
))
styles.add(ParagraphStyle(
    name='GuideH1', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=16,
    leading=20, textColor=colors.black, spaceBefore=0, spaceAfter=12
))
styles.add(ParagraphStyle(
    name='GuideH2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=11,
    leading=14, textColor=BLUE, spaceBefore=9, spaceAfter=5
))
styles.add(ParagraphStyle(
    name='GuideBody', parent=styles['BodyText'], fontName='Helvetica', fontSize=10,
    leading=14, textColor=TEXT, spaceAfter=8
))
styles.add(ParagraphStyle(
    name='GuideBullet', parent=styles['BodyText'], fontName='Helvetica', fontSize=9.5,
    leading=13, textColor=TEXT, leftIndent=16, firstLineIndent=-9, spaceAfter=4
))
styles.add(ParagraphStyle(
    name='GuideSmall', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.5,
    leading=11, textColor=TEXT, spaceAfter=4
))


class ArchitectureDiagram(Flowable):
    def __init__(self):
        super().__init__()
        self.width = 6.8 * inch
        self.height = 1.35 * inch

    def draw(self):
        canvas = self.canv
        labels = [
            ('Browser', 'HTML CSS JS'),
            ('Express', 'auth and API'),
            ('Local JSON', 'demo store'),
            ('Oracle', 'separate SQL project')
        ]
        box_width = 1.46 * inch
        box_height = 0.62 * inch
        y = 0.42 * inch
        for index, (title, detail) in enumerate(labels):
            x = index * 1.76 * inch
            canvas.setFillColor(PALE if index < 3 else colors.HexColor('#F4F6F7'))
            canvas.setStrokeColor(BLUE)
            canvas.roundRect(x, y, box_width, box_height, 7, fill=1, stroke=1)
            canvas.setFillColor(BLUE)
            canvas.setFont('Helvetica-Bold', 9)
            canvas.drawCentredString(x + box_width / 2, y + 0.39 * inch, title)
            canvas.setFillColor(TEXT)
            canvas.setFont('Helvetica', 7.5)
            canvas.drawCentredString(x + box_width / 2, y + 0.20 * inch, detail)
            if index < 2:
                canvas.setStrokeColor(TEAL)
                canvas.line(x + box_width, y + box_height / 2, x + 1.76 * inch, y + box_height / 2)
                canvas.line(x + 1.76 * inch, y + box_height / 2, x + 1.67 * inch, y + box_height / 2 + 4)
                canvas.line(x + 1.76 * inch, y + box_height / 2, x + 1.67 * inch, y + box_height / 2 - 4)
        canvas.setFillColor(TEXT)
        canvas.setFont('Helvetica-Oblique', 7.5)
        canvas.drawCentredString(5.95 * inch, 0.15 * inch, 'No live web-to-Oracle connection')


def header_footer(label, total_pages):
    def draw(canvas, document):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.line(document.leftMargin, letter[1] - 0.52 * inch, letter[0] - document.rightMargin, letter[1] - 0.52 * inch)
        canvas.setFont('Helvetica-Bold', 8)
        canvas.setFillColor(BLUE)
        canvas.drawString(document.leftMargin, letter[1] - 0.39 * inch, f'VETWISE CLINIC | {label}')
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(TEXT)
        canvas.drawRightString(letter[0] - document.rightMargin, 0.37 * inch, f'Page {document.page} of {total_pages}')
        canvas.restoreState()
    return draw


def heading(value):
    return Paragraph(value, styles['GuideH1'])


def body(value):
    return Paragraph(value, styles['GuideBody'])


def small(value):
    return Paragraph(value, styles['GuideSmall'])


def bullets(items):
    return [Paragraph(f'• {item}', styles['GuideBullet']) for item in items]


def table(rows, widths=None):
    result = Table(rows, colWidths=widths, repeatRows=1, hAlign='LEFT')
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('LEADING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.35, LINE),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F7FAFC')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return result


def page(story, title, paragraphs=(), items=(), grid=None, diagram=False):
    story.append(heading(title))
    for value in paragraphs:
        story.append(body(value))
    if diagram:
        story.append(Spacer(1, 8))
        story.append(ArchitectureDiagram())
        story.append(Spacer(1, 10))
    story.extend(bullets(items))
    if grid:
        story.append(Spacer(1, 7))
        story.append(grid)
    story.append(PageBreak())


def build_user_guide():
    story = []
    story += [Spacer(1, 1.1 * inch), Paragraph('Vetwise Clinic User Guide', styles['GuideTitle'])]
    story += [Paragraph('Administrator and veterinarian instructions for the fictional training website', styles['GuideSubtitle'])]
    story += [body('Use this guide to operate the local demonstration safely. It is not a production medical, payment, or identity system. Never enter real client, patient, health, payment, password, invitation-code, or database data.')]
    story += [table([
        ['Role', 'What the role can do'],
        ['Administrator', 'Add patients, book and manage clinic-wide visits, view billing, mark an open invoice paid.'],
        ['Veterinarian', 'View assigned future visits, search patients, confirm only assigned pending visits.'],
    ], [1.35 * inch, 4.9 * inch]), PageBreak()]
    page(story, '1. Start and sign in', [
        'From the web folder run npm install once, then npm run dev. Open http://localhost:3000. Sign in with your individual staff email and password.',
        'New staff registration requires the correct private invitation code. The clinic owner configures it on the server. Do not place invitation codes in files or share a signed-in browser session.',
        'Sessions last up to 12 hours and end after sign-out or a server restart. If the app reports an expired session, sign in again.'
    ], ['If registration is unavailable, ask the clinic owner to configure the appropriate invitation code.', 'Do not edit staff-accounts.json or clinic-store.json manually.'])
    page(story, '2. Dashboard and role boundaries', [
        'Administrators see clinic-wide summary cards, the seven-day agenda, every appointment, patient records, and billing. Selecting a day changes the administrator dashboard list.',
        'Veterinarians see their own future active worklist. They cannot see another doctor’s schedule, access billing, create clinic-wide bookings, or cancel visits.',
        'The server checks permissions for every request. Hiding a control in the browser is helpful, but it is not the security boundary.'
    ], ['Use the sidebar to move between Dashboard, Patients, Appointments, and Billing.', 'Use the patient search and status filters to find records quickly.'])
    page(story, '3. Administrator workflow', [
        'Choose New patient, complete patient name, species, breed, and owner name, then save. A new patient has no last-visit date until an appointment is completed.',
        'Choose New appointment, select a patient and veterinarian, choose date and time, enter a short reason, then submit. A new booking starts as Pending confirmation for the assigned veterinarian.',
        'Appointments are 30 minutes. The system checks the real calendar date, Monday-Saturday clinic hours, five-minute increments, past times today, and overlapping patient or veterinarian visits.'
    ], ['Permitted start times are 08:00 through 17:30.', 'Administrators can cancel an active visit.', 'Administrators can complete confirmed or legacy scheduled visits after their start time.'])
    page(story, '4. Veterinarian workflow', [
        'Read the dashboard worklist after sign-in. It lists every future active appointment assigned to your linked veterinarian profile, including appointments beyond the next seven days.',
        'A Pending confirmation visit assigned to you has a Confirm visit button. Confirm only visits you accept. The status becomes Confirmed and the administrator can later complete it after the appointment time.',
        'Completed and Cancelled visits are final in this demo. A Scheduled visit is a legacy seeded record that remains active.'
    ], ['Pending confirmation: administrator booked the visit and awaits your response.', 'Confirmed: accepted by the assigned veterinarian.', 'Completed or Cancelled: final status, with no further transition.'])
    page(story, '5. Billing, errors, and safe use', [
        'Administrators use Billing to filter invoices and mark an open invoice paid. The web demonstration does not collect payment amount, method, receipt, refund, or card data.',
        'When a request fails, read the message. It normally identifies an incomplete field, date or time rule, appointment overlap, or invalid status transition. Correct the input and try again.',
        'The web demonstration and Oracle SQL project are separate. Web actions update only local JSON demo data; they do not update Oracle.'
    ], ['Keep all information fictional.', 'If the page cannot load, confirm the server is running and refresh.', 'Report incorrect records to the clinic owner instead of editing local JSON files.'])
    story.pop()
    document = SimpleDocTemplate(str(DOCS / 'user-guide.pdf'), pagesize=letter, leftMargin=0.72 * inch,
        rightMargin=0.72 * inch, topMargin=0.76 * inch, bottomMargin=0.62 * inch)
    document.build(story, onFirstPage=header_footer('USER GUIDE', 6), onLaterPages=header_footer('USER GUIDE', 6))


def build_developer_guide():
    story = []
    story += [Spacer(1, 0.95 * inch), Paragraph('Vetwise Clinic Developer Handover', styles['GuideTitle'])]
    story += [Paragraph('Architecture, file guide, code blocks, workflows, debugging, and maintenance', styles['GuideSubtitle'])]
    story += [body('This is the developer companion to the project. It explains the purpose and interaction of every runtime file and the important blocks within each file. Read it beside the source when tracing an individual line.')]
    story += [ArchitectureDiagram(), Spacer(1, 12), body('The key fact is separation: the website uses a fictional local JSON store; the Oracle project is a separate SQL deliverable. No browser-to-Oracle connection exists.') , PageBreak()]
    page(story, '1. Project map and system boundary', [
        'The root README is the starting map. sql contains the Oracle scripts; docs contains written artefacts and PDF builders; web contains the optional Express demonstration.',
        'The web path is Browser -> Express -> local JSON. The database path is SQLcl -> Oracle schema. They model similar concepts but do not exchange live records.'
    ], ['AGENTS.md defines local rules: Oracle Free SQL only, fake data only, prescribed script names, documentation under docs, and no project-external changes.', 'The root .gitignore and web/.gitignore keep local stores and .env files out of Git.'], diagram=True)
    page(story, '2. Configuration and data safety', [
        'web/.env.example names supported environment variables without providing credentials. package.json declares Express, dotenv, and node-oracledb for a future server-side integration. package-lock.json pins installed dependencies.',
        'Ignored staff-accounts.json contains salts and password hashes. Ignored clinic-store.json contains demo mutations. They are private operational state, never source-controlled fixtures.'
    ], ['Never commit passwords, invitation codes, Oracle connection strings, or local demo stores.', 'Use a disposable local store in tests and delete it only when intentionally resetting the demo.'])
    page(story, '3. SQL run_all and safe teardown', [
        'sql/run_all.sql is the normal SQL entry point. Its WHENEVER SQLERROR directive exits on failure and rolls back the active transaction. SET DEFINE OFF stops substitution-variable surprises in sample literals.',
        'The ordered @@ calls reflect dependencies. sql/00_drop_all.sql uses a small PL/SQL helper to drop views, package, triggers, then child tables before parent tables. Expected missing-object errors are ignored; unexpected failures are raised.'
    ], ['Run from the project root with @sql/run_all.sql.', 'Do not put connection details in the repository.'])
    page(story, '4. SQL DDL tables and constraints', [
        'sql/01_ddl.sql creates fourteen tables using Oracle NUMBER identities, VARCHAR2 text, and DATE values. Constraints are the first data-integrity boundary: keys, references, unique values, and checks are defined beside the affected columns.',
        'Owners, species, breeds, veterinarians, services, medications, pets, and appointments describe clinic entities. Appointment services and prescriptions are detail/bridge tables. Vaccinations, invoices, payments, and appointment audit add clinical, finance, and history records.'
    ], ['Snapshot prices on detail rows preserve historic charges when catalogue price changes.', 'The invoice table stores status and date; totals are calculated from line items instead of copied.'])
    page(story, '5. SQL indexes and retained history', [
        'The DDL creates indexes for every foreign key and common search columns. This supports joins and protects parent rows from expensive child scans.',
        'The function-based UQ_APPTS_SCHEDULED_VET_TIME index has values only for Scheduled rows. It prevents a veterinarian having two scheduled appointments at the exact same time while keeping completed and cancelled history valid.',
        'Appointment audit retains INSERT and UPDATE events. Appointments are retained as history, so role grants do not include appointment DELETE.'
    ])
    page(story, '6. SQL sample data and reports', [
        'sql/02_data.sql loads only fictional records. Single inserts are used for identity parent rows; PL/SQL loops build pets, vaccinations, appointments, invoice detail, invoices, and payments. The final COMMIT happens after a successful load.',
        'sql/03_queries.sql has eighteen labelled report examples. Q5 aggregates each money source before joining, preventing service x prescription x payment multiplication. Q3 uses UNION ALL to show services and medications as independent item rows.'
    ], ['Read each query from SELECT result, through joins, to filters, groups, and order.', 'A report should calculate, not silently duplicate, monetary totals.'])
    page(story, '7. SQL views and date boundaries', [
        'sql/04_views.sql creates four shared reporting views: upcoming appointments, outstanding owner balances, veterinarian workload, and vaccinations due soon.',
        'All 30-day logic uses a half-open range: >= today at midnight and < midnight after day 30. This includes every valid time on day 30. The same rule is used in report queries and package reminders.'
    ], ['A view is a named query, not copied data.', 'Balance reporting excludes VOID and non-positive balances.'])
    page(story, '8. Package contract and booking block', [
        'sql/05_package.sql starts with the public package specification. The body implements booking, invoice calculation, vaccination registration, and reminders. Keep external callers dependent on the specification, not body variables.',
        'book_appointment validates IDs, date, reason, pet existence, active veterinarian, and scheduled exact-time conflict before inserting. The application-error codes make invalid input predictable and testable.'
    ], ['Read package code in this order: specification, declarations, validation, queries, mutation, exception block.', 'USER_ERRORS should be empty after compile.'])
    page(story, '9. Package billing and reminders block', [
        'calculate_invoice_total resolves the invoice appointment, sums service and prescription quantity times snapshot price independently, then returns the combined result. NVL ensures an empty line type contributes zero.',
        'register_vaccination validates a real pet, nonblank name, and non-future date, then adds a 365-day due date. vaccination_reminders validates a whole day range, opens a parameterized cursor, prints results, and closes the cursor even on error.'
    ])
    page(story, '10. Trigger blocks: audit and inventory', [
        'sql/06_triggers.sql has an appointment audit trigger using INSERTING, OLD, NEW, USER, and SYSDATE. It records new appointments and changes to selected business fields.',
        'The compound prescription trigger adjusts inventory for insert, quantity change, medicine change, and delete. It reserves replacement stock before releasing old stock and rejects insufficient stock with clear application errors.',
        'Paid-service-line and paid-prescription triggers reject changes after the related invoice has payments, preserving financial history.'
    ])
    page(story, '11. Trigger blocks: invoice state', [
        'The invoice-date trigger supplies SYSDATE only when an insert gives no date. The invoice-status validation trigger checks a non-void invoice against detail total and existing payments; it rejects overpayment and mismatched manual status.',
        'The payment compound trigger remembers affected invoice IDs per row, then after the statement recalculates totals once per invoice. It derives UNPAID, PARTIAL, or PAID status and refuses payments for a void invoice.'
    ], ['Use after-statement work for a multi-row payment change.', 'The script’s demonstration blocks use savepoints and rollback.'])
    page(story, '12. SQL roles and regression tests', [
        'sql/07_security.sql checks SESSION_PRIVS before role creation. It avoids aborting a normal schema owner that lacks CREATE ROLE and handles Oracle’s VET user/role name collision honestly.',
        'sql/08_tests.sql contains 22 numbered tests. Together with trigger demonstrations it produces 34 PASS messages in a successful full build. Tests cover constraints, package errors, audit, inventory lifecycle, payments, paid-line protection, date range inclusion, and retained history.'
    ], ['Every temporary SQL test change is rolled back.', 'Run the rebuild in a disposable schema during maintenance.'])
    page(story, '13. Express server entry file', [
        'web/server.js imports Express and path, loads environment values, builds the app, enables JSON parsing, exposes static public files, and mounts auth before the protected API router.',
        'The unknown /api handler returns JSON 404 before the HTML catch-all. The four-argument final middleware handles malformed JSON and unexpected errors. The require.main guard starts a listener only when launched directly, allowing tests to import the app.'
    ])
    page(story, '14. auth.js accounts and roster linking', [
        'web/routes/auth.js imports crypto, file utilities, Express, and clinic persistence. Module constants name store paths, invitation-code settings, cookie lifetime, and scrypt settings.',
        'ensureVeterinarianProfile links a veterinarian account to one roster profile by account ID, email, or controlled legacy-name matching. getVeterinarianRoster returns only account-backed doctors, so booking never presents a doctor who cannot sign in.'
    ], ['persistAccounts writes temporary private JSON then renames it atomically.', 'publicAccount deliberately omits salt and password hash.'])
    page(story, '15. auth.js sessions, validation, and routes', [
        'setSession creates a random token, stores account ID and expiry in memory, and sends an HttpOnly SameSite cookie. getSessionAccount expires stale tokens. Rate limiting records attempts per IP and route during a 15-minute window.',
        'Registration validates all inputs, verifies role-specific invitation codes, derives a salted scrypt hash, persists account and any new roster profile, and returns only public user data. Login hashes unknown users with a dummy salt to make the slow path similar.'
    ], ['requireAuth attaches a public account to the request.', 'requireRole is the reusable authorization guard for protected route actions.'])
    page(story, '16. api.js shared helpers and dashboard', [
        'web/routes/api.js mounts requireAuth once for all following routes. Constants describe ISO shape, time shape, duration, active statuses, and field length limits.',
        'isRealDate detects rollover values; isRealTime checks clock range and five-minute slots; isWithinClinicHours enforces Monday-Saturday and a full 30-minute fit. The dashboard scopes schedule data by role and roster before calculating metrics.'
    ])
    page(story, '17. api.js mutations and transitions', [
        'Patient creation is admin-only, validates fields, appends in memory, saves, and removes the new row if saving fails. Appointment creation resolves a patient and linked doctor, validates date/time/reason, and rejects active 30-minute overlap for either doctor or patient.',
        'Appointment PATCH enforces the state machine: only the assigned veterinarian may confirm pending work; an admin may cancel active work or complete eligible confirmed or legacy scheduled work after its time. Invoice PATCH is an intentionally simple admin-only mark-paid demo action.'
    ])
    page(story, '18. clinic.js demo data and atomic store', [
        'web/data/clinic.js exports local-date helpers, clinic facts, seeded arrays, and persistence. Local date components avoid UTC date shifts. Initial records use relative dates so the demo remains useful.',
        'When a store exists, collection contents are replaced in place so imported modules retain stable array references. persistClinicData writes a random temporary file, renames it, then applies restrictive permission mode.'
    ], ['This is not concurrent database storage.', 'A future Oracle integration belongs on the server and requires pooling, parameterized SQL, and mapping design.'])
    page(story, '19. index.html markup contract', [
        'web/public/index.html is the static application shell. It defines auth forms, sidebar, dashboard, tables, filters, dialogs, toast, and error regions. main.js depends on its IDs and classes.',
        'Use semantic form controls, native dialog elements, labels, and live text feedback. Role-specific elements start hidden but server-side checks still decide whether an action is allowed.'
    ])
    page(story, '20. main.js state and rendering blocks', [
        'web/public/js/main.js begins with state and a request wrapper. request parses JSON, detects a protected-route 401, clears local user state, and creates a consistent error object. JSON helpers centralize POST and PATCH setup.',
        'escapeHtml protects values inserted into template strings. renderDashboard, renderPatients, renderAppointments, and renderInvoices transform loaded state into DOM content. Each renderer shows only role-appropriate actions and an empty state when needed.'
    ])
    page(story, '21. main.js forms, refresh, and events', [
        'Dialog helpers reset fields, populate select choices from state, set date/time constraints, and open native dialogs. Submit handlers POST data, refresh state after success, and render server validation errors without assuming a successful request.',
        'loadClinicData uses Promise.all for independent reads. refreshData repeats it after mutations. A delegated click listener handles buttons created by later renders; direct listeners handle fixed forms, filters, search, logout, and dialog dismissals.'
    ])
    page(story, '22. styles.css visual and access blocks', [
        'web/public/styles.css is organised from theme variables and base rules through shell layout, reusable components, tables/dialogs, and responsive media queries. Read top-down to find a selector’s inherited context.',
        'The sidebar flex and sticky rules keep navigation usable. Content min-width prevents wide tables forcing page overflow. Table wrappers handle horizontal scrolling. Reduced-motion and transparency fallbacks preserve readable use on varied devices.'
    ], ['ARIA states, focus placement, and labels support keyboard and assistive technology.', 'CSS is presentation; it is not the authorization boundary.'])
    page(story, '23. Tests and DOM checker', [
        'web/test/api.test.js starts the imported Express app on an ephemeral port with temporary local stores. It registers accounts, keeps cookie state, and verifies static delivery, authentication, role scope, booking, validation, transitions, invoices, persistence, unknown routes, and malformed JSON.',
        'web/check_dom.js compares selector targets used by main.js with index.html. It catches missing IDs or classes after a markup edit. Run npm test and node check_dom.js from web before committing.'
    ])
    page(story, '24. Documentation and PDF files', [
        'docs/requirements.md is the project scope. design.md, erd.md, and normalization.md describe the relational model. decisions.md records intentional choices. checklist.md is completion evidence. backup.md describes safe database operations.',
        'docs/user-guide.md and docs/technical-handover.md are editable prose sources. docs/build_pdf_guides.js is the original plain-text PDF builder. docs/create_guides_pdf.py creates the current styled PDFs with page headers, tables, and a boundary diagram.'
    ])
    page(story, '25. End-to-end workflow and line tracing', [
        'Appointment flow: administrator browser -> POST API -> validation -> in-memory object -> atomic JSON write -> JSON response -> refresh. Confirmation flow: assigned veterinarian -> PATCH -> session and assignment checks -> save -> refreshed worklist. Completion/cancellation follows the admin state rules.',
        'For Oracle: package or direct SQL writes -> constraints and triggers -> stored rows -> report/view queries. Detail lines determine invoice total; payment trigger determines status; paid-line triggers preserve already-paid totals; stock and audit triggers protect operational history.'
    ], diagram=True)
    page(story, '26. Developer runbook and final checklist', [
        'For JavaScript changes, run node --check on changed files, npm test, and node check_dom.js. For SQL changes, run @sql/run_all.sql in a disposable Oracle schema and confirm no USER_ERRORS, no FAIL messages, and 34 PASS messages.',
        'For any line you change, trace input, validation, state mutation, persistence, response, caller, and test. Then update the appropriate guide and decisions record. This is the practical way to explain every important line and block accurately.'
    ], ['Inspect git status and git diff --check.', 'Never stage ignored stores or secrets.', 'Regenerate and visually inspect PDFs after documentation changes.', 'Commit source and documentation, then push the intended branch.'])
    story.pop()
    document = SimpleDocTemplate(str(DOCS / 'technical-handover.pdf'), pagesize=letter, leftMargin=0.72 * inch,
        rightMargin=0.72 * inch, topMargin=0.76 * inch, bottomMargin=0.62 * inch)
    document.build(story, onFirstPage=header_footer('DEVELOPER HANDOVER', 27), onLaterPages=header_footer('DEVELOPER HANDOVER', 27))


if __name__ == '__main__':
    build_user_guide()
    build_developer_guide()
