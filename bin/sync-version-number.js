#!/usr/bin/env node
// @ts-nocheck

const fs = require("fs");

const manifestPath = "manifest.json";
const pkg = require("../package.json");

// Keep the manifest version aligned with package.json for signing/publishing.
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.version = pkg.version;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
