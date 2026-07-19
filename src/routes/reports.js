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
