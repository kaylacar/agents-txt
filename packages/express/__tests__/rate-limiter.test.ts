import { afterEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "../src/rate-limiter.js";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  afterEach(() => {
    limiter?.destroy();
    vi.restoreAllMocks();
  });

  it("allows requests within limit", () => {
    limiter = new RateLimiter({ defaultLimit: 5, windowMs: 60_000 });
    const result = limiter.check("test-ip");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks after limit reached", () => {
    limiter = new RateLimiter({ defaultLimit: 3, windowMs: 60_000 });
    limiter.check("ip1");
    limiter.check("ip1");
    limiter.check("ip1");
    const result = limiter.check("ip1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    limiter = new RateLimiter({ defaultLimit: 2, windowMs: 60_000 });
    limiter.check("a");
    limiter.check("a");
    const blocked = limiter.check("a");
    expect(blocked.allowed).toBe(false);

    const allowed = limiter.check("b");
    expect(allowed.allowed).toBe(true);
  });

  it("respects custom limit per check", () => {
    limiter = new RateLimiter({ defaultLimit: 100, windowMs: 60_000 });
    limiter.check("ip", 1);
    const result = limiter.check("ip", 1);
    expect(result.allowed).toBe(false);
  });

  it("enforces OOM protection maxEntries", () => {
    limiter = new RateLimiter({ defaultLimit: 100, windowMs: 60_000, maxEntries: 2 });
    limiter.check("a");
    limiter.check("b");
    const result = limiter.check("c");
    expect(result.allowed).toBe(false);
  });

  it("clears all state on destroy", () => {
    limiter = new RateLimiter({ defaultLimit: 1, windowMs: 60_000 });
    limiter.check("x");
    limiter.destroy();
    // After destroy, create new limiter
    limiter = new RateLimiter({ defaultLimit: 1, windowMs: 60_000 });
    const result = limiter.check("x");
    expect(result.allowed).toBe(true);
  });

  it("allows requests after window expires", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    limiter = new RateLimiter({ defaultLimit: 1, windowMs: 1000 });
    limiter.check("ip");

    // Should be blocked within window
    const blocked = limiter.check("ip");
    expect(blocked.allowed).toBe(false);

    // Advance time past window
    vi.spyOn(Date, "now").mockReturnValue(now + 1001);
    const allowed = limiter.check("ip");
    expect(allowed.allowed).toBe(true);
  });

  it("returns accurate retryAfterMs", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    limiter = new RateLimiter({ defaultLimit: 1, windowMs: 5000 });
    limiter.check("ip");

    // Advance 2 seconds
    vi.spyOn(Date, "now").mockReturnValue(now + 2000);
    const result = limiter.check("ip");
    expect(result.allowed).toBe(false);
    // Should be about 3000ms remaining (5000 - 2000)
    expect(result.retryAfterMs).toBeLessThanOrEqual(3000);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("returns retryAfterMs equal to windowMs when maxEntries reached", () => {
    limiter = new RateLimiter({ defaultLimit: 100, windowMs: 30_000, maxEntries: 1 });
    limiter.check("a");
    const result = limiter.check("b");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(30_000);
  });

  it("uses defaults when no options provided", () => {
    limiter = new RateLimiter();
    const result = limiter.check("ip");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59); // default is 60
  });
});
