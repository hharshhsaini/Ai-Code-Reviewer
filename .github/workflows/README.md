# Example Workflow Files

This directory contains example GitHub Actions workflow files for the AI Code Reviewer. Choose the configuration that best fits your needs and copy it to your repository.

## Available Examples

### 1. `ai-review-anthropic.yml` - Anthropic Claude (Recommended)

**Best for:** Most teams looking for high-quality reviews with good cost efficiency

**Features:**
- Uses Claude 3.5 Sonnet (recommended model)
- Default configuration with all options
- Balanced quality and cost

**Setup:**
1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add it to repository secrets as `ANTHROPIC_API_KEY`
3. Copy this workflow to your repository

**Estimated cost:** $0.05-0.20 per PR (50 PRs/month = $2.50-10.00)

---

### 2. `ai-review-openai.yml` - OpenAI GPT

**Best for:** Teams already using OpenAI or preferring GPT models

**Features:**
- Uses GPT-4 for high-quality reviews
- Includes alternative model suggestions (GPT-4 Turbo, GPT-3.5 Turbo)
- Default configuration with all options

**Setup:**
1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Add it to repository secrets as `OPENAI_API_KEY`
3. Copy this workflow to your repository

**Estimated cost:** $0.15-0.50 per PR with GPT-4 (50 PRs/month = $7.50-25.00)

---

### 3. `ai-review-custom-thresholds.yml` - Custom Configuration

**Best for:** Teams wanting to fine-tune the review behavior

**Features:**
- Custom file limit (30 files)
- Custom severity threshold (warnings and critical only)
- Reduces noise and focuses on important issues

**Setup:**
1. Get an API key from Anthropic or OpenAI
2. Add it to repository secrets
3. Copy this workflow and adjust thresholds to your needs

**Estimated cost:** $0.03-0.15 per PR (50 PRs/month = $1.50-7.50)

---

### 4. `ai-review-cost-conscious.yml` - Budget-Friendly

**Best for:** Teams with tight budgets or high PR volume

**Features:**
- Uses GPT-3.5 Turbo (most cost-effective model)
- Limited to 20 files per review
- Only posts critical issues
- Minimizes token usage

**Setup:**
1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Add it to repository secrets as `OPENAI_API_KEY`
3. Copy this workflow to your repository

**Estimated cost:** $0.005-0.03 per PR (50 PRs/month = $0.25-1.50)

---

### 5. `ai-review-comprehensive.yml` - Full Feedback

**Best for:** Teams wanting maximum feedback including suggestions

**Features:**
- Reviews up to 50 files
- Posts all findings (critical, warning, and suggestions)
- Most comprehensive feedback
- Higher token usage

**Setup:**
1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add it to repository secrets as `ANTHROPIC_API_KEY`
3. Copy this workflow to your repository

**Estimated cost:** $0.05-0.25 per PR (50 PRs/month = $2.50-12.50)

---

## Quick Start

1. **Choose a workflow** that matches your needs
2. **Copy the file** to your repository's `.github/workflows/` directory
3. **Get an API key** from your chosen provider:
   - Anthropic: [console.anthropic.com](https://console.anthropic.com)
   - OpenAI: [platform.openai.com](https://platform.openai.com)
4. **Add the API key** to your repository secrets:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
   - Value: Your API key
5. **Open a pull request** to test the action

## Configuration Options

All workflows support these configuration options:

| Option | Description | Default | Values |
|--------|-------------|---------|--------|
| `github_token` | GitHub API token (required) | - | `${{ secrets.GITHUB_TOKEN }}` |
| `anthropic_api_key` | Anthropic API key | - | Your API key |
| `openai_api_key` | OpenAI API key | - | Your API key |
| `model` | LLM model to use | `claude-3-5-sonnet-20241022` | See models below |
| `max_files` | Maximum files to review | `50` | Any positive number |
| `severity_threshold` | Minimum severity to post | `suggestion` | `critical`, `warning`, `suggestion` |

### Supported Models

**Anthropic:**
- `claude-3-5-sonnet-20241022` (recommended)
- `claude-3-opus-20240229` (highest quality)
- `claude-3-sonnet-20240229` (budget-friendly)

**OpenAI:**
- `gpt-4` (high quality)
- `gpt-4-turbo` (large PRs)
- `gpt-3.5-turbo` (budget-friendly)

## Customization Tips

### Adjust File Limit

```yaml
max_files: 20  # Review fewer files to reduce costs
```

### Change Severity Threshold

```yaml
severity_threshold: 'warning'  # Only post warnings and critical issues
```

### Use Different Models

```yaml
# For budget-conscious reviews
model: 'gpt-3.5-turbo'

# For highest quality reviews
model: 'claude-3-opus-20240229'
```

### Run Only on Specific Branches

```yaml
on:
  pull_request:
    types: [opened, synchronize]
    branches:
      - main
      - develop
```

### Run Only on Opened PRs (Not Updates)

```yaml
on:
  pull_request:
    types: [opened]  # Remove 'synchronize' to run only once
```

## Troubleshooting

### Action Not Running

- Check that the workflow file is in `.github/workflows/`
- Verify GitHub Actions is enabled in repository settings
- Ensure the workflow has correct YAML syntax

### No Comments Posted

- Check action logs for errors
- Verify API key is correctly set in repository secrets
- Ensure workflow has `pull-requests: write` permission
- Check if severity threshold filtered all issues

### High Costs

- Reduce `max_files` to review fewer files
- Increase `severity_threshold` to post fewer comments
- Switch to a cheaper model (GPT-3.5 Turbo or Claude Sonnet)
- Run only on `opened` events, not `synchronize`

## More Information

For detailed documentation, see the main [README.md](../../README.md) in the repository root.
