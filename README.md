# Persona Builder

Build a Firefox Persona with browser history, and snapshots of HTML.

## Run locally

```sh
npm install
# Point to your Firefox
export FIREFOX_BIN="/Applications/Firefox.app/Contents/MacOS/firefox"
npm run start
```

## Dev commands

| Command | Description |
| --- | --- |
| `npm run start` | Launch the extension with `web-ext run` (requires `FIREFOX_BIN` path set) |
| `npm run lint` | Lint the extension with `web-ext lint` |
| `npm run test` | Run Jest tests |
| `npm run ts` | Type-check with TypeScript |
| `npm run release` | Bump version, sync manifest, sign, tag, and publish release (needs AMO credentials) |
