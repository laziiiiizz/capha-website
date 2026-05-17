// Rate limiting prevents a single person (or a bot) from spamming a form
// by restricting how many requests they can make in a given time window.
// Without this, someone could submit hundreds of fake bookings in seconds.
// Learn more: https://en.wikipedia.org/wiki/Rate_limiting

// In-memory rate limiter. Module-level state persists for the lifetime of
// the Node.js process. On serverless (Vercel), each warm Lambda instance
// enforces limits independently — adequate for a low-traffic site where
// abuse comes from a single IP, not coordinated across many instances.

// Each entry tracks how many times a key has been seen and when the window resets.
type Entry = { count: number; resetAt: number };

// A Map is like a dictionary: the key is a string (e.g. "book:1.2.3.4") and
// the value is the Entry above. We store one entry per unique IP address.
// Learn more: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
const store = new Map<string, Entry>();

// Tracks the last time we cleaned up expired entries so we don't sweep on every call.
let lastSweep = Date.now();

// Periodically remove entries whose time window has already expired.
// This prevents the Map from growing forever as new IPs visit the site.
// We only sweep once per minute (60_000 ms) to keep the overhead small.
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

/**
 * Returns true if the request is within the allowed rate, false if limited.
 * @param key    Unique bucket identifier, e.g. "book:1.2.3.4"
 * @param limit  Max allowed hits per window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  // Clean up stale entries before checking so the Map stays lean.
  sweep();
  const now = Date.now();
  const entry = store.get(key);

  // This implements a "fixed window" strategy: when there is no entry yet
  // (first visit) or the previous window has expired, start a fresh window
  // with a count of 1 and schedule it to reset after windowMs milliseconds.
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  // Still inside the current window — block if the limit has been reached.
  if (entry.count >= limit) return false;

  // Otherwise increment the counter and allow the request through.
  entry.count++;
  return true;
}
