// Very small in-memory TTL cache for process-local caching.
// Not persistent across restarts — intended to reduce immediate duplicate
// Supabase calls during a short window.

type CacheEntry = { value: any; expiresAt: number };
const CACHE = new Map<string, CacheEntry>();

export function getCache<T>(key: string): T | null {
  const e = CACHE.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return e.value as T;
}

export function setCache(key: string, value: any, ttlMs: number) {
  CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function delCache(key: string) {
  CACHE.delete(key);
}

export function clearCache() {
  CACHE.clear();
}
