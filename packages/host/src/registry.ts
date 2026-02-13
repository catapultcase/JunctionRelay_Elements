// ============================================================================
// Element plugin registry — in-memory map of elementType → definition
// ============================================================================

import type {
  DiscoveredElementPlugin,
  PluginElementDefinition,
  PluginTier,
} from '@junctionrelay/element-protocol';
import { discoverPlugins, type DiscoveryResult } from './discovery.js';

/** Options for creating an element plugin registry. */
export interface RegistryOptions {
  /** Absolute path to the elements directory to scan. */
  elementsDir: string;

  /**
   * Package names that are official (shipped with the app).
   * All others are treated as community plugins.
   */
  officialPackages?: string[];

  /** Called for each discovered plugin. */
  onPluginFound?: (plugin: DiscoveredElementPlugin) => void;

  /** Called for each skipped entry. */
  onPluginSkipped?: (path: string, reason: string) => void;
}

/**
 * In-memory registry of element plugins.
 *
 * Usage:
 * ```ts
 * const registry = createRegistry({ elementsDir: '/app/data/elements' });
 * const definition = registry.get('stock-ticker');
 * const allTypes = registry.getAll();
 * ```
 */
export interface ElementPluginRegistry {
  /** Get a plugin definition by elementType. */
  get(elementType: string): PluginElementDefinition | undefined;

  /** Check if an elementType is registered. */
  has(elementType: string): boolean;

  /** Get all registered plugin definitions. */
  getAll(): PluginElementDefinition[];

  /** Get all registered element types. */
  getElementTypes(): string[];

  /** Number of registered plugins. */
  readonly size: number;

  /** Re-scan the elements directory and rebuild the registry. */
  refresh(): void;
}

/**
 * Create an element plugin registry by scanning the elements directory.
 *
 * Discovery runs synchronously on creation (and on refresh).
 * Dynamic import of plugin bundles happens later (Phase 3) — the registry
 * initially holds unloaded definitions with manifest metadata only.
 */
export function createRegistry(options: RegistryOptions): ElementPluginRegistry {
  const { elementsDir, officialPackages = [], onPluginFound, onPluginSkipped } = options;
  const officialSet = new Set(officialPackages);
  let registry = new Map<string, PluginElementDefinition>();

  function build(): void {
    const result: DiscoveryResult = discoverPlugins(elementsDir);

    const newRegistry = new Map<string, PluginElementDefinition>();

    for (const plugin of result.plugins) {
      const tier: PluginTier = officialSet.has(plugin.name) ? 'official' : 'community';

      newRegistry.set(plugin.manifest.elementType, {
        manifest: plugin.manifest,
        name: plugin.name,
        version: plugin.version,
        tier,
        loaded: false,
      });

      onPluginFound?.(plugin);
    }

    for (const entry of result.skipped) {
      onPluginSkipped?.(entry.path, entry.reason);
    }

    registry = newRegistry;
  }

  // Initial scan
  build();

  return {
    get(elementType: string) {
      return registry.get(elementType);
    },

    has(elementType: string) {
      return registry.has(elementType);
    },

    getAll() {
      return Array.from(registry.values());
    },

    getElementTypes() {
      return Array.from(registry.keys());
    },

    get size() {
      return registry.size;
    },

    refresh() {
      build();
    },
  };
}
