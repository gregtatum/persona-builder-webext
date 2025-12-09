## Persona Builder

Build a Firefox Persona with browser history, and snapshots of HTML.

### Dev commands
- `npm start`: Launches the extension via `web-ext run` (config in `.web-ext-config.mjs`) through `bin/run-web-ext.sh`. Uses the default Firefox unless you set `FIREFOX_BIN` to a specific binary path, e.g. `FIREFOX_BIN=/Applications/Firefox.app/Contents/MacOS/firefox npm start`.
- `npm run ts`: Type-checks JS via TypeScript (strict, no emit).
- `npm run lint`: Lints with `web-ext lint`.
- `npm run build`: Builds a ZIP into `dist/`.
- `bin/update-singlefile`: Copies the built SingleFile dist (from the symlinked `SingleFile/lib`) into `vendor/singlefile`. Run `npm install && npx rollup -c rollup.config.js` inside `SingleFile/` first if `lib/` is missing.

### Assets
- Icons are derived from `assets/person-*.png` (800x800) into `assets/icons/` for add-on and toolbar sizes (19/38/48/96/128). Currently manifest uses the dark variants; light variants are also available.
