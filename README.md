# Quehost — Real-Time Live Audience Q&A Web App

Mobile-first live Q&A web app built for interactive speaker events and conferences. Engineered to handle ~500 concurrent attendees smoothly on free tiers (Vercel + Supabase free plan) with zero client secrets and intelligent multilingual intent grouping using **Gemini 2.0 Flash**.

---

## ⚡ Key Highlights

- **Distraction-Free Attendee Experience (`/`)**: Mobile-first, fast load, single input, clean 5-question counter ("Question 2 of 5"), instant feedback.
- **Strict Privacy & Free-Tier Optimization**: Zero questions, total counts, or cluster rankings are ever sent to attendees or attendee APIs.
- **Multilingual Semantic Intent Grouping (`gemini-2.0-flash`)**: Groups Hindi, English, Hinglish, and transliterated questions that share the same intent (e.g., *"DSA kaise start karein?"* = *"How to start DSA as a beginner?"*).
- **Concurrency & Double-Tap Protection**: Server-side RPC atomic check prevents exceeding 5 questions per device even under rapid double-taps.
- **Secondary Network Rate Limiting**: Caps submissions per IP per hour to protect against spam bots.
- **Host Administration (`/admin`)**: Password protected with signed HTTP-only cookies, live auto-polled totals (every 10s), Open/Close submissions toggle (closing auto-triggers grouping), "Group & Rank" trigger, CSV export, and safe reset.
- **Stage Present Mode (`/admin/present`)**: High-contrast, huge typography, top 10 intent clusters with distinct attendee counts, designed for projector and large auditorium screens.
- **Dynamic QR Generator (`/qr`)**: Instant QR generation for event slides with downloadable high-res 1024x1024 PNG.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router) + TypeScript
- **Styling**: Tailwind CSS (dark mode glassmorphism)
- **Database**: Supabase Postgres (accessed via `@supabase/supabase-js` using service-role key exclusively on the server)
- **AI Clustering**: Google Gemini API (`gemini-2.0-flash`) with structured JSON mode and multi-chunk merge pass
- **Authentication**: Signed HTTP-only session cookies via Web Crypto HMAC-SHA256 (no native compilation dependencies)
- **Deployment**: Vercel

---

## 📋 Database Schema (`schema.sql`)

The database consists of three simple, high-performance tables and an atomic RPC function:

- `questions(id uuid pk, device_id text, text varchar(300), created_at timestamptz)`
- `settings(key text pk, value text)` — key `open` = `'true'|'false'`
- `clusters(id serial pk, title text, count int, question_ids uuid[], run_at timestamptz)` — replaced on each grouping run.
- `submit_question_atomic(p_device_id, p_text, p_max_limit)` — concurrency-safe atomic check & insert.

---

## 🚀 Step-by-Step Setup Guide

