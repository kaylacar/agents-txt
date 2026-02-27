import type { AccessControl, AgentPolicy, AgentsTxtDocument, Capability, SiteInfo } from "@agents-txt/core";
import { generate, generateJSON } from "@agents-txt/core";
import type { NextFunction, Request, Response } from "express";
import { RateLimiter } from "./rate-limiter.js";

export interface AgentsTxtOptions {
  /** Site identity. */
  site: SiteInfo;
  /** Capabilities to declare. */
  capabilities: Capability[];
  /** Access control rules. Default: allow all. */
  access?: AccessControl;
  /** Per-agent policies. Default: wildcard. */
  agents?: Record<string, AgentPolicy>;
  /** Rate limiting options. Set to false to disable. */
  rateLimit?: { enabled?: boolean; defaultLimit?: number } | false;
  /** Allowed CORS origins. Default: ["*"]. */
  corsOrigins?: string[];
  /** Serve paths. Default: /.well-known/agents.txt and /.well-known/agents.json */
  paths?: { txt?: string; json?: string };
}

export function agentsTxt(options: AgentsTxtOptions) {
  const doc: AgentsTxtDocument = {
    specVersion: "1.0",
    generatedAt: new Date().toISOString(),
    site: options.site,
    capabilities: options.capabilities,
    access: options.access ?? { allow: ["*"], disallow: [] },
    agents: options.agents ?? { "*": {} },
  };

  const txtContent = generate(doc);
  const jsonContent = generateJSON(doc);

  const txtPath = options.paths?.txt ?? "/.well-known/agents.txt";
  const jsonPath = options.paths?.json ?? "/.well-known/agents.json";

  const rateLimiter =
    options.rateLimit !== false ? new RateLimiter({ defaultLimit: options.rateLimit?.defaultLimit ?? 60 }) : null;

  const corsOrigins = options.corsOrigins ?? ["*"];

  return function agentsTxtMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Only handle our paths
    if (req.path !== txtPath && req.path !== jsonPath) {
      next();
      return;
    }

    // CORS
    const origin = req.headers.origin as string | undefined;
    if (corsOrigins.includes("*")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (origin && corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Vary", "Origin");

    // Security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");

    // OPTIONS
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    // Rate limiting
    if (rateLimiter) {
      const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
      const result = rateLimiter.check(ip);
      res.setHeader("X-RateLimit-Remaining", String(result.remaining));
      if (!result.allowed) {
        res.setHeader("Retry-After", String(Math.ceil((result.retryAfterMs || 60000) / 1000)));
        res.status(429).json({ error: "Rate limit exceeded" });
        return;
      }
    }

    // Serve content
    if (req.path === txtPath) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.send(txtContent);
    } else {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.send(jsonContent);
    }
  };
}
