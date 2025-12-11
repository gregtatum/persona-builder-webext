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
} from "./persona-db.mjs";
import {
  buildPersonaZip,
  parsePersonaZip,
  buildSnapshotPath,
  sanitizeSegment,
} from "./zip-persona.mjs";
import { CATEGORIES_LIST, INTENTS_LIST } from "./insights-constants.mjs";

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
const historyListEl = document.getElementById("history-list");
const emptyStateEl = document.getElementById("empty-state");
const insightsRowsEl = document.getElementById("insights-rows");
const insightsEmptyEl = document.getElementById("insights-empty");
const personaSelectEl = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("persona-select")
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
const historyPanel = document.getElementById("panel-history");
const insightsPanel = document.getElementById("panel-insights");
const dropOverlay = document.getElementById("drop-overlay");
const notificationEl = document.getElementById("notification");

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
    renderHistory([]);
    await renderInsights(undefined);
    return;
  }

  const personas = await listPersonas();
  const persona = personas.find((p) => p.id === personaId);
  renderPersonaName(persona ? persona.name : "Unknown persona", {
    disabled: !persona,
    placeholder: "Persona name",
  });

  const history = await listHistoryForPersona(personaId);
  renderHistory(history);
  await renderInsights(personaId);

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

    const meta = document.createElement("div");
    meta.className = "history-meta";

    const title = document.createElement("p");
    title.className = "history-title";
    title.textContent = entry.title || entry.url;
    meta.appendChild(title);

    const link = document.createElement("a");
    link.className = "history-link";
    link.href = entry.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = entry.url;
    meta.appendChild(link);

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.gap = "12px";
    header.style.alignItems = "center";

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const viewBtn = document.createElement("button");
    viewBtn.className = "delete-btn";
    viewBtn.type = "button";
    viewBtn.textContent = "View snapshot";
    viewBtn.style.color = "#0f172a";
    viewBtn.style.borderColor = "#e2e8f0";
    viewBtn.style.background = "#fff";

    const container = document.createElement("div");
    container.style.width = "100%";

    viewBtn.addEventListener("click", async () => {
      const existing = container.querySelector("iframe");
      if (existing) {
        existing.remove();
        viewBtn.textContent = "View snapshot";
        return;
      }
      try {
        const snapshot = await getPageSnapshot(entry.id);
        if (!snapshot?.html) {
          viewBtn.textContent = "No snapshot";
          return;
        }
        const iframe = document.createElement("iframe");
        iframe.className = "snapshot-frame";
        iframe.srcdoc = snapshot.html;
        container.appendChild(iframe);
        viewBtn.textContent = "Hide snapshot";
      } catch (error) {
        log("Failed to load snapshot", error);
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      await deleteHistoryEntry(entry.id);
      await renderPersonaAndHistory(entry.personaId);
    });

    actions.appendChild(viewBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(meta);
    header.appendChild(actions);
    li.appendChild(header);
    li.appendChild(container);

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

/**
 * @param {string | undefined} personaId
 */
async function renderInsights(personaId) {
  if (!insightsRowsEl || !insightsEmptyEl) {
    return;
  }
  insightsRowsEl.innerHTML = "";
  if (!personaId) {
    insightsEmptyEl.hidden = false;
    return;
  }

  const insights = await listInsightsForPersona(personaId);
  insightsEmptyEl.hidden = insights.length > 0;
  const rows = [...insights, createBlankInsightRow()];

  rows.forEach((insight, index) => {
    const isPlaceholder = !insight.id;
    const rowEl = buildInsightRow(insight, personaId, isPlaceholder);
    rowEl.dataset.index = String(index);
    insightsRowsEl.appendChild(rowEl);
  });
}

function createBlankInsightRow() {
  return {
    id: "",
    insight_summary: "",
    category: "",
    intent: "",
    score: 0,
    updated_at: Date.now(),
    is_deleted: false,
    personaId: "",
  };
}

/**
 * @param {import("./types").InsightRecord} insight
 * @param {string} personaId
 * @param {boolean} isPlaceholder
 */
function buildInsightRow(insight, personaId, isPlaceholder) {
  const row = document.createElement("div");
  row.className = "insight-row";

  const grid = document.createElement("div");
  grid.className = "insights-grid";

  const summaryInput = document.createElement("input");
  summaryInput.type = "text";
  summaryInput.placeholder = "Add summary…";
  summaryInput.value = insight.insight_summary || "";

  const categorySelect = document.createElement("select");
  categorySelect.innerHTML = `<option value="">Select category</option>`;
  CATEGORIES_LIST.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
  categorySelect.value = insight.category || "";

  const intentSelect = document.createElement("select");
  intentSelect.innerHTML = `<option value="">Select intent</option>`;
  INTENTS_LIST.forEach((intent) => {
    const option = document.createElement("option");
    option.value = intent;
    option.textContent = intent;
    intentSelect.appendChild(option);
  });
  intentSelect.value = insight.intent || "";

  const scoreSelect = document.createElement("select");
  scoreSelect.innerHTML = `<option value="">Score</option>`;
  for (let i = 1; i <= 5; i += 1) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    scoreSelect.appendChild(opt);
  }
  scoreSelect.value = insight.score ? String(insight.score) : "";

  /**
   * @param {HTMLElement} el
   */
  const attachSave = (el) => {
    el.addEventListener("change", () => {
      void handleInsightSave({
        personaId,
        insightId: insight.id,
        elements: { summaryInput, categorySelect, intentSelect, scoreSelect },
        isPlaceholder,
        row,
      });
    });
    el.addEventListener("blur", () => {
      void handleInsightSave({
        personaId,
        insightId: insight.id,
        elements: { summaryInput, categorySelect, intentSelect, scoreSelect },
        isPlaceholder,
        row,
      });
    });
  };

  [summaryInput, categorySelect, intentSelect, scoreSelect].forEach(attachSave);

  grid.appendChild(summaryInput);
  grid.appendChild(categorySelect);
  grid.appendChild(intentSelect);
  grid.appendChild(scoreSelect);
  row.appendChild(grid);

  const status = document.createElement("div");
  status.className = "insight-status";
  status.textContent = isPlaceholder ? "" : "Saved";
  row.appendChild(status);

  return row;
}

/**
 * @param {{
 *  personaId: string;
 *  insightId: string;
 *  elements: {
 *    summaryInput: HTMLInputElement;
 *    categorySelect: HTMLSelectElement;
 *    intentSelect: HTMLSelectElement;
 *    scoreSelect: HTMLSelectElement;
 *  };
 *  isPlaceholder: boolean;
 *  row: HTMLElement;
 * }} params
 */
async function handleInsightSave({
  personaId,
  insightId,
  elements,
  isPlaceholder,
  row,
}) {
  const statusEl = row.querySelector(".insight-status");
  const summary = elements.summaryInput.value.trim();
  const category = elements.categorySelect.value;
  const intent = elements.intentSelect.value;
  const scoreValue = elements.scoreSelect.value;
  const score = Number(scoreValue);

  const hasAnyValue = summary || category || intent || scoreValue;
  const isComplete = summary && category && intent && scoreValue;

  if (!hasAnyValue) {
    return;
  }
  if (!isComplete) {
    if (statusEl) statusEl.textContent = "Fill all fields to save";
    return;
  }

  if (statusEl) statusEl.textContent = "Saving…";
  try {
    if (isPlaceholder) {
      await addInsight(personaId, {
        insight_summary: summary,
        category,
        intent,
        score,
        is_deleted: false,
        updated_at: Date.now(),
      });
    } else {
      await updateInsight(insightId, {
        insight_summary: summary,
        category,
        intent,
        score,
        is_deleted: false,
        updated_at: Date.now(),
      });
    }
    if (statusEl) statusEl.textContent = "Saved";
    await renderInsights(personaId);
  } catch (error) {
    log("Failed to save insight", error);
    if (statusEl) statusEl.textContent = "Save failed";
  }
}

/**
 * @param {"history" | "insights"} tab
 */
function setActiveTab(tab) {
  if (!historyTabBtn || !insightsTabBtn || !historyPanel || !insightsPanel) {
    return;
  }
  const isHistory = tab === "history";
  historyTabBtn.classList.toggle("active", isHistory);
  insightsTabBtn.classList.toggle("active", !isHistory);
  historyTabBtn.setAttribute("aria-selected", String(isHistory));
  insightsTabBtn.setAttribute("aria-selected", String(!isHistory));
  historyPanel.classList.toggle("active", isHistory);
  insightsPanel.classList.toggle("active", !isHistory);
}

async function handleRenamePersona() {
  if (!personaNameInputEl) {
    return;
  }
  try {
    const personaId = await getActivePersonaId();
    if (!personaId) {
      renderPersonaName("", { disabled: true, placeholder: "No active persona" });
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
      renderPersonaName(current.name, { disabled: false, placeholder: "Persona name" });
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
    renderPersonaName(newName, { disabled: false, placeholder: "Persona name" });
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
    const { persona: importedPersona, history } = await parsePersonaZip(file);
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
      historyWithSnapshots
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
