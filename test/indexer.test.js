const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { buildIndex } = require('../src/indexer');

describe('indexer', () => {
  it('builds index from reports directory', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const index = buildIndex(fixtures);
    const report = index.find(r => r.slug === 'test-report');

    assert(report);
    assert.strictEqual(report.project, 'test-project');
    assert.strictEqual(report.slug, 'test-report');
    assert.strictEqual(report.title, 'Test Report Title');
    assert.strictEqual(report.description, 'A test report description');
    assert.strictEqual(report.date, '2026-07-19');
    assert.deepStrictEqual(report.tags, ['test', 'fixture']);
  });

  it('returns empty array for empty directory', () => {
    const emptyDir = path.join(__dirname, 'fixtures', 'empty');
    const index = buildIndex(emptyDir);
    assert.deepStrictEqual(index, []);
  });

  it('handles report without report.json', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const index = buildIndex(fixtures);
    const report = index.find(r => r.slug === 'no-meta-report');
    assert(report);
    assert.strictEqual(report.title, 'no-meta-report');
    assert.strictEqual(report.description, '');
  });
});
