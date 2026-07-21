const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function slugify(str) {
  const result = str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .split('-')
    .filter(Boolean)
    .slice(0, 3)
    .join('-');
  return result || 'report';
}

function findAvailableDir(baseDir, slug) {
  let dir = path.join(baseDir, slug);
  if (!fs.existsSync(dir)) return dir;
  for (let i = 1; i < 100; i++) {
    dir = path.join(baseDir, `${slug}-${i}`);
    if (!fs.existsSync(dir)) return dir;
  }
  throw new Error(`Cannot find available slug after 99 attempts for: ${slug}`);
}

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf-8');
  const match = content.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : path.basename(htmlPath, '.html');
}

function detectProject(cwd) {
  return path.basename(path.resolve(cwd));
}

function gitInRepo(repoPath, ...args) {
  const result = spawnSync('git', ['-C', repoPath, ...args], { encoding: 'utf-8', stdio: 'pipe' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git failed: ${result.stderr}`);
  return result.stdout;
}

async function publish(opts) {
  const htmlPath = path.resolve(opts.htmlPath);
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTML file not found: ${htmlPath}`);
  }

  const repoPath = opts.repoPath
    ? path.resolve(opts.repoPath)
    : path.resolve(process.cwd(), '..', 'report-server');

  const project = opts.project || detectProject(process.cwd());
  const title = opts.title || extractTitle(htmlPath);
  const slug = opts.slug || slugify(title);
  const reportsDir = path.join(repoPath, 'reports', project);
  const reportDir = findAvailableDir(reportsDir, slug);
  const finalSlug = path.basename(reportDir);

  fs.mkdirSync(reportDir, { recursive: true });

  const destHtml = path.join(reportDir, 'index.html');
  fs.copyFileSync(htmlPath, destHtml);

  const reportMeta = {
    title,
    project,
    date: new Date().toISOString().split('T')[0],
  };
  fs.writeFileSync(
    path.join(reportDir, 'report.json'),
    JSON.stringify(reportMeta, null, 2) + '\n'
  );

  let commitSha = null;
  try {
    gitInRepo(repoPath, 'add', `reports/${project}/${finalSlug}/`);
    const msg = `report(${project}): ${finalSlug}`;
    gitInRepo(repoPath, 'commit', '-m', msg);
    commitSha = gitInRepo(repoPath, 'rev-parse', 'HEAD').trim();
    try {
      gitInRepo(repoPath, 'push');
    } catch (pushErr) {
      console.error(`Push failed (report written locally): ${pushErr.message}`);
      console.error(`Retry: cd "${repoPath}" && git push`);
    }
  } catch (commitErr) {
    console.error(`Commit failed (report written locally): ${commitErr.message}`);
  }

  const host = 'https://reports.yash.abysmallab.in';
  const url = `${host}/${project}/${finalSlug}/`;

  return { project, slug: finalSlug, url, commitSha };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const htmlPath = args.find(a => !a.startsWith('--'));
  const title = parseArg(args, '--title');
  const slug = parseArg(args, '--slug');
  const project = parseArg(args, '--project');
  const repoPath = parseArg(args, '--repo-path');

  if (!htmlPath) {
    console.error('Usage: node scripts/publish.js <html-path> [--title "..." --slug "..." --project "..." --repo-path "..."]');
    process.exit(1);
  }

  function parseArg(args, key) {
    const idx = args.indexOf(key);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return undefined;
  }

  publish({ htmlPath, title, slug, project, repoPath })
    .then(result => {
      console.log(`Published: ${result.url}`);
      if (result.commitSha) {
        console.log(`Commit: ${result.commitSha}`);
      }
    })
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = { publish, slugify, extractTitle, detectProject, findAvailableDir };
