### Task 5: Report Viewer Route + Chrome Template

**Files:**
- Create: `src/routes/reports.js`
- Create: `src/views/report.ejs`
- Create: `src/views/404.ejs`

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
