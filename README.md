# agents.txt

An open standard for declaring what AI agents can do on your website.

**robots.txt tells agents what NOT to do. agents.txt tells them what they CAN do.**

AI agents trying to interact with websites — shopping, searching, querying APIs — get blocked by bot protection and CAPTCHAs because there's no sanctioned channel. `agents.txt` fixes that: place it at `/.well-known/agents.txt` to tell agents what they can do and how.

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

## The Format

```
# agents.txt — AI Agent Capability Declaration
Spec-Version: 1.0

Site-Name: My Store
Site-URL: https://mystore.com
Site-Description: Premium outdoor gear

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

`agents.txt` is the discovery layer. Agents read it to find which endpoints are available before making any requests.

## For AI Agents

If you are an AI agent, read **[FOR_AGENTS.md](FOR_AGENTS.md)** — it's written for you. It covers discovery, authentication, rate limits, error handling, and caching in a structured, step-by-step format.

## Packages

| Package | Description |
|---------|-------------|
| `@agents-txt/core` | Parser, generator, validator, and client |
| `@agents-txt/express` | Express middleware — one line to add agents.txt |
| `@agents-txt/mcp` | MCP server wrapping any agents.txt site |

## Specification

See [SPEC.md](SPEC.md) for the full agents.txt specification.

## Reference Implementation

[agents-protocol](https://github.com/kaylacar/agents-protocol) is a TypeScript SDK built on top of this standard. It provides:

- **`@agents-protocol/sdk`** — typed capability handlers (search, browse, cart, checkout), session management, and RER audit artifacts, with Express middleware and a fetch-compatible handler for Next.js / Cloudflare / Deno
- **`@agents-protocol/client`** — a typed agent client with auto-discovery, session lifecycle, pagination, and retry on 429

If you want a batteries-included framework rather than the low-level standard, start there.

## IANA Registration

Well-known URI registrations for `agents.txt`, `agents.json`, `agent.txt`, and `agent.json` are filed with IANA (pending review).

## Related

Part of a suite: [ai.txt](https://github.com/kaylacar/ai-txt) (training policy) · [agents-protocol](https://github.com/kaylacar/agents-protocol) (execution SDK) · [rer](https://github.com/kaylacar/rer) (cryptographic audit)

## License

MIT
