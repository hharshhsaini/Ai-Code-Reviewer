# Release Checklist

Before releasing this action for public use, complete these steps:

## ✅ 1. dist/ Folder (CRITICAL - COMPLETED)
- [x] Removed `dist/` from `.gitignore`
- [x] Ran `npm run build`
- [x] Committed and pushed `dist/` folder
- [x] Verified dist/index.js exists in the repository

**Why this matters**: GitHub Actions runs the compiled JavaScript in `dist/`, not your TypeScript source. Without this, the action will fail for all users.

## ⚠️ 2. Repository Settings (MANUAL STEPS REQUIRED)

### Add Repository Description
1. Go to https://github.com/hharshhsaini/Ai-Code-Reviewer
2. Click the **⚙️ gear icon** next to "About" (top right of the page)
3. Fill in:
   - **Description**: `GitHub Action that reviews pull requests using Claude or GPT — finds bugs, security issues, and logic errors like a senior engineer.`
   - **Website** (optional): Leave blank or add your website
   - **Topics**: Add these tags (press Enter after each):
     - `github-actions`
     - `ai`
     - `code-review`
     - `llm`
     - `anthropic`
     - `openai`
     - `typescript`
     - `claude`
     - `gpt`
     - `automated-code-review`
4. Click **Save changes**

**Why this matters**: Topics help people discover your action through GitHub search. Without them, your repo is invisible.

### Enable Issues (if not already enabled)
1. Go to Settings → General
2. Scroll to "Features"
3. Check ✅ "Issues"

### Enable Discussions (optional but recommended)
1. Go to Settings → General
2. Scroll to "Features"
3. Check ✅ "Discussions"

## 📦 3. Create a Release

### Option A: Create v1.0.0 Release (Recommended)
1. Go to https://github.com/hharshhsaini/Ai-Code-Reviewer/releases
2. Click **"Create a new release"**
3. Click **"Choose a tag"** → Type `v1.0.0` → Click **"Create new tag: v1.0.0 on publish"**
4. **Release title**: `v1.0.0 - Initial Release`
5. **Description**: Copy this:

```markdown
# AI Code Reviewer v1.0.0

First stable release of the AI Code Reviewer GitHub Action! 🎉

## Features

- 🤖 Intelligent code review using Claude or GPT
- 🔍 Finds logic errors, security vulnerabilities, and performance issues
- 💬 Posts inline comments on specific lines
- 🏷️ Automatic severity labeling (critical, warning, suggestion)
- 📊 Handles large PRs with intelligent chunking
- 🎯 Smart file filtering (excludes lockfiles, generated files, etc.)
- ⚡ Cost control with configurable limits

## Quick Start

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
      - uses: hharshhsaini/Ai-Code-Reviewer@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Documentation

- [README](https://github.com/hharshhsaini/Ai-Code-Reviewer#readme) - Full documentation
- [Setup Guide](https://github.com/hharshhsaini/Ai-Code-Reviewer/blob/main/SETUP_GUIDE.md) - Step-by-step instructions
- [Example Workflows](https://github.com/hharshhsaini/Ai-Code-Reviewer/tree/main/.github/workflows) - Ready-to-use configurations

## Supported Models

**Anthropic**: Claude 3.5 Sonnet (recommended), Claude 3 Opus, Claude 3 Sonnet
**OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo

## What's Next

- v1.1.0: Custom review prompts
- v1.2.0: Support for more LLM providers
- v1.3.0: Review summary in PR description
```

6. Click **"Publish release"**

### Option B: Create v1 Tag (Simpler)
Users can reference `@v1` which will always point to the latest v1.x.x release:

```bash
git tag v1
git push origin v1
```

Then users can use:
```yaml
uses: hharshhsaini/Ai-Code-Reviewer@v1
```

## 🎯 4. Test the Action

Create a test repository and verify the action works:

1. Create a new test repo or use an existing one
2. Add the workflow file from the Quick Start above
3. Add your `ANTHROPIC_API_KEY` to repository secrets
4. Create a pull request with some code changes
5. Verify the action runs and posts comments

## 📢 5. Promote Your Action (Optional)

### GitHub Marketplace
1. Go to https://github.com/marketplace/actions
2. Click "Publish an action"
3. Follow the submission process

### Share on Social Media
- Twitter/X: "Just released an AI Code Reviewer GitHub Action that uses Claude/GPT to find bugs and security issues! 🚀"
- Reddit: r/github, r/programming, r/devops
- Dev.to: Write a blog post about building it
- Hacker News: Share your repo

### Add a Badge to README
Add this to the top of your README:

```markdown
[![GitHub release](https://img.shields.io/github/v/release/hharshhsaini/Ai-Code-Reviewer)](https://github.com/hharshhsaini/Ai-Code-Reviewer/releases)
[![GitHub stars](https://img.shields.io/github/stars/hharshhsaini/Ai-Code-Reviewer)](https://github.com/hharshhsaini/Ai-Code-Reviewer/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

## ✅ Final Checklist

Before announcing your action publicly:

- [x] dist/ folder is committed and pushed
- [ ] Repository description is set
- [ ] Topics/tags are added
- [ ] v1.0.0 release is created
- [ ] Action tested in a real repository
- [ ] README has clear usage instructions
- [ ] SETUP_GUIDE.md is complete
- [ ] Example workflows are provided
- [ ] Issues are enabled for bug reports
- [ ] License file exists (MIT)

## 🐛 Known Issues

None yet! If you find any, please open an issue.

## 📝 Notes

- Always run `npm run build` before committing changes to TypeScript files
- The `dist/` folder must be committed for the action to work
- Users can reference `@main` for latest changes or `@v1` for stable releases
- Consider semantic versioning for future releases (v1.1.0, v1.2.0, etc.)
