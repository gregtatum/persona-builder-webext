// @ts-check
import { getActivePersonaId, watchActivePersona } from "./active-persona.mjs";
import { addHistoryEntry, countHistoryForPersona } from "./persona-db.mjs";
import { log } from "./utils.mjs";

/** @type {string | undefined} */
let activePersonaId = undefined;

async function initActivePersona() {
  activePersonaId = await getActivePersonaId();
  log("Active persona initialized", activePersonaId);
  if (activePersonaId) {
    void updateBadge(activePersonaId);
  }
  watchActivePersona((id) => {
    activePersonaId = typeof id === "string" ? id : undefined;
    log("Active persona changed", activePersonaId);
    if (activePersonaId) {
      void updateBadge(activePersonaId);
    }
  });
}

void initActivePersona();

browser.runtime.onInstalled.addListener(() => {
  log("Persona Builder stub installed");
});

/**
 * @param {unknown} message
 */
browser.runtime.onMessage.addListener((message) => {
  log("Persona Builder stub received message", message);
});

browser.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case "example-log-command":
      await handleCommandAddHistory();
      break;
    default:
      break;
  }
});

async function handleCommandAddHistory() {
  const personaId = activePersonaId;
  if (!personaId) {
    log("Command skipped: no active persona set");
    return;
  }

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    log("Command skipped: no active tab with URL");
    return;
  }

  const visitedAt = new Date().toISOString();
  const title = tab.title || tab.url;
  await addHistoryEntry({
    personaId,
    url: tab.url,
    title,
    description: tab.title || "",
    visitedAt
  });
  log("Added history from command", { personaId, url: tab.url });
  void updateBadge(personaId);
  if (tab.id !== undefined) {
    void captureSingleFileSnapshot(tab.id);
  }
}

/**
 * @param {string} personaId
 */
async function updateBadge(personaId) {
  try {
    const count = await countHistoryForPersona(personaId);
    await browser.browserAction.setBadgeText({ text: String(count) });
  } catch (error) {
    log("Badge update failed", error);
  }
}

/**
 * Request a SingleFile snapshot in the active tab and log the content.
 * @param {number | undefined} tabId
 */
async function captureSingleFileSnapshot(tabId) {
  if (typeof tabId !== "number") {
    log("SingleFile snapshot skipped: missing tab id");
    return;
  }
  try {
    const response = await browser.tabs.sendMessage(tabId, { type: "capture-singlefile" });
    if (response?.ok) {
      console.log(response.content || "");
    } else {
      log("SingleFile snapshot failed", response?.error);
    }
  } catch (error) {
    log("SingleFile snapshot errored", error);
  }
}
