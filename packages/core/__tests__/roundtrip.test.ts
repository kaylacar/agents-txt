import { describe, it, expect } from "vitest";
import { generate } from "../src/generator.js";
import { generateJSON } from "../src/generator-json.js";
import { parse } from "../src/parser.js";
import { parseJSON } from "../src/parser-json.js";
import type { AgentsTxtDocument } from "../src/types.js";

const testDoc: AgentsTxtDocument = {
  specVersion: "1.0",
  site: {
    name: "Roundtrip Store",
    url: "https://roundtrip.example.com",
    description: "Testing roundtrip",
    contact: "test@roundtrip.com",
  },
  capabilities: [
    {
      id: "search",
      description: "Search products",
      endpoint: "https://roundtrip.example.com/api/search",
      method: "GET",
      protocol: "REST",
      auth: { type: "none" },
      rateLimit: { requests: 100, window: "minute" },
    },
    {
      id: "assistant",
      description: "AI assistant",
      endpoint: "https://roundtrip.example.com/mcp",
      protocol: "MCP",
      auth: { type: "bearer-token", tokenEndpoint: "https://roundtrip.example.com/auth" },
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
      capabilities: ["search", "assistant"],
    },
  },
};

describe("roundtrip: generate -> parse", () => {
  it("text roundtrip preserves site info", () => {
    const text = generate(testDoc);
    const result = parse(text);
    expect(result.success).toBe(true);
    expect(result.document?.site.name).toBe(testDoc.site.name);
    expect(result.document?.site.url).toBe(testDoc.site.url);
    expect(result.document?.site.description).toBe(testDoc.site.description);
    expect(result.document?.site.contact).toBe(testDoc.site.contact);
  });

  it("text roundtrip preserves capabilities", () => {
    const text = generate(testDoc);
    const result = parse(text);
    expect(result.document?.capabilities).toHaveLength(2);
    expect(result.document?.capabilities[0].id).toBe("search");
    expect(result.document?.capabilities[0].rateLimit?.requests).toBe(100);
    expect(result.document?.capabilities[1].id).toBe("assistant");
    expect(result.document?.capabilities[1].protocol).toBe("MCP");
  });

  it("text roundtrip preserves access control", () => {
    const text = generate(testDoc);
    const result = parse(text);
    expect(result.document?.access.allow).toEqual(["/api/*"]);
    expect(result.document?.access.disallow).toEqual(["/admin/*"]);
  });

  it("text roundtrip preserves agent policies", () => {
    const text = generate(testDoc);
    const result = parse(text);
    expect(result.document?.agents["claude"].rateLimit?.requests).toBe(200);
    expect(result.document?.agents["claude"].capabilities).toEqual(["search", "assistant"]);
  });

  it("JSON roundtrip produces identical document", () => {
    const json = generateJSON(testDoc);
    const result = parseJSON(json);
    expect(result.success).toBe(true);
    expect(result.document).toEqual(testDoc);
  });
});
