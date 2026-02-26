import { describe, it, expect } from "vitest";
import { generate } from "../src/generator.js";
import { generateJSON } from "../src/generator-json.js";
import type { AiTxtDocument } from "../src/types.js";

function makeDoc(overrides: Partial<AiTxtDocument> = {}): AiTxtDocument {
  return {
    specVersion: "1.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    site: {
      name: "Test Store",
      url: "https://test.example.com",
      contact: "ai-policy@test.example.com",
    },
    policies: {
      training: "conditional",
    },
    trainingPaths: {
      allow: ["/products/public/*"],
      deny: ["/products/members/*"],
    },
    licensing: {
      license: "CC-BY-4.0",
    },
    content: {
      attribution: "required",
    },
    agents: {
      "*": { rateLimit: { requests: 30, window: "minute" } },
      ClaudeBot: { training: "allow", rateLimit: { requests: 120, window: "minute" } },
      GPTBot: { training: "deny" },
    },
    ...overrides,
  };
}

describe("generate (text format)", () => {
  it("includes spec version in header comment", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("# Spec-Version: 1.0");
  });

  it("includes site info", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("Site-Name: Test Store");
    expect(txt).toContain("Site-URL: https://test.example.com");
    expect(txt).toContain("Contact: ai-policy@test.example.com");
  });

  it("includes training policy", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("Training: conditional");
  });

  it("includes training paths", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("Training-Allow: /products/public/*");
    expect(txt).toContain("Training-Deny: /products/members/*");
  });

  it("includes licensing", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("License: CC-BY-4.0");
  });

  it("includes attribution", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("Attribution: required");
  });

  it("includes agent policies with indented fields", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("Agent: *");
    expect(txt).toContain("  Rate-Limit: 30/minute");
    expect(txt).toContain("Agent: ClaudeBot");
    expect(txt).toContain("  Training: allow");
    expect(txt).toContain("  Rate-Limit: 120/minute");
    expect(txt).toContain("Agent: GPTBot");
    expect(txt).toContain("  Training: deny");
  });

  it("sanitizes newline injection in site name", () => {
    const doc = makeDoc();
    doc.site.name = "Evil\nFake-Header: injected";
    const txt = generate(doc);
    expect(txt).not.toContain("\nFake-Header:");
    expect(txt).toContain("Site-Name: Evil Fake-Header: injected");
  });

  it("ends with a newline", () => {
    const txt = generate(makeDoc());
    expect(txt.endsWith("\n")).toBe(true);
  });

  it("includes generated timestamp", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("# Generated: 2026-01-01T00:00:00.000Z");
  });
});

describe("generateJSON", () => {
  it("produces valid JSON", () => {
    const json = generateJSON(makeDoc());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("preserves all document fields", () => {
    const doc = makeDoc();
    const parsed = JSON.parse(generateJSON(doc));
    expect(parsed.specVersion).toBe("1.0");
    expect(parsed.site.name).toBe("Test Store");
    expect(parsed.policies.training).toBe("conditional");
    expect(parsed.trainingPaths.allow).toContain("/products/public/*");
    expect(parsed.licensing.license).toBe("CC-BY-4.0");
    expect(parsed.content.attribution).toBe("required");
    expect(parsed.agents.ClaudeBot.training).toBe("allow");
    expect(parsed.agents.ClaudeBot.rateLimit.requests).toBe(120);
  });
});
