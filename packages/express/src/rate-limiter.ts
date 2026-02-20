interface SlidingWindowEntry {
  timestamps: number[];
}

export interface RateLimiterOptions {
  /** Default requests per window. Default: 60. */
  defaultLimit?: number;
  /** Window size in ms. Default: 60000 (1 minute). */
  windowMs?: number;
  /** Cleanup interval in ms. Default: 60000. */
  cleanupIntervalMs?: number;
  /** Max tracked keys (OOM protection). Default: 10000. */
  maxEntries?: number;
}

export class RateLimiter {
  private windows = new Map<string, SlidingWindowEntry>();
  private cleanupTimer: ReturnType<typeof setInterval>;
  private windowMs: number;
  private defaultLimit: number;
  private maxEntries: number;

  constructor(options: RateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? 60_000;
    this.defaultLimit = options.defaultLimit ?? 60;
    this.maxEntries = options.maxEntries ?? 10_000;

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.windows) {
        entry.timestamps = entry.timestamps.filter((t) => now - t < this.windowMs);
        if (entry.timestamps.length === 0) this.windows.delete(key);
      }
    }, options.cleanupIntervalMs ?? 60_000);
  }

  check(key: string, limit?: number): { allowed: boolean; remaining: number; retryAfterMs?: number } {
    const effectiveLimit = limit ?? this.defaultLimit;
    const now = Date.now();

    if (!this.windows.has(key) && this.windows.size >= this.maxEntries) {
      return { allowed: false, remaining: 0, retryAfterMs: this.windowMs };
    }

    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.windows.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => now - t < this.windowMs);

    if (entry.timestamps.length >= effectiveLimit) {
      const retryAfterMs = this.windowMs - (now - entry.timestamps[0]);
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    entry.timestamps.push(now);
    return { allowed: true, remaining: effectiveLimit - entry.timestamps.length };
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.windows.clear();
  }
}
