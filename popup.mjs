// @ts-check
/**
 * @import {PersonaRecord, HistoryInput} from "./types"
 */

import { addHistoryEntry, addPersona, countHistoryForPersona, listPersonas } from "./persona-db.mjs";
import { log } from "./utils.mjs";

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

const LAST_PERSONA_KEY = "personaBuilder:lastPersonaId";
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
    persistLastPersonaId(firstId);
    void updateBadge(firstId);
    return;
  }
  if (personaId) {
    personaSelect.value = personaId;
    persistLastPersonaId(personaId);
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

/**
 * @returns {string | undefined}
 */
function loadLastPersonaId() {
  try {
    return localStorage.getItem(LAST_PERSONA_KEY) || undefined;
  } catch (_error) {
    return undefined;
  }
}

/**
 * @param {string} id
 */
function persistLastPersonaId(id) {
  try {
    localStorage.setItem(LAST_PERSONA_KEY, id);
  } catch (_error) {
    // Best effort; ignore storage errors (e.g., quota).
  }
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
    visitedAt
  };
  const history = await addHistoryEntry(historyPayload);
  log("Captured page for persona", { persona, history });
  await updateBadge(persona.id);
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
    persistLastPersonaId(persona.id);
    void updateBadge(persona.id);
  }
  log("Persona switched", persona);
});

const initialPersonaId = loadLastPersonaId();
void refreshPersonas(initialPersonaId);

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
