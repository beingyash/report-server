const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const { slugify, extractTitle, detectProject, findAvailableDir, publish } = require('../scripts/publish');

describe('slugify', () => {
  it('truncates to 3 hyphen-separated words', () => {
    assert.strictEqual(slugify('K8s Upgrade Audit Report'), 'k8s-upgrade-audit');
  });

  it('handles special characters', () => {
    assert.strictEqual(slugify('Hello World! Test?'), 'hello-world-test');
  });

  it('handles single word', () => {
    assert.strictEqual(slugify('Hello'), 'hello');
  });
});

describe('extractTitle', () => {
  it('extracts from html title tag', () => {
    const tmp = path.join(os.tmpdir(), 'test-extract-title.html');
    fs.writeFileSync(tmp, '<html><head><title>My Test Report</title></head><body>Hello</body></html>');
    assert.strictEqual(extractTitle(tmp), 'My Test Report');
    fs.unlinkSync(tmp);
  });

  it('falls back to filename when no title tag', () => {
    const tmp = path.join(os.tmpdir(), 'my-report.html');
    fs.writeFileSync(tmp, '<html><body>Hello</body></html>');
    assert.strictEqual(extractTitle(tmp), 'my-report');
    fs.unlinkSync(tmp);
  });
});

describe('detectProject', () => {
  it('returns basename of cwd', () => {
    const result = detectProject(path.join('home', 'projects', 'jane'));
    assert.strictEqual(result, 'jane');
  });
});

describe('findAvailableDir', () => {
  it('returns slug when dir does not exist', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-test-'));
    const result = findAvailableDir(tmp, 'my-slug');
    assert.strictEqual(result, path.join(tmp, 'my-slug'));
    fs.rmdirSync(tmp, { recursive: true });
  });

  it('increments suffix on collision', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-test-'));
    fs.mkdirSync(path.join(tmp, 'my-slug'));
    const result = findAvailableDir(tmp, 'my-slug');
    assert.strictEqual(result, path.join(tmp, 'my-slug-1'));
    fs.rmSync(tmp, { recursive: true });
  });
});

describe('publish integration', () => {
  it('writes files to reports directory', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-int-'));
    const htmlPath = path.join(tmpDir, 'test.html');
    fs.writeFileSync(htmlPath, '<html><head><title>Integration Test</title></head><body>Hello</body></html>');

    // init a minimal git repo for the fake report-server
    const fakeRepo = path.join(tmpDir, 'fake-repo');
    fs.mkdirSync(path.join(fakeRepo, 'reports'), { recursive: true });
    execSync('git init', { cwd: fakeRepo, stdio: 'pipe' });
    execSync('git config user.email test@test.com', { cwd: fakeRepo, stdio: 'pipe' });
    execSync('git config user.name Test', { cwd: fakeRepo, stdio: 'pipe' });

    const result = await publish({
      htmlPath,
      title: 'Integration Test',
      project: 'test-project',
      repoPath: fakeRepo,
    });

    assert.strictEqual(result.project, 'test-project');
    assert.strictEqual(result.slug, 'integration-test');
    assert(result.url.includes('test-project/integration-test'));

    const reportDir = path.join(fakeRepo, 'reports', 'test-project', 'integration-test');
    assert.ok(fs.existsSync(path.join(reportDir, 'index.html')));
    assert.ok(fs.existsSync(path.join(reportDir, 'report.json')));

    const meta = JSON.parse(fs.readFileSync(path.join(reportDir, 'report.json'), 'utf-8'));
    assert.strictEqual(meta.title, 'Integration Test');
    assert.strictEqual(meta.project, 'test-project');
    assert.strictEqual(typeof meta.date, 'string');

    fs.rmSync(tmpDir, { recursive: true });
  });
});
