# agents.txt

**Capability declaration for web agents.** A site's positive statement of what AI agents CAN do — which endpoints are sanctioned for agent use, which protocols are supported, what authentication is expected, what advisory rate limits apply.

This is the inversion of `robots.txt`. Where `robots.txt` uses a restriction syntax to declare what crawlers MUST NOT do, `agents.txt` declares the sanctioned channel for agent interaction that is otherwise routinely blocked by bot detection, CAPTCHAs, and rate limiters because no positive declaration surface exists.

**Status**

- IETF Internet-Draft: [`draft-car-agents-txt-wellknown-00`](https://datatracker.ietf.org/doc/draft-car-agents-txt-wellknown/) — published on the Datatracker as an individual submission (under review, not adopted; expires 2026-12-14). Local source: [`ietf/draft-car-agents-txt-wellknown-00.md`](ietf/draft-car-agents-txt-wellknown-00.md).
- IANA Well-Known URI registrations: `agents.txt` (#72) and `agents.json` (#73) — filed, under review.
- Spec version 1.0. npm packages published.

## For Humans

Use `agents.txt` if you want a site to publish a clear, machine-readable capability surface for agents.

This is useful for:

- ecommerce sites
- SaaS products
- APIs
- marketplaces
- support systems
- internal tools being modernized for agents

If you are a site owner or developer, `agents.txt` is the capability declaration layer. It tells agents what actions exist before they attempt to connect, authenticate, or execute anything.

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

## For Agents

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

Well-known URI registrations are filed, under review:

- `agents.txt` — filing #72
- `agents.json` — filing #73

Filings #74 (`agent.txt`) and #75 (`agent.json`) are open as singular aliases.

## Standards Track

The IETF Internet-Draft for this work is ["AGENTS.TXT: Capability Declarations for Web Agents"](https://datatracker.ietf.org/doc/draft-car-agents-txt-wellknown/), published on the Datatracker as an individual submission — under review, not adopted (expires 2026-12-14). Local source: [`ietf/draft-car-agents-txt-wellknown-00.md`](ietf/draft-car-agents-txt-wellknown-00.md).

A separate, expired Internet-Draft (`draft-srijal-agents-policy-00`, expired April 2026) previously used the AGENTS.TXT name for a path-based ALLOW/DISALLOW policy file modeled on robots.txt. This draft is a different design — typed capability blocks, protocol declarations, endpoint discovery — and is not a revision of that draft. The title was set to "Capability Declarations for Web Agents" to make the distinction explicit.

## Related Work

`agents.txt` sits next to several adjacent standards. None of them provide a site-side capability declaration in the form defined here.

| Standard | Layer | Relationship |
|----------|-------|--------------|
| `robots.txt` ([RFC 9309](https://www.rfc-editor.org/rfc/rfc9309)) | Site-wide crawl restriction | Complementary. robots.txt prohibits; agents.txt sanctions. Both files coexist. |
| MCP `/.well-known/mcp/server-card.json` | Tool/server detail for Model Context Protocol | Complementary. agents.txt operates one layer up: it declares that a site offers capabilities, which may include MCP endpoints, and points to the MCP server-card for tool-level detail. |
| A2A `/.well-known/agent-card.json` | Single-agent endpoint descriptor for agent-to-agent | Complementary. agents.txt operates at the site level and may reference one or more A2A agent cards via Capability blocks with `Protocol: A2A`. |
| `llms.txt` (`/llms.txt`) | LLM-readable site content summary | Friend, not competitor. llms.txt summarizes content for LLM consumption; agents.txt declares sanctioned actions. Different questions, designed to coexist. |
| `security.txt` ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)) | Vulnerability disclosure contacts | Adjacent. Same well-known-file pattern; different domain. |
| OpenAPI | Per-endpoint API documentation | Complementary. agents.txt is a discovery layer; capabilities MAY reference an OpenAPI document for per-endpoint detail. |

## The Stack

These repos form a machine-readable web stack for agent interaction: **declared, connected, coordinated, verified, executed, proven.**

| Repo | Purpose |
|------|---------|
| **[agents.txt](https://github.com/kaylacar/agents-txt)** | **Declares what agents can do on a site** |
| [ai.txt](https://github.com/kaylacar/ai-txt) | Declares AI policy - training, licensing, attribution |
| [connect.txt](https://github.com/kaylacar/connect-txt) | Declares how agents connect, authenticate, and use a site |
| [match.txt](https://github.com/kaylacar/match-txt) | Declares needs, capacity, and matching outcomes across organizations |
| [verify.txt](https://github.com/kaylacar/verify-txt) | Declares how claims or outcomes can be independently verified |
| [agents-protocol](https://github.com/kaylacar/agents-protocol) | Execution SDK - how agents perform declared actions |
| [rer](https://github.com/kaylacar/rer) | Cryptographic proof of what agents actually did |

```
declared (agents.txt / ai.txt) -> connected (connect.txt) -> coordinated (match.txt) -> verified (verify.txt) -> executed (agents-protocol) -> proven (rer)
```

These repos are designed to work together, with each file doing one job.

## License

MIT

