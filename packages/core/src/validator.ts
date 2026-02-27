import type { AgentsTxtDocument, ValidationResult, ValidationError, ValidationWarning } from "./types.js";
import { AgentsTxtDocumentSchema } from "./schema.js";
import { parse } from "./parser.js";
import { parseJSON } from "./parser-json.js";

/**
 * Validate an AgentsTxtDocument object against the spec.
 */
export function validate(doc: AgentsTxtDocument): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Schema validation
  const schemaResult = AgentsTxtDocumentSchema.safeParse(doc);
  if (!schemaResult.success) {
    for (const issue of schemaResult.error.issues) {
      errors.push({
        path: issue.path.join("."),
        message: issue.message,
        code: "SCHEMA_VIOLATION",
      });
    }
  }

  // Capability IDs must be unique
  const capIds = new Set<string>();
  for (const cap of doc.capabilities) {
    if (capIds.has(cap.id)) {
      errors.push({
        path: `capabilities.${cap.id}`,
        message: `Duplicate capability ID: "${cap.id}"`,
        code: "DUPLICATE_CAPABILITY",
      });
    }
    capIds.add(cap.id);
  }

  // Agent capability references must exist
  for (const [agentName, policy] of Object.entries(doc.agents)) {
    if (policy.capabilities) {
      for (const capId of policy.capabilities) {
        if (!capIds.has(capId)) {
          errors.push({
            path: `agents.${agentName}.capabilities`,
            message: `Agent "${agentName}" references unknown capability: "${capId}"`,
            code: "UNKNOWN_CAPABILITY_REF",
          });
        }
      }
    }
  }

  // Site URL must be a valid URL
  if (doc.site.url) {
    try {
      new URL(doc.site.url);
    } catch {
      errors.push({
        path: "site.url",
        message: `Invalid site URL: "${doc.site.url}"`,
        code: "INVALID_URL",
      });
    }
    if (!doc.site.url.startsWith("https://")) {
      warnings.push({
        path: "site.url",
        message: "Site URL should use HTTPS",
        code: "INSECURE_URL",
      });
    }
  }

  // Endpoint URLs must be valid and should be HTTPS
  for (const cap of doc.capabilities) {
    if (cap.endpoint) {
      try {
        new URL(cap.endpoint);
      } catch {
        errors.push({
          path: `capabilities.${cap.id}.endpoint`,
          message: `Capability "${cap.id}" has invalid endpoint URL: "${cap.endpoint}"`,
          code: "INVALID_URL",
        });
      }
      if (!cap.endpoint.startsWith("https://")) {
        warnings.push({
          path: `capabilities.${cap.id}.endpoint`,
          message: `Capability "${cap.id}" endpoint should use HTTPS`,
          code: "INSECURE_ENDPOINT",
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Parse and validate an agents.txt text string.
 */
export function validateText(text: string): ValidationResult {
  const parseResult = parse(text);
  if (!parseResult.success || !parseResult.document) {
    return {
      valid: false,
      errors: parseResult.errors.map((e) => ({
        path: e.field ?? "",
        message: e.message,
        code: "PARSE_ERROR",
      })),
      warnings: [],
    };
  }
  return validate(parseResult.document);
}

/**
 * Parse and validate an agents.json string.
 */
export function validateJSON(json: string): ValidationResult {
  const parseResult = parseJSON(json);
  if (!parseResult.success || !parseResult.document) {
    return {
      valid: false,
      errors: parseResult.errors.map((e) => ({
        path: e.field ?? "",
        message: e.message,
        code: "PARSE_ERROR",
      })),
      warnings: [],
    };
  }
  return validate(parseResult.document);
}
