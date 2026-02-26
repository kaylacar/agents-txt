import type { AiTxtDocument, ValidationResult, ValidationError, ValidationWarning } from "./types.js";
import { AiTxtDocumentSchema } from "./schema.js";
import { parse } from "./parser.js";
import { parseJSON } from "./parser-json.js";

/**
 * Validate an AiTxtDocument object against the spec.
 */
export function validate(doc: AiTxtDocument): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Schema validation
  const schemaResult = AiTxtDocumentSchema.safeParse(doc);
  if (!schemaResult.success) {
    for (const issue of schemaResult.error.issues) {
      errors.push({
        path: issue.path.join("."),
        message: issue.message,
        code: "SCHEMA_VIOLATION",
      });
    }
  }

  // Training paths should match policy
  if (doc.policies.training !== "conditional") {
    if (doc.trainingPaths.allow.length > 0 || doc.trainingPaths.deny.length > 0) {
      warnings.push({
        path: "trainingPaths",
        message: `Training paths are only meaningful when training policy is "conditional"`,
        code: "UNNECESSARY_TRAINING_PATHS",
      });
    }
  }

  // Site URL should be HTTPS
  if (doc.site.url && !doc.site.url.startsWith("https://")) {
    warnings.push({
      path: "site.url",
      message: "Site URL should use HTTPS",
      code: "INSECURE_URL",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Parse and validate an ai.txt text string.
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
 * Parse and validate an ai.json string.
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
