import { describe, it, expect } from "vitest";
import { sanitizeValue, parseRateLimit, formatRateLimit } from "../src/utils.js";

describe("sanitizeValue", () => {
  it("replaces newline characters with spaces", () => {
    expect(sanitizeValue("hello\nworld")).toBe("hello world");
    // \r and \n each become a space
    expect(sanitizeValue("hello\r\nworld")).toBe("hello  world");
  });

  it("strips control characters (0x00-0x1f)", () => {
    expect(sanitizeValue("hello\x00world")).toBe("helloworld");
    expect(sanitizeValue("hello\x1bworld")).toBe("helloworld");
    expect(sanitizeValue("\x01\x02\x03")).toBe("");
  });

  it("strips DEL character (0x7f)", () => {
    expect(sanitizeValue("hello\x7fworld")).toBe("helloworld");
  });

  it("trims whitespace", () => {
    expect(sanitizeValue("  hello  ")).toBe("hello");
  });

  it("truncates to maxLength", () => {
    expect(sanitizeValue("abcdef", 3)).toBe("abc");
  });

  it("converts non-string values", () => {
    expect(sanitizeValue(42)).toBe("42");
    expect(sanitizeValue(null)).toBe("");
    expect(sanitizeValue(undefined)).toBe("");
    expect(sanitizeValue(true)).toBe("true");
  });

  it("prevents newline injection attacks", () => {
    const malicious = "innocent\nEvil-Header: injected\nAnother: header";
    const result = sanitizeValue(malicious);
    expect(result).not.toContain("\n");
    expect(result).toBe("innocent Evil-Header: injected Another: header");
  });
});

describe("parseRateLimit", () => {
  it("parses valid rate limits", () => {
    expect(parseRateLimit("60/minute")).toEqual({ requests: 60, window: "minute" });
    expect(parseRateLimit("1/second")).toEqual({ requests: 1, window: "second" });
    expect(parseRateLimit("1000/hour")).toEqual({ requests: 1000, window: "hour" });
    expect(parseRateLimit("10000/day")).toEqual({ requests: 10000, window: "day" });
  });

  it("rejects invalid formats", () => {
    expect(parseRateLimit("")).toBeNull();
    expect(parseRateLimit("abc")).toBeNull();
    expect(parseRateLimit("60/week")).toBeNull();
    expect(parseRateLimit("60")).toBeNull();
    expect(parseRateLimit("/minute")).toBeNull();
  });

  it("rejects zero requests", () => {
    expect(parseRateLimit("0/minute")).toBeNull();
  });
});

describe("formatRateLimit", () => {
  it("formats rate limits", () => {
    expect(formatRateLimit(60, "minute")).toBe("60/minute");
    expect(formatRateLimit(1, "second")).toBe("1/second");
  });
});
