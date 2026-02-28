# agents.txt Specification

**Version**: 1.0
**Status**: Stable
**Last Updated**: 2026-02-20

## Abstract

`agents.txt` is a capability declaration standard for websites. It allows site owners to declare what AI agents can do on their site, which endpoints and protocols are available, what authentication is required, and what rate limits agents should respect.

Where `robots.txt` tells agents what **not** to do, `agents.txt` tells them what they **can** do.

## 1. Overview

### 1.1 Purpose

AI agents increasingly interact with websites — searching, browsing, purchasing, querying APIs. However, they are routinely blocked by bot protection, CAPTCHAs, and rate limiters because there is no sanctioned channel for agent interaction. Simultaneously, site owners have no way to declare "AI agents are welcome here, and here's how to interact with us."

`agents.txt` solves this by providing a machine-readable capability declaration. Site owners opt in, declare their capabilities, and agents discover them automatically.

### 1.2 Design Principles

1. **Opt-in** — Sites explicitly declare capabilities. No file = no agent access declared.
2. **Discovery-first** — `agents.txt` is a discovery layer above protocols (REST, MCP, A2A, GraphQL). It tells agents *what's available*, not how to implement the protocol.
3. **Human-readable** — The text format is readable by developers without tooling.
4. **Machine-parseable** — Both text and JSON formats are unambiguously parseable.
5. **Declarative auth** — Describes authentication mechanisms, never contains secrets.
6. **Advisory rate limits** — Agents SHOULD respect declared limits. Servers MUST enforce them independently.

### 1.3 Relationship to Other Standards

| Standard | Purpose | Relationship |
|----------|---------|-------------|
| `robots.txt` | Deny crawling | Complementary — agents.txt declares what's allowed |
| `llms.txt` | Content for LLMs to read | Complementary — agents.txt declares actions, not content |
| `AGENTS.md` | Instructions for coding agents | Different scope — repo-level vs website-level |
| MCP | Model Context Protocol | agents.txt discovers MCP endpoints |
| A2A | Agent-to-Agent Protocol | agents.txt discovers A2A endpoints |
| OpenAPI | API specification | agents.txt can reference OpenAPI specs per capability |

## 2. File Location

### 2.1 Primary Location

```
https://example.com/.well-known/agents.txt
https://example.com/.well-known/agents.json
```

Files MUST be served under the `/.well-known/` path as defined by [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615).

### 2.2 Fallback Location

Agents SHOULD also check:

```
https://example.com/agents.txt
https://example.com/agents.json
```

The `/.well-known/` path takes precedence if both exist.

### 2.3 Content Types

- `agents.txt` MUST be served with `Content-Type: text/plain; charset=utf-8`
- `agents.json` MUST be served with `Content-Type: application/json; charset=utf-8`

### 2.4 Cross-Referencing

The text format MAY include an `Agents-JSON` directive pointing to the JSON version:

```
Agents-JSON: https://example.com/.well-known/agents.json
```

## 3. Text Format Specification

The text format uses a block-based key-value structure, inspired by `robots.txt`.

### 3.1 General Syntax

```
# Comment lines start with #
Key: Value
Key: Value

Block-Type: block-id
  Indented-Key: Value
  Indented-Key: Value
```

**Rules:**
- Lines starting with `#` are comments and MUST be ignored by parsers.
- Blank lines separate logical sections but are not syntactically significant.
- Keys are case-insensitive. Values preserve their original case.
- Indented lines (2+ spaces or 1+ tab) belong to the preceding block.
- String values MUST NOT contain newlines or control characters.

### 3.2 Header Section

The file MUST begin with the following header fields:

```
# agents.txt
Spec-Version: 1.0
```

| Field | Required | Description |
|-------|----------|-------------|
| `Spec-Version` | REQUIRED | Specification version (semver). Currently `1.0`. |
| `Generated-At` | OPTIONAL | ISO 8601 timestamp of generation time. |

### 3.3 Site Section

```
Site-Name: Example Store
Site-URL: https://example.com
Site-Description: Premium outdoor gear and equipment
Site-Contact: agents@example.com
Site-Privacy-Policy: https://example.com/privacy
```

