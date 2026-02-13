import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createRegistry } from '../registry.js';

let tmpDir: string;

function writePlugin(name: string, elementType: string, extra?: Record<string, unknown>): void {
  const dir = path.join(tmpDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: `@junctionrelay/element-${name}`,
      version: '1.0.0',
      junctionrelay: {
        type: 'element',
        entry: 'dist/index.js',
        elementType,
        displayName: name,
        description: `Test element ${name}`,
        category: 'Data',
        icon: 'Star',
        sensorBound: false,
        defaultSize: { width: 200, height: 100 },
        defaultProperties: {},
      },
      ...extra,
    }),
  );
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'element-registry-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('createRegistry', () => {
  it('creates empty registry for empty directory', () => {
    const registry = createRegistry({ elementsDir: tmpDir });
    assert.equal(registry.size, 0);
    assert.deepEqual(registry.getAll(), []);
    assert.deepEqual(registry.getElementTypes(), []);
  });

  it('registers discovered plugins', () => {
    writePlugin('ticker', 'stock-ticker');
    writePlugin('clock', 'fancy-clock');
    const registry = createRegistry({ elementsDir: tmpDir });
    assert.equal(registry.size, 2);
    assert.ok(registry.has('stock-ticker'));
    assert.ok(registry.has('fancy-clock'));
    assert.equal(registry.has('unknown'), false);
  });

  it('returns plugin definition by elementType', () => {
    writePlugin('ticker', 'stock-ticker');
    const registry = createRegistry({ elementsDir: tmpDir });
    const def = registry.get('stock-ticker');
    assert.ok(def);
    assert.equal(def.manifest.elementType, 'stock-ticker');
    assert.equal(def.name, '@junctionrelay/element-ticker');
    assert.equal(def.version, '1.0.0');
    assert.equal(def.loaded, false);
    assert.equal(def.Renderer, undefined);
    assert.equal(def.PropertiesPanel, undefined);
  });

  it('returns undefined for unknown elementType', () => {
    const registry = createRegistry({ elementsDir: tmpDir });
    assert.equal(registry.get('nonexistent'), undefined);
  });

  it('marks official packages correctly', () => {
    writePlugin('ticker', 'stock-ticker');
    writePlugin('community-thing', 'community-widget');
    const registry = createRegistry({
      elementsDir: tmpDir,
      officialPackages: ['@junctionrelay/element-ticker'],
    });
    assert.equal(registry.get('stock-ticker')?.tier, 'official');
    assert.equal(registry.get('community-widget')?.tier, 'community');
  });

  it('defaults to community tier', () => {
    writePlugin('ticker', 'stock-ticker');
    const registry = createRegistry({ elementsDir: tmpDir });
    assert.equal(registry.get('stock-ticker')?.tier, 'community');
  });

  it('calls onPluginFound for each discovered plugin', () => {
    writePlugin('ticker', 'stock-ticker');
    writePlugin('clock', 'fancy-clock');
    const found: string[] = [];
    createRegistry({
      elementsDir: tmpDir,
      onPluginFound: (p) => found.push(p.manifest.elementType),
    });
    assert.deepEqual(found.sort(), ['fancy-clock', 'stock-ticker']);
  });

  it('calls onPluginSkipped for invalid plugins', () => {
    // Write an invalid manifest
    const dir = path.join(tmpDir, 'bad-plugin');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'bad',
        version: '1.0.0',
        junctionrelay: { type: 'element', entry: '', elementType: 'BAD' },
      }),
    );
    const skipped: string[] = [];
    createRegistry({
      elementsDir: tmpDir,
      onPluginSkipped: (_path, reason) => skipped.push(reason),
    });
    assert.equal(skipped.length, 1);
  });

  it('refresh rescans the directory', () => {
    const registry = createRegistry({ elementsDir: tmpDir });
    assert.equal(registry.size, 0);

    // Add a plugin after initial scan
    writePlugin('ticker', 'stock-ticker');
    assert.equal(registry.size, 0); // still 0, hasn't refreshed

    registry.refresh();
    assert.equal(registry.size, 1);
    assert.ok(registry.has('stock-ticker'));
  });

  it('refresh clears removed plugins', () => {
    writePlugin('ticker', 'stock-ticker');
    const registry = createRegistry({ elementsDir: tmpDir });
    assert.equal(registry.size, 1);

    // Remove the plugin
    fs.rmSync(path.join(tmpDir, 'ticker'), { recursive: true, force: true });
    registry.refresh();
    assert.equal(registry.size, 0);
  });

  it('getAll returns array of definitions', () => {
    writePlugin('a', 'el-a');
    writePlugin('b', 'el-b');
    const registry = createRegistry({ elementsDir: tmpDir });
    const all = registry.getAll();
    assert.equal(all.length, 2);
    assert.ok(all.every(d => d.manifest && d.name && d.version));
  });

  it('getElementTypes returns array of type strings', () => {
    writePlugin('a', 'el-a');
    writePlugin('b', 'el-b');
    const registry = createRegistry({ elementsDir: tmpDir });
    const types = registry.getElementTypes().sort();
    assert.deepEqual(types, ['el-a', 'el-b']);
  });
});
