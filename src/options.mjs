// @ts-check
/**
 * @import {HistoryRecord} from "./types"
 */

import {
  getActivePersonaId,
  setActivePersonaId,
  watchActivePersona,
} from "./active-persona.mjs";
import {
  deleteHistoryEntry,
  deletePersona,
  getPageSnapshot,
  listHistoryForPersona,
  listPersonas,
  addPersona,
  addHistoryEntry,
  addPageSnapshot,
  updatePersonaName,
  addInsight,
  listInsightsForPersona,
  updateInsight,
  deleteInsight,
} from "./persona-db.mjs";
import {
  buildPersonaZip,
  buildPersonaJson,
  parsePersonaZip,
  sanitizeSegment,
} from "./zip-persona.mjs";
import { renderHistoryTab } from "./options-history.mjs";
import {
  renderInsights,
  setupInsightAddForm,
} from "./options-insights.mjs";

/**
 * @param {any} message
 * @param {...any} rest
 */
export function log(message, ...rest) {
  console.log("[persona]", message, ...rest);
}

const personaNameInputEl = /** @type {HTMLInputElement | null} */ (
  document.getElementById("persona-name-input")
);
const personaSelectEl = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("persona-select")
);
const importZipBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("import-zip-btn")
);
const importZipInput = /** @type {HTMLInputElement | null} */ (
  document.getElementById("import-zip-input")
);
const saveZipBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("save-zip-btn")
);
const deletePersonaBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("delete-persona-btn")
);
const historyTabBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("tab-history")
);
const insightsTabBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("tab-insights")
);
const exportTabBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("tab-export")
);
const historyPanel = document.getElementById("panel-history");
const insightsPanel = document.getElementById("panel-insights");
const exportPanel = document.getElementById("panel-export");
const dropOverlay = document.getElementById("drop-overlay");
const notificationEl = document.getElementById("notification");
const exportJsonEl = /** @type {HTMLTextAreaElement | null} */ (
  document.getElementById("export-json")
);

const tabs = [
  { name: "history", button: historyTabBtn, panel: historyPanel },
  { name: "insights", button: insightsTabBtn, panel: insightsPanel },
  { name: "export", button: exportTabBtn, panel: exportPanel },
];

const historyProps = {
  getSnapshot: getPageSnapshot,
  /** @param {import("./types").HistoryRecord} entry */
  onDeleteHistory: async (entry) => {
    await deleteHistoryEntry(entry.id);
    await renderPersonaAndHistory(entry.personaId);
  },
  log,
};

const insightsProps = {
  listInsightsForPersona,
  addInsight,
  updateInsight,
  deleteInsight,
  showNotification,
  log,
  getActivePersonaId,
};

async function load() {
  const personas = await listPersonas();
  renderPersonaOptions(personas);

  const personaId = await getActivePersonaId();
  await renderPersonaAndHistory(personaId);

  if (personaSelectEl) {
    personaSelectEl.addEventListener("change", async () => {
      const selectedId = personaSelectEl.value;
      await setActivePersonaId(selectedId);
      await renderPersonaAndHistory(selectedId);
    });
  }

  if (importZipBtn && importZipInput) {
    importZipBtn.addEventListener("click", () => {
      importZipInput.value = "";
      importZipInput.click();
    });
    importZipInput.addEventListener("change", () => {
      const file = importZipInput.files?.[0];
      if (file) {
        void importPersonaZip(file);
      }
    });
  }

  if (saveZipBtn) {
    saveZipBtn.addEventListener("click", () => void handleSaveZip());
  }

  if (deletePersonaBtn) {
    deletePersonaBtn.addEventListener(
      "click",
      () => void handleDeletePersona()
    );
  }

  historyTabBtn?.addEventListener("click", () => setActiveTab("history"));
  insightsTabBtn?.addEventListener("click", () => setActiveTab("insights"));
  exportTabBtn?.addEventListener("click", () => setActiveTab("export"));

  if (personaNameInputEl) {
    personaNameInputEl.addEventListener("change", () => {
      void handleRenamePersona();
    });
    personaNameInputEl.addEventListener("blur", () => {
      void handleRenamePersona();
    });
  }

  setupDropImport();

  watchActivePersona(async (id) => {
    if (id && personaSelectEl) {
      personaSelectEl.value = id;
    }
    await renderPersonaAndHistory(id);
  });

  const refresh = async () => {
    const current = await getActivePersonaId();
    await renderPersonaAndHistory(current);
  };

  setupInsightAddForm(insightsProps);

  setActiveTab("history");

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refresh();
    }
  });
  window.addEventListener("focus", () => {
    void refresh();
  });
}

/**
 * @param {import("./types").PersonaRecord[]} personas
 */
