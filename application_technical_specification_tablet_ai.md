# Technical Application Specification Document

**System Name:** tablet.ai  
**Target Release:** MVP v1.0  
**Document Status:** Approved for Implementation  
**Primary Architecture:** Event-Driven Microservices / Modular Monolith  

---

## 1. System Architecture Overview

### 1.1 Architecture Diagram

```
                             ┌────────────────────────┐
                             │   Client Applications  │
                             │ (React PWA / Mobile)   │
                             └───────────┬────────────┘
                                         │ HTTPS (REST / SSE)
                                         ▼
                             ┌────────────────────────┐
                             │   API Gateway / Auth   │
                             │  (Reverse Proxy / JWT) │
                             └───────────┬────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
        ▼                                ▼                                ▼
┌───────────────┐              ┌──────────────────┐             ┌───────────────────┐
│ Ingestion &   │              │   Schedule &     │             │ Telegram Gateway  │
│ OCR Service   │              │ Adherence Engine │             │      Webhook      │
└───────┬───────┘              └────────┬─────────┘             └─────────┬─────────┘
        │                               │                                 │
        │ Temp Buffer                   │ Read / Write                    │ Callback Updates
        ▼                               ▼                                 ▼
┌───────────────┐              ┌──────────────────┐             ┌───────────────────┐
│ Ephemeral S3  │              │ PostgreSQL 16    │             │   Telegram Bot    │
│ Object Bucket │              │ (Core Database)  │             │     API (v7+)     │
└───────┬───────┘              └────────┬─────────┘             └───────────────────┘
        │                               │
        ▼                               ▼
┌───────────────┐              ┌──────────────────┐
│ Multimodal AI │              │ Redis 7 / BullMQ │
│ (Vision LLM)  │              │  (Delayed Queue) │
└───────────────┘              └────────┬─────────┘
                                        │
                                        ▼
                               ┌──────────────────┐
                               │ Reminder Worker  │
                               │  (Push & Bot)    │
                               └──────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology Selected | Rationale |
| :--- | :--- | :--- |
| **Frontend Web/PWA** | Next.js 14 (App Router), Tailwind CSS, Lucide, Radix UI | Fast initial load, mobile-first responsive viewport, camera/file capture APIs, PWA installable. |
| **Backend API** | Node.js (TypeScript) / Fastify | Low latency, high I/O throughput for webhook ingestion, strict TypeScript schema sharing. |
| **Primary Database** | PostgreSQL 16 (with JSONB & UUIDv7 extensions) | ACID compliance for schedule generation, relational integrity, flexible JSON schemas. |
| **Job Queue & Cache** | Redis 7 + BullMQ | Reliable delayed task scheduling ($T_{\text{dose}} - 10\text{ min}$), high-throughput state locking. |
| **Multimodal Vision** | Anthropic Claude 3.5 Sonnet / OpenAI GPT-4o Mini Vision API | High fidelity table parsing, handwriting/low-contrast OCR tolerance, JSON Mode enforcement. |
| **Push & Messaging** | Firebase Cloud Messaging (FCM) + Telegram Bot API | Free, high deliverability, dual-channel redundancy. |
| **Object Storage** | Cloudflare R2 / AWS S3 (Lifecycle Rule: 24h Purge) | Ephemeral receipt storage compliant with zero-retention health privacy guidelines. |

---

## 2. Multimodal Receipt Ingestion & Extraction Engine

### 2.1 Image Processing Flow
1. **Client Preprocessing:** Client resizes raw image to a maximum dimension of $2048 \times 2048$ pixels and converts `.heic`/`.png` to `.webp` or `.jpeg` (compression level 0.85) to optimize transmission latency.
2. **Signed Upload:** Client requests a pre-signed short-lived PUT URL from `/api/v1/scans/presigned-url`.
3. **Execution:** File is uploaded directly to Ephemeral Bucket.
4. **Analysis Pipeline:** Backend invokes the Vision LLM with strict response format constraints.

### 2.2 Extraction System Prompt & JSON Schema

```json
{
  "name": "receipt_extraction_schema",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "confidence_score": { "type": "number", "description": "Float between 0 and 1" },
      "is_pharmacy_receipt": { "type": "boolean" },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "medicine_name": { "type": "string" },
            "strength": { "type": "string", "description": "e.g., 500mg, 10mg, 5ml" },
            "dosage_quantity": { "type": "string", "description": "e.g., 1 tablet, 2 drops" },
            "frequency_pattern": { 
              "type": "string", 
              "enum": ["ONCE_DAILY", "TWICE_DAILY", "THRICE_DAILY", "FOUR_TIMES_DAILY", "AS_NEEDED", "UNKNOWN"]
            },
            "meal_timing": { 
              "type": "string", 
              "enum": ["BEFORE_FOOD", "AFTER_FOOD", "WITH_FOOD", "EMPTY_STOMACH", "NONE"]
            },
            "suggested_slots": {
              "type": "array",
              "items": { "type": "string", "enum": ["MORNING", "AFTERNOON", "EVENING", "BEDTIME"] }
            },
            "total_quantity": { "type": "integer" },
            "inferred_duration_days": { "type": "integer" }
          },
          "required": [
            "medicine_name", 
            "strength", 
            "dosage_quantity", 
            "frequency_pattern", 
            "meal_timing", 
            "suggested_slots", 
            "inferred_duration_days"
          ],
          "additionalProperties": false
        }
      }
    },
    "required": ["confidence_score", "is_pharmacy_receipt", "items"],
    "additionalProperties": false
  }
}
```

### 2.3 Post-Extraction Heuristics & Deterministic Mapping
* If `total_quantity` is parsed and `frequency_pattern` is parsed:
  $$\text{inferred\_duration\_days} = \max\left(1, \left\lfloor \frac{\text{total\_quantity}}{\text{daily\_dose\_count}} \right\rfloor\right)$$
* If `suggested_slots` is empty, fallback to the slot default:
  * `ONCE_DAILY` $\rightarrow$ `['MORNING']`
  * `TWICE_DAILY` $\rightarrow$ `['MORNING', 'EVENING']`
  * `THRICE_DAILY` $\rightarrow$ `['MORNING', 'AFTERNOON', 'EVENING']`
* Any receipt line item containing prohibited inventory tokens (`tax`, `consultation`, `syringe`, `needle`, `delivery fee`, `discount`, `gloves`) is purged via deterministic blacklist post-filtering.

---

## 3. Database Schema & Data Models

### 3.1 Relational Schema (PostgreSQL DDL)

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Definitions
CREATE TYPE meal_relation_enum AS ENUM ('BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD', 'NONE');
CREATE TYPE task_status_enum AS ENUM ('PENDING', 'DUE', 'COMPLETED', 'SKIPPED', 'MISSED');
CREATE TYPE channel_source_enum AS ENUM ('APP_UI', 'TELEGRAM', 'SYSTEM_TIMEOUT');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    telegram_chat_id BIGINT UNIQUE NULL,
    telegram_auth_token VARCHAR(64) UNIQUE NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    lead_time_minutes SMALLINT NOT NULL DEFAULT 10,
    meal_slot_preferences JSONB NOT NULL DEFAULT '{
        "morning": "08:30",
        "afternoon": "13:30",
        "evening": "20:30",
        "bedtime": "22:30"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Scans History (Ephemeral metadata only)
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_key VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSING', -- PROCESSING, COMPLETED, FAILED
    confidence_score NUMERIC(3, 2),
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Medication Schedules
CREATE TABLE medication_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    medicine_name VARCHAR(255) NOT NULL,
    strength VARCHAR(64),
    dosage_instruction VARCHAR(128) NOT NULL,
    meal_relation meal_relation_enum NOT NULL DEFAULT 'NONE',
    daily_times TIME[] NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Adherence Tasks (Materialized Doses)
CREATE TABLE adherence_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status task_status_enum NOT NULL DEFAULT 'PENDING',
    completed_at TIMESTAMPTZ NULL,
    channel_source channel_source_enum NULL,
    bullmq_job_id VARCHAR(128) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Query Optimization
CREATE INDEX idx_adherence_user_date ON adherence_tasks(user_id, scheduled_for);
CREATE INDEX idx_adherence_status ON adherence_tasks(status);
CREATE INDEX idx_adherence_schedule_id ON adherence_tasks(schedule_id);
CREATE INDEX idx_users_telegram_chat ON users(telegram_chat_id);
```

