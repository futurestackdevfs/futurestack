// A tiny in-memory TTL cache used for the public catalog endpoints.
// The course catalog (courses, tracks, hero slides) changes rarely, so it is
// safe to serve repeated page loads from memory instead of hitting the remote
// database (Supabase) on every request. Mutations call invalidate() so the
// cache clears when an admin edits something.

export class TTLCache<T = unknown> {
  private store = new Map<string, { value: T; expiresAt: number }>();

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

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}