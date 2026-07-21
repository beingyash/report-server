const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  listProjects,
  readStateMd,
  parseSections,
  detectLineStatus,
  renderSectionCard,
  generateStatusHtml,
  generateAll,
} = require('../scripts/generate-status-report');

describe('listProjects', () => {
  it('returns sorted directory names, skips dotfiles', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'status-test-'));
    fs.mkdirSync(path.join(tmp, 'alpha'));
    fs.mkdirSync(path.join(tmp, 'beta'));
    fs.writeFileSync(path.join(tmp, 'file.txt'), 'x');
    fs.mkdirSync(path.join(tmp, '.hidden'));

    const result = listProjects(tmp);
    assert.deepStrictEqual(result, ['alpha', 'beta']);
    fs.rmSync(tmp, { recursive: true });
  });
});

describe('readStateMd', () => {
  it('reads STATE.md content and mtime', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'status-test-'));
    const proj = path.join(tmp, 'testproj');
    fs.mkdirSync(proj);
    fs.writeFileSync(path.join(proj, 'STATE.md'), '## Status\n- Active');

    const result = readStateMd(tmp, 'testproj');
    assert.ok(result);
    assert.strictEqual(result.content, '## Status\n- Active');
    assert.ok(result.mtime instanceof Date);
    fs.rmSync(tmp, { recursive: true });
  });

  it('returns null when no STATE.md', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'status-test-'));
    const proj = path.join(tmp, 'empty');
    fs.mkdirSync(proj);
    assert.strictEqual(readStateMd(tmp, 'empty'), null);
    fs.rmSync(tmp, { recursive: true });
  });
});

describe('detectLineStatus', () => {
  it('detects good from checkmark', () => {
    assert.strictEqual(detectLineStatus('thing ✓'), 'good');
  });
  it('detects bad from broken/keywords', () => {
    assert.strictEqual(detectLineStatus('flux is broken'), 'bad');
    assert.strictEqual(detectLineStatus('build failed'), 'bad');
    assert.strictEqual(detectLineStatus('known issue'), 'bad');
    assert.strictEqual(detectLineStatus('connection error'), 'bad');
  });
  it('returns neutral otherwise', () => {
    assert.strictEqual(detectLineStatus('some status'), 'neutral');
  });
});

describe('parseSections', () => {
  it('parses title and sections with items', () => {
    const md = '# My Project\n\n## Deployed\n- running ✓\n- v1.0 live\n\n## Known Issues\n- flux broken';
    const result = parseSections(md);
    assert.strictEqual(result.title, 'My Project');
    assert.strictEqual(result.sections.length, 2);
    assert.strictEqual(result.sections[0].title, 'Deployed');
    assert.strictEqual(result.sections[0].items.length, 2);
    assert.strictEqual(result.sections[0].items[0].status, 'good');
    assert.strictEqual(result.sections[1].items[0].status, 'bad');
  });

  it('parses numbered items as pending', () => {
    const md = '# Test\n\n## Next\n1. Fix bug\n2. Deploy';
    const result = parseSections(md);
    assert.strictEqual(result.sections[0].items[0].status, 'pending');
    assert.strictEqual(result.sections[0].items[1].status, 'pending');
  });
});

describe('renderSectionCard', () => {
  it('renders card with items and color border', () => {
    const section = {
      title: 'Deployed',
      items: [
        { text: 'chart **v1** deployed ✓', status: 'good' },
        { text: 'flux broken', status: 'bad' },
      ],
    };
    const html = renderSectionCard(section);
    assert(html.includes('<h2>Deployed</h2>'));
    assert(html.includes('dot-good'));
    assert(html.includes('dot-bad'));
    assert(html.includes('border-left-color: #e74c3c'));
  });

  it('uses green border when all items good', () => {
    const section = {
      title: 'Healthy',
      items: [{ text: 'running ✓', status: 'good' }],
    };
    const html = renderSectionCard(section);
    assert(html.includes('#27ae60'));
  });
});

describe('generateStatusHtml', () => {
  it('includes project name, date, badges, and cards', () => {
    const stateMd = {
      content: '# Jane\n\n## Deployed\n- running ✓\n\n## Issues\n- flux broken',
      mtime: new Date('2026-07-21'),
    };
    const html = generateStatusHtml('jane', stateMd);
    assert(html.includes('<h1>jane</h1>'));
    assert(html.includes('2026-07-21'));
    assert(html.includes('1 OK'));
    assert(html.includes('1 Issues'));
    assert(html.includes('dot-good'));
    assert(html.includes('dot-bad'));
  });

  it('handles empty content', () => {
    const stateMd = { content: '', mtime: new Date('2026-07-21') };
    const html = generateStatusHtml('empty', stateMd);
    assert(html.includes('empty'));
    assert(html.includes('2026-07-21'));
  });
});

describe('generateAll integration', () => {
  it('writes status reports for projects with STATE.md', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'status-test-'));
    const reportsDir = path.join(tmp, 'report-server', 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });

    const projectsDir = path.join(tmp, 'projects');
    const proj = path.join(projectsDir, 'myproject');
    fs.mkdirSync(proj, { recursive: true });
    fs.writeFileSync(path.join(proj, 'STATE.md'), '# My Project\n\n## Status\n- active ✓');

    const emptyProj = path.join(projectsDir, 'empty');
    fs.mkdirSync(emptyProj);

    const result = generateAll({
      projectsDir,
      repoDir: path.join(tmp, 'report-server'),
      skipGit: true,
    });

    assert.deepStrictEqual(result, ['myproject']);

    const statusDir = path.join(reportsDir, 'myproject', 'status');
    const html = fs.readFileSync(path.join(statusDir, 'index.html'), 'utf-8');
    assert(html.includes('myproject'));
    assert(html.includes('1 OK'));
    assert(html.includes('dot-good'));

    const meta = JSON.parse(fs.readFileSync(path.join(statusDir, 'report.json'), 'utf-8'));
    assert.strictEqual(meta.project, 'myproject');

    fs.rmSync(tmp, { recursive: true });
  });
});
