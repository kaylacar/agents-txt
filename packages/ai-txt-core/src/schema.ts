import { z } from "zod";

export const RateLimitWindowSchema = z.enum(["second", "minute", "hour", "day"]);

export const RateLimitSchema = z.object({
  requests: z.number().int().positive(),
  window: RateLimitWindowSchema,
});

export const TrainingPolicySchema = z.enum(["allow", "deny", "conditional"]);

export const AttributionSchema = z.enum(["required", "optional", "none"]);

export const AiTxtSiteInfoSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  contact: z.string().email().optional(),
});

export const PolicyConfigSchema = z.object({
  training: TrainingPolicySchema,
});

export const TrainingPathsSchema = z.object({
  allow: z.array(z.string()),
  deny: z.array(z.string()),
});

export const LicensingInfoSchema = z.object({
  license: z.string().min(1).max(200),
});

export const ContentPolicySchema = z.object({
  attribution: AttributionSchema,
});

export const AiAgentPolicySchema = z.object({
  training: TrainingPolicySchema.optional(),
  rateLimit: RateLimitSchema.optional(),
});

export const AiTxtDocumentSchema = z.object({
  specVersion: z.string().regex(/^\d+\.\d+$/, "Must be major.minor format"),
  generatedAt: z.string().datetime().optional(),
  site: AiTxtSiteInfoSchema,
  policies: PolicyConfigSchema,
  trainingPaths: TrainingPathsSchema,
  licensing: LicensingInfoSchema,
  content: ContentPolicySchema,
  agents: z.record(z.string(), AiAgentPolicySchema),
  metadata: z.record(z.string(), z.string()).optional(),
});
