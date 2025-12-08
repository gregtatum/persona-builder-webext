## Persona Builder

Build a Firefox Persona with browser history, and snapshots of HTML.

### Dev commands
- `npm start`: Launches the extension via `web-ext run` (config in `.web-ext-config.mjs`) through `bin/run-web-ext.sh`. Uses the default Firefox unless you set `FIREFOX_BIN` to a specific binary path, e.g. `FIREFOX_BIN=/Applications/Firefox.app/Contents/MacOS/firefox npm start`.
- `npm run ts`: Type-checks JS via TypeScript (strict, no emit).
- `npm run lint`: Lints with `web-ext lint`.
- `npm run build`: Builds a ZIP into `dist/`.
