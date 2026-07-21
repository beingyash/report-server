# Report Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a browseable HTML report server at `reports.yash.abyssmallab.in`

**Architecture:** Node/Express app with metadata-driven index, git-sync sidecar for live report updates. Reports live in `reports/{project}/{slug}/index.html` with optional `report.json` metadata. Chokidar watches for file changes. EJS templates for the UI (light color scheme). Deployed on K8s with Helm and Traefik ingress.

**Tech Stack:** Node.js 20+, Express 4.x, EJS, Chokidar, Helm 3, Docker

## Global Constraints

- Domain: `reports.yash.abyssmallab.in`
- Path scheme: `/{project-name}/{report-slug}`
- Reports root: `process.env.REPORTS_DIR || '/reports'`
- Light color scheme for browseable UI
- No database — metadata from filesystem + in-memory index
- Git-sync sidecar (not app rebuild) for report deploys
- Docker image: `docker.io/beingyash/report-server`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `src/index.js`
- Create: `src/app.js`
- Create: `.gitignore`

**Interfaces:**
- Produces: `src/app.js` exports Express app for testing
- Produces: `src/index.js` starts server on `PORT` env var (default 3000)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "report-server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "node --test test/*.test.js",
    "lint": "node_modules/.bin/eslint src/ test/"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ejs": "^3.1.10",
    "chokidar": "^4.0.0"
  },
  "devDependencies": {
    "eslint": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
.env
```

- [ ] **Step 3: Create src/app.js**

```javascript
const express = require('express');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
```

- [ ] **Step 4: Create src/index.js**

```javascript
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`report-server listening on port ${PORT}`);
});
```

- [ ] **Step 5: Install dependencies and verify**

```bash
npm install
node src/index.js &
sleep 2
curl http://localhost:3000/health
# Expected: {"status":"ok"}
kill %1
```

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore src/index.js src/app.js
git commit -m "feat: scaffold Express app"
```

---

### Task 2: Metadata Indexer

**Files:**
- Create: `src/indexer.js`
- Create: `test/indexer.test.js`
- Create: `test/fixtures/test-project/test-report/index.html`
- Create: `test/fixtures/test-project/test-report/report.json`
- Create: `test/fixtures/test-project/no-meta-report/index.html`
- Create: `test/fixtures/empty/` (empty directory)

**Interfaces:**
- Exports: `function buildIndex(reportsDir)` → `Array<{project, slug, title, description, date, tags, htmlPath}>`
- Consumes: `reportsDir` path string
- Produces: sorted array (newest first by date, null date items last)

- [ ] **Step 1: Write failing test**

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { buildIndex } = require('../src/indexer');

describe('indexer', () => {
  it('builds index from reports directory', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const index = buildIndex(fixtures);
    const report = index.find(r => r.slug === 'test-report');

    assert(report);
    assert.strictEqual(report.project, 'test-project');
    assert.strictEqual(report.slug, 'test-report');
    assert.strictEqual(report.title, 'Test Report Title');
    assert.strictEqual(report.description, 'A test report description');
    assert.strictEqual(report.date, '2026-07-19');
    assert.deepStrictEqual(report.tags, ['test', 'fixture']);
  });

  it('returns empty array for empty directory', () => {
    const emptyDir = path.join(__dirname, 'fixtures', 'empty');
    const index = buildIndex(emptyDir);
    assert.deepStrictEqual(index, []);
  });

  it('handles report without report.json', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const index = buildIndex(fixtures);
    const report = index.find(r => r.slug === 'no-meta-report');
    assert(report);
    assert.strictEqual(report.title, 'no-meta-report');
    assert.strictEqual(report.description, '');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test test/indexer.test.js
# Expected: FAIL with "Cannot find module"
```

- [ ] **Step 3: Create test fixtures**

Create `test/fixtures/test-project/test-report/index.html`:
```html
<!DOCTYPE html>
<html><head><title>Test Report</title></head><body><h1>Test</h1></body></html>
```

Create `test/fixtures/test-project/test-report/report.json`:
```json
{
  "title": "Test Report Title",
  "description": "A test report description",
  "date": "2026-07-19",
  "tags": ["test", "fixture"]
}
```

Create `test/fixtures/test-project/no-meta-report/index.html`:
```html
<!DOCTYPE html><html><body><p>No meta</p></body></html>
```

Create `test/fixtures/empty/.gitkeep` (empty directory placeholder).

- [ ] **Step 4: Create src/indexer.js**

```javascript
const fs = require('fs');
const path = require('path');

function buildIndex(reportsDir) {
  const reports = [];

  let projects;
  try {
    projects = fs.readdirSync(reportsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const projectDir of projects) {
    if (!projectDir.isDirectory()) continue;
    const projectPath = path.join(reportsDir, projectDir.name);
    const slugs = fs.readdirSync(projectPath, { withFileTypes: true });

    for (const slugDir of slugs) {
      if (!slugDir.isDirectory()) continue;
      const slug = slugDir.name;
      const htmlPath = path.join(projectPath, slug, 'index.html');
      if (!fs.existsSync(htmlPath)) continue;

      const metaPath = path.join(projectPath, slug, 'report.json');
      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        } catch (err) {
          console.warn(`Failed to parse ${metaPath}: ${err.message}`);
        }
      }

      reports.push({
        project: projectDir.name,
        slug,
        title: meta.title || slug,
        description: meta.description || '',
        date: meta.date || null,
        tags: meta.tags || [],
        htmlPath,
      });
    }
  }

  reports.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  return reports;
}

module.exports = { buildIndex };
```

- [ ] **Step 5: Run test to verify it passes**

```bash
node --test test/indexer.test.js
# Expected: PASS
```

- [ ] **Step 6: Commit**

```bash
git add src/indexer.js test/indexer.test.js test/fixtures/
git commit -m "feat: add metadata indexer"
```

---

### Task 3: File Watcher

**Files:**
- Create: `src/watcher.js`

**Interfaces:**
- Exports: `function watchReports(reportsDir, onChange)` → chokidar FSWatcher instance
- `onChange` callback called with `(eventType, project, slug)` when reports change
- Watches `reportsDir/**/index.html` and `reportsDir/**/report.json`

- [ ] **Step 1: Create src/watcher.js**

```javascript
const chokidar = require('chokidar');
const path = require('path');

