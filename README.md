# tablet.ai 💊

> **Intelligent Medication Adherence Companion**  
> Snap a photo of your pharmacy receipt or prescription bill to auto-generate personalized medication schedules with timely nudges and adherence tracking.

---

## 🌟 Key Features

* **Zero-Friction Ingestion:** Snap or upload receipts and prescriptions (JPG, PNG, PDF).
* **Multimodal Vision Extraction:** Powered by OpenAI GPT-4o / Gemini Vision with clinical transcription filtering and strict structured JSON schemas.
* **Human-in-the-Loop Review:** Inline editor with before/after food toggles, morning/afternoon/evening/bedtime slots, and flexible duration presets.
* **Deterministic Scheduling & Recurrence:** Auto-materializes daily doses with meal timing pill tags.
* **1-Tap Adherence Tracking:** Single-tap task clearance with celebratory confetti, persistent uncheck, and a 6-second sticky undo snackbar.
* **Adherence Dashboard:** Real-time progress ring, consecutive day streak counter, and 7-day compliance history.
* **Telegram Bot Integration:** Dual-channel reminders 10 minutes before dose with interactive inline buttons (`[ ✅ Taken ]`, `[ ⏱️ Snooze 15m ]`, `[ ❌ Skip ]`).

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Radix UI.
* **Backend:** Next.js App Router API Routes, PostgreSQL 16 schema.
* **AI Engine:** OpenAI Vision API (`gpt-4o-mini` / `gpt-4o`) + Gemini Multimodal Vision.
* **Messaging:** Telegram Bot API (`@TabletAiReminderBot`).

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/saiXai/tablet.ai.git
cd tablet.ai
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your OpenAI API key:
```env
OPENAI_API_KEY="your-openai-api-key"
OPENAI_VISION_MODEL="gpt-4o-mini"
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License
MIT
