---
title: The "agents.txt" and "agents.json" Well-Known URIs
abbrev: agents-txt
docname: draft-car-agents-txt-wellknown-00
date: 2026-02
category: info
ipr: trust200902
area: Applications and Real-Time
workgroup: Independent Submission

keyword:
  - AI agents
  - well-known URI
  - capability discovery
  - MCP
  - Model Context Protocol

stand_alone: yes

pi:
  toc: yes
  sortrefs: yes
  symrefs: yes

author:
  - ins: K. Car
    name: Kayla Car
    organization: Independent
    email: kayla@agents-txt.dev

normative:
  RFC2119:
  RFC8174:
  RFC8615:
  RFC9110:

informative:
  RFC9116:
    title: "A File Format to Aid in Security Vulnerability Disclosure"
    date: 2022-04
    author:
      - ins: E. Foudil
      - ins: Y. Shafranovich
  ROBOTS:
    title: "Robots Exclusion Protocol"
    target: https://www.rfc-editor.org/rfc/rfc9309
    date: 2022-09
  LLMSTXT:
    title: "llms.txt"
    target: https://llmstxt.org
    date: 2024

--- abstract

This document registers two Well-Known URIs under the "/.well-known/"
path: "agents.txt" and "agents.json". These URIs define a
machine-readable capability declaration format that allows website
operators to declare what AI agents may do on their site, which
endpoints and protocols are available, what authentication mechanisms
are required, and what rate limits agents should respect.

The format is designed to be complementary to "robots.txt" {{ROBOTS}},
which controls crawl access. Where "robots.txt" declares restrictions,
"agents.txt" declares capabilities and sanctioned interaction patterns.

--- middle

# Introduction

Automated AI agents increasingly interact with websites to perform
tasks on behalf of users: searching product catalogs, retrieving
structured data, executing transactions, and calling APIs. These agents
are routinely blocked by bot detection systems, CAPTCHAs, and rate
limiters because no sanctioned channel for agent interaction exists.

Simultaneously, website operators have no standard mechanism to declare
which agent behaviors they support, which endpoints are designed for
machine access, or how agents should authenticate.

"agents.txt" addresses this gap. It is an opt-in capability declaration
file, served at a well-known location, that communicates to AI agents:

- What capabilities are available (search, browse, transact, etc.)
- Which protocols are supported (REST, MCP {{MCP}}, A2A, GraphQL, WebSocket)
- What authentication mechanisms are required (and where to obtain tokens)
- What rate limits the site declares
- Which agents are permitted and under what conditions

## Relationship to Existing Standards

"agents.txt" is complementary to, and does not replace, existing
standards:

robots.txt:
: Declares crawling restrictions. "agents.txt" declares what agents
  are explicitly permitted to do. Both files may coexist.

llms.txt {{LLMSTXT}}:
: Provides human-readable content for LLMs to read. "agents.txt"
  declares machine-callable endpoints and capabilities.

security.txt {{RFC9116}}:
: Declares security vulnerability disclosure contacts. "agents.txt"
  declares AI agent interaction policies.

OpenAPI:
: Documents individual API endpoints in detail. "agents.txt" is a
  discovery layer; it may reference OpenAPI specifications per
  capability.

MCP (Model Context Protocol):
: A protocol for AI tools. "agents.txt" can declare MCP endpoints,
  making them discoverable without prior configuration.

## Requirements Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and
"OPTIONAL" in this document are to be interpreted as described in
BCP 14 {{RFC2119}} {{RFC8174}} when, and only when, they appear in all
capitals, as shown here.

# The "agents.txt" Well-Known URI

## Location

The "agents.txt" file MUST be served at:

~~~
https://example.com/.well-known/agents.txt
~~~

Agents SHOULD also check the root path as a fallback:

~~~
https://example.com/agents.txt
~~~

The "/.well-known/agents.txt" path takes precedence when both exist.

The file MUST be served over HTTPS in production deployments. HTTP
is permitted only in development or testing environments.

The file MUST be served with Content-Type "text/plain; charset=utf-8".

## Format

