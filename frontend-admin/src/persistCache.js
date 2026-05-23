// persistCache.js — FIXED VERSION with data validation and corruption prevention
// Drop-in alongside the existing in-memory ApiCache in api.js
//
// Strategy:
//   1. On every GET, return localStorage data IMMEDIATELY (0ms feel)
//   2. Fetch fresh data in background, update cache + UI silently
//   3. On login, prefetch last 5 months of stats, fuel, services, challans
//   4. TTLs: dashboard stats 5min, monthly data 30min, lists 2min
//
// CRITICAL FIXES:
//   - Data validation before storing/retrieving
//   - Corruption detection and auto-recovery
//   - Better error handling
//   - Cache size management

const PREFIX = 'fp_pc_';  // persistent cache prefix
const MAX_CACHE_SIZE_MB = 10;  // Maximum cache size in MB
const MAX_CACHE_ENTRIES = 200;  // Maximum number of cache entries

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

// CRITICAL FIX: Validate data structure before caching
function isValidData(data) {
  // Null/undefined is valid (represents "no data")
  if (data === null || data === undefined) return true;
  
  // Basic type check
  if (typeof data !== 'object') return false;
  
  // Check if it's a valid object or array
  try {
    JSON.stringify(data);
    return true;
  } catch {
    return false;
  }
}

// CRITICAL FIX: Estimate cache size
function estimateCacheSize() {
  let totalSize = 0;
  const keys = Object.keys(localStorage);
  
  for (const key of keys) {
    if (key.startsWith(PREFIX)) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length * 2; // UTF-16 = 2 bytes per char
        }
      } catch {
        // Ignore errors
      }
    }
  }
  
  return totalSize / (1024 * 1024); // Convert to MB
}

// CRITICAL FIX: Count cache entries
function getCacheEntryCount() {
  const keys = Object.keys(localStorage);
  return keys.filter(k => k.startsWith(PREFIX)).length;
}

// ── Read / Write ─────────────────────────────────────────────────────────────
export function pcGet(path) {
  try {
    const raw = localStorage.getItem(storageKey(path));
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    const { data, ts, ttl } = parsed;
    
    // CRITICAL FIX: Validate data structure
    if (!isValidData(data)) {
      console.warn(`Invalid cached data for ${path}, removing`);
      localStorage.removeItem(storageKey(path));
      return null;
    }
    
    // Don't serve null/undefined data — treat as cache miss so a fresh fetch runs
    if (data == null) return null;
    
    const age = Date.now() - ts;
    
    // CRITICAL FIX: Check for corrupted timestamp
    if (isNaN(age) || age < 0 || age > 365 * 24 * 60 * 60 * 1000) {
      console.warn(`Invalid timestamp for ${path}, removing`);
      localStorage.removeItem(storageKey(path));
      return null;
    }
    
    // Return data regardless of age — caller decides if stale
    return { data, age, stale: age > ttl };
  } catch (err) {
    console.error(`Error reading cache for ${path}:`, err);
    // Try to remove the corrupted entry
    try {
      localStorage.removeItem(storageKey(path));
    } catch {
      // Ignore removal errors
    }
    return null;
  }
}

export function pcSet(path, data) {
  // CRITICAL FIX: Don't cache invalid data
  if (!isValidData(data)) {
    console.warn(`Refusing to cache invalid data for ${path}`);
    return false;
  }
  
  try {
    const ttl = getTtl(path);
    const cacheEntry = JSON.stringify({ 
      data, 
      ts: Date.now(), 
      ttl, 
      _path: path,
      _v: 1  // Version number for future migrations
    });
    
    // CRITICAL FIX: Check cache size before storing
    const entrySize = cacheEntry.length * 2 / (1024 * 1024); // MB
    const currentSize = estimateCacheSize();
    
    if (currentSize + entrySize > MAX_CACHE_SIZE_MB) {
      console.warn('Cache size limit reached, pruning old entries');
      pruneOldest();
    }
    
    // CRITICAL FIX: Check entry count
    if (getCacheEntryCount() >= MAX_CACHE_ENTRIES) {
      console.warn('Cache entry limit reached, pruning old entries');
      pruneOldest();
    }
    
    localStorage.setItem(storageKey(path), cacheEntry);
    return true;
  } catch (e) {
    console.error(`Error caching data for ${path}:`, e);
    
    // localStorage full — prune old entries
    pruneOldest();
    
    try {
      localStorage.setItem(
        storageKey(path), 
        JSON.stringify({ 
          data, 
          ts: Date.now(), 
          ttl: getTtl(path), 
          _path: path,
          _v: 1
        })
      );
      return true;
    } catch (retryErr) {
      console.error(`Failed to cache even after pruning:`, retryErr);
      return false;
    }
  }
}

