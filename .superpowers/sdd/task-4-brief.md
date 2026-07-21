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
