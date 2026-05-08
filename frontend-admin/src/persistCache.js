// persistCache.js — Persistent localStorage cache with stale-while-revalidate
// Drop-in alongside the existing in-memory ApiCache in api.js
//
// Strategy:
//   1. On every GET, return localStorage data IMMEDIATELY (0ms feel)
//   2. Fetch fresh data in background, update cache + UI silently
//   3. On login, prefetch last 5 months of stats, fuel, services, challans
//   4. TTLs: dashboard stats 5min, monthly data 30min, lists 2min

const PREFIX = 'fp_pc_';  // persistent cache prefix

// ── TTLs (ms) ────────────────────────────────────────────────────────────────
const TTL = {
  '/admin/stats':             0,                 // always fresh on open
  '/admin/fuel-logs':         2  * 60 * 1000,   // 2 min
  '/admin/service-logs':      2  * 60 * 1000,
  '/admin/challans':          2  * 60 * 1000,
  '/admin/vehicles':          5  * 60 * 1000,
  '/admin/users':             5  * 60 * 1000,
  '/admin/reports':           30 * 60 * 1000,   // 30 min — historical, rarely changes
  default:                    3  * 60 * 1000,
};

function getTtl(path) {
  const base = path.split('?')[0];
  for (const [key, val] of Object.entries(TTL)) {
    if (base.startsWith(key)) return val;
  }
  return TTL.default;
}

function storageKey(path) {
  // Keep keys short — hash the path
  return PREFIX + btoa(path).replace(/[=+/]/g, '').slice(0, 40);
}

// ── Read / Write ─────────────────────────────────────────────────────────────
export function pcGet(path) {
  try {
    const raw = localStorage.getItem(storageKey(path));
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw);
    const age = Date.now() - ts;
    // Return data regardless of age — caller decides if stale
    return { data, age, stale: age > ttl };
  } catch {
    return null;
  }
}

export function pcSet(path, data) {
  try {
    const ttl = getTtl(path);
    localStorage.setItem(storageKey(path), JSON.stringify({ data, ts: Date.now(), ttl }));
  } catch (e) {
    // localStorage full — prune old entries
    pruneOldest();
    try {
      localStorage.setItem(storageKey(path), JSON.stringify({ data, ts: Date.now(), ttl: getTtl(path) }));
    } catch { /* silent */ }
  }
}

export function pcBust(pathPrefix) {
  const keys = Object.keys(localStorage);
  for (const k of keys) {
    if (!k.startsWith(PREFIX)) continue;
    try {
      // We can't reverse the key, so bust all cache entries and check the stored path
      // Alternative: store path alongside data
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed._path && parsed._path.startsWith(pathPrefix)) {
        localStorage.removeItem(k);
      }
    } catch { /* skip */ }
  }
}

export function pcClear() {
  const keys = Object.keys(localStorage);
  for (const k of keys) {
    if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  }
}

function pruneOldest() {
  const entries = [];
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith(PREFIX)) continue;
    try {
      const { ts } = JSON.parse(localStorage.getItem(k));
      entries.push({ k, ts });
    } catch { localStorage.removeItem(k); }
  }
  // Remove oldest 30%
  entries.sort((a, b) => a.ts - b.ts);
  entries.slice(0, Math.ceil(entries.length * 0.3)).forEach(e => localStorage.removeItem(e.k));
}

// ── Stale-While-Revalidate fetch ─────────────────────────────────────────────
// Returns cached data immediately, triggers background refresh.
// onUpdate(freshData) called when network responds.
export function swrFetch(path, fetcher, onUpdate) {
  const cached = pcGet(path);

  if (cached) {
    // Schedule background refresh
    if (cached.stale) {
      fetcher(path).then(fresh => {
        pcSet(path, fresh);
        onUpdate && onUpdate(fresh);
      }).catch(() => { /* silent background fail */ });
    }
    return Promise.resolve(cached.data);  // instant!
  }

  // Nothing cached — fetch normally
  return fetcher(path).then(data => {
    pcSet(path, data);
    return data;
  });
}

// ── Background prefetch: last N months ───────────────────────────────────────
// Call this once after login. Silently warms the cache.
export async function prefetchMonths(fetcher, months = 5) {
  const now = new Date();
  const paths = [];

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth();  // 0-indexed, matches your existing API calls
    paths.push(`/admin/stats?year=${yr}&month=${mo}`);
  }

  // Fetch sequentially with small delays to not hammer the server
  for (const path of paths) {
    const cached = pcGet(path);
    if (cached && !cached.stale) continue;  // already warm and fresh, skip

    await new Promise(r => setTimeout(r, 300)); // stagger 300ms between requests
    fetcher(path).then(data => pcSet(path, data)).catch(() => {});
  }
}

// ── Background sync ───────────────────────────────────────────────────────────
// Call once. Refreshes critical keys every `intervalMs`.
// Returns a cleanup function.
export function startBackgroundSync(fetcher, getCurrentPath, intervalMs = 60_000) {
  const id = setInterval(async () => {
    // Always refresh current month stats
    const now = new Date();
    const statsPath = `/admin/stats?year=${now.getFullYear()}&month=${now.getMonth()}`;
    try {
      const data = await fetcher(statsPath);
      pcSet(statsPath, data);
      getCurrentPath && getCurrentPath(statsPath, data);
    } catch { /* silent */ }
  }, intervalMs);

  return () => clearInterval(id);
}
