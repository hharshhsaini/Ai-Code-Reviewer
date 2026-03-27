"use strict";
/**
 * Zod schemas for validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationSchema = exports.ReviewResponseSchema = exports.IssueSchema = exports.VerdictSchema = exports.SeveritySchema = void 0;
const zod_1 = require("zod");
// Severity enum schema
exports.SeveritySchema = zod_1.z.enum(['critical', 'warning', 'suggestion']);
// Verdict enum schema
exports.VerdictSchema = zod_1.z.enum(['approve', 'request_changes', 'comment']);
// Issue schema
exports.IssueSchema = zod_1.z.object({
    severity: exports.SeveritySchema,
    file: zod_1.z.string().min(1),
    line: zod_1.z.number().int().positive(),
    comment: zod_1.z.string().min(1),
    suggestion: zod_1.z.string().optional(),
});
// LLM response schema
exports.ReviewResponseSchema = zod_1.z.object({
    issues: zod_1.z.array(exports.IssueSchema),
    summary: zod_1.z.string(),
    verdict: exports.VerdictSchema,
});
// Configuration schema for action.yml
exports.ConfigurationSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    inputs: zod_1.z.record(zod_1.z.object({
        description: zod_1.z.string(),
        required: zod_1.z.boolean().optional(),
        default: zod_1.z.string().optional(),
    })),
    runs: zod_1.z.object({
        using: zod_1.z.string(),
        main: zod_1.z.string(),
    }),
});
//# sourceMappingURL=schemas.js.map