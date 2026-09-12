// A tiny in-memory TTL cache used for the public catalog endpoints.
// The course catalog (courses, tracks, hero slides) changes rarely, so it is
// safe to serve repeated page loads from memory instead of hitting the remote
// database (Supabase) on every request. Mutations call invalidate() so the
// cache clears when an admin edits something.

export class TTLCache<T = unknown> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  // De-dupes concurrent background refreshes for the same key.
  private inflight = new Map<string, Promise<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Like get(), but also returns expired entries (flagged `expired`). Lets a
   * caller serve a stale value immediately and refresh in the background.
   */
  getStale(key: string): { value: T; expired: boolean } | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    return { value: entry.value, expired: Date.now() > entry.expiresAt };
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Drops every entry whose key starts with `prefix`. */
  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  /**
   * Stale-while-revalidate read:
   *  - fresh hit  -> return cached value
   *  - stale hit  -> return stale value now, refresh in the background
   *  - miss       -> await loader(), cache, return
   * Concurrent callers for the same key share one loader() call.
   */
  async getOrRefresh(key: string, loader: () => Promise<T>): Promise<T> {
    const entry = this.getStale(key);
    if (entry && !entry.expired) return entry.value;

    if (entry && entry.expired) {
      // Serve stale, kick a single background refresh.
      if (!this.inflight.has(key)) {
        const p = loader()
          .then((val) => {
            this.set(key, val);
            return val;
          })
          .finally(() => this.inflight.delete(key));
        this.inflight.set(key, p);
        // Swallow background errors — the stale value is still being served.
        p.catch(() => undefined);
      }
      return entry.value;
    }

    // Hard miss — must await.
    const existing = this.inflight.get(key);
    if (existing) return existing;
    const p = loader()
      .then((val) => {
        this.set(key, val);
        return val;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }
}
