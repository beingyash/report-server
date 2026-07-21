# Task 3: Update commitAndPush to include index.html

**Files:**
- Modify: `scripts/generate-status-report.js` line 250

## Requirements

Change line 250 from:
```js
const paths = projects.map(p => `reports/${p}/status/`);
```
to:
```js
const paths = [...projects.map(p => `reports/${p}/status/`), 'index.html'];
```

This ensures the generated root `index.html` is added to git and committed alongside the per-project status pages.

## Verification

Run: `node scripts/generate-status-report.js`

Expected: generates all reports, adds index.html to git, commits, pushes. No errors.
