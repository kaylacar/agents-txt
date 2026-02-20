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

## 6. Authentication

### 6.1 Principles

- `agents.txt` describes the authentication **mechanism**, never actual secrets.
- Secrets are exchanged out-of-band (developer portal, OAuth flow, etc.).
- The `Auth` field tells agents what type of authentication is needed.
- The `Auth-Endpoint` field tells agents where to obtain tokens.

### 6.2 Auth Types

| Type | Description |
|------|-------------|
| `none` | No authentication required. |
| `api-key` | API key required. Pass via header or query parameter. |
| `bearer-token` | Bearer token required. Obtain from `Auth-Endpoint`. |
| `oauth2` | OAuth 2.0 flow. `Auth-Endpoint` is the token endpoint. |
| `hmac` | HMAC signature required. |

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

1. Check for `/.well-known/agents.json` first (more structured), fall back to `/.well-known/agents.txt`.
2. Identify your agent via the `User-Agent` header.
3. Respect declared rate limits.
4. Check agent-specific policies before accessing capabilities.
5. Honor `Allow`/`Disallow` directives.

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
