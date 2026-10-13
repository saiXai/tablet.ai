# Product Requirements Document (PRD)

**Product Name:** tablet.ai  
**Document Status:** Ready for Review / Engineering Hand-off  
**Version:** 1.0 (MVP)  
**Target Release:** Q4 2026  

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
Medication non-adherence is one of the largest silent drivers of prolonged illness, avoidable complications, and hospital readmissions. Patients regularly forget doses due to:
* **Complex, fragmented regimens:** Multiple tablets with differing cadences (e.g., twice daily after food vs. once at night before food).
* **High friction of manual entry:** Existing reminder apps require painstaking manual typing of drug names, dosages, and daily reminder times.
* **Passive alert fatigue:** Generic phone alarms are easily dismissed, snoozed indefinitely, or ignored when users are not near their main reminder device.

### 1.2 The Solution
**tablet.ai** is an intelligent, low-friction adherence companion. Users simply snap a photo or upload an image/PDF of their pharmacy receipt or prescription bill. An AI vision model extracts medicine names, dosages, food timing, and quantities into a structured review modal. Once confirmed, `tablet.ai` automatically provisions a recurring calendar schedule and orchestrates timely nudges across App Push Notifications and Telegram bots.

---

## 2. Goals & Non-Goals

### 2.1 Goals (MVP)
* **Zero-Friction Ingestion:** Scan a pharmacy bill/receipt and extract medication details with $>90\%$ extraction accuracy on standard printed receipts.
* **Human-in-the-Loop Verification:** Provide an intuitive inline editor so users can review, correct, or adjust schedules before saving.
* **Deterministic Scheduling:** Auto-map before/after food instructions to standard breakfast/lunch/dinner/bedtime windows with custom duration presets (1, 2, 3 weeks, or custom).
* **High-Deliverability Nudges:** Dispatch alerts 5–10 minutes prior via in-app push and Telegram bot messaging.
* **Effortless Adherence Tracking:** Single-tap task clearance with complete undo/revert support and visual daily/weekly adherence streaks.

### 2.2 Non-Goals (Out of Scope for MVP)
* Direct EHR/EMR or pharmacy inventory integration.
* Automated drug-drug interaction contraindication warnings (requires certified clinical regulatory clearance).
* Native iOS/Android background sync without network access (offline OCR).
* WhatsApp Business API integration (deferred to v1.1 due to Meta Business verification timelines; Telegram serves as the conversational channel for MVP).

---

## 3. User Personas

| Persona | Description | Core Motivation & Pain Points |
| :--- | :--- | :--- |
| **Acute Recovery Patient (Primary)** | Prescribed a 5–14 day cycle of antibiotics, pain relief, and vitamins following an illness or outpatient procedure. | Easily gets confused between "before food" vs "after food" and loses track after day 3 as symptoms subside. Needs zero setup effort. |
| **Elderly Caregiver (Secondary)** | Adult child managing a parent's medications or coordinating their weekly dosing. | Needs external messaging alerts (Telegram) so they can remotely nudge their family member or confirm adherence. |
| **Chronic Maintenance User** | Long-term user taking daily blood pressure, thyroid, or diabetes medication. | Needs a reliable, non-intrusive logging dashboard with quick undo if marked by accident. |

---

## 4. Key Metrics & Success Criteria

| Category | Metric | MVP Target |
| :--- | :--- | :--- |
| **Activation** | Receipt Upload to Confirmed Schedule Completion Rate | $\ge 75\%$ |
| **Extraction Quality** | Field Edit Rate per Medication (User overrides of AI output) | $\le 15\%$ of extracted fields modified |
| **Adherence** | Weekly Logged Dose Completion Rate (Doses marked taken / Total scheduled) | $\ge 80\%$ |
| **Engagement** | Nudge-to-Action Time (Time from push/Telegram alert to task check-off) | Median $< 20$ minutes |
| **Error Recovery** | Undo/Uncheck utilization rate | $< 5\%$ of logged actions (validates clear UX) |

---

## 5. End-to-End User Flow

```
[1. Scan / Upload Receipt]
           │
           ▼
[2. AI Extraction Engine (OCR + Multimodal LLM)]
           │
           ▼
[3. Review & Edit Screen] ──(User tweaks dose/times/duration)
           │
           ▼
[4. Confirm & Schedule] ───► Generates recurring calendar slots
           │
           ▼
[5. Multi-Channel Nudge] ──► Telegram / App Push (5-10m before slot)
           │
           ▼
[6. Adherence Logging] ────► Check off dose ◄───► Undo / Edit anytime
           │
           ▼
[7. Dashboard Progress] ───► Daily streak & compliance percentage
```

