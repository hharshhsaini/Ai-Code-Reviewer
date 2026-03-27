"use strict";
/**
 * Main entry point for AI Code Reviewer GitHub Action
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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const config_loader_1 = require("./config-loader");
const github_client_1 = require("./github-client");
const diff_fetcher_1 = require("./diff-fetcher");
const file_filter_1 = require("./file-filter");
const diff_chunker_1 = require("./diff-chunker");
const llm_client_1 = require("./llm-client");
const response_validator_1 = require("./response-validator");
const deduplicator_1 = require("./deduplicator");
const line_mapper_1 = require("./line-mapper");
const comment_poster_1 = require("./comment-poster");
const label_manager_1 = require("./label-manager");
const logger_1 = require("./logger");
async function run() {
    try {
        logger_1.Logger.info('AI Code Reviewer started');
        // 1. Load configuration
        logger_1.Logger.info('Loading configuration...');
        const config = config_loader_1.ConfigurationLoader.load();
        logger_1.Logger.info(`Using provider: ${config.provider}, model: ${config.model}`);
        // 2. Initialize GitHub API Client
        logger_1.Logger.info('Initializing GitHub client...');
        const githubClient = new github_client_1.GitHubClient(config.githubToken);
        // 3. Get PR context from GitHub Actions environment
        const context = github.context;
        if (!context.payload.pull_request) {
            throw new Error('This action can only be run on pull_request events');
        }
        const owner = context.repo.owner;
        const repo = context.repo.repo;
        const pullNumber = context.payload.pull_request.number;
        logger_1.Logger.info(`Reviewing PR #${pullNumber} in ${owner}/${repo}`);
        // 4. Fetch PR diff
        logger_1.Logger.info('Fetching PR diff...');
        const diffFetcher = new diff_fetcher_1.DiffFetcher(githubClient);
        const allFiles = await diffFetcher.fetchPRDiff(owner, repo, pullNumber);
        logger_1.Logger.info(`Fetched ${allFiles.length} changed files`);
        // 5. Filter files
        logger_1.Logger.info('Filtering files...');
        const filteredFiles = file_filter_1.FileFilter.filter(allFiles, config.maxFiles);
        logger_1.Logger.info(`${filteredFiles.length} files after filtering`);
        if (filteredFiles.length === 0) {
            logger_1.Logger.info('No files to review after filtering');
            return;
        }
        // 6. Chunk diff
        logger_1.Logger.info('Chunking diff...');
        // Determine max tokens based on model
        const maxTokens = getMaxTokensForModel(config.model);
        const chunks = diff_chunker_1.DiffChunker.chunk(filteredFiles, maxTokens);
        logger_1.Logger.info(`Created ${chunks.length} chunks`);
        // 7. Initialize LLM client
        logger_1.Logger.info('Initializing LLM client...');
        const apiKey = config.provider === 'anthropic' ? config.anthropicApiKey : config.openaiApiKey;
        const llmClient = (0, llm_client_1.createLLMClient)(config.provider, apiKey, config.model);
        // 8. Review each chunk and collect issues
        logger_1.Logger.info('Reviewing chunks...');
        const allIssues = [];
        let totalTokensUsed = 0;
        for (const chunk of chunks) {
            logger_1.Logger.info(`Reviewing chunk ${chunk.metadata.chunkIndex + 1}/${chunk.metadata.totalChunks}...`);
            try {
                // Call LLM
                const responseText = await llmClient.review(chunk);
                // Validate response
                const reviewResponse = response_validator_1.ResponseValidator.validate(responseText);
                if (reviewResponse) {
                    allIssues.push(...reviewResponse.issues);
                    totalTokensUsed += chunk.estimatedTokens;
                    logger_1.Logger.info(`Found ${reviewResponse.issues.length} issues in chunk ${chunk.metadata.chunkIndex + 1}`);
                }
                else {
                    logger_1.Logger.warning(`Failed to validate response for chunk ${chunk.metadata.chunkIndex + 1}, skipping`);
                }
            }
            catch (error) {
                // Handle LLM API errors gracefully
                if (error instanceof Error) {
                    // Check for authentication errors
                    if (error.message.includes('authentication') || error.message.includes('API key')) {
                        logger_1.Logger.error('LLM Authentication', 'Invalid LLM API key', { provider: config.provider, error: error.message }, 'Check that your API key is valid and has sufficient permissions');
                        core.setFailed('LLM authentication failed');
                        return;
                    }
                    // Log other LLM errors and continue
                    logger_1.Logger.error('LLM API', `Error reviewing chunk ${chunk.metadata.chunkIndex + 1}`, { error: error.message }, 'Continuing with remaining chunks');
                    core.warning(`Failed to review chunk ${chunk.metadata.chunkIndex + 1}: ${error.message}`);
                }
            }
        }
        logger_1.Logger.info(`Total issues found: ${allIssues.length}`);
        if (allIssues.length === 0) {
            logger_1.Logger.info('No issues found, skipping review posting');
            // Still log summary
            const summary = {
                filesReviewed: filteredFiles.length,
                issuesFound: { critical: 0, warning: 0, suggestion: 0 },
                verdict: 'approve',
                tokensUsed: totalTokensUsed,
                estimatedCost: logger_1.Logger.estimateCost(totalTokensUsed, config.model),
            };
            logger_1.Logger.logSummary(summary);
            return;
        }
        // 9. Deduplicate issues
        logger_1.Logger.info('Deduplicating issues...');
        const deduplicatedIssues = deduplicator_1.Deduplicator.deduplicate(allIssues);
        logger_1.Logger.info(`${deduplicatedIssues.length} issues after deduplication`);
        // 10. Map line numbers to positions
        logger_1.Logger.info('Mapping line numbers to diff positions...');
        const mappedIssues = line_mapper_1.LineMapper.mapIssues(deduplicatedIssues, filteredFiles);
        // 11. Determine verdict based on highest severity
        const verdict = determineVerdict(deduplicatedIssues);
        const summary = `AI Code Review found ${deduplicatedIssues.length} issue(s)`;
        // 12. Post comments
        logger_1.Logger.info('Posting review comments...');
        await comment_poster_1.CommentPoster.post(githubClient, owner, repo, pullNumber, mappedIssues, verdict, summary);
        logger_1.Logger.info('Review posted successfully');
        // 13. Add labels
        logger_1.Logger.info('Adding severity labels...');
        await label_manager_1.LabelManager.addLabel(githubClient, owner, repo, pullNumber, deduplicatedIssues, config.severityThreshold);
        logger_1.Logger.info('Labels updated');
        // 14. Log summary
        const reviewSummary = {
            filesReviewed: filteredFiles.length,
            issuesFound: {
                critical: deduplicatedIssues.filter(i => i.severity === 'critical').length,
                warning: deduplicatedIssues.filter(i => i.severity === 'warning').length,
                suggestion: deduplicatedIssues.filter(i => i.severity === 'suggestion').length,
            },
            verdict,
            tokensUsed: totalTokensUsed,
            estimatedCost: logger_1.Logger.estimateCost(totalTokensUsed, config.model),
        };
        logger_1.Logger.logSummary(reviewSummary);
        logger_1.Logger.info('AI Code Reviewer completed successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            // Check for GitHub API rate limit errors
            if (error.message.includes('rate limit')) {
                logger_1.Logger.error('GitHub API', 'Rate limit exceeded', { error: error.message }, 'Wait for rate limit to reset or use a token with higher limits');
                core.warning('GitHub API rate limit exceeded');
                return;
            }
            // Check for GitHub authentication errors
            if (error.message.includes('authentication') || error.message.includes('Bad credentials')) {
                logger_1.Logger.error('GitHub Authentication', 'Invalid GitHub token', { error: error.message }, 'Check that your GITHUB_TOKEN has the required permissions');
                core.setFailed('GitHub authentication failed');
                return;
            }
            // Generic error handling
            logger_1.Logger.error('Execution', error.message, { stack: error.stack });
            core.setFailed(error.message);
        }
        else {
            logger_1.Logger.error('Execution', 'Unknown error occurred');
            core.setFailed('Unknown error occurred');
        }
    }
}
/**
 * Determine verdict based on highest severity issue
 */
function determineVerdict(issues) {
    const hasCritical = issues.some(i => i.severity === 'critical');
    if (hasCritical) {
        return 'request_changes';
    }
    const hasWarning = issues.some(i => i.severity === 'warning');
    if (hasWarning) {
        return 'comment';
    }
    return 'approve';
}
/**
 * Get max tokens for a given model
 */
function getMaxTokensForModel(model) {
    // Claude models
    if (model.includes('claude-3-5-sonnet') || model.includes('claude-3.5-sonnet')) {
        return 200000; // 200k context window
    }
    if (model.includes('claude-3-opus')) {
        return 200000;
    }
    if (model.includes('claude-3-sonnet')) {
        return 200000;
    }
    if (model.includes('claude-3-haiku')) {
        return 200000;
    }
    // GPT-4 models
    if (model.includes('gpt-4-turbo')) {
        return 128000;
    }
    if (model.includes('gpt-4')) {
        return 8192;
    }
    // GPT-3.5
    if (model.includes('gpt-3.5-turbo')) {
        return 16385;
    }
    // Default to conservative limit
    return 8192;
}
run();
//# sourceMappingURL=index.js.map