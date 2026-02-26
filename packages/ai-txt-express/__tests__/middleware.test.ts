import { describe, it, expect } from "vitest";
import express from "express";
import { aiTxt } from "../src/index.js";

function createApp(options?: Parameters<typeof aiTxt>[0]) {
  const app = express();
  app.use(
    aiTxt(
      options ?? {
        site: {
          name: "Test Site",
          url: "https://test.example.com",
          contact: "ai@test.example.com",
        },
        policies: {
          training: "conditional",
        },
        trainingPaths: {
          allow: ["/public/*"],
          deny: ["/private/*"],
        },
        licensing: {
          license: "CC-BY-4.0",
        },
        content: {
          attribution: "required",
        },
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

describe("aiTxt middleware", () => {
  it("serves ai.txt at /.well-known/ai.txt", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/ai.txt");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(res.body).toContain("Spec-Version: 1.0");
    expect(res.body).toContain("Site-Name: Test Site");
    expect(res.body).toContain("Training: conditional");
  });

  it("serves ai.json at /.well-known/ai.json", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/ai.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const json = JSON.parse(res.body);
    expect(json.specVersion).toBe("1.0");
    expect(json.site.name).toBe("Test Site");
    expect(json.policies.training).toBe("conditional");
    expect(json.licensing.license).toBe("CC-BY-4.0");
    expect(json.content.attribution).toBe("required");
  });

  it("passes through non-matching paths", async () => {
    const app = createApp();
    const res = await request(app, "/other");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it("sets CORS headers", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/ai.txt");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("restricts CORS to specified origins", async () => {
    const app = createApp({
      site: { name: "T", url: "https://t.com" },
      policies: { training: "deny" },
      corsOrigins: ["https://allowed.com"],
    });
    // No origin header — should not get ACAO
    const res = await request(app, "/.well-known/ai.txt");
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("sets security headers", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/ai.txt");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("handles OPTIONS preflight", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/ai.txt", { method: "OPTIONS" });
    expect(res.status).toBe(204);
  });

  it("sets cache-control", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/ai.txt");
    expect(res.headers.get("cache-control")).toContain("max-age=300");
  });

  it("supports custom paths", async () => {
    const app = createApp({
      site: { name: "T", url: "https://t.com" },
      policies: { training: "deny" },
      paths: { txt: "/ai.txt", json: "/ai.json" },
    });
    const res = await request(app, "/ai.txt");
    expect(res.status).toBe(200);
    expect(res.body).toContain("Site-Name: T");
  });

  it("includes training paths in output", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/ai.txt");
    expect(res.body).toContain("Training-Allow: /public/*");
    expect(res.body).toContain("Training-Deny: /private/*");
  });
});

describe("rate limiter integration", () => {
  it("returns rate limit headers", async () => {
    const app = createApp();
    const res = await request(app, "/.well-known/ai.txt");
    expect(res.headers.get("x-ratelimit-remaining")).toBeDefined();
  });

  it("can disable rate limiting", async () => {
    const app = createApp({
      site: { name: "T", url: "https://t.com" },
      policies: { training: "deny" },
      rateLimit: false,
    });
    const res = await request(app, "/.well-known/ai.txt");
    expect(res.headers.get("x-ratelimit-remaining")).toBeNull();
  });
});
