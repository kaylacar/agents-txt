import type {
  AgentPolicy,
  AgentsTxtDocument,
  AuthType,
  Capability,
  ParameterDef,
  ParseError,
  ParseResult,
  ParseWarning,
  Protocol,
  RateLimitWindow,
} from "./types.js";
import { parseRateLimit } from "./utils.js";

type ParserState = "TOP_LEVEL" | "IN_CAPABILITY" | "IN_AGENT";

const VALID_PROTOCOLS = new Set(["REST", "MCP", "A2A", "GraphQL", "WebSocket"]);
const VALID_AUTH_TYPES = new Set(["none", "api-key", "bearer-token", "oauth2", "hmac"]);

/** Maximum input size: 1 MB. */
const MAX_INPUT_SIZE = 1024 * 1024;
/** Maximum number of capabilities allowed in a single document. */
const MAX_CAPABILITIES = 1000;

/**
 * Parse an agents.txt text document into a structured AgentsTxtDocument.
 */
export function parse(input: string): ParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  if (input.length > MAX_INPUT_SIZE) {
    return {
      success: false,
      errors: [{ message: `Input exceeds maximum size of ${MAX_INPUT_SIZE} bytes` }],
      warnings: [],
    };
  }

  const lines = input.split(/\r?\n/);

  // Collected data
  let specVersion = "1.0";
  let generatedAt: string | undefined;
  const site: Record<string, string> = {};
  const capabilities: Capability[] = [];
  const allowPaths: string[] = [];
  const disallowPaths: string[] = [];
  const agents: Record<string, AgentPolicy> = {};
  const metadata: Record<string, string> = {};

  let state: ParserState = "TOP_LEVEL";
  let currentCapability: Partial<Capability> | null = null;
  let currentAgentName: string | null = null;
  let currentAgentPolicy: AgentPolicy | null = null;

  function flushCapability() {
    if (currentCapability?.id) {
      capabilities.push({
        id: currentCapability.id,
        description: currentCapability.description ?? "",
        endpoint: currentCapability.endpoint ?? "",
        method: currentCapability.method,
        protocol: currentCapability.protocol ?? "REST",
        auth: currentCapability.auth,
        rateLimit: currentCapability.rateLimit,
        openapi: currentCapability.openapi,
        parameters: currentCapability.parameters,
        scopes: currentCapability.scopes,
      });
    }
    currentCapability = null;
  }

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

    if (isIndented && state === "IN_CAPABILITY" && currentCapability) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) {
        warnings.push({ line: lineNum, message: `Unparseable indented line: "${trimmed}"` });
        continue;
      }
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      switch (key) {
        case "Endpoint":
          currentCapability.endpoint = value;
          break;
        case "Method":
          currentCapability.method = value.toUpperCase();
          break;
        case "Protocol":
          if (VALID_PROTOCOLS.has(value)) {
            currentCapability.protocol = value as Protocol;
          } else {
            warnings.push({ line: lineNum, field: "Protocol", message: `Unknown protocol: ${value}` });
            currentCapability.protocol = value as Protocol;
          }
          break;
        case "Auth":
          if (!currentCapability.auth) currentCapability.auth = { type: "none" };
          if (VALID_AUTH_TYPES.has(value)) {
            currentCapability.auth.type = value as AuthType;
          } else {
            warnings.push({ line: lineNum, field: "Auth", message: `Unknown auth type: ${value}` });
          }
          break;
        case "Auth-Endpoint":
          if (!currentCapability.auth) currentCapability.auth = { type: "bearer-token" };
          currentCapability.auth.tokenEndpoint = value;
          break;
        case "Auth-Docs":
          if (!currentCapability.auth) currentCapability.auth = { type: "none" };
          currentCapability.auth.docsUrl = value;
          break;
        case "Registration-Endpoint":
          if (!currentCapability.auth) currentCapability.auth = { type: "oauth2" };
          currentCapability.auth.registrationEndpoint = value;
          break;
        case "Scopes":
          if (!currentCapability.auth) currentCapability.auth = { type: "oauth2" };
          currentCapability.auth.scopes = value.split(",").map((s) => s.trim());
          break;
        case "Rate-Limit": {
          const rl = parseRateLimit(value);
          if (rl) {
            currentCapability.rateLimit = { requests: rl.requests, window: rl.window as RateLimitWindow };
          } else {
            warnings.push({ line: lineNum, field: "Rate-Limit", message: `Invalid rate limit: ${value}` });
          }
          break;
        }
        case "Description":
          currentCapability.description = value;
          break;
        case "OpenAPI":
          currentCapability.openapi = value;
          break;
        case "Param": {
          const parsed = parseParam(value);
          if (parsed) {
            if (!currentCapability.parameters) currentCapability.parameters = [];
            currentCapability.parameters.push(parsed);
          } else {
            warnings.push({ line: lineNum, field: "Param", message: `Invalid parameter: ${value}` });
          }
          break;
        }
        default:
          warnings.push({ line: lineNum, message: `Unknown capability field: ${key}` });
      }
      continue;
    }

    if (isIndented && state === "IN_AGENT" && currentAgentPolicy) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      switch (key) {
        case "Rate-Limit": {
          const rl = parseRateLimit(value);
          if (rl) {
            currentAgentPolicy.rateLimit = { requests: rl.requests, window: rl.window as RateLimitWindow };
          }
          break;
        }
        case "Capabilities":
          currentAgentPolicy.capabilities = value.split(",").map((s) => s.trim());
          break;
        default:
          warnings.push({ line: lineNum, message: `Unknown agent field: ${key}` });
      }
      continue;
    }

    // Non-indented line — flush any open block
    if (state === "IN_CAPABILITY") {
      flushCapability();
      state = "TOP_LEVEL";
    }
    if (state === "IN_AGENT") {
      flushAgent();
      state = "TOP_LEVEL";
    }

    // Parse top-level key: value
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      warnings.push({ line: lineNum, message: `Unparseable line: "${trimmed}"` });
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    switch (key) {
      case "Site-Name":
        site.name = value;
        break;
      case "Site-URL":
        site.url = value;
        break;
      case "Description":
      case "Site-Description":
        site.description = value;
        break;
      case "Contact":
      case "Site-Contact":
        site.contact = value;
        break;
      case "Privacy-Policy":
      case "Site-Privacy-Policy":
        site.privacyPolicy = value;
        break;
      case "Allow":
        allowPaths.push(value);
        break;
      case "Disallow":
        disallowPaths.push(value);
        break;
      case "Agents-JSON":
        metadata["Agents-JSON"] = value;
        break;
      case "Capability":
        if (capabilities.length >= MAX_CAPABILITIES) {
          errors.push({ line: lineNum, message: `Exceeds maximum of ${MAX_CAPABILITIES} capabilities` });
          continue;
        }
        currentCapability = { id: value };
        state = "IN_CAPABILITY";
        break;
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
  if (state === "IN_CAPABILITY") flushCapability();
  if (state === "IN_AGENT") flushAgent();

  // Validate required fields
  if (!site.name) errors.push({ field: "Site-Name", message: "Site-Name is required" });
  if (!site.url) errors.push({ field: "Site-URL", message: "Site-URL is required" });

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  const document: AgentsTxtDocument = {
    specVersion,
    generatedAt,
    site: {
      name: site.name!,
      url: site.url!,
      description: site.description,
      contact: site.contact,
      privacyPolicy: site.privacyPolicy,
    },
    capabilities,
    access: {
      allow: allowPaths.length > 0 ? allowPaths : ["*"],
      disallow: disallowPaths,
    },
    agents: Object.keys(agents).length > 0 ? agents : { "*": {} },
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };

  return { success: true, document, errors, warnings };
}

/**
 * Parse a Param value like: `q (query, string, required) — Search query`
 */
function parseParam(value: string): ParameterDef | null {
  // Format: name (location, type[, required]) [— description]
  const match = value.match(/^(\w+)\s*\(\s*(\w+)\s*,\s*(\w+)(?:\s*,\s*(required))?\s*\)(?:\s*—\s*(.+))?$/);
  if (!match) return null;

  const [, name, location, type, req, description] = match;
  const validLocations = new Set(["query", "path", "header", "body"]);
  if (!validLocations.has(location)) return null;

  return {
    name,
    in: location as ParameterDef["in"],
    type,
    required: req === "required",
    description: description?.trim(),
  };
}
