document.addEventListener("DOMContentLoaded", () => {
    const imageInput = document.getElementById("imageInput");
    const previewContainer = document.getElementById("previewContainer");
    const previewImage = document.getElementById("previewImage");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const uploadArea = document.getElementById("uploadArea");
    const uploadForm = document.getElementById("uploadForm");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const choosePhotoBtn = document.getElementById("choosePhotoBtn");
    const cameraInput = document.getElementById("cameraInput");
    const cameraCaptureBtn = document.getElementById("cameraCaptureBtn");
    const cameraModal = document.getElementById("cameraModal");
    const cameraVideo = document.getElementById("cameraVideo");
    const cameraStatus = document.getElementById("cameraStatus");
    const cameraCloseBtn = document.getElementById("cameraCloseBtn");
    const cameraCancelBtn = document.getElementById("cameraCancelBtn");
    const cameraTakeBtn = document.getElementById("cameraTakeBtn");
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
    const historyFallbackImage = historyList?.dataset.fallbackImage || "/static/images/home/dashboard-default.jpg";
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
    let selectedFile = null;
    let cameraStream = null;
    let cameraIsOpening = false;

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

    const isModalOpen = (modalNode) =>
        Boolean(modalNode) && modalNode.classList.contains("is-open") && !modalNode.hidden;

    const syncBodyModalState = () => {
        const hasOpenModal = isModalOpen(guideModal) || isModalOpen(deleteConfirmModal) || isModalOpen(cameraModal);
        document.body.classList.toggle("modal-open", hasOpenModal);
    };

    const setGuideModalOpen = (isOpen) => {
        if (!guideModal) {
            return;
        }

        guideModal.hidden = !isOpen;
        guideModal.classList.toggle("is-open", isOpen);
        syncBodyModalState();
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

    // Validation is handled in JS so camera-captured files can submit without native file-input constraints.
    imageInput.required = false;

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
        syncBodyModalState();

        return new Promise((resolve) => {
            const cleanup = () => {
                deleteConfirmModal.classList.remove("is-open");
                deleteConfirmModal.hidden = true;
                syncBodyModalState();
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

    const listItemsHtml = (items, itemClass = "") => {
        const safeItems = Array.isArray(items) ? items : [];
        const classAttr = itemClass ? ` class="${itemClass}"` : "";
        return safeItems.map((item) => `<li${classAttr}>${escapeHtml(item)}</li>`).join("");
    };

    const formatDateLabel = (date) =>
        date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });

    const formatTimeLabel = (date) =>
        date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

    const formatCompactDateLabel = (date) =>
        date.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "2-digit",
        });

    const formatScoreLabel = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return "0";
        }
        const rounded = Math.round(numeric * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };

    const formatPercentLabel = (value) => `${formatScoreLabel(value)}%`;

    const toPercentValue = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return null;
        }
        const normalized = numeric <= 1 ? numeric * 100 : numeric;
        return Math.max(0, Math.min(100, normalized));
    };

    const buildReportId = (analysis, issuedAt) => {
        const year = issuedAt.getFullYear();
        const month = String(issuedAt.getMonth() + 1).padStart(2, "0");
        const day = String(issuedAt.getDate()).padStart(2, "0");
        const scanId = Number(analysis.result_id);
        const suffix = Number.isFinite(scanId)
            ? `L${String(scanId).padStart(4, "0")}`
            : `L${String(Math.floor(Math.random() * 9000) + 1000)}`;
        return `DS-${year}${month}${day}-${suffix}`;
    };

    const buildFileBaseName = (analysis, issuedAt) => {
        const rawSkin = String(analysis.skin_type || "skin")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const skinSlug = rawSkin || "skin";
        const dateStamp = `${issuedAt.getFullYear()}${String(issuedAt.getMonth() + 1).padStart(2, "0")}${String(
            issuedAt.getDate()
        ).padStart(2, "0")}`;
        return `skin-prescription-${skinSlug}-${dateStamp}`;
    };

    const resolveSkinSummary = (skinType) => {
        const normalized = String(skinType || "").trim().toLowerCase();
        if (normalized === "dry") {
            return "Low Sebum Production";
        }
        if (normalized === "oily") {
            return "Excess Sebum Production";
        }
        if (normalized === "normal") {
            return "Balanced Sebum Levels";
        }
        return "Needs Further Assessment";
    };

    const getProbabilityRows = (analysis) => {
        const labels = ["dry", "normal", "oily"];
        const probabilityMap =
            analysis.class_probabilities && typeof analysis.class_probabilities === "object"
                ? analysis.class_probabilities
                : {};
        const hasProbabilityData = Object.keys(probabilityMap).length > 0;
        const predictedSkin = String(analysis.skin_type || "").trim().toLowerCase();
        const confidencePercent = Math.max(0, Math.min(100, Number(analysis.confidence) || 0));
        const fallbackOther = Math.max(0, (100 - confidencePercent) / (labels.length - 1));

        return labels.map((label) => {
            let percent = toPercentValue(probabilityMap[label]);
            if (percent === null) {
                if (!hasProbabilityData) {
                    percent = label === predictedSkin ? confidencePercent : fallbackOther;
                } else {
                    percent = 0;
                }
            }
            return {
                label: capitalize(label),
                percent,
            };
        });
    };

    const renderProductCards = (products) => {
        const safeProducts = Array.isArray(products) ? products : [];
        if (safeProducts.length === 0) {
            return '<p class="rx-products-empty">No product recommendations available for this scan.</p>';
        }

        return safeProducts
            .map(
                (product) => `
                    <article class="rx-product-card">
                        <div class="rx-product-head">
                            <span class="rx-product-category">${escapeHtml(product.category || "Product")}</span>
                            <span class="rx-product-price">${escapeHtml(product.price || "Price unavailable")}</span>
                        </div>
                        <h6>${escapeHtml(product.name || "Recommended option")}</h6>
                        <p><strong>Why:</strong> ${escapeHtml(product.why || "Matches your detected skin profile.")}</p>
                        <p><strong>Alternative:</strong> ${escapeHtml(product.alternative || "Consult your dermatologist.")}</p>
                    </article>
                `
            )
            .join("");
    };

    let exportLibrariesPromise = null;
    const loadExternalScript = (src) =>
        new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                if (existing.dataset.loaded === "true") {
                    resolve();
                    return;
                }
                existing.addEventListener("load", () => resolve(), { once: true });
                existing.addEventListener("error", () => reject(new Error(`Unable to load ${src}.`)), { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.addEventListener(
                "load",
                () => {
                    script.dataset.loaded = "true";
                    resolve();
                },
                { once: true }
            );
            script.addEventListener("error", () => reject(new Error(`Unable to load ${src}.`)), { once: true });
            document.head.append(script);
        });

    const ensureExportLibraries = async () => {
        if (typeof window.html2canvas === "function" && typeof window.jspdf?.jsPDF === "function") {
            return;
        }

        if (!exportLibrariesPromise) {
            exportLibrariesPromise = (async () => {
                await loadExternalScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
                await loadExternalScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
            })().catch((error) => {
                exportLibrariesPromise = null;
                throw error;
            });
        }

        await exportLibrariesPromise;
    };

    const capturePrescriptionCanvas = async (reportNode) => {
        if (!reportNode) {
            throw new Error("Prescription report is not available to export.");
        }

        await ensureExportLibraries();
        if (typeof window.html2canvas !== "function") {
            throw new Error("Image export is not available in this browser.");
        }

        return window.html2canvas(reportNode, {
            backgroundColor: "#ffffff",
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: reportNode.scrollWidth,
            windowHeight: reportNode.scrollHeight,
        });
    };

    const savePrescriptionImage = async (reportNode, fileBaseName) => {
        const canvas = await capturePrescriptionCanvas(reportNode);
        const anchor = document.createElement("a");
        anchor.href = canvas.toDataURL("image/png");
        anchor.download = `${fileBaseName}.png`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
    };

    const downloadPrescriptionPdf = async (reportNode, fileBaseName) => {
        const canvas = await capturePrescriptionCanvas(reportNode);
        const JsPdf = window.jspdf?.jsPDF;
        if (typeof JsPdf !== "function") {
            throw new Error("PDF export is not available in this browser.");
        }

        const pdf = new JsPdf({
            orientation: canvas.width > canvas.height ? "landscape" : "portrait",
            unit: "px",
            format: [canvas.width, canvas.height],
            compress: true,
        });
        const imageData = canvas.toDataURL("image/png");
        pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height, undefined, "FAST");
        pdf.save(`${fileBaseName}.pdf`);
    };

    const runPrescriptionAction = async (button, busyLabel, action) => {
        if (!button) {
            return;
        }

        const defaultLabel = button.dataset.defaultLabel || button.textContent || "";
        button.dataset.defaultLabel = defaultLabel;
        button.disabled = true;
        button.classList.add("is-busy");
        button.textContent = busyLabel;

        try {
            await action();
        } finally {
            button.disabled = false;
            button.classList.remove("is-busy");
            button.textContent = defaultLabel;
        }
    };

    const bindPrescriptionActions = (analysis, issuedAt) => {
        if (!analysisResult) {
            return;
        }

        const reportNode = analysisResult.querySelector("#prescriptionReport");
        if (!reportNode) {
            return;
        }

        const fileBaseName = buildFileBaseName(analysis, issuedAt);
        const actionButtons = Array.from(reportNode.querySelectorAll("[data-prescription-action]"));
        actionButtons.forEach((button) => {
            button.addEventListener("click", async () => {
                const action = button.dataset.prescriptionAction || "";
                try {
                    if (action === "print") {
                        window.print();
                        return;
                    }

                    if (action === "pdf") {
                        await runPrescriptionAction(button, "Preparing PDF...", async () => {
                            await downloadPrescriptionPdf(reportNode, fileBaseName);
                        });
                        return;
                    }

                    if (action === "image") {
                        await runPrescriptionAction(button, "Saving Image...", async () => {
                            await savePrescriptionImage(reportNode, fileBaseName);
                        });
                    }
                } catch (err) {
                    const message = err instanceof Error ? err.message : "Unable to export prescription.";
                    showError(message);
                }
            });
        });
    };

    const renderAnalysis = (analysis) => {
        if (!analysisResult) {
            return;
        }

        const safeAnalysis = analysis && typeof analysis === "object" ? analysis : {};
        const issuedAt = new Date();
        const recommendations =
            safeAnalysis.recommendations && typeof safeAnalysis.recommendations === "object"
                ? safeAnalysis.recommendations
                : {};
        const morningSteps = Array.isArray(recommendations.routine?.morning) ? recommendations.routine.morning : [];
        const eveningSteps = Array.isArray(recommendations.routine?.evening) ? recommendations.routine.evening : [];
        const dos = Array.isArray(recommendations.dos) ? recommendations.dos : [];
        const donts = Array.isArray(recommendations.donts) ? recommendations.donts : [];
        const products = Array.isArray(recommendations.products) ? recommendations.products : [];
        const probabilityRows = getProbabilityRows(safeAnalysis);

        const confidencePercent = Math.max(0, Math.min(100, Number(safeAnalysis.confidence) || 0));
        const skinLabel = capitalize(safeAnalysis.skin_type || "unknown");
        const warningHtml = safeAnalysis.is_low_confidence
            ? `
                <div class="prescription-warning">
                    Low confidence prediction. Use a clear, front-facing image in good lighting for a more reliable result.
                </div>
            `
            : "";

        const morningItemsHtml = morningSteps.length
            ? listItemsHtml(morningSteps, "rx-step")
            : '<li class="rx-step is-empty">No morning routine provided for this scan.</li>';
        const eveningItemsHtml = eveningSteps.length
            ? listItemsHtml(eveningSteps, "rx-step")
            : '<li class="rx-step is-empty">No evening routine provided for this scan.</li>';
        const dosItemsHtml = dos.length
            ? listItemsHtml(dos, "rx-note-item")
            : '<li class="rx-note-item is-empty">No additional DO guidance provided.</li>';
        const dontItemsHtml = donts.length
            ? listItemsHtml(donts, "rx-note-item")
            : '<li class="rx-note-item is-empty">No additional DON\'T guidance provided.</li>';
        const probabilityRowsHtml = probabilityRows
            .map(
                (entry) => `
                    <li>
                        <span>${escapeHtml(entry.label)}</span>
                        <strong>${formatPercentLabel(entry.percent)}</strong>
                    </li>
                `
            )
            .join("");

        analysisResult.innerHTML = `
            <article class="prescription-report" id="prescriptionReport">
                <header class="prescription-header">
                    <div class="prescription-topline">
                        <span>${escapeHtml(`${formatCompactDateLabel(issuedAt)}, ${formatTimeLabel(issuedAt)}`)}</span>
                        <span>DermaScan AI - Intelligent Skin Analysis</span>
                    </div>
                    <div class="prescription-title-row">
                        <div>
                            <h2>Skin Analysis Prescription</h2>
                            <p>AI-generated dermatology assessment based on CNN image analysis.</p>
                        </div>
                        <div class="prescription-actions">
                            <button type="button" class="prescription-action-btn" data-prescription-action="print">Print</button>
                            <button type="button" class="prescription-action-btn" data-prescription-action="pdf">Download PDF</button>
                            <button type="button" class="prescription-action-btn" data-prescription-action="image">Save Image</button>
                        </div>
                    </div>
                </header>

                <section class="prescription-clinic">
                    <h3>DermaScan AI Clinic</h3>
                    <p>Advanced Dermatological Analysis</p>
                </section>

                <section class="prescription-meta-grid">
                    <div>
                        <span>Report ID</span>
                        <strong>${escapeHtml(buildReportId(safeAnalysis, issuedAt))}</strong>
                    </div>
                    <div>
                        <span>Date</span>
                        <strong>${escapeHtml(formatDateLabel(issuedAt))}</strong>
                    </div>
                    <div>
                        <span>Time</span>
                        <strong>${escapeHtml(formatTimeLabel(issuedAt))}</strong>
                    </div>
                    <div>
                        <span>Status</span>
                        <strong class="status-verified">Verified</strong>
                    </div>
                </section>

                ${warningHtml}

                <section class="prescription-section">
                    <h4>Primary Diagnosis</h4>
                    <div class="diagnosis-panel">
                        <div class="diagnosis-image-grid">
                            <figure class="diagnosis-image-card">
                                <img src="${escapeHtml(safeAnalysis.image_url || "")}" alt="Submitted sample">
                                <figcaption>Submitted Sample</figcaption>
                            </figure>
                            <figure class="diagnosis-image-card">
                                <img src="${escapeHtml(safeAnalysis.gradcam_url || "")}" alt="AI focus heatmap">
                                <figcaption>AI Focus Map</figcaption>
                            </figure>
                        </div>
                        <div class="diagnosis-content">
                            <div class="diagnosis-head">
                                <div>
                                    <p>Detected Skin Type</p>
                                    <h5>${escapeHtml(`${skinLabel} Skin`)}</h5>
                                    <small>${escapeHtml(resolveSkinSummary(skinLabel))}</small>
                                </div>
                                <span class="confidence-chip">${escapeHtml(formatPercentLabel(confidencePercent))} Confidence</span>
                            </div>
                            <p class="diagnosis-subhead">CNN Classification Scores</p>
                            <ul class="diagnosis-score-list">
                                ${probabilityRowsHtml}
                            </ul>
                        </div>
                    </div>
                </section>

                <section class="prescription-section">
                    <h4>Prescribed Skincare Routine</h4>
                    <div class="rx-card">
                        <div class="rx-title-row">
                            <span class="rx-mark">Rx</span>
                            <div>
                                <h5>Skincare Prescription for ${escapeHtml(`${skinLabel} Skin`)}</h5>
                                <p>Follow consistently for 4-6 weeks before reassessment.</p>
                            </div>
                        </div>
                        <div class="rx-columns">
                            <section class="rx-block">
                                <h6>Morning Routine (AM)</h6>
                                <ol class="rx-list">${morningItemsHtml}</ol>
                            </section>
                            <section class="rx-block">
                                <h6>Evening Routine (PM)</h6>
                                <ol class="rx-list">${eveningItemsHtml}</ol>
                            </section>
                        </div>
                    </div>
                </section>

                <section class="prescription-section">
                    <h4>Care Notes</h4>
                    <div class="rx-notes-grid">
                        <section class="rx-note-card">
                            <h6>DO's</h6>
                            <ul>${dosItemsHtml}</ul>
                        </section>
                        <section class="rx-note-card">
                            <h6>DON'Ts</h6>
                            <ul>${dontItemsHtml}</ul>
                        </section>
                    </div>
                </section>

                <section class="prescription-section">
                    <h4>Recommended Products</h4>
                    <div class="rx-products-grid">
                        ${renderProductCards(products)}
                    </div>
                </section>

                <footer class="prescription-footer">
                    <p>${escapeHtml(recommendations.description || "Personalized skincare guidance generated by DermaScan AI.")}</p>
                    <p>
                        Model: ${escapeHtml(safeAnalysis.model_version || "n/a")} |
                        Inference time: ${escapeHtml(`${formatScoreLabel(safeAnalysis.inference_ms || 0)} ms`)}
                    </p>
                    <p>This AI prescription supports skincare planning and does not replace professional medical diagnosis.</p>
                </footer>
            </article>
        `;

        bindPrescriptionActions(safeAnalysis, issuedAt);
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
        selectedFile = file || null;
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
        selectedFile = null;
        imageInput.value = "";
        if (cameraInput) {
            cameraInput.value = "";
        }
        previewContainer.style.display = "none";
        analyzeBtn.style.display = hideAnalyzeUntilFile ? "none" : "";
        uploadArea.style.display = "block";
        clearError();
        showProgress(false);
        if (analysisCard) {
            analysisCard.classList.remove("has-result");
        }
    };

    const setCameraStatus = (message, isError = false) => {
        if (!cameraStatus) {
            return;
        }

        const text = String(message || "").trim();
        cameraStatus.textContent = text;
        cameraStatus.hidden = !text;
        cameraStatus.classList.toggle("is-error", Boolean(text) && isError);
    };

    const stopCameraStream = () => {
        if (cameraStream && typeof cameraStream.getTracks === "function") {
            cameraStream.getTracks().forEach((track) => {
                try {
                    track.stop();
                } catch (_err) {
                    return;
                }
            });
        }
        cameraStream = null;

        if (cameraVideo) {
            try {
                cameraVideo.pause();
            } catch (_err) {
                // Ignore pause failures while cleaning up the stream.
            }
            if ("srcObject" in cameraVideo) {
                cameraVideo.srcObject = null;
            }
        }
    };

    const setCameraModalOpen = (isOpen) => {
        if (!cameraModal) {
            return;
        }

        cameraModal.hidden = !isOpen;
        cameraModal.classList.toggle("is-open", isOpen);
        syncBodyModalState();
    };

    const closeCameraModal = () => {
        stopCameraStream();
        setCameraStatus("");
        setCameraModalOpen(false);
    };

    const openInlineCamera = async () => {
        if (!cameraModal || !cameraVideo) {
            return false;
        }

        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
            return false;
        }

        if (cameraIsOpening) {
            return true;
        }

        cameraIsOpening = true;
        clearError();
        setCameraStatus("Starting camera...");
        setCameraModalOpen(true);

        try {
            stopCameraStream();
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: {
                        ideal: "environment",
                    },
                    width: {
                        ideal: 1280,
                    },
                    height: {
                        ideal: 720,
                    },
                },
            });

            cameraStream = stream;
            cameraVideo.srcObject = stream;
            await cameraVideo.play();
            setCameraStatus("");
            return true;
        } catch (error) {
            closeCameraModal();
            const errorName = String(error?.name || "");
            if (errorName === "NotAllowedError" || errorName === "SecurityError") {
                showError("Camera access is blocked. Allow camera permission, or use Choose Photo.");
            } else if (errorName === "NotFoundError" || errorName === "OverconstrainedError") {
                showError("No working camera found on this device. Please upload a photo.");
            } else {
                showError("Live camera preview is unavailable. Opening the camera picker instead.");
            }
            return false;
        } finally {
            cameraIsOpening = false;
        }
    };

    const captureInlineCameraImage = async () => {
        if (!cameraVideo || !cameraVideo.videoWidth || !cameraVideo.videoHeight) {
            showError("Camera is not ready yet. Please wait a moment and try again.");
            return;
        }

        const previousCaptureLabel = cameraTakeBtn?.textContent || "Capture Photo";
        if (cameraTakeBtn) {
            cameraTakeBtn.disabled = true;
            cameraTakeBtn.textContent = "Capturing...";
        }
        setCameraStatus("Capturing...");

        try {
            const canvas = document.createElement("canvas");
            canvas.width = cameraVideo.videoWidth;
            canvas.height = cameraVideo.videoHeight;
            const context = canvas.getContext("2d");
            if (!context) {
                throw new Error("Unable to access camera frame.");
            }
            context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, "image/jpeg", 0.92);
            });
            if (!blob) {
                throw new Error("Unable to create image from camera capture.");
            }

            const now = Date.now();
            const captureFile = new File([blob], `camera-capture-${now}.jpg`, {
                type: "image/jpeg",
                lastModified: now,
            });

            imageInput.value = "";
            if (cameraInput) {
                cameraInput.value = "";
            }

            clearError();
            showPreview(captureFile);
            closeCameraModal();
        } catch (_error) {
            showError("Could not capture photo. Please try again.");
            setCameraStatus("Could not capture photo. Try again.", true);
        } finally {
            if (cameraTakeBtn) {
                cameraTakeBtn.disabled = false;
                cameraTakeBtn.textContent = previousCaptureLabel;
            }
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

    if (cameraCaptureBtn) {
        cameraCaptureBtn.addEventListener("click", async () => {
            const opened = await openInlineCamera();
            if (!opened && cameraInput) {
                cameraInput.click();
            }
        });
    }

    if (cameraInput) {
        cameraInput.addEventListener("change", (event) => {
            clearError();
            if (event.target.files && event.target.files[0]) {
                showPreview(event.target.files[0]);
            }
        });
    }

    if (cameraCloseBtn) {
        cameraCloseBtn.addEventListener("click", closeCameraModal);
    }

    if (cameraCancelBtn) {
        cameraCancelBtn.addEventListener("click", closeCameraModal);
    }

    if (cameraTakeBtn) {
        cameraTakeBtn.addEventListener("click", () => {
            captureInlineCameraImage().catch(() => {
                showError("Could not capture photo. Please try again.");
            });
        });
    }

    if (cameraModal) {
        cameraModal.addEventListener("click", (event) => {
            if (event.target === cameraModal) {
                closeCameraModal();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }
        if (cameraModal && cameraModal.classList.contains("is-open")) {
            closeCameraModal();
        }
    });

    window.addEventListener("pagehide", () => {
        stopCameraStream();
    });

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
            showPreview(files[0]);
            clearError();
        }
    });

    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearError();

        const file = selectedFile || imageInput.files?.[0] || cameraInput?.files?.[0];
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
