# Static Site Example

Add agents.txt to any website — no code, no dependencies, no server changes.

## Setup

1. Copy `agents.txt` and `agents.json` from this directory
2. Edit them with your site's details
3. Upload both files to `/.well-known/` on your site

## Where to put the files

| Host | Path |
|------|------|
| Apache/Nginx | Create a `.well-known/` directory in your web root |
| Vercel | Add to `public/.well-known/` |
| Netlify | Add to `static/.well-known/` or your publish directory |
| Cloudflare Pages | Add to your output directory under `.well-known/` |
| GitHub Pages | Add to your repo root under `.well-known/` |
| WordPress | Upload to `wp-content/` and add a rewrite rule (see below) |
| S3 / static hosting | Upload with the `.well-known/` prefix |

### WordPress rewrite rule

Add to `.htaccess`:

```
RewriteRule ^\.well-known/agents\.txt$ /wp-content/agents.txt [L]
RewriteRule ^\.well-known/agents\.json$ /wp-content/agents.json [L]
```

### Nginx

```nginx
location /.well-known/agents.txt {
    alias /var/www/html/.well-known/agents.txt;
    default_type text/plain;
}
location /.well-known/agents.json {
    alias /var/www/html/.well-known/agents.json;
    default_type application/json;
}
```

## Verify it works

```bash
curl https://yoursite.com/.well-known/agents.txt
```

If you see your file, agents can find you.

## Templates

This directory includes ready-to-use templates:

| File | Use case |
|------|----------|
| `agents.txt` | E-commerce store |
| `agents.json` | Same store, JSON format |
| `blog.agents.txt` | Blog or content site |
| `blog.agents.json` | Same blog, JSON format |
| `saas.agents.txt` | SaaS product with API (includes OAuth2 dynamic registration) |
| `saas.agents.json` | Same SaaS, JSON format |

Copy the one closest to your site and edit the values.