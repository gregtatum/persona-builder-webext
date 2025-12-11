// @ts-check
import {
  BlobReader as ZipBlobReader,
  BlobWriter as ZipBlobWriter,
  TextWriter as ZipTextWriter,
  ZipWriter,
  ZipReader,
  configure as configureZip,
} from "../vendor/zipjs/index.js";

/** @typedef {import("./types").PersonaRecord} PersonaRecord */
/** @typedef {import("./types").HistoryRecord} HistoryRecord */

/**
 * @param {string} url
 */
export function buildSnapshotPath(url) {
  try {
    const parsed = new URL(url);
    const host = sanitizeSegment(parsed.hostname || "unknown");
    const pathParts = parsed.pathname.split("/").filter(Boolean).map(sanitizeSegment);
    const baseParts = pathParts.length ? pathParts : ["index"];
    const searchPart = parsed.search ? sanitizeSegment(`query_${parsed.search.slice(1)}`) : "";
    const hashPart = parsed.hash ? sanitizeSegment(`hash_${parsed.hash.slice(1)}`) : "";
    const combinedParts = [...baseParts];
    if (searchPart) combinedParts.push(searchPart);
    if (hashPart) combinedParts.push(hashPart);
    const restCombined = combinedParts.join("_") || "index";
    const finalRest = restCombined.endsWith(".html") ? restCombined : `${restCombined}.html`;
    return `snapshot/${host}/${finalRest}`;
  } catch {
    const fallback = `${sanitizeSegment(url) || "page"}.html`;
    return `snapshot/unknown/${fallback}`;
  }
}

/**
 * @param {string} value
 */
export function sanitizeSegment(value) {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned || "item";
}

/**
 * Build the persona export payload that lands in persona.json.
 * @param {PersonaRecord} persona
 * @param {Array<{ entry: HistoryRecord; html?: string | null }>} historySnapshots
 */
export function buildPersonaExport(persona, historySnapshots) {
  return {
    persona,
    history: historySnapshots.map(({ entry }) => {
      const { personaId: _omitPersonaId, id: _omitId, ...rest } = entry;
      return {
        ...rest,
        snapshotPath: `./${buildSnapshotPath(entry.url)}`,
      };
    }),
  };
}

/**
 * Stringify the persona export payload with pretty formatting.
 * @param {PersonaRecord} persona
 * @param {Array<{ entry: HistoryRecord; html?: string | null }>} historySnapshots
 */
export function buildPersonaJson(persona, historySnapshots) {
  return JSON.stringify(buildPersonaExport(persona, historySnapshots), null, 2);
}

/**
 * Build a persona zip archive.
 * @param {PersonaRecord} persona
 * @param {Array<{ entry: HistoryRecord; html?: string | null }>} historySnapshots
 * @returns {Promise<Blob>}
 */
export async function buildPersonaZip(persona, historySnapshots) {
  configureZip({ useWebWorkers: false });
  const writer = new ZipWriter(new ZipBlobWriter("application/zip"));

  const snapshotEntries = [];
  for (const { entry, html } of historySnapshots) {
    if (!html) continue;
    const path = buildSnapshotPath(entry.url);
    snapshotEntries.push({ entry, snapshotPath: path, html });
  }

  const personaJson = buildPersonaJson(persona, historySnapshots);
  await writer.add("persona.json", new ZipBlobReader(new Blob([personaJson], { type: "application/json" })));

  for (const { snapshotPath, html } of snapshotEntries) {
    await writer.add(snapshotPath, new ZipBlobReader(new Blob([html], { type: "text/html" })));
  }

  return writer.close();
}

/**
 * Parse a persona zip archive.
 * @param {Blob} zipBlob
 */
export async function parsePersonaZip(zipBlob) {
  configureZip({ useWebWorkers: false });
  const reader = new ZipReader(new ZipBlobReader(zipBlob));
  const entries = await reader.getEntries();

  const personaEntry = entries.find((entry) => entry.filename === "persona.json");
  if (!personaEntry?.getData) {
    throw new Error("persona.json not found in zip");
  }

  const personaJson = await personaEntry.getData(new ZipTextWriter());
  const parsed = personaJson ? JSON.parse(personaJson) : {};
  const history = Array.isArray(parsed?.history) ? parsed.history : [];
  const persona = parsed?.persona;

  /** @type {Array<{ entry: any; snapshotHtml?: string }>} */
  const imported = [];
  for (const item of history) {
    const snapshotPath = typeof item.snapshotPath === "string" ? item.snapshotPath.replace(/^\.\//, "") : null;
    const snapshotEntry = snapshotPath
      ? entries.find((entry) => entry.filename === snapshotPath)
      : undefined;
    const snapshotHtml = snapshotEntry?.getData
      ? await snapshotEntry.getData(new ZipTextWriter())
      : undefined;
    imported.push({ entry: item, snapshotHtml });
  }

  await reader.close();
  return { persona, history: imported };
}
