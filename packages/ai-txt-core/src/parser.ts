import type {
  AiTxtDocument,
  AiAgentPolicy,
  ParseResult,
  ParseError,
  ParseWarning,
  TrainingPolicy,
  RateLimitWindow,
} from "./types.js";
import { parseRateLimit } from "./utils.js";

type ParserState = "TOP_LEVEL" | "IN_AGENT";

const VALID_TRAINING_POLICIES = new Set(["allow", "deny", "conditional"]);
const VALID_ATTRIBUTIONS = new Set(["required", "optional", "none"]);

/**
 * Parse an ai.txt text document into a structured AiTxtDocument.
 */
export function parse(input: string): ParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];
  const lines = input.split(/\r?\n/);

  // Collected data
  let specVersion = "1.0";
  let generatedAt: string | undefined;
  const site: Record<string, string> = {};
  let training: string | undefined;
  const trainingAllow: string[] = [];
  const trainingDeny: string[] = [];
  let license: string | undefined;
  let attribution: string | undefined;
  const agents: Record<string, AiAgentPolicy> = {};
  const metadata: Record<string, string> = {};

  let state: ParserState = "TOP_LEVEL";
  let currentAgentName: string | null = null;
  let currentAgentPolicy: AiAgentPolicy | null = null;

  function flushAgent() {
    if (currentAgentName !== null && currentAgentPolicy !== null) {
      agents[currentAgentName] = currentAgentPolicy;
    }
    currentAgentName = null;
    currentAgentPolicy = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip empty lines and comments
    if (trimmed === "" || trimmed.startsWith("#")) {
      // Extract spec version and generated date from comments
      const specMatch = trimmed.match(/^#\s*Spec-Version:\s*(.+)/i);
      if (specMatch) specVersion = specMatch[1].trim();
      const genMatch = trimmed.match(/^#\s*Generated:\s*(.+)/i);
      if (genMatch) generatedAt = genMatch[1].trim();
      continue;
    }

    // Check if this is an indented line (belongs to a block)
    const isIndented = raw.startsWith("  ") || raw.startsWith("\t");

    if (isIndented && state === "IN_AGENT" && currentAgentPolicy) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      switch (key) {
        case "Training":
          if (VALID_TRAINING_POLICIES.has(value)) {
            currentAgentPolicy.training = value as TrainingPolicy;
          } else {
            warnings.push({ line: lineNum, field: "Training", message: `Unknown training policy: ${value}` });
          }
          break;
        case "Rate-Limit": {
          const rl = parseRateLimit(value);
          if (rl) {
            currentAgentPolicy.rateLimit = { requests: rl.requests, window: rl.window as RateLimitWindow };
          } else {
            warnings.push({ line: lineNum, field: "Rate-Limit", message: `Invalid rate limit: ${value}` });
          }
          break;
        }
        default:
          warnings.push({ line: lineNum, message: `Unknown agent field: ${key}` });
      }
      continue;
    }

    // Non-indented line — flush any open block
    if (state === "IN_AGENT") { flushAgent(); state = "TOP_LEVEL"; }

    // Parse top-level key: value
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      warnings.push({ line: lineNum, message: `Unparseable line: "${trimmed}"` });
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    switch (key) {
      case "Site-Name": site.name = value; break;
      case "Site-URL": site.url = value; break;
      case "Contact":
      case "Site-Contact": site.contact = value; break;
      case "Training":
        if (VALID_TRAINING_POLICIES.has(value)) {
          training = value;
        } else {
          warnings.push({ line: lineNum, field: "Training", message: `Unknown training policy: ${value}` });
        }
        break;
      case "Training-Allow": trainingAllow.push(value); break;
      case "Training-Deny": trainingDeny.push(value); break;
      case "License": license = value; break;
      case "Attribution":
        if (VALID_ATTRIBUTIONS.has(value)) {
          attribution = value;
        } else {
          warnings.push({ line: lineNum, field: "Attribution", message: `Unknown attribution: ${value}` });
        }
        break;
      case "AI-JSON": metadata["AI-JSON"] = value; break;
      case "Agent":
        currentAgentName = value;
        currentAgentPolicy = {};
        state = "IN_AGENT";
        break;
      default:
        // Store as metadata
        metadata[key] = value;
    }
  }

  // Flush any remaining open block
  if (state === "IN_AGENT") flushAgent();

  // Validate required fields
  if (!site.name) errors.push({ field: "Site-Name", message: "Site-Name is required" });
  if (!site.url) errors.push({ field: "Site-URL", message: "Site-URL is required" });

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  const document: AiTxtDocument = {
    specVersion,
    generatedAt,
    site: {
      name: site.name!,
      url: site.url!,
      contact: site.contact,
    },
    policies: {
      training: (training as TrainingPolicy) ?? "deny",
    },
    trainingPaths: {
      allow: trainingAllow,
      deny: trainingDeny,
    },
    licensing: {
      license: license ?? "All-Rights-Reserved",
    },
    content: {
      attribution: (attribution as "required" | "optional" | "none") ?? "none",
    },
    agents: Object.keys(agents).length > 0 ? agents : { "*": {} },
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };

  return { success: true, document, errors, warnings };
}
