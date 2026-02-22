import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { agentsTxt } from "@agents-txt/express";
import { createAgentsTxtServer } from "../src/server.js";
import type { Server } from "http";

let app: ReturnType<typeof express>;
let server: Server;
let port: number;

beforeAll(async () => {
  app = express();
  app.use(
    agentsTxt({
      site: {
        name: "MCP Test Site",
        url: "https://test.example.com",
      },
      capabilities: [
        {
          id: "search",
          description: "Search things",
          endpoint: "https://test.example.com/api/search",
          method: "GET",
          protocol: "REST",
          parameters: [
            { name: "q", in: "query", type: "string", required: true, description: "Search query" },
            { name: "limit", in: "query", type: "integer" },
          ],
        },
        {
          id: "create-item",
          description: "Create an item",
          endpoint: "https://test.example.com/api/items",
          method: "POST",
          protocol: "REST",
          auth: { type: "bearer-token", tokenEndpoint: "https://test.example.com/auth" },
          parameters: [
            { name: "title", in: "body", type: "string", required: true },
            { name: "category", in: "query", type: "string" },
          ],
        },
        {
          id: "assistant",
          description: "MCP assistant",
          endpoint: "https://test.example.com/mcp",
          protocol: "MCP",
        },
      ],
    }),
  );

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as { port: number };
      port = addr.port;
      resolve();
    });
  });
});

afterAll(() => {
  server?.close();
});

describe("createAgentsTxtServer", () => {
  it("discovers agents.txt and creates MCP server", async () => {
    const result = await createAgentsTxtServer(`http://127.0.0.1:${port}`);
    expect(result.document.site.name).toBe("MCP Test Site");
    expect(result.server).toBeDefined();
  });

  it("registers tools for REST capabilities only, skips MCP", async () => {
    const result = await createAgentsTxtServer(`http://127.0.0.1:${port}`);
    expect(result.document.capabilities).toHaveLength(3);
    const restCaps = result.document.capabilities.filter((c) => c.protocol === "REST");
    const mcpCaps = result.document.capabilities.filter((c) => c.protocol === "MCP");
    expect(restCaps).toHaveLength(2);
    expect(mcpCaps).toHaveLength(1);
  });

  it("preserves capability parameters in discovery", async () => {
    const result = await createAgentsTxtServer(`http://127.0.0.1:${port}`);
    const searchCap = result.document.capabilities.find((c) => c.id === "search");
    expect(searchCap?.parameters).toHaveLength(2);
    expect(searchCap?.parameters?.[0].name).toBe("q");
    expect(searchCap?.parameters?.[0].required).toBe(true);
  });

  it("preserves auth config in discovery", async () => {
    const result = await createAgentsTxtServer(`http://127.0.0.1:${port}`);
    const createCap = result.document.capabilities.find((c) => c.id === "create-item");
    expect(createCap?.auth?.type).toBe("bearer-token");
    expect(createCap?.auth?.tokenEndpoint).toBe("https://test.example.com/auth");
  });

  it("accepts auth options without errors", async () => {
    const result = await createAgentsTxtServer(`http://127.0.0.1:${port}`, {
      bearerToken: "test-token-123",
    });
    expect(result.server).toBeDefined();
  });

  it("throws on unreachable URL", async () => {
    await expect(
      createAgentsTxtServer("http://127.0.0.1:1"),
    ).rejects.toThrow(/Failed to discover/);
  });

  it("throws on URL with no agents.txt", async () => {
    // Start a bare express server with no agents.txt
    const bareApp = express();
    bareApp.get("/", (_req, res) => res.send("ok"));
    const bareServer = bareApp.listen(0);
    const barePort = (bareServer.address() as { port: number }).port;

    try {
      await expect(
        createAgentsTxtServer(`http://127.0.0.1:${barePort}`),
      ).rejects.toThrow(/Failed to discover/);
    } finally {
      bareServer.close();
    }
  });
});