function renderPersonaOptions(personas) {
  if (!personaSelectEl) {
    return;
  }
  personaSelectEl.innerHTML = "";
  personas.forEach((persona) => {
    const option = document.createElement("option");
    option.value = persona.id;
    option.textContent = persona.name;
    personaSelectEl.appendChild(option);
  });
}

/**
 * @param {string | undefined} personaId
 */
async function renderPersonaAndHistory(personaId) {
  if (!personaId) {
    renderPersonaName("", { disabled: true, placeholder: "No active persona" });
    renderHistoryTab([], historyProps);
    await renderInsights(undefined, insightsProps);
    renderExportJson(undefined, undefined, [], []);
    return;
  }

  const personas = await listPersonas();
  const persona = personas.find((p) => p.id === personaId);
  renderPersonaName(persona ? persona.name : "Unknown persona", {
    disabled: !persona,
    placeholder: "Persona name",
  });

  const history = await listHistoryForPersona(personaId);
  const insights = await listInsightsForPersona(personaId);
  renderHistoryTab(history, historyProps);
  await renderInsights(personaId, insightsProps);
  renderExportJson(personaId, persona, history, insights);

  if (saveZipBtn) {
    saveZipBtn.disabled = !history.length;
  }
  if (deletePersonaBtn) {
    deletePersonaBtn.disabled = !personaId;
  }

  if (personaSelectEl) {
    personaSelectEl.value = personaId;
  }
}

/**
 * @param {string} name
 * @param {{ disabled?: boolean; placeholder?: string }} [options]
 */
function renderPersonaName(name, options = {}) {
  if (!personaNameInputEl) {
    return;
  }
  const { disabled = false, placeholder = "" } = options;
  personaNameInputEl.disabled = disabled;
  personaNameInputEl.placeholder = placeholder;
  personaNameInputEl.value = name;
}

/**
 * @param {"history" | "insights" | "export"} tab
 */
function setActiveTab(tab) {
  tabs.forEach(({ name, button, panel }) => {
    if (!button || !panel) {
      return;
    }
    const isActive = name === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    panel.classList.toggle("active", isActive);
  });
}

/**
 * Render the persona.json preview for the export tab.
 * @param {string | undefined} personaId
 * @param {import("./types").PersonaRecord | undefined} persona
 * @param {import("./types").HistoryRecord[]} history
 * @param {import("./types").InsightRecord[]} insights
 */
function renderExportJson(personaId, persona, history, insights) {
  if (!exportJsonEl) {
    return;
  }
  if (!personaId) {
    exportJsonEl.value = "Select a persona to preview persona.json.";
    return;
  }

  const personaForExport =
    persona ||
    {
      id: personaId,
      name: personaId,
      createdAt: new Date().toISOString(),
    };

  exportJsonEl.value = buildPersonaJson(
    personaForExport,
    history.map((entry) => ({ entry })),
    insights
  );
  exportJsonEl.scrollTop = 0;
}

async function handleRenamePersona() {
  if (!personaNameInputEl) {
    return;
  }
  try {
    const personaId = await getActivePersonaId();
    if (!personaId) {
      renderPersonaName("", {
        disabled: true,
        placeholder: "No active persona",
      });
      return;
    }

    const newName = personaNameInputEl.value.trim();
    const personas = await listPersonas();
    const current = personas.find((p) => p.id === personaId);
    if (!current) {
      renderPersonaName("Unknown persona", { disabled: true });
      return;
    }
    if (!newName) {
      renderPersonaName(current.name, {
        disabled: false,
        placeholder: "Persona name",
      });
      return;
    }
    if (current.name === newName) {
      return;
    }

    await updatePersonaName(personaId, newName);
    const updatedPersonas = await listPersonas();
    renderPersonaOptions(updatedPersonas);
    if (personaSelectEl) {
      personaSelectEl.value = personaId;
    }
    renderPersonaName(newName, {
      disabled: false,
      placeholder: "Persona name",
    });
    showNotification(`Renamed to ${newName}`);
  } catch (error) {
    log("Failed to rename persona", error);
  }
}

async function handleDeletePersona() {
  try {
    const personaId = await getActivePersonaId();
    if (!personaId) {
      return;
    }
    const personas = await listPersonas();
    const persona = personas.find((p) => p.id === personaId);
    const name = persona?.name || "this persona";
    if (!confirm(`Delete ${name} and all its history?`)) {
      return;
    }
    await deletePersona(personaId);
    const remaining = await listPersonas();
    renderPersonaOptions(remaining);
    const newActive = remaining[0]?.id;
    await setActivePersonaId(newActive || "");
    await renderPersonaAndHistory(newActive);
    showNotification(`Deleted ${name}`);
  } catch (error) {
    log("Failed to delete persona", error);
  }
}

