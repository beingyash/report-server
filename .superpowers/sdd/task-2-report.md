# Task 2: Metadata Indexer — Report

## What Was Implemented

`src/indexer.js` exports `buildIndex(reportsDir)` — a function that:
1. Reads a `reportsDir` path and walks its first-level subdirs (projects)
2. Walks each project's second-level subdirs (report slugs)
3. For each slug containing `index.html`, reads optional `report.json` metadata
4. Returns sorted array (newest-first by `date`, null-date items last)
5. Gracefully handles missing `report.json` (falls back to slug as title, empty strings/arrays)
6. Returns empty array for nonexistent/empty directories

## What Was Tested

3 tests in `test/indexer.test.js`:
1. **builds index from reports directory** — validates project, slug, title, description, date, tags, htmlPath from `test-project/test-report/`
2. **returns empty array for empty directory** — validates `empty/` dir yields `[]`
3. **handles report without report.json** — validates `no-meta-report/` falls back to slug-as-title and empty description

## TDD Evidence

### RED (Step 2)
```
> node --test test/indexer.test.js
Error: Cannot find module '../src/indexer'
...
✖ fail 1
```

### GREEN (Step 5)
```
> node --test test/indexer.test.js
▶ indexer
  ✔ builds index from reports directory (5.7643ms)
  ✔ returns empty array for empty directory (0.5319ms)
  ✔ handles report without report.json (1.2705ms)
✔ indexer (8.9627ms)
ℹ tests 3
ℹ suites 1
ℹ pass 3
```

## Files Changed

| File | Action |
|------|--------|
| `src/indexer.js` | Created (148 lines) |
| `test/indexer.test.js` | Created (48 lines) |
| `test/fixtures/test-project/test-report/index.html` | Created |
| `test/fixtures/test-project/test-report/report.json` | Created |
| `test/fixtures/test-project/no-meta-report/index.html` | Created |
| `test/fixtures/empty/.gitkeep` | Created |

## Self-Review Findings

- No unused variables or dead code
- Error handling covers: nonexistent `reportsDir` (returns `[]`), invalid JSON in `report.json` (logs warning, treats as empty), missing `index.html` (skips)
- Sort is stable and handles null dates correctly
- Exports `{ buildIndex }` as a named export for tree-shakeability
- HTML file existence is checked before constructing entry (skips directories without `index.html`)
- All edge cases from the test are covered

## Issues or Concerns

None.
