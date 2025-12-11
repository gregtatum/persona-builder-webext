import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import * as personaDb from "../persona-db.mjs";

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

const DB_NAME = "personaBuilder";

/**
 * @template T
 * @param {string} storeName
 * @returns {Promise<T[]>}
 */
async function readAllFromStore(storeName) {
  const db = await personaDb.openDb();
  const tx = db.transaction([storeName], "readonly");
  const store = tx.objectStore(storeName);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error || new Error("getAll failed"));
    req.onsuccess = () => resolve(/** @type {T[]} */ (req.result));
  });
}

/**
 * @template T
 * @param {string} storeName
 * @param {string} indexName
 * @param {IDBValidKey | IDBKeyRange | null} query
 * @returns {Promise<T[]>}
 */
async function readAllFromIndex(storeName, indexName, query) {
  const db = await personaDb.openDb();
  const tx = db.transaction([storeName], "readonly");
  const index = tx.objectStore(storeName).index(indexName);
  const req = index.getAll(query);
  return new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error || new Error("getAll failed"));
    req.onsuccess = () => resolve(/** @type {T[]} */ (req.result));
  });
}

/**
 * @param {string} storeName
 * @param {unknown} value
 * @returns {Promise<void>}
 */
async function putRecord(storeName, value) {
  const db = await personaDb.openDb();
  const tx = db.transaction([storeName], "readwrite");
  const store = tx.objectStore(storeName);
  const req = store.put(value);
  await new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error || new Error("put failed"));
    req.onsuccess = () => resolve(undefined);
  });
  tx.commit?.();
}

