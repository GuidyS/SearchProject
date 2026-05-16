const memoryCache = new Map<string, { expiresAt: number; value: unknown }>();
const cachePrefix = "f1-api-cache:";
const defaultTtlMs = 1000 * 60 * 15;
const defaultTimeoutMs = 8000;

function readLocalCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(cachePrefix + key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { expiresAt: number; value: T };
    if (cached.expiresAt < Date.now()) {
      window.localStorage.removeItem(cachePrefix + key);
      return null;
    }
    return cached.value;
  } catch {
    return null;
  }
}

function writeLocalCache<T>(key: string, value: T, expiresAt: number) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(cachePrefix + key, JSON.stringify({ expiresAt, value }));
  } catch {
    // localStorage can be unavailable or full; memory cache still covers this session.
  }
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = defaultTimeoutMs): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`F1 API request failed: ${res.status}`);
    }
    return await res.json() as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function cachedJson<T>(url: string, ttlMs = defaultTtlMs): Promise<T> {
  if (import.meta.env.MODE === "test") {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`F1 API request failed: ${res.status}`);
    }
    return await res.json() as T;
  }

  const cached = memoryCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const localCached = readLocalCache<T>(url);
  if (localCached) {
    memoryCache.set(url, { expiresAt: Date.now() + ttlMs, value: localCached });
    return localCached;
  }

  const value = await fetchJsonWithTimeout<T>(url);
  const expiresAt = Date.now() + ttlMs;
  memoryCache.set(url, { expiresAt, value });
  writeLocalCache(url, value, expiresAt);
  return value;
}
