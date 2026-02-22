import type { AgentsTxtDocument } from "./types.js";

/**
 * Generate agents.json from a document object.
 */
export function generateJSON(doc: AgentsTxtDocument): string {
  return JSON.stringify(doc, null, 2);
}
