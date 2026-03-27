# Requirements Document

## Introduction

The AI Code Reviewer is a GitHub Action that automatically reviews pull requests using large language models (LLMs). It analyzes code changes, identifies bugs, security vulnerabilities, and suggests improvements by posting inline comments directly on the PR. Unlike traditional linters that focus on style, this tool reviews code like a senior engineer, focusing on logic errors, architectural concerns, and real issues that impact code quality and security.

## Glossary

- **Action**: The GitHub Action executable that runs in CI/CD workflows
- **PR**: Pull Request - a proposed set of code changes in a GitHub repository
- **Diff**: The set of file changes between the base branch and the PR branch
- **Review_Comment**: An inline comment posted on a specific line of code in a PR
- **LLM_Client**: The service that communicates with AI model providers (Anthropic, OpenAI, etc.)
- **Diff_Position**: GitHub's position index within a diff hunk (not the same as file line number)
- **Chunk**: A subset of the diff that fits within the LLM's context window
- **Severity**: Classification of an issue as critical, warning, or suggestion
- **Review_Verdict**: The final recommendation (approve, request_changes, or comment)
- **Filter**: Logic that excludes files from review (generated files, lockfiles, etc.)
- **GitHub_API_Client**: The service that interacts with GitHub's REST API

## Requirements

### Requirement 1: Trigger on Pull Request Events

**User Story:** As a repository maintainer, I want the Action to run automatically on PR events, so that every code change gets reviewed without manual intervention.

#### Acceptance Criteria

1. WHEN a pull request is opened, THE Action SHALL execute the review workflow
2. WHEN a pull request is synchronized with new commits, THE Action SHALL execute the review workflow
3. THE Action SHALL read the GitHub token from workflow inputs
4. THE Action SHALL read the LLM API key from workflow inputs

### Requirement 2: Fetch Pull Request Diff

**User Story:** As a developer, I want the Action to analyze only the changed code, so that reviews are focused and efficient.

#### Acceptance Criteria

1. WHEN the Action executes, THE GitHub_API_Client SHALL fetch the complete diff for the PR
2. THE GitHub_API_Client SHALL retrieve the list of changed files with their paths
3. THE GitHub_API_Client SHALL retrieve the base commit SHA and head commit SHA
4. FOR ALL changed files, THE GitHub_API_Client SHALL retrieve the diff hunks with position metadata

### Requirement 3: Filter Irrelevant Files

**User Story:** As a developer, I want generated and non-reviewable files excluded, so that the LLM focuses on meaningful code.

#### Acceptance Criteria

1. THE Filter SHALL exclude files matching package-lock.json
2. THE Filter SHALL exclude files matching yarn.lock
3. THE Filter SHALL exclude files matching pnpm-lock.yaml
4. THE Filter SHALL exclude files with .generated. in the filename
5. THE Filter SHALL exclude files in directories named __snapshots__
6. THE Filter SHALL exclude files with extensions .min.js or .min.css
7. WHERE a max_files input is configured, THE Filter SHALL limit the total number of files to that maximum

### Requirement 4: Chunk Large Diffs

**User Story:** As a developer, I want large PRs to be reviewed completely, so that no changes are missed due to context window limits.

#### Acceptance Criteria

1. WHEN the total diff size exceeds the model's context window, THE Chunker SHALL split the diff into multiple chunks
2. THE Chunker SHALL preserve complete file contexts within chunks when possible
3. THE Chunker SHALL include file path and line number metadata in each chunk
4. FOR ALL chunks, THE Chunker SHALL ensure the chunk size fits within the configured model's token limit

### Requirement 5: Generate Review with LLM

**User Story:** As a developer, I want intelligent code analysis, so that I receive actionable feedback on bugs, security issues, and design problems.

#### Acceptance Criteria

1. WHEN a diff chunk is ready, THE LLM_Client SHALL send the chunk with the review prompt to the configured LLM
2. THE LLM_Client SHALL request structured JSON output containing issues, summary, and verdict
3. THE LLM_Client SHALL parse the response using a schema validator
4. IF the LLM response is invalid JSON, THEN THE LLM_Client SHALL log the error and retry once
5. THE LLM_Client SHALL support Anthropic models via the Anthropic SDK
6. THE LLM_Client SHALL support OpenAI models via the OpenAI SDK
7. WHERE a model input is configured, THE LLM_Client SHALL use that specific model

### Requirement 6: Parse and Validate LLM Output

**User Story:** As a developer, I want reliable structured output, so that review comments are consistently formatted and actionable.

#### Acceptance Criteria

1. THE Action SHALL validate LLM output against a JSON schema with fields: issues, summary, verdict
2. FOR ALL issues in the output, THE Action SHALL validate the presence of severity, file, line, and comment fields
3. THE Action SHALL validate that severity is one of: critical, warning, suggestion
4. THE Action SHALL validate that verdict is one of: approve, request_changes, comment
5. IF validation fails, THEN THE Action SHALL log the validation error and skip posting that issue

