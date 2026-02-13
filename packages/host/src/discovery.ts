// ============================================================================
// Element plugin discovery — scan filesystem for valid element plugins
// ============================================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DiscoveredElementPlugin, ElementPluginManifest } from '@junctionrelay/element-protocol';

/** Result of a discovery scan with both found plugins and skipped entries. */
export interface DiscoveryResult {
  plugins: DiscoveredElementPlugin[];
  skipped: SkippedEntry[];
}

/** An entry that was found but failed validation. */
export interface SkippedEntry {
  path: string;
  reason: string;
}

/**
 * Discover element plugins in a directory.
 *
 * Scans three locations (same pattern as collector discovery):
 * 1. Direct subdirectories of elementsDir
 * 2. node_modules/@junctionrelay/element-*
 * 3. node_modules/junctionrelay-element-*
 *
 * A valid plugin must have a package.json with:
 *   "junctionrelay": { "type": "element", "elementType": "...", ... }
 */
export function discoverPlugins(elementsDir: string): DiscoveryResult {
  const resolved = path.resolve(elementsDir);
  const plugins: DiscoveredElementPlugin[] = [];
  const skipped: SkippedEntry[] = [];

  // 1. Direct subdirectories
  if (fs.existsSync(resolved)) {
    for (const entry of safeReaddir(resolved)) {
      // Skip node_modules at this level
      if (entry === 'node_modules') continue;
      const dirPath = path.join(resolved, entry);
      tryLoadPlugin(dirPath, plugins, skipped);
    }
  }

  // 2. node_modules/@junctionrelay/element-*
  const scopedDir = path.join(resolved, 'node_modules', '@junctionrelay');
  if (fs.existsSync(scopedDir)) {
    for (const entry of safeReaddir(scopedDir)) {
      if (entry.startsWith('element-')) {
        const dirPath = path.join(scopedDir, entry);
        tryLoadPlugin(dirPath, plugins, skipped);
      }
    }
  }

  // 3. node_modules/junctionrelay-element-*
  const nodeModulesDir = path.join(resolved, 'node_modules');
  if (fs.existsSync(nodeModulesDir)) {
    for (const entry of safeReaddir(nodeModulesDir)) {
      if (entry.startsWith('junctionrelay-element-')) {
        const dirPath = path.join(nodeModulesDir, entry);
        tryLoadPlugin(dirPath, plugins, skipped);
      }
    }
  }

  return { plugins, skipped };
}

function safeReaddir(dirPath: string): string[] {
  try {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return [];
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

function tryLoadPlugin(
  dirPath: string,
  plugins: DiscoveredElementPlugin[],
  skipped: SkippedEntry[],
): void {
  const pkgPath = path.join(dirPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  let raw: string;
  try {
    raw = fs.readFileSync(pkgPath, 'utf-8');
  } catch {
    skipped.push({ path: dirPath, reason: 'Could not read package.json' });
    return;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    skipped.push({ path: dirPath, reason: 'Invalid JSON in package.json' });
    return;
  }

  const junctionrelay = pkg.junctionrelay as Record<string, unknown> | undefined;
  if (!junctionrelay || typeof junctionrelay !== 'object') return;

  // Only match element plugins (skip collector plugins, etc.)
  if (junctionrelay.type !== 'element') return;

  // Validate required manifest fields
  const errors = validateElementManifest(junctionrelay);
  if (errors.length > 0) {
    skipped.push({ path: dirPath, reason: errors.join('; ') });
    return;
  }

  const manifest = junctionrelay as unknown as ElementPluginManifest;

  // Check for duplicate elementType
  if (plugins.some(p => p.manifest.elementType === manifest.elementType)) {
    skipped.push({
      path: dirPath,
      reason: `Duplicate elementType '${manifest.elementType}' — already registered`,
    });
    return;
  }

  plugins.push({
    name: (pkg.name as string) ?? path.basename(dirPath),
    version: (pkg.version as string) ?? '0.0.0',
    path: dirPath,
    entry: manifest.entry,
    manifest,
  });
}

// ---------------------------------------------------------------------------
// Inline validation (lightweight — avoids dependency on SDK for the host)
// ---------------------------------------------------------------------------

const ELEMENT_TYPE_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const VALID_CATEGORIES = ['Data', 'Media', 'Visualization', 'Effects', 'Utility'];

function validateElementManifest(m: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (typeof m.entry !== 'string' || m.entry.length === 0) {
    errors.push('missing entry');
  }
  if (typeof m.elementType !== 'string' || !ELEMENT_TYPE_PATTERN.test(m.elementType)) {
    errors.push(`invalid elementType '${String(m.elementType)}'`);
  }
  if (typeof m.displayName !== 'string' || m.displayName.length === 0) {
    errors.push('missing displayName');
  }
  if (typeof m.description !== 'string' || m.description.length === 0) {
    errors.push('missing description');
  }
  if (typeof m.category !== 'string' || !VALID_CATEGORIES.includes(m.category)) {
    errors.push(`invalid category '${String(m.category)}'`);
  }
  if (typeof m.icon !== 'string' || m.icon.length === 0) {
    errors.push('missing icon');
  }
  if (typeof m.sensorTagCompatible !== 'boolean') {
    errors.push('missing sensorTagCompatible');
  }
  if (
    m.defaultSize === null ||
    m.defaultSize === undefined ||
    typeof m.defaultSize !== 'object' ||
    typeof (m.defaultSize as Record<string, unknown>).width !== 'number' ||
    typeof (m.defaultSize as Record<string, unknown>).height !== 'number'
  ) {
    errors.push('invalid defaultSize');
  }
  if (
    m.defaultProperties === null ||
    m.defaultProperties === undefined ||
    typeof m.defaultProperties !== 'object' ||
    Array.isArray(m.defaultProperties)
  ) {
    errors.push('invalid defaultProperties');
  }

  return errors;
}
