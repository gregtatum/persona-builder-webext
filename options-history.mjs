// @ts-check
/**
 * @import {HistoryRecord} from "./types"
 */

/**
 * Render the history tab contents.
 * @param {HistoryRecord[]} history
 * @param {{
 *  historyListEl: HTMLElement | null;
 *  emptyStateEl: HTMLElement | null;
 *  getSnapshot: (historyId: string) => Promise<{ html?: string } | undefined>;
 *  onDeleteHistory: (entry: HistoryRecord) => Promise<void>;
 *  log: (...args: any[]) => void;
 * }} deps
 */
export function renderHistoryTab(history, deps) {
  const { historyListEl, emptyStateEl, getSnapshot, onDeleteHistory, log } =
    deps;
  if (!historyListEl || !emptyStateEl) {
    return;
  }
  historyListEl.innerHTML = "";

  if (history.length === 0) {
    renderEmpty(emptyStateEl, true);
    return;
  }

  renderEmpty(emptyStateEl, false);

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
        const snapshot = await getSnapshot(entry.id);
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
      await onDeleteHistory(entry);
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
 * @param {HTMLElement} emptyStateEl
 * @param {boolean} isEmpty
 */
function renderEmpty(emptyStateEl, isEmpty) {
  emptyStateEl.hidden = !isEmpty;
}
