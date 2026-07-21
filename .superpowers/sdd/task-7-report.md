# Task 7 Report: Dockerfile + .dockerignore

## What implemented
- `Dockerfile`: node:20-alpine base, `/app` workdir, `npm ci --omit=dev`, copies `src/` + `public/`, `PORT=3000`, `EXPOSE 3000`, `CMD ["node","src/index.js"]`.
- `.dockerignore`: excludes `node_modules/`, `.git/`, `test/`, `docs/`, `*.md`, `.gitignore`.

Both created verbatim from task brief.

## What tested
Docker daemon not available in environment (no `npipe:////./pipe/dockerDesktopLinuxEngine`). Build/run verification **skipped** per brief note. Could not run `docker build` / `docker run` / `curl /health`.

## Files changed
- Created: `Dockerfile`
- Created: `.dockerignore`
- Committed: `4c78161` "feat: add Dockerfile for production image"

## Self-review findings
- Dockerfile matches brief exactly.
- `.dockerignore` matches brief exactly.
- Note: `.dockerignore` excludes `*.md` — this also excludes README/sdd docs from image, intended.
- `src/index.js` must read `REPORTS_DIR` env (used in run cmd `-e REPORTS_DIR=/reports`); existing app already supports this per earlier tasks.

## Issues / concerns
- Build unverified locally — depends on Task 9 GitHub Actions for actual image build/push.
- Image runs `node src/index.js` with no `npm start`; ensure `src/index.js` is the correct entry per app.
- Health endpoint `/health` returning `reportCount` assumes app exposes it (from prior tasks) — not re-verified here.
