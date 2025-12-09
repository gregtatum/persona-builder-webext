#!/usr/bin/env bash
set -euo pipefail
# https://github.com/gildas-lormeau/SingleFile
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${ROOT_DIR}/SingleFile"
DIST_DIR="${SRC_DIR}/lib"
DEST_DIR="${ROOT_DIR}/vendor/singlefile"

if [[ ! -d "${SRC_DIR}" ]]; then
  echo "SingleFile source not found at ${SRC_DIR} (expected symlink to the upstream repo)." >&2
  exit 1
fi

if [[ ! -d "${DIST_DIR}" ]]; then
  cat >&2 <<EOF
SingleFile dist not found at ${DIST_DIR}.
Build it first by running inside ${SRC_DIR}:
  npm install
  npx rollup -c rollup.config.js
EOF
  exit 1
fi

rm -rf "${DEST_DIR}"
mkdir -p "${DEST_DIR}"
cp -R "${DIST_DIR}/" "${DEST_DIR}/"

echo "Copied SingleFile dist from ${DIST_DIR} to ${DEST_DIR}"
