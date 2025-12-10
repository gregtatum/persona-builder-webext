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
} from "./persona-db.mjs";
import {
  buildPersonaZip,
  parsePersonaZip,
  buildSnapshotPath,
  sanitizeSegment,
} from "./zip-persona.mjs";

/**
 * @param {any} message
 * @param {...any} rest
 */
export function log(message, ...rest) {
  console.log("[persona]", message, ...rest);
}

const personaNameEl = document.getElementById("persona-name");
const historyListEl = document.getElementById("history-list");
const emptyStateEl = document.getElementById("empty-state");
const personaSelectEl = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("persona-select")
);
const saveZipBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("save-zip-btn")
);
const deletePersonaBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("delete-persona-btn")
);
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
    deletePersonaBtn.addEventListener("click", () => void handleDeletePersona());
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
    renderPersonaName("No active persona");
    renderHistory([]);
    return;
  }

  const personas = await listPersonas();
  const persona = personas.find((p) => p.id === personaId);
  renderPersonaName(persona ? persona.name : "Unknown persona");

  const history = await listHistoryForPersona(personaId);
  renderHistory(history);

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
    const targetName = ensureUniqueName(importedPersona?.name || "Imported Persona", personas);
    const personaRecord = await addPersona(targetName);

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
          html: item.snapshotHtml
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
    const zipBlob = await buildPersonaZip(persona || fallbackPersona, historyWithSnapshots);

    const url = URL.createObjectURL(zipBlob);
    const personaSlug = sanitizeSegment(persona?.name || personaId || "persona");
    const a = document.createElement("a");
    a.href = url;
    a.download = `Persona-${personaSlug || "persona"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    saveZipBtn.textContent = "Saved!";
    setTimeout(() => {
      if (saveZipBtn) {
        saveZipBtn.textContent = "Save to Zip";
        saveZipBtn.disabled = false;
      }
    }, 1200);
  } catch (error) {
    log("Failed to save persona zip", error);
    saveZipBtn.textContent = "Save to Zip";
    saveZipBtn.disabled = false;
  }
}

void load().catch((error) => log("Failed to load persona view", error));