---

## 6. Functional Requirements & Feature Specifications

### FR-1: Bill / Receipt Upload & Multimodal Extraction
* **1.1 Input Formats:** Support `.jpg`, `.jpeg`, `.png`, and `.pdf` via file picker, drag-and-drop, or native camera capture. Max file size: 10 MB.
* **1.2 Pre-processing:** Auto-orient image, crop perspective, and enhance contrast prior to model ingestion.
* **1.3 AI Extraction Schema:** Parse unstructured invoice lines into structured JSON entities:
  * `tablet_name`: Trade/generic name (e.g., *Amoxicillin 500mg*).
  * `dosage`: Strength/unit (e.g., *1 tablet*, *5ml*).
  * `frequency`: Times per day (e.g., *1-0-1*, *TDS*, *Twice daily*).
  * `food_relation`: `BEFORE_FOOD`, `AFTER_FOOD`, or `WITH_FOOD` / `EMPTY_STOMACH`.
  * `quantity_dispensed`: Total count from receipt (e.g., *10 tabs*).
  * `inferred_duration_days`: Calculated from quantity $\div$ daily frequency (default to 7 days if indeterminate).
* **1.4 Fallback Behavior:** If the image is blurred, unreadable, or not a pharmacy receipt, display a descriptive error prompt: *"Unable to extract medicine details clearly. Please retake the photo or enter details manually."*

---

### FR-2: Human-in-the-Loop Review & Schedule Configuration
* **2.1 Review Interface:** Display a card-based list of all extracted medications alongside a split/preview view of the uploaded bill.
* **2.2 Editable Fields:**
  * Medicine name (free text).
  * Dosage strength and unit (dropdown + text).
  * Timing toggles: Morning, Afternoon, Evening, Bedtime.
  * Meal relation: Segmented control (`Before Food` | `After Food` | `No restriction`).
  * Duration selector: Quick chips (`1 Week (7d)`, `2 Weeks (14d)`, `3 Weeks (21d)`, `Custom`).
* **2.3 Item Management:** Users can delete false-positive extracted items or click `+ Add Another Medicine` manually.
* **2.4 Time Slot Defaults (Configurable in User Profile):**
  * Morning: 08:30 AM (Breakfast)
  * Afternoon: 01:30 PM (Lunch)
  * Evening / Night: 08:30 PM (Dinner)
  * Bedtime: 10:30 PM

---

### FR-3: Calendar & Recurring Task Generation
* **3.1 Task Instantiation:** Upon clicking `Confirm & Activate Schedule`, the system computes and writes individual dose instances into the user’s local schedule database for the chosen date range $[T_{\text{start}}, T_{\text{start}} + \text{duration}]$.
* **3.2 Calendar View:**
  * Built-in Agenda and Day/Week view showing scheduled doses grouped by time of day.
  * Clear pill tags indicating food relation (e.g., `Amoxicillin 500mg • After Breakfast`).
* **3.3 Regimen Extension:** Users can extend the regimen duration at any point without re-scanning the bill.

---

### FR-4: Multi-Channel Reminder & Nudge Engine
* **4.1 Notification Channels:**
  * Native App Push Notifications (Firebase Cloud Messaging / APNs).
  * Telegram Bot (`@TabletAiReminderBot`).
* **4.2 Lead Time:** Nudges trigger deterministically **5 to 10 minutes** before the scheduled dose time (user-configurable; default 10 minutes).
* **4.3 Telegram Integration:**
  * Account linking via a unique 6-digit deep link or `/start <token>` OTP command.
  * Interactive inline buttons on Telegram alerts:
    * `[ ✅ Taken ]`
    * `[ ⏱️ Snooze 15m ]`
    * `[ ❌ Skip ]`
* **4.4 Nudge Copy Examples:**
  * *"Hi! Time for lunch soon. Remember to take your Pantoprazole (1 tab) 10 minutes before eating."*
  * *"Medicine Time: Take Amoxicillin 500mg right after dinner. Reply or tap below once taken!"*

---

### FR-5: Adherence Logging, Undo / Revert & State Machine
* **5.1 Task States:**
  * `PENDING` (Scheduled, not yet due)
  * `DUE` (Within notification window)
  * `COMPLETED` (Marked as taken)
  * `SKIPPED` (Explicitly marked skipped)
  * `MISSED` (Past window without action)
* **5.2 Single-Tap Action:** Tapping the circular checkbox marks the task `COMPLETED` with a subtle haptic feedback vibration and strikes through the row.
* **5.3 Undo & Uncheck Capability:**
  * **Immediate Toast Undo:** A 6-second sticky snackbar with an `[Undo]` action appears immediately upon marking.
  * **Persistent Uncheck:** Users can tap any checked task on the current or previous dates to toggle it back to `PENDING` or edit the logged timestamp.
  * **Audit Log:** State transitions track `updated_at` and `action_source` (`APP_UI` vs `TELEGRAM_BOT`).

