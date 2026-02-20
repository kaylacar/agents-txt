import { describe, it, expect } from "vitest";
import { parse } from "../src/parser.js";

const MINIMAL_DOC = `
Site-Name: My Store
Site-URL: https://example.com
`;

const FULL_DOC = `# agents.txt — AI Agent Capability Declaration
# Spec-Version: 1.0
# Generated: 2026-01-01T00:00:00.000Z

Site-Name: Example Store
Site-URL: https://example.com
Description: Premium outdoor gear
Contact: hello@example.com
Privacy-Policy: https://example.com/privacy

Capability: product-search
  Endpoint: https://example.com/api/search
  Method: GET
  Protocol: REST
  Auth: api-key
  Rate-Limit: 60/minute
  Description: Search the product catalog
  OpenAPI: https://example.com/openapi.json

Capability: store-assistant
  Endpoint: https://example.com/mcp
  Protocol: MCP
  Auth: bearer-token
  Auth-Endpoint: https://example.com/auth/token
  Scopes: read, write

Allow: /api/*
Disallow: /admin/*
Disallow: /internal/*

Agent: *
Agent: claude
  Rate-Limit: 200/minute
  Capabilities: product-search, store-assistant
Agent: gpt
  Rate-Limit: 100/minute

Agents-JSON: https://example.com/.well-known/agents.json
`;

describe("parse", () => {
  it("parses minimal document", () => {
    const result = parse(MINIMAL_DOC);
    expect(result.success).toBe(true);
    expect(result.document?.site.name).toBe("My Store");
    expect(result.document?.site.url).toBe("https://example.com");
  });

  it("parses full document", () => {
    const result = parse(FULL_DOC);
    expect(result.success).toBe(true);
    const doc = result.document!;

    expect(doc.specVersion).toBe("1.0");
    expect(doc.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(doc.site.name).toBe("Example Store");
    expect(doc.site.description).toBe("Premium outdoor gear");
    expect(doc.site.contact).toBe("hello@example.com");
    expect(doc.site.privacyPolicy).toBe("https://example.com/privacy");
  });

  it("parses capabilities", () => {
    const result = parse(FULL_DOC);
    const caps = result.document!.capabilities;
    expect(caps).toHaveLength(2);

    expect(caps[0].id).toBe("product-search");
    expect(caps[0].endpoint).toBe("https://example.com/api/search");
    expect(caps[0].method).toBe("GET");
    expect(caps[0].protocol).toBe("REST");
    expect(caps[0].auth?.type).toBe("api-key");
    expect(caps[0].rateLimit?.requests).toBe(60);
    expect(caps[0].rateLimit?.window).toBe("minute");
    expect(caps[0].description).toBe("Search the product catalog");
    expect(caps[0].openapi).toBe("https://example.com/openapi.json");

    expect(caps[1].id).toBe("store-assistant");
    expect(caps[1].protocol).toBe("MCP");
    expect(caps[1].auth?.type).toBe("bearer-token");
    expect(caps[1].auth?.tokenEndpoint).toBe("https://example.com/auth/token");
    expect(caps[1].auth?.scopes).toEqual(["read", "write"]);
  });

  it("parses access control", () => {
    const result = parse(FULL_DOC);
    const access = result.document!.access;
    expect(access.allow).toEqual(["/api/*"]);
    expect(access.disallow).toEqual(["/admin/*", "/internal/*"]);
  });

  it("parses agent policies", () => {
    const result = parse(FULL_DOC);
    const agents = result.document!.agents;
    expect(agents["*"]).toEqual({});
    expect(agents["claude"].rateLimit?.requests).toBe(200);
    expect(agents["claude"].capabilities).toEqual(["product-search", "store-assistant"]);
    expect(agents["gpt"].rateLimit?.requests).toBe(100);
  });

  it("parses metadata", () => {
    const result = parse(FULL_DOC);
    expect(result.document!.metadata?.["Agents-JSON"]).toBe("https://example.com/.well-known/agents.json");
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

  it("defaults to allow all when no Allow lines", () => {
    const result = parse(MINIMAL_DOC);
    expect(result.document?.access.allow).toEqual(["*"]);
  });

  it("defaults to wildcard agent when no Agent lines", () => {
    const result = parse(MINIMAL_DOC);
    expect(result.document?.agents["*"]).toEqual({});
  });
});
