# JunctionRelay Elements

Plugin system for creating custom FrameEngine elements. Element plugins are React components that render on the FrameEngine canvas alongside the 14 built-in element types.

## Repository Structure

```
packages/
  protocol/   @junctionrelay/element-protocol — types, interfaces, constants
  sdk/        @junctionrelay/element-sdk — re-exports protocol + useElementHost() hook
plugins/
  junctionrelay.hello-sensor/   Reference plugin — copy this to start a new plugin
```

## Prerequisites

- **Node.js 18+** — required for building and packing plugins
- All commands work on Windows, macOS, and Linux — no WSL or Git Bash needed on Windows

## Creating a Plugin

### 1. Copy the reference plugin

Copy `plugins/junctionrelay.hello-sensor/` to a new folder. This can be anywhere on your filesystem — plugins do NOT need to live inside this monorepo.

**macOS / Linux:**
```bash
cp -r plugins/junctionrelay.hello-sensor /path/to/my-plugin
cd /path/to/my-plugin
```

**Windows (PowerShell):**
```powershell
Copy-Item -Recurse plugins\junctionrelay.hello-sensor C:\path\to\my-plugin
cd C:\path\to\my-plugin
```

**Windows (File Explorer):** Copy-paste the `plugins\junctionrelay.hello-sensor` folder to your desired location.

**Standalone plugins work out of the box.** The reference plugin has no runtime dependencies — only devDependencies for type checking and building. `npm install` will work immediately outside the monorepo. The `@junctionrelay/element-sdk` import in your source code is externalized by esbuild (left as-is in the bundle) and resolved by the host app at runtime.

### 2. Edit `package.json`

Update the `junctionrelay` manifest — this is how the host app discovers your plugin:

```json
{
  "name": "@yourname/element-my-thing",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "junctionrelay": {
    "type": "element",
    "entry": "dist/index.js",
    "elementName": "yourname.my-thing",
    "displayName": "My Thing",
    "description": "Short description (max 120 chars)",
    "category": "Data",
    "icon": "Extension",
    "emoji": "🔧",
    "sensorTagCompatible": false,
    "defaultSize": { "width": 200, "height": 100 },
    "defaultProperties": {
      "myProp": "default value"
    },
    "layoutModes": ["composite"],
    "authorName": "Your Name",
    "authorUrl": "https://github.com/yourname"
  }
}
```

#### Author Metadata

| Field | Required | Description |
|-------|----------|-------------|
| `authorName` | Recommended | Display name shown in the Elements management tab |
| `authorUrl` | Optional | Homepage or profile URL (rendered as clickable link) |

When your plugin is distributed via JunctionRelay Cloud (FrameXchange), the marketplace adds two additional fields from your Clerk account: `authorId` and `authorAvatarUrl`. These are stored in the subscriber's local database alongside your manifest fields. **The UI always prefers Clerk data when available** — your Clerk display name and avatar override the manifest `authorName` in the subscriber's Elements tab. The manifest `authorName` is the fallback for users who install your plugin manually (ZIP drop).

**Required manifest fields:** See `ElementPluginManifest` in `packages/protocol/src/index.ts` for the full interface.

**`elementName` namespacing:** Plugin element names must use `<namespace>.<name>` dot-notation where both segments are lowercase kebab-case (e.g. `yourname.my-thing`, `junctionrelay.hello-sensor`). This prevents collisions between plugins and built-in native types (`sensor`, `gauge`, `text`, etc.), which are un-namespaced. The regex is exported as `PLUGIN_ID_PATTERN` from `@junctionrelay/element-protocol`.

**Categories:** `Data`, `Media`, `Visualization`, `Effects`, `Utility`

**Icons:** Any valid `@mui/icons-material` export name (e.g., `Sensors`, `TrendingUp`, `Timer`, `Extension`).

### 3. Write your components

A plugin exports two React components from its entry point:

**`src/index.jsx`** (or `.tsx`):
```jsx
export { Renderer } from './Renderer.js';
export { PropertiesPanel } from './PropertiesPanel.js';
```

**`src/Renderer.jsx`** — what appears on the canvas:
```jsx
import { useState, useEffect } from 'react';
import { useElementHost } from '@junctionrelay/element-sdk';

export const Renderer = ({ properties, resolvedValues, width, height, showPlaceholders }) => {
  const { fonts } = useElementHost();

  // Your render logic here
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* ... */}
    </div>
  );
};
```

**`src/PropertiesPanel.jsx`** — the sidebar config panel:
```jsx
import { useCallback } from 'react';
import { TextField, Slider, Box } from '@mui/material';

export const PropertiesPanel = ({ selectedElement, onUpdateElement }) => {
  const { id, properties } = selectedElement;

  const update = useCallback(
    (key, value) => {
      onUpdateElement(id, { properties: { ...properties, [key]: value } });
    },
    [id, properties, onUpdateElement],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* MUI controls that call update('propName', value) */}
    </Box>
  );
};
```

