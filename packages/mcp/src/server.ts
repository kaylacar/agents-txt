import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AgentsTxtClient } from "@agents-txt/core";
import type { AgentsTxtDocument, Capability } from "@agents-txt/core";

/**
 * Create an MCP server that wraps an agents.txt-compliant website.
 * Each declared capability becomes an MCP tool.
 */
export async function createAgentsTxtServer(
  targetUrl: string,
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
      registerRestTool(server, cap);
    }
  }

  return { server, document: doc };
}

function registerRestTool(server: McpServer, cap: Capability): void {
  // Build input schema from parameters
  const properties: Record<string, { type: string; description?: string }> = {};
  const required: string[] = [];

  if (cap.parameters) {
    for (const param of cap.parameters) {
      properties[param.name] = {
        type: param.type === "integer" ? "number" : param.type,
        description: param.description,
      };
      if (param.required) required.push(param.name);
    }
  }

  server.tool(
    cap.id,
    cap.description,
    properties,
    async (args: Record<string, unknown>) => {
      // Build URL with query parameters
      const url = new URL(cap.endpoint);
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }

      try {
        const response = await fetch(url.toString(), {
          method: cap.method ?? "GET",
          headers: {
            "Accept": "application/json",
            "User-Agent": "agents-txt-mcp/0.1",
          },
        });

        if (!response.ok) {
          return {
            content: [{ type: "text" as const, text: `Error: HTTP ${response.status} ${response.statusText}` }],
          };
        }

        const data = await response.text();
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