function watchReports(reportsDir, onChange) {
  const watcher = chokidar.watch([
    path.join(reportsDir, '**', 'index.html'),
    path.join(reportsDir, '**', 'report.json'),
  ], {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher.on('add', (filePath) => handleChange('add', filePath));
  watcher.on('change', (filePath) => handleChange('change', filePath));
  watcher.on('unlink', (filePath) => handleChange('unlink', filePath));

  function handleChange(event, filePath) {
    const rel = path.relative(reportsDir, filePath);
    const parts = rel.split(path.sep);
    if (parts.length >= 2) {
      onChange(event, parts[0], parts[1]);
    }
  }

  return watcher;
}

module.exports = { watchReports };
```

- [ ] **Step 2: Wire watcher into app**

Modify `src/app.js` to use the indexer and watcher:

```javascript
const express = require('express');
const path = require('path');
const { buildIndex } = require('./indexer');
const { watchReports } = require('./watcher');

const app = express();
const REPORTS_DIR = process.env.REPORTS_DIR || '/reports';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let reportsIndex = buildIndex(REPORTS_DIR);

const watcher = watchReports(REPORTS_DIR, () => {
  reportsIndex = buildIndex(REPORTS_DIR);
});

// Expose index for routes
app.locals.getIndex = () => reportsIndex;

// Expose watcher for cleanup
app.locals.watcher = watcher;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', reportCount: reportsIndex.length });
});