The "agents.txt" file uses a block-based key-value format inspired by
"robots.txt". Each line contains a key, a colon, and a value. Lines
beginning with "#" are comments. Indented lines (two or more spaces,
or one or more tabs) belong to the preceding block.

A minimal "agents.txt" file:

~~~
# agents.txt
Spec-Version: 1.0
Site-Name: Example Store
Site-URL: https://example.com

Capability: product-search
  Endpoint: https://example.com/api/search
  Method: GET
  Protocol: REST
  Auth: none
  Rate-Limit: 60/minute
  Description: Search the product catalog

Allow: /api/*
Disallow: /admin/*

Agent: *
~~~

## Header Fields

Spec-Version (REQUIRED):
: The specification version. MUST be "1.0" for documents conforming
  to this specification.

Generated-At (OPTIONAL):
: ISO 8601 timestamp of when the file was generated.

## Site Fields

Site-Name (REQUIRED):
: Human-readable name of the site or service.

Site-URL (REQUIRED):
: Canonical HTTPS URL of the site.

Site-Description (OPTIONAL):
: Brief description of the site.

Site-Contact (OPTIONAL):
: Contact email address for agent-related inquiries.

Site-Privacy-Policy (OPTIONAL):
: URL of the site's privacy policy.

## Capability Blocks

A Capability block declares a single action available to agents.
Capability identifiers MUST consist of lowercase letters, digits, and
hyphens only.

Capability (REQUIRED):
: Identifier for this capability.

Endpoint (REQUIRED):
: Full HTTPS URL of the endpoint.

Protocol (REQUIRED):
: The interaction protocol. One of: REST, MCP, A2A, GraphQL, WebSocket.

Method (OPTIONAL):
: HTTP method for REST endpoints. Default: GET.

Auth (OPTIONAL):
: Authentication type. One of: none, api-key, bearer-token, oauth2,
  hmac. Default: none. Servers MUST NOT include actual credentials in
  this field.

Auth-Endpoint (OPTIONAL):
: URL where agents obtain authentication tokens. Required when Auth is
  "bearer-token" or "oauth2".

Rate-Limit (OPTIONAL):
: Advisory rate limit in the format "N/window" where window is one of:
  second, minute, hour, day. Agents SHOULD respect declared limits.
  Servers MUST enforce limits independently.

Description (OPTIONAL):
: Human-readable description of the capability.

OpenAPI (OPTIONAL):
: URL to an OpenAPI specification document describing the endpoint.

## Access Control Fields

Allow (OPTIONAL):
: Glob pattern for paths agents may access. Semantics follow
  "robots.txt" conventions.

Disallow (OPTIONAL):
: Glob pattern for paths agents MUST NOT access.

More specific patterns take precedence over less specific patterns.
When no access control is declared, only paths referenced by
capabilities are implicitly permitted.

## Agent Policy Blocks

Agent blocks declare per-agent policies. The wildcard "*" declares the
default policy for all agents.

~~~
Agent: *

Agent: claude
  Rate-Limit: 200/minute
  Capabilities: product-search, store-assistant
~~~

Agent identifiers SHOULD match the first token of the agent's
User-Agent header (case-insensitive).

Capabilities (OPTIONAL within an Agent block):
: Comma-separated list of capability identifiers this agent is
  permitted to use. If omitted, all declared capabilities are
  permitted.

# The "agents.json" Well-Known URI

## Location

The JSON companion file MUST be served at:

~~~
https://example.com/.well-known/agents.json
~~~

The file MUST be served with Content-Type "application/json; charset=utf-8".

## Format

The JSON format contains equivalent information to "agents.txt" in a
typed JSON structure suitable for direct consumption by programmatic
clients. The "agents.txt" file MAY reference the JSON file via:

~~~
Agents-JSON: https://example.com/.well-known/agents.json
~~~

A minimal "agents.json" document:

~~~ json
{
  "specVersion": "1.0",
  "generatedAt": "2026-02-01T00:00:00.000Z",
  "site": {
    "name": "Example Store",
    "url": "https://example.com"
  },
  "capabilities": [
    {
      "id": "product-search",
      "description": "Search the product catalog",
      "endpoint": "https://example.com/api/search",
      "method": "GET",
      "protocol": "REST",
      "auth": { "type": "none" },
      "rateLimit": { "requests": 60, "window": "minute" }
    }
  ],
  "access": {
    "allow": ["/api/*"],
    "disallow": ["/admin/*"]
  },
  "agents": {
    "*": {}
  }
}
~~~

Field semantics are identical to those defined in Section 2 for the
text format.

# Agent Behavior

## Discovery

Agents SHOULD fetch "/.well-known/agents.txt" and/or
"/.well-known/agents.json" before interacting with an unfamiliar site.

Agents SHOULD prefer the JSON format when both are available, as it
is more precisely typed and unambiguous.

Agents SHOULD cache the capability declaration for the duration
declared by the HTTP Cache-Control header. Implementations SHOULD
use a minimum cache TTL of 60 seconds to reduce server load.

## Identification

Agents SHOULD identify themselves via the User-Agent HTTP header when
calling capability endpoints. The agent name in the User-Agent header
is matched (case-insensitively) against Agent blocks to apply
per-agent policies.

## Rate Limiting

Agents SHOULD respect Rate-Limit declarations as advisory limits.
Servers MUST enforce rate limits independently and MUST NOT rely on
agents to self-enforce.

# Server Behavior

## Caching

Servers SHOULD serve "agents.txt" and "agents.json" with appropriate
Cache-Control headers. A max-age of 300 seconds (5 minutes) is
RECOMMENDED for most deployments.

## CORS

Servers SHOULD include the following headers to permit cross-origin
discovery:

~~~
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
~~~

## Security Considerations

Capability declarations MUST NOT include actual credentials, API keys,
tokens, or secrets of any kind. The Auth and Auth-Endpoint fields
describe mechanisms only.

Servers MUST enforce all declared restrictions (rate limits, access
control, agent policies) independently of the declarations in
"agents.txt". The file is advisory to agents; it is not a trust
boundary.

Agents MUST validate that capability endpoints use HTTPS before
sending authentication credentials.

Site owners SHOULD review their capability declarations periodically
to ensure they accurately reflect current server capabilities and
access policies.

# IANA Considerations

## Well-Known URI Registration: "agents.txt"

This document requests registration of the following Well-Known URI
in the "Well-Known URIs" registry established by {{RFC8615}}:

URI suffix:
: agents.txt

Change controller:
: Kayla Car

Specification document(s):
: This document.

Related information:
: Text-format capability declaration file for AI agent discovery.

## Well-Known URI Registration: "agents.json"

URI suffix:
: agents.json

Change controller:
: Kayla Car

Specification document(s):
: This document.

Related information:
: JSON-format capability declaration file for AI agent discovery.
  Companion format to agents.txt.

--- back

# Example: E-Commerce Site

~~~
# agents.txt
Spec-Version: 1.0
Generated-At: 2026-02-01T00:00:00Z
Site-Name: Outdoor Supply Co.
Site-URL: https://outdoorsupply.example
Site-Description: Gear for outdoor adventures
Site-Contact: agents@outdoorsupply.example

Capability: product-search
  Endpoint: https://outdoorsupply.example/api/search
  Method: GET
  Protocol: REST
  Auth: none
  Rate-Limit: 60/minute
  Description: Search the product catalog
  Param: q (query, string, required) — Search query
  Param: limit (query, integer) — Max results, default 20
  Param: category (query, string) — Filter by category

Capability: store-assistant
  Endpoint: https://outdoorsupply.example/mcp
  Protocol: MCP
  Auth: bearer-token
  Auth-Endpoint: https://outdoorsupply.example/auth/token
  Description: Full store interaction via MCP

Allow: /api/*
Allow: /mcp
Disallow: /admin/*
Disallow: /internal/*

Agent: *
Agent: claude
  Rate-Limit: 200/minute
  Capabilities: product-search, store-assistant
~~~

# Acknowledgments

The "agents.txt" format draws on the design of "robots.txt"
{{ROBOTS}}, "security.txt" {{RFC9116}}, and OpenAPI for structural
inspiration. The MCP protocol reference is to the Model Context
Protocol specification.