function setupDropImport() {
  if (dropOverlay) {
    dropOverlay.style.display = "none";
  }

  const showOverlay = () => {
    if (dropOverlay) dropOverlay.style.display = "grid";
  };
  const hideOverlay = () => {
    if (dropOverlay) dropOverlay.style.display = "none";
  };

  window.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!event.dataTransfer || !event.dataTransfer.types.includes("Files")) {
      return;
    }
    showOverlay();
  });

  window.addEventListener("dragleave", () => {
    hideOverlay();
  });

  window.addEventListener("drop", (event) => {
    event.preventDefault();
    hideOverlay();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void importPersonaZip(file);
    }
  });
}

/**
 * @param {File} file
 */
async function importPersonaZip(file) {
  try {
    showNotification(`Loading persona from ${file.name}...`);
    const { persona: importedPersona, history, insights = [] } = await parsePersonaZip(file);
    const personas = await listPersonas();
    const targetName = ensureUniqueName(
      importedPersona?.name || "Imported Persona",
      personas
    );
    const personaRecord = await addPersona(targetName);
    const updatedPersonas = await listPersonas();
    renderPersonaOptions(updatedPersonas);

    for (const item of history) {
      /** @type {import("./types").HistoryInput} */
      const historyInput = {
        personaId: personaRecord.id,
        url: item.entry.url,
        title: item.entry.title || item.entry.url,
        description: item.entry.description || "",
        visitedAt: item.entry.visitedAt || new Date().toISOString(),
      };
      const savedHistory = await addHistoryEntry(historyInput);
      if (item.snapshotHtml) {
        await addPageSnapshot({
          historyId: savedHistory.id,
          personaId: personaRecord.id,
          url: savedHistory.url,
          capturedAt: item.entry.capturedAt || savedHistory.visitedAt,
          html: item.snapshotHtml,
        });
      }
    }

    for (const insight of insights) {
      const { insight_summary, category, intent, score, updated_at, is_deleted } = insight;
      await addInsight(personaRecord.id, {
        insight_summary: insight_summary || "",
        category: category || "",
        intent: intent || "",
        score: typeof score === "number" ? score : Number(score) || 1,
        updated_at: typeof updated_at === "number" ? updated_at : Date.now(),
        is_deleted: Boolean(is_deleted),
      });
    }

    await setActivePersonaId(personaRecord.id);
    await renderPersonaAndHistory(personaRecord.id);
    log("Imported persona from zip", { file: file.name, persona: targetName });
    showNotification(`Persona "${targetName}" was added`);
  } catch (error) {
    log("Failed to import persona zip", error);
  }
}

/**
 * @param {string} desiredName
 * @param {import("./types").PersonaRecord[]} personas
 */
function ensureUniqueName(desiredName, personas) {
  const existingNames = new Set(personas.map((p) => p.name));
  if (!existingNames.has(desiredName)) {
    return desiredName;
  }
  let counter = 2;
  while (existingNames.has(`${desiredName} (${counter})`)) {
    counter += 1;
  }
  return `${desiredName} (${counter})`;
}

/**
 * @param {string} message
 */
function showNotification(message) {
  if (!notificationEl) {
    return;
  }
  notificationEl.textContent = message;
  notificationEl.classList.add("show");
  setTimeout(() => {
    notificationEl?.classList.remove("show");
  }, 2200);
}

async function handleSaveZip() {
  if (!personaSelectEl || !saveZipBtn) {
    return;
  }
  saveZipBtn.disabled = true;
  saveZipBtn.textContent = "Preparing zip…";
  try {
    const personaId = await getActivePersonaId();
    if (!personaId) {
      throw new Error("No active persona to export");
    }

    const personas = await listPersonas();
    const persona = personas.find((p) => p.id === personaId);
    const history = await listHistoryForPersona(personaId);
    const insights = await listInsightsForPersona(personaId);

    const historyWithSnapshots = [];
    for (const entry of history) {
      const snapshot = await getPageSnapshot(entry.id).catch((error) => {
        log("Skipping snapshot due to error", entry.url, error);
        return undefined;
      });
      historyWithSnapshots.push({ entry, html: snapshot?.html });
    }

    const fallbackPersona = {
      id: personaId,
      name: personaId,
      createdAt: new Date().toISOString(),
    };
    const zipBlob = await buildPersonaZip(
      persona || fallbackPersona,
      historyWithSnapshots,
      insights
    );

    const url = URL.createObjectURL(zipBlob);
    const personaSlug = sanitizeSegment(
      persona?.name || personaId || "persona"
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `Persona-${personaSlug || "persona"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    saveZipBtn.textContent = "Export";
    saveZipBtn.disabled = false;
  } catch (error) {
    log("Failed to save persona zip", error);
    saveZipBtn.textContent = "Export";
    saveZipBtn.disabled = false;
  }
}

void load().catch((error) => log("Failed to load persona view", error));
