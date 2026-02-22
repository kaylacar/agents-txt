#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAgentsTxtServer } from "./server.js";

const targetUrl = process.argv[2];

if (!targetUrl) {
  console.error("Usage: agents-txt-mcp <url>");
  console.error("Example: agents-txt-mcp https://example.com");
  process.exit(1);
}

async function main() {
  try {
    const { server, document } = await createAgentsTxtServer(targetUrl);

    console.error(`[agents-txt-mcp] Connected to: ${document.site.name}`);
    console.error(`[agents-txt-mcp] Capabilities: ${document.capabilities.map((c) => c.id).join(", ")}`);

    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (err) {
    console.error(`[agents-txt-mcp] Fatal:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
