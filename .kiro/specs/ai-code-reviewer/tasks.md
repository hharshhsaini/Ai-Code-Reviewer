# Implementation Plan: AI Code Reviewer GitHub Action

## Overview

This implementation plan breaks down the AI Code Reviewer into discrete coding tasks following the pipeline architecture: Fetch → Filter → Chunk → Review → Map → Post. The implementation uses TypeScript with GitHub Actions runtime, Octokit for GitHub API interactions, and provider SDKs (Anthropic, OpenAI) for LLM integration. Each task builds incrementally, with property-based tests using fast-check to validate correctness properties, and checkpoints to ensure stability before proceeding.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize TypeScript project with GitHub Actions configuration
  - Install dependencies: @actions/core, @actions/github, @octokit/rest, @anthropic-ai/sdk, openai, zod, fast-check, jest
  - Create action.yml with all required inputs (github_token, anthropic_api_key, openai_api_key, model, max_files, severity_threshold)
  - Set up TypeScript compiler configuration for Node.js 20 runtime
  - Create src/ directory structure with placeholder files for each component
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 2. Implement core data models and validation
  - [x] 2.1 Create TypeScript interfaces for all data models
    - Define ActionConfig, DiffFile, DiffHunk, DiffLine, DiffChunk interfaces
    - Define ReviewResponse, Issue, MappedIssue, ReviewComment, ReviewSummary interfaces
    - Create types.ts file with all interface definitions
    - _Requirements: 2.2, 2.3, 2.4, 5.2, 6.2_

  - [x] 2.2 Implement Zod schemas for validation
    - Create SeveritySchema, VerdictSchema, IssueSchema, ReviewResponseSchema
    - Create ConfigurationSchema for action.yml parsing
    - Export type inference helpers for all schemas
    - _Requirements: 6.1, 6.3, 6.4, 13.1_

  - [x] 2.3 Write property test for configuration round-trip preservation
    - **Property 1: Configuration Round-Trip Preservation**
    - **Validates: Requirements 13.4**

- [x] 3. Implement Configuration Loader
  - [x] 3.1 Create configuration parser
    - Read inputs from GitHub Actions context using @actions/core
    - Parse and validate all required fields (github_token, api_keys)
    - Apply defaults for optional fields (max_files, severity_threshold)
    - Determine provider based on which API key is provided
    - Return typed ActionConfig object
    - _Requirements: 1.3, 1.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 3.2 Write property test for configuration field extraction
    - **Property 2: Configuration Field Extraction**
    - **Validates: Requirements 1.3, 1.4, 12.7**

  - [x] 3.3 Write unit tests for configuration validation
    - Test missing required fields (github_token, api_keys)
    - Test default value application
    - Test provider detection logic
    - _Requirements: 12.7_

- [x] 4. Implement GitHub API Client
  - [x] 4.1 Create GitHub API client wrapper
    - Initialize Octokit with provided github_token
    - Implement retry logic with exponential backoff for transient errors
    - Add rate limit checking and handling
    - Create methods: getPullRequest(), getDiff(), postReview(), addLabels(), removeLabels()
    - _Requirements: 1.3, 2.1, 8.1, 8.4, 8.5, 9.1, 9.2, 9.3, 10.1, 10.3_

  - [x] 4.2 Write unit tests for GitHub API client
    - Mock Octokit responses for all methods
    - Test retry logic with 5xx errors
    - Test rate limit handling
    - Test authentication error handling
    - _Requirements: 10.1, 10.3_

