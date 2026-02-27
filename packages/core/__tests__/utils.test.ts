import { describe, expect, it } from "vitest";
import { formatRateLimit, parseRateLimit, sanitizeValue } from "../src/utils.js";

describe("sanitizeValue", () => {
  it("returns string values as-is", () => {
    expect(sanitizeValue("hello")).toBe("hello");
  });

  it("strips newlines", () => {
    expect(sanitizeValue("line1\nline2")).toBe("line1 line2");
    // \r and \n are each replaced with a space
    expect(sanitizeValue("line1\r\nline2")).toBe("line1  line2");
  });

  it("strips control characters", () => {
    expect(sanitizeValue("hello\x00world")).toBe("helloworld");
    expect(sanitizeValue("tab\x09here")).toBe("tabhere");
  });

  it("trims whitespace", () => {
    expect(sanitizeValue("  hello  ")).toBe("hello");
  });

  it("truncates long values", () => {
    const long = "x".repeat(600);
    expect(sanitizeValue(long).length).toBe(500);
  });

  it("accepts custom maxLength", () => {
    expect(sanitizeValue("hello world", 5)).toBe("hello");
  });

  it("converts non-strings to strings", () => {
    expect(sanitizeValue(42)).toBe("42");
    expect(sanitizeValue(null)).toBe("");
    expect(sanitizeValue(undefined)).toBe("");
  });
});

describe("parseRateLimit", () => {
  it("parses valid rate limit strings", () => {
    expect(parseRateLimit("60/minute")).toEqual({ requests: 60, window: "minute" });
    expect(parseRateLimit("1000/hour")).toEqual({ requests: 1000, window: "hour" });
    expect(parseRateLimit("10/second")).toEqual({ requests: 10, window: "second" });
    expect(parseRateLimit("5000/day")).toEqual({ requests: 5000, window: "day" });
  });

  it("returns null for invalid format", () => {
    expect(parseRateLimit("abc")).toBeNull();
    expect(parseRateLimit("60/week")).toBeNull();
    expect(parseRateLimit("60")).toBeNull();
    expect(parseRateLimit("/minute")).toBeNull();
    expect(parseRateLimit("")).toBeNull();
  });
});

describe("formatRateLimit", () => {
  it("formats rate limit to string", () => {
    expect(formatRateLimit(60, "minute")).toBe("60/minute");
    expect(formatRateLimit(1000, "hour")).toBe("1000/hour");
  });
});
