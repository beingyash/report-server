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
