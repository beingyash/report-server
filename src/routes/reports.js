const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/reports', (req, res) => {
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
