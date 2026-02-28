import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generate } from "../src/generator.js";
import { generateJSON } from "../src/generator-json.js";
import { parse } from "../src/parser.js";
import { parseJSON } from "../src/parser-json.js";
import { validate } from "../src/validator.js";

const EXAMPLES_DIR = resolve(__dirname, "../../../examples/static-site");

const TEXT_FILES = ["agents.txt", "blog.agents.txt", "saas.agents.txt"];
const JSON_FILES = ["agents.json", "blog.agents.json", "saas.agents.json"];

function readExample(filename: string): string {
  return readFileSync(resolve(EXAMPLES_DIR, filename), "utf-8");
}

describe("example files", () => {
  describe("text format (.txt)", () => {
    for (const file of TEXT_FILES) {
      it(`${file} parses successfully`, () => {
        const result = parse(readExample(file));
        expect(result.success, `Parse errors: ${JSON.stringify(result.errors)}`).toBe(true);
      });

      it(`${file} validates without errors`, () => {
        const parseResult = parse(readExample(file));
        expect(parseResult.success).toBe(true);
        const validationResult = validate(parseResult.document!);
        expect(validationResult.errors, `Validation errors: ${JSON.stringify(validationResult.errors)}`).toEqual([]);
      });
    }
  });

  describe("JSON format (.json)", () => {
    for (const file of JSON_FILES) {
      it(`${file} parses successfully`, () => {
        const result = parseJSON(readExample(file));
        expect(result.success, `Parse errors: ${JSON.stringify(result.errors)}`).toBe(true);
      });

      it(`${file} validates without errors`, () => {
        const parseResult = parseJSON(readExample(file));
        expect(parseResult.success).toBe(true);
        const validationResult = validate(parseResult.document!);
        expect(validationResult.errors, `Validation errors: ${JSON.stringify(validationResult.errors)}`).toEqual([]);
      });
    }
  });

  describe("JSON roundtrip (JSON → generateJSON → parseJSON)", () => {
    for (const file of JSON_FILES) {
      it(`${file} survives JSON roundtrip`, () => {
        const original = parseJSON(readExample(file));
        expect(original.success).toBe(true);
        const regenerated = generateJSON(original.document!);
        const reparsed = parseJSON(regenerated);
        expect(reparsed.success).toBe(true);
        expect(reparsed.document).toEqual(original.document);
      });
    }
  });

  describe("cross-format roundtrip (JSON → text → parse)", () => {
    for (const file of JSON_FILES) {
      it(`${file} → text → parse preserves structure`, () => {
        const original = parseJSON(readExample(file));
        expect(original.success).toBe(true);
        const text = generate(original.document!);
        const reparsed = parse(text);
        expect(reparsed.success).toBe(true);

        // Compare key fields (text parser normalizes some fields)
        const doc = reparsed.document!;
        expect(doc.site.name).toBe(original.document!.site.name);
        expect(doc.site.url).toBe(original.document!.site.url);
        expect(doc.capabilities.length).toBe(original.document!.capabilities.length);
        for (let i = 0; i < doc.capabilities.length; i++) {
          expect(doc.capabilities[i].id).toBe(original.document!.capabilities[i].id);
          expect(doc.capabilities[i].endpoint).toBe(original.document!.capabilities[i].endpoint);
          expect(doc.capabilities[i].protocol).toBe(original.document!.capabilities[i].protocol);
        }
      });
    }
  });
});
