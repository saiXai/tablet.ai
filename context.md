# tablet.ai — Context & Status Document

**Last Updated:** October 14, 2026  
**Repository:** [https://github.com/saiXai/tablet.ai](https://github.com/saiXai/tablet.ai)  
**Branch:** `main`  
**Status:** MVP v1.0 Foundation & Interactive Prototype Deployed Locally  

---

## 1. Executive Summary & Product Vision

**`tablet.ai`** is an intelligent, low-friction medication adherence companion designed to eliminate the cognitive overhead and friction of manual regimen entry. Patients take a photo or upload an image/PDF of their pharmacy receipt or prescription bill. An AI vision model parses medicine names, strengths, dosage frequencies, and before/after meal rules into a structured review modal. Once confirmed, the system auto-generates recurring daily adherence task slots and orchestrates timely nudges via Telegram and in-app push notifications.

---

## 2. Technology Stack & Architecture

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Web/PWA** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS | Mobile-first viewport, Lucide icons, Radix UI primitives, Canvas Confetti |
| **Backend API** | Next.js App Router Route Handlers (`src/app/api/v1/`) | Type-safe REST endpoints with strict JSON schemas and atomic state transitions |
| **AI Extraction Engine** | OpenAI Vision (`gpt-4o-mini` / `gpt-4o`) + Gemini 2.5 Flash | Strict clinical transcription prompt, prohibited non-drug inventory filtering, fallback demo mock |
| **Primary Database** | PostgreSQL 16 (DDL in `database/schema.sql`) | Relational schema with UUIDs, JSONB, and enums; dual-mode client with in-memory dev store |
| **Delayed Job Queue** | Redis 7 + BullMQ (Specification defined) | Deterministic reminder dispatch ($T_{\text{dose}} - 10\text{ min}$) |
| **Messaging & Nudges** | Telegram Bot API (`@TabletAiReminderBot`) + Web Push | Interactive inline buttons (`[✅ Taken]`, `[⏱️ Snooze 15m]`, `[❌ Skip]`) |

---

## 3. End-to-End User Flow & State Machine

```
[1. Upload Receipt/Prescription] 
        │ (JPG/PNG/PDF, camera capture)
        ▼
[2. Multimodal Vision Extraction] 
        │ (OpenAI / Gemini structured extraction with strict schema)
        ▼
[3. Review & Verification Modal] 
        │ (Split bill preview, AC/PC meal rules, 1/2/3 week chips, slot toggles)
        ▼
[4. Schedule Materialization] 
        │ (Provisions medication_schedules & bulk materializes adherence_tasks)
        ▼
[5. Multi-Channel Nudges] 
        │ (FCM Push & Telegram Bot alert 10m before scheduled dose)
        ▼
[6. 1-Tap Adherence Logging] 
        │ (1-tap complete, 6-second sticky undo snackbar, persistent uncheck)
        ▼
[7. Dashboard Progress] 
          (Completion ring %, active day streak 🔥, 7-day compliance history)
```

### Task State Machine
* `PENDING` ➔ `DUE` ($T_{\text{dose}} - 10\text{m}$) ➔ `COMPLETED` (single tap) / `SKIPPED` / `MISSED`.
* **Undo & Revert:** 6-second sticky toast allows immediate undo; persistent uncheck allows reverting anytime.

---

## 4. Key Codebase Directory Structure

```
tablet.ai/
├── database/
│   └── schema.sql                  # PostgreSQL 16 DDL & seed data
├── src/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── adherence/[id]/toggle/route.ts  # Atomic task state update & undo
│   │   │   ├── dashboard/daily-summary/route.ts# Today's tasks, streak & compliance rate
│   │   │   ├── scans/process/route.ts          # Image upload & Vision extraction
│   │   │   ├── schedules/batch-create/route.ts # Materializes recurring doses
│   │   │   └── telegram/
│   │   │       ├── connect/route.ts            # Nonce & deep-link token generation
│   │   │       └── webhook/route.ts            # Bot inline callback queries & /start
│   │   ├── globals.css             # Medical-tech Tailwind base styles
│   │   ├── layout.tsx              # Root HTML & Geist fonts
│   │   └── page.tsx                # Main dashboard page
│   ├── components/
│   │   ├── Header.tsx              # Brand bar, scan trigger, Telegram status
│   │   ├── DashboardProgress.tsx   # Circular progress ring, streak, 7-day heatmap
│   │   ├── AdherenceAgenda.tsx     # Today's dose agenda, checkoff, 6s undo toast
│   │   ├── BillScanModal.tsx       # Receipt upload, processing spinner, review editor
│   │   └── TelegramConnectModal.tsx# Bot connection deep-link modal
│   ├── lib/
│   │   ├── db.ts                   # PostgreSQL pool with zero-config in-memory fallback
│   │   └── utils.ts                # cn(), time formatting, meal pill labels
│   ├── services/
│   │   ├── openAIExtraction.ts     # OpenAI GPT-4o-mini Vision extraction engine
│   │   ├── geminiExtraction.ts     # Gemini Vision extraction engine
│   │   └── scheduleEngine.ts       # Dose timestamp & recurrence task materializer
│   └── types/
│       └── index.ts                # TypeScript domain types & interfaces
├── .env.example                    # Environment variables template
├── .env.local                      # Local active configuration
├── package.json                    # Dependencies & scripts
└── README.md                       # Product documentation & quickstart
```

---

## 5. Current Implementation Status

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Next.js 14 Foundation** | ✅ Complete | Verified clean production build (`npm run build`) |
| **Supabase Cloud PostgreSQL** | ✅ Connected & Migrated | Project `Tablet.ai` (`tiskgqqlgobwiyyifqkv`) with live schemas & triggers |
| **OAuth 2.0 & Supabase Auth** | ✅ Configured | Google, Apple, Facebook, Email Magic Link + `/auth/callback` code exchange |
| **Multi-Profile Seed Users** | ✅ Provisioned | `saiphaneendra09@gmail.com` & `saiphanimba09@gmail.com` with active schedules |
| **OpenAI Vision Engine** | ✅ Complete | Uses `gpt-4o-mini` with strict clinical prompt and test fallback |
| **Gemini Vision Engine** | ✅ Complete | Uses `@google/genai` specification |
| **Interactive Agenda UI** | ✅ Complete | 1-tap check-off, confetti, sticky 6-second undo toast, 1-click user switcher |
| **Bill Scan & Review Modal** | ✅ Complete | Side-by-side editing, slot toggles, duration chips (7/10/14/21d) |
| **Telegram Reminder Bot** | ✅ Upgraded | Deep linking (`/start <token>`), `/today`, `/notify` dispatcher & inline buttons |
| **Git Repository** | ✅ Synchronized | Live on GitHub at `https://github.com/saiXai/tablet.ai` (`main`) |
| **Local Dev Server** | ✅ Running | Active at `http://localhost:3000` (HTTP 200 OK) |

---

## 6. Environment Configuration Variables

* `NEXT_PUBLIC_APP_URL`: Base application URL (default: `http://localhost:3000`).
* `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (`https://tiskgqqlgobwiyyifqkv.supabase.co`).
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public API key.
* `OPENAI_API_KEY`: API key for GPT-4o-mini receipt extraction.
* `OPENAI_VISION_MODEL`: Model identifier (default: `gpt-4o-mini`).
* `GEMINI_API_KEY`: Optional Gemini API key.
* `DATABASE_URL`: PostgreSQL connection string (Supabase direct or pooled URI).
* `REDIS_URL`: Redis endpoint for BullMQ delayed reminder workers.
* `TELEGRAM_BOT_TOKEN`: Bot token from `@BotFather`.
* `TELEGRAM_BOT_USERNAME`: Default `TabletAiReminderBot`.
* `TELEGRAM_WEBHOOK_SECRET`: Optional secret for Telegram webhook security.

---

## 7. Upcoming Milestones & Roadmap

1. **Background Reminder Worker:** Set up Redis 7 + BullMQ worker to dispatch real delayed Telegram and Web Push notifications 10 minutes prior to dose slots.
2. **PWA & Offline Support:** Add `manifest.json` and service worker for mobile home-screen installability.
3. **Refill Tracking:** Add alerts when remaining pills drop below a 3-day threshold.
