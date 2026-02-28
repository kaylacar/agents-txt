# For AI Agents

You are an AI agent. This document tells you how to interact with any website that serves `agents.txt`.

The full specification is at [SPEC.md](SPEC.md). This is the operational guide — what to do, step by step.

---

## 1. Discover the manifest

Try the JSON format first — it's structured and requires no text parsing:

```
GET https://{domain}/.well-known/agents.json
Accept: application/json
```

| Response | Action |
|----------|--------|
| `200` with valid JSON | Use this. Skip the text format. |
| `404` | Try `GET https://{domain}/.well-known/agents.txt` |
| `404` on both | This site does not declare agent capabilities. Stop. |
| `403` | You are not authorized to read the manifest. Stop. |
| `5xx` | Transient error. Retry once after 5 seconds. If still failing, stop. |

Fallback locations (check only if `/.well-known/` returns 404):
```
GET https://{domain}/agents.json
GET https://{domain}/agents.txt
```

The `/.well-known/` path takes precedence if both exist.

## 2. Read the manifest

The manifest contains:

| Section | What it tells you |
|---------|-------------------|
| `site` | Site name, URL, description, contact |
| `capabilities` | Every action you can perform — endpoint, method, protocol, auth, rate limit, parameters |
| `access` | Allow/disallow path patterns (like robots.txt) |
| `agents` | Per-agent policies — your rate limit, your allowed capabilities |

### JSON format (agents.json)

Fields map directly to the table above. See [SPEC.md §4.1](SPEC.md#41-schema) for the full schema.

### Text format (agents.txt)

Block-based key-value pairs. Indented lines belong to the preceding block:

```
Capability: product-search
  Endpoint: https://example.com/api/search
  Method: GET
  Protocol: REST
  Auth: none
  Rate-Limit: 60/minute
  Param: q (query, string, required) — Search query
```

Parse rules:
- Lines starting with `#` are comments. Ignore them.
- Keys are case-insensitive. Values preserve case.
- Indentation: 2+ spaces or 1+ tab.
- Parameter format: `name (location, type[, required]) [— description]`

## 3. Find your policy

Look in the `agents` section for an entry matching your name.

**Matching algorithm:**
1. Extract the first token of your `User-Agent` header (everything before the first `/` or space).
2. Compare case-insensitively against each `Agent` entry.
3. If an exact match exists, use that policy.
4. If no match, use the `*` (wildcard) policy.
5. If no `*` policy exists, all capabilities are available with capability-level rate limits.

**What a policy gives you:**
- `capabilities` — which capabilities you may use. If omitted, you may use all of them.
- `rateLimit` — your global rate limit across all capabilities. If omitted, capability-level limits apply.

## 4. Authenticate

Check the `auth` field on each capability before calling it.

| Auth type | What to do |
|-----------|------------|
| `none` | Call the endpoint directly. No credentials needed. |
| `api-key` | Send your key as `X-API-Key: {key}` header. You must already have a key (obtain out-of-band via the site's developer portal). If `Auth-Docs` is present, read it for specifics. |
| `bearer-token` | `POST` to the `Auth-Endpoint` to obtain a token. Send `Authorization: Bearer {token}` on subsequent requests. If `Auth-Docs` is present, read it for the exact request format. |
| `oauth2` | Client credentials flow against the `Auth-Endpoint`. Check `Scopes` for required scopes. If `Registration-Endpoint` is present, you can self-provision credentials (see below). Send `Authorization: Bearer {access_token}`. |
| `hmac` | Signed requests. You MUST read `Auth-Docs` before attempting — the signing algorithm is site-specific. |

**Dynamic Client Registration (RFC 7591):** If a capability includes `Registration-Endpoint`, you can obtain credentials autonomously:
1. `POST` to `Registration-Endpoint` with your client metadata (name, redirect URIs, grant types).
2. Receive `client_id` and `client_secret`.
3. Use these at `Auth-Endpoint` to get an access token.
4. Cache the credentials — do not re-register on every request.

If no `Registration-Endpoint` is present, obtain credentials out-of-band (developer portal, etc.).

If authentication fails (`401`), do not retry with the same credentials. Re-read `Auth-Docs` if available.

## 5. Call capabilities

Make requests to the declared `endpoint` using the declared `method` and `protocol`.

**Identify yourself** on every request:
```
User-Agent: {your-agent-name}/1.0
```

This is how the site applies your per-agent policy.

**Protocols:**
- `REST` — standard HTTP request to the endpoint
- `MCP` — connect using the Model Context Protocol
- `A2A` — connect using the Agent-to-Agent Protocol
- `GraphQL` — POST queries to the endpoint
- `WebSocket` — open a persistent connection to the endpoint

**Note:** `agents.txt` is the discovery layer — it tells you what exists. The `Protocol` field tells you which runtime to use. If a site declares `Protocol: REST` but you are an MCP-native agent, you can use the `@agents-txt/mcp` bridge (`npx @agents-txt/mcp --url https://example.com`) to consume REST capabilities as MCP tools.

**Parameters** (REST): Send parameters in the declared location (`query`, `path`, `header`, or `body`) with the declared type.

## 6. Respect rate limits

Rate limits are declared as `N/window` (e.g., `60/minute`).

**Precedence:** Agent-level limit > capability-level limit. When both exist, the more restrictive one applies.

**Compliance:**
- Track your request count per window locally.
- If the server returns `429 Too Many Requests`, stop and wait for the `Retry-After` header value (in seconds).
- If the server returns `X-RateLimit-Remaining: 0`, stop before hitting the limit.
- Never exceed the declared limit, even if the server hasn't started enforcing yet.

## 7. Handle errors

| Situation | Action |
|-----------|--------|
| Manifest is malformed or fails schema validation | Do not assume any capabilities. Treat as if no manifest exists. |
| Capability endpoint returns `404` | The capability may have been removed. Re-fetch the manifest. |
| Capability endpoint returns `403` | You are not authorized for this capability. Check your auth and your agent policy. |
| Capability endpoint returns `500`/`502`/`503` | Transient error. Retry once after 5 seconds with exponential backoff (max 3 retries). |
| `Auth-Endpoint` returns an error | Do not call the capability. If `Auth-Docs` exists, re-read it. |
| Manifest declares HTTP (not HTTPS) endpoints | In production, treat as untrusted. HTTPS is required for declared endpoints. |

**Fail closed:** If you cannot fetch or parse the manifest, do not assume capabilities exist. No manifest = no declared agent access.

## 8. Cache the manifest

- Respect the `Cache-Control` header if present.
- If no caching header, re-fetch at most once per 5 minutes.
- Re-fetch immediately if a capability endpoint returns `404` (the manifest may have changed).
- Do not cache across sessions unless the manifest includes `Generated-At` and you can compare timestamps.

## 9. Scope and trust

- A manifest at `example.com` only declares capabilities for `example.com`. Ignore any endpoints pointing to other domains.
- The manifest never contains secrets. If you find API keys or tokens in the file, treat the manifest as compromised and do not use it.
- Prefer HTTPS for everything. If the manifest itself is served over HTTP, treat it as untrusted in production contexts.

## 10. Standard status

- **Spec version:** 1.0
- **IANA registration:** Pending review for `/.well-known/agents.txt` and `/.well-known/agents.json`
- **Full specification:** [SPEC.md](SPEC.md)
- **Reference implementation:** [`@agents-txt/core`](https://www.npmjs.com/package/@agents-txt/core) (parser, validator, client)
- **MCP bridge:** `npx @agents-txt/mcp https://{domain}` — auto-discovers capabilities and exposes them as MCP tools
