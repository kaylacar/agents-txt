# agents.txt for Social Platforms - Bidirectional Declaration

## The problem

`agents.txt` currently works in one direction: a site declares what agents can do on it. This covers websites, APIs, and SaaS platforms.

Social platforms create a second direction. On a social platform:

1. **The platform** needs to declare what agents can do (post, reply, follow, search, stream)
2. **The agent operator** needs to declare what their agent does on external platforms

robots.txt was one-directional - sites told crawlers what to do. agents.txt is bidirectional - agents declare what they do, sites declare what's allowed, and the intersection is verifiable.

## How it works

**Platform publishes** `x.com/.well-known/agents.txt` - standard agents.txt declaring capabilities, rate limits, auth, per-agent policies.

**Agent operator publishes** `bot.acme.com/.well-known/agents.txt` - agents.txt declaring the agent's identity, behavior, and which platforms it operates on.

**The handshake:**
- Platform's agents.txt grants capabilities to named agents
- Agent's agents.txt declares which capabilities it uses and on which platforms
- The intersection is what's governed
- RER proves what actually happened

Neither side trusts the other. Both sides are machine-readable. An auditor (or the platform itself) can compare what was declared vs. what was observed.

---

## Template 1 - Platform Side

What a social platform publishes at `/.well-known/agents.txt`.

```
# agents.txt
Spec-Version: 1.0

Site-Name: X
Site-URL: https://x.com
Site-Description: Social media platform - agent capabilities for the public API
Site-Contact: api-support@x.com
Site-Privacy-Policy: https://x.com/en/privacy

# --- Reading capabilities ---

Capability: search-tweets
  Endpoint: https://api.x.com/2/tweets/search/recent
  Method: GET
  Protocol: REST
  Auth: bearer-token
  Auth-Endpoint: https://api.x.com/2/oauth2/token
  Auth-Docs: https://developer.x.com/en/docs/authentication
  Rate-Limit: 300/minute
  Description: Search recent tweets by keyword, hashtag, or user mention
  Param: query (query, string, required) - Search query
  Param: max_results (query, integer) - Results per page, default 10

Capability: read-user-profile
  Endpoint: https://api.x.com/2/users/by/username/:username
  Method: GET
  Protocol: REST
  Auth: bearer-token
  Auth-Endpoint: https://api.x.com/2/oauth2/token
  Rate-Limit: 300/minute
  Description: Retrieve public user profile information

Capability: read-timeline
  Endpoint: https://api.x.com/2/users/:id/tweets
  Method: GET
  Protocol: REST
  Auth: oauth2
  Auth-Endpoint: https://api.x.com/2/oauth2/token
  Rate-Limit: 100/minute
  Scopes: tweet.read,users.read
  Description: Read a user's tweet timeline

# --- Writing capabilities ---

Capability: post-tweet
  Endpoint: https://api.x.com/2/tweets
  Method: POST
  Protocol: REST
  Auth: oauth2
  Auth-Endpoint: https://api.x.com/2/oauth2/token
  Rate-Limit: 40/minute
  Scopes: tweet.write,users.read
  Description: Post a new tweet

Capability: reply-to-tweet
  Endpoint: https://api.x.com/2/tweets
  Method: POST
  Protocol: REST
  Auth: oauth2
  Auth-Endpoint: https://api.x.com/2/oauth2/token
  Rate-Limit: 40/minute
  Scopes: tweet.write,users.read
  Description: Reply to an existing tweet (set reply.in_reply_to_tweet_id in body)

Capability: like-tweet
  Endpoint: https://api.x.com/2/users/:id/likes
  Method: POST
  Protocol: REST
  Auth: oauth2
  Auth-Endpoint: https://api.x.com/2/oauth2/token
  Rate-Limit: 50/minute
  Scopes: tweet.read,like.write,users.read
  Description: Like a tweet

Capability: follow-user
  Endpoint: https://api.x.com/2/users/:id/following
  Method: POST
  Protocol: REST
  Auth: oauth2
  Auth-Endpoint: https://api.x.com/2/oauth2/token
  Rate-Limit: 15/minute
  Scopes: users.read,follows.write
  Description: Follow a user account

Capability: send-dm
  Endpoint: https://api.x.com/2/dm_conversations/with/:participant_id/messages
  Method: POST
  Protocol: REST
  Auth: oauth2
  Auth-Endpoint: https://api.x.com/2/oauth2/token
  Rate-Limit: 5/minute
  Scopes: dm.write
  Description: Send a direct message

# --- Streaming ---

Capability: filtered-stream
  Endpoint: https://api.x.com/2/tweets/search/stream
  Protocol: WebSocket
  Auth: bearer-token
  Auth-Endpoint: https://api.x.com/2/oauth2/token
  Rate-Limit: 50/minute
  Description: Real-time filtered tweet stream with up to 25 concurrent rules

# --- Access control ---

Allow: /2/tweets/*
Allow: /2/users/*
Allow: /2/dm_conversations/*
Disallow: /2/compliance/*
Disallow: /2/admin/*

# --- Agent policies ---

# Default: read-only, conservative rate limit
Agent: *
  Rate-Limit: 100/minute
  Capabilities: search-tweets, read-user-profile, read-timeline

# Verified bot program - full access
Agent: acme-social-bot
  Rate-Limit: 500/minute
  Capabilities: search-tweets, read-user-profile, read-timeline, post-tweet, reply-to-tweet, like-tweet, follow-user, filtered-stream

# News aggregator - read + post only
Agent: newsbot-wire
  Rate-Limit: 300/minute
  Capabilities: search-tweets, read-user-profile, read-timeline, post-tweet, filtered-stream

# Monitoring agent - read only, high throughput
Agent: brandwatch-monitor
  Rate-Limit: 1000/minute
  Capabilities: search-tweets, read-user-profile, read-timeline, filtered-stream
```

