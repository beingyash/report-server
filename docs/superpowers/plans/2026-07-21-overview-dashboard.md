# Overview Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace root `/` of reports.yash.abysmallab.in with a global status dashboard grid.

**Architecture:** Extend `generate-status-report.js` to produce a root `index.html` alongside per-project status pages. No runtime changes — the app already serves static files from repo root via `express.static()`.

**Tech Stack:** Node.js, vanilla JS/HTML/CSS (generator script), design tokens from ui-design skill.

## Global Constraints

- All CSS uses design tokens defined in the spec (colors `#0f1115`, `#181b21`, `#e6e8eb`, etc.)
- Root `/` must be served from repo root `index.html` (not `/reports/...`)
- Old reports listing moves to `/reports` (no router change — just path convention)

---

### Task 1: Add `generateRootIndex()` function

**Files:**
- Modify: `scripts/generate-status-report.js` (append before module.exports)

**Interfaces:**
- Consumes: `REPO_DIR` (already exists), project metadata array `{project, good, bad, pending, date, title}`
- Produces: `generateRootIndex(repoDir, projectsData)` — writes `<repoDir>/index.html`

- [ ] **Write `generateRootIndex` function body**

```js
function generateRootIndex(repoDir, projectsData) {
  const totalGood = projectsData.reduce((s, p) => s + p.good, 0);
  const totalBad = projectsData.reduce((s, p) => s + p.bad, 0);
  const totalPending = projectsData.reduce((s, p) => s + p.pending, 0);
  const count = projectsData.length;
  const latestDate = projectsData.map(p => p.date).sort().reverse()[0] || '';

  const cardsHtml = projectsData.map(p => {
    const borderColor = p.bad > 0 ? '#e5484d' : p.pending > 0 ? '#5b8def' : '#30a46c';
    const color = p.bad > 0 ? '#e5484d' : '#30a46c';
    const countColor = p.bad > 0 ? '#e5484d' : '#5b8def';
    return `<a href="/${p.project}/status/" class="card" style="border-left-color: ${borderColor}; text-decoration: none; color: inherit;">
      <h2>${escape(p.project)}</h2>
      <p class="meta">Last updated ${p.date}</p>
      <div class="status-row">
        ${p.good > 0 ? `<span class="badge badge-good">${p.good} OK</span>` : ''}
        ${p.bad > 0 ? `<span class="badge badge-bad">${p.bad} Issue${p.bad > 1 ? 's' : ''}</span>` : ''}
        ${p.pending > 0 ? `<span class="badge badge-pending">${p.pending} Pending</span>` : ''}
      </div>
    </a>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Infra Status</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f1115; color: #e6e8eb; min-height: 100vh; }
  .container { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
  header { margin-bottom: 2rem; }
  header h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  .subtitle { color: #9aa0a8; font-size: 0.875rem; }
  .summary-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
  .badge { padding: 0.25em 0.7em; border-radius: 14px; font-size: 0.78rem; font-weight: 600; line-height: 1.4; display: inline-block; }
  .badge-good { background: #30a46c22; color: #30a46c; border: 1px solid #30a46c44; }
  .badge-bad { background: #e5484d22; color: #e5484d; border: 1px solid #e5484d44; }
  .badge-pending { background: #5b8def22; color: #5b8def; border: 1px solid #5b8def44; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
  .card { background: #181b21; border-radius: 10px; padding: 1.25rem 1.5rem; border-left: 4px solid #2a2f37; box-shadow: 0 1px 2px rgba(0,0,0,.4); transition: box-shadow 0.15s, transform 0.15s; }
  .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.35); transform: translateY(-2px); }
  .card h2 { font-size: 1.05rem; color: #e6e8eb; margin-bottom: 0.3rem; }
  .meta { color: #9aa0a8; font-size: 0.82rem; margin-bottom: 0.75rem; }
  .status-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .empty { color: #9aa0a8; text-align: center; padding: 3rem; }
  .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #2a2f37; text-align: center; }
  .footer a { color: #5b8def; text-decoration: none; font-size: 0.875rem; }
  .footer a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Infra Status</h1>
    <p class="subtitle">${count} project${count > 1 ? 's' : ''} — updated ${latestDate}</p>
    <div class="summary-row">
      ${totalGood > 0 ? `<span class="badge badge-good">${totalGood} OK</span>` : ''}
      ${totalBad > 0 ? `<span class="badge badge-bad">${totalBad} Issue${totalBad > 1 ? 's' : ''}</span>` : ''}
      ${totalPending > 0 ? `<span class="badge badge-pending">${totalPending} Pending</span>` : ''}
    </div>
  </header>
  ${projectsData.length > 0
    ? `<div class="grid">${cardsHtml}</div>`
    : '<p class="empty">No projects with STATE.md found.</p>'}
  <div class="footer">
    <a href="/reports/">View reports listing &raquo;</a>
  </div>
</div>
</body>
</html>`;

  fs.writeFileSync(path.join(repoDir, 'index.html'), html);
}
```

- [ ] **Verify syntax**

Run: `node -e "require('./scripts/generate-status-report')"`

Expected: no errors (the module loads, even though the function isn't called yet).

---

### Task 2: Wire `generateRootIndex` into `generateAll`

**Files:**
- Modify: `scripts/generate-status-report.js:195-240`

**Interfaces:**
- Consumes: `generateRootIndex` from Task 1
- Produces: `generateAll()` now writes `<repoDir>/index.html` after per-project pages

- [ ] **Collect project metadata in the generation loop**

In `generateAll()`, replace the `generated` variable with an array of metadata objects:

```js
const projectsData = [];

for (const project of projects) {
  // ... existing per-project generation code ...
  
  projectsData.push({ project, good: goodCount, bad: badCount, pending: pendingCount, date: reportMeta.date, title: reportMeta.title });
}
```

- [ ] **Call `generateRootIndex` after the loop**

After the loop ends, before the `skipGit` check:

```js
generateRootIndex(repoDir, projectsData);
```

- [ ] **Verify it runs cleanly**

Run: `node scripts/generate-status-report.js`

Expected: generates per-project status + root `index.html`. No errors.

---

### Task 3: Update `commitAndPush` to include root `index.html`

**Files:**
- Modify: `scripts/generate-status-report.js:242-266`

- [ ] **Add `index.html` to the git add paths**

```js
const paths = [...projects.map(p => `reports/${p}/status/`), 'index.html'];
```

- [ ] **Verify commit + push**

Run: `node scripts/generate-status-report.js`

Expected: reports generated, committed, pushed. Check `git status` is clean.

---

### Task 4: Regenerate stale STATE.md files and verify live

**Files:**
- Modify: `C:\home\projects\report-server\STATE.md` (already identified)
- Modify: `C:\home\projects\kubernetes-deploy\STATE.md` (optional — fix "error" text in Flux section)

- [ ] **Update report-server STATE.md**

Set to:
```markdown
# Report Server — Project State

Update at end of every session. Verified 2026-07-21.

## Deployed
- **Chart:** v0.1.3 deployed at `reports.yash.abysmallab.in`
- **App image:** `beingyash/report-server:v0.1.1`
- **Sidecar:** `git-sync:v4.2.1`
- **TLS:** Let's Encrypt cert issued (DNS-01 via Cloudflare), HTTPS 200 ✓
- **Helm status:** deployed, revision 4
- **Flux GitRepository:** Ready ✓
- **Flux HelmRelease:** Ready ✓

## New in v0.1.3
- Global status dashboard at root `/` replaces old reports listing
- Old reports listing moved to `/reports`
- Design tokens: dark theme, card grid, responsive layout

## Known Issues
- (none)

## Next
1. Verify overview dashboard renders correctly
```

- [ ] **Regenerate status reports**

Run: `node C:\home\projects\report-server\scripts\generate-status-report.js`

Expected: clean run, all reports generated, committed, pushed.

- [ ] **Verify deployed site**

Check `https://reports.yash.abysmallab.in/` shows the new dashboard.
