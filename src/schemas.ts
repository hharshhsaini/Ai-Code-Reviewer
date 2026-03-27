/**
 * Zod schemas for validation
 */

import { z } from 'zod';

// Severity enum schema
export const SeveritySchema = z.enum(['critical', 'warning', 'suggestion']);

// Verdict enum schema
export const VerdictSchema = z.enum(['approve', 'request_changes', 'comment']);

// Issue schema
export const IssueSchema = z.object({
  severity: SeveritySchema,
  file: z.string().min(1),
  line: z.number().int().positive(),
  comment: z.string().min(1),
  suggestion: z.string().optional(),
});

// LLM response schema
export const ReviewResponseSchema = z.object({
  issues: z.array(IssueSchema),
  summary: z.string(),
  verdict: VerdictSchema,
});

// Configuration schema for action.yml
export const ConfigurationSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputs: z.record(z.object({
    description: z.string(),
    required: z.boolean().optional(),
    default: z.string().optional(),
  })),
  runs: z.object({
    using: z.string(),
    main: z.string(),
  }),
});

// Type inference helpers
export type SeverityType = z.infer<typeof SeveritySchema>;
export type VerdictType = z.infer<typeof VerdictSchema>;
export type IssueType = z.infer<typeof IssueSchema>;
export type ReviewResponseType = z.infer<typeof ReviewResponseSchema>;
export type ConfigurationType = z.infer<typeof ConfigurationSchema>;
