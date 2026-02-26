import { describe, it, expect } from "vitest";
import { validate, validateText } from "../src/validator.js";
import type { AiTxtDocument } from "../src/types.js";

function makeValidDoc(): AiTxtDocument {
  return {
    specVersion: "1.0",
    site: {
      name: "Valid Store",
      url: "https://valid.example.com",
    },
    policies: {
      training: "deny",
    },
    trainingPaths: { allow: [], deny: [] },
    licensing: {
      license: "All-Rights-Reserved",
    },
    content: {
      attribution: "none",
    },
    agents: { "*": {} },
  };
}

describe("validate", () => {
  it("accepts a valid document", () => {
    const result = validate(makeValidDoc());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("warns on HTTP site URL", () => {
    const doc = makeValidDoc();
    doc.site.url = "http://insecure.example.com";
    const result = validate(doc);
    expect(result.warnings.some((w) => w.code === "INSECURE_URL")).toBe(true);
  });

  it("warns on training paths with non-conditional policy", () => {
    const doc = makeValidDoc();
    doc.policies.training = "deny";
    doc.trainingPaths.allow = ["/public/*"];
    const result = validate(doc);
    expect(result.warnings.some((w) => w.code === "UNNECESSARY_TRAINING_PATHS")).toBe(true);
  });

  it("does not warn on training paths with conditional policy", () => {
    const doc = makeValidDoc();
    doc.policies.training = "conditional";
    doc.trainingPaths.allow = ["/public/*"];
    const result = validate(doc);
    expect(result.warnings.some((w) => w.code === "UNNECESSARY_TRAINING_PATHS")).toBe(false);
  });

  it("rejects invalid schema", () => {
    const doc = makeValidDoc();
    (doc as Record<string, unknown>).specVersion = "invalid";
    const result = validate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "SCHEMA_VIOLATION")).toBe(true);
  });
});

describe("validateText", () => {
  it("validates a correct text document", () => {
    const text = `Site-Name: Test\nSite-URL: https://test.com\n`;
    const result = validateText(text);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid text document", () => {
    const result = validateText("");
    expect(result.valid).toBe(false);
  });
});
