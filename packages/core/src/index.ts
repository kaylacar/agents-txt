// Parser

export type { ClientOptions } from "./client.js";
// Client
export { AgentsTxtClient } from "./client.js";

// Generator
export { generate } from "./generator.js";
export { generateJSON } from "./generator-json.js";
export { parse } from "./parser.js";
export { parseJSON } from "./parser-json.js";
// Schema
export {
  AgentsTxtDocumentSchema,
  AuthConfigSchema,
  CapabilitySchema,
  ProtocolSchema,
  RateLimitSchema,
  SiteInfoSchema,
} from "./schema.js";

// Types
export type {
  AccessControl,
  AgentPolicy,
  AgentsTxtDocument,
  AuthConfig,
  AuthType,
  Capability,
  ParameterDef,
  ParseError,
  ParseResult,
  ParseWarning,
  Protocol,
  RateLimit,
  RateLimitWindow,
  SiteInfo,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from "./types.js";
// Utilities
export { formatRateLimit, parseRateLimit, sanitizeValue } from "./utils.js";
// Validator
export { validate, validateJSON, validateText } from "./validator.js";
