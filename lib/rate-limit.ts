// limits bookings per IP to stop spam — in-memory, resets on server restart
// each entry = how many times a key was hit and when the window resets
type Entry = { count: number; resetAt: number };

// key = "book:<ip>", value = Entry — one entry per IP
const store = new Map<string, Entry>();

let lastSweep = Date.now();

// cleans expired entries every minute so the Map doesn't grow forever
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

// returns true if under the limit, false if blocked — called in actions.ts
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  sweep();
  const now = Date.now();
  const entry = store.get(key);

  // no entry or window expired — start a fresh window
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
