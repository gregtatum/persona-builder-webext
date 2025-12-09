// @ts-check

const ACTIVE_PERSONA_KEY = "personaBuilder:activePersonaId";

/**
 * Read the currently active persona id from extension storage.
 * @returns {Promise<string | undefined>}
 */
export async function getActivePersonaId() {
  try {
    const stored = await browser.storage.local.get(ACTIVE_PERSONA_KEY);
    const id = stored[ACTIVE_PERSONA_KEY];
    return typeof id === "string" ? id : undefined;
  } catch (_error) {
    return undefined;
  }
}

/**
 * Persist the active persona id to extension storage.
 * @param {string} id
 */
export async function setActivePersonaId(id) {
  try {
    await browser.storage.local.set({ [ACTIVE_PERSONA_KEY]: id });
  } catch (_error) {
    // Best effort; ignore storage errors (e.g., quota).
  }
}

/**
 * Subscribe to active persona changes.
 * @param {(id: string | undefined) => void} listener
 * @returns {() => void} unsubscribe
 */
export function watchActivePersona(listener) {
  /**
   * @param {{ [key: string]: browser.storage.StorageChange }} changes
   * @param {string} area
   */
  const handler = (changes, area) => {
    if (area !== "local") {
      return;
    }
    const change = changes[ACTIVE_PERSONA_KEY];
    if (!change) {
      return;
    }
    listener(typeof change.newValue === "string" ? change.newValue : undefined);
  };

  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
