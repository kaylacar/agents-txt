import express from "express";
import { agentsTxt } from "@agents-txt/express";

const app = express();

// agents.txt — what AI agents can DO on this site
app.use(
  agentsTxt({
    site: {
      name: "My Store",
      url: "https://mystore.example.com",
      description: "A demo site showing the agents.txt standard in action",
    },
    capabilities: [
      {
        id: "product-search",
        description: "Search the product catalog",
        endpoint: "https://mystore.example.com/api/search",
        method: "GET",
        protocol: "REST",
        auth: { type: "none" },
        rateLimit: { requests: 60, window: "minute" },
        parameters: [
          { name: "q", in: "query", type: "string", required: true, description: "Search query" },
          { name: "limit", in: "query", type: "integer", description: "Max results (default 20)" },
        ],
      },
      {
        id: "store-assistant",
        description: "Full store interaction via MCP",
        endpoint: "https://mystore.example.com/mcp",
        protocol: "MCP",
        auth: { type: "bearer-token", tokenEndpoint: "https://mystore.example.com/auth/token" },
      },
    ],
    access: {
      allow: ["/api/*", "/mcp"],
      disallow: ["/admin/*"],
    },
    agents: {
      "*": { rateLimit: { requests: 30, window: "minute" } },
      claude: { rateLimit: { requests: 120, window: "minute" }, capabilities: ["product-search", "store-assistant"] },
    },
  })
);

// Homepage
app.get("/", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html>
<head>
  <title>agents.txt demo</title>
  <style>
    body { font-family: monospace; max-width: 680px; margin: 60px auto; padding: 0 20px; line-height: 1.6; }
    h1 { font-size: 1.2em; }
    h2 { font-size: 1em; margin-top: 2em; }
    a { color: #0070f3; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 0.9em; }
  </style>
</head>
<body>
<h1>agents.txt live demo</h1>

<p>
  This site demonstrates the <a href="https://github.com/kaylacar/agents-txt">agents.txt</a>
  web standard for declaring AI agent capabilities.
</p>

<h2>Endpoints</h2>
<ul>
  <li><a href="/.well-known/agents.json">/.well-known/agents.json</a> — machine-readable (JSON)</li>
  <li><a href="/.well-known/agents.txt">/.well-known/agents.txt</a> — human-readable (text)</li>
</ul>

<h2>Declared capabilities</h2>
<pre>product-search:  GET /api/search (REST, no auth, 60 req/min)
store-assistant: /mcp (MCP, bearer-token auth)</pre>

<h2>Agent policies</h2>
<pre>All agents:  30 req/min
claude:      120 req/min, product-search + store-assistant</pre>

<h2>Learn more</h2>
<ul>
  <li><a href="https://github.com/kaylacar/agents-txt">github.com/kaylacar/agents-txt</a></li>
</ul>
</body>
</html>`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Demo running at http://localhost:${port}`);
  console.log(`agents.json: http://localhost:${port}/.well-known/agents.json`);
  console.log(`agents.txt:  http://localhost:${port}/.well-known/agents.txt`);
});
