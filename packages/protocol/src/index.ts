// ============================================================================
// @junctionrelay/element-protocol
// Type definitions and constants for JunctionRelay element plugins
// ============================================================================

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PROTOCOL_VERSION = '1.0.0';

/**
 * Layout modes that elements can declare support for.
 * - composite: Standard free-form canvas (default)
 * - pixel: Pixel-grid mode with restricted element palette
 */
export type LayoutMode = 'composite' | 'pixel';

/**
 * Element categories for grouping in the Library palette.
 * Matches the built-in FrameEngine categories.
 */
export const ELEMENT_CATEGORIES = [
  'Data',
  'Media',
  'Visualization',
  'Effects',
  'Utility',
] as const;

export type ElementCategory = (typeof ELEMENT_CATEGORIES)[number];

/**
 * Packages that element plugins MUST externalize in their esbuild config.
 * The host app provides these at runtime via the PluginLoader's shared
 * dependency injection system.
 *
 * WHY these are shared:
 *   - react / react-dom / react/jsx-runtime: React requires a single instance
 *     per page. Two copies cause "hooks can only be called inside a function
 *     component" errors.
 *   - @mui/material / @mui/icons-material / @emotion/*: MUI theming uses
 *     React context from the host's React instance. Already loaded (~300KB saved).
 *   - @junctionrelay/element-sdk: The useElementHost() hook reads from a React
 *     context provided by the host. Must share the same React instance.
 *
 * HOW the host provides them:
 *   The FrameEngine PluginLoader exposes these on window globals and injects
 *   a W3C Import Map that routes bare specifiers to ESM vendor shim files.
 *   Each shim re-exports from the window global, so `import { useState } from "react"`
 *   resolves to the host's React instance via native ES module loading.
 *   Plugins don't need any special setup — standard esbuild externals are all
 *   that's required.
 *
 * ANYTHING ELSE a plugin needs should be BUNDLED (not externalized).
 *   esbuild inlines non-external deps automatically. A plugin using chart.js,
 *   three.js, d3, or any other library simply doesn't add --external for it.
 *
 * Usage in esbuild:
 *   EXTERNAL_PACKAGES.map(pkg => `--external:${pkg}`).join(' ')
 */
export const EXTERNAL_PACKAGES = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@mui/material',
  '@mui/icons-material',
  '@emotion/react',
  '@emotion/styled',
  '@junctionrelay/element-sdk',
] as const;

// ---------------------------------------------------------------------------
// Host Context (shared services the host provides to plugins via React context)
// ---------------------------------------------------------------------------

/**
 * Font loading services provided by the host.
 * Wraps the FrameEngine FontLoader so plugins don't need to bundle it.
 */
export interface ElementHostFonts {
  /** Load a Google Font by family name. Resolves when the font is ready. */
  loadGoogleFont(fontFamily: string): Promise<void>;

  /** Load the pixel fonts CSS (Tom Thumb, Press Start 2P, Pixel Operator). */
  loadPixelFonts(): void;

  /** Check whether a font family has been loaded. */
  isFontLoaded(fontFamily: string): boolean;

  /** Check whether a font family is a pixel font. */
  isPixelFont(fontFamily: string): boolean;

  /** The list of available pixel font families. */
  pixelFonts: readonly string[];
}

/**
 * Host context provided to element plugins via React context.
 * Plugins access this via the `useElementHost()` hook from the SDK.
 *
 * Designed for extension — future versions may add theme, assets,
 * navigation, or notification services without breaking existing plugins.
 */
export interface ElementHostContext {
  /** Font loading services. */
  fonts: ElementHostFonts;
}

// ---------------------------------------------------------------------------
// Plugin Manifest (package.json → junctionrelay field)
// ---------------------------------------------------------------------------

/**
 * The `junctionrelay` field in a plugin's package.json.
 * This is the self-describing contract that the host reads on discovery.
 */
export interface ElementPluginManifest {
  /** Must be 'element' to distinguish from collector plugins. */
  type: 'element';

  /** Relative path to the bundled entry point (e.g. 'dist/index.js'). */
  entry: string;

  /**
   * Unique element type identifier (e.g. 'stock-ticker').
   * Used as the discriminator in layout configs and the plugin registry.
   * Must be lowercase, kebab-case, no spaces.
   */
  elementType: string;

  /** Human-readable name shown in the Library palette (e.g. 'Stock Ticker'). */
  displayName: string;

  /** Short description shown in the Library palette and marketplace (max 120 characters). */
  description: string;

  /** Category for grouping in the Library palette. */
  category: ElementCategory;

  /**
   * MUI icon name for the Library palette (e.g. 'TrendingUp').
   * Must be a valid @mui/icons-material export name.
   */
  icon: string;

  /** Whether this element accepts sensor data via sensorTag properties. */
  sensorTagCompatible: boolean;

  /** Default dimensions when placed on the canvas. */
  defaultSize: { width: number; height: number };

  /** Default property values applied when the element is first placed. */
  defaultProperties: Record<string, unknown>;

  /**
   * Layout modes this element supports.
   * Defaults to ['composite'] if omitted.
   */
  layoutModes?: LayoutMode[];
}

// ---------------------------------------------------------------------------
// Renderer Props (what every plugin Renderer component receives)
// ---------------------------------------------------------------------------

