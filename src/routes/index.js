const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
  const index = req.app.locals.getIndex();
  const { project } = req.query;
  const reportsDir = process.env.REPORTS_DIR || '/reports';

  let grouped = {};
  for (const report of index) {
    if (project && report.project !== project) continue;
    if (!grouped[report.project]) {
      grouped[report.project] = [];
    }
    grouped[report.project].push(report);
  }

  // Check which projects have status reports
  const hasStatus = {};
  try {
    const projectsInDir = fs.readdirSync(reportsDir, { withFileTypes: true });
    for (const p of projectsInDir) {
      if (p.isDirectory() && fs.existsSync(path.join(reportsDir, p.name, 'status', 'report.json'))) {
        hasStatus[p.name] = true;
      }
    }
  } catch {}

  res.render('index', {
    grouped,
    activeProject: project || null,
    projects: [...new Set(index.map(r => r.project))].sort(),
    hasStatus,
  });
});

module.exports = router;
