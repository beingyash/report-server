# Task 1: Add generateRootIndex() function

**Files:**
- Modify: `scripts/generate-status-report.js` (append before module.exports)

**Context:** This is the first task of adding a global status dashboard to report-server. The generator script already produces per-project status pages. This task adds a function that generates a root `index.html` dashboard.

## Requirements

Add a function `generateRootIndex(repoDir, projectsData)` that writes an `index.html` dashboard to the repo root.

### Parameters

- `repoDir` (string): path to the report-server repo directory
- `projectsData` (array of objects): each object has:
  - `project` (string): project name
  - `good` (number): count of good items
  - `bad` (number): count of bad items
  - `pending` (number): count of pending items
  - `date` (string): date string like "2026-07-21"

### Behavior

1. Compute totals from projectsData (totalGood, totalBad, totalPending, count, latestDate)
2. Generate an HTML dashboard with:
   - Title: "Infra Status"
   - Summary: project count + latest date + total badges
   - Grid of project cards, each with:
     - Project name as link to `/<project>/status/`
     - Last-updated date
     - Status badges (OK / Issue(s) / Pending) as colored pills
     - Left border color: `#e5484d` (bad>0), `#5b8def` (pending>0, bad=0), `#30a46c` (good only)
   - Empty state when projectsData is empty
   - Footer link to `/reports/`
3. Write to `path.join(repoDir, 'index.html')`

### CSS / Design Tokens

Dark theme. Exact colors:
- Background: `#0f1115`
- Card surface: `#181b21`
- Text: `#e6e8eb`
- Muted text: `#9aa0a8`
- Border: `#2a2f37`
- Brand: `#5b8def`
- Danger: `#e5484d`
- Success: `#30a46c`
- Shadow: `0 1px 2px rgba(0,0,0,.4)` (default), `0 4px 12px rgba(0,0,0,.35)` (hover)
- Border radius: `10px`
- Font: `system-ui, -apple-system, sans-serif`
- Grid: `repeat(auto-fill, minmax(280px, 1fr))` gap `1rem`
- Max content width: `1200px`

Card hover: `translateY(-2px)` + shadow transition.

Cards use `text-decoration: none; color: inherit;` on the `<a>` tag so clickable area is entire card.

### Complete code

```js
function generateRootIndex(repoDir, projectsData) {
  const totalGood = projectsData.reduce((s, p) => s + p.good, 0);
  const totalBad = projectsData.reduce((s, p) => s + p.bad, 0);
  const totalPending = projectsData.reduce((s, p) => s + p.pending, 0);
  const count = projectsData.length;
  const latestDate = projectsData.map(p => p.date).sort().reverse()[0] || '';

  const cardsHtml = projectsData.map(p => {
    const borderColor = p.bad > 0 ? '#e5484d' : p.pending > 0 ? '#5b8def' : '#30a46c';
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

## Verification

1. Run `node -e "require('./scripts/generate-status-report')"` — should load without errors (function just needs to parse, not be called)