### Requirement 7: Map Line Numbers to Diff Positions

**User Story:** As a developer, I want comments on the exact lines of code, so that I can quickly understand what needs to change.

#### Acceptance Criteria

1. FOR ALL issues returned by the LLM, THE Action SHALL map the file line number to the GitHub diff position
2. THE Action SHALL use the diff hunk metadata to calculate the correct position index
3. IF a line number cannot be mapped to a diff position, THEN THE Action SHALL post the comment on the file without a specific line
4. THE Action SHALL handle added lines, deleted lines, and context lines correctly in position mapping

### Requirement 8: Post Inline Review Comments

**User Story:** As a developer, I want feedback directly on my code, so that I can see issues in context.

#### Acceptance Criteria

1. FOR ALL validated issues, THE GitHub_API_Client SHALL post a review comment at the calculated diff position
2. THE GitHub_API_Client SHALL include the severity level in the comment body
3. WHERE a suggestion field exists in the issue, THE GitHub_API_Client SHALL include the suggested code fix in the comment
4. THE GitHub_API_Client SHALL batch all comments into a single review submission
5. THE GitHub_API_Client SHALL set the review event based on the verdict (APPROVE, REQUEST_CHANGES, or COMMENT)

### Requirement 9: Add Severity Labels

**User Story:** As a repository maintainer, I want PRs labeled by severity, so that I can prioritize reviews and enforce merge policies.

#### Acceptance Criteria

1. WHEN the review contains critical severity issues, THE GitHub_API_Client SHALL add the label "ai-review: critical" to the PR
2. WHEN the review contains warning severity issues, THE GitHub_API_Client SHALL add the label "ai-review: warning" to the PR
3. WHEN the review contains only suggestion severity issues, THE GitHub_API_Client SHALL add the label "ai-review: suggestion" to the PR
4. WHERE a severity_threshold input is configured, THE Action SHALL only post issues at or above that threshold

### Requirement 10: Handle API Errors Gracefully

**User Story:** As a developer, I want the Action to handle failures without breaking CI, so that temporary issues don't block my workflow.

#### Acceptance Criteria

1. IF the GitHub API returns a rate limit error, THEN THE Action SHALL log the error and exit with a warning status
2. IF the LLM API returns an error, THEN THE Action SHALL log the error and exit with a warning status
3. IF the GitHub token is invalid, THEN THE Action SHALL log an authentication error and exit with failure status
4. IF the LLM API key is invalid, THEN THE Action SHALL log an authentication error and exit with failure status
5. THE Action SHALL log all errors to the GitHub Actions console with actionable error messages

### Requirement 11: Deduplicate Findings Across Chunks

**User Story:** As a developer, I want to avoid duplicate comments, so that reviews are clean and easy to read.

#### Acceptance Criteria

1. WHEN multiple chunks are reviewed, THE Action SHALL collect all issues before posting
2. THE Action SHALL identify duplicate issues by comparing file, line, and comment similarity
3. THE Action SHALL remove duplicate issues keeping only the first occurrence
4. THE Action SHALL post the deduplicated set of issues as a single review

### Requirement 12: Provide Configuration Options

**User Story:** As a repository maintainer, I want to customize the Action's behavior, so that it fits my team's workflow and budget.

#### Acceptance Criteria

1. THE Action SHALL accept a github_token input for GitHub API authentication
2. THE Action SHALL accept an anthropic_api_key input for Anthropic API authentication
3. THE Action SHALL accept an openai_api_key input for OpenAI API authentication
4. THE Action SHALL accept a model input to specify which LLM to use
5. THE Action SHALL accept a max_files input to limit the number of files reviewed
6. THE Action SHALL accept a severity_threshold input to filter issues by minimum severity
7. THE Action SHALL provide default values for optional inputs

### Requirement 13: Parse Configuration Files into Structured Data

**User Story:** As a developer, I want the Action to correctly parse its configuration, so that it behaves as I expect.

#### Acceptance Criteria

1. WHEN the action.yml file is provided, THE Action SHALL parse it into a Configuration object
2. WHEN an invalid action.yml file is provided, THE Action SHALL return a descriptive error
3. THE Configuration_Parser SHALL format Configuration objects back into valid YAML files
4. FOR ALL valid Configuration objects, parsing then formatting then parsing SHALL produce an equivalent object

### Requirement 14: Log Review Summary

**User Story:** As a developer, I want to see a summary in the Action logs, so that I can understand what was reviewed without opening the PR.

#### Acceptance Criteria

1. WHEN the review completes, THE Action SHALL log the total number of files reviewed
2. THE Action SHALL log the count of issues by severity (critical, warning, suggestion)
3. THE Action SHALL log the final verdict (approve, request_changes, comment)
4. THE Action SHALL log the total tokens used and estimated cost
5. WHERE the review fails, THE Action SHALL log the failure reason and stack trace