### 1. Supabase Postgres Setup
1. Create a free account at [Supabase](https://supabase.com) and create a new project.
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Open [`schema.sql`](./schema.sql) from this repository, copy its entire contents, paste it into the Supabase SQL editor, and click **Run**.
4. Go to **Project Settings** > **API**:
   - Copy the **Project URL** (used as `SUPABASE_URL`).
   - Under **Project API keys**, copy the **`service_role` key** (secret key used as `SUPABASE_SERVICE_KEY`). *Do NOT expose this key to client-side code.*

### 2. Gemini API Key Setup
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Generate a new API key.
3. Save it as `GEMINI_API_KEY`.

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:

```env
# Supabase Postgres Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key-here

# Host / Admin Authentication
ADMIN_PASSWORD=your_secure_admin_password_here
# Min 32 characters random secret for signing session cookies
SESSION_SECRET=super-secret-random-key-at-least-32-chars-long

# Gemini 2.0 Flash API Key for Clustering
GEMINI_API_KEY=AIzaSy...

# Event & Branding Details
EVENT_TITLE=Live Q&A with Speaker
SPEAKER_NAME=Guest Speaker
PUBLIC_URL=http://localhost:3000
```

### 4. Local Installation & Running

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
- **Attendee Page**: `http://localhost:3000/`
- **Host Admin Login**: `http://localhost:3000/admin/login`
- **Host Dashboard**: `http://localhost:3000/admin`
- **Stage Present Mode**: `http://localhost:3000/admin/present`
- **QR Code Page**: `http://localhost:3000/qr`

---

## 🧪 Testing with Multilingual Seed Data

To test the Gemini 2.0 Flash intent grouping locally with ~40 realistic multilingual questions (English, Hindi, and Hinglish across 12 distinct devices):

```bash
# Seed fake questions into Supabase
npm run seed
```

Then:
1. Log in to `/admin` with your `ADMIN_PASSWORD`.
2. Notice the live questions total updates to 42 across 12 attendees.
3. Click **"Group & Rank"**.
4. Observe how Gemini clusters multilingual equivalents into unified topics (e.g., *"DSA kaise start karein?"* grouped with *"How should a complete beginner start learning Data Structures?"*).
5. Open `/admin/present` to view the top 10 clusters formatted for the stage!

---

## 🚢 Deploying to Render (Free Tier)

Render provides a 100% free Node.js Web Service tier with automatic HTTPS and zero credit card requirements:

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "feat: complete live Q&A app"
git push origin main
```

### Step 2: Create a Web Service on Render
1. Go to **[dashboard.render.com](https://dashboard.render.com)** and sign in with GitHub.
2. Click **New +** > **Web Service**.
3. Select your **`Quehost`** repository and click **Connect**.
4. Configure the settings:
   - **Name**: `quehost` (or your preferred name)
   - **Region**: Closest to your attendees (e.g. *Singapore* or *Frankfurt*)
   - **Branch**: `main` (or current branch)
   - **Root Directory**: `Quehost` (if deploying from parent folder, otherwise leave blank)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: **Free**

### Step 3: Add Environment Variables in Render
Under the **Environment Variables** section in the Render setup page, add each key from your `.env.local`:

| Variable | Value |
| :--- | :--- |
| `SUPABASE_URL` | Your Supabase Project URL (`https://...supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Your Supabase `service_role` secret key |
| `ADMIN_PASSWORD` | `ieeeadmin@26` |
| `SESSION_SECRET` | `quehost_session_secret_9f83a7c2b4e105d862f91a3c75e4b2d0` |
| `GEMINI_API_KEY` | Your Google AI Studio key (`AQ.Ab8RN6...`) |
| `EVENT_TITLE` | `IEEE Live Q&A Session` |
| `SPEAKER_NAME` | `Love Babbar` |
| `PUBLIC_URL` | Your Render URL (e.g. `https://quehost.onrender.com`) |

### Step 4: Click "Create Web Service"
Render will build the Next.js app and provide your live URL (e.g. `https://quehost.onrender.com`).
Now, any phone scanning the QR code anywhere in the world will immediately load the attendee Q&A page!

---

## 🚢 Deploying to Vercel (Alternative)

1. Push this repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New** > **Project** and import your repository.
3. In the **Environment Variables** section, configure the same environment variables listed above.
4. Click **Deploy**.

---

## 🎯 Pre-Event Checklist (Speaker / Moderator)

Run through this 10-point checklist 30 minutes before your live session:

- [ ] **1. Run `schema.sql` in Supabase**: Verify `questions`, `settings`, and `clusters` tables exist and RLS is enabled.
- [ ] **2. Verify Submissions are Open**: Check `/admin` to ensure the toggle reads **"Submissions Open"**.
- [ ] **3. Test Attendee Submission**: Open `/` on your mobile phone, submit a sample question, verify the counter increments ("Question 2 of 5"), and verify input clears.
- [ ] **4. Test 5-Question Limit**: Submit 5 test questions on your phone and verify the *"Thanks, all done!"* screen displays.
- [ ] **5. Test Admin Login & Session**: Log in to `/admin` using `ADMIN_PASSWORD` and verify live totals reflect your test submissions.
- [ ] **6. Test Reset Button**: Click **"Reset All"**, type `RESET`, and confirm test questions are cleared.
- [ ] **7. Verify Gemini Clustering**: Run a quick test or verify `GEMINI_API_KEY` has quota in Google AI Studio.
- [ ] **8. Download & Embed QR Code**: Go to `/qr`, download the 1024x1024 PNG, and place it on your opening projector slide.
- [ ] **9. Prepare Stage Present Mode**: Open `/admin/present` on the stage laptop or projector display, test fullscreen mode with <kbd>F</kbd>.
- [ ] **10. Concluding Submissions**: When Q&A starts, click **"Submissions Closed"** on the admin console to automatically lock submissions and cluster audience questions for the speaker.

---

## 🔒 Security & Architecture Notes

1. **Service Role Key Security**: `SUPABASE_SERVICE_KEY` is never included in any client bundle or sent to the browser. All database queries occur inside Next.js server route handlers or server actions.
2. **Attendee Privacy**: Attendees have zero visibility into other attendees' submissions, counts, or rankings.
3. **Double-Tap Protection**: Postgres atomic transactions enforce the 5-question limit server-side, preventing duplicate submissions if an attendee double-taps the submit button on slow cellular networks.
4. **Fallback Clustering**: If the Gemini API experiences network timeouts or rate limits during the event, the app automatically falls back to normalized text grouping, ensuring no submissions are ever lost.
