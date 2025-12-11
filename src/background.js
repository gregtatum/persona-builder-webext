// @ts-check
import { getActivePersonaId, watchActivePersona } from "./active-persona.mjs";
import {
  addHistoryEntry,
  addPageSnapshot,
  countHistoryForPersona,
} from "./persona-db.mjs";
import {
  BlobReader as ZipBlobReader,
  ZipReader,
  configure as configureZip,
} from "../vendor/zipjs/index.js";

/**
 * @param {any} message
 * @param {...any} rest
 */
export function log(message, ...rest) {
  console.log("[persona]", message, ...rest);
}

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
  if (message?.type === "capture-page-snapshot") {
    void handleCaptureSnapshotRequest(message);
  }
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
  const history = await addHistoryEntry({
    personaId,
    url: tab.url,
    title,
    description: tab.title || "",
    visitedAt,
  });
  log("Added history from command", { personaId, url: tab.url });
  void updateBadge(personaId);
  if (tab.id !== undefined) {
    void capturePageSnapshot(tab.id, history);
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
 * @param {import("./@types").HistoryRecord} history
 */
async function capturePageSnapshot(tabId, history) {
  if (typeof tabId !== "number") {
    log("SingleFile snapshot skipped: missing tab id");
    return;
  }
  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: "capture-page-snapshot",
    });
    if (!response?.ok) {
      log("SingleFile snapshot failed", response?.error);
      return;
    }
    await addPageSnapshot({
      historyId: history.id,
      personaId: history.personaId,
      url: history.url,
      capturedAt: new Date().toISOString(),
      html: response.content,
    });
    log("Snapshot stored", { historyId: history.id, url: history.url });
  } catch (error) {
    log("SingleFile snapshot errored", error);
  }
}

/**
 * Handle capture requests forwarded from the popup (includes tab and history).
 * @param {{ tabId?: number; history?: import("./@types").HistoryRecord }} message
 */
async function handleCaptureSnapshotRequest(message) {
  const { tabId, history } = message;
  if (!history || typeof tabId !== "number") {
    log("Snapshot request skipped: missing tab or history", { tabId, history });
    return;
  }
  await capturePageSnapshot(tabId, history);
}
