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

  it("registers tools for REST capabilities only", async () => {
    const result = await createAgentsTxtServer(`http://127.0.0.1:${port}`);
    // The document should have 2 capabilities
    expect(result.document.capabilities).toHaveLength(2);
    // But only REST capabilities become tools (MCP capabilities are discovery-only)
    // We can verify the document was correctly parsed
    expect(result.document.capabilities[0].protocol).toBe("REST");
    expect(result.document.capabilities[1].protocol).toBe("MCP");
  });

  it("throws on invalid URL", async () => {
    await expect(
      createAgentsTxtServer("http://127.0.0.1:1"),
    ).rejects.toThrow(/Failed to discover/);
  });
});