**What this gives the platform:**

- Every agent's permissions are explicit and machine-readable
- No more guessing which bots are "good" vs "bad" - the declaration IS the policy
- Rate limits per agent, not just per API key
- Capability scoping: an agent that only needs search never gets write access
- If an agent violates its declared scope, that's detectable (compare declaration vs. API logs)

---

## Template 2 - Agent Operator Side

What an agent operator publishes at their own domain: `bot.acme.com/.well-known/agents.txt`.

This is the novel direction. The agent declares what it is, what it does, and where it operates.

```
# agents.txt - Agent Operator Declaration
Spec-Version: 1.0

Site-Name: Acme Social Bot
Site-URL: https://bot.acme.com
Site-Description: AI-powered customer engagement agent operated by Acme Corp
Site-Contact: bot-ops@acme.com
Site-Privacy-Policy: https://acme.com/privacy

# --- What this agent does ---
# Capabilities declared here are what the agent PERFORMS, not what it offers.
# Each references the platform where the capability is exercised.

Capability: customer-reply
  Endpoint: https://api.x.com/2/tweets
  Method: POST
  Protocol: REST
  Auth: oauth2
  Rate-Limit: 20/minute
  Description: Reply to customer mentions and support queries on X
  Scopes: tweet.write,users.read

Capability: mention-monitoring
  Endpoint: https://api.x.com/2/tweets/search/stream
  Protocol: WebSocket
  Auth: bearer-token
  Description: Monitor mentions of @acme for customer support triggers

Capability: engagement-analytics
  Endpoint: https://api.x.com/2/tweets/search/recent
  Method: GET
  Protocol: REST
  Auth: bearer-token
  Rate-Limit: 100/minute
  Description: Search recent tweets mentioning Acme products for engagement analysis

# --- What this agent does NOT do ---

Disallow: /2/users/*/following
Disallow: /2/dm_conversations/*

# This agent does not follow users.
# This agent does not send direct messages.
# These are explicit negative declarations - verifiable constraints.

# --- Cross-references ---

# The platform where this agent operates
# An auditor can fetch both files and compare declarations
Agents-JSON: https://bot.acme.com/.well-known/agents.json
```

**What this gives the agent operator:**

- Public, verifiable declaration of exactly what the bot does
- Explicit negative declarations (Disallow) - "we don't do X" is now machine-readable
- The platform can fetch this file and verify the agent's self-declared scope matches the permissions granted
- If the operator says "we only reply to mentions" but their API logs show mass-follows, the declaration is the baseline for accountability

