/**
 * In-memory sliding window rate limiter for secondary IP capping.
 * Caps submissions to 5 per IP per hour as requested in specification.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const ipRecords = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

/**
 * Checks if the given IP address is allowed to submit a question.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds: number }.
 */
export function checkIpRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const cleanIp = ip || "unknown-ip";

  let record = ipRecords.get(cleanIp);
  if (!record) {
    record = { timestamps: [] };
    ipRecords.set(cleanIp, record);
  }

  // Remove timestamps outside the 1-hour window
  record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  record.timestamps.push(now);
  return { allowed: true };
}

/**
 * Extracts client IP from standard request headers.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
