import { describe, expect, it } from "vitest";
import { parseJSON } from "../src/parser-json.js";

describe("parseJSON", () => {
  it("parses a valid JSON document", () => {
    const input = JSON.stringify({
      specVersion: "1.0",
      site: { name: "Test", url: "https://test.com" },
      capabilities: [],
      access: { allow: ["*"], disallow: [] },
      agents: { "*": {} },
    });
    const result = parseJSON(input);
    expect(result.success).toBe(true);
    expect(result.document?.site.name).toBe("Test");
  });

  it("rejects invalid JSON syntax", () => {
    const result = parseJSON("not json at all");
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain("Invalid JSON");
  });

  it("rejects empty string", () => {
    const result = parseJSON("");
    expect(result.success).toBe(false);
  });

  it("rejects JSON that doesn't match schema", () => {
    const result = parseJSON(JSON.stringify({ foo: "bar" }));
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects input exceeding maximum size", () => {
    const huge = JSON.stringify({ data: "x".repeat(1024 * 1024 + 1) });
    const result = parseJSON(huge);
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain("maximum size");
  });

  it("includes field paths in error messages", () => {
    const result = parseJSON(
      JSON.stringify({
        specVersion: "1.0",
        site: { name: "", url: "not-a-url" },
        capabilities: [],
        access: { allow: [], disallow: [] },
        agents: {},
      }),
    );
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.field?.includes("site"))).toBe(true);
  });

  it("parses registrationEndpoint in auth config", () => {
    const input = JSON.stringify({
      specVersion: "1.0",
      site: { name: "Test", url: "https://test.com" },
      capabilities: [
        {
          id: "api",
          description: "API",
          endpoint: "https://test.com/api",
          protocol: "REST",
          auth: {
            type: "oauth2",
            tokenEndpoint: "https://test.com/oauth/token",
            registrationEndpoint: "https://test.com/oauth/register",
          },
        },
      ],
      access: { allow: ["*"], disallow: [] },
      agents: { "*": {} },
    });
    const result = parseJSON(input);
    expect(result.success).toBe(true);
    expect(result.document?.capabilities[0].auth?.registrationEndpoint).toBe("https://test.com/oauth/register");
  });

  it("parses a full document with capabilities", () => {
    const input = JSON.stringify({
      specVersion: "1.0",
      site: { name: "Full", url: "https://full.com" },
      capabilities: [
        {
          id: "search",
          description: "Search",
          endpoint: "https://full.com/api/search",
          protocol: "REST",
        },
      ],
      access: { allow: ["/api/*"], disallow: [] },
      agents: { "*": {} },
    });
    const result = parseJSON(input);
    expect(result.success).toBe(true);
    expect(result.document?.capabilities).toHaveLength(1);
    expect(result.document?.capabilities[0].id).toBe("search");
  });
});
