### Task 2: Metadata Indexer

**Files:**
- Create: `src/indexer.js`
- Create: `test/indexer.test.js`
- Create: `test/fixtures/test-project/test-report/index.html`
- Create: `test/fixtures/test-project/test-report/report.json`
- Create: `test/fixtures/test-project/no-meta-report/index.html`
- Create: `test/fixtures/empty/.gitkeep` (empty directory placeholder)

**Interfaces:**
- Exports: `function buildIndex(reportsDir)` → `Array<{project, slug, title, description, date, tags, htmlPath}>`
- Consumes: `reportsDir` path string
- Produces: sorted array (newest first by date, null date items last)

- [ ] **Step 1: Write failing test**

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { buildIndex } = require('../src/indexer');

describe('indexer', () => {
  it('builds index from reports directory', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const index = buildIndex(fixtures);
    const report = index.find(r => r.slug === 'test-report');

    assert(report);
    assert.strictEqual(report.project, 'test-project');
    assert.strictEqual(report.slug, 'test-report');
    assert.strictEqual(report.title, 'Test Report Title');
    assert.strictEqual(report.description, 'A test report description');
    assert.strictEqual(report.date, '2026-07-19');
    assert.deepStrictEqual(report.tags, ['test', 'fixture']);
  });

  it('returns empty array for empty directory', () => {
    const emptyDir = path.join(__dirname, 'fixtures', 'empty');
    const index = buildIndex(emptyDir);
    assert.deepStrictEqual(index, []);
  });

  it('handles report without report.json', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const index = buildIndex(fixtures);
    const report = index.find(r => r.slug === 'no-meta-report');
    assert(report);
    assert.strictEqual(report.title, 'no-meta-report');
    assert.strictEqual(report.description, '');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test test/indexer.test.js
# Expected: FAIL with "Cannot find module"
```

- [ ] **Step 3: Create test fixtures**

Create `test/fixtures/test-project/test-report/index.html`:
```html
<!DOCTYPE html>
<html><head><title>Test Report</title></head><body><h1>Test</h1></body></html>
```

Create `test/fixtures/test-project/test-report/report.json`:
```json
{
  "title": "Test Report Title",
  "description": "A test report description",
  "date": "2026-07-19",
  "tags": ["test", "fixture"]
}
```

Create `test/fixtures/test-project/no-meta-report/index.html`:
```html
<!DOCTYPE html><html><body><p>No meta</p></body></html>
```

Create `test/fixtures/empty/.gitkeep` (empty directory placeholder).

- [ ] **Step 4: Create src/indexer.js**

```javascript
const fs = require('fs');
const path = require('path');

function buildIndex(reportsDir) {
  const reports = [];

  let projects;
  try {
    projects = fs.readdirSync(reportsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const projectDir of projects) {
    if (!projectDir.isDirectory()) continue;
    const projectPath = path.join(reportsDir, projectDir.name);
    const slugs = fs.readdirSync(projectPath, { withFileTypes: true });

    for (const slugDir of slugs) {
      if (!slugDir.isDirectory()) continue;
      const slug = slugDir.name;
      const htmlPath = path.join(projectPath, slug, 'index.html');
      if (!fs.existsSync(htmlPath)) continue;

      const metaPath = path.join(projectPath, slug, 'report.json');
      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        } catch (err) {
          console.warn(`Failed to parse ${metaPath}: ${err.message}`);
        }
      }

      reports.push({
        project: projectDir.name,
        slug,
        title: meta.title || slug,
        description: meta.description || '',
        date: meta.date || null,
        tags: meta.tags || [],
        htmlPath,
      });
    }
  }

  reports.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  return reports;
}

module.exports = { buildIndex };
```

- [ ] **Step 5: Run test to verify it passes**

```bash
node --test test/indexer.test.js
# Expected: PASS
```

- [ ] **Step 6: Commit**

```bash
git add src/indexer.js test/indexer.test.js test/fixtures/
git commit -m "feat: add metadata indexer"
```
