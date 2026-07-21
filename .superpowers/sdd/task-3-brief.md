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

Modify `src/app.js` to use the indexer and watcher. The current `src/app.js` has:

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

Replace it with:

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
