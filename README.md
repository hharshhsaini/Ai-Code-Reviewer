# AI Code Reviewer

A GitHub Action that automatically reviews pull requests using large language models (Anthropic Claude, OpenAI GPT, or Ollama). Unlike traditional linters that focus on style, this tool reviews code like a senior engineer, identifying logic errors, security vulnerabilities, performance issues, and architectural concerns.

> **📖 New to this action?** Check out the [Setup Guide](SETUP_GUIDE.md) for step-by-step instructions.
> **🆓 Want free local testing?** Check out the [Ollama Testing Guide](OLLAMA_TESTING.md) for running reviews locally.

## Overview

The AI Code Reviewer analyzes code changes in pull requests and provides intelligent, context-aware feedback through inline comments. It focuses on issues that matter: bugs, security vulnerabilities, performance problems, and design concerns that could impact code quality.

### Key Features

- 🤖 **Intelligent Analysis**: Uses state-of-the-art LLMs (Claude, GPT, or Ollama) for deep code understanding
- 🆓 **Free Option**: Use Ollama for completely free, local code reviews
- 🔍 **Focus on Real Issues**: Identifies logic errors, security vulnerabilities, and architectural concerns
- 💬 **Inline Comments**: Posts feedback directly on specific lines of code in your PR
- 🏷️ **Severity Labels**: Automatically labels PRs as critical, warning, or suggestion
- 📊 **Large PR Support**: Handles large PRs by intelligently chunking diffs to fit LLM context windows
- 🎯 **Smart Filtering**: Excludes non-reviewable files (lockfiles, generated files, snapshots, minified files)
- 🔄 **Deduplication**: Prevents duplicate comments across multiple chunks
- ⚡ **Cost Control**: Configurable file limits and severity thresholds to manage API costs

### What It Reviews

**Focus Areas:**
- Logic errors and bugs that break functionality
- Security vulnerabilities (SQL injection, XSS, authentication bypasses, etc.)
- Performance problems (N+1 queries, memory leaks, inefficient algorithms)
- Error handling gaps and edge cases
- Race conditions and concurrency issues
- Architectural concerns (tight coupling, SOLID principle violations)

**What It Ignores:**
- Style issues (formatting, naming conventions) - linters handle this
- Missing comments or documentation
- Subjective preferences

## Quick Start

### For Users (Using This Action in Your Repository)

#### Option 1: Free with Ollama (Local)

1. **Install Ollama** on your self-hosted runner or local machine:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Start Ollama and pull a model**:
   ```bash
   ollama serve
   ollama pull qwen2.5-coder:7b
   ```

3. **Create workflow file** (`.github/workflows/ai-review.yml`):
   ```yaml
   name: AI Code Review
   on:
     pull_request:
       types: [opened, synchronize]
   
   jobs:
     review:
       runs-on: self-hosted  # Must have Ollama installed
       permissions:
         contents: read
         pull-requests: write
       steps:
         - name: AI Code Review
           uses: hharshhsaini/Ai-Code-Reviewer@main
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             ollama_base_url: 'http://localhost:11434'
             model: 'qwen2.5-coder:7b'
   ```

See [OLLAMA_TESTING.md](OLLAMA_TESTING.md) for detailed Ollama setup instructions.

#### Option 2: Cloud with Anthropic/OpenAI