---

## 4. REST API Specifications

### 4.1 `POST /api/v1/scans/process`
Ingests an uploaded scan image path and triggers multimodal parsing.

* **Headers:** `Authorization: Bearer <JWT>`
* **Request Body:**
  ```json
  {
    "storage_key": "scans/user_987/receipt_uuid.webp"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "scan_id": "84fd8d71-c0cf-4648-936b-67b1406e2bf1",
    "confidence_score": 0.94,
    "medications": [
      {
        "temp_id": "tmp_01",
        "medicine_name": "Amoxicillin",
        "strength": "500mg",
        "dosage_quantity": "1 capsule",
        "meal_relation": "AFTER_FOOD",
        "suggested_slots": ["MORNING", "EVENING"],
        "inferred_duration_days": 7
      }
    ]
  }
  ```

---

### 4.2 `POST /api/v1/schedules/batch-create`
Commits user-verified medications, provisions recurrence records, and materializes individual adherence tasks.

* **Request Body:**
  ```json
  {
    "scan_id": "84fd8d71-c0cf-4648-936b-67b1406e2bf1",
    "start_date": "2026-10-14",
    "items": [
      {
        "medicine_name": "Amoxicillin",
        "strength": "500mg",
        "dosage_instruction": "1 capsule",
        "meal_relation": "AFTER_FOOD",
        "daily_times": ["08:30:00", "20:30:00"],
        "duration_days": 7
      }
    ]
  }
  ```
