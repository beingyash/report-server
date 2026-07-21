# Report Publisher Design

## Overview

Automate publishing HTML reports from OpenCode to `reports.yash.abysmallab.in`
with zero manual steps. When OpenCode generates a report in any project,
it runs a script that writes files, commits, and pushes to the report-server repo.
Git-sync picks up the commit; app serves the report.

## Architecture

```
OpenCode (Windows)
  → generates HTML report in project/ (e.g. jane/)
  → calls scripts/publish.js
      → detects project = repo dir name
      → writes reports/{project}/{slug}/{index.html, report.json}
      → git add + commit + push to GitHub
  → print URL

GitHub beingyash/report-server
  ← receives push

K8s pod (every 60s)
  ← git-sync pulls new commit
  ← Express app detects new files via chokidar
  ← serves at reports.yash.abysmallab.in/{project}/{slug}/
```

## Components

### 1. publish.js — Node.js script

Location: `scripts/publish.js` in report-server repo.

Interface:
```
node scripts/publish.js <html-path> --title "..." [--slug "..." --project "..."]
```

- `html-path` (required): path to generated HTML file
- `--title` (optional): report title. Falls back to HTML `<title>` tag, then filename.
- `--slug` (optional): auto-derived from title (truncate to 3 words, kebab-case)
- `--project` (optional): auto-detected from CWD basename (e.g. `jane`)

Behavior:
1. Copy HTML to `reports/{project}/{slug}/index.html`
2. Generate `reports/{project}/{slug}/report.json` with title, date, project
3. `git add reports/{project}/{slug}/`
4. `git commit -m "report({project}): {slug}"`
5. `git push`
6. Print URL: `https://reports.yash.abysmallab.in/{project}/{slug}/`

Edge cases:
- **Slug collision**: append `-1`, `-2` suffix instead of overwriting
- **Git push fails**: write succeeds locally, print error + retry command
- **No git remote**: print warning, still write locally
- **Missing --title**: derive from HTML `<title>` tag or filename base
- **Report-server repo path**: default `../report-server`, accept `--repo-path`

### 2. report.json schema

```json
{
  "title": "K8s Upgrade Audit",
  "project": "jane",
  "date": "2026-07-21"
}
```

Fields: title (string), project (string), date (ISO date string).

### 3. Skill — report-publisher

Location: `~/.config/opencode/skills/report-publisher/SKILL.md`

A lightweight skill that:
- Fires when OpenCode generates an HTML report
- Instructs OpenCode to take slug from user or derive it
- Runs the publish.js script as final step
- Confirms publication with URL

Trigger phrases: "generate report", "publish report", "save report".

### 4. Verification (post-push)

After git push, optional verification step:
- Sleep ~70s (git-sync poll window)
- `curl -f https://reports.yash.abysmallab.in/{project}/{slug}/`
- Confirm 200, print "Live at <url>"
- Failure: print warning + check instructions

## Non-goals

- No API endpoint for publishing (git-only)
- No separate reports repo
- No authentication on the serving side
- No report search/filter beyond existing project grouping
- No migration of existing test reports

## Open questions

- Should push failures queue for retry? (Not for v1 — fail visibly)
- Should report include a link back to source repo? (Future enhancement)
