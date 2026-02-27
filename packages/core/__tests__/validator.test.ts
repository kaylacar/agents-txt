import { describe, expect, it } from "vitest";
import type { AgentsTxtDocument } from "../src/types.js";
import { validate, validateJSON, validateText } from "../src/validator.js";

function makeValidDoc(): AgentsTxtDocument {
  return {
    specVersion: "1.0",
    site: {
      name: "Valid Store",
      url: "https://valid.example.com",
    },
    capabilities: [
      {
        id: "search",
        description: "Search",
        endpoint: "https://valid.example.com/api/search",
        protocol: "REST",
      },
    ],
    access: { allow: ["/api/*"], disallow: [] },
    agents: { "*": {} },
  };
}

describe("validate", () => {
  it("accepts a valid document", () => {
    const result = validate(makeValidDoc());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects duplicate capability IDs", () => {
    const doc = makeValidDoc();
    doc.capabilities.push({
      id: "search",
      description: "Duplicate",
      endpoint: "https://valid.example.com/api/search2",
      protocol: "REST",
    });
    const result = validate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_CAPABILITY")).toBe(true);
  });

  it("rejects unknown capability references in agent policies", () => {
    const doc = makeValidDoc();
    doc.agents.claude = { capabilities: ["nonexistent"] };
    const result = validate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "UNKNOWN_CAPABILITY_REF")).toBe(true);
  });

  it("warns on HTTP site URL", () => {
    const doc = makeValidDoc();
    doc.site.url = "http://insecure.example.com";
    const result = validate(doc);
    expect(result.warnings.some((w) => w.code === "INSECURE_URL")).toBe(true);
  });

  it("warns on HTTP endpoint URL", () => {
    const doc = makeValidDoc();
    doc.capabilities[0].endpoint = "http://insecure.example.com/api";
    const result = validate(doc);
    expect(result.warnings.some((w) => w.code === "INSECURE_ENDPOINT")).toBe(true);
  });

  it("accepts valid agent capability references", () => {
    const doc = makeValidDoc();
    doc.agents.claude = { capabilities: ["search"] };
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it("accepts a document with no capabilities", () => {
    const doc = makeValidDoc();
    doc.capabilities = [];
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it("accepts a document with multiple agents", () => {
    const doc = makeValidDoc();
    doc.agents.claude = { capabilities: ["search"], rateLimit: { requests: 100, window: "minute" } };
    doc.agents.gpt = { capabilities: ["search"] };
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it("warns on multiple insecure endpoints", () => {
    const doc = makeValidDoc();
    doc.capabilities = [
      { id: "a", description: "A", endpoint: "http://a.com/api", protocol: "REST" },
      { id: "b", description: "B", endpoint: "http://b.com/api", protocol: "REST" },
    ];
    const result = validate(doc);
    const insecureWarnings = result.warnings.filter((w) => w.code === "INSECURE_ENDPOINT");
    expect(insecureWarnings).toHaveLength(2);
  });

  it("does not warn on HTTPS endpoints", () => {
    const doc = makeValidDoc();
    const result = validate(doc);
    const insecureWarnings = result.warnings.filter((w) => w.code === "INSECURE_ENDPOINT");
    expect(insecureWarnings).toHaveLength(0);
  });
});

describe("validateText", () => {
  it("validates a correct text document", () => {
    const text = `Site-Name: Test\nSite-URL: https://test.com\n`;
    const result = validateText(text);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid text document", () => {
    const result = validateText("");
    expect(result.valid).toBe(false);
  });

  it("returns PARSE_ERROR code for unparseable input", () => {
    const result = validateText("");
    expect(result.errors.some((e) => e.code === "PARSE_ERROR")).toBe(true);
  });

  it("validates a full text document with capabilities", () => {
    const text = `
Site-Name: Test
Site-URL: https://test.com

Capability: search
  Endpoint: https://test.com/api/search
  Protocol: REST
  Description: Search things
`;
    const result = validateText(text);
    expect(result.valid).toBe(true);
  });
});

describe("validateJSON", () => {
  it("validates a correct JSON document", () => {
    const doc = makeValidDoc();
    const json = JSON.stringify(doc);
    const result = validateJSON(json);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid JSON syntax", () => {
    const result = validateJSON("{not valid json");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "PARSE_ERROR")).toBe(true);
  });

  it("rejects JSON missing required fields", () => {
    const result = validateJSON(JSON.stringify({ specVersion: "1.0" }));
    expect(result.valid).toBe(false);
  });

  it("rejects JSON with wrong types", () => {
    const result = validateJSON(
      JSON.stringify({
        specVersion: 123,
        site: { name: "Test", url: "https://test.com" },
        capabilities: [],
        access: { allow: [], disallow: [] },
        agents: {},
      }),
    );
    expect(result.valid).toBe(false);
  });
});