* **Processing Logic:**
  1. Transaction begins (`BEGIN`).
  2. Write to `medication_schedules`.
  3. Pre-generate `adherence_tasks` rows for every slot across the duration:
     $$\text{Total Tasks} = \text{duration\_days} \times \text{len}(\text{daily\_times})$$
  4. Dispatch scheduling events to Redis BullMQ worker queue for delayed alerts ($T_{\text{trigger}} = T_{\text{task}} - \text{lead\_time}$).
  5. Transaction commits (`COMMIT`).
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "schedules_created": 1,
    "total_tasks_materialized": 14
  }
  ```

---

### 4.3 `PATCH /api/v1/adherence/:id/toggle`
Atomically marks a task complete, skipped, or reverts back to pending (Undo capability).

* **Request Body:**
  ```json
  {
    "action": "COMPLETE", // Options: "COMPLETE", "REVERT_PENDING", "SKIP"
    "source": "APP_UI"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "id": "c76f62bc-6a6f-4cb1-97b7-5dbfe32560b7",
    "status": "COMPLETED",
    "completed_at": "2026-10-14T08:32:15.110Z",
    "adherence_streak_days": 4
  }
  ```

---

### 4.4 `GET /api/v1/dashboard/daily-summary?date=YYYY-MM-DD`
Fetches tasks, daily completion percentages, and visual heatmap status.

* **Response (200 OK):**
  ```json
  {
    "date": "2026-10-14",
    "total_scheduled": 4,
    "completed_count": 3,
    "completion_rate": 0.75,
    "current_streak_days": 12,
    "tasks": [
      {
        "id": "c76f62bc-6a6f-4cb1-97b7-5dbfe32560b7",
        "medicine_name": "Amoxicillin 500mg",
        "dosage_instruction": "1 capsule",
        "meal_relation": "AFTER_FOOD",
        "scheduled_for": "2026-10-14T08:30:00Z",
        "status": "COMPLETED",
        "completed_at": "2026-10-14T08:32:15Z"
      }
    ]
  }
  ```

---

## 5. Scheduling & Notification Dispatch Engine

### 5.1 Delayed Job Dispatcher (BullMQ + Redis)
To avoid running expensive recurring database scans every second, reminder instances are enqueued directly into Redis as delayed jobs:

$$\Delta t_{\text{delay}} = (T_{\text{scheduled\_for}} - \text{lead\_time\_minutes}) - T_{\text{current\_time}}$$

If $\Delta t_{\text{delay}} \le 0$, the task notification triggers immediately (for immediate schedules).

```
[Schedule Materialization]
            │
            ▼
    [Calculate Delay] ───► delay = (TaskTime - 10m) - Now()
            │
            ▼
   [BullMQ.add('send_nudge', { taskId, userId }, { delay })]
            │
            ▼
  ┌────────────────────────────────────────────────────────┐
  │              Redis Delayed ZSET Engine                 │
  └─────────────────────────┬──────────────────────────────┘
                            │ Time Elapsed
                            ▼
               [Worker: Execute Notification]
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      [Send App Push FCM]       [Send Telegram Bot API]
```

### 5.2 Worker Execution Step
1. Worker receives `{ taskId, userId }`.
2. Check `adherence_tasks.status`:
   * If status is already `COMPLETED` or `SKIPPED`, **bail out** (no reminder needed).
   * If status is `PENDING`, transition status to `DUE`.
3. Fetch user notification preferences:
   * **App Push:** Send via Firebase Admin SDK with high notification priority.
   * **Telegram:** If `user.telegram_chat_id` exists, trigger `POST https://api.telegram.org/bot<TOKEN>/sendMessage`.

