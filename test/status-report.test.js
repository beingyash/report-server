const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  listProjects,
  readStateMd,
  markdownToHtml,
  generateStatusHtml,
  generateAll,
} = require('../scripts/generate-status-report');

describe('listProjects', () => {
  it('returns sorted directory names', () => {
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
    fs.writeFileSync(path.join(proj, 'STATE.md'), '## Status\nActive');

    const result = readStateMd(tmp, 'testproj');
    assert.ok(result);
    assert.strictEqual(result.content, '## Status\nActive');
    assert.ok(result.mtime instanceof Date);
    fs.rmSync(tmp, { recursive: true });
  });

  it('returns null when no STATE.md exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'status-test-'));
    const proj = path.join(tmp, 'emptyproj');
    fs.mkdirSync(proj);

    const result = readStateMd(tmp, 'emptyproj');
    assert.strictEqual(result, null);
    fs.rmSync(tmp, { recursive: true });
  });
});

describe('markdownToHtml', () => {
  it('converts headers', () => {
    const result = markdownToHtml('# Title\n## Section\n### Sub');
    assert(result.includes('<h1>Title</h1>'));
    assert(result.includes('<h2>Section</h2>'));
    assert(result.includes('<h3>Sub</h3>'));
  });

  it('converts bold and code', () => {
    const result = markdownToHtml('**bold** and `code`');
    assert(result.includes('<strong>bold</strong>'));
    assert(result.includes('<code>code</code>'));
  });

  it('converts links', () => {
    const result = markdownToHtml('[click here](https://example.com)');
    assert(result.includes('<a href="https://example.com">click here</a>'));
  });

  it('escapes HTML', () => {
    const result = markdownToHtml('<script>alert(1)</script>');
    assert(!result.includes('<script>'));
    assert(result.includes('&lt;script&gt;'));
  });
});

describe('generateStatusHtml', () => {
  it('includes project name, date, and content', () => {
    const stateMd = { content: '## Active\nRunning', mtime: new Date('2026-07-21') };
    const html = generateStatusHtml('jane', stateMd);
    assert(html.includes('jane'));
    assert(html.includes('2026-07-21'));
    assert(html.includes('<h2>Active</h2>'));
    assert(html.includes('<p>Running</p>'));
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
    fs.writeFileSync(path.join(proj, 'STATE.md'), '# My Project\nActive');

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
    assert(html.includes('My Project'));
    assert(html.includes('<h1>My Project</h1>'));

    const meta = JSON.parse(fs.readFileSync(path.join(statusDir, 'report.json'), 'utf-8'));
    assert.strictEqual(meta.title, 'myproject Status');
    assert.strictEqual(meta.project, 'myproject');

    fs.rmSync(tmp, { recursive: true });
  });
});
