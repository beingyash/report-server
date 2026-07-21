const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECTS_DIR = path.resolve(__dirname, '..', '..');
const REPO_DIR = path.resolve(__dirname, '..');

function listProjects(projectsDir) {
  return fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)
    .sort();
}

function readStateMd(projectsDir, project) {
  const p = path.join(projectsDir, project, 'STATE.md');
  if (!fs.existsSync(p)) return null;
  return {
    content: fs.readFileSync(p, 'utf-8').trim(),
    mtime: fs.statSync(p).mtime,
  };
}

function markdownToHtml(md) {
  let html = '';
  const lines = md.split('\n');

  for (const line of lines) {
    if (/^#{3,6}\s/.test(line)) {
      const m = line.match(/^(#{3,6})\s(.+)/);
      const level = m[1].length;
      html += `<h${level}>${escape(m[2])}</h${level}>\n`;
    } else if (/^##\s/.test(line)) {
      html += `<h2>${escape(line.slice(3))}</h2>\n`;
    } else if (/^#\s/.test(line)) {
      html += `<h1>${escape(line.slice(2))}</h1>\n`;
    } else if (/^[-*]\s/.test(line)) {
      html += `<li>${inlineFormat(escape(line.replace(/^[-*]\s/, '')))}</li>\n`;
    } else if (/^\d+\.\s/.test(line)) {
      html += `<li>${inlineFormat(escape(line.replace(/^\d+\.\s/, '')))}</li>\n`;
    } else if (line.trim() === '') {
      html += '\n';
    } else if (line.startsWith('```')) {
      html += html.endsWith('</pre>\n') ? '' : '<pre>';
    } else {
      html += `<p>${inlineFormat(escape(line))}</p>\n`;
    }
  }

  html = html
    .replace(/<li>/g, '<ul>\n<li>')
    .replace(/<\/li>\n(?!<li>|<\/ul>)/g, '</li>\n</ul>\n')
    .replace(/<\/li>\n<li>/g, '</li>\n<li>')
    .replace(/<\/li>\n$/g, '</li>\n</ul>\n');

  return html;
}

function escape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineFormat(str) {
  return str
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function generateStatusHtml(project, stateMd) {
  const date = stateMd.mtime.toISOString().split('T')[0];
  const bodyHtml = stateMd.content ? markdownToHtml(stateMd.content) : '<p>No content</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${project} — Project Status</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; background: #fff; }
  h1 { border-bottom: 2px solid #e5e5e5; padding-bottom: 0.5rem; }
  .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
  code { background: #f0f0f0; padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.9em; }
  pre { background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow-x: auto; }
</style>
</head>
<body>
<h1>${escape(project)} — Project Status</h1>
<p class="meta">Last updated: ${date}</p>
${bodyHtml}
</body>
</html>`;
}

function generateAll(opts) {
  const projectsDir = opts.projectsDir || PROJECTS_DIR;
  const repoDir = opts.repoDir || REPO_DIR;
  const projects = listProjects(projectsDir);
  const generated = [];

  for (const project of projects) {
    const stateMd = readStateMd(projectsDir, project);
    if (!stateMd) continue;

    const reportDir = path.join(repoDir, 'reports', project, 'status');
    fs.mkdirSync(reportDir, { recursive: true });

    const html = generateStatusHtml(project, stateMd);
    fs.writeFileSync(path.join(reportDir, 'index.html'), html);

    const reportMeta = {
      title: `${project} Status`,
      project,
      date: new Date().toISOString().split('T')[0],
    };
    fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(reportMeta, null, 2) + '\n');

    generated.push(project);
  }

  if (!opts.skipGit) {
    commitAndPush(repoDir, generated);
  }

  return generated;
}

function commitAndPush(repoDir, projects) {
  if (projects.length === 0) {
    console.log('No projects with STATE.md found.');
    return;
  }

  const paths = projects.map(p => `reports/${p}/status/`);

  try {
    spawnSync('git', ['-C', repoDir, 'add', ...paths], { encoding: 'utf-8', stdio: 'pipe' });
    const msg = `status: update project status for ${projects.join(', ')}`;
    const commit = spawnSync('git', ['-C', repoDir, 'commit', '-m', msg], { encoding: 'utf-8', stdio: 'pipe' });
    if (commit.status !== 0 && !commit.stderr.includes('nothing to commit')) {
      throw new Error(commit.stderr);
    }

    const push = spawnSync('git', ['-C', repoDir, 'push'], { encoding: 'utf-8', stdio: 'pipe' });
    if (push.status !== 0) {
      console.error(`Push failed (reports written locally): ${push.stderr}`);
      console.error(`Retry: cd "${repoDir}" && git push`);
    }
  } catch (err) {
    console.error(`Commit failed (reports written locally): ${err.message}`);
  }
}

if (require.main === module) {
  console.log('Scanning projects...');
  const projects = generateAll({});
  console.log(`Generated status for: ${projects.join(', ') || 'none'}`);

  for (const p of projects) {
    console.log(`https://reports.yash.abysmallab.in/${p}/status/`);
  }
}

module.exports = { listProjects, readStateMd, markdownToHtml, generateStatusHtml, generateAll };
