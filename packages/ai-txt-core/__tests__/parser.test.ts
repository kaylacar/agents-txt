import { describe, it, expect } from "vitest";
import { parse } from "../src/parser.js";

const MINIMAL_DOC = `
Site-Name: My Site
Site-URL: https://example.com
`;

const FULL_DOC = `# ai.txt — AI Policy Declaration
# Spec-Version: 1.0
# Generated: 2026-01-01T00:00:00.000Z

Site-Name: Example Store
Site-URL: https://example.com
Contact: ai-policy@example.com

Training: conditional
Training-Allow: /products/public/*
Training-Allow: /blog/*
Training-Deny: /products/members/*
Training-Deny: /internal/*

License: CC-BY-4.0
Attribution: required

Agent: *
  Rate-Limit: 30/minute
Agent: ClaudeBot
  Training: allow
  Rate-Limit: 120/minute
Agent: GPTBot
  Training: deny

AI-JSON: https://example.com/.well-known/ai.json
`;

describe("parse", () => {
  it("parses minimal document", () => {
    const result = parse(MINIMAL_DOC);
    expect(result.success).toBe(true);
    expect(result.document?.site.name).toBe("My Site");
    expect(result.document?.site.url).toBe("https://example.com");
  });

  it("parses full document", () => {
    const result = parse(FULL_DOC);
    expect(result.success).toBe(true);
    const doc = result.document!;

    expect(doc.specVersion).toBe("1.0");
    expect(doc.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(doc.site.name).toBe("Example Store");
    expect(doc.site.url).toBe("https://example.com");
    expect(doc.site.contact).toBe("ai-policy@example.com");
  });

  it("parses training policy", () => {
    const result = parse(FULL_DOC);
    const doc = result.document!;
    expect(doc.policies.training).toBe("conditional");
  });

  it("parses training paths", () => {
    const result = parse(FULL_DOC);
    const doc = result.document!;
    expect(doc.trainingPaths.allow).toEqual(["/products/public/*", "/blog/*"]);
    expect(doc.trainingPaths.deny).toEqual(["/products/members/*", "/internal/*"]);
  });

  it("parses licensing", () => {
    const result = parse(FULL_DOC);
    expect(result.document!.licensing.license).toBe("CC-BY-4.0");
  });

  it("parses content attribution", () => {
    const result = parse(FULL_DOC);
    expect(result.document!.content.attribution).toBe("required");
  });

  it("parses agent policies", () => {
    const result = parse(FULL_DOC);
    const agents = result.document!.agents;
    expect(agents["*"].rateLimit?.requests).toBe(30);
    expect(agents["*"].rateLimit?.window).toBe("minute");
    expect(agents["ClaudeBot"].training).toBe("allow");
    expect(agents["ClaudeBot"].rateLimit?.requests).toBe(120);
    expect(agents["GPTBot"].training).toBe("deny");
  });

  it("parses metadata", () => {
    const result = parse(FULL_DOC);
    expect(result.document!.metadata?.["AI-JSON"]).toBe("https://example.com/.well-known/ai.json");
  });

  it("fails on missing Site-Name", () => {
    const result = parse("Site-URL: https://example.com\n");
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Site-Name"))).toBe(true);
  });

  it("fails on missing Site-URL", () => {
    const result = parse("Site-Name: Test\n");
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Site-URL"))).toBe(true);
  });

  it("handles empty input", () => {
    const result = parse("");
    expect(result.success).toBe(false);
  });

  it("ignores comment lines", () => {
    const result = parse("# This is a comment\nSite-Name: Test\nSite-URL: https://test.com\n");
    expect(result.success).toBe(true);
    expect(result.document?.site.name).toBe("Test");
  });

  it("defaults to deny training when not specified", () => {
    const result = parse(MINIMAL_DOC);
    expect(result.document?.policies.training).toBe("deny");
  });

  it("defaults to All-Rights-Reserved when no license", () => {
    const result = parse(MINIMAL_DOC);
    expect(result.document?.licensing.license).toBe("All-Rights-Reserved");
  });

  it("defaults to none attribution when not specified", () => {
    const result = parse(MINIMAL_DOC);
    expect(result.document?.content.attribution).toBe("none");
  });

  it("defaults to wildcard agent when no Agent lines", () => {
    const result = parse(MINIMAL_DOC);
    expect(result.document?.agents["*"]).toEqual({});
  });

  it("accepts Site-Contact field name", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com
Site-Contact: test@test.com
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document!.site.contact).toBe("test@test.com");
  });

  it("warns on unknown training policy", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com
Training: maybe
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Unknown training policy"))).toBe(true);
  });

  it("warns on unknown attribution value", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com
Attribution: sometimes
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Unknown attribution"))).toBe(true);
  });
});
