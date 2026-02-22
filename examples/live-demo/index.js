import express from "express";
import { agentsTxt } from "@agents-txt/express";
import { aiTxt } from "@ai-txt/express";

const app = express();

// agents.txt — what AI agents can DO on this site
app.use(
  agentsTxt({
    site: {
      name: "My Store",
      url: "https://mystore.example.com",
      description: "A demo site showing agents.txt and ai.txt in action",
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
    ],
    agents: {
      "*": { rateLimit: { requests: 30, window: "minute" } },
      claude: { rateLimit: { requests: 120, window: "minute" }, capabilities: ["product-search"] },
    },
  })
);

// ai.txt — policy for training, scraping, and licensing
app.use(
  aiTxt({
    site: {
      name: "My Store",
      url: "https://mystore.example.com",
      contact: "ai-policy@mystore.example.com",
    },
    policies: {
      training: "conditional",
    },
    trainingPaths: {
      allow: ["/products/public/*"],
      deny: ["/products/members/*"],
    },
    licensing: {
      license: "CC-BY-4.0",
    },
    agents: {
      "*": { rateLimit: { requests: 30, window: "minute" } },
      ClaudeBot: { training: "allow", rateLimit: { requests: 120, window: "minute" } },
      GPTBot: { training: "deny" },
    },
    content: {
      attribution: "required",
    },
  })
);

// Homepage
app.get("/", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html>
<head>
  <title>agents.txt + ai.txt demo</title>
  <style>
    body { font-family: monospace; max-width: 680px; margin: 60px auto; padding: 0 20px; line-height: 1.6; }
    h1 { font-size: 1.2em; }
    h2 { font-size: 1em; margin-top: 2em; }
    a { color: #0070f3; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 0.9em; }
    .tag { display: inline-block; font-size: 0.8em; padding: 2px 8px; border-radius: 3px; margin-right: 6px; }
    .tag-blue { background: #e0f0ff; color: #0070f3; }
    .tag-green { background: #e6f9f0; color: #0a7c42; }
  </style>
</head>
<body>
<h1>agents.txt + ai.txt live demo</h1>

<p>
  This site serves two open standards for AI agent interaction:
</p>

<h2><span class="tag tag-blue">agents.txt</span> What agents can <em>do</em> here</h2>
<p>Declares available capabilities, endpoints, auth, and rate limits.</p>
<ul>
  <li><a href="/.well-known/agents.json">/.well-known/agents.json</a> — machine-readable</li>
  <li><a href="/.well-known/agents.txt">/.well-known/agents.txt</a> — human-readable</li>
</ul>

<h2><span class="tag tag-green">ai.txt</span> What's <em>allowed</em> and under what terms</h2>
<p>Declares training policy, licensing, and per-agent rules.</p>
<ul>
  <li><a href="/.well-known/ai.json">/.well-known/ai.json</a> — machine-readable</li>
  <li><a href="/.well-known/ai.txt">/.well-known/ai.txt</a> — human-readable</li>
</ul>

<h2>Policy summary</h2>
<pre>Training:  conditional (public products allowed under CC-BY-4.0)
ClaudeBot: training allowed, 120 req/min
GPTBot:    training denied
All agents: 30 req/min default
Attribution: required</pre>

<h2>Standards</h2>
<ul>
  <li><a href="https://github.com/kaylacar/agents-txt">github.com/kaylacar/agents-txt</a></li>
  <li><a href="https://github.com/kaylacar/ai-txt">github.com/kaylacar/ai-txt</a></li>
</ul>
</body>
</html>`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Demo running at http://localhost:${port}`);
  console.log(`agents.json: http://localhost:${port}/.well-known/agents.json`);
  console.log(`ai.json:     http://localhost:${port}/.well-known/ai.json`);
});