---

## 6. Telegram Bot Integration Architecture

### 6.1 Authentication & Deep Linking Workflow
1. User clicks **"Connect Telegram"** in app profile.
2. Server generates a cryptographically secure random nonce (expires in 10 minutes):
   ```sql
   UPDATE users SET telegram_auth_token = 'tk_9f8a3c4b12' WHERE id = :user_id;
   ```
3. App directs user to deep link: `https://t.me/TabletAiReminderBot?start=tk_9f8a3c4b12`.
4. User taps **Start** in Telegram client.
5. Telegram sends Webhook payload to `POST /api/v1/telegram/webhook`:
   ```json
   {
     "message": {
       "chat": { "id": 987654321 },
       "text": "/start tk_9f8a3c4b12"
     }
   }
   ```
6. Backend links `telegram_chat_id = 987654321` to user record where `telegram_auth_token = 'tk_9f8a3c4b12'`, clears token, and responds:
   > *"✅ Linked successfully to tablet.ai! You will now receive timely reminders here."*

### 6.2 Interactive Inline Callback Queries
When a reminder fires, the bot sends an inline keyboard layout:

```
┌────────────────────────────────────────────────────────────┐
│ 🔔 Time for your medicine!                                │
│ Amoxicillin 500mg (1 capsule)                             │
│ 🍽️ Take AFTER breakfast (Scheduled: 08:30 AM)            │
└────────────────────────────────────────────────────────────┘
│  [ ✅ Taken ]   │   [ ⏱️ Snooze 15m ]   │   [ ❌ Skip ]     │
└─────────────────┴───────────────────────┴──────────────────┘
```

#### Callback Payloads:
* `act:chk:<taskId>`: Tapping **[ ✅ Taken ]**
  * Invokes atomic update on DB.
  * Calls Telegram API `editMessageText` to acknowledge in-place:
    > *"✅ Logged! Amoxicillin marked as taken at 08:31 AM."*
* `act:snz:<taskId>`: Tapping **[ ⏱️ Snooze 15m ]**
  * Spawns a new BullMQ job with `delay = 15 * 60 * 1000`.
  * Updates message text:
    > *"⏱️ Snoozed for 15 minutes. We'll remind you at 08:45 AM."*
* `act:skp:<taskId>`: Tapping **[ ❌ Skip ]**
  * Transitions task state to `SKIPPED`.

### 6.3 Concurrency & Idempotency Safeguard
To eliminate dual-logging conflicts between the web app and Telegram, all state modifications use atomic conditional updates:

```sql
UPDATE adherence_tasks
SET 
    status = 'COMPLETED',
    completed_at = NOW(),
    channel_source = :source,
    updated_at = NOW()
WHERE id = :taskId 
  AND status IN ('PENDING', 'DUE')
RETURNING *;
```
If 0 rows are affected (already marked), Telegram `answerCallbackQuery` answers with: *"Already logged via App!"*