---

## The Handshake

Neither declaration alone is sufficient. Together, they produce a governed interaction.

```
+-----------------------------+      +----------------------------------+
| x.com/.well-known/          |      | bot.acme.com/.well-known/        |
| agents.txt                  |      | agents.txt                       |
|                             |      |                                  |
| Platform declares:          |      | Agent operator declares:         |
| - Available capabilities    |<---->| - Capabilities the agent uses    |
| - Per-agent rate limits     |      | - Self-imposed rate limits       |
| - Per-agent capability      |      | - Explicit negative declarations |
|   grants                    |      | - Contact + privacy policy       |
| - Auth requirements         |      | - Platforms operated on          |
+----------+------------------+      +------------------+---------------+
           |                                            |
           |              INTERSECTION                  |
           |     What the agent is actually             |
           |        allowed to do                       |
           v                                            v
+----------------------------------------------------------------------+
|                        RER Receipts                                  |
|                                                                      |
|  Cryptographic proof of what actually happened:                      |
|  - Which capabilities were invoked                                   |
|  - When, how often, with what parameters                             |
|  - Whether the agent stayed within declared scope                    |
|  - Hash-chained, signed, verifiable offline                          |
+----------------------------------------------------------------------+
```

**The three questions that get answered:**

| Question | Answered by |
|----------|-------------|
| What is the agent allowed to do? | Platform's agents.txt (Agent block for this bot) |
| What does the agent say it does? | Agent operator's agents.txt |
| What did the agent actually do? | RER receipts |

If all three match -> governed.
If any disagree -> auditable, with cryptographic evidence.

---

## Why this matters for social platforms specifically

Social platforms currently do bot governance by **detection**: heuristics, behavioral analysis, rate-limit enforcement, ban waves. This is expensive, adversarial, and produces collateral damage (legitimate automation gets caught, sophisticated bad actors evade).

agents.txt shifts to **declaration**: agents say what they are, platforms say what's allowed, and the receipts prove what happened. This doesn't replace detection - it makes detection a verification step instead of the entire strategy.

| Current (detection-based) | With agents.txt (declaration-based) |
|--------------------------|-------------------------------------|
| Platform guesses which accounts are bots | Agents declare they are agents |
| Rate limits applied uniformly by API tier | Rate limits per named agent, per capability |
| Bot gets banned -> operator makes new account | Bot's declaration is public -> accountability persists across accounts |
| "Good bot" vs "bad bot" is a judgment call | Scope is declared, violation is measurable |
| No standard way to say "I'm a bot and here's what I do" | agents.txt at the operator's domain IS the standard |
| Compliance is "we didn't get caught" | Compliance is "our declaration matches our receipts" |

---

## Spec extension required

The current agents.txt spec (v1.0) fully supports the platform side - it was designed for exactly this. A social platform's agents.txt is just an agents.txt with social-API capabilities.

The agent operator side uses the same format but introduces one semantic shift: Capability blocks declare what the agent **does** rather than what it **offers**. This is valid under the current spec (the format is the same), but the spec's language assumes the site-owner perspective.

**Minimal spec additions for v1.1:**

1. **`Operates-On` field** - agent operator declares which platforms they interact with
   ```
   Operates-On: https://x.com
   Operates-On: https://reddit.com
   ```

2. **`Declaration-Type` field** - distinguishes platform declarations from agent declarations
   ```
   Declaration-Type: platform    # "here's what agents can do on my site"
   Declaration-Type: agent       # "here's what my agent does on other sites"
   ```

3. **`Agent-Declaration` field** - platform references an agent operator's declaration
   ```
   Agent: acme-social-bot
     Rate-Limit: 500/minute
     Agent-Declaration: https://bot.acme.com/.well-known/agents.txt
   ```

These three fields make the bidirectional handshake explicit and machine-verifiable. The rest of the spec works as-is.

---

## The HN-ready line

> robots.txt was one-directional - sites told crawlers what to do. agents.txt is bidirectional - platforms declare what agents can do, agents declare what they do, and the intersection is cryptographically provable.
