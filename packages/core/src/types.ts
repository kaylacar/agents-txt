/**
 * agents.txt — Core Type System
 *
 * These types define the complete agents.txt document structure.
 * A document declares what AI agents can DO on a website.
 */

// ── Document ──

export interface AgentsTxtDocument {
  /** Spec version (semver). Currently "1.0". */
  specVersion: string;
  /** ISO 8601 timestamp of when this file was generated. */
  generatedAt?: string;
  /** Site identity and metadata. */
  site: SiteInfo;
  /** Capabilities the site offers to AI agents. */
  capabilities: Capability[];
  /** Path-based access control. */
  access: AccessControl;
  /** Per-agent policies (keyed by agent name, "*" = default). */
  agents: Record<string, AgentPolicy>;
  /** Optional free-form metadata. */
  metadata?: Record<string, string>;
}

// ── Site Info ──

export interface SiteInfo {
  /** Human-readable site name. */
  name: string;
  /** Canonical site URL (must be HTTPS). */
  url: string;
  /** Brief description of the site. */
  description?: string;
  /** Contact email for AI agent partnerships/issues. */
  contact?: string;
  /** URL to the site's privacy policy. */
  privacyPolicy?: string;
}

// ── Capabilities ──

export interface Capability {
  /** Unique identifier (lowercase, hyphens, e.g. "product-search"). */
  id: string;
  /** Human-readable description of what this capability does. */
  description: string;
  /** Full URL of the endpoint. */
  endpoint: string;
  /** HTTP method (for REST). */
  method?: string;
  /** Communication protocol. */
  protocol: Protocol;
  /** Authentication configuration (describes mechanism, never secrets). */
  auth?: AuthConfig;
  /** Rate limit for this specific capability. */
  rateLimit?: RateLimit;
  /** URL to an OpenAPI spec for this capability. */
  openapi?: string;
  /** Parameter definitions for REST endpoints. */
  parameters?: ParameterDef[];
  /** Required OAuth2 scopes. */
  scopes?: string[];
}

export type Protocol = "REST" | "MCP" | "A2A" | "GraphQL" | "WebSocket";

export interface AuthConfig {
  /** Authentication type. Never include actual secrets. */
  type: AuthType;
  /** URL to obtain tokens (for bearer-token or oauth2). */
  tokenEndpoint?: string;
  /** URL to documentation describing the authentication flow. */
  docsUrl?: string;
  /** URL for RFC 7591 Dynamic Client Registration. */
  registrationEndpoint?: string;
  /** OAuth2 scopes available. */
  scopes?: string[];
}

export type AuthType = "none" | "api-key" | "bearer-token" | "oauth2" | "hmac";

export interface RateLimit {
  /** Number of allowed requests per window. */
  requests: number;
  /** Time window. */
  window: RateLimitWindow;
}

export type RateLimitWindow = "second" | "minute" | "hour" | "day";

// ── Access Control ──

export interface AccessControl {
  /** Glob patterns of allowed paths. */
  allow: string[];
  /** Glob patterns of disallowed paths. */
  disallow: string[];
}

// ── Agent Policies ──

export interface AgentPolicy {
  /** Override rate limit for this agent. */
  rateLimit?: RateLimit;
  /** List of capability IDs this agent is allowed to use. If omitted, all capabilities are allowed. */
  capabilities?: string[];
}

// ── Parameters ──

export interface ParameterDef {
  /** Parameter name. */
  name: string;
  /** Where the parameter is sent. */
  in: "query" | "path" | "header" | "body";
  /** Data type. */
  type: string;
  /** Whether the parameter is required. */
  required?: boolean;
  /** Default value. */
  default?: unknown;
  /** Human-readable description. */
  description?: string;
  /** Maximum value (for numbers) or length (for strings). */
  max?: number;
  /** Minimum value (for numbers) or length (for strings). */
  min?: number;
}

// ── Parse/Validate Results ──

export interface ParseResult {
  success: boolean;
  document?: AgentsTxtDocument;
  errors: ParseError[];
  warnings: ParseWarning[];
}

export interface ParseError {
  line?: number;
  field?: string;
  message: string;
}

export interface ParseWarning {
  line?: number;
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}
