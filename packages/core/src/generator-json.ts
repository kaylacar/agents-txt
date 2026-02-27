import type { AgentsTxtDocument } from "./types.js";
import { AgentsTxtDocumentSchema } from "./schema.js";

/**
 * Generate agents.json from a document object.
 * Validates the document against the schema before serializing.
 */
export function generateJSON(doc: AgentsTxtDocument): string {
  const result = AgentsTxtDocumentSchema.safeParse(doc);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid document: ${issues}`);
  }
  return JSON.stringify(result.data, null, 2);
}