export function pcBust(pathPrefix) {
  const keys = Object.keys(localStorage);
  let removed = 0;
  
  for (const k of keys) {
    if (!k.startsWith(PREFIX)) continue;
    
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      
      const parsed = JSON.parse(raw);
      if (parsed._path && parsed._path.startsWith(pathPrefix)) {
        localStorage.removeItem(k);
        removed++;
      }
    } catch (err) {
      // Remove corrupted entries
      console.warn(`Removing corrupted cache entry ${k}`);
      localStorage.removeItem(k);
      removed++;
    }
  }
  
  console.log(`Busted ${removed} cache entries for ${pathPrefix}`);
}

export function pcClear() {
  const keys = Object.keys(localStorage);
  let removed = 0;
  
  for (const k of keys) {
    if (k.startsWith(PREFIX)) {
      localStorage.removeItem(k);
      removed++;
    }
  }
  
  console.log(`Cleared ${removed} cache entries`);
}

function pruneOldest() {
  const entries = [];
  
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith(PREFIX)) continue;
    
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      
      const parsed = JSON.parse(raw);
      const { ts } = parsed;
      
      // CRITICAL FIX: Validate timestamp
      if (!ts || isNaN(ts) || ts < 0) {
        // Remove corrupted entry immediately
        localStorage.removeItem(k);
        continue;
      }
      
      entries.push({ k, ts });
    } catch (err) {
      // Remove corrupted entry
      console.warn(`Removing corrupted entry during prune: ${k}`);
      localStorage.removeItem(k);
    }
  }
  
  // Remove oldest 30%
  entries.sort((a, b) => a.ts - b.ts);
  const toRemove = entries.slice(0, Math.ceil(entries.length * 0.3));
  
  toRemove.forEach(e => {
    try {
      localStorage.removeItem(e.k);
    } catch {
      // Ignore removal errors
    }
  });
  
  console.log(`Pruned ${toRemove.length} old cache entries`);
}

// CRITICAL FIX: Add cache health check function
export function pcHealthCheck() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
  let valid = 0;
  let invalid = 0;
  let corrupted = 0;
  
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) {
        corrupted++;
        continue;
      }
      
      const parsed = JSON.parse(raw);
      const { data, ts, ttl } = parsed;
      
      if (!ts || !ttl || isNaN(ts) || isNaN(ttl)) {
        invalid++;
        localStorage.removeItem(k);
        continue;
      }
      
      if (!isValidData(data)) {
        invalid++;
        localStorage.removeItem(k);
        continue;
      }
      
      valid++;
    } catch {
      corrupted++;
      localStorage.removeItem(k);
    }
  }
  
  const size = estimateCacheSize();
  const report = {
    valid,
    invalid,
    corrupted,
    totalEntries: keys.length,
    sizeMB: size.toFixed(2),
    healthy: invalid === 0 && corrupted === 0
  };
  
  console.log('Cache health check:', report);
  return report;
}

// ── Stale-While-Revalidate fetch ─────────────────────────────────────────────
// Returns cached data immediately, triggers background refresh.
// onUpdate(freshData) called when network responds.
export function swrFetch(path, fetcher, onUpdate) {
  const cached = pcGet(path);

  if (cached && cached.data != null) {
    // Schedule background refresh
    if (cached.stale) {
      fetcher(path).then(fresh => {
        // CRITICAL FIX: Validate fresh data before caching
        if (isValidData(fresh)) {
          pcSet(path, fresh);
          onUpdate && onUpdate(fresh);
        } else {
          console.warn(`Received invalid data from server for ${path}`);
        }
      }).catch(err => {
        console.error(`Background refresh failed for ${path}:`, err);
      });
    }
    return Promise.resolve(cached.data);  // instant!
  }

  // Nothing cached — fetch normally
  return fetcher(path).then(data => {
    // CRITICAL FIX: Validate before caching
    if (isValidData(data)) {
      pcSet(path, data);
    } else {
      console.warn(`Received invalid data from server for ${path}, not caching`);
    }
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
    
    try {
      const data = await fetcher(path);
      if (isValidData(data)) {
        pcSet(path, data);
      }
    } catch (err) {
      console.error(`Prefetch failed for ${path}:`, err);
    }
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
      if (isValidData(data)) {
        pcSet(statsPath, data);
        getCurrentPath && getCurrentPath(statsPath, data);
      }
    } catch (err) {
      console.error('Background sync failed:', err);
    }
  }, intervalMs);

  return () => clearInterval(id);
}

// CRITICAL FIX: Run health check on module load
if (typeof window !== 'undefined') {
  // Run health check on load (but defer to not block)
  setTimeout(() => {
    const health = pcHealthCheck();
    if (!health.healthy) {
      console.warn('Cache corruption detected and cleaned');
    }
  }, 1000);
}
