import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AgentsTxtClient } from "@agents-txt/core";
import type { AgentsTxtDocument, Capability } from "@agents-txt/core";
import { z } from "zod";

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
    } else {
      console.error(`[agents-txt-mcp] Skipping non-REST capability "${cap.id}" (protocol: ${cap.protocol})`);
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
  // Build Zod input schema from parameters
  const shape: Record<string, z.ZodTypeAny> = {};

  if (cap.parameters) {
    for (const param of cap.parameters) {
      let schema: z.ZodTypeAny;
      switch (param.type) {
        case "integer": schema = z.number().int(); break;
        case "number": schema = z.number(); break;
        case "boolean": schema = z.boolean(); break;
        default: schema = z.string(); break;
      }
      if (param.description) schema = schema.describe(param.description);
      if (!param.required) schema = schema.optional();
      shape[param.name] = schema;
    }
  }

  server.tool(
    cap.id,
    cap.description,
    shape,
    async (args: Record<string, unknown>) => {
      const method = (cap.method ?? "GET").toUpperCase();
      let endpoint = cap.endpoint;
      const authHeaders = buildAuthHeaders(cap, options);
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "User-Agent": "agents-txt-mcp/0.1",
        ...authHeaders,
      };

      let body: string | undefined;

      // Substitute path parameters into URL and place header params
      for (const [key, value] of Object.entries(args)) {
        if (value === undefined || value === null) continue;
        const paramDef = cap.parameters?.find((p) => p.name === key);
        if (paramDef?.in === "path") {
          endpoint = endpoint.replace(`{${key}}`, encodeURIComponent(String(value)));
        } else if (paramDef?.in === "header") {
          headers[key] = String(value);
        }
      }

      const url = new URL(endpoint);

      if (method === "GET" || method === "HEAD") {
        // GET/HEAD: remaining args go to query string
        for (const [key, value] of Object.entries(args)) {
          if (value === undefined || value === null) continue;
          const paramDef = cap.parameters?.find((p) => p.name === key);
          if (paramDef?.in === "path" || paramDef?.in === "header") continue;
          url.searchParams.set(key, String(value));
        }
      } else {
        // POST/PUT/PATCH/DELETE: separate query vs body params
        const bodyArgs: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(args)) {
          if (value === undefined || value === null) continue;
          const paramDef = cap.parameters?.find((p) => p.name === key);
          if (paramDef?.in === "path" || paramDef?.in === "header") continue;
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
        clearTimeout(timer);

        const data = await response.text();

        if (!response.ok) {
          return {
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
          content: [{
            type: "text" as const,
            text: `Error calling ${cap.endpoint}: ${err instanceof Error ? err.message : "Unknown error"}`,
          }],
        };
      }
    },
  );
}
