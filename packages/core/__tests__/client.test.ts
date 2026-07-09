import { describe, it, expect, vi, afterEach } from "vitest";
import { AgentsTxtClient } from "../src/client.js";

const VALID_JSON = JSON.stringify({
  specVersion: "1.0",
  site: { name: "Test", url: "https://test.com" },
  capabilities: [],
  access: { allow: ["*"], disallow: [] },
  agents: { "*": {} },
});

const VALID_TEXT = `Spec-Version: 1.0
Site-Name: Test
Site-URL: https://test.com
Capability: search
  Endpoint: https://test.com/api/search
  Protocol: REST
`;

function mockFetch(responses: Record<string, { status: number; body: string }>) {
  return vi.fn(async (url: string) => {
    const resp = responses[url];
    if (!resp) return { ok: false, status: 404, text: async () => "" };
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      text: async () => resp.body,
    };
  });
}

describe("AgentsTxtClient", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("prefers agents.json before agents.txt", async () => {
    globalThis.fetch = mockFetch({
      "https://test.com/.well-known/agents.json": { status: 200, body: VALID_JSON },
      "https://test.com/.well-known/agents.txt": { status: 200, body: VALID_TEXT },
    }) as any;

    const client = new AgentsTxtClient();
    const result = await client.discover("https://test.com");

    expect(result.success).toBe(true);
    expect(result.document?.site.name).toBe("Test");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to text when JSON is not found", async () => {
    globalThis.fetch = mockFetch({
      "https://test.com/.well-known/agents.txt": { status: 200, body: VALID_TEXT },
    }) as any;

    const client = new AgentsTxtClient();
    const result = await client.discover("https://test.com");

    expect(result.success).toBe(true);
    expect(result.document?.capabilities[0]?.id).toBe("search");
  });

  it("returns JSON parse errors instead of masking them", async () => {
    globalThis.fetch = mockFetch({
      "https://test.com/.well-known/agents.json": { status: 200, body: "{invalid-json" },
      "https://test.com/.well-known/agents.txt": { status: 200, body: VALID_TEXT },
    }) as any;

    const client = new AgentsTxtClient();
    const result = await client.discover("https://test.com");

    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toContain("Invalid JSON");
  });
});
