// SERVER-ONLY storage layer. Backend priority:
//   1. Firebase Firestore  — when FIREBASE_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY are set
//      (persistent, works on Netlify functions — the recommended production store);
//   2. Postgres (Neon)     — when DATABASE_URL is set;
//   3. Local ndjson file   — ./.data/responses.ndjson  (zero-setup local dev only).
//
// All three read/write the SAME snake_case shape, so /api/export and /api/stats
// are backend-agnostic.
import { promises as fs } from "fs";
import path from "path";
import type { StoredResponse } from "./types";

const DB_URL =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;

const FB_PROJECT = process.env.FIREBASE_PROJECT_ID;
const FB_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FB_KEY = process.env.FIREBASE_PRIVATE_KEY;
// Alternative to the 3 vars above: a path to the service-account JSON file
// (handy for local dev). Env vars take priority on Netlify/Vercel.
const FB_KEY_FILE =
  process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const USE_FIREBASE = Boolean((FB_PROJECT && FB_EMAIL && FB_KEY) || FB_KEY_FILE);
const FB_COLLECTION = process.env.FIREBASE_COLLECTION || "responses";

let schemaReady = false;

// snake_case shape — identical to the Postgres columns, so every store reads alike
function toRow(r: StoredResponse) {
  return {
    session_id: r.sessionId,
    rater_label: r.raterLabel ?? null,
    expertise: r.expertise ?? null,
    pair_id: r.pairId,
    case_id: r.caseId,
    model: r.model,
    triz_side: r.trizSide,
    chosen_side: r.chosenSide,
    chosen_arm: r.chosenArm,
    round_index: r.roundIndex,
    time_ms: r.timeMs,
    user_agent: r.userAgent ?? null,
  };
}

// ---------- Firebase Firestore ----------
let _admin: any = null;
let _fsdb: any = null;

async function firestore() {
  if (_fsdb) return { admin: _admin, db: _fsdb };
  const mod: any = await import("firebase-admin");
  const admin = mod.default ?? mod;
  if (!admin.apps.length) {
    let cred;
    if (FB_KEY_FILE) {
      // Load the service-account JSON from disk (local dev).
      const { readFileSync } = await import("fs");
      const sa = JSON.parse(readFileSync(path.resolve(FB_KEY_FILE), "utf8"));
      cred = admin.credential.cert(sa);
    } else {
      cred = admin.credential.cert({
        projectId: FB_PROJECT,
        clientEmail: FB_EMAIL,
        // Netlify/Vercel env vars store the PEM with literal "\n" — restore real newlines.
        privateKey: FB_KEY!.replace(/\\n/g, "\n"),
      });
    }
    admin.initializeApp({ credential: cred });
  }
  _admin = admin;
  _fsdb = admin.firestore();
  return { admin, db: _fsdb };
}

// ---------- Postgres (Neon) ----------
async function getSql() {
  const { neon } = await import("@neondatabase/serverless");
  return neon(DB_URL!);
}

async function ensureSchema(sql: any) {
  if (schemaReady) return;
  await sql`create table if not exists responses (
    id bigserial primary key,
    session_id text not null,
    rater_label text,
    expertise text,
    pair_id text not null,
    case_id text not null,
    model text not null,
    triz_side text not null,
    chosen_side text not null,
    chosen_arm text not null,
    round_index int,
    time_ms int,
    user_agent text,
    created_at timestamptz not null default now()
  )`;
  schemaReady = true;
}

// ---------- local ndjson fallback ----------
const fileStore = () => path.join(process.cwd(), ".data", "responses.ndjson");

// ---------- public API ----------
export async function insertResponse(r: StoredResponse): Promise<void> {
  if (USE_FIREBASE) {
    const { admin, db } = await firestore();
    await db.collection(FB_COLLECTION).add({
      ...toRow(r),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }
  if (DB_URL) {
    const sql = await getSql();
    await ensureSchema(sql);
    const c = toRow(r);
    await sql`insert into responses
      (session_id, rater_label, expertise, pair_id, case_id, model,
       triz_side, chosen_side, chosen_arm, round_index, time_ms, user_agent)
      values (${c.session_id}, ${c.rater_label}, ${c.expertise}, ${c.pair_id},
              ${c.case_id}, ${c.model}, ${c.triz_side}, ${c.chosen_side}, ${c.chosen_arm},
              ${c.round_index}, ${c.time_ms}, ${c.user_agent})`;
    return;
  }
  const dir = path.dirname(fileStore());
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(
    fileStore(),
    JSON.stringify({ ...toRow(r), created_at: new Date().toISOString() }) + "\n",
  );
}

export async function allResponses(): Promise<any[]> {
  if (USE_FIREBASE) {
    const { db } = await firestore();
    const snap = await db.collection(FB_COLLECTION).orderBy("created_at").get();
    return snap.docs.map((d: any) => {
      const x = d.data();
      const ca = x.created_at;
      return {
        id: d.id,
        ...x,
        created_at: ca?.toDate ? ca.toDate().toISOString() : ca ?? null,
      };
    });
  }
  if (DB_URL) {
    const sql = await getSql();
    await ensureSchema(sql);
    return (await sql`select * from responses order by created_at`) as any[];
  }
  try {
    const txt = await fs.readFile(fileStore(), "utf8");
    return txt.trim() ? txt.trim().split("\n").map((l) => JSON.parse(l)) : [];
  } catch {
    return [];
  }
}

export const usingDb = Boolean(USE_FIREBASE || DB_URL);
export const storageBackend = USE_FIREBASE ? "firebase" : DB_URL ? "postgres" : "file";

// ---------- p40 review ballots (the /review tab) ----------
// One ballot = one (rater, problem, model) rating: up to 3 starred principles
// out of the 40, like/dislike votes on the 3 non-principle prompts, and an
// explicit "none of the 40 beats the baselines" flag. Stored in a separate
// Firestore collection (or a local ndjson in dev). Postgres is not used here.
const FB_REVIEWS = process.env.FIREBASE_REVIEWS_COLLECTION || "p40_reviews";
const reviewFileStore = () => path.join(process.cwd(), ".data", "reviews.ndjson");

export type ReviewBallot = {
  rater_label: string;
  expertise: string | null;
  case_id: string;
  model: string;
  picks: string[];             // e.g. ["P13","P02"] (max 3)
  none_better: boolean;
  vote_t_off: number;          // 1 like, -1 dislike, 0 no vote
  vote_t_on: number;
  vote_all40: number;
  created_at?: string;
};

export async function insertReview(b: ReviewBallot): Promise<void> {
  if (USE_FIREBASE) {
    const { admin, db } = await firestore();
    await db.collection(FB_REVIEWS).add({
      ...b,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }
  const dir = path.dirname(reviewFileStore());
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(
    reviewFileStore(),
    JSON.stringify({ ...b, created_at: new Date().toISOString() }) + "\n",
  );
}

export async function allReviews(): Promise<any[]> {
  if (USE_FIREBASE) {
    const { db } = await firestore();
    const snap = await db.collection(FB_REVIEWS).orderBy("created_at").get();
    return snap.docs.map((d: any) => {
      const x = d.data();
      const ca = x.created_at;
      return { id: d.id, ...x, created_at: ca?.toDate ? ca.toDate().toISOString() : ca ?? null };
    });
  }
  try {
    const txt = await fs.readFile(reviewFileStore(), "utf8");
    return txt.trim() ? txt.trim().split("\n").map((l) => JSON.parse(l)) : [];
  } catch {
    return [];
  }
}