| Field | Required | Description |
|-------|----------|-------------|
| `Site-Name` | REQUIRED | Human-readable site name. |
| `Site-URL` | REQUIRED | Canonical site URL. MUST be HTTPS in production. |
| `Site-Description` | OPTIONAL | Brief description of the site. |
| `Site-Contact` | OPTIONAL | Contact email for agent-related inquiries. |
| `Site-Privacy-Policy` | OPTIONAL | URL to the site's privacy policy. |

### 3.4 Capability Blocks

Capabilities are the core abstraction. Each declares a specific action agents can perform.

```
Capability: product-search
  Endpoint: https://example.com/api/search
  Method: GET
  Protocol: REST
  Auth: none
  Rate-Limit: 60/minute
  Description: Search the product catalog by keyword
  OpenAPI: https://example.com/api/openapi.yaml
```

| Field | Required | Description |
|-------|----------|-------------|
| `Capability` | REQUIRED | Unique identifier. Lowercase alphanumeric + hyphens. |
| `Endpoint` | REQUIRED | Full URL of the endpoint. |
| `Method` | OPTIONAL | HTTP method (GET, POST, etc.). Default: GET. |
| `Protocol` | REQUIRED | One of: `REST`, `MCP`, `A2A`, `GraphQL`, `WebSocket`. |
| `Auth` | OPTIONAL | Auth type: `none`, `api-key`, `bearer-token`, `oauth2`, `hmac`. Default: `none`. |
| `Auth-Endpoint` | OPTIONAL | URL where agents obtain tokens. Required for `bearer-token` and `oauth2`. |
| `Auth-Docs` | OPTIONAL | URL to documentation describing the authentication flow for this capability. |
| `Registration-Endpoint` | OPTIONAL | URL for RFC 7591 Dynamic Client Registration. Allows agents to self-provision OAuth2 credentials. |
| `Rate-Limit` | OPTIONAL | Rate limit in format `N/window` (e.g., `60/minute`). |
| `Description` | OPTIONAL | Human-readable description of the capability. |
| `OpenAPI` | OPTIONAL | URL to an OpenAPI specification for this endpoint. |
| `Scopes` | OPTIONAL | Comma-separated OAuth2 scopes required. |

**Parameter Definitions** (for REST endpoints):

```
Capability: product-search
  Endpoint: https://example.com/api/search
  Protocol: REST
  Param: q (query, string, required) — Search query
  Param: limit (query, integer) — Max results, default 20
  Param: category (query, string) — Filter by category
```

Parameter format: `name (location, type[, required]) [— description]`

- `location`: One of `query`, `path`, `header`, `body`
- `type`: One of `string`, `integer`, `number`, `boolean`
- `required`: If present, the parameter is required
- Description after `—` is optional

### 3.5 Access Control

```
Allow: /api/*
Allow: /products/*
Disallow: /admin/*
Disallow: /internal/*
```

| Field | Description |
|-------|-------------|
| `Allow` | Glob pattern for paths agents may access. |
| `Disallow` | Glob pattern for paths agents must not access. |

Rules follow `robots.txt` semantics: more specific patterns take precedence. If no access control is specified, all paths referenced by capabilities are implicitly allowed.

Capability endpoint declarations take precedence over `Disallow` directives — if a path is declared as a capability endpoint, it is accessible to agents regardless of a matching `Disallow` pattern. `Disallow` restricts general path access, not declared capabilities.

### 3.6 Agent Blocks

Agent-specific policies override defaults for named agents.

```
Agent: *

Agent: claude
  Rate-Limit: 200/minute
  Capabilities: product-search, store-assistant

Agent: gpt
  Rate-Limit: 100/minute
  Capabilities: product-search
```

| Field | Required | Description |
|-------|----------|-------------|
| `Agent` | REQUIRED | Agent identifier. `*` means all agents. |
| `Rate-Limit` | OPTIONAL | Override rate limit for this agent. |
| `Capabilities` | OPTIONAL | Comma-separated list of allowed capability IDs. If omitted, all capabilities are available. |

**Agent Identification**: Agents SHOULD identify themselves via the `User-Agent` header. The agent name in `agents.txt` matches against the first token of the User-Agent string (case-insensitive).

### 3.7 Metadata

```
Agents-JSON: https://example.com/.well-known/agents.json
```

Any unrecognized top-level key-value pair is treated as metadata and preserved by parsers.

