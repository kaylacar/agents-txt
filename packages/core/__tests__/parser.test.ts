import { describe, expect, it } from "vitest";
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
    expect(agents.claude.rateLimit?.requests).toBe(200);
    expect(agents.claude.capabilities).toEqual(["product-search", "store-assistant"]);
    expect(agents.gpt.rateLimit?.requests).toBe(100);
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

  it("parses Param fields in capabilities", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: search
  Endpoint: https://test.com/api/search
  Protocol: REST
  Param: q (query, string, required) — Search query
  Param: limit (query, integer) — Max results
  Param: category (query, string)
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    const params = result.document!.capabilities[0].parameters!;
    expect(params).toHaveLength(3);

    expect(params[0].name).toBe("q");
    expect(params[0].in).toBe("query");
    expect(params[0].type).toBe("string");
    expect(params[0].required).toBe(true);
    expect(params[0].description).toBe("Search query");

    expect(params[1].name).toBe("limit");
    expect(params[1].type).toBe("integer");
    expect(params[1].required).toBe(false);
    expect(params[1].description).toBe("Max results");

    expect(params[2].name).toBe("category");
    expect(params[2].required).toBe(false);
    expect(params[2].description).toBeUndefined();
  });

  it("accepts Site-Description, Site-Contact, Site-Privacy-Policy field names", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com
Site-Description: A test site
Site-Contact: test@test.com
Site-Privacy-Policy: https://test.com/privacy
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document!.site.description).toBe("A test site");
    expect(result.document!.site.contact).toBe("test@test.com");
    expect(result.document!.site.privacyPolicy).toBe("https://test.com/privacy");
  });

  it("warns on invalid Param format", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: search
  Endpoint: https://test.com/search
  Protocol: REST
  Param: badformat
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Invalid parameter"))).toBe(true);
  });

  // ── Security / edge case tests ──

  it("rejects input exceeding maximum size", () => {
    const huge = `Site-Name: ${"x".repeat(1024 * 1024 + 1)}\nSite-URL: https://test.com\n`;
    const result = parse(huge);
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain("maximum size");
  });

  it("warns on unknown protocol values", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: thing
  Endpoint: https://test.com/api
  Protocol: SOAP
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Unknown protocol"))).toBe(true);
    expect(result.document!.capabilities[0].protocol).toBe("SOAP");
  });

  it("warns on invalid rate limit format", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: thing
  Endpoint: https://test.com/api
  Protocol: REST
  Rate-Limit: abc/xyz
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Invalid rate limit"))).toBe(true);
  });

  it("handles tab-indented capability fields", () => {
    const doc =
      "Site-Name: Test\nSite-URL: https://test.com\n\nCapability: search\n\tEndpoint: https://test.com/api\n\tProtocol: REST\n";
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document!.capabilities[0].endpoint).toBe("https://test.com/api");
  });

  it("handles Windows-style CRLF line endings", () => {
    const doc = "Site-Name: Test\r\nSite-URL: https://test.com\r\n";
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document?.site.name).toBe("Test");
  });

  it("warns on unparseable top-level line", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com
this has no colon
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Unparseable line"))).toBe(true);
  });

  it("warns on unparseable indented line inside capability", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: thing
  Endpoint: https://test.com/api
  this has no colon
  Protocol: REST
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Unparseable indented line"))).toBe(true);
  });

  it("warns on unknown capability field", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: thing
  Endpoint: https://test.com/api
  Protocol: REST
  Flavor: chocolate
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Unknown capability field"))).toBe(true);
  });

  it("warns on unknown agent field", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Agent: claude
  Rate-Limit: 100/minute
  Priority: high
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Unknown agent field"))).toBe(true);
  });

  it("handles Registration-Endpoint field", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: thing
  Endpoint: https://test.com/api
  Protocol: REST
  Auth: oauth2
  Registration-Endpoint: https://test.com/oauth/register
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document!.capabilities[0].auth?.registrationEndpoint).toBe("https://test.com/oauth/register");
  });

  it("defaults auth type to oauth2 when Registration-Endpoint appears without Auth", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: thing
  Endpoint: https://test.com/api
  Protocol: REST
  Registration-Endpoint: https://test.com/oauth/register
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document!.capabilities[0].auth?.type).toBe("oauth2");
    expect(result.document!.capabilities[0].auth?.registrationEndpoint).toBe("https://test.com/oauth/register");
  });

  it("handles Auth-Docs field", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: thing
  Endpoint: https://test.com/api
  Protocol: REST
  Auth: oauth2
  Auth-Docs: https://test.com/docs/auth
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document!.capabilities[0].auth?.docsUrl).toBe("https://test.com/docs/auth");
  });

  it("parses all supported rate limit windows", () => {
    for (const window of ["second", "minute", "hour", "day"]) {
      const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: thing
  Endpoint: https://test.com/api
  Protocol: REST
  Rate-Limit: 10/${window}
`;
      const result = parse(doc);
      expect(result.success).toBe(true);
      expect(result.document!.capabilities[0].rateLimit?.window).toBe(window);
    }
  });

  it("flushes last capability at end of input", () => {
    // No trailing newline after last capability
    const doc = `Site-Name: Test
Site-URL: https://test.com

Capability: search
  Endpoint: https://test.com/api
  Protocol: REST`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document!.capabilities).toHaveLength(1);
    expect(result.document!.capabilities[0].id).toBe("search");
  });

  it("flushes last agent at end of input", () => {
    const doc = `Site-Name: Test
Site-URL: https://test.com

Agent: claude
  Rate-Limit: 100/minute`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document!.agents.claude.rateLimit?.requests).toBe(100);
  });

  it("handles multiple capabilities in sequence", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com

Capability: a
  Endpoint: https://test.com/a
  Protocol: REST

Capability: b
  Endpoint: https://test.com/b
  Protocol: GraphQL

Capability: c
  Endpoint: https://test.com/c
  Protocol: WebSocket
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document!.capabilities).toHaveLength(3);
    expect(result.document!.capabilities.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("stores unrecognized top-level fields as metadata", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com
Custom-Field: custom-value
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document!.metadata?.["Custom-Field"]).toBe("custom-value");
  });

  it("handles values containing colons", () => {
    const doc = `
Site-Name: Test
Site-URL: https://test.com
`;
    const result = parse(doc);
    expect(result.success).toBe(true);
    expect(result.document?.site.url).toBe("https://test.com");
  });
});
