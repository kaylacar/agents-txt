import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import http from "http";
import { AgentsTxtClient } from "../src/client.js";
import { generate, generateJSON } from "../src/index.js";
import type { AgentsTxtDocument } from "../src/types.js";

const testDoc: AgentsTxtDocument = {
  specVersion: "1.0",
  site: {
    name: "Client Test",
    url: "https://test.example.com",
  },
  capabilities: [
    {
      id: "search",
      description: "Search things",
      endpoint: "https://test.example.com/api/search",
      protocol: "REST",
    },
  ],
  access: { allow: ["*"], disallow: [] },
  agents: { "*": {} },
};

const txtContent = generate(testDoc);
const jsonContent = generateJSON(testDoc);

let server: http.Server;
let port: number;
let handler: (req: http.IncomingMessage, res: http.ServerResponse) => void;

beforeAll(async () => {
  server = http.createServer((req, res) => handler(req, res));
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      port = (server.address() as { port: number }).port;
      resolve();
    });
  });
});

afterAll(() => {
  server?.close();
});

afterEach(() => {
  handler = (_req, res) => {
    res.writeHead(404);
    res.end();
  };
});

describe("AgentsTxtClient", () => {
  describe("discover (text format)", () => {
    it("discovers agents.txt at /.well-known/agents.txt", async () => {
      handler = (req, res) => {
        if (req.url === "/.well-known/agents.txt") {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(txtContent);
        } else {
          res.writeHead(404);
          res.end();
        }
      };

      const client = new AgentsTxtClient();
      const result = await client.discover(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(true);
      expect(result.document?.site.name).toBe("Client Test");
    });

    it("falls back to /agents.txt when well-known fails", async () => {
      handler = (req, res) => {
        if (req.url === "/agents.txt") {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(txtContent);
        } else {
          res.writeHead(404);
          res.end();
        }
      };

      const client = new AgentsTxtClient();
      const result = await client.discover(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(true);
      expect(result.document?.site.name).toBe("Client Test");
    });

    it("returns error when neither path exists", async () => {
      handler = (_req, res) => {
        res.writeHead(404);
        res.end();
      };

      const client = new AgentsTxtClient();
      const result = await client.discover(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain("No agents.txt found");
    });
  });

  describe("discoverJSON (JSON format)", () => {
    it("discovers agents.json at /.well-known/agents.json", async () => {
      handler = (req, res) => {
        if (req.url === "/.well-known/agents.json") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(jsonContent);
        } else {
          res.writeHead(404);
          res.end();
        }
      };

      const client = new AgentsTxtClient();
      const result = await client.discoverJSON(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(true);
      expect(result.document?.site.name).toBe("Client Test");
    });

    it("falls back to /agents.json when well-known fails", async () => {
      handler = (req, res) => {
        if (req.url === "/agents.json") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(jsonContent);
        } else {
          res.writeHead(404);
          res.end();
        }
      };

      const client = new AgentsTxtClient();
      const result = await client.discoverJSON(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(true);
      expect(result.document?.site.name).toBe("Client Test");
    });

    it("returns error when neither JSON path exists", async () => {
      handler = (_req, res) => {
        res.writeHead(404);
        res.end();
      };

      const client = new AgentsTxtClient();
      const result = await client.discoverJSON(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain("No agents.json found");
    });

    it("returns error for invalid JSON response", async () => {
      handler = (req, res) => {
        if (req.url === "/.well-known/agents.json") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end("NOT JSON {{{");
        } else {
          res.writeHead(404);
          res.end();
        }
      };

      const client = new AgentsTxtClient();
      const result = await client.discoverJSON(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(false);
    });
  });

  describe("options", () => {
    it("sends custom User-Agent header", async () => {
      let receivedUA = "";
      handler = (req, res) => {
        receivedUA = req.headers["user-agent"] ?? "";
        if (req.url === "/.well-known/agents.txt") {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(txtContent);
        } else {
          res.writeHead(404);
          res.end();
        }
      };

      const client = new AgentsTxtClient({ userAgent: "my-custom-agent/1.0" });
      await client.discover(`http://127.0.0.1:${port}`);
      expect(receivedUA).toBe("my-custom-agent/1.0");
    });

    it("respects timeout option", async () => {
      handler = (_req, _res) => {
        // Never respond — let it hang
      };

      const client = new AgentsTxtClient({ timeout: 100 });
      const result = await client.discover(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain("No agents.txt found");
    });
  });

  describe("error handling", () => {
    it("handles connection refused", async () => {
      const client = new AgentsTxtClient();
      const result = await client.discover("http://127.0.0.1:1");
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain("No agents.txt found");
    });

    it("handles HTTP 500 errors", async () => {
      handler = (_req, res) => {
        res.writeHead(500);
        res.end("Internal Server Error");
      };

      const client = new AgentsTxtClient();
      const result = await client.discover(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(false);
    });

    it("strips trailing slashes from base URL", async () => {
      handler = (req, res) => {
        if (req.url === "/.well-known/agents.txt") {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(txtContent);
        } else {
          res.writeHead(404);
          res.end();
        }
      };

      const client = new AgentsTxtClient();
      const result = await client.discover(`http://127.0.0.1:${port}///`);
      expect(result.success).toBe(true);
    });

    it("includes DISCOVERY_FAILED error code", async () => {
      handler = (_req, res) => {
        res.writeHead(404);
        res.end();
      };

      const client = new AgentsTxtClient();
      const result = await client.discover(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe("DISCOVERY_FAILED");

      const jsonResult = await client.discoverJSON(`http://127.0.0.1:${port}`);
      expect(jsonResult.success).toBe(false);
      expect(jsonResult.errors[0].code).toBe("DISCOVERY_FAILED");
    });

    it("reports the underlying error in the message", async () => {
      handler = (req, res) => {
        if (req.url === "/.well-known/agents.txt") {
          res.writeHead(403);
          res.end();
        } else if (req.url === "/agents.txt") {
          res.writeHead(401);
          res.end();
        } else {
          res.writeHead(404);
          res.end();
        }
      };

      const client = new AgentsTxtClient();
      const result = await client.discover(`http://127.0.0.1:${port}`);
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain("HTTP");
    });
  });
});
