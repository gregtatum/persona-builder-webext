## Persona Builder

Build a Firefox Persona with browser history, and snapshots of HTML.

### Dev commands
- `npm start`: Launches the extension via `web-ext run` (config in `.web-ext-config.js`).
- `npm run lint`: Lints with `web-ext lint`.
- `npm run build`: Builds a ZIP into `dist/`.

### Files
- `manifest.json`: MV2 manifest wiring popup, background, and content script.
- `background.js`: Background script entry.
- `content.js`: Content script injected into pages.
- `popup.html` / `popup.js`: Popup UI with persona dropdown, add persona prompt, and capture button (logs actions).
- `.web-ext-config.cjs`: Shared config for `web-ext` commands.

### Load as a temporary add-on
1. `npm start` (or go to `about:debugging#/runtime/this-firefox` and load `manifest.json`).
2. Use the toolbar popup; check Browser Console for logs to see actions.
