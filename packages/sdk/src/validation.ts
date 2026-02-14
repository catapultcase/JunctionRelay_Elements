// ============================================================================
// Manifest validation for element plugins
// ============================================================================

import { ELEMENT_CATEGORIES, PLUGIN_ID_PATTERN, type ElementPluginManifest } from '@junctionrelay/element-protocol';

/** Result of validating a plugin manifest. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate the `junctionrelay` field from a plugin's package.json.
 * Returns a list of errors (empty = valid).
 */
export function validateManifest(manifest: unknown): ValidationResult {
  const errors: string[] = [];

  if (manifest === null || manifest === undefined || typeof manifest !== 'object') {
    return { valid: false, errors: ['manifest must be an object'] };
  }

  const m = manifest as Record<string, unknown>;

  // type
  if (m.type !== 'element') {
    errors.push(`type must be 'element', got '${String(m.type)}'`);
  }

  // entry
  if (typeof m.entry !== 'string' || m.entry.length === 0) {
    errors.push('entry must be a non-empty string (e.g. "dist/index.js")');
  }

  // elementType — must be namespaced dot-notation (e.g. 'namespace.name')
  if (typeof m.elementType !== 'string' || !PLUGIN_ID_PATTERN.test(m.elementType)) {
    errors.push(
      `elementType must be namespaced dot-notation (e.g. 'junctionrelay.stock-ticker'), got '${String(m.elementType)}'`,
    );
  }

  // displayName
  if (typeof m.displayName !== 'string' || m.displayName.length === 0) {
    errors.push('displayName must be a non-empty string');
  }

  // description
  if (typeof m.description !== 'string' || m.description.length === 0) {
    errors.push('description must be a non-empty string');
  } else if (m.description.length > 120) {
    errors.push(`description must be 120 characters or fewer (got ${m.description.length})`);
  }

  // category
  if (typeof m.category !== 'string' || !(ELEMENT_CATEGORIES as readonly string[]).includes(m.category)) {
    errors.push(
      `category must be one of: ${ELEMENT_CATEGORIES.join(', ')}; got '${String(m.category)}'`,
    );
  }

  // icon
  if (typeof m.icon !== 'string' || m.icon.length === 0) {
    errors.push('icon must be a non-empty string (MUI icon name)');
  }

  // sensorTagCompatible
  if (typeof m.sensorTagCompatible !== 'boolean') {
    errors.push('sensorTagCompatible must be a boolean');
  }

  // defaultSize
  if (
    m.defaultSize === null ||
    m.defaultSize === undefined ||
    typeof m.defaultSize !== 'object' ||
    typeof (m.defaultSize as Record<string, unknown>).width !== 'number' ||
    typeof (m.defaultSize as Record<string, unknown>).height !== 'number'
  ) {
    errors.push('defaultSize must be { width: number, height: number }');
  }

  // defaultProperties
  if (
    m.defaultProperties === null ||
    m.defaultProperties === undefined ||
    typeof m.defaultProperties !== 'object' ||
    Array.isArray(m.defaultProperties)
  ) {
    errors.push('defaultProperties must be an object');
  }

  // layoutModes (optional)
  if (m.layoutModes !== undefined) {
    if (!Array.isArray(m.layoutModes)) {
      errors.push('layoutModes must be an array if provided');
    } else {
      const invalid = m.layoutModes.filter(
        (mode: unknown) => mode !== 'composite' && mode !== 'pixel',
      );
      if (invalid.length > 0) {
        errors.push(
          `layoutModes contains invalid values: ${invalid.join(', ')}; allowed: composite, pixel`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parse and validate a full package.json object.
 * Extracts the junctionrelay field and validates it as an element manifest.
 */
export function parsePackageManifest(
  packageJson: Record<string, unknown>,
): { manifest: ElementPluginManifest; errors: string[] } | { manifest: null; errors: string[] } {
  const junctionrelay = packageJson.junctionrelay;

  if (junctionrelay === null || junctionrelay === undefined || typeof junctionrelay !== 'object') {
    return { manifest: null, errors: ['package.json missing "junctionrelay" field'] };
  }

  const result = validateManifest(junctionrelay);

  if (!result.valid) {
    return { manifest: null, errors: result.errors };
  }

  return { manifest: junctionrelay as unknown as ElementPluginManifest, errors: [] };
}
