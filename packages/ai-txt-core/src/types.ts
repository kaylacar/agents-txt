/**
 * ai.txt — Core Type System
 *
 * These types define the complete ai.txt document structure.
 * A document declares AI policy — training, licensing, attribution.
 */

// ── Document ──

export interface AiTxtDocument {
  /** Spec version (semver). Currently "1.0". */
  specVersion: string;
  /** ISO 8601 timestamp of when this file was generated. */
  generatedAt?: string;
  /** Site identity and metadata. */
  site: AiTxtSiteInfo;
  /** AI training and scraping policies. */
  policies: PolicyConfig;
  /** Path-based training permissions. */
  trainingPaths: TrainingPaths;
  /** Licensing information. */
  licensing: LicensingInfo;
  /** Content attribution and usage rules. */
  content: ContentPolicy;
  /** Per-agent policies (keyed by agent name, "*" = default). */
  agents: Record<string, AiAgentPolicy>;
  /** Optional free-form metadata. */
  metadata?: Record<string, string>;
}

// ── Site Info ──

export interface AiTxtSiteInfo {
  /** Human-readable site name. */
  name: string;
  /** Canonical site URL (must be HTTPS). */
  url: string;
  /** Contact email for AI policy inquiries. */
  contact?: string;
}

// ── Policies ──

export interface PolicyConfig {
  /** Training policy: allow, deny, or conditional. */
  training: TrainingPolicy;
}

export type TrainingPolicy = "allow" | "deny" | "conditional";

// ── Training Paths ──

export interface TrainingPaths {
  /** Glob patterns of paths allowed for training. */
  allow: string[];
  /** Glob patterns of paths denied for training. */
  deny: string[];
}

// ── Licensing ──

export interface LicensingInfo {
  /** License identifier (e.g., "CC-BY-4.0", "MIT", "All-Rights-Reserved"). */
  license: string;
}

// ── Content ──

export interface ContentPolicy {
  /** Whether attribution is required when using content. */
  attribution: Attribution;
}

export type Attribution = "required" | "optional" | "none";

// ── Rate Limits ──

export interface RateLimit {
  /** Number of allowed requests per window. */
  requests: number;
  /** Time window. */
  window: RateLimitWindow;
}

export type RateLimitWindow = "second" | "minute" | "hour" | "day";

// ── Agent Policies ──

export interface AiAgentPolicy {
  /** Training policy override for this agent. */
  training?: TrainingPolicy;
  /** Rate limit override for this agent. */
  rateLimit?: RateLimit;
}

// ── Parse/Validate Results ──

export interface ParseResult {
  success: boolean;
  document?: AiTxtDocument;
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
