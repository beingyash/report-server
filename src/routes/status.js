const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/status', (req, res) => {
  const reportsDir = process.env.REPORTS_DIR || '/reports';

  let statusReports = [];
  try {
    const projects = fs.readdirSync(reportsDir, { withFileTypes: true });
    for (const projectDir of projects) {
      if (!projectDir.isDirectory()) continue;
      const metaPath = path.join(reportsDir, projectDir.name, 'status', 'report.json');
      const htmlPath = path.join(reportsDir, projectDir.name, 'status', 'index.html');
      if (!fs.existsSync(metaPath) || !fs.existsSync(htmlPath)) continue;

      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const html = fs.readFileSync(htmlPath, 'utf-8');
        // Extract body content for inline embedding
        const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/i);
        const bodyContent = bodyMatch ? bodyMatch[1].trim() : '';
        statusReports.push({
          project: projectDir.name,
          title: meta.title || `${projectDir.name} Status`,
          date: meta.date || null,
          status: meta.status || { good: 0, bad: 0, pending: 0 },
          html: bodyContent,
        });
      } catch (err) {
        console.warn(`Failed to read status for ${projectDir.name}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`Failed to scan reports directory: ${err.message}`);
  }

  statusReports.sort((a, b) => {
    if (a.project < b.project) return -1;
    if (a.project > b.project) return 1;
    return 0;
  });

  const overallBad = statusReports.reduce((sum, r) => sum + r.status.bad, 0);
  const overallOk = statusReports.reduce((sum, r) => sum + r.status.good, 0);
  const overallPending = statusReports.reduce((sum, r) => sum + r.status.pending, 0);

  res.render('status', {
    reports: statusReports,
    overallOk,
    overallBad,
    overallPending,
  });
});

module.exports = router;
