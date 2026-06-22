
Thanks. Here’s a focused, area-by-area mapping of legacy (Yii SMW) vs modern (smw-api2) for SMW-1074, highlighting exact equivalents, differences, and gaps.
1) Enrolment → Payment Cycle creation
- Legacy (Yii)
  - Flow: Enrolment wizard → EnrolmentController -> Enrolment save → PaymentCycle created (via Enrolment::setPaymentCycle) → PaymentCycle::afterSave() creates payment_cycle_lesson links.
  - Core idea: payment cycles are created on enrolment confirmation and immediately wired to lessons.
- Modern (API)
  - Flow: EnrolmentScheduleService + LessonConfirmationService
    - Enrolment start date is persisted (paymentCycleStartDate).
    - On enrolment confirmation, createPaymentCycleLessons is invoked to build cycles and link lessons.
    - setDueDate() recalculates due dates from the first lesson in each cycle.
  - Core idea: explicit, service-driven creation of cycles and explicit linking (no Yii afterSave hook).
- Gap/Observation
  - Modern mirrors the intent, but the exact lifecycle order and side-effects differ slightly (explicit linking vs afterSave side-effect). The Not(5) handling in due-date selection can still diverge in edge cases.
2) Payment Cycle → PaymentCycleLesson linking
- Legacy (Yii)
  - Flow: PaymentCycleLesson rows are created as part of the Yii flow (PaymentCycle::afterSave) to establish the cycle-to-lesson bridge.
- Modern (API)
  - Flow: createPaymentCycleLessons(paymentCycleId, courseId, startDate, endDate)
    - Finds confirmed, non-deleted lessons in the cycle range.
    - Creates missing PaymentCycleLesson rows.
    - Restores soft-deleted links when appropriate.
- Gap/Observation
  - Modern reproduces the bridge behavior, including restoration of soft-deleted links, aligning with the legacy intent.
3) Due date calculation
- Legacy (Yii)
  - Due date rule: derived from the first lesson in the payment cycle; dueDate is the 15th day of the previous month relative to the first cycle lesson date.
- Modern (API)
  - Flow: PaymentCycleLesson -> afterSave computes firstLesson and sets dueDate to the 15th of the previous month relative to that first lesson.
  - Notable detail: there is a discrepancy in canceled vs unscheduled handling in modern code (see next item).
- Gap/Observation
  - Notation in modern code uses Not(5) (Not UNSCHEDULED) for determining due-date applicability, while the enum defines CANCELED as 4. This means canceled lessons may be treated differently in modern due-date recomputation than in legacy.
4) Permanent Schedule Change (PSC) data transfer / billing graph
- Legacy (Yii)
  - Flow: PSC replaces an old lesson; the old lesson’s billing graph (payment_cycle_lesson, lesson_payment, credit references, old dueDate) is moved to the replacement lesson. Financial lineage is preserved, not recomputed from the replacement date.
  - Key mechanism: LessonReschedule::save() path moves links; replacement due-date preserved from the old lesson.
- Modern (API)
  - Flow: PSC replacement handling is implemented in LessonConfirmationService (and related services) with explicit steps to:
    - Move/transplant payment_cycle_lesson and lesson_payment to the replacement lesson.
    - Preserve the old dueDate for the replacement lesson.
    - Transfer or mirror discounts and related references as needed.
    - Update payment_cycle_lesson to point at the replacement.
  - Notable detail: modern includes a dedicated PSC move path (e.g., PSC_MOVE) and tests/harness around it.
- Gap/Observation
  - Parity is pretty good, but there are open notes in the modern flow about gaps in exact parity for teacher-change PSC paths and some edge-case handling (e.g., due-date preservation in all PSC sub-paths).
5) Recurring payment execution (runtime)
- Legacy (Yii)
  - Flow: RecurringPaymentController (actionCreate, actionMissingRecurringPayment) and the Yii scheduler run daily to:
    - Pick due customer_recurring_payment rows by nextEntryDay.
    - Create Payment and RecurringPayment, advance nextEntryDay.
    - Allocate lessons by dueDate <= payment date, creating LessonPayment lines.
