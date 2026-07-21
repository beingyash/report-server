# Task 9 Report: GitHub Actions CI/CD

## What I implemented

Added a GitHub Actions workflow that builds a multi-arch Docker image and pushes
it to Docker Hub on changes to app files.

Created `.github/workflows/deploy.yml` exactly per the brief. The workflow:
- Triggers on push to `main` when app files change (`src/**`, `public/**`,
  `Dockerfile`, `package.json`, `charts/**`, and the workflow file itself).
- Uses QEMU + Buildx to build for `linux/amd64` and `linux/arm64` (cluster has
  both arch nodes).
- Logs into Docker Hub via `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` secrets.
- Pushes `docker.io/beingyash/report-server:latest`.

Because the Task 8 K8s deployment references `docker.io/beingyash/report-server:latest`
with `pullPolicy: Always`, Flux rolls out the new image automatically when the tag updates.

## Files changed

- `.github/workflows/deploy.yml` (new) — committed as `e3c028d`.

## Self-review findings

- YAML matches the brief verbatim (steps, action versions, platforms, tags).
- Action versions are current and stable: `actions/checkout@v4`,
  `docker/setup-buildx-action@v3`, `docker/setup-qemu-action@v3`,
  `docker/login-action@v3`, `docker/build-push-action@v6`.
- Trigger `paths` correctly scopes CI to app changes, avoiding needless rebuilds.
- `push: true` + tag `:latest` is consistent with the `pullPolicy: Always`
  deployment strategy.

## Issues or concerns

- No Docker Hub credentials exist in this local repo — they must be configured as
  GitHub Actions secrets (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`) for the
  workflow to authenticate. This is expected per the brief (configured in Actions).
- Tagging `:latest` only means no immutable release tags; rollback requires
  re-pushing a prior image. Acceptable given Flux + `pullPolicy: Always` design.
- Workflow assumes a working `Dockerfile` at repo root — verify it exists and
  builds (Task 8 provided it). Not validated here since the build runs on GitHub,
  not locally.
- Cannot run the workflow locally; correctness verified by inspection only.
