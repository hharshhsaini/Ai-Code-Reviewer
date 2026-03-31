# Testing AI Code Reviewer with Ollama

This guide explains how to test the AI Code Reviewer locally using Ollama, which is completely free and runs on your machine.

## Prerequisites

1. **Install Ollama** (if not already installed):
   ```bash
   # macOS
   brew install ollama
   
   # Or download from https://ollama.ai
   ```

2. **Start Ollama Server**:
   ```bash
   ollama serve
   ```
   
   This will start the Ollama server on `http://localhost:11434`

3. **Pull a Model**:
   ```bash
   # Recommended models for code review:
   ollama pull qwen2.5-coder:7b    # Best for code (7GB)
   ollama pull llama3.2:3b         # Smaller, faster (2GB)
   ollama pull deepseek-coder:6.7b # Good for code (4GB)
   ```

## Testing Locally

### Option 1: Create a Test Script

Create a file `test-ollama.js`:

```javascript
const { OllamaClient } = require('./dist/llm-client');

async function test() {
  const client = new OllamaClient('http://localhost:11434', 'qwen2.5-coder:7b');
  
  const testChunk = {
    files: [{
      path: 'test.js',
      status: 'modified',
      additions: 5,
      deletions: 2,
      patch: `@@ -1,3 +1,6 @@
 function calculateTotal(items) {
-  return items.reduce((sum, item) => sum + item.price, 0);
+  let total = 0;
+  for (let item of items) {
+    total = total + item.price;
+  }
+  return total;
 }`,
      hunks: []
    }],
    estimatedTokens: 500,
    metadata: {
      chunkIndex: 0,
      totalChunks: 1
    }
  };
  
  console.log('Testing Ollama client...');
  try {
    const response = await client.review(testChunk);
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
```

Run it:
```bash
npm run build
node test-ollama.js
```

### Option 2: Use in GitHub Actions Workflow

Create `.github/workflows/ai-review-ollama.yml`:

```yaml
name: AI Code Review (Ollama)
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    
    services:
      ollama:
        image: ollama/ollama:latest
        ports:
          - 11434:11434
    
    steps:
      - name: Pull Ollama Model
        run: |
          docker exec ${{ job.services.ollama.id }} ollama pull qwen2.5-coder:7b
      
      - name: AI Code Review
        uses: ./
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          ollama_base_url: 'http://localhost:11434'
          model: 'qwen2.5-coder:7b'
          max_files: 20
```

### Option 3: Test with Self-Hosted Runner

If you have a self-hosted GitHub Actions runner with Ollama installed:

```yaml
name: AI Code Review (Self-Hosted Ollama)
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: self-hosted
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

## Recommended Models for Code Review

| Model | Size | Best For | Context Window |
|-------|------|----------|----------------|
| `qwen2.5-coder:7b` | 7GB | Code review, best quality | 32K tokens |
| `deepseek-coder:6.7b` | 4GB | Code understanding | 16K tokens |
| `llama3.2:3b` | 2GB | Fast reviews, smaller PRs | 8K tokens |
| `codellama:7b` | 4GB | Code-specific tasks | 16K tokens |

## Troubleshooting

### Ollama Server Not Running
```bash
# Start Ollama server
ollama serve

# Or on macOS, start as a service
brew services start ollama
```

### Connection Refused
Make sure Ollama is running and accessible:
```bash
curl http://localhost:11434/api/tags
```

### Model Not Found
Pull the model first:
```bash
ollama pull qwen2.5-coder:7b
```

### Slow Performance
- Use a smaller model like `llama3.2:3b`
- Reduce `max_files` in the workflow
- Ensure your machine has enough RAM (8GB+ recommended)

## Benefits of Using Ollama

1. **Free**: No API costs
2. **Private**: Code never leaves your machine
3. **Fast**: No network latency for local models
4. **Offline**: Works without internet connection
5. **Customizable**: Use any Ollama-compatible model

## Limitations

- Requires local compute resources (CPU/GPU)
- Models are smaller than Claude/GPT-4, may miss some issues
- Slower than cloud APIs on CPU-only machines
- Requires model download (several GB)
