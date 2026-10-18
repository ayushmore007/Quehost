# Build: Live Q&A Web App (Quehost)

Mobile-first web app for an interactive event with a guest speaker. Free/cheap to host.

## Roles
**Attendee** (scans QR → `/`): no login. Sees only a clean form: one question input + Submit. Allowed 5 questions per device (track via localStorage + server-side by anonymous device ID). After each submit, clear input and show "Question 2 of 5". After 5: "Thanks! All done." Nothing else visible — no other questions, rankings, or counts. Questions may be in any language/mix (English, Hindi, Hinglish, etc.).

**Host/Team** (`/admin`): password-protected (env var `ADMIN_PASSWORD`, server-verified, signed session cookie). Dashboard shows:
- Ranked list of question *clusters*, sorted by count (desc), with count, a representative question (English), and expandable original variants.
- "Process / Refresh" button (and optional auto-refresh every 15s) to re-cluster.
- Total questions + total participants, projector-friendly "Present mode" (large text, top N).
- Export CSV, and a Reset button (confirm).

## Core logic
Cluster semantically similar questions across languages (e.g. "how to start DSA" ≈ "DSA kaise start karna hai"). Use multilingual embeddings (e.g. Gemini `text-embedding-004` or OpenAI embeddings) + cosine similarity threshold clustering (~0.8, tunable), then one LLM call (Gemini Flash) to label each cluster with a short English title. Cache embeddings per question; only embed new ones. Rank clusters by number of questions. Count each device's duplicate within a cluster once.

## Stack
Next.js (App Router) + Tailwind, deploy on Vercel. Storage: Supabase/Vercel Postgres/Firebase (pick simplest). API keys in env vars; never exposed to client. Rate-limit submissions per IP/device; max 300 chars/question; sanitize input.

## Also
- `/qr` (admin only): generates and displays the QR code for the public URL, downloadable PNG.
- Event title on attendee page: "Ask Love Babbar" — IEEE Student Branch, IIT Pune (configurable via env).
- Include README with setup, env vars, and deploy steps.