module.exports = app;
```

- [ ] **Step 3: Commit**

```bash
git add src/watcher.js src/app.js
git commit -m "feat: add file watcher for live report updates"
```

---

### Task 4: Index Page Route + Template

**Files:**
- Create: `src/routes/index.js`
- Create: `src/views/index.ejs`

**Interfaces:**
- Consumes: `app.locals.getIndex()` → array of report objects
- Produces: `GET /` renders index page

- [ ] **Step 1: Create src/routes/index.js**

```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const index = req.app.locals.getIndex();
  const { project } = req.query;

  let grouped = {};
  for (const report of index) {
    if (project && report.project !== project) continue;
    if (!grouped[report.project]) {
      grouped[report.project] = [];
    }
    grouped[report.project].push(report);
  }

  res.render('index', {
    grouped,
    activeProject: project || null,
    projects: [...new Set(index.map(r => r.project))].sort(),
  });
});

module.exports = router;
```

- [ ] **Step 2: Create src/views/index.ejs**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reports</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="header">
    <h1>Reports</h1>
    <nav class="project-nav">
      <a href="/" class="<%= !activeProject ? 'active' : '' %>">All</a>
      <% projects.forEach(p => { %>
        <a href="/?project=<%= p %>" class="<%= activeProject === p ? 'active' : '' %>"><%= p %></a>
      <% }) %>
    </nav>
  </header>

  <main class="content">
    <% if (Object.keys(grouped).length === 0) { %>
      <p class="empty-state">No reports yet</p>
    <% } %>

    <% Object.entries(grouped).forEach(([project, reports]) => { %>
      <section class="project-group">
        <h2 class="project-title"><%= project %></h2>
        <div class="report-grid">
          <% reports.forEach(r => { %>
            <a href="/<%= r.project %>/<%= r.slug %>" class="report-card">
              <h3 class="report-title"><%= r.title %></h3>
              <% if (r.description) { %>
                <p class="report-desc"><%= r.description %></p>
              <% } %>
              <% if (r.date) { %>
                <time class="report-date"><%= r.date %></time>
              <% } %>
            </a>
          <% }) %>
        </div>
      </section>
    <% }) %>
  </main>
</body>
</html>
```

- [ ] **Step 3: Wire route into app**

Add to `src/app.js` before `module.exports`:

```javascript
app.use('/', require('./routes/index'));
```

- [ ] **Step 4: Test manually**

```bash
REPORTS_DIR=test/fixtures node src/index.js &
curl http://localhost:3000 | head -20
# Expected: HTML with "Test Report Title" listed
kill %1
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.js src/views/index.ejs
git commit -m "feat: add index page with report listing"
```

---

### Task 5: Report Viewer Route + Chrome Template

**Files:**
- Create: `src/routes/reports.js`
- Create: `src/views/report.ejs`

**Interfaces:**
- Consumes: `app.locals.getIndex()`
- Produces: `GET /:project/:slug` renders report with chrome

- [ ] **Step 1: Create src/routes/reports.js**

```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/:project/:slug', (req, res) => {
  const index = req.app.locals.getIndex();
  const report = index.find(
    r => r.project === req.params.project && r.slug === req.params.slug
  );

  if (!report) {
    return res.status(404).render('404', {
      message: `Report "${req.params.project}/${req.params.slug}" not found`,
    });
  }

  let html;
  try {
    html = fs.readFileSync(report.htmlPath, 'utf-8');
  } catch {
    return res.status(404).render('404', {
      message: `Report file missing for "${req.params.project}/${req.params.slug}"`,
    });
  }

  res.render('report', {
    report,
    html,
  });
});

module.exports = router;
```

- [ ] **Step 2: Create src/views/report.ejs**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= report.title %> - Reports</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body class="report-page">
  <header class="report-header">
    <a href="/" class="back-link">&larr; Back to reports</a>
    <span class="report-header-project"><%= report.project %></span>
  </header>
  <main class="report-content">
    <%- html %>
  </main>
