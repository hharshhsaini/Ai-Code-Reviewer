/**
 * Main entry point for AI Code Reviewer GitHub Action
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { ConfigurationLoader } from './config-loader';
import { GitHubClient } from './github-client';
import { DiffFetcher } from './diff-fetcher';
import { FileFilter } from './file-filter';
import { DiffChunker } from './diff-chunker';
import { createLLMClient } from './llm-client';
import { ResponseValidator } from './response-validator';
import { Deduplicator } from './deduplicator';
import { LineMapper } from './line-mapper';
import { CommentPoster } from './comment-poster';
import { LabelManager } from './label-manager';
import { Logger } from './logger';
import { Issue, ReviewSummary, Verdict } from './types';

async function run(): Promise<void> {
  try {
    Logger.info('AI Code Reviewer started');
    
    // 1. Load configuration
    Logger.info('Loading configuration...');
    const config = ConfigurationLoader.load();
    Logger.info(`Using provider: ${config.provider}, model: ${config.model}`);
    
    // 2. Initialize GitHub API Client
    Logger.info('Initializing GitHub client...');
    const githubClient = new GitHubClient(config.githubToken);
    
    // 3. Get PR context from GitHub Actions environment
    const context = github.context;
    if (!context.payload.pull_request) {
      throw new Error('This action can only be run on pull_request events');
    }
    
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const pullNumber = context.payload.pull_request.number;
    
    Logger.info(`Reviewing PR #${pullNumber} in ${owner}/${repo}`);
    
    // 4. Fetch PR diff
    Logger.info('Fetching PR diff...');
    const diffFetcher = new DiffFetcher(githubClient);
    const allFiles = await diffFetcher.fetchPRDiff(owner, repo, pullNumber);
    Logger.info(`Fetched ${allFiles.length} changed files`);
    
    // 5. Filter files
    Logger.info('Filtering files...');
    const filteredFiles = FileFilter.filter(allFiles, config.maxFiles);
    Logger.info(`${filteredFiles.length} files after filtering`);
    
    if (filteredFiles.length === 0) {
      Logger.info('No files to review after filtering');
      return;
    }
    
    // 6. Chunk diff
    Logger.info('Chunking diff...');
    // Determine max tokens based on model
    const maxTokens = getMaxTokensForModel(config.model);
    const chunks = DiffChunker.chunk(filteredFiles, maxTokens);
    Logger.info(`Created ${chunks.length} chunks`);
    
    // 7. Initialize LLM client
    Logger.info('Initializing LLM client...');
    const apiKey = config.provider === 'anthropic' ? config.anthropicApiKey! : config.openaiApiKey!;
    const llmClient = createLLMClient(config.provider, apiKey, config.model);
    
    // 8. Review each chunk and collect issues
    Logger.info('Reviewing chunks...');
    const allIssues: Issue[] = [];
    let totalTokensUsed = 0;
    
    for (const chunk of chunks) {
      Logger.info(`Reviewing chunk ${chunk.metadata.chunkIndex + 1}/${chunk.metadata.totalChunks}...`);
      
      try {
        // Call LLM
        const responseText = await llmClient.review(chunk);
        
        // Validate response
        const reviewResponse = ResponseValidator.validate(responseText);
        
        if (reviewResponse) {
          allIssues.push(...reviewResponse.issues);
          totalTokensUsed += chunk.estimatedTokens;
          Logger.info(`Found ${reviewResponse.issues.length} issues in chunk ${chunk.metadata.chunkIndex + 1}`);
        } else {
          Logger.warning(`Failed to validate response for chunk ${chunk.metadata.chunkIndex + 1}, skipping`);
        }
      } catch (error) {
        // Handle LLM API errors gracefully
        if (error instanceof Error) {
          // Check for authentication errors
          if (error.message.includes('authentication') || error.message.includes('API key')) {
            Logger.error(
              'LLM Authentication',
              'Invalid LLM API key',
              { provider: config.provider, error: error.message },
              'Check that your API key is valid and has sufficient permissions'
            );
            core.setFailed('LLM authentication failed');
            return;
          }
          
          // Log other LLM errors and continue
          Logger.error(
            'LLM API',
            `Error reviewing chunk ${chunk.metadata.chunkIndex + 1}`,
            { error: error.message },
            'Continuing with remaining chunks'
          );
          core.warning(`Failed to review chunk ${chunk.metadata.chunkIndex + 1}: ${error.message}`);
        }
      }
    }
    
    Logger.info(`Total issues found: ${allIssues.length}`);
    
    if (allIssues.length === 0) {
      Logger.info('No issues found, skipping review posting');
      
      // Still log summary
      const summary: ReviewSummary = {
        filesReviewed: filteredFiles.length,
        issuesFound: { critical: 0, warning: 0, suggestion: 0 },
        verdict: 'approve',
        tokensUsed: totalTokensUsed,
        estimatedCost: Logger.estimateCost(totalTokensUsed, config.model),
      };
      Logger.logSummary(summary);
      return;
    }
    
    // 9. Deduplicate issues
    Logger.info('Deduplicating issues...');
    const deduplicatedIssues = Deduplicator.deduplicate(allIssues);
    Logger.info(`${deduplicatedIssues.length} issues after deduplication`);
    
    // 10. Map line numbers to positions
    Logger.info('Mapping line numbers to diff positions...');
    const mappedIssues = LineMapper.mapIssues(deduplicatedIssues, filteredFiles);
    
    // 11. Determine verdict based on highest severity
    const verdict = determineVerdict(deduplicatedIssues);
    const summary = `AI Code Review found ${deduplicatedIssues.length} issue(s)`;
    
    // 12. Post comments
    Logger.info('Posting review comments...');
    await CommentPoster.post(
      githubClient,
      owner,
      repo,
      pullNumber,
      mappedIssues,
      verdict,
      summary
    );
    Logger.info('Review posted successfully');
    
    // 13. Add labels
    Logger.info('Adding severity labels...');
    await LabelManager.addLabel(
      githubClient,
      owner,
      repo,
      pullNumber,
      deduplicatedIssues,
      config.severityThreshold
    );
    Logger.info('Labels updated');
    
    // 14. Log summary
    const reviewSummary: ReviewSummary = {
      filesReviewed: filteredFiles.length,
      issuesFound: {
        critical: deduplicatedIssues.filter(i => i.severity === 'critical').length,
        warning: deduplicatedIssues.filter(i => i.severity === 'warning').length,
        suggestion: deduplicatedIssues.filter(i => i.severity === 'suggestion').length,
      },
      verdict,
      tokensUsed: totalTokensUsed,
      estimatedCost: Logger.estimateCost(totalTokensUsed, config.model),
    };
    Logger.logSummary(reviewSummary);
    
    Logger.info('AI Code Reviewer completed successfully');
  } catch (error) {
    if (error instanceof Error) {
      // Check for GitHub API rate limit errors
      if (error.message.includes('rate limit')) {
        Logger.error(
          'GitHub API',
          'Rate limit exceeded',
          { error: error.message },
          'Wait for rate limit to reset or use a token with higher limits'
        );
        core.warning('GitHub API rate limit exceeded');
        return;
      }
      
      // Check for GitHub authentication errors
      if (error.message.includes('authentication') || error.message.includes('Bad credentials')) {
        Logger.error(
          'GitHub Authentication',
          'Invalid GitHub token',
          { error: error.message },
          'Check that your GITHUB_TOKEN has the required permissions'
        );
        core.setFailed('GitHub authentication failed');
        return;
      }
      
      // Generic error handling
      Logger.error('Execution', error.message, { stack: error.stack });
      core.setFailed(error.message);
    } else {
      Logger.error('Execution', 'Unknown error occurred');
      core.setFailed('Unknown error occurred');
    }
  }
}

/**
 * Determine verdict based on highest severity issue
 */
function determineVerdict(issues: Issue[]): Verdict {
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
function getMaxTokensForModel(model: string): number {
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