/**
 * Structured sensor value as provided by the FrameEngine runtime.
 * resolvedValues maps sensorTag → ResolvedSensorValue.
 */
export interface ResolvedSensorValue {
  /** Sensor value — number for most sensors, string for text, boolean for toggles, number[] for audio */
  value?: string | number | boolean | number[];
  /** Unit of measurement (e.g., "°C", "RPM") */
  unit?: string;
  /** Short label for the sensor */
  label?: string;
  /** Pre-formatted display string */
  displayValue?: string;
}

/**
 * Props passed to every element plugin's Renderer component.
 * Mirrors the props that built-in FrameEngine elements receive.
 */
export interface ElementRendererProps {
  /** The element's configured properties (matches defaultProperties shape). */
  properties: Record<string, unknown>;

  /**
   * Live sensor values keyed by sensorTag.
   * Only populated for sensorTag-compatible elements.
   * Each value is a ResolvedSensorValue with { value, unit, label }.
   */
  resolvedValues: Record<string, ResolvedSensorValue>;

  /** Current element width on the canvas (pixels). */
  width: number;

  /** Current element height on the canvas (pixels). */
  height: number;

  /** Canvas-level padding setting (pixels). */
  elementPadding?: number;

  /** Whether to show placeholder values when no live/test data is available. */
  showPlaceholders?: boolean;

  /** Whether the canvas is in preview/capture mode (disables editing). */
  previewMode?: boolean;
}

// ---------------------------------------------------------------------------
// Properties Panel Props (what every plugin PropertiesPanel receives)
// ---------------------------------------------------------------------------

/**
 * Minimal element reference passed to the properties panel.
 * The panel reads properties and calls onUpdateElement to modify them.
 */
export interface SelectedElement {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  width: number;
  height: number;
}

/**
 * Props passed to every element plugin's PropertiesPanel component.
 * Mirrors the ElementPropertyPanelProps used by built-in elements.
 */
export interface ElementPropertiesPanelProps {
  /** The currently selected element. */
  selectedElement: SelectedElement;

  /**
   * Callback to update the element. Send updates as `{ properties: { ...allProps, key: value } }`.
   * The full properties object is required because the host performs a shallow merge at the
   * PlacedElement level — it replaces `properties` entirely rather than deep-merging keys.
   */
  onUpdateElement: (elementId: string, updates: Record<string, unknown>) => void;

  /** Callback to delete the element from the layout. */
  onDeleteElement: (elementId: string) => void;
}

// ---------------------------------------------------------------------------
// Plugin Exports (what a plugin's entry point must export)
// ---------------------------------------------------------------------------

/**
 * The named exports that a plugin's bundled entry point must provide.
 * The host dynamically imports the bundle and reads these exports.
 */
export interface ElementPluginExports {
  /** The render component — what appears on the canvas. */
  Renderer: React.ComponentType<ElementRendererProps>;

  /** The properties panel — what appears in the right sidebar. */
  PropertiesPanel: React.ComponentType<ElementPropertiesPanelProps>;
}

// ---------------------------------------------------------------------------
// Discovery (filesystem scan results)
// ---------------------------------------------------------------------------

/**
 * Result of scanning the elements directory for valid plugin manifests.
 * Returned by the discovery system before any dynamic imports happen.
 */
export interface DiscoveredElementPlugin {
  /** Package name from package.json (e.g. '@junctionrelay/element-stock-ticker'). */
  name: string;

  /** Package version from package.json (e.g. '1.0.0'). */
  version: string;

  /** Absolute path to the plugin directory. */
  path: string;

  /** Resolved entry point path (absolute or relative to path). */
  entry: string;

  /** The validated junctionrelay manifest from package.json. */
  manifest: ElementPluginManifest;
}

// ---------------------------------------------------------------------------
// Registry (runtime state after discovery + loading)
// ---------------------------------------------------------------------------

/**
 * Runtime registry entry for a loaded (or failed-to-load) element plugin.
 * The host maintains a Map<elementType, PluginElementDefinition>.
 */
export interface PluginElementDefinition {
  /** The plugin manifest metadata. */
  manifest: ElementPluginManifest;

  /** Package name from package.json. */
  name: string;

  /** Package version from package.json. */
  version: string;

  /** Whether the plugin bundle has been successfully loaded. */
  loaded: boolean;

  /** The Renderer component (set after successful dynamic import). */
  Renderer?: React.ComponentType<ElementRendererProps>;

  /** The PropertiesPanel component (set after successful dynamic import). */
  PropertiesPanel?: React.ComponentType<ElementPropertiesPanelProps>;

  /** Error message if the plugin failed to load. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Layout Portability (requiredPlugins in layout config)
// ---------------------------------------------------------------------------

/**
 * Plugin dependency entry stored in a layout's config.
 * Auto-generated on export by scanning the layout's elements.
 */
export interface RequiredPlugin {
  /** Always 'element' for element plugins. */
  type: 'element';

  /** The elementType identifier (e.g. 'stock-ticker'). */
  elementType: string;

  /** Package name (e.g. '@junctionrelay/element-stock-ticker'). */
  name: string;

  /** Minimum version required (semver). */
  minVersion: string;

  /** Plugin author. */
  author: string;
}
