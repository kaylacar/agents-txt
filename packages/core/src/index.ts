// Parser
export { parse } from "./parser.js";
export { parseJSON } from "./parser-json.js";

// Generator
export { generate } from "./generator.js";
export { generateJSON } from "./generator-json.js";

// Validator
export { validate, validateText, validateJSON } from "./validator.js";

// Client
export { AgentsTxtClient } from "./client.js";
export type { ClientOptions } from "./client.js";

// Types
export type {
  AgentsTxtDocument,
  SiteInfo,
  Capability,
  Protocol,
  AuthConfig,
  AuthType,
  RateLimit,
  RateLimitWindow,
  AccessControl,
  AgentPolicy,
  ParameterDef,
  ParseResult,
  ParseError,
  ParseWarning,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "./types.js";

// Schema
export {
  AgentsTxtDocumentSchema,
  CapabilitySchema,
  SiteInfoSchema,
  RateLimitSchema,
  AuthConfigSchema,
  ProtocolSchema,
} from "./schema.js";

// Utilities
export { sanitizeValue, parseRateLimit, formatRateLimit } from "./utils.js";