- [x] 5. Implement Diff Fetcher
  - [x] 5.1 Create diff fetching and parsing logic
    - Fetch PR metadata (base SHA, head SHA, changed files list)
    - Fetch unified diff format for all changed files
    - Parse diff hunks with @@ headers to extract oldStart, oldLines, newStart, newLines
    - Parse individual diff lines (add/delete/context) with line numbers
    - Calculate position index for each line in the diff
    - Construct DiffFile objects with complete metadata
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 5.2 Write property test for diff hunk position metadata
    - **Property 3: Diff Hunk Position Metadata**
    - **Validates: Requirements 2.4**

  - [x] 5.3 Write unit tests for diff parsing
    - Test single hunk with only additions
    - Test single hunk with only deletions
    - Test single hunk with mixed changes
    - Test multiple hunks in same file
    - Test empty diff
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement File Filter
  - [x] 7.1 Create file filtering logic
    - Implement exclusion rules for lockfiles (package-lock.json, yarn.lock, pnpm-lock.yaml)
    - Implement exclusion for generated files (*.generated.*)
    - Implement exclusion for snapshot directories (__snapshots__)
    - Implement exclusion for minified files (*.min.js, *.min.css)
    - Implement max_files limit with prioritization by file extension
    - Return filtered list of DiffFile objects
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 7.2 Write property test for generated file filtering
    - **Property 4: Generated File Filtering**
    - **Validates: Requirements 3.4**

  - [x] 7.3 Write property test for snapshot directory filtering
    - **Property 5: Snapshot Directory Filtering**
    - **Validates: Requirements 3.5**

  - [x] 7.4 Write property test for minified file filtering
    - **Property 6: Minified File Filtering**
    - **Validates: Requirements 3.6**

  - [x] 7.5 Write property test for max files limit enforcement
    - **Property 7: Max Files Limit Enforcement**
    - **Validates: Requirements 3.7**

  - [x] 7.6 Write unit tests for specific lockfile patterns
    - Test package-lock.json exclusion
    - Test yarn.lock exclusion
    - Test pnpm-lock.yaml exclusion
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Implement Diff Chunker
  - [x] 8.1 Create diff chunking logic
    - Implement token estimation function (use character count / 4 as approximation)
    - Implement chunking algorithm that preserves file atomicity
    - Reserve tokens for prompt template and response overhead
    - Handle edge case: single file exceeds token limit (truncate with warning)
    - Add chunk metadata (chunkIndex, totalChunks)
    - Include file paths and line ranges in each chunk
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.2 Write property test for chunk size constraint
    - **Property 8: Chunk Size Constraint**
    - **Validates: Requirements 4.4**

  - [x] 8.3 Write property test for file atomicity in chunks
    - **Property 9: File Atomicity in Chunks**
    - **Validates: Requirements 4.2**

  - [x] 8.4 Write property test for chunk metadata completeness
    - **Property 10: Chunk Metadata Completeness**
    - **Validates: Requirements 4.3**

  - [x] 8.5 Write unit tests for chunking edge cases
    - Test empty file list
    - Test single file under limit
    - Test single file over limit (should truncate)
    - Test multiple files that fit in one chunk
    - Test multiple files requiring multiple chunks
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Implement LLM Client
  - [x] 9.1 Create LLM client abstraction
    - Create base LLMClient interface with review() method
    - Implement AnthropicClient using @anthropic-ai/sdk
    - Implement OpenAIClient using openai SDK
    - Construct review prompt using template from design document
    - Request structured JSON output with specific schema
    - Implement retry logic for transient failures (2 attempts)
    - Parse and return response as string
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 10.2, 10.4_

  - [x] 9.2 Write property test for model configuration propagation
    - **Property 12: Model Configuration Propagation**
    - **Validates: Requirements 5.7**

  - [x] 9.3 Write unit tests for LLM client
    - Mock Anthropic SDK responses
    - Mock OpenAI SDK responses
    - Test prompt construction with diff chunk
    - Test retry logic with API errors
    - Test authentication error handling
    - _Requirements: 5.1, 5.5, 5.6, 10.2, 10.4_

- [x] 10. Implement Response Validator
  - [x] 10.1 Create LLM response validation logic
    - Parse JSON response from LLM
    - Validate against ReviewResponseSchema using Zod
    - Check all required fields are present (issues, summary, verdict)
    - Validate severity enum values (critical, warning, suggestion)
    - Validate verdict enum values (approve, request_changes, comment)
    - Log validation errors with helpful messages
    - Return typed ReviewResponse object or null on validation failure
    - _Requirements: 5.3, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 10.2 Write property test for LLM response schema conformance
    - **Property 11: LLM Response Schema Conformance**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [x] 10.3 Write unit tests for validation edge cases
    - Test invalid JSON response
    - Test missing required fields
    - Test invalid enum values
    - Test malformed issues array
    - _Requirements: 5.4, 6.5_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Line Mapper
  - [x] 12.1 Create line-to-position mapping algorithm
    - Implement mapLineToPosition() function following design algorithm
    - Iterate through all hunks and lines in DiffFile
    - Track position index (1-based) as iteration progresses
    - Match line number to newLineNumber for added and context lines
    - Return position for matched lines, null for unmappable lines
    - Handle deleted lines (no newLineNumber) by returning null
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 12.2 Write property test for line-to-position mapping correctness
    - **Property 13: Line-to-Position Mapping Correctness**
    - **Validates: Requirements 7.1, 7.2, 7.4**

  - [x] 12.3 Write property test for unmappable line handling
    - **Property 14: Unmappable Line Handling**
    - **Validates: Requirements 7.3**

  - [x] 12.4 Write unit tests for line mapping edge cases
    - Test single hunk with only additions
    - Test single hunk with only deletions
    - Test single hunk with mixed changes
    - Test multiple hunks in same file
    - Test line in context (unchanged)
    - Test line not in diff (should return null)
    - Test deleted line (should return null)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 13. Implement Deduplicator
  - [x] 13.1 Create deduplication logic
    - Implement areSimilar() function with file, line, and comment text comparison
    - Implement Levenshtein distance calculation for fuzzy comment matching
    - Use 80% similarity threshold for comment text
    - Implement severityRank() helper function
    - Implement deduplicateIssues() function following design algorithm
    - When duplicates found, keep issue with highest severity
    - Return deduplicated list of issues
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 13.2 Write property test for deduplication removes duplicates
    - **Property 22: Deduplication Removes Duplicates**
    - **Validates: Requirements 11.2, 11.3, 11.4**

  - [x] 13.3 Write property test for deduplication preserves highest severity
    - **Property 23: Deduplication Preserves Highest Severity**
    - **Validates: Requirements 11.2**

  - [x] 13.4 Write unit tests for deduplication edge cases
    - Test no duplicates (should return unchanged)
    - Test exact duplicates (same file, line, comment)
    - Test similar duplicates (same file, line, slightly different comment)
    - Test duplicates with different severities (should keep highest)
    - _Requirements: 11.2, 11.3, 11.4_