1. **Get an API Key**
   - Anthropic (recommended): Sign up at [console.anthropic.com](https://console.anthropic.com)
   - OpenAI: Sign up at [platform.openai.com](https://platform.openai.com)

2. **Add API Key to Your Repository**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`)
   - Value: Paste your API key
   - Click "Add secret"

3. **Create Workflow File**
   
   Create `.github/workflows/ai-review.yml` in your repository:

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - name: AI Code Review
        uses: hharshhsaini/Ai-Code-Reviewer@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: 'claude-3-5-sonnet-20241022'
```

4. **Test It**
   - Commit and push the workflow file
   - Create a pull request with some code changes
   - The action will automatically review your PR and post comments

### For Developers (Setting Up This Repository)

If you want to contribute or run this action from your own fork:

1. **Clone the Repository**
```bash
git clone https://github.com/USERNAME/REPO-NAME.git
cd REPO-NAME
```

2. **Install Dependencies**
```bash
npm install
```

3. **Build the Action**
```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder, which GitHub Actions will execute.

4. **Run Tests**
```bash
npm test
```

5. **Commit and Push**
```bash
git add dist/
git commit -m "Build action"
git push
```

**Important:** Always commit the `dist/` folder after building. GitHub Actions runs the compiled JavaScript, not the TypeScript source.

6. **Use in Your Workflows**

Now you can reference your fork in workflow files:
```yaml
uses: YOUR-USERNAME/REPO-NAME@main
```

Or create a release and use:
```yaml
uses: YOUR-USERNAME/REPO-NAME@v1
```

## Usage Examples

### Basic Usage with Anthropic

```yaml
- name: AI Code Review
  uses: hharshhsaini/Ai-Code-Reviewer@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Basic Usage with OpenAI

```yaml
- name: AI Code Review
  uses: hharshhsaini/Ai-Code-Reviewer@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    model: 'gpt-4'
```

### Advanced Configuration

```yaml
- name: AI Code Review
  uses: hharshhsaini/Ai-Code-Reviewer@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: 'claude-3-5-sonnet-20241022'
    max_files: 30                    # Review up to 30 files
    severity_threshold: 'warning'    # Only post warnings and critical issues
```

### Cost-Conscious Configuration

```yaml
- name: AI Code Review
  uses: hharshhsaini/Ai-Code-Reviewer@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: 'claude-3-sonnet-20240229'  # Less expensive model
    max_files: 20                       # Limit files reviewed
    severity_threshold: 'critical'      # Only critical issues
```

### Multiple Provider Setup

```yaml
- name: AI Code Review (Anthropic)
  uses: hharshhsaini/Ai-Code-Reviewer@main
  if: github.event.pull_request.changed_files <= 10
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: 'claude-3-5-sonnet-20241022'

- name: AI Code Review (OpenAI)
  uses: hharshhsaini/Ai-Code-Reviewer@main
  if: github.event.pull_request.changed_files > 10
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    model: 'gpt-3.5-turbo'
```

## Configuration

### Input Parameters

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github_token` | GitHub token for API authentication (use `secrets.GITHUB_TOKEN`) | Yes | - |
| `anthropic_api_key` | Anthropic API key for Claude models | No* | - |
| `openai_api_key` | OpenAI API key for GPT models | No* | - |
| `ollama_base_url` | Ollama base URL (e.g., `http://localhost:11434`) | No* | - |
| `model` | Specific LLM model to use | No | `claude-3-5-sonnet-20241022` |
| `max_files` | Maximum number of files to review (cost control) | No | `50` |
| `severity_threshold` | Minimum severity to post: `critical`, `warning`, or `suggestion` | No | `suggestion` |

*Either `anthropic_api_key`, `openai_api_key`, or `ollama_base_url` must be provided.

### Supported Models

#### Anthropic Models

| Model | Context Window | Best For | Cost (per 1M tokens) |
|-------|----------------|----------|---------------------|
| `claude-3-5-sonnet-20241022` | 200K | Recommended - best balance of quality and cost | Input: $3, Output: $15 |
| `claude-3-opus-20240229` | 200K | Highest quality, most thorough reviews | Input: $15, Output: $75 |
| `claude-3-sonnet-20240229` | 200K | Budget-friendly option | Input: $3, Output: $15 |

#### OpenAI Models

| Model | Context Window | Best For | Cost (per 1M tokens) |
|-------|----------------|----------|---------------------|
| `gpt-4` | 8K | High quality reviews | Input: $30, Output: $60 |
| `gpt-4-turbo` | 128K | Large PRs with many files | Input: $10, Output: $30 |
| `gpt-3.5-turbo` | 16K | Budget-friendly, faster reviews | Input: $0.50, Output: $1.50 |

#### Ollama Models (Free, Local)

| Model | Size | Best For | Context Window | Cost |
|-------|------|----------|----------------|------|
| `qwen2.5-coder:7b` | 7GB | Code review, best quality | 32K | Free |
| `deepseek-coder:6.7b` | 4GB | Code understanding | 16K | Free |
| `llama3.2:3b` | 2GB | Fast reviews, smaller PRs | 8K | Free |
| `codellama:7b` | 4GB | Code-specific tasks | 16K | Free |

> **Note**: Ollama models run locally and are completely free. See [OLLAMA_TESTING.md](OLLAMA_TESTING.md) for setup instructions.

### Severity Levels

- **critical**: Security vulnerabilities, data loss risks, crashes, logic errors that break functionality
- **warning**: Performance issues, error handling gaps, code smells that could lead to bugs
- **suggestion**: Refactoring opportunities, better patterns, minor improvements

### File Filtering

The action automatically excludes:
- Lockfiles: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- Generated files: Files containing `.generated.` in the name
- Test snapshots: Files in `__snapshots__` directories
- Minified files: Files ending with `.min.js` or `.min.css`

## Cost Estimation

### Token Usage

Token usage depends on:
- Number of files changed
- Size of changes (lines added/removed)
- Model used (different tokenization)

**Rough estimates:**
- Small PR (1-3 files, <200 lines): 2,000-5,000 tokens
- Medium PR (5-10 files, 200-500 lines): 5,000-15,000 tokens
- Large PR (20+ files, 1000+ lines): 20,000-50,000 tokens

### Cost Examples

#### Anthropic Claude 3.5 Sonnet (Recommended)

| PR Size | Estimated Tokens | Input Cost | Output Cost | Total Cost |
|---------|------------------|------------|-------------|------------|
| Small (5K tokens) | 4K input, 1K output | $0.012 | $0.015 | **$0.027** |
| Medium (15K tokens) | 12K input, 3K output | $0.036 | $0.045 | **$0.081** |
| Large (40K tokens) | 32K input, 8K output | $0.096 | $0.120 | **$0.216** |

#### OpenAI GPT-3.5 Turbo (Budget Option)

| PR Size | Estimated Tokens | Input Cost | Output Cost | Total Cost |
|---------|------------------|------------|-------------|------------|
| Small (5K tokens) | 4K input, 1K output | $0.002 | $0.0015 | **$0.0035** |
| Medium (15K tokens) | 12K input, 3K output | $0.006 | $0.0045 | **$0.0105** |
| Large (40K tokens) | 32K input, 8K output | $0.016 | $0.012 | **$0.028** |

### Monthly Cost Estimates

Assuming 50 PRs per month:

| Configuration | Cost per PR | Monthly Cost |
|---------------|-------------|--------------|
| Claude 3.5 Sonnet, max_files=50 | $0.05-0.20 | **$2.50-10.00** |
| Claude 3.5 Sonnet, max_files=20 | $0.03-0.10 | **$1.50-5.00** |
| GPT-3.5 Turbo, max_files=50 | $0.005-0.03 | **$0.25-1.50** |
| GPT-4 Turbo, max_files=30 | $0.15-0.50 | **$7.50-25.00** |

### Cost Control Tips

1. **Set `max_files` limit**: Review only the most important files
2. **Use `severity_threshold`**: Post only critical/warning issues to reduce output tokens
3. **Choose appropriate model**: Use GPT-3.5 or Claude Sonnet for routine reviews
4. **Filter by file type**: The action already excludes non-reviewable files
5. **Review on specific branches**: Only run on PRs targeting main/production branches

## Troubleshooting

### Common Errors

#### Authentication Failed

**Error:** `GitHub token is invalid or expired`

**Solution:**
- Ensure you're using `${{ secrets.GITHUB_TOKEN }}` in your workflow
- Check that your workflow has `pull-requests: write` permission
- Verify the token hasn't been revoked

#### API Key Invalid

**Error:** `Anthropic API key is invalid` or `OpenAI API key is invalid`

**Solution:**
- Verify the API key is correctly added to repository secrets
- Check for extra spaces or newlines in the secret value
- Ensure the API key hasn't been revoked or expired
- Verify you have credits/billing set up with the provider

#### Rate Limit Exceeded

**Error:** `Rate limit exceeded for GitHub API` or `Rate limit exceeded for LLM API`

**Solution:**
- For GitHub: Wait for rate limit to reset (check error message for reset time)
- For LLM: Check your API usage dashboard and upgrade plan if needed
- Reduce `max_files` to make fewer API calls
- Add delays between workflow runs

#### No Comments Posted

**Issue:** Action runs successfully but no comments appear on PR

**Possible Causes:**
1. **All issues below severity threshold**: Check action logs for filtered issues
   - Solution: Lower `severity_threshold` to `suggestion`

2. **No issues found**: The LLM didn't identify any problems
   - Solution: This is normal for clean code

3. **Permission denied**: Workflow lacks permission to post comments
   - Solution: Add `pull-requests: write` to workflow permissions

4. **Lines not in diff**: Issues on unchanged lines can't be posted inline
   - Solution: Check for file-level comments instead

#### Action Times Out

**Error:** `Action exceeded maximum execution time`

**Solution:**
- Reduce `max_files` to review fewer files
- Use a faster model (GPT-3.5 Turbo or Claude Sonnet)
- Split large PRs into smaller ones
- Increase timeout in workflow: `timeout-minutes: 15`

#### Invalid JSON Response

**Error:** `Failed to parse LLM response as JSON`

**Solution:**
- This is usually a transient issue - the action will retry automatically
- If persistent, try a different model
- Check LLM provider status page for outages
- Report issue with logs if it continues

#### Cost Higher Than Expected

**Issue:** API costs are higher than estimated

**Possible Causes:**
1. **Large PRs**: Many files or large diffs increase token usage
   - Solution: Set `max_files` to a lower value (e.g., 20)

2. **Expensive model**: Using GPT-4 or Claude Opus
   - Solution: Switch to GPT-3.5 Turbo or Claude Sonnet

3. **Low severity threshold**: Posting all suggestions increases output tokens
   - Solution: Set `severity_threshold: 'warning'` or `'critical'`

4. **Frequent re-runs**: Action runs on every commit
   - Solution: Configure to run only on `opened` PRs, not `synchronize`

### Debug Mode

Enable detailed logging by setting the `ACTIONS_STEP_DEBUG` secret to `true` in your repository:

1. Go to Settings → Secrets and variables → Actions
2. Add new secret: `ACTIONS_STEP_DEBUG` = `true`
3. Re-run the workflow to see detailed logs

### Getting Help

If you encounter issues not covered here:

1. Check the action logs in your workflow run for detailed error messages
2. Review the [GitHub Actions documentation](https://docs.github.com/en/actions)
3. Check your LLM provider's status page:
   - Anthropic: [status.anthropic.com](https://status.anthropic.com)
   - OpenAI: [status.openai.com](https://status.openai.com)
4. Open an issue in this repository with:
   - Workflow YAML configuration
   - Error message from logs
   - PR size and characteristics

## Development

### Setup

```bash
# Install dependencies
npm install

# Build the action
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

### Project Structure

```
.
├── src/
│   ├── index.ts              # Main entry point
│   ├── config-loader.ts      # Configuration parsing
│   ├── github-client.ts      # GitHub API wrapper
│   ├── diff-fetcher.ts       # PR diff fetching and parsing
│   ├── file-filter.ts        # File exclusion logic
│   ├── diff-chunker.ts       # Diff chunking for LLM context
│   ├── llm-client.ts         # LLM provider abstraction
│   ├── response-validator.ts # LLM response validation
│   ├── line-mapper.ts        # Line-to-position mapping
│   ├── deduplicator.ts       # Issue deduplication
│   ├── comment-poster.ts     # Review comment posting
│   ├── label-manager.ts      # PR label management
│   ├── logger.ts             # Logging utilities
│   ├── schemas.ts            # Zod validation schemas
│   ├── types.ts              # TypeScript interfaces
│   └── __tests__/            # Unit and property tests
├── action.yml                # Action metadata
└── dist/                     # Compiled JavaScript
```

### Testing

The project uses both unit tests and property-based tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run only unit tests
npm test -- --testPathPattern="\.test\.ts$"

# Run only property tests
npm test -- --testPathPattern="\.property\.test\.ts$"
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm run lint`
6. Commit your changes: `git commit -am 'Add feature'`
7. Push to the branch: `git push origin feature-name`
8. Submit a pull request

## License

MIT

## Acknowledgments

Built with:
- [@actions/core](https://github.com/actions/toolkit/tree/main/packages/core) - GitHub Actions toolkit
- [@actions/github](https://github.com/actions/toolkit/tree/main/packages/github) - GitHub API client
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) - Anthropic API client
- [openai](https://github.com/openai/openai-node) - OpenAI API client
- [zod](https://github.com/colinhacks/zod) - Schema validation
- [fast-check](https://github.com/dubzzz/fast-check) - Property-based testing
