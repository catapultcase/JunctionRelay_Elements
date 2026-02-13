// ============================================================================
// React context and hook for accessing host services from element plugins
// ============================================================================

import { createContext, useContext } from 'react';
import type { ElementHostContext } from '@junctionrelay/element-protocol';

/**
 * React context that the host populates with shared services.
 * Plugins never use this directly — they call useElementHost() instead.
 */
export const ElementHostReactContext = createContext<ElementHostContext | null>(null);

/**
 * Provider component for the host to wrap plugin components with.
 * The host creates the context value from its FontLoader and other services.
 *
 * @example
 * ```tsx
 * // Host wraps plugin renderers:
 * <ElementHostProvider value={{ fonts: { loadGoogleFont, ... } }}>
 *   <PluginRenderer properties={...} />
 * </ElementHostProvider>
 * ```
 */
export const ElementHostProvider = ElementHostReactContext.Provider;

/**
 * Hook for plugin components to access host services (fonts, etc.).
 * Must be called inside a component rendered within an ElementHostProvider.
 *
 * @example
 * ```tsx
 * // Inside a plugin's Renderer or PropertiesPanel:
 * const { fonts } = useElementHost();
 * await fonts.loadGoogleFont('Roboto Mono');
 * ```
 */
export function useElementHost(): ElementHostContext {
  const ctx = useContext(ElementHostReactContext);
  if (!ctx) {
    throw new Error(
      'useElementHost() must be called inside a component wrapped by ElementHostProvider. ' +
      'This usually means the plugin is not being rendered by the FrameEngine host.',
    );
  }
  return ctx;
}
