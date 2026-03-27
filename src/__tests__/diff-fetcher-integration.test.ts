/**
 * Integration tests for Diff Fetcher with realistic diff examples
 */

import { DiffFetcher } from '../diff-fetcher';

describe('DiffFetcher Integration Tests', () => {
  let fetcher: DiffFetcher;

  beforeEach(() => {
    // Create fetcher without GitHub client for parsing-only tests
    fetcher = new DiffFetcher(null as any);
  });

  it('should parse a realistic TypeScript file modification', () => {
    const diff = `diff --git a/src/utils/validator.ts b/src/utils/validator.ts
index 1a2b3c4..5d6e7f8 100644
--- a/src/utils/validator.ts
+++ b/src/utils/validator.ts
@@ -10,7 +10,8 @@ export function validateEmail(email: string): boolean {
   if (!email || typeof email !== 'string') {
     return false;
   }
-  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
+  // Updated regex to be more strict
+  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
   return regex.test(email);
 }
 
@@ -25,6 +26,10 @@ export function validatePassword(password: string): boolean {
   if (password.length < 8) {
     return false;
   }
+  if (!/[A-Z]/.test(password)) {
+    return false;
+  }
+  // Check for at least one number
   return /\\d/.test(password);
 }`;

    const files = fetcher.parseUnifiedDiff(diff);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/utils/validator.ts');
    expect(files[0].status).toBe('modified');
    expect(files[0].hunks).toHaveLength(2);

    // First hunk - email validation change
    const hunk1 = files[0].hunks[0];
    expect(hunk1.oldStart).toBe(10);
    expect(hunk1.newStart).toBe(10);
    expect(hunk1.lines.length).toBeGreaterThan(0);

    // Verify position tracking is continuous
    let lastPosition = 0;
    for (const hunk of files[0].hunks) {
      for (const line of hunk.lines) {
        expect(line.position).toBeGreaterThan(lastPosition);
        lastPosition = line.position;
      }
    }
  });

  it('should correctly track line numbers across multiple hunks', () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts
index abc123..def456 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -5,7 +5,7 @@ import { Router } from 'express';
 const app = express();
 const port = 3000;
 
-app.use(express.json());
+app.use(express.json({ limit: '10mb' }));
 
 app.get('/', (req, res) => {
   res.send('Hello World!');
@@ -20,6 +20,11 @@ app.post('/api/data', (req, res) => {
   res.json({ success: true });
 });
 
+app.get('/api/health', (req, res) => {
+  res.json({ status: 'ok' });
+});
+
+// Start server
 app.listen(port, () => {
   console.log(\`Server running on port \${port}\`);
 });`;

    const files = fetcher.parseUnifiedDiff(diff);

    expect(files).toHaveLength(1);
    expect(files[0].hunks).toHaveLength(2);

    // Verify that positions are sequential across hunks
    const allLines = files[0].hunks.flatMap(h => h.lines);
    for (let i = 1; i < allLines.length; i++) {
      expect(allLines[i].position).toBe(allLines[i - 1].position + 1);
    }

    // Verify line numbers for added lines
    const addedLines = allLines.filter(l => l.type === 'add');
    expect(addedLines.length).toBeGreaterThan(0);
    addedLines.forEach(line => {
      expect(line.newLineNumber).toBeDefined();
      expect(line.oldLineNumber).toBeUndefined();
    });
  });

  it('should handle complex diff with additions, deletions, and context', () => {
    const diff = `diff --git a/src/config.ts b/src/config.ts
index 111222..333444 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,10 +1,12 @@
 export const config = {
-  apiUrl: 'http://localhost:3000',
+  apiUrl: process.env.API_URL || 'http://localhost:3000',
   timeout: 5000,
-  retries: 3,
+  retries: parseInt(process.env.MAX_RETRIES || '3', 10),
+  debug: process.env.NODE_ENV === 'development',
 };
 
-// TODO: Add more configuration options
+// Configuration loaded from environment variables
+// See .env.example for available options
 
 export function getConfig() {
   return config;`;

    const files = fetcher.parseUnifiedDiff(diff);

    expect(files).toHaveLength(1);
    const file = files[0];
    
    expect(file.additions).toBeGreaterThan(0);
    expect(file.deletions).toBeGreaterThan(0);
    expect(file.hunks).toHaveLength(1);

    const hunk = file.hunks[0];
    
    // Verify we have all three types of lines
    const hasAdd = hunk.lines.some(l => l.type === 'add');
    const hasDelete = hunk.lines.some(l => l.type === 'delete');
    const hasContext = hunk.lines.some(l => l.type === 'context');
    
    expect(hasAdd).toBe(true);
    expect(hasDelete).toBe(true);
    expect(hasContext).toBe(true);

    // Verify context lines have both old and new line numbers
    const contextLines = hunk.lines.filter(l => l.type === 'context');
    contextLines.forEach(line => {
      expect(line.oldLineNumber).toBeDefined();
      expect(line.newLineNumber).toBeDefined();
    });
  });
});
