# Show HN: agents.txt and ai.txt — open standards for AI agent interaction

**Title:** Show HN: agents.txt and ai.txt – open standards for what AI agents can do and what's allowed

---

## Post body

We built two complementary open standards for AI agent interaction with websites, and we're releasing them today.

**agents.txt** — a capability declaration file. Place it at `/.well-known/agents.txt` to tell AI agents what they can do on your site:

```
Capability: product-search
  Endpoint: https://mystore.com/api/search
  Protocol: REST
  Auth: none
  Rate-Limit: 60/minute

Agent: claude
  Rate-Limit: 200/minute
```

**ai.txt** — a policy declaration file. Place it at `/.well-known/ai.txt` to declare training rights and licensing:

```
Training: conditional
Training-Allow: /articles/free/*
Training-Deny: /articles/premium/*
Training-License: CC-BY-4.0

Agent: ClaudeBot
  Training: allow
Agent: GPTBot
  Training: deny
```

The problem they solve: AI agents are hitting websites with no sanctioned channel, getting blocked by CAPTCHAs and rate limiters. Site owners have no way to say "you're welcome here, here's how to interact." And there's no machine-readable way to say "you may read this but not train on it."

`robots.txt` handles crawl blocking. These handle everything else.

**Live demo:** [URL]

**npm:**
```
npm install @agents-txt/express  # serve agents.txt in one line
npm install @ai-txt/express      # serve ai.txt in one line
npm install @agents-txt/core     # parse/validate/generate
npm install @ai-txt/core         # parse/validate/resolve
```

Both specs are filed with IANA for well-known URI registration (pending review).

**GitHub:**
- https://github.com/kaylacar/agents-txt
- https://github.com/kaylacar/ai-txt

The reference SDK (agents-protocol) adds session management, audit artifacts, and a typed client: https://github.com/kaylacar/agents-protocol

Happy to answer questions about the design decisions — why these are separate from robots.txt, how agent name matching works, the IANA process, etc.

