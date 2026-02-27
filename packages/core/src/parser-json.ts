import { AgentsTxtDocumentSchema } from "./schema.js";
import type { ParseResult } from "./types.js";

/** Maximum input size: 1 MB. */
const MAX_INPUT_SIZE = 1024 * 1024;

/**
 * Parse an agents.json string into a validated AgentsTxtDocument.
 */
export function parseJSON(input: string): ParseResult {
  if (input.length > MAX_INPUT_SIZE) {
    return {
      success: false,
      errors: [{ message: `Input exceeds maximum size of ${MAX_INPUT_SIZE} bytes` }],
      warnings: [],
    };
  }

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

  return {
    success: true,
    document: result.data,
    errors: [],
    warnings: [],
  };
}
