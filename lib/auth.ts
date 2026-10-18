/**
 * Session authentication utility using HMAC-SHA256 via Web Crypto API with Buffer fallback.
 * Compatible with Edge Middleware, Server Components, and API Route Handlers.
 */

export const SESSION_COOKIE_NAME = "quehost_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

interface SessionPayload {
  role: "admin";
  iat: number;
  exp: number;
}

function base64UrlEncode(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64url"));
  }
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const cleanSecret = (secret || process.env.SESSION_SECRET || "").trim();
  if (!cleanSecret) throw new Error("SESSION_SECRET is not configured.");
  return crypto.subtle.importKey(
    "raw",
    enc.encode(cleanSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Creates a signed JWT-like session token.
 */
export async function createSessionToken(secret: string): Promise<string> {
  const now = Date.now();
  const payload: SessionPayload = {
    role: "admin",
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const enc = new TextEncoder();
  const payloadStr = JSON.stringify(payload);
  const dataB64 = base64UrlEncode(enc.encode(payloadStr));

  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(dataB64)
  );

  const sigB64 = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${dataB64}.${sigB64}`;
}

/**
 * Verifies a signed session token. Returns true if valid and unexpired.
 */
export async function verifySessionToken(token: string | undefined | null, secret: string): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [dataB64, sigB64] = parts;

  try {
    const key = await getCryptoKey(secret);
    const enc = new TextEncoder();
    const sigBytes = base64UrlDecode(sigB64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      enc.encode(dataB64) as unknown as BufferSource
    );

    if (!isValid) return false;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(dataB64));
    const payload: SessionPayload = JSON.parse(payloadJson);

    if (payload.role !== "admin") return false;
    if (Date.now() > payload.exp) return false;

    return true;
  } catch (err) {
    console.error("Token verification error:", err);
    return false;
  }
}
