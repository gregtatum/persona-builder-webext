// @ts-check

import { CATEGORIES_LIST, INTENTS_LIST } from "./insights-constants.mjs";


/**
 * Render the insights tab contents.
 * @param {string | undefined} personaId
 * @param {InsightProps} props
 */
const insightsRowsEl = document.getElementById("insights-rows");
const insightsEmptyEl = document.getElementById("insights-empty");
const insightAddSummary = /** @type {HTMLInputElement | null} */ (
  document.getElementById("insight-add-summary")
);
const insightAddCategory = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("insight-add-category")
);
const insightAddIntent = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("insight-add-intent")
);
const insightAddScore = /** @type {HTMLSelectElement | null} */ (
  document.getElementById("insight-add-score")
);
const insightAddBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("insight-add-btn")
);

/**
 * @param {string | undefined} personaId
 * @param {InsightProps} props
 */
export async function renderInsights(personaId, props) {
  const {
    listInsightsForPersona,
    log,
    updateInsight,
    deleteInsight,
    addInsight,
    showNotification,
  } = props;

  if (!insightsRowsEl || !insightsEmptyEl) {
    return;
  }
  insightsRowsEl.innerHTML = "";
  if (!personaId) {
    insightsEmptyEl.hidden = false;
    return;
  }

  /** @type {import("./@types").InsightRecord[]} */
  const insights = await listInsightsForPersona(personaId);
  insightsEmptyEl.hidden = insights.length > 0;
  insights.forEach((insight, index) => {
    const rowEl = buildInsightRow({
      insight,
      personaId,
      isPlaceholder: false,
      props: {
        addInsight,
        updateInsight,
        deleteInsight,
        log,
        showNotification,
        renderInsights: (targetPersonaId) =>
          renderInsights(targetPersonaId, props),
      },
    });
    rowEl.dataset.index = String(index);
    insightsRowsEl.appendChild(rowEl);
  });
}

/**
 * Wire up the add-insight form.
 * @param {InsightProps & { getActivePersonaId: () => Promise<string | undefined> }} props
 */
export function setupInsightAddForm(props) {
  if (
    !insightAddSummary ||
    !insightAddCategory ||
    !insightAddIntent ||
    !insightAddScore
  ) {
    return;
  }

  populateSelect(insightAddCategory, CATEGORIES_LIST, "");
  populateSelect(insightAddIntent, INTENTS_LIST, "");
  populateSelect(insightAddScore, ["1", "2", "3", "4", "5"], "");

  insightAddBtn?.addEventListener("click", () => {
    void handleAddInsight(props);
  });
  insightAddSummary.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleAddInsight(props);
    }
  });
}

/**
 * @param {HTMLSelectElement} select
 * @param {string[]} values
 * @param {string} placeholder
 */
function populateSelect(select, values, placeholder) {
  if (placeholder !== undefined) {
    select.innerHTML = `<option value="">${placeholder}</option>`;
  } else {
    select.innerHTML = "";
  }
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if (!placeholder && values.length > 0) {
    select.value = values[0];
  }
}

/**
 * @param {InsightProps & { getActivePersonaId: () => Promise<string | undefined> }} props
 */
async function handleAddInsight(props) {
  const { getActivePersonaId, addInsight, showNotification } = props;
  if (
    !insightAddSummary ||
    !insightAddCategory ||
    !insightAddIntent ||
    !insightAddScore
  ) {
    return;
  }
  const personaId = await getActivePersonaId();
  if (!personaId) {
    showNotification("Select a persona first");
    return;
  }
  const summary = insightAddSummary.value.trim();
  const category = insightAddCategory.value || CATEGORIES_LIST[0];
  const intent = insightAddIntent.value || INTENTS_LIST[0];
  const scoreValue = insightAddScore.value || "1";
  const score = Number(scoreValue);

  if (!summary || !category || !intent || !scoreValue) {
    showNotification("Fill all fields to add an insight");
    return;
  }

  try {
    await addInsight(personaId, {
      insight_summary: summary,
      category,
      intent,
      score,
      is_deleted: false,
      updated_at: Date.now(),
    });
    insightAddSummary.value = "";
    populateSelect(insightAddCategory, CATEGORIES_LIST, "");
    populateSelect(insightAddIntent, INTENTS_LIST, "");
    populateSelect(insightAddScore, ["1", "2", "3", "4", "5"], "");
    insightAddSummary.focus();
    showNotification("Insight added");
    await renderInsights(personaId, props);
  } catch (error) {
    props.log("Failed to add insight", error);
    showNotification("Save failed");
  }
}

