// In-memory rate limiter. Module-level state persists for the lifetime of
// the Node.js process. On serverless (Vercel), each warm Lambda instance
// enforces limits independently — adequate for a low-traffic site where
// abuse comes from a single IP, not coordinated across many instances.

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
let lastSweep = Date.now();

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
  sweep();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
