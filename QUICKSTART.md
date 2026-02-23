# Add agents.txt to Your Site in 5 Minutes

Your website has a front door for humans. `agents.txt` gives it a second door for AI agents — a machine-readable file that tells agents what they can do on your site, which endpoints to call, and how to behave.

No SDK. No code. Just a file.

---

## Step 1 — Create the file

Use the [generator](examples/generator/index.html) or copy this template and edit it:

```
# agents.txt — AI Agent Capability Declaration
Spec-Version: 1.0

Site-Name: My Store
Site-URL: https://yoursite.com
Site-Description: What your site does
Site-Contact: you@yoursite.com

Capability: search
  Endpoint: https://yoursite.com/api/search
  Method: GET
  Protocol: REST
  Auth: none
  Rate-Limit: 60/minute
  Description: Search the site

Allow: /api/*
Disallow: /admin/*

Agent: *
  Rate-Limit: 60/minute
  Capabilities: search
```

Change the values to match your site. Add or remove capabilities as needed.

See [examples/static-site/](examples/static-site/) for ready-to-copy templates for e-commerce, blogs, and SaaS.

---

## Step 2 — Upload it

Place the file at `/.well-known/agents.txt` on your site. Here's how for common hosts:

### Static hosting (Vercel, Netlify, Cloudflare Pages, GitHub Pages)

Create a `.well-known/` folder in your public/static directory and drop `agents.txt` inside:

```
public/
  .well-known/
    agents.txt
```

### Nginx

```nginx
location /.well-known/agents.txt {
    alias /var/www/html/.well-known/agents.txt;
    default_type text/plain;
}
```

### Apache

The file just works if placed in `.well-known/` under your document root. No config needed.

### WordPress

Upload `agents.txt` to your web root's `.well-known/` directory. If your host doesn't allow dotfiles, add to `.htaccess`:

```
RewriteRule ^\.well-known/agents\.txt$ /agents.txt [L]
```

### S3 / static bucket

Upload with the key `.well-known/agents.txt` and set Content-Type to `text/plain`.

---

## Step 3 — Test it

```bash
curl https://yoursite.com/.well-known/agents.txt
```

If you see your file, it works. AI agents can now discover your site.

---

## Optional: Add the JSON version

Agents prefer `agents.json` — it's structured and easier to parse. Place it alongside the text file:

```
.well-known/
  agents.txt      <- human-readable
  agents.json     <- machine-readable (agents try this first)
```

The [generator](examples/generator/index.html) outputs both formats. Or see [examples/static-site/agents.json](examples/static-site/agents.json) for the JSON template.

---

## What happens next

Once your file is live:

1. AI agents that support agents.txt will discover your site automatically
2. They'll read your capabilities and know exactly what they can do
3. They'll respect your rate limits and access rules
4. No scraping, no CAPTCHA battles, no guessing — just a clean machine-readable path

---

## Want more?

| Want to... | Use... |
|-----------|--------|
| Serve agents.txt from Express/Node | [@agents-txt/express](https://github.com/kaylacar/agents-txt) |
| Give agents live capabilities (sessions, cart, checkout) | [@agents-protocol/sdk](https://github.com/kaylacar/agents-protocol) |
| Add cryptographic audit trails | [RER](https://github.com/kaylacar/rer) with `audit: true` |
| Declare AI training policy | [ai.txt](https://github.com/kaylacar/ai-txt) |

---

## The idea

The web was built for humans. Every frontend — navigation, buttons, checkout flows — is a translation layer between a human and data. AI agents don't need that translation. They need the data directly, with clear rules.

`agents.txt` is the agent door. Same site, same data, second door.

Your CAPTCHA keeps bots out of your human door. Legitimate AI agents need their own way in.
