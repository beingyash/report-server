# Task 3: File Watcher — Report

## What I implemented
- Created `src/watcher.js` exactly per brief: `watchReports(reportsDir, onChange)` using chokidar, watching `reportsDir/**/index.html` and `reportsDir/**/report.json` with `ignoreInitial: true` and `awaitWriteFinish` config. On `add`/`change`/`unlink` it derives `(eventType, project, slug)` from the relative path and calls `onChange`.
- `src/app.js` was already wired per the brief (indexer + watcher, `/health` returning `reportCount`). No further change needed.

## What I tested and test results
- `node -e "require('./src/app')"` → app loads OK (chokidar present in node_modules).
- Started server (`node src/index.js`), hit `GET /health` → `{"status":"ok","reportCount":0}` (200, valid JSON). Server started and stopped cleanly.
- Files changed: `src/watcher.js` (new), `src/app.js` (already matched spec, included in commit).

## Files changed
- `src/watcher.js` (created)
- `src/app.js` (already compliant; committed alongside)

## Self-review findings
- `src/app.js` already contained the exact target implementation from the brief; matched verbatim.
- `onChange` callback ignores `project`/`slug` args (rebuilds full index) — acceptable per brief, simplest correct behavior.
- No tests added for the watcher itself (brief did not require); `app.js` relies on `buildIndex` which has existing coverage from Task 2.

## Issues or concerns
- `src/app.js` modification step was a no-op since the file already matched the spec — possibly pre-applied in earlier work. Confirmed identical to brief.
- Watcher keeps file handles open; no explicit `watcher.close()` on shutdown. `app.locals.watcher` is exposed for cleanup but not wired to `SIGTERM`. Minor; fine for this task scope.
- `/reports` default dir does not exist in this environment, so `reportCount` is 0. No reports fixture mounted. Expected.
