import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { discoverPlugins } from '../discovery.js';

let tmpDir: string;

function writePlugin(relativePath: string, manifest: Record<string, unknown>, extra?: Record<string, unknown>): void {
  const dir = path.join(tmpDir, relativePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: `@test/${relativePath.replace(/\//g, '-')}`, version: '1.0.0', junctionrelay: manifest, ...extra }),
  );
}

const VALID_MANIFEST = {
  type: 'element',
  entry: 'dist/index.js',
  elementType: 'stock-ticker',
  displayName: 'Stock Ticker',
  description: 'Shows stock prices',
  category: 'Data',
  icon: 'TrendingUp',
  sensorBound: true,
  defaultSize: { width: 300, height: 80 },
  defaultProperties: { sensorTag: '' },
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'element-discovery-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('discoverPlugins', () => {
  it('discovers a plugin in a direct subdirectory', () => {
    writePlugin('stock-ticker', VALID_MANIFEST);
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins.length, 1);
    assert.equal(result.plugins[0].manifest.elementType, 'stock-ticker');
    assert.equal(result.skipped.length, 0);
  });

  it('discovers scoped packages in node_modules/@junctionrelay/element-*', () => {
    writePlugin('node_modules/@junctionrelay/element-gauge', {
      ...VALID_MANIFEST,
      elementType: 'custom-gauge',
      displayName: 'Custom Gauge',
    });
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins.length, 1);
    assert.equal(result.plugins[0].manifest.elementType, 'custom-gauge');
  });

  it('discovers unscoped packages in node_modules/junctionrelay-element-*', () => {
    writePlugin('node_modules/junctionrelay-element-clock', {
      ...VALID_MANIFEST,
      elementType: 'fancy-clock',
      displayName: 'Fancy Clock',
    });
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins.length, 1);
    assert.equal(result.plugins[0].manifest.elementType, 'fancy-clock');
  });

  it('discovers plugins from all three locations', () => {
    writePlugin('my-element', { ...VALID_MANIFEST, elementType: 'el-one', displayName: 'One' });
    writePlugin('node_modules/@junctionrelay/element-two', { ...VALID_MANIFEST, elementType: 'el-two', displayName: 'Two' });
    writePlugin('node_modules/junctionrelay-element-three', { ...VALID_MANIFEST, elementType: 'el-three', displayName: 'Three' });
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins.length, 3);
  });

  it('skips directories without package.json', () => {
    fs.mkdirSync(path.join(tmpDir, 'empty-dir'), { recursive: true });
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins.length, 0);
    assert.equal(result.skipped.length, 0); // no package.json = silently ignored
  });

  it('skips packages without junctionrelay field', () => {
    const dir = path.join(tmpDir, 'no-manifest');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'foo', version: '1.0.0' }));
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins.length, 0);
    assert.equal(result.skipped.length, 0); // no junctionrelay field = silently ignored
  });

  it('skips collector plugins', () => {
    writePlugin('some-collector', { type: 'collector', entry: 'dist/index.js' });
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins.length, 0);
    assert.equal(result.skipped.length, 0); // wrong type = silently ignored
  });

  it('reports invalid element manifests in skipped', () => {
    writePlugin('bad-element', { type: 'element', entry: '', elementType: 'Bad Name' });
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.ok(result.skipped[0].reason.includes('entry'));
  });

  it('skips duplicate elementTypes', () => {
    writePlugin('ticker-v1', VALID_MANIFEST);
    writePlugin('ticker-v2', VALID_MANIFEST); // same elementType
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins.length, 1);
    assert.equal(result.skipped.length, 1);
    assert.ok(result.skipped[0].reason.includes('Duplicate'));
  });

  it('handles non-existent directory gracefully', () => {
    const result = discoverPlugins('/tmp/nonexistent-dir-abc123');
    assert.equal(result.plugins.length, 0);
    assert.equal(result.skipped.length, 0);
  });

  it('reads name and version from package.json', () => {
    writePlugin('my-plugin', VALID_MANIFEST, { name: '@cool/element-ticker', version: '2.3.1' });
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins[0].name, '@cool/element-ticker');
    assert.equal(result.plugins[0].version, '2.3.1');
  });

  it('falls back to directory name when package name is missing', () => {
    const dir = path.join(tmpDir, 'unnamed-plugin');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ version: '1.0.0', junctionrelay: VALID_MANIFEST }),
    );
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins[0].name, 'unnamed-plugin');
  });

  it('skips invalid JSON in package.json', () => {
    const dir = path.join(tmpDir, 'bad-json');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), '{ not valid json }}}');
    const result = discoverPlugins(tmpDir);
    assert.equal(result.plugins.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.ok(result.skipped[0].reason.includes('Invalid JSON'));
  });
});
