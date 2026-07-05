import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

/** Sign an arbitrary JSON payload into an opaque `payload.signature` token. */
export function sign(obj: unknown): string {
  const payload = Buffer.from(JSON.stringify(obj)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Verify + decode a token. Returns null if tampered or malformed. */
export function verify<T = any>(token: string): T | null {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}
