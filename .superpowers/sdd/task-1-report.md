# Task 1: Project Scaffolding — Report

## What I implemented
- Created Node/Express project skeleton:
  - `package.json` — project metadata, scripts (start/dev/test/lint), deps (express, ejs, chokidar), devDeps (eslint)
  - `.gitignore` — node_modules/, .env
  - `src/app.js` — Express app with EJS view engine, `/health` endpoint returning `{"status":"ok"}`
  - `src/index.js` — server entry point, listens on PORT env var (default 3000)

## What I tested and test results
- Ran `npm install` → 168 packages installed, 0 vulnerabilities
- Started server, hit `GET /health` → received `{"status":"ok"}`

## TDD Evidence
N/A — no test files in this task (scaffolding only).

## Files changed
- Created: `package.json`
- Created: `.gitignore`
- Created: `src/app.js`
- Created: `src/index.js`

## Self-review findings
- All files match brief exactly (verified character-by-character)
- Port 3000 was already in use from a prior process — killed it before retrying
- No code quality issues observed

## Issues or concerns
None.
