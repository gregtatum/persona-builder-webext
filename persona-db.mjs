// @ts-check
/**
 * @import {PersonaRecord, HistoryRecord, HistoryInput, PageSnapshotRecord, InsightRecord, InsightInput} from "./types"
 */

const DB_NAME = "personaBuilder";
const DB_VERSION = 1;
/** @type {IDBDatabase | null} */
let db = null;

/**
 * @returns {string}
 */
function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Open (and upgrade) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
export function openDb() {
  if (db) {
    return Promise.resolve(db);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error || new Error("Failed to open DB"));

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("personas")) {
        database.createObjectStore("personas", { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains("history")) {
        const history = database.createObjectStore("history", { keyPath: "id" });
        history.createIndex("byPersona", "personaId", { unique: false });
        history.createIndex("byPersonaVisitedAt", ["personaId", "visitedAt"], { unique: false });
        history.createIndex("byPersonaUrl", ["personaId", "url"], { unique: false });
      }

      if (!database.objectStoreNames.contains("pageSnapshots")) {
        const pageSnapshots = database.createObjectStore("pageSnapshots", { keyPath: "historyId" });
        pageSnapshots.createIndex("byHistory", "historyId", { unique: true });
        pageSnapshots.createIndex("byPersona", "personaId", { unique: false });
      }

      if (!database.objectStoreNames.contains("insights")) {
        const insights = database.createObjectStore("insights", { keyPath: "id" });
        insights.createIndex("byPersona", "personaId", { unique: false });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(request.result);
    };
  });
}

/** Close the cached database connection (useful for tests). */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * @template T
 * @param {IDBObjectStore | IDBIndex} source
 * @param {IDBValidKey | IDBKeyRange | null} [keyOrRange]
 * @returns {Promise<T[]>}
 */
function getAll(source, keyOrRange = null) {
  return new Promise((resolve, reject) => {
    const request = source.getAll(keyOrRange);
    request.onerror = () => reject(request.error || new Error("getAll failed"));
    request.onsuccess = () => resolve(/** @type {T[]} */ (request.result));
  });
}

/**
 * @template T
 * @param {IDBObjectStore} source
 * @param {T} value
 * @returns {Promise<void>}
 */
function put(source, value) {
  return new Promise((resolve, reject) => {
    const request = source.put(value);
    request.onerror = () => reject(request.error || new Error("put failed"));
    request.onsuccess = () => resolve();
  });
}

/**
 * @param {"readonly" | "readwrite"} mode
 * @param {string[]} storeNames
 * @returns {Promise<IDBTransaction>}
 */
async function transaction(mode, storeNames) {
  const database = await openDb();
  return database.transaction(storeNames, mode);
}

/**
 * @param {string} name
 * @returns {Promise<PersonaRecord>}
 */
export async function addPersona(name) {
  const tx = await transaction("readwrite", ["personas"]);
  /** @type {PersonaRecord} */
  const persona = {
    id: makeId(),
    name,
    createdAt: new Date().toISOString()
  };
  await put(tx.objectStore("personas"), persona);
  tx.commit?.();
  return persona;
}

/**
 * @returns {Promise<PersonaRecord[]>}
 */
export async function listPersonas() {
  const tx = await transaction("readonly", ["personas"]);
  const all = await getAll(/** @type {IDBObjectStore} */ (tx.objectStore("personas")));
  tx.commit?.();
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Lookup a history record by persona and URL.
 * @param {string} personaId
 * @param {string} url
 * @returns {Promise<HistoryRecord | undefined>}
 */
export async function findHistoryByPersonaUrl(personaId, url) {
  const tx = await transaction("readonly", ["history"]);
  const index = tx.objectStore("history").index("byPersonaUrl");
  const key = IDBKeyRange.only([personaId, url]);
  return new Promise((resolve, reject) => {
    const req = index.get(key);
    req.onerror = () => reject(req.error || new Error("lookup failed"));
    req.onsuccess = () => {
      tx.commit?.();
      resolve(/** @type {HistoryRecord | undefined} */ (req.result));
    };
  });
}

/**
 * @param {HistoryInput} history
 * @returns {Promise<HistoryRecord>}
 */
export async function addHistoryEntry(history) {
  const existing = await findHistoryByPersonaUrl(history.personaId, history.url);
  const tx = await transaction("readwrite", ["history"]);
  const store = tx.objectStore("history");
  const record = {
    ...history,
    id: existing?.id || history.id || makeId()
  };
  await put(store, record);
  tx.commit?.();
  return record;
}

/**
 * @param {PageSnapshotRecord} snapshot
 * @returns {Promise<void>}
 */
export async function addPageSnapshot(snapshot) {
  const tx = await transaction("readwrite", ["pageSnapshots"]);
  await put(tx.objectStore("pageSnapshots"), snapshot);
  tx.commit?.();
}

/**
 * @param {string} personaId
 * @param {InsightInput} insight
 * @returns {Promise<InsightRecord>}
 */
export async function addInsight(personaId, insight) {
  const tx = await transaction("readwrite", ["insights"]);
  const record = {
    ...insight,
    id: insight.id || makeId(),
    personaId
  };
  await put(tx.objectStore("insights"), record);
  tx.commit?.();
  return record;
}

/**
 * Count history entries for a persona.
 * @param {string} personaId
 * @returns {Promise<number>}
 */
export async function countHistoryForPersona(personaId) {
  const tx = await transaction("readonly", ["history"]);
  const index = tx.objectStore("history").index("byPersona");
  return new Promise((resolve, reject) => {
    const req = index.count(IDBKeyRange.only(personaId));
    req.onerror = () => reject(req.error || new Error("count failed"));
    req.onsuccess = () => {
      tx.commit?.();
      resolve(req.result || 0);
    };
  });
}
