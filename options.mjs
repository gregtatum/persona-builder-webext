// @ts-check
/**
 * @import {HistoryRecord} from "./types"
 */

import { getActivePersonaId } from "./active-persona.mjs";
import { listHistoryForPersona, listPersonas } from "./persona-db.mjs";
import { log } from "./utils.mjs";

const personaNameEl = document.getElementById("persona-name");
const historyListEl = document.getElementById("history-list");
const emptyStateEl = document.getElementById("empty-state");

async function load() {
  const personaId = await getActivePersonaId();
  if (!personaId) {
    renderPersonaName("No active persona");
    renderEmpty(true);
    return;
  }

  const personas = await listPersonas();
  const persona = personas.find((p) => p.id === personaId);
  renderPersonaName(persona ? persona.name : "Unknown persona");

  const history = await listHistoryForPersona(personaId);
  renderHistory(history);
}

/**
 * @param {string} name
 */
function renderPersonaName(name) {
  if (personaNameEl) {
    personaNameEl.textContent = `Active persona: ${name}`;
  }
}

/**
 * @param {HistoryRecord[]} history
 */
function renderHistory(history) {
  if (!historyListEl || !emptyStateEl) {
    return;
  }
  historyListEl.innerHTML = "";

  if (history.length === 0) {
    renderEmpty(true);
    return;
  }

  renderEmpty(false);

  history.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const title = document.createElement("p");
    title.className = "history-title";
    title.textContent = entry.title || entry.url;
    li.appendChild(title);

    const link = document.createElement("a");
    link.className = "history-link";
    link.href = entry.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = entry.url;
    li.appendChild(link);

    historyListEl.appendChild(li);
  });
}

/**
 * @param {boolean} isEmpty
 */
function renderEmpty(isEmpty) {
  if (!emptyStateEl) {
    return;
  }
  emptyStateEl.hidden = !isEmpty;
}

void load().catch((error) => log("Failed to load persona view", error));