</body>
</html>
```

- [ ] **Step 3: Create 404 template**

Create `src/views/404.ejs`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Not Found - Reports</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="header">
    <h1>Not Found</h1>
  </header>
  <main class="content">
    <p><%= message %></p>
    <a href="/" class="back-link">&larr; Back to reports</a>
  </main>
</body>
</html>
```

- [ ] **Step 4: Wire route into app**

Add to `src/app.js` after the index route (`app.use('/', require('./routes/index'));`):

```javascript
app.use('/', require('./routes/reports'));
```

- [ ] **Step 5: Test manually**

```bash
REPORTS_DIR=test/fixtures node src/index.js &
curl http://localhost:3000/test-project/test-report
# Expected: HTML with chrome header + report content
curl http://localhost:3000/test-project/nonexistent
# Expected: 404 HTML
kill %1
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/reports.js src/views/report.ejs src/views/404.ejs
git commit -m "feat: add report viewer with chrome and 404 page"
```

---

### Task 6: CSS Styling (Light Theme)

**Files:**
- Create: `public/style.css`

- [ ] **Step 1: Create public/style.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a2e;
  background: #f8f9fa;
  line-height: 1.6;
}

/* Header */
.header {
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  padding: 1.5rem 2rem;
}

.header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 0.75rem;
}

