import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { discoverPlugins } from '../discovery.js';
import { createRegistry } from '../registry.js';

// Resolve the actual plugins/ directory in the monorepo
const pluginsDir = path.resolve(import.meta.dirname, '..', '..', '..', '..', 'plugins');

describe('integration: discover real plugins/ directory', () => {
  it('discovers hello-sensor reference plugin', () => {
    const result = discoverPlugins(pluginsDir);
    assert.ok(result.plugins.length >= 1, `Expected at least 1 plugin, got ${result.plugins.length}`);

    const hello = result.plugins.find(p => p.manifest.elementType === 'hello-sensor');
    assert.ok(hello, 'hello-sensor plugin not found');
    assert.equal(hello.name, '@junctionrelay/element-hello-sensor');
    assert.equal(hello.version, '1.0.0');
    assert.equal(hello.manifest.type, 'element');
    assert.equal(hello.manifest.displayName, 'Hello Sensor');
    assert.equal(hello.manifest.category, 'Data');
    assert.equal(hello.manifest.sensorBound, true);
    assert.equal(hello.entry, 'dist/index.js');
  });

  it('creates registry from real plugins/ directory', () => {
    const registry = createRegistry({ elementsDir: pluginsDir });
    assert.ok(registry.has('hello-sensor'), 'hello-sensor not in registry');

    const def = registry.get('hello-sensor')!;
    assert.equal(def.tier, 'community'); // not in officialPackages
    assert.equal(def.loaded, false); // not loaded yet (Phase 3 loader is in FrameEngine)
    assert.equal(def.manifest.icon, 'Sensors');
  });

  it('reports no skipped entries for valid plugins', () => {
    const result = discoverPlugins(pluginsDir);
    assert.equal(result.skipped.length, 0, `Unexpected skipped: ${JSON.stringify(result.skipped)}`);
  });
});
