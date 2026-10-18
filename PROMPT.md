# Build: Live Q&A Web App (Quehost)

Mobile-first web app for an interactive event with a guest speaker. Must handle ~500 concurrent attendees on free tiers.

## Stack (fixed, don't substitute)
Next.js (App Router) + Tailwind, deployed on Vercel. Supabase Postgres (via `@supabase/supabase-js`, service-role key server-side only). Gemini API (`gemini-2.0-flash`) for grouping. Env vars: `ADMIN_PASSWORD`, `SESSION_SECRET`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `EVENT_TITLE`, `SPEAKER_NAME`, `PUBLIC_URL`.

## Schema
- `questions(id uuid pk, device_id text, text varchar(300), created_at timestamptz)`
- `settings(key text pk, value text)` — key `open` = `true|false`
- `clusters(id serial pk, title text, count int, question_ids uuid[], run_at timestamptz)` — replaced on each grouping run.
Provide a `schema.sql` to paste into Supabase.

## Attendee (`/`, public, no login)
Only: event title, one text input, Submit. Show "Question 2 of 5" counter; clear input after submit; after 5 show "Thanks, all done!". If submissions are closed, show "Submissions are closed." No other data (no questions, counts, rankings) is ever sent to this page or its APIs.
- Device ID: random UUID in a cookie + localStorage.
- Limit of 5 per device enforced **server-side** in `POST /api/submit` (count rows by `device_id`), plus max 5 per IP per hour as a secondary cap. Trim, strip HTML, reject empty/>300 chars, reject when `open=false`. Return generic errors. Show a friendly retry message on network failure and keep the typed text.

## Host (`/admin`, password protected)
Login via `ADMIN_PASSWORD`; server-verified; signed httpOnly cookie using `SESSION_SECRET`. All `/admin`, `/qr`, and `/api/admin/*` routes reject without it (return 401). Dashboard:
- Live totals: questions, unique devices (poll every 10s).
- **"Group & Rank"** button: runs grouping, shows clusters sorted by count desc: title, count, expandable original questions.
- **Open/Close submissions** toggle (the "done" button; closing also auto-triggers grouping).
- **Present mode**: full-screen, large text, top 10 clusters with counts.
- Export CSV, Reset all (with confirm).
- `/qr`: QR of `PUBLIC_URL` with downloadable PNG.

## Grouping logic (important)
Questions are multilingual/mixed (English, Hindi, Hinglish etc.; e.g. "how to start DSA" = "DSA kaise start karna hai"). Do NOT use fixed-threshold embeddings. Instead:
1. Fetch all questions with ids. Send to Gemini in one call (batch in chunks of ~300 if larger) with a prompt: group questions with the same intent regardless of language/spelling; return strict JSON `[{"title":"short English title","ids":[...]}]`; every id must appear exactly once. Use `responseMimeType: application/json`.
2. Validate JSON; assign any missing ids to singleton clusters; if multiple chunks, run a second call merging chunk titles.
3. Count = number of **distinct devices** per cluster (one person repeating the same thing counts once). Sort desc. Save to `clusters`.
4. If Gemini fails: retry twice, then fall back to simple normalized-text grouping and show a warning banner in admin. Never lose submissions.

## Build order
1. `schema.sql`, Supabase client, env example (`.env.example`).
2. Submit API + attendee page.
3. Admin auth + dashboard shell.
4. Grouping API + ranking UI + present mode + toggle.
5. QR page, CSV export, reset.
6. `scripts/seed.ts` inserting ~40 fake multilingual questions (DSA, journey, placements, in English/Hinglish/Hindi) to test grouping locally.
7. README: setup, Supabase steps, env vars, Vercel deploy, pre-event checklist.

## Quality
Mobile-first UI, large tap targets, clean simple design. Handle concurrency (use DB count check inside the insert, e.g. an RPC or conditional insert, to avoid exceeding 5 under double-taps). No secrets in client bundle. Verify `npm run build` passes and the seed test groups correctly before finishing.
