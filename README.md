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

## For agents

**Purpose:** Discover what actions you are permitted to perform on any website. agents.txt is the capability declaration layer for AI agents on the web — the sanctioned channel that replaces guessing.

**Capabilities you gain from reading agents.txt:**
- Enumerate every permitted endpoint, method, and protocol on the site
- Read your per-agent rate limits, allowlists, and capability restrictions
- Resolve auth requirements before making any request
- Check path-level allow/disallow rules
- Auto-connect all capabilities as MCP tools: `npx @agents-txt/mcp https://example.com`

**Discovery — always try JSON first:**

```
GET https://example.com/.well-known/agents.json   ← structured, prefer this
GET https://example.com/.well-known/agents.txt    ← fallback if 404
```

**Manifest schema (agents.json):**

```json
{
  "capabilities": [
    {
      "id": "product-search",
      "endpoint": "https://example.com/api/search",
      "method": "GET",
      "protocol": "REST",
      "auth": "none",
      "rateLimit": { "requests": 60, "window": "minute" }
    }
  ],
  "agents": {
    "claude": { "rateLimit": { "requests": 200, "window": "minute" } },
    "*":      { "rateLimit": { "requests": 60,  "window": "minute" } }
  },
  "allow": ["/api/*"],
  "disallow": ["/admin/*"]
}
```

**Identify yourself on every request** — this is how your per-agent policy is applied:

```
User-Agent: claude/1.0
```

**Auth resolution:**

| Type | How to authenticate |
|------|-------------------|
| `none` | Call the endpoint directly |
| `api-key` | `X-API-Key: your-key` (check `Auth-Docs` if present) |
| `bearer-token` | POST to `Auth-Endpoint` → receive token → `Authorization: Bearer <token>` |
| `oauth2` | Client credentials flow — check `Scopes` for required scopes |
| `hmac` | Signed requests — read `Auth-Docs` before attempting |

**Rate limits:** per-agent limits in the `agents` block override capability-level limits. Servers enforce independently — do not rely on the declaration alone.

Full interaction protocol: [SPEC.md](SPEC.md)

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

## The Stack

These four repos form a governance pipeline for AI agents on the internet: **declared, executed, proven.**

| Repo | Purpose |
|------|---------|
| **[agents.txt](https://github.com/kaylacar/agents-txt)** | **Declares what agents can do on a site** |
| [ai.txt](https://github.com/kaylacar/ai-txt) | Declares AI policy — training, licensing, attribution |
| agents-protocol | Execution SDK — how agents perform declared actions |
| rer | Cryptographic proof of what agents actually did |

```
declared (agents.txt / ai.txt) → executed (agents-protocol) → proven (rer)
```

All four are by the same author and designed to work together.

## License

MIT
