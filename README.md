# agents.txt

An open standard for declaring what AI agents can do on your website.

**robots.txt tells agents what NOT to do. agents.txt tells them what they CAN do.**

## The Problem

AI agents are trying to interact with websites — shopping, searching, querying APIs. But they get blocked by bot protection, CAPTCHAs, and rate limiters because there's no sanctioned channel. Meanwhile, site owners have no way to say "AI agents are welcome here, and here's how to interact with me."

## The Solution

`agents.txt` is a capability declaration file. Place it at `/.well-known/agents.txt` on your website to tell AI agents:

- **What capabilities are available** (search, browse, purchase, etc.)
- **Where the endpoints are** and what protocol they use (REST, MCP, GraphQL)
- **What authentication is required**
- **What rate limits to respect**
- **Per-agent policies** (give Claude more access than a generic bot)

```
# agents.txt — AI Agent Capability Declaration
# Spec-Version: 1.0

Site-Name: My Store
Site-URL: https://mystore.com
Description: Premium outdoor gear

Capability: product-search
  Endpoint: https://mystore.com/api/search
  Method: GET
  Protocol: REST
  Auth: none
  Rate-Limit: 60/minute
  Description: Search the product catalog

Capability: store-assistant
  Endpoint: https://mystore.com/mcp
  Protocol: MCP
  Auth: bearer-token
  Auth-Endpoint: https://mystore.com/auth/token

Allow: /api/*
Disallow: /admin/*

Agent: *
Agent: claude
  Rate-Limit: 200/minute
  Capabilities: product-search, store-assistant
```

## How it fits

| Standard | Purpose |
|----------|---------|
| `robots.txt` | "Don't crawl this" (deny) |
| `llms.txt` | "Read this content" (informational) |
| `AGENTS.md` | "Instructions for coding agents" (dev tooling) |
| **`agents.txt`** | **"Here's what you can DO, and how"** (capability declaration) |

agents.txt sits above MCP and A2A — it's the discovery layer that tells agents which protocols and endpoints are available.

## Packages

| Package | Description |
|---------|-------------|
| `@agents-txt/core` | Parser, generator, validator, and client |
| `@agents-txt/express` | Express middleware — one line to add agents.txt |
| `@agents-txt/mcp` | MCP server wrapping any agents.txt site |

## Quick Start

### Add agents.txt to an Express app

```bash
npm install @agents-txt/express
```

```js
import express from "express";
import { agentsTxt } from "@agents-txt/express";

const app = express();

app.use(agentsTxt({
  site: {
    name: "My Store",
    url: "https://mystore.com",
    description: "Premium outdoor gear",
  },
  capabilities: [
    {
      id: "product-search",
      description: "Search products",
      endpoint: "https://mystore.com/api/search",
      method: "GET",
      protocol: "REST",
      rateLimit: { requests: 60, window: "minute" },
    },
  ],
}));
```

Your site now serves `/.well-known/agents.txt` and `/.well-known/agents.json`.

### Parse an agents.txt file

```ts
import { parse } from "@agents-txt/core";

const result = parse(agentsTxtContent);
if (result.success) {
  console.log(result.document.site.name);
  console.log(result.document.capabilities);
}
```

### Connect AI agents via MCP

```bash
npx @agents-txt/mcp https://mystore.com
```

This auto-discovers the site's capabilities and exposes them as MCP tools. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "my-store": {
      "command": "npx",
      "args": ["@agents-txt/mcp", "https://mystore.com"]
    }
  }
}
```

## Specification

See [SPEC.md](SPEC.md) for the full agents.txt specification.

## License

MIT
