import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AgentsTxtClient } from "@agents-txt/core";
import type { AgentsTxtDocument, Capability } from "@agents-txt/core";

export interface ServerOptions {
  /** Bearer token for authenticated endpoints. */
  bearerToken?: string;
  /** API key for authenticated endpoints. */
  apiKey?: string;
}

/**
 * Create an MCP server that wraps an agents.txt-compliant website.
 * Each declared capability becomes an MCP tool.
 */
export async function createAgentsTxtServer(
  targetUrl: string,
  options: ServerOptions = {},
): Promise<{ server: McpServer; document: AgentsTxtDocument }> {
  const client = new AgentsTxtClient();

  // Try JSON first (more structured), fall back to text
  let result = await client.discoverJSON(targetUrl);
  if (!result.success) {
    result = await client.discover(targetUrl);
  }

  if (!result.success || !result.document) {
    throw new Error(
      `Failed to discover agents.txt at ${targetUrl}: ${result.errors.map((e) => e.message).join(", ")}`,
    );
  }

  const doc = result.document;
  const server = new McpServer({
    name: `agents-txt: ${doc.site.name}`,
    version: "0.1.0",
  });

  // Register a tool for each REST capability
  for (const cap of doc.capabilities) {
    if (cap.protocol === "REST") {
      registerRestTool(server, cap, options);
    }
  }

  return { server, document: doc };
}

function buildAuthHeaders(cap: Capability, options: ServerOptions): Record<string, string> {
  const headers: Record<string, string> = {};

  if (!cap.auth || cap.auth.type === "none") return headers;

  switch (cap.auth.type) {
    case "bearer-token":
      if (options.bearerToken) {
        headers["Authorization"] = `Bearer ${options.bearerToken}`;
      }
      break;
    case "api-key":
      if (options.apiKey) {
        headers["X-API-Key"] = options.apiKey;
      }
      break;
    case "oauth2":
      if (options.bearerToken) {
        headers["Authorization"] = `Bearer ${options.bearerToken}`;
      }
      break;
  }

  return headers;
}

function registerRestTool(server: McpServer, cap: Capability, options: ServerOptions): void {
  // Build input schema from parameters
  const shape: Record<string, z.ZodTypeAny> = {};

  if (cap.parameters) {
    for (const param of cap.parameters) {
      let field: z.ZodTypeAny = param.type === "integer" || param.type === "number"
        ? z.number()
        : z.string();
      if (param.description) field = field.describe(param.description);
      if (!param.required) field = field.optional();
      shape[param.name] = field;
    }
  }

  server.tool(
    cap.id,
    cap.description,
    shape,
    async (args: Record<string, unknown>) => {
      const method = (cap.method ?? "GET").toUpperCase();
      const url = new URL(cap.endpoint);
      const authHeaders = buildAuthHeaders(cap, options);
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "User-Agent": "agents-txt-mcp/0.1",
        ...authHeaders,
      };

      let body: string | undefined;

      if (method === "GET" || method === "HEAD") {
        // GET/HEAD: all args go to query string
        for (const [key, value] of Object.entries(args)) {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
          }
        }
      } else {
        // POST/PUT/PATCH/DELETE: separate query vs body params
        const bodyArgs: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(args)) {
          if (value === undefined || value === null) continue;
          const paramDef = cap.parameters?.find((p) => p.name === key);
          if (paramDef?.in === "query") {
            url.searchParams.set(key, String(value));
          } else {
            bodyArgs[key] = value;
          }
        }
        if (Object.keys(bodyArgs).length > 0) {
          headers["Content-Type"] = "application/json";
          body = JSON.stringify(bodyArgs);
        }
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30_000);

        const response = await fetch(url.toString(), {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        const data = await response.text();
        clearTimeout(timer);

        if (!response.ok) {
          return {
            isError: true,
            content: [{
              type: "text" as const,
              text: `Error: HTTP ${response.status} ${response.statusText}\n${data}`,
            }],
          };
        }

        return {
          content: [{ type: "text" as const, text: data }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: `Error calling ${cap.endpoint}: ${err instanceof Error ? err.message : "Unknown error"}`,
          }],
        };
      }
    },
  );
}
