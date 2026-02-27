import { z } from "zod";

export const RateLimitWindowSchema = z.enum(["second", "minute", "hour", "day"]);

export const RateLimitSchema = z.object({
  requests: z.number().int().positive(),
  window: RateLimitWindowSchema,
});

export const AuthTypeSchema = z.enum(["none", "api-key", "bearer-token", "oauth2", "hmac"]);

export const AuthConfigSchema = z.object({
  type: AuthTypeSchema,
  tokenEndpoint: z.string().url().optional(),
  docsUrl: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
});

export const ProtocolSchema = z.enum(["REST", "MCP", "A2A", "GraphQL", "WebSocket"]);

export const ParameterDefSchema = z.object({
  name: z.string().min(1),
  in: z.enum(["query", "path", "header", "body"]),
  type: z.string().min(1),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  description: z.string().optional(),
  max: z.number().optional(),
  min: z.number().optional(),
});

export const CapabilitySchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Must be lowercase alphanumeric with hyphens"),
  description: z.string().min(1).max(500),
  endpoint: z.string().url(),
  method: z.string().optional(),
  protocol: ProtocolSchema,
  auth: AuthConfigSchema.optional(),
  rateLimit: RateLimitSchema.optional(),
  openapi: z.string().url().optional(),
  parameters: z.array(ParameterDefSchema).optional(),
  scopes: z.array(z.string()).optional(),
});

export const SiteInfoSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  description: z.string().max(500).optional(),
  contact: z.string().email().optional(),
  privacyPolicy: z.string().url().optional(),
});

export const AccessControlSchema = z.object({
  allow: z.array(z.string()),
  disallow: z.array(z.string()),
});

export const AgentPolicySchema = z.object({
  rateLimit: RateLimitSchema.optional(),
  capabilities: z.array(z.string()).optional(),
});

export const AgentsTxtDocumentSchema = z.object({
  specVersion: z.string().regex(/^\d+\.\d+$/, "Must be major.minor format"),
  generatedAt: z.string().datetime().optional(),
  site: SiteInfoSchema,
  capabilities: z.array(CapabilitySchema),
  access: AccessControlSchema,
  agents: z.record(z.string(), AgentPolicySchema),
  metadata: z.record(z.string(), z.string()).optional(),
});
