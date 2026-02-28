import { describe, expect, it } from "vitest";
import { generate } from "../src/generator.js";
import { generateJSON } from "../src/generator-json.js";
import type { AgentsTxtDocument } from "../src/types.js";

function makeDoc(overrides: Partial<AgentsTxtDocument> = {}): AgentsTxtDocument {
  return {
    specVersion: "1.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    site: {
      name: "Test Store",
      url: "https://test.example.com",
      description: "A test store",
      contact: "test@example.com",
    },
    capabilities: [
      {
        id: "product-search",
        description: "Search products",
        endpoint: "https://test.example.com/api/search",
        method: "GET",
        protocol: "REST",
        auth: { type: "none" },
        rateLimit: { requests: 60, window: "minute" },
      },
      {
        id: "browse-products",
        description: "Browse product catalog",
        endpoint: "https://test.example.com/api/products",
        method: "GET",
        protocol: "REST",
        rateLimit: { requests: 120, window: "minute" },
      },
    ],
    access: {
      allow: ["/api/*"],
      disallow: ["/admin/*"],
    },
    agents: {
      "*": {},
      claude: {
        rateLimit: { requests: 200, window: "minute" },
        capabilities: ["product-search", "browse-products"],
      },
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
    expect(txt).toContain("Description: A test store");
    expect(txt).toContain("Contact: test@example.com");
  });

  it("includes capability blocks with indented fields", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("Capability: product-search");
    expect(txt).toContain("  Endpoint: https://test.example.com/api/search");
    expect(txt).toContain("  Method: GET");
    expect(txt).toContain("  Protocol: REST");
    expect(txt).toContain("  Rate-Limit: 60/minute");
  });

  it("includes access control", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("Allow: /api/*");
    expect(txt).toContain("Disallow: /admin/*");
  });

  it("includes agent policies", () => {
    const txt = generate(makeDoc());
    expect(txt).toContain("Agent: *");
    expect(txt).toContain("Agent: claude");
    expect(txt).toContain("  Rate-Limit: 200/minute");
    expect(txt).toContain("  Capabilities: product-search, browse-products");
  });

  it("sanitizes newline injection in site name", () => {
    const doc = makeDoc();
    doc.site.name = "Evil\nFake-Header: injected";
    const txt = generate(doc);
    expect(txt).not.toContain("\nFake-Header:");
    expect(txt).toContain("Site-Name: Evil Fake-Header: injected");
  });

  it("includes auth details when present", () => {
    const doc = makeDoc();
    doc.capabilities[0].auth = {
      type: "bearer-token",
      tokenEndpoint: "https://test.example.com/auth/token",
      scopes: ["read", "write"],
    };
    const txt = generate(doc);
    expect(txt).toContain("  Auth: bearer-token");
    expect(txt).toContain("  Auth-Endpoint: https://test.example.com/auth/token");
    expect(txt).toContain("  Scopes: read, write");
  });

  it("includes privacy policy when present", () => {
    const doc = makeDoc();
    doc.site.privacyPolicy = "https://test.example.com/privacy";
    const txt = generate(doc);
    expect(txt).toContain("Privacy-Policy: https://test.example.com/privacy");
  });

  it("ends with a newline", () => {
    const txt = generate(makeDoc());
    expect(txt.endsWith("\n")).toBe(true);
  });

  it("generates parameters with all fields", () => {
    const doc = makeDoc();
    doc.capabilities[0].parameters = [
      { name: "q", in: "query", type: "string", required: true, description: "Search query" },
      { name: "limit", in: "query", type: "integer" },
    ];
    const txt = generate(doc);
    expect(txt).toContain("  Param: q (query, string, required) — Search query");
    expect(txt).toContain("  Param: limit (query, integer)");
  });

  it("generates document with empty capabilities list", () => {
    const doc = makeDoc({ capabilities: [] });
    const txt = generate(doc);
    expect(txt).toContain("Site-Name: Test Store");
    expect(txt).not.toContain("Capability:");
  });

  it("generates metadata fields", () => {
    const doc = makeDoc({ metadata: { "Agents-JSON": "https://example.com/agents.json" } });
    const txt = generate(doc);
    expect(txt).toContain("Agents-JSON: https://example.com/agents.json");
  });

  it("omits generatedAt when not set", () => {
    const doc = makeDoc();
    delete doc.generatedAt;
    const txt = generate(doc);
    expect(txt).not.toContain("Generated:");
  });

  it("includes Registration-Endpoint when present", () => {
    const doc = makeDoc();
    doc.capabilities[0].auth = {
      type: "oauth2",
      tokenEndpoint: "https://test.example.com/oauth/token",
      registrationEndpoint: "https://test.example.com/oauth/register",
    };
    const txt = generate(doc);
    expect(txt).toContain("  Registration-Endpoint: https://test.example.com/oauth/register");
  });

  it("includes Auth-Docs when present", () => {
    const doc = makeDoc();
    doc.capabilities[0].auth = {
      type: "oauth2",
      docsUrl: "https://test.example.com/docs/auth",
    };
    const txt = generate(doc);
    expect(txt).toContain("  Auth-Docs: https://test.example.com/docs/auth");
  });

  it("includes OpenAPI field when present", () => {
    const doc = makeDoc();
    doc.capabilities[0].openapi = "https://test.example.com/openapi.json";
    const txt = generate(doc);
    expect(txt).toContain("  OpenAPI: https://test.example.com/openapi.json");
  });

  it("handles agent with no policy fields", () => {
    const doc = makeDoc({ agents: { "*": {} } });
    const txt = generate(doc);
    expect(txt).toContain("Agent: *");
    const agentLine = txt.indexOf("Agent: *");
    const nextLine = txt.indexOf("\n", agentLine) + 1;
    const lineAfter = txt.slice(nextLine, txt.indexOf("\n", nextLine));
    expect(lineAfter.startsWith("  ")).toBe(false);
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
    expect(parsed.capabilities).toHaveLength(2);
    expect(parsed.access.allow).toContain("/api/*");
    expect(parsed.agents.claude.rateLimit.requests).toBe(200);
  });

  it("produces pretty-printed JSON", () => {
    const json = generateJSON(makeDoc());
    expect(json).toContain("\n");
  });
});
