# TRIZ Arena — 2AFC evaluation game

A blind, gamified **two-alternative forced-choice** app for evaluating whether a
TRIZ-guided AI agent writes better engineering solutions than an unguided one.

Raters see a problem and two anonymous solutions (one TRIZ-on, one TRIZ-off, for
the same problem and model) and pick the better one. Choices are stored for
analysis. Built with Next.js (App Router) + Tailwind + framer-motion, deployable
to Netlify (or Vercel).

## How it works

- **Pre-generated solutions** are baked into `data/pairs.json` (built from the
  sibling `triz-on-vs-off-agent` project), so the app needs no model API keys.
- **Bias controls** are built in:
  - position randomized per round (which side is TRIZ) — see `leftChosenRate`;
  - balanced sampling spreads cases before repeating across models;
  - solutions are blind (labelled only A / B).
- **Anti-peek integrity**: sessions are assembled server-side and the browser
  receives only an opaque, HMAC-**signed token** per round — the triz/control
  mapping never reaches the client (no devtools cheating). The arm is revealed
  only *after* each choice, for the end-screen tally.
- **Storage**: Firebase Firestore in production (persistent, works on Netlify);
  Postgres (Neon) as an alternative; a local `.data/responses.ndjson` fallback so
  it runs with zero setup in `next dev`. Backend is chosen by which env vars are
  set (Firebase > Neon > file) — see `lib/db.ts`.

**Current pairs**: `data/pairs.json` holds only the **ELEC-042** (PC-mouse / RSI)
probe — 8 matched pairs (4 models × k2). Previous casebases were flushed; backups
live in `.data/_backup_pre_mouse/`.

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000  (writes to ./.data/responses.ndjson)
```

Regenerate the baked pairs after a new generation run:

```bash
npm run build:pairs    # reads ../triz-on-vs-off-agent/data/generations/*.json
```

## Deploy to Netlify (with Firebase Firestore)

Results must persist across visits, and Netlify's filesystem is read-only — so use
Firebase Firestore. `netlify.toml` already wires the Next.js plugin (the API routes
run as serverless functions).

**1. Create the Firebase store (one-time):**
- [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
- **Build → Firestore Database → Create database** (production mode; any region).
- **⚙ Project settings → Service accounts → Generate new private key** → downloads a JSON.

**2. Push this folder to GitHub**, then in Netlify: **Add new site → Import from Git**,
pick the repo. Netlify auto-detects Next.js (build `npm run build`).

**3. Set env vars** (Site settings → Environment variables) — from that JSON:
   - `FIREBASE_PROJECT_ID` — the JSON's `project_id`.
   - `FIREBASE_CLIENT_EMAIL` — the JSON's `client_email`.
   - `FIREBASE_PRIVATE_KEY` — the JSON's `private_key`, **quoted, with literal `\n`**:
     `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`
   - `SESSION_SECRET` — long random string (signs the anti-peek round tokens).
   - `EXPORT_TOKEN` — password for `/api/export`, `/api/stats`, `/results`.
   - `NEXT_PUBLIC_SESSION_LENGTH` — `8` (there are 8 ELEC-042 pairs).

**4. Deploy.** The `responses` collection is created on the first write. Share the URL.

> The local `.data/responses.ndjson` fallback only works in `next dev`. In
> production the Firebase vars must be set, or writes will fail on Netlify's
> read-only filesystem. (Neon Postgres via `DATABASE_URL` also still works if you
> prefer it — Firebase just takes priority when both are set.)

## Get the data

- **Live dashboard**: `/results?token=YOUR_EXPORT_TOKEN`
- **CSV**: `/api/export?token=YOUR_EXPORT_TOKEN`
- **JSON**: `/api/export?token=YOUR_EXPORT_TOKEN&format=json`
- **Aggregates JSON**: `/api/stats?token=YOUR_EXPORT_TOKEN`

Each CSV row is one choice: `model`, `case_id`, `triz_side`, `chosen_side`,
`chosen_arm` (`triz`/`control`), `time_ms`, optional `rater_label`/`expertise`.
Drop it into the analysis pipeline in `triz-on-vs-off-agent` for win-rate CIs.

## Configuration

| Env | Purpose | Default |
|---|---|---|
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firestore service account (persistent store). All three → Firebase backend. | — |
| `FIREBASE_COLLECTION` | Firestore collection name. | `responses` |
| `DATABASE_URL` | Postgres (Neon), used only if Firebase unset. | — |
| `SESSION_SECRET` | HMAC key for round tokens. **Set in prod.** | dev secret |
| `EXPORT_TOKEN` | Guards export/stats/results. | unset = open |
| `NEXT_PUBLIC_SESSION_LENGTH` | Comparisons per session. | 20 |

## Caveat on blinding

Solutions are shown **as generated**, so a TRIZ answer that literally says
"applying Principle 24…" may signal its arm to an attentive rater. This matches
the project decision to keep TRIZ presentation visible; the result measures the
whole TRIZ package (reasoning + presentation). To test substance alone, swap in
normalized solution text in `data/pairs.json` — no app changes needed.