---

## 7. State Machine & Adherence Tracking

```
                  ┌──────────────┐
                  │   PENDING    │
                  └──────┬───────┘
                         │ (T - 10 min trigger)
                         ▼
                  ┌──────────────┐
       ┌──────────┤     DUE      ├──────────┐
       │          └──────┬───────┘          │
       │                 │                  │
(User skips)       (User logs taken)   (Window expires +2h)
       │                 │                  │
       ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   SKIPPED    │  │  COMPLETED   │  │    MISSED    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                 (User taps Undo)
                         │
                         ▼
                  ┌──────────────┐
                  │   PENDING    │
                  └──────────────┘
```

### 7.1 Streak Calculation Algorithm
Adherence streaks represent uninterrupted consecutive days where all scheduled doses were completed:

$$\text{Streak}(D) = \begin{cases} 
\text{Streak}(D-1) + 1 & \text{if } \forall \text{ task } \in D: \text{status} = \text{COMPLETED} \\
0 & \text{if } \exists \text{ task } \in D: \text{status} \in \{\text{MISSED}\} \text{ and } D < D_{\text{today}} 
\end{cases}$$

---

## 8. Security, Data Privacy & HIPAA/GDPR Compliance

1. **Ephemeral Image Ingestion:**
   * Raw receipt images uploaded to cloud storage are governed by an automated object lifecycle rule:
     $$\text{Expiration Lifecycle} = 24\text{ hours}$$
   * Once structured JSON is verified and written to the database, image keys can be deleted immediately via background webhook cleanup.
2. **PII/PHI Minimization:**
   * Extraction prompts explicitly prohibit recording patient addresses, invoice payment methods, or credit card details.
   * System models omit medical tax identifiers.
3. **Data Protection at Rest & Transit:**
   * TLS 1.3 enforced across all web/bot traffic.
   * Database storage volumes encrypted via AES-256.
4. **Rate Limiting:**
   * `/api/v1/scans/process`: Restricted to **10 requests / hour / user** to mitigate Vision API token exhaustion.
   * Telegram Webhook: Strict IP validation against official Telegram subnet ranges (`149.154.160.0/20` and `91.108.4.0/22`).

---

## 9. Failure Modes & Edge Case Handling

| Failure Scenario | Detection Trigger | Recovery Mechanism |
| :--- | :--- | :--- |
| **Malformed/Unreadable Bill Image** | Vision LLM returns `is_pharmacy_receipt: false` or `confidence_score < 0.60` | Return HTTP 422 with a structured error payload. Client displays manual-entry fallback form populated with whatever fragments were detected. |
| **Telegram API Outage / Webhook Drop** | Webhook return code $\ge 500$ or timeout ($> 3000\text{ms}$) | Telegram automatically retries callbacks. System relies on fallback App Push notifications via FCM to ensure user does not miss the dose. |
| **Timezone Shift (Traveler)** | Client detects difference between browser `Intl.DateTimeFormat()` and stored `users.timezone` | Prompt user: *"You seem to be in a new timezone (EDT vs IST). Adjust schedules to local time or keep home time?"* |
| **Accidental Checkoff** | User clicks task inadvertently | Frontend displays 6-second undo toast; DB accepts state toggle back to `PENDING` at any time without data loss. |

---

## 10. Implementation Plan & Milestones

```
Sprint 1: Core Foundation & Ingestion
├── Ephemeral S3 storage presigned flow
├── Vision LLM prompt pipeline & JSON parser
└── PostgreSQL schema migration & seeds

Sprint 2: Schedule & Adherence Core
├── Recurring task generator engine
├── API CRUD: /schedules and /adherence/toggle
└── Front-end Agenda / Verification Modal

Sprint 3: Notification Worker & Telegram
├── Redis 7 + BullMQ delayed queue setup
├── Telegram Bot webhook handler & deep-linking
└── Interactive callback button actions

Sprint 4: Hardening, Polish & Launch
├── Concurrency testing on toggle endpoints
├── Zero-retention image purge verification
└── Dashboard streak & compliance calculation
```