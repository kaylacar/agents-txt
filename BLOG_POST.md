# agents.txt — a robots.txt for what AI agents can DO

**TL;DR:** We're proposing `agents.txt` as an open web standard for capability declaration. robots.txt says "don't crawl this." agents.txt says "here's what you *can* do, and exactly how." IANA well-known URI registrations are pending.

---

## The problem nobody is naming clearly

AI agents are being deployed to interact with websites on behalf of users — shopping, searching, booking, querying. The problem is that websites have no sanctioned way to say: "agents are welcome here, and here's the interface."

The result is a mess:
- Agents scrape HTML because there's no declared API
- Bot filters block agents that are acting legitimately
- Site owners can't set per-agent policies (give Claude 200 req/min, give unknown bots 10)
- No session boundary, so agents have to complete payment on behalf of users (dangerous)
- No audit trail, so there's no proof of what an agent actually did

We have standards for everything else:

| Standard | Purpose |
|---|---|
| `robots.txt` | "Don't crawl this" (deny) |
| `llms.txt` | "Read this content" (informational) |
| `AGENTS.md` | "Instructions for coding agents" (dev tooling) |
| **`agents.txt`** | **"Here's what you can DO, and how"** (capability declaration) |

agents.txt sits above MCP and A2A — it's the discovery layer that tells agents which protocols and endpoints are available, whether a session is required, and what the rate limits are.

---

## What it looks like

Place this at `/.well-known/agents.txt`:

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

Session:
  Create: https://mystore.com/api/session
  Delete: https://mystore.com/api/session
  TTL: 3600

Allow: /api/*
Disallow: /admin/*

Agent: claude
  Rate-Limit: 200/minute
  Capabilities: product-search, store-assistant
```

Machine-readable version lives at `/.well-known/agents.json` for agents that don't want to parse text.

---

## How adoption works

**For site owners — one line:**

```bash
npm install @agents-txt/express
```

```javascript
app.use(agentsTxt({
  site: { name: 'My Store', url: 'https://mystore.com' },
  capabilities: [
    { id: 'search', endpoint: '/api/search', method: 'GET', protocol: 'REST' }
  ],
}));
```

That's it. Your site now serves both `agents.txt` and `agents.json`.

**For agents reading the file — also one line:**

```bash
npx @agents-txt/mcp https://mystore.com
```

This auto-discovers the site's agents.txt and exposes every capability as an MCP tool, instantly usable in Claude Desktop or any MCP client.

**For parsing/validation:**

```typescript
import { parse, validate, generate } from '@agents-txt/core';

const result = parse(agentsTxtContent);
if (result.success) {
  console.log(result.document.capabilities);
}
```

---

## The full-stack reference implementation

For site owners who want more than a declaration file — typed handlers, session management, and a cryptographic audit trail — [agents-protocol](https://github.com/kaylacar/agents-protocol) is a TypeScript SDK built on this standard:

```typescript
import { AgentDoor, search, cart, checkout } from '@agents-protocol/sdk';

const door = new AgentDoor({
  site: { name: 'My Store', url: 'https://example.com' },
  capabilities: [
    search({ handler: async (q) => db.search(q) }),
    cart(),
    checkout({ onCheckout: async (items) => stripe.createSession(items) }),
  ],
  audit: true,  // every session produces a signed RER artifact
});

app.use(door.middleware());
```

The client SDK on the agent side:

```typescript
import { AgentClient } from '@agents-protocol/client';

const client = new AgentClient('https://any-store.com');
await client.connect();

const results = await client.search('blue mug');
await client.cartAdd(results[0].id, 1);
const { checkout_url } = await client.checkout();
// hand URL to human — agent stops here, never touches payment
```

The human handoff pattern is intentional. Agents should never complete irreversible financial actions autonomously. The `checkout_url` goes to the user; the agent stops.

---

## IANA and the standard path

Well-known URI registrations for `agents.txt`, `agents.json`, `agent.txt`, and `agent.json` are filed with IANA (the same body that manages `robots.txt`'s `/.well-known/` path). This matters because:

1. It makes the path part of the permanent web infrastructure
2. Other implementations can point to a canonical spec
3. It triggers adoption from browser vendors, CDN providers, and crawlers

The full spec is at [SPEC.md](https://github.com/kaylacar/agents-txt/blob/master/SPEC.md).

---

## Why now

The AI agent ecosystem is fragmenting fast. Every AI company is building their own site-integration protocol. MCP is great but it's a transport layer, not a discovery layer — you still need to tell agents where to find the MCP server. A2A defines how agents talk to each other, but not how they discover what a website offers.

agents.txt fills the gap at the discovery layer. Any protocol (MCP, REST, GraphQL, A2A) can be declared in agents.txt. The file is the index; whatever is indexed can use any wire format underneath.

---

## Links

- Spec + packages: https://github.com/kaylacar/agents-txt
- Reference implementation: https://github.com/kaylacar/agents-protocol
- npm: `@agents-txt/core`, `@agents-txt/express`, `@agents-txt/mcp` (publishing now)
- IANA submissions: in the `ietf/` directory of the repo

Happy to answer questions. PRs welcome.
