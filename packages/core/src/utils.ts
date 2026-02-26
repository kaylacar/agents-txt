/**
 * Sanitize a value for the agents.txt text format.
 * Prevents newline injection and strips control characters.
 */
export function sanitizeValue(value: unknown, maxLength = 500): string {
  const str = typeof value === "string" ? value : String(value ?? "");
  return str
    .replace(/[\r\n]/g, " ")
    .replace(/[\x00-\x1f]/g, "")
    .trim()
    .slice(0, maxLength);
}

import type { RateLimitWindow } from "./types.js";

/**
 * Parse a rate limit string like "60/minute" into a RateLimit object.
 */
export function parseRateLimit(value: string): { requests: number; window: RateLimitWindow } | null {
  const match = value.match(/^(\d+)\/(second|minute|hour|day)$/);
  if (!match) return null;
  const requests = parseInt(match[1], 10);
  if (requests <= 0) return null;
  return { requests, window: match[2] as RateLimitWindow };
}

/**
 * Format a RateLimit object as a string like "60/minute".
 */
export function formatRateLimit(requests: number, window: RateLimitWindow): string {
  return `${requests}/${window}`;
}
