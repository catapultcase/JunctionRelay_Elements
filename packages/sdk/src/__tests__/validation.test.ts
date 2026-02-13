import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest, parsePackageManifest } from '../validation.js';

const VALID_MANIFEST = {
  type: 'element',
  entry: 'dist/index.js',
  elementType: 'stock-ticker',
  displayName: 'Stock Ticker',
  description: 'Real-time stock price display with sparkline',
  category: 'Data',
  icon: 'TrendingUp',
  sensorTagCompatible: true,
  defaultSize: { width: 300, height: 80 },
  defaultProperties: {
    sensorTag: '',
    symbol: 'AAPL',
    showSparkline: true,
  },
  layoutModes: ['composite'],
};

describe('validateManifest', () => {
  it('accepts a valid manifest', () => {
    const result = validateManifest(VALID_MANIFEST);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('rejects null', () => {
    const result = validateManifest(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes('must be an object'));
  });

  it('rejects wrong type', () => {
    const result = validateManifest({ ...VALID_MANIFEST, type: 'collector' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("type must be 'element'")));
  });

  it('rejects missing entry', () => {
    const { entry: _, ...rest } = VALID_MANIFEST;
    const result = validateManifest(rest);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('entry')));
  });

  it('rejects invalid elementType format', () => {
    const result = validateManifest({ ...VALID_MANIFEST, elementType: 'StockTicker' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('kebab-case')));
  });

  it('rejects elementType with spaces', () => {
    const result = validateManifest({ ...VALID_MANIFEST, elementType: 'stock ticker' });
    assert.equal(result.valid, false);
  });

  it('accepts single-word elementType', () => {
    const result = validateManifest({ ...VALID_MANIFEST, elementType: 'gauge' });
    assert.equal(result.valid, true);
  });

  it('rejects invalid category', () => {
    const result = validateManifest({ ...VALID_MANIFEST, category: 'Custom' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('category')));
  });

  it('rejects non-boolean sensorTagCompatible', () => {
    const result = validateManifest({ ...VALID_MANIFEST, sensorTagCompatible: 'yes' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('sensorTagCompatible')));
  });

  it('rejects missing defaultSize dimensions', () => {
    const result = validateManifest({ ...VALID_MANIFEST, defaultSize: { width: 100 } });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('defaultSize')));
  });

  it('rejects array as defaultProperties', () => {
    const result = validateManifest({ ...VALID_MANIFEST, defaultProperties: [] });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('defaultProperties')));
  });

  it('accepts omitted layoutModes', () => {
    const { layoutModes: _, ...rest } = VALID_MANIFEST;
    const result = validateManifest(rest);
    assert.equal(result.valid, true);
  });

  it('rejects invalid layoutModes values', () => {
    const result = validateManifest({ ...VALID_MANIFEST, layoutModes: ['composite', 'grid'] });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('layoutModes')));
  });

  it('collects multiple errors', () => {
    const result = validateManifest({
      type: 'collector',
      entry: '',
      elementType: 'Bad Name',
      displayName: '',
      description: '',
      category: 'Wrong',
      icon: '',
      sensorTagCompatible: 'no',
      defaultSize: null,
      defaultProperties: null,
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 8);
  });
});

describe('parsePackageManifest', () => {
  it('extracts and validates the junctionrelay field', () => {
    const pkg = {
      name: '@junctionrelay/element-stock-ticker',
      version: '1.0.0',
      junctionrelay: VALID_MANIFEST,
    };
    const result = parsePackageManifest(pkg);
    assert.notEqual(result.manifest, null);
    assert.equal(result.errors.length, 0);
    assert.equal(result.manifest!.elementType, 'stock-ticker');
  });

  it('returns error when junctionrelay field is missing', () => {
    const result = parsePackageManifest({ name: 'foo', version: '1.0.0' });
    assert.equal(result.manifest, null);
    assert.ok(result.errors[0].includes('missing'));
  });

  it('returns validation errors for invalid manifest', () => {
    const pkg = {
      name: 'foo',
      version: '1.0.0',
      junctionrelay: { type: 'wrong' },
    };
    const result = parsePackageManifest(pkg);
    assert.equal(result.manifest, null);
    assert.ok(result.errors.length > 0);
  });
});
