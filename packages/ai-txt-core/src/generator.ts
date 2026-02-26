import type { AiTxtDocument } from "./types.js";
import { sanitizeValue, formatRateLimit } from "./utils.js";

/**
 * Generate ai.txt text format from a document object.
 */
export function generate(doc: AiTxtDocument): string {
  const lines: string[] = [];

  // Header
  lines.push("# ai.txt — AI Policy Declaration");
  lines.push(`# Spec-Version: ${doc.specVersion}`);
  if (doc.generatedAt) {
    lines.push(`# Generated: ${doc.generatedAt}`);
  }
  lines.push("");

  // Site info
  lines.push(`Site-Name: ${sanitizeValue(doc.site.name)}`);
  lines.push(`Site-URL: ${sanitizeValue(doc.site.url)}`);
  if (doc.site.contact) {
    lines.push(`Contact: ${sanitizeValue(doc.site.contact)}`);
  }
  lines.push("");

  // Training policy
  lines.push(`Training: ${doc.policies.training}`);
  for (const pattern of doc.trainingPaths.allow) {
    lines.push(`Training-Allow: ${pattern}`);
  }
  for (const pattern of doc.trainingPaths.deny) {
    lines.push(`Training-Deny: ${pattern}`);
  }
  lines.push("");

  // Licensing
  lines.push(`License: ${sanitizeValue(doc.licensing.license)}`);
  lines.push(`Attribution: ${doc.content.attribution}`);
  lines.push("");

  // Agent policies
  for (const [agent, policy] of Object.entries(doc.agents)) {
    lines.push(`Agent: ${agent}`);
    if (policy.training) {
      lines.push(`  Training: ${policy.training}`);
    }
    if (policy.rateLimit) {
      lines.push(`  Rate-Limit: ${formatRateLimit(policy.rateLimit.requests, policy.rateLimit.window)}`);
    }
  }
  lines.push("");

  // Metadata
  if (doc.metadata) {
    for (const [key, value] of Object.entries(doc.metadata)) {
      lines.push(`${key}: ${sanitizeValue(value)}`);
    }
  }

  return lines.join("\n") + "\n";
}