## 4. JSON Format Specification

The JSON format (`agents.json`) is the structured companion to the text format. It contains the same information in a typed JSON structure.

### 4.1 Schema

```json
{
  "specVersion": "1.0",
  "generatedAt": "2025-01-01T00:00:00.000Z",
  "site": {
    "name": "Example Store",
    "url": "https://example.com",
    "description": "Premium outdoor gear",
    "contact": "agents@example.com",
    "privacyPolicy": "https://example.com/privacy"
  },
  "capabilities": [
    {
      "id": "product-search",
      "description": "Search the product catalog",
      "endpoint": "https://example.com/api/search",
      "method": "GET",
      "protocol": "REST",
      "auth": {
        "type": "none"
      },
      "rateLimit": {
        "requests": 60,
        "window": "minute"
      },
      "parameters": [
        {
          "name": "q",
          "in": "query",
          "type": "string",
          "required": true,
          "description": "Search query"
        }
      ]
    }
  ],
  "access": {
    "allow": ["/api/*"],
    "disallow": ["/admin/*"]
  },
  "agents": {
    "*": {},
    "claude": {
      "rateLimit": { "requests": 200, "window": "minute" },
      "capabilities": ["product-search"]
    }
  }
}
```

### 4.2 Type Definitions

See the TypeScript type definitions in `@agents-txt/core` for the canonical schema. Key types:

- `AgentsTxtDocument` — Root document
- `SiteInfo` — Site metadata
- `Capability` — Single capability declaration
- `Protocol` — `"REST" | "MCP" | "A2A" | "GraphQL" | "WebSocket"`
- `AuthConfig` — Authentication mechanism description
- `RateLimit` — Rate limit declaration
- `AccessControl` — Allow/disallow path patterns
- `AgentPolicy` — Per-agent overrides

## 5. Protocol Support

### 5.1 REST

Standard HTTP REST endpoints. Agents make HTTP requests directly.

```
Capability: search
  Endpoint: https://example.com/api/search
  Method: GET
  Protocol: REST
```

### 5.2 MCP (Model Context Protocol)

Declares an MCP server endpoint. Agents connect using the MCP protocol.

```
Capability: assistant
  Endpoint: https://example.com/mcp
  Protocol: MCP
  Auth: bearer-token
  Auth-Endpoint: https://example.com/auth/token
```

### 5.3 A2A (Agent-to-Agent)

Declares an A2A endpoint for agent-to-agent communication.

```
Capability: delegation
  Endpoint: https://example.com/a2a
  Protocol: A2A
```

### 5.4 GraphQL

```
Capability: data-query
  Endpoint: https://example.com/graphql
  Protocol: GraphQL
```

### 5.5 WebSocket

```
Capability: live-updates
  Endpoint: wss://example.com/ws
  Protocol: WebSocket
```

### 5.6 Discovery vs. Runtime

`agents.txt` is a **discovery layer** — it tells agents what capabilities exist, where to find them, and how to authenticate. The `Protocol` field declares which **runtime protocol** the agent should use to invoke the capability:

| Layer | Role | Examples |
|-------|------|----------|
| **Discovery** | Find capabilities and their metadata | `agents.txt`, `agents.json` |
| **Runtime** | Invoke capabilities | REST, MCP, A2A, GraphQL, WebSocket |

This separation means a single `agents.txt` file can advertise endpoints spanning multiple runtime protocols. An agent reads the manifest once, then connects to each capability using its declared protocol.

**MCP bridge:** The `@agents-txt/mcp` package demonstrates this relationship — it reads any site's `agents.txt` and exposes the declared capabilities as MCP tools, converting the discovery layer into a runtime interface that MCP-native agents can consume directly.

## 6. Authentication

### 6.1 Principles

- `agents.txt` describes the authentication **mechanism**, never actual secrets.
- Secrets are exchanged out-of-band (developer portal, OAuth flow, etc.).
- The `Auth` field tells agents what type of authentication is needed.
- The `Auth-Endpoint` field tells agents where to obtain tokens.
- The `Auth-Docs` field tells agents where to find human-readable documentation for the auth flow.

### 6.2 Auth Types