- Modern (API)
  - Flow: Recurring-payment APIs exist for configuration (create/update/list/delete) and related cron/services exist (e.g., customer balance, customer status), but there is no clear modern recurring-payment executor in smw-api2.
  - Gap/Observation: The explicit modern recurring-payment executor (the runtime that creates payments, lesson_payments, and advances nextEntryDay) is not found in the current smw-api2 codebase. The legacy scheduler appears to be the production owner in the observed setup.
- Gap/Observation
  - This is a major modernization gap: porting the recurring-payment executor (or proving it via a modern cron) is not yet done.
6) Invoicing / post-lesson billing
- Legacy (Yii)
  - Flow: InvoiceController handles allCompletedLessons and allExpiredLessons to generate invoices for completed/eligible lessons.
- Modern (API)
  - Flow: There are admin UI and backend hooks for invoices tied to the modern billing graph, but automated daily invoice generation in the modern API cron pipeline is not clearly present.
- Gap/Observation
  - The legacy automatic invoice executor exists; the modern path needs a port or equivalent cron to cover automatic invoicing end-to-end.
7) Canceled vs canceled-like states in due-date logic
- Legacy: Not explicitly shown here, but due-date logic uses the legacy status (likely excluding canceled lessons properly).
- Modern: Not(5) is used to filter in due-date calculation, but LessonStatusEnum.CANCELED equals 4, so Not(5) excludes UNSCHEDULED, not necessarily canceled. This is a known mismatch and is flagged as an issue to fix.
8) UI integration for PSC date boundaries
- Modern Web UI has enhancements to PSC date defaulting (start-of-month boundary) and UI flows to pass the PSC effective date into the API.
- This aligns the UI with modern API expectations (PSC starts at month boundary).
9) Test harnesses and parity/damage testing
- Modern: There are tests under tests/smw-1074 (and related harnesses) in the API side, including DB integration harness, parity tests, and migration validation tests.
- Legacy: There are separate legacy test setups; not in the API codebase here.
- Gap/Observation
  - The modern harness aims to replicate legacy risk signatures, but the runtime flow (recurring payments) is still not ported in modern cron, so end-to-end parity tests for the runtime remain challenging.
Bottom-line gaps to address (from Option A mapping)
- Recurring-payment executor port: Implement or port a modern recurring-payment runner in smw-api2 cron/services to replace the legacy daily executor, with tests that exercise nextEntryDay, payment creation, lesson selection by dueDate, and lesson_payment creation.
- Due-date calculation parity: Fix Not(5) usage to Not(LessonStatusEnum.CANCELED) so canceled lessons are excluded from due-date calculations, matching legacy behavior.
- PSC parity for teacher-change paths: Align confirmEnrolmentTeacherChange (teacher-change PSC path) with confirmBulkReschedule parity (as in the group PSC path) for billing graph transfer and due-date preservation.
- PSC graph transfer edge cases: Ensure replacement’s private_lesson dueDate and movement of payment_cycle_lesson are consistently updated across all PSC paths (bulk PSC vs. teacher-change PSC).
- Invoicing parity: Port the legacy invoice-executor workflow or provide a modern equivalent to run daily and generate invoices for completed/expired lessons.
- Cross-check across areas: Validate that createPaymentCycleLessons, PaymentCycle->payment_cycle_lesson linking, and dueDate propagation behave identically for:
  - Normal enrolments
  - PSC replacements
  - Cancellations and unscheduled scenarios
  - Month-boundary edge cases (month start boundary calculations)
If you’d like, I can now:
- Produce a concrete patch plan (files to edit in smw-api2) to fix the Not(5) issue and outline a minimal modern recurring-payment executor with tests.
- Or provide a tighter, line-by-line cross-reference table mapping specific legacy methods to their modern equivalents (with file paths) for quick review.
Which would you prefer for the next step?