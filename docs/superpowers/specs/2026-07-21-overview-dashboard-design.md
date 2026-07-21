# Global Overview Dashboard — Design Spec

**Date:** 2026-07-21
**Project:** report-server (reports.yash.abysmallab.in)

## Problem

Root `https://reports.yash.abysmallab.in/` serves the old per-report listing page. The designed global status dashboard lives at `/status`, but users land on the old page first.

## Goal

Replace root `/` with a global overview dashboard showing health cards for all projects. Move old reports listing to `/reports`.

## Data Source

`generate-status-report.js` already reads all `STATE.md` files from sibling repos under `C:\home\projects\`, generates per-project status HTML + `report.json`. The `report.json` contains:

```json
{
  "title": "kubernetes-deploy Status",
  "project": "kubernetes-deploy",
  "date": "2026-07-21",
  "status": { "good": 7, "bad": 1, "pending": 24 }
}
```

## Layout

Dashboard grid (max 1200px centered):

```
┌──────────────────────────────────────────────┐
│  Infra Status               updated YYYY-MM-DD  │
│  3 projects — 7 OK  1 Issue  27 Pending          │
├────────────┬────────────┬─────────────────────────┤
│  jane      │ k8s-deploy │ report-server           │
│  ●●● OK    │ ●● Issue   │ ●● OK                   │
│  7 OK      │ 0 OK       │ 2 OK                    │
│  0 Issue   │ 1 Issue    │ 1 Issue                 │
│  3 Pending │ 24 Pending │ 2 Pending               │
│  Jul 21    │ Jul 21     │ Jul 21                  │
├────────────┴────────────┴─────────────────────────┤
│  View reports listing »                            │
└──────────────────────────────────────────────────────┘
```

## Card Component

- Left border color: `#30a46c` (good, `bad=0`), `#e5484d` (bad, `bad>0`), `#5b8def` (pending, `bad=0 && pending>0`)
- Project name → link to `/project/status/`
- Status badge row (colored pills)
- Last-updated date

States: empty ("No projects with STATE.md found"), error (generator failure banner).

## Responsive

- Mobile: single column cards, header stacks
- Tablet: 2 columns
- Desktop: 3+ columns (`auto-fill`, `minmax(280px, 1fr)`)

## Implementation

### Changes to `scripts/generate-status-report.js`

1. Add `generateRootIndex(repoDir, projectsData)`:
   - Reads each project's `reports/<project>/status/report.json`
   - Renders dashboard HTML with card grid, summary header, footer link
   - Writes to `<repoDir>/index.html`

2. Modify `generateAll()`:
   - Collect project metadata after per-project generation
   - Call `generateRootIndex()` at end

3. Modify `commitAndPush()`:
   - Add `<repoDir>/index.html` to commit paths

### No runtime changes

Report-server app already serves static files from repo root via `express.static()`. New `index.html` automatically becomes root `/`.

## Future Considerations

- Auto-refresh via git-sync sidecar (already deployed)
- Live status badges for external README embeds
- Historical trend line (per-project status over time)
