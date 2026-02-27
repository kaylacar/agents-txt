import { describe, it, expect } from "vitest";
import { validate, validateText } from "../src/validator.js";
import type { AgentsTxtDocument } from "../src/types.js";

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
    doc.agents["claude"] = { capabilities: ["nonexistent"] };
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

  it("does not warn on wss:// WebSocket endpoints", () => {
    const doc = makeValidDoc();
    doc.capabilities[0].endpoint = "wss://valid.example.com/ws";
    const result = validate(doc);
    expect(result.warnings.some((w) => w.code === "INSECURE_ENDPOINT")).toBe(false);
  });

  it("accepts valid agent capability references", () => {
    const doc = makeValidDoc();
    doc.agents["claude"] = { capabilities: ["search"] };
    const result = validate(doc);
    expect(result.valid).toBe(true);
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
});
