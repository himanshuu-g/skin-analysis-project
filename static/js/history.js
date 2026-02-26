export const initHistoryModule = ({ elements, helpers, onAfterHistoryChange }) => {
    const { historyList, historyToggleBtn, historyFallbackImage, csrfTokenInput } = elements;
    const {
        showError,
        confirmDelete,
        capitalize,
        formatScore,
        parseNumeric,
        resolveHistoryStatus,
        resolveScoreTrend,
    } = helpers;

    const setHistoryCollapse = (collapsed) => {
        if (!historyList || !historyToggleBtn || historyToggleBtn.hidden) {
            return;
        }
        historyToggleBtn.dataset.expanded = collapsed ? "false" : "true";
        historyToggleBtn.textContent = collapsed ? "View All" : "Show Less";
        historyList.classList.toggle("is-collapsed", collapsed);
        historyList.classList.toggle("is-expanded", !collapsed);
    };

    const bindHistoryToggle = () => {
        if (!historyToggleBtn || historyToggleBtn.dataset.bound === "true") {
            return;
        }
        historyToggleBtn.dataset.bound = "true";
        historyToggleBtn.addEventListener("click", () => {
            const isExpanded = historyToggleBtn.dataset.expanded === "true";
            setHistoryCollapse(isExpanded);
        });
    };

    const ensureHistoryEmptyState = () => {
        if (!historyList) {
            return;
        }

        const hasRows = historyList.querySelectorAll(".history-row").length > 0;
        const emptyState = historyList.querySelector(".history-empty");
        if (hasRows) {
            if (emptyState) {
                emptyState.remove();
            }
            return;
        }

        if (!emptyState) {
            const empty = document.createElement("div");
            empty.className = "history-empty";
            empty.textContent = "No scan history yet. Start your first analysis.";
            historyList.append(empty);
        }
    };

    const refreshHistoryTrends = () => {
        if (!historyList) {
            return;
        }

        const rows = Array.from(historyList.querySelectorAll(".history-row"));
        rows.forEach((row, index) => {
            const scoreNode = row.querySelector(".history-score");
            if (!scoreNode) {
                return;
            }

            const currentScore =
                parseNumeric(row.dataset.score) ?? parseNumeric(scoreNode.textContent) ?? parseNumeric(scoreNode.innerText);
            if (!Number.isFinite(currentScore)) {
                return;
            }
            row.dataset.score = formatScore(currentScore);

            const trendNode = row.querySelector(".history-score-trend");
            if (!trendNode) {
                return;
            }

            const previousRow = rows[index + 1];
            const previousScoreNode = previousRow?.querySelector(".history-score");
            const previousScore =
                parseNumeric(previousRow?.dataset.score) ??
                parseNumeric(previousScoreNode?.textContent) ??
                parseNumeric(previousScoreNode?.innerText);
            const trend = resolveScoreTrend(currentScore, previousScore);
            trendNode.textContent = trend.text;
            trendNode.classList.remove("is-up", "is-down", "is-neutral");
            trendNode.classList.add(trend.className);
        });
    };

    const refreshHistoryCollapseState = () => {
        if (!historyList || !historyToggleBtn) {
            return;
        }

        const items = Array.from(historyList.querySelectorAll(".history-row"));
        items.forEach((item, index) => {
            item.classList.toggle("history-item-extra", index >= 3);
        });

        if (items.length > 3) {
            historyToggleBtn.hidden = false;
            bindHistoryToggle();
            if (historyToggleBtn.dataset.expanded !== "true") {
                setHistoryCollapse(true);
            } else {
                setHistoryCollapse(false);
            }
            return;
        }

        historyToggleBtn.hidden = true;
        historyToggleBtn.dataset.expanded = "false";
        historyToggleBtn.textContent = "View All";
        historyList.classList.remove("is-collapsed", "is-expanded");
    };

    const bindHistoryDelete = () => {
        if (!historyList || historyList.dataset.deleteBound === "true") {
            return;
        }

        historyList.dataset.deleteBound = "true";
        historyList.addEventListener("click", async (event) => {
            const button = event.target instanceof HTMLElement ? event.target.closest(".history-delete-btn") : null;
            if (!button) {
                return;
            }

            event.preventDefault();
            const resultId = button.dataset.historyId;
            if (!resultId) {
                return;
            }

            const shouldDelete = await confirmDelete("Delete this history entry?");
            if (!shouldDelete) {
                return;
            }

            const csrfToken = csrfTokenInput?.value || "";
            if (!csrfToken) {
                showError("Missing CSRF token. Refresh the page and try again.");
                return;
            }

            button.disabled = true;
            try {
                const response = await fetch(`/history/${encodeURIComponent(resultId)}/delete`, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                        "X-CSRF-Token": csrfToken,
                    },
                    body: `csrf_token=${encodeURIComponent(csrfToken)}`,
                });
                if (!response.ok) {
                    throw new Error("Unable to delete history entry.");
                }

                const row = button.closest(".history-row");
                if (row) {
                    row.remove();
                }

                refreshHistoryTrends();
                ensureHistoryEmptyState();
                refreshHistoryCollapseState();
                onAfterHistoryChange();
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unable to delete history entry.";
                showError(message);
                button.disabled = false;
            }
        });
    };

    const appendHistoryItem = (analysis) => {
        if (!historyList || !analysis || !analysis.result_id) {
            return;
        }

        const emptyState = historyList.querySelector(".history-empty");
        if (emptyState) {
            emptyState.remove();
        }

        const row = document.createElement("article");
        row.className = "history-row history-page-row";

        const scoreValue = parseNumeric(analysis.confidence) ?? 0;
        row.dataset.score = formatScore(scoreValue);
        const status = resolveHistoryStatus(analysis.skin_type);
        const historyPath = `/history/${encodeURIComponent(String(analysis.result_id))}`;

        const itemLink = document.createElement("a");
        itemLink.className = "history-item";
        itemLink.href = historyPath;

        const preview = document.createElement("img");
        preview.src = analysis.image_url || historyFallbackImage;
        preview.alt = "Recent scan";
        preview.addEventListener("error", () => {
            preview.src = historyFallbackImage;
        });

        const copy = document.createElement("div");
        copy.className = "history-copy";
        const topRow = document.createElement("div");
        topRow.className = "history-row-top";
        const dateLabel = document.createElement("strong");
        const now = new Date();
        dateLabel.textContent = now.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        const statusChip = document.createElement("span");
        statusChip.className = `history-status-chip ${status.className}`;
        statusChip.textContent = status.label;

        const summary = document.createElement("p");
        const skinLabel = capitalize(analysis.skin_type);
        const scoreLabel = formatScore(analysis.confidence);
        summary.textContent = `${skinLabel} skin profile - confidence ${scoreLabel}%`;

        topRow.append(dateLabel, statusChip);
        copy.append(topRow, summary);

        const score = document.createElement("span");
        score.className = "history-score";
        score.textContent = formatScore(scoreValue);
        const trend = document.createElement("small");
        trend.className = "history-score-trend is-neutral";
        trend.textContent = "Baseline";
        const scoreStack = document.createElement("div");
        scoreStack.className = "history-score-stack";
        scoreStack.append(score, trend);

        const openButton = document.createElement("a");
        openButton.className = "history-open-btn";
        openButton.href = historyPath;
        openButton.setAttribute("aria-label", "Open scan details");
        openButton.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16L16 8"></path><path d="M9 8h7v7"></path></svg>';

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "history-delete-btn";
        deleteButton.dataset.historyId = String(analysis.result_id);
        deleteButton.setAttribute("aria-label", "Delete this history entry");
        deleteButton.textContent = "Delete";

        const actions = document.createElement("div");
        actions.className = "history-row-actions";
        actions.append(scoreStack, openButton, deleteButton);

        itemLink.append(preview, copy);
        row.append(itemLink, actions);
        historyList.prepend(row);
        refreshHistoryTrends();
        ensureHistoryEmptyState();
        refreshHistoryCollapseState();
    };

    return {
        bindHistoryToggle,
        bindHistoryDelete,
        refreshHistoryTrends,
        ensureHistoryEmptyState,
        refreshHistoryCollapseState,
        appendHistoryItem,
    };
};