---

### FR-6: Patient Adherence Dashboard
* **6.1 Daily Progress Circle:** Displays real-time completion status (e.g., `3 of 4 tablets taken today - 75%`).
* **6.2 Adherence Streak:** Counts consecutive days where 100% of scheduled medications were logged.
* **6.3 Weekly Compliance Heatmap:** Simple 7-day grid showing green dots for completed days, amber for partial, and red for missed doses.

---

## 7. Data Models & Schema Design

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│              User               │       │         PrescriptionScan        │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id: UUID (PK)                   │◄──┐   │ id: UUID (PK)                   │
│ email: String                   │   └───│ user_id: UUID (FK)              │
│ timezone: String                │       │ image_url: String               │
│ telegram_chat_id: String (Null) │       │ raw_extracted_json: JSONB       │
│ default_meal_times: JSONB       │       │ status: COMPLETED | FAILED      │
└─────────────────────────────────┘       └─────────────────────────────────┘
                 │
                 │ 1:N
                 ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                            MedicationSchedule                             │
├───────────────────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                                             │
│ user_id: UUID (FK)                                                        │
│ scan_id: UUID (FK, Nullable)                                              │
│ medicine_name: String                                                     │
│ dosage_instruction: String                                                │
│ food_relation: BEFORE_FOOD | AFTER_FOOD | NONE                            │
│ daily_times: Array[Time] (e.g., ['08:30', '20:30'])                       │
│ start_date: Date                                                          │
│ end_date: Date                                                            │
│ is_active: Boolean                                                        │
└───────────────────────────────────────────────────────────────────────────┘
                 │
                 │ 1:N
                 ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              AdherenceRecord                              │
├───────────────────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                                             │
│ schedule_id: UUID (FK)                                                    │
│ scheduled_for: Timestamp                                                  │
│ status: PENDING | COMPLETED | SKIPPED | MISSED                            │
│ completed_at: Timestamp (Nullable)                                        │
│ channel_source: APP | TELEGRAM | SYSTEM                                   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Edge Cases & Exception Handling

| Scenario | Potential Risk | System Behavior & Mitigation |
| :--- | :--- | :--- |
| **Handwritten Doctor Prescription vs. Printed Receipt** | High OCR hallucination risk | Detect if bill contains printed pharmacy tabular items. If handwriting is detected with low confidence ($< 0.70$), flag fields with an amber warning badge: *"Please double-check dosage before saving"*. |
| **User Changes Timezones** | Misaligned reminders | Store schedules in UTC with user’s local timezone offset. Update schedule triggers upon detecting system timezone drift. |
| **Telegram Network Delay** | Out-of-order checkoffs | Idempotent event webhooks. If a task is already completed via app, tapping `[Taken]` in Telegram updates the Telegram message inline with *"Already logged via App at 08:32 AM"*. |
| **Accidental "Mark All Taken"** | Corrupt adherence metrics | Provide a global "Undo" snackbar and individual card-level toggle states. |
| **Receipt Contains Non-Medication Items** | Syringes, surgical masks, consultation fees parsed as tablets | Model system prompt includes a strict filtering block that discards equipment, tax lines, consultation charges, and consumables. |

---

## 9. Privacy, Security & Medical Disclaimer

* **9.1 Clinical Disclaimer:**  
  * Mandatory disclaimer displayed during onboarding and extraction review:  
    > *"tablet.ai is an organizational assistant and not a medical device or diagnostic service. Always verify extracted tablet names and dosages against your physician’s explicit instructions."*
* **9.2 Data Minimization & Privacy:**  
  * Pharmacy receipt images are processed in an ephemeral memory pipeline.
  * Any personal patient names, addresses, or doctor registration numbers on the bill are automatically masked/redacted in raw extraction logs.
  * Encrypted at rest (AES-256) and in transit (TLS 1.3).

---

## 10. Phased Rollout & Success Milestones

```
Sprint 1-2 (Alpha)       Sprint 3-4 (Beta)            Sprint 5 (V1 Launch)
──────────────────       ─────────────────            ────────────────────
• OCR + Vision LLM       • Recurring calendar         • Full Telegram Bot
  extraction pipeline      engine with custom           two-way sync
• Web/Mobile UI          duration chips               • Production adherence
  Verification Card      • Push notification worker     dashboard & streaks
• Schema validation      • Undo/Uncheck state engine  • User telemetry & feedback
```