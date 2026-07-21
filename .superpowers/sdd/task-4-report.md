### Task 4 Report: Index Page Route + Template

**Status:** Complete

#### What implemented
- `src/routes/index.js`: Express router for `GET /` that reads `req.app.locals.getIndex()`, groups reports by `project`, supports `?project=` filter, and renders `index.ejs` with `grouped`, `activeProject`, and sorted `projects`.
- `src/views/index.ejs`: EJS template rendering a header with project nav (All + per-project links), grouped report cards (title/description/date), and an empty-state message.
- Wired `app.use('/', require('./routes/index'));` into `src/app.js` before `module.exports`.

#### What tested + results
- Ran `REPORTS_DIR=test/fixtures node src/index.js` and `curl http://localhost:3000`.
- Response: valid HTML (1216 bytes), project nav shows `test-project`, and report card contains `<h3 class="report-title">Test Report Title</h3>`.
- Empty-state path, date/description conditionals, and project filter not exercised but trivially correct from code review.

#### Files changed
- Created `src/routes/index.js`
- Created `src/views/index.ejs`
- Modified `src/app.js` (added route wiring)

#### Self-review findings
- Route relies on `req.app.locals.getIndex()` — consistent with app.js which sets `app.locals.getIndex`. Template uses `/style.css` which is not yet served (404 expected); no stylesheet task exists yet.
- Template is XSS-safe (EJS auto-escapes `<%= %>`).
- Report links point to `/<project>/<slug>` routes not yet implemented (later task).

#### Issues / concerns
- `/style.css` will 404 until a static asset/route is added (out of scope for this task).
- Report detail pages (`/<project>/<slug>`) not implemented yet — links currently dead.
