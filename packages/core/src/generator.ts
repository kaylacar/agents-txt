import type { AgentsTxtDocument } from "./types.js";
import { sanitizeValue, formatRateLimit } from "./utils.js";

/**
 * Generate agents.txt text format from a document object.
 */
export function generate(doc: AgentsTxtDocument): string {
  const lines: string[] = [];

  // Header
  lines.push("# agents.txt — AI Agent Capability Declaration");
  lines.push(`# Spec-Version: ${doc.specVersion}`);
  if (doc.generatedAt) {
    lines.push(`# Generated-At: ${doc.generatedAt}`);
  }
  lines.push("");

  // Site info
  lines.push(`Site-Name: ${sanitizeValue(doc.site.name)}`);
  lines.push(`Site-URL: ${sanitizeValue(doc.site.url)}`);
  if (doc.site.description) {
    lines.push(`Description: ${sanitizeValue(doc.site.description)}`);
  }
  if (doc.site.contact) {
    lines.push(`Contact: ${sanitizeValue(doc.site.contact)}`);
  }
  if (doc.site.privacyPolicy) {
    lines.push(`Privacy-Policy: ${sanitizeValue(doc.site.privacyPolicy)}`);
  }
  lines.push("");

  // Capabilities
  for (const cap of doc.capabilities) {
    lines.push(`Capability: ${sanitizeValue(cap.id)}`);
    lines.push(`  Endpoint: ${sanitizeValue(cap.endpoint)}`);
    if (cap.method) {
      lines.push(`  Method: ${sanitizeValue(cap.method)}`);
    }
    lines.push(`  Protocol: ${sanitizeValue(cap.protocol)}`);
    if (cap.auth) {
      lines.push(`  Auth: ${sanitizeValue(cap.auth.type)}`);
      if (cap.auth.tokenEndpoint) {
        lines.push(`  Auth-Endpoint: ${sanitizeValue(cap.auth.tokenEndpoint)}`);
      }
      if (cap.auth.docsUrl) {
        lines.push(`  Auth-Docs: ${sanitizeValue(cap.auth.docsUrl)}`);
      }
      if (cap.auth.scopes && cap.auth.scopes.length > 0) {
        lines.push(`  Scopes: ${cap.auth.scopes.map((s) => sanitizeValue(s)).join(", ")}`);
      }
    }
    if (cap.rateLimit) {
      lines.push(`  Rate-Limit: ${formatRateLimit(cap.rateLimit.requests, cap.rateLimit.window)}`);
    }
    if (cap.description) {
      lines.push(`  Description: ${sanitizeValue(cap.description)}`);
    }
    if (cap.openapi) {
      lines.push(`  OpenAPI: ${sanitizeValue(cap.openapi)}`);
    }
    if (cap.parameters) {
      for (const param of cap.parameters) {
        const parts = [param.in, param.type];
        if (param.required) parts.push("required");
        let line = `  Param: ${sanitizeValue(param.name)} (${parts.join(", ")})`;
        if (param.description) line += ` — ${sanitizeValue(param.description)}`;
        lines.push(line);
      }
    }
    lines.push("");
  }

  // Access control
  for (const pattern of doc.access.allow) {
    lines.push(`Allow: ${sanitizeValue(pattern)}`);
  }
  for (const pattern of doc.access.disallow) {
    lines.push(`Disallow: ${sanitizeValue(pattern)}`);
  }
  lines.push("");

  // Agent policies
  for (const [agent, policy] of Object.entries(doc.agents)) {
    lines.push(`Agent: ${sanitizeValue(agent)}`);
    if (policy.rateLimit) {
      lines.push(`  Rate-Limit: ${formatRateLimit(policy.rateLimit.requests, policy.rateLimit.window)}`);
    }
    if (policy.capabilities && policy.capabilities.length > 0) {
      lines.push(`  Capabilities: ${policy.capabilities.join(", ")}`);
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
