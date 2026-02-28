import { describe, it, expect } from "vitest";
import { parseJSON } from "../src/parser-json.js";

describe("parseJSON", () => {
  it("parses valid agents.json", () => {
    const json = JSON.stringify({
      specVersion: "1.0",
      site: { name: "Test", url: "https://test.com" },
      capabilities: [],
      access: { allow: ["*"], disallow: [] },
      agents: { "*": {} },
    });
    const result = parseJSON(json);
    expect(result.success).toBe(true);
    expect(result.document?.site.name).toBe("Test");
  });

  it("returns INVALID_JSON code for malformed JSON", () => {
    const result = parseJSON("NOT JSON {{{");
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("INVALID_JSON");
    expect(result.errors[0].message).toContain("Invalid JSON");
  });

  it("returns SCHEMA_VIOLATION code for structurally invalid JSON", () => {
    const json = JSON.stringify({
      specVersion: "bad",
      site: { name: "" },
    });
    const result = parseJSON(json);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.every((e) => e.code === "SCHEMA_VIOLATION")).toBe(true);
  });

  it("returns field paths on schema violations", () => {
    const json = JSON.stringify({
      specVersion: "1.0",
      site: { name: "Test", url: "not-a-url" },
      capabilities: [],
      access: { allow: [], disallow: [] },
      agents: {},
    });
    const result = parseJSON(json);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.field?.includes("site"))).toBe(true);
  });
});
