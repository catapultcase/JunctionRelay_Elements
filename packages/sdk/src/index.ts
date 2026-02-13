// ============================================================================
// @junctionrelay/element-sdk
// SDK for building JunctionRelay element plugins
// ============================================================================

// Re-export all protocol types and constants
export * from '@junctionrelay/element-protocol';

// SDK utilities
export { validateManifest, parsePackageManifest } from './validation.js';
export type { ValidationResult } from './validation.js';
