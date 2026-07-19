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