/**
 * @param {{
 *  insight: import("./@types").InsightRecord;
 *  personaId: string;
 *  isPlaceholder: boolean;
 *  props: {
 *    addInsight: typeof import("./persona-db.mjs").addInsight;
 *    updateInsight: typeof import("./persona-db.mjs").updateInsight;
 *    deleteInsight: typeof import("./persona-db.mjs").deleteInsight;
 *    renderInsights: (personaId: string) => Promise<void>;
 *    showNotification: (message: string) => void;
 *    log: (...args: any[]) => void;
 *  };
 * }} params
 */
function buildInsightRow({ insight, personaId, isPlaceholder, props }) {
  const { addInsight, updateInsight, deleteInsight, renderInsights, log } =
    props;

  const row = document.createElement("div");
  row.className = "insight-row";

  const grid = document.createElement("div");
  grid.className = "insights-grid";

  const summaryInput = document.createElement("input");
  summaryInput.type = "text";
  summaryInput.placeholder = "Add summary…";
  summaryInput.value = insight.insight_summary || "";

  const categorySelect = document.createElement("select");
  populateSelect(categorySelect, CATEGORIES_LIST, "");
  categorySelect.value = insight.category || categorySelect.value;

  const intentSelect = document.createElement("select");
  populateSelect(intentSelect, INTENTS_LIST, "");
  intentSelect.value = insight.intent || intentSelect.value;

  const scoreSelect = document.createElement("select");
  populateSelect(scoreSelect, ["1", "2", "3", "4", "5"], "");
  scoreSelect.value = insight.score ? String(insight.score) : scoreSelect.value;

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
        props: {
          addInsight,
          updateInsight,
          renderInsights,
          showNotification: props.showNotification,
          log,
        },
      });
    });
    el.addEventListener("blur", () => {
      void handleInsightSave({
        personaId,
        insightId: insight.id,
        elements: { summaryInput, categorySelect, intentSelect, scoreSelect },
        isPlaceholder,
        row,
        props: {
          addInsight,
          updateInsight,
          renderInsights,
          showNotification: props.showNotification,
          log,
        },
      });
    });
  };

  [summaryInput, categorySelect, intentSelect, scoreSelect].forEach(attachSave);

  grid.appendChild(summaryInput);
  grid.appendChild(categorySelect);
  grid.appendChild(intentSelect);
  grid.appendChild(scoreSelect);
  if (!isPlaceholder) {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", () => {
      void handleInsightDelete({
        personaId,
        insightId: insight.id,
        deleteInsight,
        renderInsights,
        showNotification: props.showNotification,
        log,
      });
    });
    grid.appendChild(deleteBtn);
  } else {
    grid.appendChild(document.createElement("div"));
  }

  row.appendChild(grid);

  return row;
}

/**
 * @param {{
 *  personaId: string;
 *  insightId: string;
 *  deleteInsight: typeof import("./persona-db.mjs").deleteInsight;
 *  renderInsights: (personaId: string) => Promise<void>;
 *  showNotification: (message: string) => void;
 *  log: (...args: any[]) => void;
 * }} params
 */
async function handleInsightDelete({
  personaId,
  insightId,
  deleteInsight,
  renderInsights,
  showNotification,
  log,
}) {
  try {
    await deleteInsight(insightId);
    await renderInsights(personaId);
  } catch (error) {
    log("Failed to delete insight", error);
    showNotification("Delete failed");
  }
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
 *  props: {
 *    addInsight: typeof import("./persona-db.mjs").addInsight;
 *    updateInsight: typeof import("./persona-db.mjs").updateInsight;
 *    renderInsights: (personaId: string) => Promise<void>;
 *    showNotification: (message: string) => void;
 *    log: (...args: any[]) => void;
 *  };
 * }} params
 */
async function handleInsightSave({
  personaId,
  insightId,
  elements,
  isPlaceholder,
  row,
  props,
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
      await props.addInsight(personaId, {
        insight_summary: summary,
        category,
        intent,
        score,
        is_deleted: false,
        updated_at: Date.now(),
      });
    } else {
      await props.updateInsight(insightId, {
        insight_summary: summary,
        category,
        intent,
        score,
        is_deleted: false,
        updated_at: Date.now(),
      });
    }
    if (statusEl) statusEl.textContent = "Saved";
    await props.renderInsights(personaId);
  } catch (error) {
    props.log("Failed to save insight", error);
    if (statusEl) statusEl.textContent = "Save failed";
    props.showNotification("Save failed");
  }
}

/**
 * @typedef {object} InsightProps
 * @property {(personaId: string) => Promise<import("./@types").InsightRecord[]>} listInsightsForPersona
 * @property {typeof import("./persona-db.mjs").addInsight} addInsight
 * @property {typeof import("./persona-db.mjs").updateInsight} updateInsight
 * @property {typeof import("./persona-db.mjs").deleteInsight} deleteInsight
 * @property {(message: string) => void} showNotification
 * @property {(...args: any[]) => void} log
 */
