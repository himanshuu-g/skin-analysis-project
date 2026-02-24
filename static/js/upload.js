document.addEventListener("DOMContentLoaded", () => {
    const imageInput = document.getElementById("imageInput");
    const previewContainer = document.getElementById("previewContainer");
    const previewImage = document.getElementById("previewImage");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const uploadArea = document.getElementById("uploadArea");
    const uploadForm = document.getElementById("uploadForm");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const choosePhotoBtn = document.getElementById("choosePhotoBtn");
    const removeBtn = document.getElementById("removeBtn");
    const loadingDiv = document.getElementById("loadingDiv");
    const csrfTokenInput = uploadForm?.querySelector("input[name='csrf_token']");
    const uploadError = document.getElementById("uploadError");
    const analysisCard = document.getElementById("analysisCard");
    const analysisResult = document.getElementById("analysisResult");
    const progressWrap = document.getElementById("progressWrap");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const historyList = document.getElementById("historyList");
    const historyToggleBtn = document.getElementById("historyToggleBtn");
    const historyFallbackImage = historyList?.dataset.fallbackImage || "/static/uploads/IMAGE 2 SCP.jpg";
    const dashboardHomeView = document.getElementById("dashboardHomeView");
    const dashboardHistoryView = document.getElementById("dashboardHistoryView");
    const dashboardSettingsView = document.getElementById("dashboardSettingsView");
    const sidebarDashboardLink = document.getElementById("sidebarDashboardLink");
    const sidebarHistoryLink = document.getElementById("sidebarHistoryLink");
    const sidebarSettingsLink = document.getElementById("sidebarSettingsLink");
    const dashboardViewLinks = Array.from(document.querySelectorAll("[data-dashboard-view]"));
    const statTotalScans = document.getElementById("statTotalScans");
    const statScansThisMonth = document.getElementById("statScansThisMonth");
    const statAvgScore = document.getElementById("statAvgScore");
    const statAvgScoreChange = document.getElementById("statAvgScoreChange");
    const statTotalDays = document.getElementById("statTotalDays");
    const statActiveDaysSubtext = document.getElementById("statActiveDaysSubtext");
    const overallHealthSkinTypeLabel = document.getElementById("overallHealthSkinTypeLabel");
    const overallHealthScoreRing = document.getElementById("overallHealthScoreRing");
    const overallHealthScoreLabel = document.getElementById("overallHealthScoreLabel");
    const drySignal = document.getElementById("drySignal");
    const normalSignal = document.getElementById("normalSignal");
    const oilySignal = document.getElementById("oilySignal");
    const deleteConfirmModal = document.getElementById("deleteConfirmModal");
    const deleteConfirmMessage = document.getElementById("deleteConfirmMessage");
    const deleteConfirmCancel = document.getElementById("deleteConfirmCancel");
    const deleteConfirmAccept = document.getElementById("deleteConfirmAccept");
    const defaultAnalyzeLabel =
        analyzeBtn?.dataset.defaultLabel || analyzeBtn?.textContent?.trim() || "Analyze My Skin";
    const hideAnalyzeUntilFile = analyzeBtn?.dataset.hideUntilFile === "true";
    const guideModal = document.getElementById("dashboardGuideModal");
    const guideSteps = Array.from(document.querySelectorAll("[data-guide-step]"));
    const guideDots = Array.from(document.querySelectorAll("[data-guide-dot]"));
    const guideProgressBar = document.getElementById("guideProgressBar");
    const guideCloseBtn = document.getElementById("guideCloseBtn");
    const guideBackBtn = document.getElementById("guideBackBtn");
    const guideNextBtn = document.getElementById("guideNextBtn");
    const guideNextLabel = document.getElementById("guideNextLabel");
    const guideSkipBtn = document.getElementById("guideSkipBtn");
    const guideSeenKey = "skinanalysis_guide_seen";
    const guidePendingKey = "skinanalysis_guide_pending";
    const guideServerTrigger = document.body?.dataset.guideTrigger === "1";
    let activeGuideStep = 0;

    const safeSessionStorage = {
        get(key) {
            try {
                return window.sessionStorage.getItem(key);
            } catch (_err) {
                return null;
            }
        },
        set(key, value) {
            try {
                window.sessionStorage.setItem(key, value);
            } catch (_err) {
                return;
            }
        },
        remove(key) {
            try {
                window.sessionStorage.removeItem(key);
            } catch (_err) {
                return;
            }
        },
    };

    const setGuideModalOpen = (isOpen) => {
        if (!guideModal) {
            return;
        }

        guideModal.hidden = !isOpen;
        guideModal.classList.toggle("is-open", isOpen);

        const isDeleteModalOpen =
            Boolean(deleteConfirmModal) &&
            deleteConfirmModal.classList.contains("is-open") &&
            !deleteConfirmModal.hidden;
        if (isOpen || isDeleteModalOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }
    };

    const initGuideModal = () => {
        if (!guideModal || guideSteps.length === 0) {
            return;
        }

        const maxGuideIndex = guideSteps.length - 1;
        const clampGuideStep = (value) => Math.max(0, Math.min(maxGuideIndex, value));

        const renderGuideStep = () => {
            guideSteps.forEach((step, index) => {
                const isActive = index === activeGuideStep;
                step.classList.toggle("is-active", isActive);
                step.hidden = !isActive;
            });

            guideDots.forEach((dot, index) => {
                const isActive = index === activeGuideStep;
                dot.classList.toggle("is-active", isActive);
                dot.setAttribute("aria-selected", isActive ? "true" : "false");
            });

            if (guideProgressBar) {
                const progressPercent = ((activeGuideStep + 1) / guideSteps.length) * 100;
                guideProgressBar.style.width = `${progressPercent}%`;
            }

            if (guideBackBtn) {
                guideBackBtn.hidden = activeGuideStep === 0;
            }

            const isFinalStep = activeGuideStep === maxGuideIndex;
            if (guideNextLabel) {
                guideNextLabel.textContent = isFinalStep ? "Get Started" : "Next";
            }

            if (guideNextBtn) {
                guideNextBtn.classList.toggle("is-finish", isFinalStep);
            }
        };

        const goToGuideStep = (stepIndex) => {
            activeGuideStep = clampGuideStep(stepIndex);
            renderGuideStep();
        };

        const closeGuide = () => {
            setGuideModalOpen(false);
        };

        if (guideCloseBtn) {
            guideCloseBtn.addEventListener("click", closeGuide);
        }

        if (guideSkipBtn) {
            guideSkipBtn.addEventListener("click", closeGuide);
        }

        if (guideBackBtn) {
            guideBackBtn.addEventListener("click", () => {
                goToGuideStep(activeGuideStep - 1);
            });
        }

        if (guideNextBtn) {
            guideNextBtn.addEventListener("click", () => {
                if (activeGuideStep >= maxGuideIndex) {
                    closeGuide();
                    return;
                }
                goToGuideStep(activeGuideStep + 1);
            });
        }

        guideDots.forEach((dot) => {
            dot.addEventListener("click", () => {
                const targetStep = Number(dot.dataset.guideDot);
                if (!Number.isInteger(targetStep)) {
                    return;
                }
                goToGuideStep(targetStep);
            });
        });

        guideModal.addEventListener("click", (event) => {
            if (event.target === guideModal) {
                closeGuide();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") {
                return;
            }

            if (!guideModal.classList.contains("is-open")) {
                return;
            }
            closeGuide();
        });

        if (guideServerTrigger) {
            safeSessionStorage.remove(guideSeenKey);
            safeSessionStorage.set(guidePendingKey, "1");
        }

        const hasSeenGuide = safeSessionStorage.get(guideSeenKey) === "1";
        const hasPendingGuide = safeSessionStorage.get(guidePendingKey) === "1";
        const shouldOpenGuide = guideServerTrigger || (hasPendingGuide && !hasSeenGuide);

        goToGuideStep(0);
        setGuideModalOpen(false);

        if (!shouldOpenGuide) {
            if (hasPendingGuide && hasSeenGuide) {
                safeSessionStorage.remove(guidePendingKey);
            }
            return;
        }

        safeSessionStorage.set(guideSeenKey, "1");
        safeSessionStorage.remove(guidePendingKey);
        setGuideModalOpen(true);
        if (guideNextBtn) {
            guideNextBtn.focus();
        }
    };

    initGuideModal();

    if (!imageInput || !previewContainer || !previewImage || !analyzeBtn || !uploadArea || !uploadForm) {
        return;
    }

    const showError = (message) => {
        if (!uploadError) {
            return;
        }
        uploadError.textContent = message;
        uploadError.style.display = "block";
    };

    const clearError = () => {
        if (!uploadError) {
            return;
        }
        uploadError.textContent = "";
        uploadError.style.display = "none";
    };

    const setProgress = (percent) => {
        const value = Math.max(0, Math.min(100, Math.round(percent)));
        if (progressBar) {
            progressBar.style.width = `${value}%`;
        }
        if (progressText) {
            progressText.textContent = `Uploading: ${value}%`;
        }
    };

    const showProgress = (isVisible) => {
        if (!progressWrap) {
            return;
        }
        progressWrap.style.display = isVisible ? "block" : "none";
        if (!isVisible) {
            setProgress(0);
        }
    };

    const setLoading = (isLoading) => {
        if (loadingOverlay) {
            loadingOverlay.style.display = isLoading ? "flex" : "none";
        }
        if (loadingDiv) {
            loadingDiv.style.display = isLoading ? "block" : "none";
        }
        if (analyzeBtn) {
            analyzeBtn.disabled = isLoading;
            analyzeBtn.textContent = isLoading ? "Analyzing..." : defaultAnalyzeLabel;
        }
    };

    const confirmDelete = (message) => {
        const fallbackMessage = message || "Delete this history entry?";
        if (!deleteConfirmModal || !deleteConfirmMessage || !deleteConfirmCancel || !deleteConfirmAccept) {
            return Promise.resolve(window.confirm(fallbackMessage));
        }

        deleteConfirmMessage.textContent = fallbackMessage;
        deleteConfirmModal.hidden = false;
        deleteConfirmModal.classList.add("is-open");
        document.body.classList.add("modal-open");

        return new Promise((resolve) => {
            const cleanup = () => {
                deleteConfirmModal.classList.remove("is-open");
                deleteConfirmModal.hidden = true;
                document.body.classList.remove("modal-open");
                deleteConfirmModal.removeEventListener("click", onBackdropClick);
                document.removeEventListener("keydown", onKeyDown);
                deleteConfirmCancel.removeEventListener("click", onCancel);
                deleteConfirmAccept.removeEventListener("click", onConfirm);
            };

            const onCancel = () => {
                cleanup();
                resolve(false);
            };

            const onConfirm = () => {
                cleanup();
                resolve(true);
            };

            const onBackdropClick = (event) => {
                if (event.target === deleteConfirmModal) {
                    onCancel();
                }
            };

            const onKeyDown = (event) => {
                if (event.key === "Escape") {
                    onCancel();
                }
            };

            deleteConfirmModal.addEventListener("click", onBackdropClick);
            document.addEventListener("keydown", onKeyDown);
            deleteConfirmCancel.addEventListener("click", onCancel);
            deleteConfirmAccept.addEventListener("click", onConfirm);
            deleteConfirmAccept.focus();
        });
    };

    const capitalize = (value) => {
        const text = String(value || "").trim().toLowerCase();
        if (!text) return "Unknown";
        return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
    };

    const formatScore = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return "0";
        const rounded = Math.round(num * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };

    const formatPercent = (value) => `${formatScore(value)}%`;
    const parseNumeric = (value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    };

    const resolveHistoryStatus = (skinType) => {
        const normalized = String(skinType || "").trim().toLowerCase();
        if (normalized === "normal") {
            return {
                label: "Healthy",
                className: "is-healthy",
            };
        }
        if (normalized === "dry" || normalized === "oily") {
            return {
                label: "Attention",
                className: "is-attention",
            };
        }
        return {
            label: "Review",
            className: "is-neutral",
        };
    };

    const resolveScoreTrend = (currentScore, previousScore) => {
        if (!Number.isFinite(currentScore)) {
            return {
                text: "Baseline",
                className: "is-neutral",
            };
        }

        if (!Number.isFinite(previousScore)) {
            return {
                text: "Baseline",
                className: "is-neutral",
            };
        }

        const delta = Math.round((currentScore - previousScore) * 10) / 10;
        if (Math.abs(delta) < 0.1) {
            return {
                text: "No change",
                className: "is-neutral",
            };
        }
        if (delta > 0) {
            return {
                text: `+${formatScore(delta)}`,
                className: "is-up",
            };
        }
        return {
            text: formatScore(delta),
            className: "is-down",
        };
    };

    const clampScore = (value) => {
        const score = Number(value);
        if (!Number.isFinite(score)) {
            return 0;
        }
        return Math.max(0, Math.min(100, score));
    };

    const updateDashboardStats = (stats) => {
        if (!stats || typeof stats !== "object") {
            return;
        }

        if (statTotalScans) {
            statTotalScans.textContent = String(Number(stats.total_scans) || 0);
        }

        if (statScansThisMonth) {
            statScansThisMonth.textContent = `This month: ${String(Number(stats.scans_this_month) || 0)}`;
        }

        if (statAvgScore) {
            statAvgScore.textContent = formatScore(stats.avg_score);
        }

        if (statAvgScoreChange) {
            statAvgScoreChange.textContent = String(stats.avg_score_change_text || "No scans yet");
        }

        if (statTotalDays) {
            statTotalDays.textContent = `${String(Number(stats.active_days) || 0)} Days`;
        }

        if (statActiveDaysSubtext) {
            statActiveDaysSubtext.textContent = String(stats.active_days_subtext || "");
        }

        if (overallHealthSkinTypeLabel) {
            overallHealthSkinTypeLabel.textContent = String(stats.overall_health_skin_type_label || "No Scan");
        }

        const clampedScore = clampScore(stats.overall_health_score);
        if (overallHealthScoreRing) {
            overallHealthScoreRing.style.setProperty("--score", String(clampedScore));
        }

        if (overallHealthScoreLabel) {
            overallHealthScoreLabel.textContent = formatScore(
                stats.overall_health_score_label ?? stats.overall_health_score
            );
        }

        if (drySignal) {
            drySignal.textContent = formatPercent(stats.dry_signal);
        }

        if (normalSignal) {
            normalSignal.textContent = formatPercent(stats.normal_signal);
        }

        if (oilySignal) {
            oilySignal.textContent = formatPercent(stats.oily_signal);
        }
    };

    const setDashboardView = (view) => {
        if (!dashboardHomeView || !dashboardHistoryView || !dashboardSettingsView) {
            return;
        }

        const normalizedView = view === "history" || view === "settings" ? view : "home";
        const viewMap = {
            home: dashboardHomeView,
            history: dashboardHistoryView,
            settings: dashboardSettingsView,
        };

        Object.entries(viewMap).forEach(([key, node]) => {
            const isActive = normalizedView === key;
            node.hidden = !isActive;
            node.classList.toggle("is-active", isActive);
        });

        const linkMap = {
            home: sidebarDashboardLink,
            history: sidebarHistoryLink,
            settings: sidebarSettingsLink,
        };
        Object.entries(linkMap).forEach(([key, node]) => {
            if (!node) {
                return;
            }
            node.classList.toggle("is-active", normalizedView === key);
        });

        if (normalizedView === "history") {
            const historyAnchor = document.getElementById("dashboard-history-view");
            if (historyAnchor) {
                historyAnchor.scrollIntoView({ block: "start" });
            }
        }
    };

    const resolveDashboardViewFromHash = () => {
        const hash = window.location.hash.toLowerCase();
        if (hash === "#dashboard-settings") {
            return "settings";
        }
        if (hash === "#dashboard-history-view" || hash.startsWith("#dashboard-history")) {
            return "history";
        }
        return "home";
    };

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
                parseNumeric(row.dataset.score) ??
                parseNumeric(scoreNode.textContent) ??
                parseNumeric(scoreNode.innerText);
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
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unable to delete history entry.";
                showError(message);
                button.disabled = false;
            }
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

    const escapeHtml = (value) => {
        const text = String(value ?? "");
        return text
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const listItemsHtml = (items) => {
        const safeItems = Array.isArray(items) ? items : [];
        return safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    };

    const getProbabilityText = (classProbabilities) => {
        const entries = Object.entries(classProbabilities || {});
        if (entries.length === 0) {
            return "Class probabilities are not available.";
        }
        return entries
            .map(([label, value]) => `${escapeHtml(label)}: ${(Number(value) * 100).toFixed(1)}%`)
            .join(" | ");
    };

    const renderRecommendations = (recommendations) => {
        const data = recommendations || {};
        const products = Array.isArray(data.products) ? data.products : [];
        const morningSteps = data.routine?.morning || [];
        const eveningSteps = data.routine?.evening || [];

        const productCards = products
            .map(
                (product) => `
                <article class="analysis-product">
                    <div class="analysis-product-head">
                        <span class="analysis-product-category">${escapeHtml(product.category || "")}</span>
                        <span class="analysis-product-price">${escapeHtml(product.price || "")}</span>
                    </div>
                    <div class="analysis-product-name">${escapeHtml(product.name || "")}</div>
                    <p><strong>Why:</strong> ${escapeHtml(product.why || "")}</p>
                    <p><strong>Alternative:</strong> ${escapeHtml(product.alternative || "")}</p>
                </article>
            `
            )
            .join("");

        return `
            <p>${escapeHtml(data.description || "")}</p>
            <div class="analysis-columns">
                <section class="analysis-panel">
                    <h3>Characteristics</h3>
                    <ul>${listItemsHtml(data.characteristics || [])}</ul>
                </section>
                <section class="analysis-panel">
                    <h3>DO's</h3>
                    <ul>${listItemsHtml(data.dos || [])}</ul>
                </section>
                <section class="analysis-panel">
                    <h3>DON'Ts</h3>
                    <ul>${listItemsHtml(data.donts || [])}</ul>
                </section>
                <section class="analysis-panel">
                    <h3>Morning Routine</h3>
                    <ol>${listItemsHtml(morningSteps)}</ol>
                </section>
                <section class="analysis-panel">
                    <h3>Evening Routine</h3>
                    <ol>${listItemsHtml(eveningSteps)}</ol>
                </section>
            </div>
            <div class="analysis-products">${productCards}</div>
        `;
    };

    const renderAnalysis = (analysis) => {
        if (!analysisResult) {
            return;
        }

        const safeAnalysis = analysis && typeof analysis === "object" ? analysis : {};

        const warningHtml = safeAnalysis.is_low_confidence
            ? `<div class="analysis-warning">Low confidence prediction. Use a clear, front-facing image in good lighting for a more reliable result.</div>`
            : "";

        analysisResult.innerHTML = `
            <h2>Analysis Result</h2>
            <div class="analysis-meta">
                <div><strong>Skin Type:</strong> ${escapeHtml(safeAnalysis.skin_type || "unknown")}</div>
                <div><strong>Confidence:</strong> ${Number(safeAnalysis.confidence || 0).toFixed(2)}%</div>
                <div><strong>Model:</strong> ${escapeHtml(safeAnalysis.model_version || "n/a")}</div>
                <div><strong>Inference Time:</strong> ${Number(safeAnalysis.inference_ms || 0).toFixed(2)} ms</div>
            </div>
            ${warningHtml}
            <div class="analysis-probabilities">${getProbabilityText(safeAnalysis.class_probabilities)}</div>
            <div class="analysis-images">
                <div>
                    <img src="${escapeHtml(safeAnalysis.image_url || "")}" alt="Uploaded image">
                </div>
                <div>
                    <img src="${escapeHtml(safeAnalysis.gradcam_url || "")}" alt="Grad-CAM overlay">
                </div>
            </div>
            ${renderRecommendations(safeAnalysis.recommendations)}
        `;

        analysisResult.hidden = false;
        analysisResult.removeAttribute("hidden");
        if (analysisCard) {
            analysisCard.classList.add("has-result");
        }
        const scrollTarget = analysisCard || analysisResult;
        try {
            scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (_err) {
            scrollTarget.scrollIntoView();
        }
    };

    const refreshCsrfToken = async () => {
        const response = await fetch("/api/csrf-token", {
            method: "GET",
            credentials: "same-origin",
        });
        if (!response.ok) {
            return "";
        }
        const payload = await response.json();
        const token = payload.csrf_token || "";
        if (csrfTokenInput && token) {
            csrfTokenInput.value = token;
        }
        return token;
    };

    const uploadViaApi = (file, csrfToken) => {
        const formData = new FormData();
        formData.append("image", file);
        if (csrfTokenInput) {
            formData.append("csrf_token", csrfTokenInput.value);
        }

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/analyze", true);
            xhr.responseType = "json";
            xhr.withCredentials = true;

            if (csrfToken) {
                xhr.setRequestHeader("X-CSRF-Token", csrfToken);
            }

            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    const percent = (event.loaded / event.total) * 100;
                    setProgress(percent);
                }
            });

            xhr.onload = () => {
                const payload =
                    xhr.response ||
                    (() => {
                        try {
                            return JSON.parse(xhr.responseText || "{}");
                        } catch (_err) {
                            return {};
                        }
                    })();

                if (xhr.status >= 200 && xhr.status < 300) {
                    setProgress(100);
                    resolve(payload);
                    return;
                }

                const error = new Error(payload.error || "Unable to analyze image right now.");
                error.status = xhr.status;
                reject(error);
            };

            xhr.onerror = () => {
                reject(new Error("Network error while uploading image."));
            };

            xhr.send(formData);
        });
    };

    const showPreview = (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImage.src = event.target.result;
            previewContainer.style.display = "block";
            analyzeBtn.style.display = hideAnalyzeUntilFile ? "block" : "";
            uploadArea.style.display = "none";
            if (analysisResult) {
                analysisResult.hidden = true;
            }
            if (analysisCard) {
                analysisCard.classList.remove("has-result");
            }
        };
        reader.readAsDataURL(file);
    };

    const resetPreview = () => {
        imageInput.value = "";
        previewContainer.style.display = "none";
        analyzeBtn.style.display = hideAnalyzeUntilFile ? "none" : "";
        uploadArea.style.display = "block";
        clearError();
        showProgress(false);
        if (analysisCard) {
            analysisCard.classList.remove("has-result");
        }
    };

    if (hideAnalyzeUntilFile) {
        analyzeBtn.style.display = "none";
    }

    setDashboardView(resolveDashboardViewFromHash());
    window.addEventListener("hashchange", () => {
        setDashboardView(resolveDashboardViewFromHash());
    });
    dashboardViewLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const requestedView = String(link.dataset.dashboardView || "").toLowerCase();
            const view = requestedView === "history" || requestedView === "settings" ? requestedView : "home";
            setDashboardView(view);
        });
    });

    bindHistoryToggle();
    bindHistoryDelete();
    refreshHistoryTrends();
    ensureHistoryEmptyState();
    refreshHistoryCollapseState();
    if (analysisCard && analysisResult && !analysisResult.hidden) {
        analysisCard.classList.add("has-result");
    }

    imageInput.addEventListener("change", (event) => {
        clearError();
        if (event.target.files && event.target.files[0]) {
            showPreview(event.target.files[0]);
        }
    });

    if (choosePhotoBtn) {
        choosePhotoBtn.addEventListener("click", () => imageInput.click());
    }

    uploadArea.addEventListener("click", (event) => {
        if (event.target instanceof HTMLElement && event.target.closest("button")) {
            return;
        }
        imageInput.click();
    });

    if (removeBtn) {
        removeBtn.addEventListener("click", resetPreview);
    }

    uploadArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", (event) => {
        event.preventDefault();
        uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (event) => {
        event.preventDefault();
        uploadArea.classList.remove("dragover");

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            imageInput.files = files;
            showPreview(files[0]);
            clearError();
        }
    });

    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearError();

        const file = imageInput.files?.[0];
        if (!file) {
            showError("Please choose an image before analyzing.");
            return;
        }

        setLoading(true);
        showProgress(true);

        try {
            const csrfToken = csrfTokenInput?.value || (await refreshCsrfToken());
            const analysis = await uploadViaApi(file, csrfToken);
            renderAnalysis(analysis);
            appendHistoryItem(analysis);
            updateDashboardStats(analysis.dashboard_stats);
        } catch (error) {
            if (error.status === 401) {
                window.location.href = "/login";
                return;
            }
            showError(error.message || "Failed to analyze image.");
        } finally {
            setLoading(false);
            showProgress(false);
        }
    });

    refreshCsrfToken().catch(() => {
        return;
    });
});
