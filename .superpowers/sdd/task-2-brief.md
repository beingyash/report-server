# Task 2: Wire generateRootIndex into generateAll

**Files:**
- Modify: `scripts/generate-status-report.js` (around lines 195-240)

**Context:** Task 1 added the `generateRootIndex` function. Now we need to call it from `generateAll()`.

## Requirements

### 1. Replace `generated` variable with `projectsData`

In `generateAll()`, replace the simple `generated` array (`.push(project)`) with a richer `projectsData` array that collects metadata for the root index.

**Current code (around line 199-232):**
```js
const projects = listProjects(projectsDir);
const generated = [];

for (const project of projects) {
  const stateMd = readStateMd(projectsDir, project);
  if (!stateMd) continue;

  const reportDir = path.join(repoDir, 'reports', project, 'status');
  fs.mkdirSync(reportDir, { recursive: true });

  const html = generateStatusHtml(project, stateMd);
  fs.writeFileSync(path.join(reportDir, 'index.html'), html);

  // Count health
  let goodCount = 0, badCount = 0, pendingCount = 0;
  // ... counting logic ...

  const reportMeta = {
    title: `${project} Status`,
    project,
    date: new Date().toISOString().split('T')[0],
    status: { good: goodCount, bad: badCount, pending: pendingCount },
  };
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(reportMeta, null, 2) + '\n');

  generated.push(project);
}
```

**Replace with:**
```js
const projectsData = [];

for (const project of projects) {
  const stateMd = readStateMd(projectsDir, project);
  if (!stateMd) continue;

  const reportDir = path.join(repoDir, 'reports', project, 'status');
  fs.mkdirSync(reportDir, { recursive: true });

  const html = generateStatusHtml(project, stateMd);
  fs.writeFileSync(path.join(reportDir, 'index.html'), html);

  // Count health
  let goodCount = 0, badCount = 0, pendingCount = 0;
  // ... same counting logic ...

  const reportMeta = {
    title: `${project} Status`,
    project,
    date: new Date().toISOString().split('T')[0],
    status: { good: goodCount, bad: badCount, pending: pendingCount },
  };
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(reportMeta, null, 2) + '\n');

  projectsData.push({ project, good: goodCount, bad: badCount, pending: pendingCount, date: reportMeta.date, title: reportMeta.title });
}
```

### 2. Call generateRootIndex after the loop

After the for loop ends, before the `skipGit` check:
```js
generateRootIndex(repoDir, projectsData);
```

### 3. Update the return value and console output

Change the return and console log to use `projectsData` instead of `generated`:
- `return generated;` → `return projectsData;`
- `projects.join(', ')` → use `projectsData.map(p => p.project).join(', ')`

### 4. Update commitAndPush call

The commitAndPush call takes the project names list (just strings), not the full objects. Extract names:
```js
if (!opts.skipGit) {
  commitAndPush(repoDir, projectsData.map(p => p.project));
}
```

## Verification

Run: `node scripts/generate-status-report.js`

Expected: generates per-project status + root `index.html`. No errors. The script prints generated projects and URLs.
