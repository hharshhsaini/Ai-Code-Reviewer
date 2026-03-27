"use strict";
/**
 * Logger
 * Structured logging for GitHub Actions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const core = __importStar(require("@actions/core"));
class Logger {
    /**
     * Log info message
     */
    static info(message) {
        core.info(`[AI Code Reviewer] ${message}`);
    }
    /**
     * Log warning message
     */
    static warning(message) {
        core.warning(`[AI Code Reviewer] ${message}`);
    }
    /**
     * Log error with context
     */
    static error(category, message, context, action) {
        let errorMsg = `[AI Code Reviewer] ERROR: ${category}\n`;
        errorMsg += `Message: ${message}\n`;
        if (context) {
            errorMsg += `Context: ${JSON.stringify(context, null, 2)}\n`;
        }
        if (action) {
            errorMsg += `Action: ${action}`;
        }
        core.error(errorMsg);
    }
    /**
     * Log review summary
     */
    static logSummary(summary) {
        core.info('='.repeat(60));
        core.info('[AI Code Reviewer] Review Summary');
        core.info('='.repeat(60));
        core.info(`Files Reviewed: ${summary.filesReviewed}`);
        core.info(`Issues Found:`);
        core.info(`  - Critical: ${summary.issuesFound.critical}`);
        core.info(`  - Warning: ${summary.issuesFound.warning}`);
        core.info(`  - Suggestion: ${summary.issuesFound.suggestion}`);
        core.info(`Verdict: ${summary.verdict}`);
        core.info(`Tokens Used: ${summary.tokensUsed}`);
        core.info(`Estimated Cost: $${summary.estimatedCost.toFixed(4)}`);
        core.info('='.repeat(60));
    }
    /**
     * Calculate estimated cost based on token usage
     * Pricing as of 2024 (per million tokens):
     * - claude-3-5-sonnet: $3 input, $15 output
     * - claude-3-opus: $15 input, $75 output
     * - gpt-4: $30 input, $60 output
     * - gpt-4-turbo: $10 input, $30 output
     * - gpt-3.5-turbo: $0.50 input, $1.50 output
     */
    static estimateCost(tokensUsed, model) {
        // Assume 80% input tokens, 20% output tokens (typical for code review)
        const inputTokens = tokensUsed * 0.8;
        const outputTokens = tokensUsed * 0.2;
        // Pricing per million tokens
        let inputCostPerMillion = 3;
        let outputCostPerMillion = 15;
        if (model.includes('claude-3-5-sonnet') || model.includes('claude-3.5-sonnet')) {
            inputCostPerMillion = 3;
            outputCostPerMillion = 15;
        }
        else if (model.includes('claude-3-opus')) {
            inputCostPerMillion = 15;
            outputCostPerMillion = 75;
        }
        else if (model.includes('gpt-4-turbo')) {
            inputCostPerMillion = 10;
            outputCostPerMillion = 30;
        }
        else if (model.includes('gpt-4')) {
            inputCostPerMillion = 30;
            outputCostPerMillion = 60;
        }
        else if (model.includes('gpt-3.5-turbo')) {
            inputCostPerMillion = 0.5;
            outputCostPerMillion = 1.5;
        }
        const inputCost = (inputTokens / 1_000_000) * inputCostPerMillion;
        const outputCost = (outputTokens / 1_000_000) * outputCostPerMillion;
        return inputCost + outputCost;
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map