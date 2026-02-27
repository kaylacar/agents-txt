import express from "express";
import { describe, expect, it } from "vitest";
import { agentsTxt } from "../src/index.js";

function createApp(options?: Parameters<typeof agentsTxt>[0]) {
  const app = express();
  app.use(
    agentsTxt(
      options ?? {
        site: {
          name: "Test Site",
          url: "https://test.example.com",
          description: "A test site",
        },
        capabilities: [
          {
            id: "search",
            description: "Search things",
            endpoint: "https://test.example.com/api/search",
            method: "GET",
            protocol: "REST",
          },
        ],
      },
    ),
  );
  app.get("/other", (_req, res) => res.json({ ok: true }));
  return app;
}

// Use node's built-in test server
async function request(app: ReturnType<typeof express>, path: string, opts?: RequestInit) {
  const server = app.listen(0);
  const addr = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${addr.port}${path}`, opts);
    const body = await res.text();
    return { status: res.status, headers: res.headers, body };
  } finally {
    server.close();
  }
}

describe("agentsTxt middleware", () => {
  it("serves agents.txt at /.well-known/agents.txt", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/agents.txt");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(res.body).toContain("Spec-Version: 1.0");
    expect(res.body).toContain("Site-Name: Test Site");
    expect(res.body).toContain("Capability: search");
  });

  it("serves agents.json at /.well-known/agents.json", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/agents.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const json = JSON.parse(res.body);
    expect(json.specVersion).toBe("1.0");
    expect(json.site.name).toBe("Test Site");
    expect(json.capabilities).toHaveLength(1);
    expect(json.capabilities[0].id).toBe("search");
  });

  it("passes through non-matching paths", async () => {
    const app = createApp();
    const res = await request(app, "/other");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it("sets CORS headers", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/agents.txt");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("restricts CORS to specified origins", async () => {
    const app = createApp({
      site: { name: "T", url: "https://t.com" },
      capabilities: [],
      corsOrigins: ["https://allowed.com"],
    });
    // No origin header — should not get ACAO
    const res = await request(app, "/.well-known/agents.txt");
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("sets security headers", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/agents.txt");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("handles OPTIONS preflight", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/agents.txt", { method: "OPTIONS" });
    expect(res.status).toBe(204);
  });

  it("sets cache-control", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/agents.txt");
    expect(res.headers.get("cache-control")).toContain("max-age=300");
  });

  it("supports custom paths", async () => {
    const app = createApp({
      site: { name: "T", url: "https://t.com" },
      capabilities: [],
      paths: { txt: "/agents.txt", json: "/agents.json" },
    });
    const res = await request(app, "/agents.txt");
    expect(res.status).toBe(200);
    expect(res.body).toContain("Site-Name: T");
  });

  it("includes access control in output", async () => {
    const app = createApp({
      site: { name: "T", url: "https://t.com" },
      capabilities: [],
      access: { allow: ["/api/*"], disallow: ["/admin/*"] },
    });
    const res = await request(app, "/.well-known/agents.txt");
    expect(res.body).toContain("Allow: /api/*");
    expect(res.body).toContain("Disallow: /admin/*");
  });
});

describe("rate limiter integration", () => {
  it("returns rate limit headers", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/agents.txt");
    expect(res.headers.get("x-ratelimit-remaining")).toBeDefined();
  });

  it("can disable rate limiting", async () => {
    const app = createApp({
      site: { name: "T", url: "https://t.com" },
      capabilities: [],
      rateLimit: false,
    });
    const res = await request(app, "/.well-known/agents.txt");
    expect(res.headers.get("x-ratelimit-remaining")).toBeNull();
  });
});
