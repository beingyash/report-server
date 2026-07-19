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