| Type | Description |
|------|-------------|
| `none` | No authentication required. |
| `api-key` | API key required. Pass via header or query parameter. |
| `bearer-token` | Bearer token required. Obtain from `Auth-Endpoint`. |
| `oauth2` | OAuth 2.0 flow. `Auth-Endpoint` is the token endpoint. |
| `hmac` | HMAC signature required. |

### 6.3 Auth-Docs

When the authentication flow for a capability requires steps beyond what `Auth` and `Auth-Endpoint` convey, site owners SHOULD provide an `Auth-Docs` URL pointing to documentation that describes the full flow:

```
Capability: store-assistant
  Endpoint: https://example.com/mcp
  Protocol: MCP
  Auth: bearer-token
  Auth-Endpoint: https://example.com/auth/token
  Auth-Docs: https://example.com/docs/agent-auth
```

Agents encountering an unfamiliar auth flow SHOULD fetch `Auth-Docs` before failing. The documentation at that URL is site-specific and not part of this standard.

### 6.4 Dynamic Client Registration

For OAuth2 capabilities, sites MAY provide a `Registration-Endpoint` that supports [RFC 7591 — OAuth 2.0 Dynamic Client Registration](https://www.rfc-editor.org/rfc/rfc7591). This allows agents to self-provision credentials without out-of-band setup.

```
Capability: api
  Endpoint: https://example.com/api/v1
  Protocol: REST
  Auth: oauth2
  Auth-Endpoint: https://example.com/oauth/token
  Registration-Endpoint: https://example.com/oauth/register
  Scopes: read, write
```

**Agent flow:**
1. `POST` to `Registration-Endpoint` with client metadata (per RFC 7591).
2. Receive `client_id` and `client_secret` in the response.
3. Use these credentials at `Auth-Endpoint` (OAuth2 client credentials flow) to obtain an access token.
4. Send `Authorization: Bearer {access_token}` on capability requests.

This field is OPTIONAL. Sites that require manual credential provisioning (developer portal, partnerships, etc.) can omit it — agents fall back to the out-of-band flow described in section 6.1.

## 7. Rate Limiting

### 7.1 Declaration

Rate limits are declared in the format `N/window`:

```
Rate-Limit: 60/minute
Rate-Limit: 1000/hour
Rate-Limit: 10/second
```

Valid windows: `second`, `minute`, `hour`, `day`.

### 7.2 Semantics

- Rate limits are **advisory** — agents SHOULD respect them.
- Servers MUST enforce rate limits independently (never trust client-side enforcement).
- Capability-level rate limits apply to that specific endpoint.
- Agent-level rate limits apply globally to that agent across all capabilities.
- When both exist, the more restrictive limit applies.
- If a site serves both `agents.txt` and `ai.txt` and declares rate limits in both, the more restrictive limit applies.

### 7.3 Rate Limit Headers

Servers SHOULD return standard rate limit headers:

```
X-RateLimit-Remaining: 42
Retry-After: 30
```

## 8. Security Considerations

### 8.1 HTTPS

All endpoints declared in `agents.txt` MUST use HTTPS in production environments. HTTP MAY be used for local development.

### 8.2 No Secrets in File

`agents.txt` MUST NOT contain API keys, tokens, passwords, or any other secrets. It describes authentication mechanisms only.

### 8.3 CORS

Servers SHOULD set appropriate CORS headers to allow agent discovery:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

### 8.4 Validation

Agents SHOULD validate `agents.txt` files against the specification before trusting their content. Malformed files SHOULD be rejected.

### 8.5 Scope

Capabilities declared in `agents.txt` apply only to the declaring domain. A file at `example.com` cannot declare capabilities for `other.com`.

## 9. Implementation Guidelines

### 9.1 For Site Owners

1. Create `agents.txt` and/or `agents.json` at `/.well-known/`.
2. Declare each capability with its endpoint, protocol, and auth requirements.
3. Set appropriate rate limits.
4. Consider per-agent policies for known agent platforms.
5. Serve with correct Content-Type and CORS headers.

### 9.2 For Agent Developers

A complete operational guide is available at [FOR_AGENTS.md](FOR_AGENTS.md). Key requirements:

**Discovery:**
1. Fetch `/.well-known/agents.json` first. If `404`, fall back to `/.well-known/agents.txt`.
2. If both return `404`, this site does not declare agent capabilities. Do not assume access.
3. If the manifest cannot be fetched or parsed, fail closed — do not assume capabilities exist.

**Identity:**
4. Send your agent name as the first token of the `User-Agent` header on every request.
5. Agent matching is case-insensitive against the first token (before `/` or space).

**Policy precedence:**
6. Agent-specific policy overrides the `*` (wildcard) policy.
7. If no matching agent block and no `*` block, all capabilities are available at capability-level rate limits.
8. When both agent-level and capability-level rate limits exist, the more restrictive limit applies.

**Error handling:**
9. On `429 Too Many Requests`, respect the `Retry-After` header. Do not retry before it expires.
10. On `401`/`403`, do not retry with the same credentials. Re-read `Auth-Docs` if available.
11. On `404` from a declared capability endpoint, re-fetch the manifest — the capability may have been removed.
12. On `5xx`, retry once after 5 seconds. Do not retry indefinitely.

**Caching:**
13. Respect `Cache-Control` headers on the manifest response.
14. If no caching header is present, do not re-fetch more than once per 5 minutes.
15. Re-fetch immediately if a capability endpoint returns `404`.

**Access control:**
16. Honor `Allow`/`Disallow` directives using robots.txt semantics (more specific patterns take precedence).
17. Capability endpoint declarations take precedence over `Disallow` — a declared capability is accessible regardless of a matching `Disallow` pattern.

### 9.3 For Tooling

The `@agents-txt/core` npm package provides:
- Parser (text and JSON formats)
- Generator (create agents.txt from config)
- Validator (check conformance)
- Client (HTTP discovery)

## 10. IANA Considerations

This specification registers the following well-known URIs per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615):

