// @ts-check
/// <reference path="./types.d.ts" />

/** @typedef {import("./types").PersonaRecord} PersonaRecord */

import { addPersona, listPersonas } from "./persona-db.mjs";

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
    personaSelect.value = personas[0].id;
    return;
  }
  if (personaId) {
    personaSelect.value = personaId;
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
    console.log("Seeded default persona");
    selectId = created.id;
  }
  renderPersonas();
  selectPersona(selectId);
}

async function addPersonaFlow() {
  const name = (personaNameInput.value || "").trim();
  if (!name) {
    console.log("Persona add cancelled: no name provided");
    return;
  }
  const persona = await addPersona(name);
  await refreshPersonas(persona.id);
  personaNameInput.value = "";
  personaForm.classList.add("hidden");
  console.log("Persona added", persona);
}

function captureCurrentPersona() {
  const selectedId = personaSelect.value;
  const persona = personas.find((p) => p.id === selectedId);
  if (!persona) {
    console.log("Capture skipped: no persona selected");
    return;
  }
  console.log("Capture page for persona", persona);
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
  console.log("Persona switched", persona);
});

void refreshPersonas();
