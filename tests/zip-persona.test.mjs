import {
  buildPersonaZip,
  parsePersonaZip,
  buildSnapshotPath,
  buildPersonaJson,
} from "../src/zip-persona.mjs";
import { zipTree } from "./helpers/zip-tree.mjs";

describe("zip-persona roundtrip", () => {
  it("exports and imports a persona archive with snapshots", async () => {
    const persona = {
      id: "persona-1",
      name: "Roundtrip",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const historyEntry = {
      id: "history-1",
      personaId: persona.id,
      url: "https://example.com/path/page",
      title: "Example Page",
      description: "Desc",
      visitedAt: "2024-01-02T00:00:00.000Z",
    };
    const nestedEntry = {
      id: "history-2",
      personaId: persona.id,
      url: "https://example.com/c/appliance-sales.html",
      title: "Nested Page",
      description: "Nested",
      visitedAt: "2024-01-03T00:00:00.000Z",
    };

    const html = "<html><body><p>snapshot</p></body></html>";
    const zipBlob = await buildPersonaZip(persona, [
      { entry: historyEntry, html },
      { entry: nestedEntry, html: "<p>nested</p>" },
    ]);

    const parsed = await parsePersonaZip(zipBlob);

    expect(parsed.persona?.name).toBe(persona.name);
    expect(parsed.history).toHaveLength(2);
    const imported = parsed.history[0];
    const importedNested = parsed.history[1];
    expect(imported.entry.url).toBe(historyEntry.url);
    expect(imported.entry.snapshotPath).toBe(
      `./${buildSnapshotPath(historyEntry.url)}`
    );
    expect(imported.entry.personaId).toBeUndefined();
    expect(imported.entry.id).toBeUndefined();
    expect(imported.snapshotHtml).toBe(html);
    expect(importedNested.entry.url).toBe(nestedEntry.url);
    expect(importedNested.entry.snapshotPath).toBe(
      `./${buildSnapshotPath(nestedEntry.url)}`
    );
    expect(importedNested.entry.personaId).toBeUndefined();
    expect(importedNested.entry.id).toBeUndefined();
    expect(importedNested.snapshotHtml).toBe("<p>nested</p>");

    const tree = await zipTree(zipBlob);
    expect(tree).toBe(
      [
        ".",
        "├── persona.json",
        "└── snapshot",
        "    └── example.com",
        "        ├── c_appliance-sales.html",
        "        └── path_page.html",
      ].join("\n")
    );
  });
});

describe("buildPersonaJson", () => {
  it("matches the structure of persona.json used in the zip", () => {
    const persona = {
      id: "persona-123",
      name: "Json Persona",
      createdAt: "2024-06-01T12:00:00.000Z",
    };
    const historyEntry = {
      id: "history-abc",
      personaId: persona.id,
      url: "https://example.com/path",
      title: "Some page",
      description: "Desc",
      visitedAt: "2024-06-02T00:00:00.000Z",
    };

    const json = buildPersonaJson(persona, [{ entry: historyEntry }]);
    const parsed = JSON.parse(json);

    expect(parsed.persona).toEqual(persona);
    expect(parsed.history).toHaveLength(1);
    expect(parsed.history[0]).toEqual({
      url: historyEntry.url,
      title: historyEntry.title,
      description: historyEntry.description,
      visitedAt: historyEntry.visitedAt,
      snapshotPath: `./${buildSnapshotPath(historyEntry.url)}`,
    });
    expect(parsed.history[0].personaId).toBeUndefined();
    expect(parsed.history[0].id).toBeUndefined();
  });
});
