import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import * as personaDb from '../persona-db.mjs';

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

const DB_NAME = "personaBuilder";

async function deleteDatabase(name) {
  const req = indexedDB.deleteDatabase(name);
  await new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error || new Error("deleteDatabase failed"));
    req.onsuccess = () => resolve();
  });
}

describe('persona-db', () => {
  beforeEach(async () => {
    await deleteDatabase(DB_NAME);
  });

  it('creates a persona', async () => {
    const persona = await personaDb.addPersona('Test Persona');
    expect(persona.name).toBe('Test Persona');
    expect(persona.id).toBeTruthy();

    const all = await personaDb.listPersonas();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: persona.id, name: 'Test Persona' });
  });
});
