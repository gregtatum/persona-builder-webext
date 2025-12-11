#!/usr/bin/env bash

# Do a release of the web extension by doing a major bump of the tag, and then pushing
# all of the release assets to GitHub.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v gh >/dev/null 2>&1 || {
  echo "gh CLI is required to publish GitHub releases. Install it from https://cli.github.com/." >&2
  exit 1
}
command -v git >/dev/null 2>&1 || {
  echo "git is required to tag releases." >&2
  exit 1
}

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. To get started with GitHub CLI, please run:  gh auth login" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree must be clean before releasing. Commit or stash changes first." >&2
  exit 1
fi

if [[ -z "${AMO_JWT_ISSUER:-}" || -z "${AMO_JWT_SECRET:-}" ]]; then
  cat <<'EOF'
AMO credentials are required to sign the extension.
Get API keys from: https://addons.mozilla.org/en-US/developers/addon/api/key/
Then export them before running the release:
  export AMO_JWT_ISSUER=your_api_key
  export AMO_JWT_SECRET=your_api_secret
EOF
  exit 1
fi

echo "Bumping package version (major)..."
npm version major --no-git-tag-version >/dev/null

PKG_VERSION="$(node -p "require('./package.json').version")"
TAG="${TAG:-v${PKG_VERSION}}"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists. Delete or set TAG=<new> to override." >&2
  exit 1
fi
export AMO_JWT_ISSUER AMO_JWT_SECRET

echo "Signing extension (unlisted channel)..."
npx web-ext sign \
  --channel unlisted \
  --artifacts-dir "$ROOT_DIR/dist" \
  --api-key "$AMO_JWT_ISSUER" \
  --api-secret "$AMO_JWT_SECRET" \
  --config ./.web-ext-config.mjs

ARTIFACT="$(ls -t "$ROOT_DIR"/dist/*.{xpi,zip} 2>/dev/null | head -n 1 || true)"
if [[ -z "$ARTIFACT" ]]; then
  echo "No build artifact found in dist/." >&2
  exit 1
fi

echo "Committing version bump..."
git add package.json package-lock.json
git commit -m "Release $TAG"

echo "Creating git tag $TAG..."
git tag -a "$TAG" -m "Release $TAG"

echo "Pushing main branch to origin..."
git push origin main

echo "Pushing tag $TAG to origin..."
git push origin "$TAG"

RELEASE_TITLE="${RELEASE_TITLE:-Persona Builder $TAG}"
RELEASE_NOTES="${RELEASE_NOTES:-Automated release for $TAG}"

echo "Publishing GitHub release $TAG with artifact $ARTIFACT ..."
gh release create "$TAG" "$ARTIFACT" --title "$RELEASE_TITLE" --notes "$RELEASE_NOTES"
