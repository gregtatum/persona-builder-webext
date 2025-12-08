// Stub UI state: in-memory personas.
const personas = [
  { id: "p1", name: "Default Persona" },
  { id: "p2", name: "Research Persona" }
];

const personaSelect = document.getElementById("persona-select");
const personaForm = document.getElementById("persona-form");
const personaNameInput = document.getElementById("persona-name");
const addPersonaBtn = document.getElementById("add-persona");
const savePersonaBtn = document.getElementById("save-persona");
const captureBtn = document.getElementById("capture");
const statusEl = document.getElementById("status");

function renderPersonas() {
  personaSelect.innerHTML = "";
  personas.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    personaSelect.appendChild(opt);
  });
}

function setStatus(text) {
  statusEl.textContent = text || "";
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
  setStatus(`Added persona "${name}"`);
  console.log("Persona added", { id, name });
}

function captureCurrentPersona() {
  const selectedId = personaSelect.value;
  const persona = personas.find((p) => p.id === selectedId);
  if (!persona) {
    setStatus("No persona selected");
    console.log("Capture skipped: no persona selected");
    return;
  }
  setStatus(`Capture requested for "${persona.name}"`);
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
  setStatus(persona ? `Selected "${persona.name}"` : "No persona selected");
});

renderPersonas();
setStatus("Stub UI ready");
