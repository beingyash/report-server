# Fix Brief: Final Review Issues #3 and #4

Two fixes needed in the report-server repo. The final whole-branch review found:

## Fix 1: Startup readiness — git-sync initial clone not detected (Issue #3)

**Problem:** `src/watcher.js` uses `ignoreInitial: true`. If the git-sync sidecar populates `/var/reports/source/` before chokidar starts watching (race condition), the initial clone files are never detected and the in-memory index stays empty until a *later* file change. Reports would 404 until someone edits a file.

**Fix:** Add a periodic re-scan in `src/app.js` so the index is always refreshed from disk even if chokidar misses the initial clone. Keep `ignoreInitial: true` (avoid noisy re-index on startup).

In `src/app.js`, after the watcher setup, add a re-scan interval:

```javascript
const watcher = watchReports(REPORTS_DIR, () => {
  reportsIndex = buildIndex(REPORTS_DIR);
});

// Periodic re-scan: catches git-sync's initial clone if chokidar misses it
const rescanInterval = setInterval(() => {
  reportsIndex = buildIndex(REPORTS_DIR);
}, 60000);

// Expose for cleanup
app.locals.getIndex = () => reportsIndex;
app.locals.cleanup = () => {
  clearInterval(rescanInterval);
  watcher.close();
};
```

## Fix 2: Add liveness/readiness probes to Deployment (Issue #4)

**Problem:** The Deployment has no probes. The `/health` endpoint exists but isn't used. If the app hangs or git-sync volume is unavailable, K8s can't detect it.

**Fix:** Add `livenessProbe` and `readinessProbe` to the report-server container in `charts/report-server/templates/deployment.yaml`. The container already has `ports: - containerPort: 3000` and `env`. Add after the resources block (before closing the container spec):

```yaml
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

## Verification

1. After Fix 1: `node -e "require('C:\home\projects\report-server\src\app.js')"` should not error
2. After Fix 2: if `helm` available, `helm template charts/report-server` should show probes in the deployment. Otherwise just verify YAML structure.

## Commit

```
git add src/app.js charts/report-server/templates/deployment.yaml
git commit -m "fix: add periodic rescan and health probes for git-sync reliability"
```