/* Project nav */
.project-nav {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.project-nav a {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.875rem;
  color: #555;
  text-decoration: none;
  background: #f0f0f0;
  transition: background 0.15s, color 0.15s;
}

.project-nav a:hover { background: #e0e0e0; color: #1a1a2e; }
.project-nav a.active { background: #1a1a2e; color: #fff; }

/* Content area */
.content {
  max-width: 960px;
  margin: 2rem auto;
  padding: 0 2rem;
}

/* Empty state */
.empty-state {
  text-align: center;
  color: #888;
  padding: 3rem 0;
  font-size: 1.125rem;
}

/* Project group */
.project-group { margin-bottom: 2rem; }

.project-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e0e0e0;
}

/* Report card grid */
.report-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.report-card {
  display: block;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.25rem;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.report-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-color: #ccc;
}

.report-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 0.375rem;
}

.report-desc {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.report-date {
  font-size: 0.75rem;
  color: #999;
}

/* Report viewer page */
.report-page { background: #fff; }

.report-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 2rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-link {
  font-size: 0.875rem;
  color: #555;
  text-decoration: none;
  white-space: nowrap;
}

.back-link:hover { color: #1a1a2e; }

.report-header-project {
  font-size: 0.75rem;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.report-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
}

/* 404 page */
body:not(.report-page) .back-link {
  display: inline-block;
  margin-top: 1rem;
  color: #555;
  text-decoration: none;
}

body:not(.report-page) .back-link:hover { color: #1a1a2e; }
```

- [ ] **Step 2: Wire static middleware into app**

Add `express.static` at the end of `src/app.js`, after all routes (so routes take priority over static files):

Add before `module.exports`:
```javascript
app.use(express.static(path.join(__dirname, '..', 'public')));
```

- [ ] **Step 3: Verify styles render**

```bash
REPORTS_DIR=test/fixtures node src/index.js &
curl http://localhost:3000/style.css | head -5
# Expected: CSS content with light colors
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add public/style.css
git commit -m "feat: add light theme CSS"
```

---

### Task 7: Dockerfile + .dockerignore

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ src/
COPY public/ public/

ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/index.js"]
```

- [ ] **Step 2: Create .dockerignore**

```
node_modules/
.git/
test/
docs/
*.md
.gitignore
```

- [ ] **Step 3: Build and verify**

```bash
docker build -t report-server:test .
docker run -d -p 3000:3000 -e REPORTS_DIR=/reports report-server:test
sleep 2
curl http://localhost:3000/health
# Expected: {"status":"ok","reportCount":0}
docker kill $(docker ps -q)
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: add Dockerfile for production image"
```

---

### Task 8: Helm Chart

**Files:**
- Create: `charts/report-server/Chart.yaml`
- Create: `charts/report-server/values.yaml`
- Create: `charts/report-server/templates/deployment.yaml`
- Create: `charts/report-server/templates/service.yaml`
- Create: `charts/report-server/templates/ingress.yaml`

**Notes:** Chart deploys two containers in one pod: the report-server app and a git-sync sidecar.

> **Private repo:** If repo is private, add `GIT_SYNC_USERNAME` and `GIT_SYNC_PASSWORD` env vars from a Kubernetes secret. The spec assumes public repo; auth setup is out of scope.

- [ ] **Step 1: Create _helpers.tpl**

Create `charts/report-server/templates/_helpers.tpl`:
```yaml
{{- define "report-server.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "report-server.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}
```

- [ ] **Step 2: Create Chart.yaml**

```yaml
apiVersion: v2
name: report-server
description: Browseable HTML report server with git-sync sidecar
version: 0.1.0
appVersion: 0.1.0
```

- [ ] **Step 3: Create values.yaml**

```yaml
replicaCount: 1

image:
  repository: docker.io/beingyash/report-server
  tag: latest
  pullPolicy: Always

service:
  port: 3000

ingress:
  host: reports.yash.abyssmallab.in
  className: traefik

gitSync:
  repository: https://github.com/beingyash/report-server.git
  ref: main
  interval: 60

resources:
  limits:
    cpu: 200m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 64Mi
```

- [ ] **Step 4: Create templates/deployment.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "report-server.fullname" . }}
  labels:
    app: {{ include "report-server.name" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ include "report-server.name" . }}
  template:
    metadata:
      labels:
        app: {{ include "report-server.name" . }}
    spec:
      volumes:
        - name: reports
          emptyDir: {}
      containers:
        - name: report-server
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
          env:
            - name: PORT
              value: "{{ .Values.service.port }}"
            - name: REPORTS_DIR
              value: /var/reports/source/reports
          volumeMounts:
            - name: reports
              mountPath: /var/reports
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
        - name: git-sync
          image: registry.k8s.io/git-sync/git-sync:v4.2.1
          env:
            - name: GIT_SYNC_REPO
              value: {{ .Values.gitSync.repository | quote }}
            - name: GIT_SYNC_BRANCH
              value: {{ .Values.gitSync.ref | quote }}
            - name: GIT_SYNC_ROOT
              value: /var/reports
            - name: GIT_SYNC_DEST
              value: source
            - name: GIT_SYNC_WAIT
              value: "{{ .Values.gitSync.interval }}"
            - name: GIT_SYNC_ONE_TIME
              value: "false"
          volumeMounts:
            - name: reports
              mountPath: /var/reports
          resources:
            limits:
              cpu: 100m
              memory: 64Mi
            requests:
              cpu: 50m
              memory: 32Mi
```

- [ ] **Step 5: Create templates/service.yaml**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "report-server.fullname" . }}
spec:
  selector:
    app: {{ include "report-server.name" . }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.port }}
```

- [ ] **Step 6: Create templates/ingress.yaml**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "report-server.fullname" . }}
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: {{ .Values.ingress.className }}
  tls:
    - hosts:
        - {{ .Values.ingress.host }}
      secretName: report-server-tls
  rules:
    - host: {{ .Values.ingress.host }}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ include "report-server.fullname" . }}
                port:
                  number: {{ .Values.service.port }}
```

- [ ] **Step 7: Commit**

```bash
git add charts/
git commit -m "feat: add Helm chart with git-sync sidecar"
```

---

### Task 9: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/deploy.yml`

**Note:** Image tag is based on the git tag (e.g. `v0.1.0`), not `:latest`. Flux ImageUpdateAutomation watches the image repository and rolls out when a new immutable tag appears. Cut a release by pushing a git tag — that triggers this workflow.

- [ ] **Step 1: Create .github/workflows/deploy.yml**

```yaml
name: Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: docker.io/beingyash/report-server:${{ github.ref_name }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add Docker build and push workflow"
```
```
