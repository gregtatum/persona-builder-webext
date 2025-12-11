#!/usr/bin/env bash
# Helper used by npm start to choose between default Firefox or a custom binary via FIREFOX_BIN when running web-ext.
set -euo pipefail

CONFIG_PATH="./.web-ext-config.mjs"

if [[ -n "${FIREFOX_BIN:-}" ]]; then
  echo "Using Firefox from FIREFOX_BIN=${FIREFOX_BIN}"
  web-ext run \
    --browser-console \
    --keep-profile-changes \
    --firefox-profile ./profile \
    --profile-create-if-missing \
    --watch-ignored "**/profile" \
    --config "$CONFIG_PATH" \
    --firefox "$FIREFOX_BIN"
else
  echo "Using default Firefox"
  web-ext run \
    --browser-console \
    --keep-profile-changes \
    --firefox-profile ./profile \
    --profile-create-if-missing \
    --watch-ignored "**/profile" \
    --config "$CONFIG_PATH"
fi
