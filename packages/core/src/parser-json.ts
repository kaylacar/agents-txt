import type { ParseResult } from "./types.js";
import { AgentsTxtDocumentSchema } from "./schema.js";

/**
 * Parse an agents.json string into a validated AgentsTxtDocument.
 */
export function parseJSON(input: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch (err) {
    return {
      success: false,
      errors: [{ message: `Invalid JSON: ${err instanceof Error ? err.message : "parse error"}` }],
      warnings: [],
    };
  }

  const result = AgentsTxtDocumentSchema.safeParse(raw);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
      warnings: [],
    };
  }

  // Agent names are matched case-insensitively per the spec; normalize keys to lowercase.
  const doc = result.data;
  const normalized: typeof doc.agents = {};
  for (const [name, policy] of Object.entries(doc.agents)) {
    normalized[name === "*" ? "*" : name.toLowerCase()] = policy;
  }
  doc.agents = normalized;

  return {
    success: true,
    document: doc,
    errors: [],
    warnings: [],
  };
}
