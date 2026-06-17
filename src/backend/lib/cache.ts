interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>()

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs
    this.cache.set(key, { value, expiresAt })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

export const cacheService = new CacheService()
