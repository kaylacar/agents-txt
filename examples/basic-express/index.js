import express from "express";
import { agentsTxt } from "@agents-txt/express";

const app = express();

// One line to add agents.txt to your site
app.use(
  agentsTxt({
    site: {
      name: "Demo Store",
      url: "https://demo.example.com",
      description: "A demo store showing agents.txt in action",
      contact: "hello@demo.example.com",
    },
    capabilities: [
      {
        id: "product-search",
        description: "Search the product catalog",
        endpoint: "https://demo.example.com/api/search",
        method: "GET",
        protocol: "REST",
        rateLimit: { requests: 60, window: "minute" },
      },
      {
        id: "browse-products",
        description: "Browse all products with pagination",
        endpoint: "https://demo.example.com/api/products",
        method: "GET",
        protocol: "REST",
        rateLimit: { requests: 120, window: "minute" },
      },
    ],
    access: {
      allow: ["/api/*"],
      disallow: ["/admin/*"],
    },
  }),
);

// Mock API endpoints
app.get("/api/products", (req, res) => {
  res.json({
    products: [
      { id: 1, title: "Trail Running Shoes", price: "89.99" },
      { id: 2, title: "Hiking Backpack", price: "129.99" },
      { id: 3, title: "Camping Tent", price: "249.99" },
    ],
  });
});

app.get("/api/search", (req, res) => {
  const q = req.query.q || "";
  res.json({ query: q, results: [] });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Demo store running at http://localhost:${port}`);
  console.log(`agents.txt: http://localhost:${port}/.well-known/agents.txt`);
  console.log(`agents.json: http://localhost:${port}/.well-known/agents.json`);
});
