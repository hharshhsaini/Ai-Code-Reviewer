# Setup Guide for AI Code Reviewer

This guide will help you set up the AI Code Reviewer GitHub Action in your repository.

## For Users: Using This Action in Your Repository

### Step 1: Get an API Key

Choose one provider (Anthropic recommended for best results):

#### Option A: Anthropic Claude (Recommended)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create Key"
5. Copy your API key (starts with `sk-ant-`)

#### Option B: OpenAI GPT
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy your API key (starts with `sk-`)

### Step 2: Add API Key to Your Repository

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Fill in:
   - **Name**: `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY` if using OpenAI)
   - **Secret**: Paste your API key
6. Click **Add secret**

### Step 3: Create Workflow File

1. In your repository, create a new file: `.github/workflows/ai-review.yml`
2. Copy and paste this content:

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

3. **Important**: The action path is already set to `hharshhsaini/Ai-Code-Reviewer@main`
   - You can also use a specific version tag once releases are created: `hharshhsaini/Ai-Code-Reviewer@v1`

4. If using OpenAI, change:
   ```yaml
   anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
   model: 'claude-3-5-sonnet-20241022'
   ```
   to:
   ```yaml
   openai_api_key: ${{ secrets.OPENAI_API_KEY }}
   model: 'gpt-4'
   ```

### Step 4: Commit and Push

```bash
git add .github/workflows/ai-review.yml
git commit -m "Add AI Code Reviewer workflow"
git push
```

### Step 5: Test the Action

1. Create a new branch:
   ```bash
   git checkout -b test-ai-review
   ```

2. Make a code change (add or modify a file)

3. Commit and push:
   ```bash
   git add .
   git commit -m "Test AI review"
   git push origin test-ai-review
   ```

4. Go to GitHub and create a pull request from `test-ai-review` to your main branch

5. Wait a few moments - the AI Code Reviewer will:
   - Analyze your code changes
   - Post inline comments on issues it finds
   - Add severity labels to the PR

6. Check the **Actions** tab to see the workflow execution logs

### Step 6: View Results

- **Inline Comments**: Go to the PR's "Files changed" tab to see comments on specific lines
- **Labels**: Check the PR labels (e.g., "ai-review: warning")
- **Logs**: Click the Actions tab → AI Code Review workflow to see detailed logs

## For Developers: Setting Up This Repository

If you want to contribute to this action or run it from your own fork:

### Step 1: Fork and Clone

1. Fork this repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/ai-code-reviewer.git
   cd ai-code-reviewer
   ```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Make Changes

Edit the TypeScript files in the `src/` directory as needed.

### Step 4: Build the Action

**This is critical!** GitHub Actions runs the compiled JavaScript, not TypeScript:

```bash
npm run build
```

This creates/updates the `dist/` folder with compiled JavaScript.

### Step 5: Run Tests

```bash
npm test
```

Make sure all tests pass before committing.

### Step 6: Commit Everything

**Important**: You must commit the `dist/` folder:

```bash
git add src/ dist/ package.json package-lock.json
git commit -m "Your changes"
git push
```

### Step 7: Create a Release (Optional)

For versioned releases:

1. Go to your repository on GitHub
2. Click **Releases** → **Create a new release**
3. Tag version: `v1.0.0`
4. Release title: `v1.0.0`
5. Click **Publish release**

Now users can reference your action with:
```yaml
uses: YOUR-USERNAME/ai-code-reviewer@v1.0.0
```

## Configuration Options

### Basic Configuration

```yaml
- uses: hharshhsaini/Ai-Code-Reviewer@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### All Available Options

```yaml
- uses: hharshhsaini/Ai-Code-Reviewer@main
  with:
    # Required
    github_token: ${{ secrets.GITHUB_TOKEN }}
    
    # Required: One of these
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    # OR
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    
    # Optional
    model: 'claude-3-5-sonnet-20241022'  # Default
    max_files: 50                         # Default: 50
    severity_threshold: 'suggestion'      # Default: suggestion (options: critical, warning, suggestion)
```

### Recommended Configurations

#### For Small Teams (Budget-Conscious)
```yaml
model: 'gpt-3.5-turbo'
max_files: 20
severity_threshold: 'warning'
```
**Cost**: ~$0.01 per PR

#### For Medium Teams (Balanced)
```yaml
model: 'claude-3-5-sonnet-20241022'
max_files: 30
severity_threshold: 'warning'
```
**Cost**: ~$0.05-0.10 per PR

#### For Large Teams (Comprehensive)
```yaml
model: 'claude-3-5-sonnet-20241022'
max_files: 50
severity_threshold: 'suggestion'
```
**Cost**: ~$0.10-0.20 per PR

## Troubleshooting

### Action Not Running

**Problem**: Workflow doesn't trigger on pull requests

**Solutions**:
1. Check that the workflow file is in `.github/workflows/` directory
2. Verify GitHub Actions is enabled: Settings → Actions → General
3. Check workflow syntax with [GitHub Actions validator](https://rhysd.github.io/actionlint/)

### Authentication Errors

**Problem**: `Invalid API key` or `Authentication failed`

**Solutions**:
1. Verify the secret name matches exactly (case-sensitive)
2. Check for extra spaces or newlines in the secret value
3. Regenerate the API key and update the secret
4. Ensure you have billing set up with the provider

### No Comments Posted

**Problem**: Action runs successfully but no comments appear

**Solutions**:
1. Check the Actions logs for "No issues found" - this is normal for clean code
2. Lower `severity_threshold` to `suggestion` to see all findings
3. Verify workflow has `pull-requests: write` permission
4. Check that the PR has actual code changes (not just README updates)

### Permission Denied

**Problem**: `Resource not accessible by integration`

**Solution**: Add permissions to your workflow:
```yaml
jobs:
  review:
    permissions:
      contents: read
      pull-requests: write
```

### High Costs

**Problem**: API costs are higher than expected

**Solutions**:
1. Reduce `max_files` to 20 or 30
2. Set `severity_threshold: 'warning'` to reduce output
3. Use a cheaper model like `gpt-3.5-turbo`
4. Only run on `opened` PRs, not `synchronize`:
   ```yaml
   on:
     pull_request:
       types: [opened]  # Remove 'synchronize'
   ```

## Getting Help

If you encounter issues:

1. **Check the logs**: Go to Actions tab → Click the failed workflow → View logs
2. **Search existing issues**: Check the repository's Issues tab
3. **Open a new issue**: Include:
   - Your workflow YAML
   - Error message from logs
   - Steps to reproduce

## Next Steps

- Read the [README.md](README.md) for detailed documentation
- Check [.github/workflows/](.github/workflows/) for example configurations
- Review [Cost Estimation](README.md#cost-estimation) to optimize your setup
- Join discussions in the Issues tab
