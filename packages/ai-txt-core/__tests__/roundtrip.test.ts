import { describe, it, expect } from "vitest";
import { generate } from "../src/generator.js";
import { generateJSON } from "../src/generator-json.js";
import { parse } from "../src/parser.js";
import { parseJSON } from "../src/parser-json.js";
import type { AiTxtDocument } from "../src/types.js";

const testDoc: AiTxtDocument = {
  specVersion: "1.0",
  site: {
    name: "Roundtrip Store",
    url: "https://roundtrip.example.com",
    contact: "test@roundtrip.com",
  },
  policies: {
    training: "conditional",
  },
  trainingPaths: {
    allow: ["/public/*"],
    deny: ["/private/*"],
  },
  licensing: {
    license: "CC-BY-4.0",
  },
  content: {
    attribution: "required",
  },
  agents: {
    "*": { rateLimit: { requests: 30, window: "minute" } },
    ClaudeBot: { training: "allow", rateLimit: { requests: 120, window: "minute" } },
  },
};

describe("roundtrip: generate -> parse", () => {
  it("text roundtrip preserves site info", () => {
    const text = generate(testDoc);
    const result = parse(text);
    expect(result.success).toBe(true);
    expect(result.document?.site.name).toBe(testDoc.site.name);
    expect(result.document?.site.url).toBe(testDoc.site.url);
    expect(result.document?.site.contact).toBe(testDoc.site.contact);
  });

  it("text roundtrip preserves training policy", () => {
    const text = generate(testDoc);
    const result = parse(text);
    expect(result.document?.policies.training).toBe("conditional");
  });

  it("text roundtrip preserves training paths", () => {
    const text = generate(testDoc);
    const result = parse(text);
    expect(result.document?.trainingPaths.allow).toEqual(["/public/*"]);
    expect(result.document?.trainingPaths.deny).toEqual(["/private/*"]);
  });

  it("text roundtrip preserves licensing", () => {
    const text = generate(testDoc);
    const result = parse(text);
    expect(result.document?.licensing.license).toBe("CC-BY-4.0");
  });

  it("text roundtrip preserves content attribution", () => {
    const text = generate(testDoc);
    const result = parse(text);
    expect(result.document?.content.attribution).toBe("required");
  });

  it("text roundtrip preserves agent policies", () => {
    const text = generate(testDoc);
    const result = parse(text);
    expect(result.document?.agents["*"].rateLimit?.requests).toBe(30);
    expect(result.document?.agents["ClaudeBot"].training).toBe("allow");
    expect(result.document?.agents["ClaudeBot"].rateLimit?.requests).toBe(120);
  });

  it("JSON roundtrip produces identical document", () => {
    const json = generateJSON(testDoc);
    const result = parseJSON(json);
    expect(result.success).toBe(true);
    expect(result.document).toEqual(testDoc);
  });
});
