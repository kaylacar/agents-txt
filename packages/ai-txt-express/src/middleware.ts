import { generate, generateJSON } from "@ai-txt/core";
import type {
  AiTxtDocument,
  AiTxtSiteInfo,
  PolicyConfig,
  TrainingPaths,
  LicensingInfo,
  ContentPolicy,
  AiAgentPolicy,
} from "@ai-txt/core";
import { RateLimiter } from "./rate-limiter.js";
import type { Request, Response, NextFunction } from "express";

export interface AiTxtOptions {
  /** Site identity. */
  site: AiTxtSiteInfo;
  /** AI training and scraping policies. */
  policies: PolicyConfig;
  /** Path-based training permissions. Default: no paths. */
  trainingPaths?: TrainingPaths;
  /** Licensing information. Default: All-Rights-Reserved. */
  licensing?: LicensingInfo;
  /** Content attribution and usage rules. Default: none. */
  content?: ContentPolicy;
  /** Per-agent policies. Default: wildcard. */
  agents?: Record<string, AiAgentPolicy>;
  /** Rate limiting options. Set to false to disable. */
  rateLimit?: { enabled?: boolean; defaultLimit?: number } | false;
  /** Allowed CORS origins. Default: ["*"]. */
  corsOrigins?: string[];
  /** Serve paths. Default: /.well-known/ai.txt and /.well-known/ai.json */
  paths?: { txt?: string; json?: string };
}

export function aiTxt(options: AiTxtOptions) {
  const doc: AiTxtDocument = {
    specVersion: "1.0",
    generatedAt: new Date().toISOString(),
    site: options.site,
    policies: options.policies,
    trainingPaths: options.trainingPaths ?? { allow: [], deny: [] },
    licensing: options.licensing ?? { license: "All-Rights-Reserved" },
    content: options.content ?? { attribution: "none" },
    agents: options.agents ?? { "*": {} },
  };

  const txtContent = generate(doc);
  const jsonContent = generateJSON(doc);

  const txtPath = options.paths?.txt ?? "/.well-known/ai.txt";
  const jsonPath = options.paths?.json ?? "/.well-known/ai.json";

  const rateLimiter = options.rateLimit !== false
    ? new RateLimiter({ defaultLimit: (options.rateLimit && options.rateLimit.defaultLimit) ?? 60 })
    : null;

  const corsOrigins = options.corsOrigins ?? ["*"];

  return function aiTxtMiddleware(req: Request, res: Response, next: NextFunction): void {
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