- [x] 14. Implement Comment Poster
  - [x] 14.1 Create comment posting logic
    - Map issues to diff positions using Line Mapper
    - Create MappedIssue objects with position or null
    - Format comment body with severity badge markdown
    - Include suggestion in comment body when present
    - Batch all comments into single review submission
    - Set review event based on verdict (APPROVE/REQUEST_CHANGES/COMMENT)
    - Post review using GitHub API Client
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 14.2 Write property test for comment severity inclusion
    - **Property 15: Comment Severity Inclusion**
    - **Validates: Requirements 8.2**

  - [x] 14.3 Write property test for suggestion inclusion when present
    - **Property 16: Suggestion Inclusion When Present**
    - **Validates: Requirements 8.3**

  - [x] 14.4 Write property test for review batching
    - **Property 17: Review Batching**
    - **Validates: Requirements 8.4**

  - [x] 14.5 Write property test for verdict-to-event mapping
    - **Property 18: Verdict-to-Event Mapping**
    - **Validates: Requirements 8.5**

  - [x] 14.6 Write unit tests for comment posting
    - Test inline comment with valid position
    - Test file-level comment with null position
    - Test comment with suggestion
    - Test batched review submission
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 15. Implement Label Manager
  - [x] 15.1 Create label management logic
    - Determine highest severity from all issues using severityRank()
    - Map severity to label: "ai-review: critical", "ai-review: warning", "ai-review: suggestion"
    - Remove stale ai-review labels from previous runs
    - Add new label based on highest severity
    - Apply severity_threshold filter before determining label
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 15.2 Write property test for severity-based label selection
    - **Property 19: Severity-Based Label Selection**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 15.3 Write property test for severity threshold filtering
    - **Property 20: Severity Threshold Filtering**
    - **Validates: Requirements 9.4**

  - [x] 15.4 Write unit tests for label management
    - Test critical issues produce "ai-review: critical" label
    - Test warning issues produce "ai-review: warning" label
    - Test suggestion issues produce "ai-review: suggestion" label
    - Test severity threshold filtering
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 16. Implement Logger
  - [x] 16.1 Create logging utilities
    - Implement structured logging using @actions/core
    - Create log methods for info, warning, error with consistent formatting
    - Implement error logging with descriptive messages and context
    - Create summary logging function for review statistics
    - Calculate token usage and estimated cost based on model pricing
    - _Requirements: 10.5, 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 16.2 Write property test for error logging completeness
    - **Property 21: Error Logging Completeness**
    - **Validates: Requirements 10.5**

  - [x] 16.3 Write unit tests for logging
    - Test info logging format
    - Test error logging with context
    - Test summary statistics calculation
    - Test token usage and cost estimation
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Implement main workflow orchestration
  - [x] 18.1 Create main entry point
    - Load configuration using Configuration Loader
    - Initialize GitHub API Client with token
    - Fetch PR diff using Diff Fetcher
    - Filter files using File Filter
    - Chunk diff using Diff Chunker
    - For each chunk: call LLM Client, validate response, collect issues
    - Deduplicate issues across all chunks
    - Map line numbers to positions using Line Mapper
    - Post comments using Comment Poster
    - Add labels using Label Manager
    - Log summary using Logger
    - Handle errors gracefully with appropriate exit codes
    - _Requirements: 1.1, 1.2, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 18.2 Write integration tests for main workflow
    - Mock GitHub API and LLM API
    - Test complete workflow from PR event to posted review
    - Test error handling for authentication failures
    - Test error handling for rate limit errors
    - Test error handling for API errors
    - _Requirements: 1.1, 1.2, 10.1, 10.2, 10.3, 10.4_

- [x] 19. Create action.yml metadata file
  - Define action name, description, and branding
  - Specify all inputs with descriptions, required flags, and defaults
  - Configure runs section for Node.js 20 runtime
  - Point main to compiled JavaScript entry point
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 20. Create documentation
  - [x] 20.1 Write README.md
    - Add overview and features section
    - Add installation instructions
    - Add usage examples with workflow YAML
    - Document all configuration options
    - Add cost estimation guide with token usage examples
    - Add troubleshooting section for common errors
    - Add examples for different LLM providers (Anthropic, OpenAI)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 20.2 Create example workflow files
    - Create .github/workflows/ai-review.yml example
    - Show configuration for Anthropic provider
    - Show configuration for OpenAI provider
    - Show configuration with custom thresholds
    - _Requirements: 1.1, 1.2_

- [x] 21. Final checkpoint - Ensure all tests pass
  - Run complete test suite (unit tests and property tests)
  - Verify all 23 properties pass with 100+ iterations
  - Check test coverage meets goals (>90% line coverage, >85% branch coverage)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check library with minimum 100 iterations per test
- All property tests include comments referencing design property numbers
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation follows the pipeline architecture from the design document
- TypeScript is used throughout based on the design document's code examples
