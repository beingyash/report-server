# Report Publisher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automate publishing OpenCode-generated HTML reports to report-server with a single script + skill.

**Architecture:** Node.js script (`scripts/publish.js`) copies HTML, generates `report.json`, commits + pushes to report-server repo. Exports a `publish` function for testing. OpenCode skill auto-triggers the script after report generation.

**Tech Stack:** Node.js 20 (stdlib only), OpenCode skills

## Global Constraints

- Script lives in report-server repo at `scripts/publish.js`
- Skill lives at `~/.config/opencode/skills/report-publisher/SKILL.md`
- No new npm dependencies
- Tests use Node `--test` runner
- `project` = basename of CWD
- `slug` = ≤3 hyphen-separated kebab-case words, derived from title
- `report.json` fields: title, project, date (ISO)

---

## File Structure

- `scripts/publish.js` — new, Node.js script (exports `publish()` + CLI)
- `test/publish.test.js` — new, tests for publish logic
- `~/.config/opencode/skills/report-publisher/SKILL.md` — new, OpenCode skill

---

### Task 1: scripts/publish.js — core logic + CLI

**Files:**
- Create: `scripts/publish.js`
- Create: `test/publish.test.js`
- Modify: `.gitignore` — add `reports/` (since reports are now published via script, only committed data should be tracked... actually no, reports SHOULD be tracked)

Wait, let me reconsider. Reports should be tracked since git-sync needs them. `.gitignore` stays as-is.

**Interfaces:**
- Exports: `async function publish(opts)` where `opts.htmlPath`, `opts.title?`, `opts.slug?`, `opts.project?`, `opts.repoPath?`
- Returns: `{ project, slug, url, commitSha }`
- CLI: `node scripts/publish.js <html-path> [--title "..." --slug "..." --project "..." --repo-path "..."]`

- [ ] **Step 1: Create scripts/ directory and write the script**

```js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .split('-')
    .slice(0, 3)
    .join('-');
}

function findAvailableDir(baseDir, slug) {
  let dir = path.join(baseDir, slug);
  if (!fs.existsSync(dir)) return dir;
  for (let i = 1; i < 100; i++) {
    dir = path.join(baseDir, `${slug}-${i}`);
    if (!fs.existsSync(dir)) return dir;
  }
  throw new Error(`Cannot find available slug after 99 attempts for: ${slug}`);
}

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf-8');
  const match = content.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : path.basename(htmlPath, '.html');
}

function detectProject(cwd) {
  return path.basename(path.resolve(cwd));
}

function git(...args) {
  return execSync(`git ${args.join(' ')}`, { encoding: 'utf-8', stdio: 'pipe' });
}

function gitInRepo(repoPath, ...args) {
  return execSync(`git -C "${repoPath}" ${args.join(' ')}`, { encoding: 'utf-8', stdio: 'pipe' });
}

async function publish(opts) {
  const htmlPath = path.resolve(opts.htmlPath);
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTML file not found: ${htmlPath}`);
  }

  const repoPath = opts.repoPath
    ? path.resolve(opts.repoPath)
    : path.resolve(process.cwd(), '..', 'report-server');

  const project = opts.project || detectProject(process.cwd());
  const title = opts.title || extractTitle(htmlPath);
  const slug = opts.slug || slugify(title);
  const reportsDir = path.join(repoPath, 'reports', project);
  const reportDir = findAvailableDir(reportsDir, slug);
  const finalSlug = path.basename(reportDir);

  fs.mkdirSync(reportDir, { recursive: true });

  const destHtml = path.join(reportDir, 'index.html');
  fs.copyFileSync(htmlPath, destHtml);

  const reportMeta = {
    title,
    project,
    date: new Date().toISOString().split('T')[0],
  };
  fs.writeFileSync(
    path.join(reportDir, 'report.json'),
    JSON.stringify(reportMeta, null, 2) + '\n'
  );

  let commitSha = null;
  try {
    gitInRepo(repoPath, 'add', `reports/${project}/${finalSlug}/`);
    const msg = `report(${project}): ${finalSlug}`;
    gitInRepo(repoPath, 'commit', '-m', msg);
    commitSha = gitInRepo(repoPath, 'rev-parse', 'HEAD').trim();
    try {
      gitInRepo(repoPath, 'push');
    } catch (pushErr) {
      console.error(`Push failed (report written locally): ${pushErr.message}`);
      console.error(`Retry: cd "${repoPath}" && git push`);
    }
  } catch (commitErr) {
    console.error(`Commit failed (report written locally): ${commitErr.message}`);
  }

  const host = 'https://reports.yash.abysmallab.in';
  const url = `${host}/${project}/${finalSlug}/`;

  return { project, slug: finalSlug, url, commitSha };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const htmlPath = args.find(a => !a.startsWith('--'));
  const title = parseArg(args, '--title');
  const slug = parseArg(args, '--slug');
  const project = parseArg(args, '--project');
  const repoPath = parseArg(args, '--repo-path');

  if (!htmlPath) {
    console.error('Usage: node scripts/publish.js <html-path> [--title "..." --slug "..." --project "..." --repo-path "..."]');
    process.exit(1);
  }

  function parseArg(args, key) {
    const idx = args.indexOf(key);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return undefined;
  }

  publish({ htmlPath, title, slug, project, repoPath })
    .then(result => {
      console.log(`Published: ${result.url}`);
      if (result.commitSha) {
        console.log(`Commit: ${result.commitSha}`);
      }
    })
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = { publish, slugify, extractTitle, detectProject, findAvailableDir };
```

- [ ] **Step 2: Write tests**

```js
const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { slugify, extractTitle, detectProject, findAvailableDir } = require('../scripts/publish');

