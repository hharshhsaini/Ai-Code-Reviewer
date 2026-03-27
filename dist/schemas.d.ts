/**
 * Zod schemas for validation
 */
import { z } from 'zod';
export declare const SeveritySchema: z.ZodEnum<["critical", "warning", "suggestion"]>;
export declare const VerdictSchema: z.ZodEnum<["approve", "request_changes", "comment"]>;
export declare const IssueSchema: z.ZodObject<{
    severity: z.ZodEnum<["critical", "warning", "suggestion"]>;
    file: z.ZodString;
    line: z.ZodNumber;
    comment: z.ZodString;
    suggestion: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    comment: string;
    severity: "critical" | "warning" | "suggestion";
    file: string;
    line: number;
    suggestion?: string | undefined;
}, {
    comment: string;
    severity: "critical" | "warning" | "suggestion";
    file: string;
    line: number;
    suggestion?: string | undefined;
}>;
export declare const ReviewResponseSchema: z.ZodObject<{
    issues: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["critical", "warning", "suggestion"]>;
        file: z.ZodString;
        line: z.ZodNumber;
        comment: z.ZodString;
        suggestion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        comment: string;
        severity: "critical" | "warning" | "suggestion";
        file: string;
        line: number;
        suggestion?: string | undefined;
    }, {
        comment: string;
        severity: "critical" | "warning" | "suggestion";
        file: string;
        line: number;
        suggestion?: string | undefined;
    }>, "many">;
    summary: z.ZodString;
    verdict: z.ZodEnum<["approve", "request_changes", "comment"]>;
}, "strip", z.ZodTypeAny, {
    issues: {
        comment: string;
        severity: "critical" | "warning" | "suggestion";
        file: string;
        line: number;
        suggestion?: string | undefined;
    }[];
    summary: string;
    verdict: "approve" | "request_changes" | "comment";
}, {
    issues: {
        comment: string;
        severity: "critical" | "warning" | "suggestion";
        file: string;
        line: number;
        suggestion?: string | undefined;
    }[];
    summary: string;
    verdict: "approve" | "request_changes" | "comment";
}>;
export declare const ConfigurationSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    inputs: z.ZodRecord<z.ZodString, z.ZodObject<{
        description: z.ZodString;
        required: z.ZodOptional<z.ZodBoolean>;
        default: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        required?: boolean | undefined;
        default?: string | undefined;
    }, {
        description: string;
        required?: boolean | undefined;
        default?: string | undefined;
    }>>;
    runs: z.ZodObject<{
        using: z.ZodString;
        main: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        using: string;
        main: string;
    }, {
        using: string;
        main: string;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    inputs: Record<string, {
        description: string;
        required?: boolean | undefined;
        default?: string | undefined;
    }>;
    runs: {
        using: string;
        main: string;
    };
}, {
    name: string;
    description: string;
    inputs: Record<string, {
        description: string;
        required?: boolean | undefined;
        default?: string | undefined;
    }>;
    runs: {
        using: string;
        main: string;
    };
}>;
export type SeverityType = z.infer<typeof SeveritySchema>;
export type VerdictType = z.infer<typeof VerdictSchema>;
export type IssueType = z.infer<typeof IssueSchema>;
export type ReviewResponseType = z.infer<typeof ReviewResponseSchema>;
export type ConfigurationType = z.infer<typeof ConfigurationSchema>;
//# sourceMappingURL=schemas.d.ts.map