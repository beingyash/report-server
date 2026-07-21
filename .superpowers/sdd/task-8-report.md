# Task 8: Helm Chart — Report

## What I implemented

Created a standard Helm chart (`charts/report-server`) for deploying the report-server
app alongside a git-sync sidecar in a single pod, sharing an `emptyDir` volume at
`/var/reports`. The 6 files were created exactly as specified in the task brief:

- `Chart.yaml` — apiVersion v2, name `report-server`, version/appVersion `0.1.0`
- `values.yaml` — image, service (port 3000), ingress (traefik, host), gitSync, resources
- `templates/_helpers.tpl` — `name` and `fullname` helpers (verbatim from brief)
- `templates/deployment.yaml` — 2 containers (report-server + git-sync) sharing the volume
- `templates/service.yaml` — ClusterIP Service selecting by `app` label
- `templates/ingress.yaml` — Traefik Ingress with cert-manager `letsencrypt-prod` issuer

Deployment design matches the brief:
- `report-server` container: `REPORTS_DIR=/var/reports/source/reports`, `PORT=3000`,
  mounts volume at `/var/reports`, uses values-driven resources.
- `git-sync` container: `GIT_SYNC_REPO`/`GIT_SYNC_BRANCH`/`GIT_SYNC_ROOT=/var/reports`/
  `GIT_SYNC_DEST=source`/`GIT_SYNC_WAIT=60`/`GIT_SYNC_ONE_TIME=false`, mounts same volume.
  This produces reports at `/var/reports/source/reports/{project}/{slug}` as expected.

## What I tested

`helm` is NOT installed/available on this host (Windows PowerShell, term not recognized).
- `helm lint charts/report-server` — NOT RUN (helm unavailable)
- `helm template charts/report-server` — NOT RUN (helm unavailable)

Fallback validation performed:
- Static YAML parse of `Chart.yaml` and `values.yaml` with Python `yaml.safe_load` → both OK.
- Template files contain only standard Helm templating (`include`, `toYaml`, `quote`,
  `nindent`) against the defined helpers and values — no syntax issues detectable statically.

Recommendation: run `helm lint`/`helm template` on a machine with helm (or the K8s VM)
before applying, to confirm rendering.

## Files changed

- `charts/report-server/Chart.yaml` (new)
- `charts/report-server/values.yaml` (new)
- `charts/report-server/templates/_helpers.tpl` (new)
- `charts/report-server/templates/deployment.yaml` (new)
- `charts/report-server/templates/service.yaml` (new)
- `charts/report-server/templates/ingress.yaml` (new)

Commit: `d915cb3 feat: add Helm chart with git-sync sidecar` (6 files, 140 insertions)

## Self-review findings

- All 6 files match the brief verbatim; no deviations from specified YAML.
- Helpers, fullname/name logic, and the two-container/shared-volume design are consistent.
- Ingress uses `networking.k8s.io/v1`, `ingressClassName: traefik`, cert-manager cluster
  issuer annotation — matches cluster's Traefik + cert-manager setup.
- Resources: app uses values-driven block via `toYaml`; git-sync has its own inline block.
- `GIT_SYNC_WAIT` value is `60` from `interval`, quoted correctly for env string context.

## Issues or concerns

1. **Helm not validated** — no `helm lint`/`helm template` run locally; rendering unverified
   on this host. Should be validated on a helm-capable environment before `helm install`.
2. **No multi-arch / `imagePullSecrets` / nodeSelector** explicitly set. The cluster has
   arm64+amd64 nodes; images (`docker.io/beingyash/report-server`, `git-sync:v4.2.1`) are
   typically multi-arch on Docker Hub, so default scheduling should be fine, but no
   explicit `nodeSelector`/`tolerations` were requested by the brief.
3. **Public repo assumption** — git-sync uses a public repo per brief. If the repo becomes
   private, `GIT_SYNC_USERNAME`/`GIT_SYNC_PASSWORD` from a K8s secret must be added
   (out of scope per brief note).
4. **`imagePullPolicy: Always`** with `tag: latest` is fine for dev but pinning a digest/
   version tag is better practice for reproducible deploys (not requested by brief).
5. **Liveness/readiness probes** are not defined in the brief; chart matches brief as-is.
6. **No `revisionHistoryLimit`, `securityContext`, or resource `ephemeral-storage` limits**
   — acceptable for this scope but worth noting for stricter clusters.
