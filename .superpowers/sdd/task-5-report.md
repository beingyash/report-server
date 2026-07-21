# Task 5 Report: Report Viewer Route + Chrome Template

## What I implemented

- **`src/routes/reports.js`** (new): Express router handling `GET /:project/:slug`. Looks up the report in `app.locals.getIndex()`; returns a 404 page if the report is missing or its HTML file cannot be read; otherwise renders `report.ejs` with the report metadata and raw HTML content.
- **`src/views/report.ejs`** (new): Chrome template — report page with a header (back link + project name) and a `<main>` that injects the report HTML via `<%- html %>`. Includes `/style.css` link (served by Task 6).
- **`src/views/404.ejs`** (new): Not-found page rendering the `message` passed from the route.
- **`src/app.js`** (modified): Wired `app.use('/', require('./routes/reports'));` after the index route, per spec.

All code matches the task brief verbatim.

## What I tested

Started the server with `REPORTS_DIR=test/fixtures node src/index.js` and curled:

- `GET /test-project/test-report` → **200**, returned full chrome (`<!DOCTYPE html>`, `<title>Test Report Title - Reports</title>`, report-header with back link + `test-project`, and report content `<h1>Test</h1>` injected into `<main class="report-content">`).
- `GET /test-project/nonexistent` → returned the **404 page** with message `Report "test-project/nonexistent" not found` and the Not Found chrome.

Note: PowerShell on this host aliases `curl` to `Invoke-WebRequest`, so tests used `curl.exe`. `/style.css` 404s as expected (static middleware added in Task 6). The report HTML was correctly escaped/injected (note the embedded `<!DOCTYPE html>` from the fixture is rendered raw inside `<main>`, which is the intended behavior of `<%- html %>`).

## Files changed

- Created `src/routes/reports.js`
- Created `src/views/report.ejs`
- Created `src/views/404.ejs`
- Modified `src/app.js` (wired reports route)

## Self-review findings

- Route ordering is correct: `/` (index) and `/:project/:slug` (reports) on separate routers mounted at `/`. The index router only binds `GET /`, so it does not shadow the report route.
- The `try/catch` around `fs.readFileSync` correctly handles a missing report file (defensive against index/reality drift).
- `html` is injected unescaped via `<%-` — correct for rendering arbitrary report HTML, but worth noting as a general XSS consideration if report HTML ever comes from untrusted sources. In this self-hosted context report HTML is author-controlled.
- Brief's commit step only lists 3 files; I also committed `src/app.js` since wiring it is required for the route to function.

## Issues or concerns

- `/style.css` returns 404 until Task 6 — expected, not a defect.
- No automated test was added (brief specified manual curl testing only). Recommend a follow-up integration test in later tasks.
- Report HTML is injected without sanitization. Acceptable for trusted author content but should be documented if the trust model changes.