### Props reference

**Renderer receives** (`ElementRendererProps` from protocol):

| Prop | Type | Description |
|------|------|-------------|
| `properties` | `Record<string, unknown>` | Your element's configured properties |
| `resolvedValues` | `Record<string, ResolvedSensorValue>` | Live sensor values keyed by sensorTag |
| `width` | `number` | Element width on canvas (pixels) |
| `height` | `number` | Element height on canvas (pixels) |
| `elementPadding` | `number` | Canvas padding setting |
| `showPlaceholders` | `boolean` | Show placeholder values when no data |
| `previewMode` | `boolean` | Canvas is in preview/capture mode |

**PropertiesPanel receives** (`ElementPropertiesPanelProps` from protocol):

| Prop | Type | Description |
|------|------|-------------|
| `selectedElement` | `{ id, type, properties, width, height }` | The selected element |
| `onUpdateElement` | `(id, updates) => void` | Callback to update properties |
| `onDeleteElement` | `(id) => void` | Callback to delete element |

**Sensor values** (`ResolvedSensorValue`): `{ value, unit, label, displayValue }`

### Host services

Plugins access host services via the `useElementHost()` hook from `@junctionrelay/element-sdk`:

```jsx
const { fonts } = useElementHost();

// Load a Google Font (returns Promise)
await fonts.loadGoogleFont('Roboto Mono');

// Check if a font is loaded
fonts.isFontLoaded('Roboto Mono');

// Load pixel fonts (Tom Thumb, Press Start 2P, Pixel Operator)
fonts.loadPixelFonts();

// Check if a font is a pixel font
fonts.isPixelFont('Tom Thumb');
```

### 4. Build

**Inside the monorepo** — run from the repo root so protocol and SDK are built first:

```bash
npm install
npm run build
```

This builds `packages/protocol` → `packages/sdk` → all plugins in dependency order.

To build a single plugin after the initial build:

```bash
npm run build -w plugins/junctionrelay.my-plugin
```

**Outside the monorepo** — run from your plugin directory:

```bash
npm install
npm run build
```

Both produce `dist/index.js` — a single ESM bundle.

**How it works:** The build script externalizes shared dependencies that the host app provides at runtime (React, MUI, Emotion, Element SDK). Everything else is bundled. See `EXTERNAL_PACKAGES` in `packages/protocol/src/index.ts` for the exact list.

**Using `.jsx` vs `.tsx`:** Both work. If you use `.jsx`, you only need `esbuild` as a devDependency — no TypeScript or type packages needed. If you use `.tsx`, you'll also need `@types/react` and a `tsconfig.json` (see hello-sensor for the setup).

### 5. Pack and Deploy

Build and pack in one step (works on all platforms):

```bash
npm run build && npm run pack
```

This produces `<elementName>.zip` containing `package.json` and `dist/index.js` — the only two files the host needs.

Drop the `.zip` file into the elements directory:

| App | Path |
|-----|------|
| **Server (Windows)** | `%APPDATA%\JunctionRelay\elements\` |
| **Server (Docker)** | `/app/data/elements/` |
| **XSD (Windows)** | `%APPDATA%\JunctionRelay_XSD\elements\` |

The app automatically extracts the zip on next startup and deletes the zip file. If a folder with the same name already exists, the zip is skipped — delete the existing folder first to re-install.

Restart the app. Your element appears in the Library palette with the icon, name, and description from the manifest. Drag it onto any layout canvas.

## Style Isolation Rules

Plugins render in the same DOM as the host application. You MUST follow these rules to avoid breaking the host UI:

1. **No global style injection** — do not create `<style>` tags, `<link>` stylesheet tags, or modify `document.body.style`
2. **Use host font services** — call `useElementHost().fonts.loadGoogleFont()` instead of injecting Google Fonts `<link>` tags directly
3. **No broad CSS selectors** — no `*`, `body`, `html`, or bare element-type selectors
4. **No `!important` on inherited properties** with broad selectors

Use inline styles, CSS modules, or scoped CSS-in-JS (the host's shared Emotion instance). See `STYLE_ISOLATION_RULES` in `packages/protocol/src/index.ts` for details.

Plugins that violate style isolation may be rejected from the marketplace.

## Using Third-Party Libraries

Any npm package not in the shared externals list can be used — esbuild bundles it into your `dist/index.js` automatically. Just install it and import it:

```bash
npm install chart.js
```

```jsx
import { Chart } from 'chart.js';  // Bundled into dist/index.js (~200KB)
```

Only the 8 shared packages (listed in `EXTERNAL_PACKAGES`) are provided by the host. Everything else is your responsibility to bundle.

## License

MIT
