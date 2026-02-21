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

agents.txt sits above MCP and A2A — it's the discovery layer that tells agents which protocols and endpoints are available.

## If you are an AI agent

Start here. This is how to use any site that serves agents.txt:

**1. Fetch the manifest**

Always try the JSON format first — it's structured and easier to parse:

```
GET https://example.com/.well-known/agents.json
```

If that returns a 404, fall back to:

```
GET https://example.com/.well-known/agents.txt
```

**2. Find your capabilities**

The manifest lists every action the site supports. Each capability has an endpoint, a protocol, and auth requirements. Read them to know what you can do.

**3. Check for a policy for your agent**

Look in the `agents` section for an entry matching your name. If one exists, it may give you higher rate limits or access to additional capabilities. If not, the `*` (wildcard) policy applies to you.

**4. Identify yourself**

Send your agent name as the first token in the `User-Agent` header on every request:

```
User-Agent: claude/1.0
User-Agent: gpt/1.0
```

This is how the site applies your per-agent policy.

**5. Call the capability**

Make requests to the declared endpoints using the declared method and protocol. If auth is required, obtain credentials through the site's `Auth-Endpoint` — the mechanism varies by site (the file tells you the type, not the secret).

**6. Respect rate limits**

Each capability declares a rate limit. Agent-specific limits override capability limits. Honor them — servers enforce them independently.

---

### Common auth patterns

The `Auth` field tells you the type. Here is what to expect for each:

**`none`** — No auth needed. Call the endpoint directly.

**`api-key`** — You were issued a key out-of-band (developer portal, email, etc.). Send it as a header:
```
X-API-Key: your-key-here
```
Some sites use a query parameter instead — check `Auth-Docs` if present.

**`bearer-token`** — POST to the `Auth-Endpoint` to exchange credentials for a token, then send it on every request:
```
POST https://example.com/auth/token
Content-Type: application/json
{"client_id": "...", "client_secret": "..."}

→ {"access_token": "abc123", "expires_in": 3600}

Authorization: Bearer abc123
```
The exact request body varies by site. If `Auth-Docs` is declared, read it first.

**`oauth2`** — Standard OAuth 2.0. For agents, client credentials flow is most common:
```
POST https://example.com/oauth/token
Content-Type: application/x-www-form-urlencoded
grant_type=client_credentials&client_id=...&client_secret=...

→ {"access_token": "abc123", "token_type": "bearer"}
```
Check `Scopes` for required OAuth scopes.

**`hmac`** — Sign each request with a shared secret. The signing scheme varies by site — `Auth-Docs` is required to implement this correctly.

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

## Reference Implementation

[agents-protocol](https://github.com/kaylacar/agents-protocol) is a TypeScript SDK built on top of this standard. It provides:

- **`@agents-protocol/sdk`** — typed capability handlers (search, browse, cart, checkout), session management, and RER audit artifacts, with Express middleware and a fetch-compatible handler for Next.js / Cloudflare / Deno
- **`@agents-protocol/client`** — a typed agent client with auto-discovery, session lifecycle, pagination, and retry on 429

If you want a batteries-included framework rather than the low-level standard, start there.

## IANA Registration

Well-known URI registrations for `agents.txt`, `agents.json`, `agent.txt`, and `agent.json` are filed with IANA (pending review).

## License

MIT