- `/.well-known/agents.txt`
- `/.well-known/agents.json`

## 11. Examples

### 11.1 Minimal

```
# agents.txt
Spec-Version: 1.0

Site-Name: My Blog
Site-URL: https://myblog.com

Capability: search
  Endpoint: https://myblog.com/api/search
  Protocol: REST
```

### 11.2 E-Commerce Store

```
# agents.txt
Spec-Version: 1.0

Site-Name: Cool Store
Site-URL: https://coolstore.com
Site-Description: Electronics and gadgets

Capability: product-search
  Endpoint: https://coolstore.com/api/search
  Method: GET
  Protocol: REST
  Auth: none
  Rate-Limit: 60/minute
  Description: Search products by keyword
  Param: q (query, string, required) — Search query
  Param: limit (query, integer) — Results per page

Capability: browse-catalog
  Endpoint: https://coolstore.com/api/products
  Method: GET
  Protocol: REST
  Rate-Limit: 120/minute

Capability: store-assistant
  Endpoint: https://coolstore.com/mcp
  Protocol: MCP
  Auth: bearer-token
  Auth-Endpoint: https://coolstore.com/auth/token

Allow: /api/*
Allow: /products/*
Disallow: /admin/*
Disallow: /checkout/*

Agent: *
Agent: claude
  Rate-Limit: 200/minute
  Capabilities: product-search, browse-catalog, store-assistant
Agent: gpt
  Rate-Limit: 100/minute
  Capabilities: product-search, browse-catalog
```

### 11.3 API Platform

```
# agents.txt
Spec-Version: 1.0

Site-Name: Data Platform
Site-URL: https://api.dataplatform.io
Site-Description: Real-time data APIs

Capability: query
  Endpoint: https://api.dataplatform.io/graphql
  Protocol: GraphQL
  Auth: bearer-token
  Auth-Endpoint: https://api.dataplatform.io/oauth/token
  Rate-Limit: 1000/hour

Capability: live-feed
  Endpoint: wss://api.dataplatform.io/stream
  Protocol: WebSocket
  Auth: bearer-token
  Auth-Endpoint: https://api.dataplatform.io/oauth/token

Agent: *
  Rate-Limit: 100/hour
```

## References

- [RFC 8615 — Well-Known URIs](https://www.rfc-editor.org/rfc/rfc8615)
- [robots.txt — RFC 9309](https://www.rfc-editor.org/rfc/rfc9309)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Agent-to-Agent Protocol](https://google.github.io/A2A/)
- [RFC 7591 — OAuth 2.0 Dynamic Client Registration](https://www.rfc-editor.org/rfc/rfc7591)