describe('slugify', () => {
  it('truncates to 3 hyphen-separated words', () => {
    assert.strictEqual(slugify('K8s Upgrade Audit Report'), 'k8s-upgrade-audit');
  });

  it('handles special characters', () => {
    assert.strictEqual(slugify('Hello World! Test?'), 'hello-world-test');
  });

  it('handles single word', () => {
    assert.strictEqual(slugify('Hello'), 'hello');
  });
});

describe('extractTitle', () => {
  it('extracts from html title tag', () => {
    const tmp = path.join(os.tmpdir(), 'test-extract-title.html');
    fs.writeFileSync(tmp, '<html><head><title>My Test Report</title></head><body>Hello</body></html>');
    assert.strictEqual(extractTitle(tmp), 'My Test Report');
    fs.unlinkSync(tmp);
  });

  it('falls back to filename when no title tag', () => {
    const tmp = path.join(os.tmpdir(), 'my-report.html');
    fs.writeFileSync(tmp, '<html><body>Hello</body></html>');
    assert.strictEqual(extractTitle(tmp), 'my-report');
    fs.unlinkSync(tmp);
  });
});

describe('detectProject', () => {
  it('returns basename of cwd', () => {
    const result = detectProject(path.join('home', 'projects', 'jane'));
    assert.strictEqual(result, 'jane');
  });
});

describe('findAvailableDir', () => {
  it('returns slug when dir does not exist', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-test-'));
    const result = findAvailableDir(tmp, 'my-slug');
    assert.strictEqual(result, path.join(tmp, 'my-slug'));
    fs.rmdirSync(tmp, { recursive: true });
  });

  it('increments suffix on collision', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-test-'));
    fs.mkdirSync(path.join(tmp, 'my-slug'));
    const result = findAvailableDir(tmp, 'my-slug');
    assert.strictEqual(result, path.join(tmp, 'my-slug-1'));
    fs.rmSync(tmp, { recursive: true });
  });
});
```

- [ ] **Step 3: Run lint**

```powershell
cd report-server
node_modules/.bin/eslint scripts/publish.js test/publish.test.js
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```powershell
cd report-server
node --test test/publish.test.js
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add scripts/publish.js test/publish.test.js
git commit -m "feat: add publish script for automated report deployment"
```

---

### Task 2: report-publisher OpenCode skill

**Files:**
- Create: `~/.config/opencode/skills/report-publisher/SKILL.md`

**Interfaces:**
- Consumes: Task 1's `scripts/publish.js`
- Triggers on: report generation keywords

- [ ] **Step 1: Create skill directory and write SKILL.md**

```markdown
# Report Publisher

Auto-publish HTML reports to reports.yash.abysmallab.in.

## Trigger

Use when task involves: "generate report", "publish report", "save report",
"create report", "make a report".

## Workflow

1. Generate HTML report content
2. Run: `node C:\home\projects\report-server\scripts\publish.js <path-to-html> --title "Report Title"`
   - Omit `--slug` to auto-derive from title (≤3 hyphen-words)
   - Omit `--project` to auto-detect from repo dir name
3. Confirm output URL matches `reports.yash.abysmallab.in/{project}/{slug}`
```

- [ ] **Step 2: Verify skill is discoverable**

Check that the skill appears in OpenCode's skill list on next session. No code change needed — OpenCode auto-discovers skills from `~/.config/opencode/skills/`.

- [ ] **Step 3: Commit** (if in a repo that tracks skills)

```powershell
git add -A
git commit -m "feat: add report-publisher opencode skill"
```
