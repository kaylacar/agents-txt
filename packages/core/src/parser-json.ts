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
      errors: [{ message: `Invalid JSON: ${err instanceof Error ? err.message : "parse error"}`, code: "INVALID_JSON" }],
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
        code: "SCHEMA_VIOLATION",
      })),
      warnings: [],
    };
  }

  return {
    success: true,
    document: result.data,
    errors: [],
    warnings: [],
  };
}
