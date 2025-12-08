// Stub UI state: in-memory personas.
const personas = [
  { id: "p1", name: "Default Persona" },
  { id: "p2", name: "Research Persona" }
];

const personaSelect = document.getElementById("persona-select");
const addPersonaBtn = document.getElementById("add-persona");
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
  const name = prompt("Enter a name for the new persona:");
  if (!name) {
    setStatus("Add persona cancelled");
    console.log("Persona add cancelled");
    return;
  }
  const id = `p-${Date.now()}`;
  personas.push({ id, name });
  renderPersonas();
  personaSelect.value = id;
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

addPersonaBtn.addEventListener("click", addPersonaFlow);
captureBtn.addEventListener("click", captureCurrentPersona);
personaSelect.addEventListener("change", () => {
  const persona = personas.find((p) => p.id === personaSelect.value);
  console.log("Persona switched", persona);
  setStatus(persona ? `Selected "${persona.name}"` : "No persona selected");
});

renderPersonas();
setStatus("Stub UI ready");
