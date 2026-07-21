# Report Server Design

## Overview

A dedicated service at `reports.yash.abyssmallab.in` hosting HTML reports.
Reports live in this repo, committed by OpenCode. Git-sync sidecar pulls them
into the pod. A Node/Express app serves them with a browseable UI.

## Repository Layout

```
reports/
  {project-name}/
    {report-slug}/
      index.html       # report content
      report.json      # metadata (optional)
```

- `project-name`: kebab-case, e.g. `jane`, `infra`, `report-server`
- `report-slug`: kebab-case, e.g. `audit-2026-07`, `k8s-upgrade-check`
- `report.json` optional. Without it, title derived from slug, description blank.

### report.json schema

```json
{
  "title": "K8s Upgrade Audit",
  "description": "Assessment of cluster upgrade from v1.28 to v1.29",
  "date": "2026-07-19",
  "tags": ["kubernetes", "upgrade", "audit"]
}
```

## Architecture

```
K8s Pod
  ┌─────────────────┐  ┌──────────────┐
  │  reports-server  │  │  git-sync    │
  │  (Node/Express)  │  │  (sidecar)   │
  │                  │  │              │
  │  serves /        │  │  pulls repo  │
  │  serves /{p}/{s} │  │  every 60s   │
  └────────┬─────────┘  └──────┬───────┘
           │                   │
           └────────┬──────────┘
                    │
           ┌────────▼────────┐
           │  /reports/      │
           │  (emptyDir)     │
           └─────────────────┘
         │
         ▼
  Traefik (reports.yash.abyssmallab.in)
         │
         ▼
  cert-manager (Let's Encrypt TLS)
```

- Git-sync sidecar clones this repo to shared `emptyDir` volume at `/reports`
- Express app watches `/reports` with chokidar — re-reads metadata on change
- Traefik Ingress routes `reports.yash.abyssmallab.in` → service:3000

## Browseable UI (light color scheme)

Two pages:

### Index page (`/`)
- Reports grouped by project
- Each card shows: title, description, date
- Sortable by date (newest first), filterable by project
- Empty state: "No reports yet"

### Report viewer (`/{project}/{slug}`)
- Serves `index.html` directly as static file
- Top chrome: report title, "← Back to reports", project name
- No iframe or injection — plain file serve

## Data Flow

1. OpenCode writes `reports/{project}/{slug}/index.html` (+ optional `report.json`)
2. User commits + pushes to this repo
3. Git-sync sidecar pulls commit (every 60s)
4. Chokidar detects new/modified files
5. Express rebuilds in-memory index
6. UI reflects new report immediately

## CI/CD

### App deploy (src/, package.json, charts/, Dockerfile changes)
- Build Docker image → push to `docker.io/beingyash/report-server`
- Flux `ImageUpdateAutomation` picks up new tag
- Updates Deployment (app + git-sync sidecar)

### Report deploy (reports/** changes)
- No build needed. Git-sync picks up commit within 60s.
- App detects new files via chokidar, updates index.
- Eventually consistent. No pod restart.

## Error Handling

- Missing report → 404 with "Report not found" + link to index
- Malformed `report.json` → skipped with warning, slug used as title fallback
- Git-sync failure → app serves last known state; health endpoint reports stale
- Empty reports dir → index shows "No reports yet"

## Testing

- Unit: metadata parsing, index building, file watching
- Integration: app with test fixtures directory, verify index and individual report serving
