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

function detectLineStatus(text) {
  const lower = text.toLowerCase();
  if (/✓/.test(text)) return 'good';
  if (/✗|❌/.test(text) || /broken|failed|error|issue/i.test(lower)) return 'bad';
  return 'neutral';
}

function parseSections(md) {
  const lines = md.split('\n');
  let title = '';
  const sections = [];
  let currentSection = null;
  let noteLines = [];

  function flushNote() {
    if (!currentSection || !noteLines.length) return;
    const prevItem = currentSection.items[currentSection.items.length - 1];
    if (prevItem) {
      prevItem.note = (prevItem.note || '') + noteLines.join('\n');
    }
    noteLines = [];
  }

  for (const line of lines) {
    if (/^#\s/.test(line)) {
      title = line.replace(/^#\s+/, '').trim();
    } else if (line.startsWith('## ')) {
      flushNote();
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.slice(3).trim(), items: [] };
    } else if (currentSection) {
      if (/^[-*]\s/.test(line)) {
        flushNote();
        const text = line.replace(/^[-*]\s+/, '').trim();
        if (text) {
          currentSection.items.push({ text, status: detectLineStatus(text) });
        }
      } else if (/^\d+\.\s/.test(line)) {
        flushNote();
        const text = line.replace(/^\d+\.\s+/, '').trim();
        if (text) {
          currentSection.items.push({ text, status: 'pending' });
        }
      } else {
        const trimmed = line.trim();
        if (trimmed) noteLines.push(trimmed);
        else flushNote();
      }
    }
  }
  flushNote();
  if (currentSection) sections.push(currentSection);

  return { title, sections };
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

function renderSectionCard(section) {
  let goodCount = 0;
  let badCount = 0;
  for (const item of section.items) {
    if (item.status === 'good') goodCount++;
    else if (item.status === 'bad') badCount++;
  }

  const borderColor = badCount > 0 ? '#e74c3c'
    : goodCount > 0 && goodCount === section.items.length ? '#27ae60'
    : '#3498db';

  const itemsHtml = section.items.map((item, i) => {
    const icon = item.status === 'good' ? '&#x2713;'
      : item.status === 'bad' ? '&#x2717;'
      : '&#x25CB;';
    const cls = item.status === 'good' ? 'dot-good' : item.status === 'bad' ? 'dot-bad' : '';
    const note = item.note ? `<p class="note">${inlineFormat(escape(item.note))}</p>` : '';
    return `<li><span class="dot ${cls}">${icon}</span> ${inlineFormat(escape(item.text))}${note}</li>`;
  }).join('\n');

  return `<section class="card" style="border-left-color: ${borderColor}">
    <h2>${escape(section.title)}</h2>
    <ul>${itemsHtml}</ul>
  </section>`;
}

function generateStatusHtml(project, stateMd) {
  const date = stateMd.mtime.toISOString().split('T')[0];
  const parsed = stateMd.content ? parseSections(stateMd.content) : null;

  let totalGood = 0;
  let totalBad = 0;
  let totalPending = 0;

  if (parsed) {
    for (const section of parsed.sections) {
      for (const item of section.items) {
        if (item.status === 'good') totalGood++;
        else if (item.status === 'bad') totalBad++;
        else totalPending++;
      }
    }
  }

  const badges = [];
  if (totalGood) badges.push(`<span class="badge badge-good">${totalGood} OK</span>`);
  if (totalBad) badges.push(`<span class="badge badge-bad">${totalBad} Issues</span>`);
  if (totalPending) badges.push(`<span class="badge badge-pending">${totalPending} Pending</span>`);

  const sectionCards = parsed
    ? parsed.sections.map(s => renderSectionCard(s)).join('\n')
    : '<p class="empty">No content</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escape(project)} — Project Status</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; background: #f5f6f8; }
  header { background: #fff; padding: 1.5rem; border-radius: 10px; margin-bottom: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  header h1 { font-size: 1.4rem; color: #111; margin-bottom: 0.3rem; }
  .meta { color: #888; font-size: 0.82rem; margin-bottom: 0.75rem; }
  .badges { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .badge { padding: 0.25em 0.7em; border-radius: 14px; font-size: 0.78rem; font-weight: 600; line-height: 1.4; }
  .badge-good { background: #d4edda; color: #155724; }
  .badge-bad { background: #f8d7da; color: #721c24; }
  .badge-pending { background: #d1ecf1; color: #0c5460; }

  .card { background: #fff; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1rem; border-left: 4px solid #ddd; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .card h2 { font-size: 1.05rem; color: #333; margin-bottom: 0.75rem; }
  .card ul { list-style: none; }
  .card li { padding: 0.4rem 0; font-size: 0.92rem; color: #444; border-bottom: 1px solid #f2f2f2; }
  .card li:last-child { border-bottom: none; }

  .dot { margin-right: 0.45rem; font-size: 0.85rem; }
  .dot-good { color: #27ae60; font-weight: 700; }
  .dot-bad { color: #e74c3c; font-weight: 700; }

  .note { font-size: 0.82rem; color: #888; margin-top: 0.25rem; margin-left: 1.1rem; }

  code { background: #eee; padding: 0.12em 0.4em; border-radius: 3px; font-size: 0.9em; }
  strong { color: #222; }
  .empty { color: #888; font-style: italic; text-align: center; padding: 2rem; }
</style>
</head>
<body>
<header>
  <h1>${escape(project)}</h1>
  <div class="meta">Last updated ${date}</div>
  <div class="badges">${badges.join('\n')}</div>
</header>
${sectionCards}
</body>
</html>`;
}

function generateAll(opts) {
  const projectsDir = opts.projectsDir || PROJECTS_DIR;
  const repoDir = opts.repoDir || REPO_DIR;
  const projects = listProjects(projectsDir);
  const projectsData = [];

  for (const project of projects) {
    const stateMd = readStateMd(projectsDir, project);
    if (!stateMd) continue;

    const reportDir = path.join(repoDir, 'reports', project, 'status');
    fs.mkdirSync(reportDir, { recursive: true });

    const html = generateStatusHtml(project, stateMd);
    fs.writeFileSync(path.join(reportDir, 'index.html'), html);

    // Count health from parsed content
    let goodCount = 0, badCount = 0, pendingCount = 0;
    const parsed = stateMd.content ? parseSections(stateMd.content) : null;
    if (parsed) {
      for (const section of parsed.sections) {
        for (const item of section.items) {
          if (item.status === 'good') goodCount++;
          else if (item.status === 'bad') badCount++;
          else pendingCount++;
        }
      }
    }

    const reportMeta = {
      title: `${project} Status`,
      project,
      date: new Date().toISOString().split('T')[0],
      status: { good: goodCount, bad: badCount, pending: pendingCount },
    };
    fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(reportMeta, null, 2) + '\n');

    projectsData.push({ project, good: goodCount, bad: badCount, pending: pendingCount, date: reportMeta.date, title: reportMeta.title });
  }

  generateRootIndex(repoDir, projectsData);

  if (!opts.skipGit) {
    commitAndPush(repoDir, projectsData.map(p => p.project));
  }

  return projectsData;
}

function commitAndPush(repoDir, projects) {
  if (projects.length === 0) {
    console.log('No projects with STATE.md found.');
    return;
  }

  const paths = [...projects.map(p => `reports/${p}/status/`), 'index.html'];

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
  const projectNames = projects.map(p => p.project);
  console.log(`Generated status for: ${projectNames.join(', ') || 'none'}`);

  for (const p of projects) {
    console.log(`https://reports.yash.abysmallab.in/${p.project}/status/`);
  }
}

function generateRootIndex(repoDir, projectsData) {
  const totalGood = projectsData.reduce((s, p) => s + p.good, 0);
  const totalBad = projectsData.reduce((s, p) => s + p.bad, 0);
  const totalPending = projectsData.reduce((s, p) => s + p.pending, 0);
  const count = projectsData.length;
  const latestDate = projectsData.map(p => p.date).sort().reverse()[0] || '';

  const cardsHtml = projectsData.map(p => {
    const borderColor = p.bad > 0 ? '#e5484d' : p.pending > 0 ? '#5b8def' : '#30a46c';
    return `<a href="/${p.project}/status/" class="card" style="border-left-color: ${borderColor}; text-decoration: none; color: inherit;">
      <h2>${escape(p.project)}</h2>
      <p class="meta">Last updated ${p.date}</p>
      <div class="status-row">
        ${p.good > 0 ? `<span class="badge badge-good">${p.good} OK</span>` : ''}
        ${p.bad > 0 ? `<span class="badge badge-bad">${p.bad} Issue${p.bad > 1 ? 's' : ''}</span>` : ''}
        ${p.pending > 0 ? `<span class="badge badge-pending">${p.pending} Pending</span>` : ''}
      </div>
    </a>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Infra Status</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f1115; color: #e6e8eb; min-height: 100vh; }
  .container { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
  header { margin-bottom: 2rem; }
  header h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  .subtitle { color: #9aa0a8; font-size: 0.875rem; }
  .summary-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
  .badge { padding: 0.25em 0.7em; border-radius: 14px; font-size: 0.78rem; font-weight: 600; line-height: 1.4; display: inline-block; }
  .badge-good { background: #30a46c22; color: #30a46c; border: 1px solid #30a46c44; }
  .badge-bad { background: #e5484d22; color: #e5484d; border: 1px solid #e5484d44; }
  .badge-pending { background: #5b8def22; color: #5b8def; border: 1px solid #5b8def44; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
  .card { background: #181b21; border-radius: 10px; padding: 1.25rem 1.5rem; border-left: 4px solid #2a2f37; box-shadow: 0 1px 2px rgba(0,0,0,.4); transition: box-shadow 0.15s, transform 0.15s; }
  .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.35); transform: translateY(-2px); }
  .card h2 { font-size: 1.05rem; color: #e6e8eb; margin-bottom: 0.3rem; }
  .meta { color: #9aa0a8; font-size: 0.82rem; margin-bottom: 0.75rem; }
  .status-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .empty { color: #9aa0a8; text-align: center; padding: 3rem; }
  .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #2a2f37; text-align: center; }
  .footer a { color: #5b8def; text-decoration: none; font-size: 0.875rem; }
  .footer a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Infra Status</h1>
    <p class="subtitle">${count} project${count > 1 ? 's' : ''} — updated ${latestDate}</p>
    <div class="summary-row">
      ${totalGood > 0 ? `<span class="badge badge-good">${totalGood} OK</span>` : ''}
      ${totalBad > 0 ? `<span class="badge badge-bad">${totalBad} Issue${totalBad > 1 ? 's' : ''}</span>` : ''}
      ${totalPending > 0 ? `<span class="badge badge-pending">${totalPending} Pending</span>` : ''}
    </div>
  </header>
  ${projectsData.length > 0
    ? `<div class="grid">${cardsHtml}</div>`
    : '<p class="empty">No projects with STATE.md found.</p>'}
  <div class="footer">
    <a href="/reports/">View reports listing &raquo;</a>
  </div>
</div>
</body>
</html>`;

  fs.writeFileSync(path.join(repoDir, 'index.html'), html);
}

module.exports = { listProjects, readStateMd, parseSections, detectLineStatus, renderSectionCard, generateStatusHtml, generateAll, generateRootIndex };
