// ============================================================================
// Platform-specific element plugin directory resolution
// ============================================================================

import * as path from 'node:path';
import * as os from 'node:os';

export type Platform = 'server-windows' | 'server-docker' | 'xsd-windows';

/**
 * Resolve the elements directory for a given platform.
 *
 * - Server (Windows): %APPDATA%/JunctionRelay/elements/
 * - Server (Docker):  /app/data/elements/
 * - XSD (Windows):    %APPDATA%/JunctionRelay_XSD/elements/
 */
export function getElementsDir(platform: Platform): string {
  switch (platform) {
    case 'server-docker':
      return '/app/data/elements';

    case 'server-windows': {
      const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
      return path.join(appData, 'JunctionRelay', 'elements');
    }

    case 'xsd-windows': {
      const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
      return path.join(appData, 'JunctionRelay_XSD', 'elements');
    }
  }
}

/**
 * Auto-detect platform from environment.
 * Returns undefined if platform cannot be determined (caller should specify explicitly).
 */
export function detectPlatform(): Platform | undefined {
  // Docker: check for /.dockerenv or /app/data path
  if (process.env.DOTNET_RUNNING_IN_CONTAINER === 'true') return 'server-docker';

  // Windows: check if APPDATA is set
  if (process.platform === 'win32') {
    // XSD sets ELECTRON_RUN_AS_NODE or similar — for now, default to server
    if (process.env.JUNCTION_RELAY_APP === 'xsd') return 'xsd-windows';
    return 'server-windows';
  }

  // Linux/macOS without Docker — assume server-docker paths (most common non-Windows deploy)
  return 'server-docker';
}
