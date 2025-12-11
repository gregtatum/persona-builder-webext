// @ts-check
/**
 * @import {PersonaRecord, HistoryInput} from "./types"
 */

import { getActivePersonaId, setActivePersonaId } from "./active-persona.mjs";
import {
  addHistoryEntry,
  addPersona,
  countHistoryForPersona,
  listPersonas,
} from "./persona-db.mjs";

/**
 * @param {any} message
 * @param {...any} rest
 */
export function log(message, ...rest) {
  console.log("[persona]", message, ...rest);
}

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @param {new (...args: any[]) => T} ctor
 * @returns {T}
 */
function getElement(id, ctor) {
  const el = document.getElementById(id);
  if (!(el instanceof ctor)) {
    throw new Error(`Expected ${id} to be a ${ctor.name}`);
  }
  return el;
}

const personaSelect = getElement("persona-select", HTMLSelectElement);
const personaForm = getElement("persona-form", HTMLDivElement);
const personaNameInput = getElement("persona-name", HTMLInputElement);
const addPersonaBtn = getElement("add-persona", HTMLButtonElement);
const savePersonaBtn = getElement("save-persona", HTMLButtonElement);
const captureBtn = getElement("capture", HTMLButtonElement);
const openOptionsBtn = getElement("open-options", HTMLButtonElement);

const BADGE_COLOR = "#2563eb";

/** @type {PersonaRecord[]} */
let personas = [];

function renderPersonas() {
  personaSelect.innerHTML = "";
  personas.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    personaSelect.appendChild(opt);
  });
}

/**
 * @param {string} [personaId]
 */
function selectPersona(personaId) {
  if (!personaId && personas.length > 0) {
    const firstId = personas[0].id;
    personaSelect.value = firstId;
    void setActivePersonaId(firstId);
    void updateBadge(firstId);
    return;
  }
  if (personaId) {
    personaSelect.value = personaId;
    void setActivePersonaId(personaId);
    void updateBadge(personaId);
  }
}

/**
 * @param {string} [selectId]
 */
async function refreshPersonas(selectId) {
  personas = await listPersonas();
  if (personas.length === 0) {
    const created = await addPersona("Default Persona");
    personas = [created];
    log("Seeded default persona");
    selectId = created.id;
  }
  renderPersonas();
  selectPersona(selectId);
}

async function addPersonaFlow() {
  const name = (personaNameInput.value || "").trim();
  if (!name) {
    log("Persona add cancelled: no name provided");
    return;
  }
  const persona = await addPersona(name);
  await refreshPersonas(persona.id);
  personaNameInput.value = "";
  personaForm.classList.add("hidden");
  log("Persona added", persona);
  await updateBadge(persona.id);
}

async function captureCurrentPersona() {
  const selectedId = personaSelect.value;
  const persona = personas.find((p) => p.id === selectedId);
  if (!persona) {
    log("Capture skipped: no persona selected");
    return;
  }
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab || !tab.url) {
    log("Capture skipped: no active tab url");
    return;
  }
  const title = tab.title || tab.url;
  const description = tab.title || "";
  const visitedAt = new Date().toISOString();
  /** @type {HistoryInput} */
  const historyPayload = {
    personaId: persona.id,
    url: tab.url,
    title,
    description,
    visitedAt,
  };
  const history = await addHistoryEntry(historyPayload);
  log("Captured page for persona", { persona, history });
  await updateBadge(persona.id);
  if (tab.id) {
    void browser.runtime.sendMessage({
      type: "capture-page-snapshot",
      tabId: tab.id,
      history,
    });
  }
}

function togglePersonaForm() {
  const isHidden = personaForm.classList.contains("hidden");
  personaForm.classList.toggle("hidden");
  if (isHidden) {
    personaNameInput.focus();
  }
}

addPersonaBtn.addEventListener("click", togglePersonaForm);
savePersonaBtn.addEventListener("click", () => {
  void addPersonaFlow();
});
personaNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void addPersonaFlow();
  }
});
captureBtn.addEventListener("click", captureCurrentPersona);
personaSelect.addEventListener("change", () => {
  const persona = personas.find((p) => p.id === personaSelect.value);
  if (persona) {
    void setActivePersonaId(persona.id);
    void updateBadge(persona.id);
  }
  log("Persona switched", persona);
});
openOptionsBtn.addEventListener("click", () => {
  void browser.runtime.openOptionsPage();
});

void (async () => {
  const initialPersonaId = await getActivePersonaId();
  await refreshPersonas(initialPersonaId);
})();

/**
 * Update the badge count for the given persona.
 * @param {string} personaId
 */
async function updateBadge(personaId) {
  try {
    const count = await countHistoryForPersona(personaId);
    await browser.browserAction.setBadgeBackgroundColor({ color: BADGE_COLOR });
    await browser.browserAction.setBadgeText({ text: String(count) });
  } catch (error) {
    log("Badge update failed", error);
  }
}
