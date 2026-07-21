# Task 1: Add generateRootIndex() function

## What I implemented

Added `generateRootIndex(repoDir, projectsData)` function to `scripts/generate-status-report.js` that writes an `index.html` dashboard to the repo root.

## What I tested

- `node -e "require('./scripts/generate-status-report')"` — loaded without errors
- `typeof m.generateRootIndex` — confirmed `function`
- Function not called (writes to disk), so no write test performed

## Files changed

- `scripts/generate-status-report.js` — appended `generateRootIndex` function + added to `module.exports`

## Self-review findings

- `fs` and `path` already imported at top — OK
- `escape()` utility already defined — OK
- Template strings reference `path.join`, `fs.writeFileSync` — correct deps
- Exported alongside existing functions — correct pattern
- VS plan: exact match, no deviations

## Issues or concerns

None.
