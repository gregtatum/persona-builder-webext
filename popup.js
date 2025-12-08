// @ts-check

// Stub UI state: in-memory personas.
const personas = [
  { id: "p1", name: "Default Persona" },
  { id: "p2", name: "Research Persona" },
];

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

function renderPersonas() {
  personaSelect.innerHTML = "";
  personas.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    personaSelect.appendChild(opt);
  });
}

function addPersonaFlow() {
  const name = (personaNameInput.value || "").trim();
  if (!name) {
    console.log("Persona add cancelled: no name provided");
    return;
  }
  const id = `p-${Date.now()}`;
  personas.push({ id, name });
  renderPersonas();
  personaSelect.value = id;
  personaNameInput.value = "";
  personaForm.classList.add("hidden");
  console.log("Persona added", { id, name });
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
savePersonaBtn.addEventListener("click", addPersonaFlow);
personaNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addPersonaFlow();
  }
});
captureBtn.addEventListener("click", captureCurrentPersona);
personaSelect.addEventListener("change", () => {
  const persona = personas.find((p) => p.id === personaSelect.value);
  console.log("Persona switched", persona);
});

renderPersonas();