describe("persona-db", () => {
  beforeEach(async () => {
    personaDb.closeDb();
    const request = indexedDB.deleteDatabase(DB_NAME);
    await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(undefined);
    });
  });

  afterEach(() => {
    personaDb.closeDb();
  });

  it("creates a persona", async () => {
    const persona = await personaDb.addPersona("Test Persona");
    expect(persona.name).toBe("Test Persona");
    expect(persona.id).toBeTruthy();

    const all = await personaDb.listPersonas();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: persona.id, name: "Test Persona" });
  });

  it("upserts history entries by persona and url", async () => {
    const persona = await personaDb.addPersona("History Persona");
    const first = await personaDb.addHistoryEntry({
      personaId: persona.id,
      url: "https://example.com/",
      title: "First visit",
      description: "Initial entry",
      visitedAt: "2024-01-01T00:00:00.000Z",
    });

    expect(first.id).toBeTruthy();

    const updated = await personaDb.addHistoryEntry({
      personaId: persona.id,
      url: first.url,
      title: "Updated visit",
      description: "Updated entry",
      visitedAt: "2024-01-02T00:00:00.000Z",
    });

    expect(updated.id).toBe(first.id);

    const found = await personaDb.findHistoryByPersonaUrl(
      persona.id,
      first.url
    );
    expect(found?.title).toBe("Updated visit");
    expect(found?.visitedAt).toBe("2024-01-02T00:00:00.000Z");

    const missing = await personaDb.findHistoryByPersonaUrl(
      persona.id,
      "https://missing.example/"
    );
    expect(missing).toBeUndefined();
  });

  it("counts history per persona", async () => {
    const personaOne = await personaDb.addPersona("One");
    const personaTwo = await personaDb.addPersona("Two");

    await personaDb.addHistoryEntry({
      personaId: personaOne.id,
      url: "https://one.example/a",
      title: "A",
      description: "A",
      visitedAt: "2024-01-01T00:00:00.000Z",
    });
    await personaDb.addHistoryEntry({
      personaId: personaOne.id,
      url: "https://one.example/b",
      title: "B",
      description: "B",
      visitedAt: "2024-01-02T00:00:00.000Z",
    });
    await personaDb.addHistoryEntry({
      personaId: personaTwo.id,
      url: "https://two.example/a",
      title: "A",
      description: "A",
      visitedAt: "2024-01-03T00:00:00.000Z",
    });

    await expect(personaDb.countHistoryForPersona(personaOne.id)).resolves.toBe(
      2
    );
    await expect(personaDb.countHistoryForPersona(personaTwo.id)).resolves.toBe(
      1
    );
    await expect(
      personaDb.countHistoryForPersona("missing-persona")
    ).resolves.toBe(0);
  });

  it("stores the latest page snapshot per history and indexes by persona", async () => {
    const persona = await personaDb.addPersona("Snapshot Persona");
    const history = await personaDb.addHistoryEntry({
      personaId: persona.id,
      url: "https://snap.example/",
      title: "Snap",
      description: "Snap",
      visitedAt: "2024-01-04T00:00:00.000Z",
    });

    await personaDb.addPageSnapshot({
      historyId: history.id,
      personaId: persona.id,
      url: history.url,
      capturedAt: "2024-01-05T00:00:00.000Z",
      html: "<p>first</p>",
    });

    await personaDb.addPageSnapshot({
      historyId: history.id,
      personaId: persona.id,
      url: history.url,
      capturedAt: "2024-01-06T00:00:00.000Z",
      html: "<p>updated</p>",
    });

    const snapshots = await readAllFromIndex(
      "pageSnapshots",
      "byPersona",
      IDBKeyRange.only(persona.id)
    );
    const typedSnapshots =
      /** @type {import("../types").PageSnapshotRecord[]} */ (snapshots);
    expect(typedSnapshots).toHaveLength(1);
    expect(typedSnapshots[0]).toMatchObject({
      historyId: history.id,
      html: "<p>updated</p>",
    });
  });

  it("retrieves a page snapshot by history id", async () => {
    const persona = await personaDb.addPersona("Get Snapshot Persona");
    const history = await personaDb.addHistoryEntry({
      personaId: persona.id,
      url: "https://snap2.example/",
      title: "Snap 2",
      description: "Snap 2",
      visitedAt: "2024-01-07T00:00:00.000Z",
    });

    await personaDb.addPageSnapshot({
      historyId: history.id,
      personaId: persona.id,
      url: history.url,
      capturedAt: "2024-01-08T00:00:00.000Z",
      html: "<p>snapshot</p>",
    });

    const snapshot = await personaDb.getPageSnapshot(history.id);
    expect(snapshot).toMatchObject({
      historyId: history.id,
      html: "<p>snapshot</p>",
    });

    const missing = await personaDb.getPageSnapshot("missing-id");
    expect(missing).toBeUndefined();
  });

  it("adds insights with generated and provided ids", async () => {
    const persona = await personaDb.addPersona("Insight Persona");

    const generated = await personaDb.addInsight(persona.id, {
      insight_summary: "Generated summary",
      category: "News",
      intent: "Communicate / Share",
      score: 3,
      updated_at: 1700000000000,
      is_deleted: false,
    });

    const provided = await personaDb.addInsight(persona.id, {
      id: "given-id",
      insight_summary: "Provided summary",
      category: "Travel & Transportation",
      intent: "Plan / Organize",
      score: 5,
      updated_at: 1700000001000,
      is_deleted: false,
    });

    expect(generated.id).toBeTruthy();
    expect(provided.id).toBe("given-id");

    const insights = await readAllFromStore("insights");
    const typedInsights = /** @type {import("../types").InsightRecord[]} */ (
      insights
    );
    expect(typedInsights).toHaveLength(2);
    expect(typedInsights.map((i) => i.personaId)).toEqual([
      persona.id,
      persona.id,
    ]);
    expect(
      typedInsights.find((i) => i.id === "given-id")?.insight_summary
    ).toBe("Provided summary");
  });

  it("updates an insight", async () => {
    const persona = await personaDb.addPersona("Insight Update Persona");
    const insight = await personaDb.addInsight(persona.id, {
      insight_summary: "Original summary",
      category: "News",
      intent: "Communicate / Share",
      score: 1,
      updated_at: 1700000000000,
      is_deleted: false,
    });

    const updated = await personaDb.updateInsight(insight.id, {
      insight_summary: "Updated summary",
      score: 5,
    });

    expect(updated.insight_summary).toBe("Updated summary");
    expect(updated.score).toBe(5);
    expect(updated.personaId).toBe(persona.id);
    const all = await readAllFromStore("insights");
    expect(all[0].insight_summary).toBe("Updated summary");
  });

  it("deletes history entries and snapshots", async () => {
    const persona = await personaDb.addPersona("Delete Persona");
    const entry = await personaDb.addHistoryEntry({
      personaId: persona.id,
      url: "https://delete.me/",
      title: "Delete Me",
      description: "Desc",
      visitedAt: "2024-02-01T00:00:00.000Z",
    });
    await personaDb.addPageSnapshot({
      historyId: entry.id,
      personaId: persona.id,
      url: entry.url,
      capturedAt: "2024-02-02T00:00:00.000Z",
      html: "<p>to be removed</p>",
    });

    await personaDb.deleteHistoryEntry(entry.id);

    const history = await readAllFromStore("history");
    const snapshots = await readAllFromStore("pageSnapshots");
    expect(history).toHaveLength(0);
    expect(snapshots).toHaveLength(0);
  });

  it("deletes a persona and related records", async () => {
    const persona = await personaDb.addPersona("Persona To Remove");
    const entry = await personaDb.addHistoryEntry({
      personaId: persona.id,
      url: "https://remove.me/",
      title: "Remove Me",
      description: "Desc",
      visitedAt: "2024-02-01T00:00:00.000Z",
    });
    await personaDb.addPageSnapshot({
      historyId: entry.id,
      personaId: persona.id,
      url: entry.url,
      capturedAt: "2024-02-02T00:00:00.000Z",
      html: "<p>to be removed</p>",
    });
    await personaDb.addInsight(persona.id, {
      insight_summary: "remove insight",
      category: "News",
      intent: "Communicate / Share",
      score: 2,
      updated_at: 1700000002000,
      is_deleted: false,
    });

    await personaDb.deletePersona(persona.id);

    const personas = await readAllFromStore("personas");
    const history = await readAllFromStore("history");
    const snapshots = await readAllFromStore("pageSnapshots");
    const insights = await readAllFromStore("insights");
    expect(personas).toHaveLength(0);
    expect(history).toHaveLength(0);
    expect(snapshots).toHaveLength(0);
    expect(insights).toHaveLength(0);
  });

  it("sorts personas by createdAt ascending", async () => {
    const first = await personaDb.addPersona("First");
    const second = await personaDb.addPersona("Second");

    await putRecord("personas", {
      ...first,
      createdAt: "2024-03-01T00:00:00.000Z",
    });
    await putRecord("personas", {
      ...second,
      createdAt: "2024-03-01T00:00:01.000Z",
    });

    const names = (await personaDb.listPersonas()).map((p) => p.name);
    expect(names).toEqual(["First", "Second"]);
  });

  it("renames a persona", async () => {
    const persona = await personaDb.addPersona("Original Name");

    await expect(
      personaDb.updatePersonaName(persona.id, "Updated Name")
    ).resolves.toBeUndefined();

    const personas = await readAllFromStore("personas");
    expect(personas).toHaveLength(1);
    expect(personas[0]).toMatchObject({
      id: persona.id,
      name: "Updated Name",
    });
  });

  it("lists insights by persona ordered by updated_at descending", async () => {
    const persona = await personaDb.addPersona("Insight Sort Persona");
    await personaDb.addInsight(persona.id, {
      insight_summary: "Older",
      category: "News",
      intent: "Research / Learn",
      score: 2,
      updated_at: 1700000000000,
      is_deleted: false,
    });
    await personaDb.addInsight(persona.id, {
      insight_summary: "Newer",
      category: "Travel & Transportation",
      intent: "Plan / Organize",
      score: 5,
      updated_at: 1700000005000,
      is_deleted: false,
    });

    const insights = await personaDb.listInsightsForPersona(persona.id);
    expect(insights.map((i) => i.insight_summary)).toEqual(["Newer", "Older"]);
  });
});
