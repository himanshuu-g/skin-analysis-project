import { initDashboardModule } from "./dashboard.js";
import { initAnalysisModule } from "./analysis.js";
import { initHistoryModule } from "./history.js";
import { initCameraModule } from "./camera.js";

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
    const cameraRotateBtn = document.getElementById("cameraRotateBtn");
    const cameraTakeBtn = document.getElementById("cameraTakeBtn");
    const removeBtn = document.getElementById("removeBtn");
    const retakeBtn = document.getElementById("retakeBtn");
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
    const dashboardShell = document.querySelector(".dashboard-shell");
    const sidebarCollapseBtn = document.getElementById("sidebarCollapseBtn");
    const dashboardHomeView = document.getElementById("dashboardHomeView");
    const dashboardRoutineView = document.getElementById("dashboardRoutineView");
    const dashboardHistoryView = document.getElementById("dashboardHistoryView");
    const dashboardSettingsView = document.getElementById("dashboardSettingsView");
    const sidebarDashboardLink = document.getElementById("sidebarDashboardLink");
    const sidebarNewScanLink = document.getElementById("sidebarNewScanLink");
    const sidebarRoutineLink = document.getElementById("sidebarRoutineLink");
    const sidebarScheduleLink = document.getElementById("sidebarScheduleLink");
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
    const metricLatestConfidence = document.getElementById("metricLatestConfidence");
    const metricLatestInference = document.getElementById("metricLatestInference");
    const metricLatestModelVersion = document.getElementById("metricLatestModelVersion");
    const metricTrendDelta = document.getElementById("metricTrendDelta");
    const metricTrendMeta = document.getElementById("metricTrendMeta");
    const metricsTrendArea = document.getElementById("metricsTrendArea");
    const metricsTrendLine = document.getElementById("metricsTrendLine");
    const metricsTrendPoints = document.getElementById("metricsTrendPoints");
    const metricDistDryBar = document.getElementById("metricDistDryBar");
    const metricDistNormalBar = document.getElementById("metricDistNormalBar");
    const metricDistOilyBar = document.getElementById("metricDistOilyBar");
    const metricDistDryValue = document.getElementById("metricDistDryValue");
    const metricDistNormalValue = document.getElementById("metricDistNormalValue");
    const metricDistOilyValue = document.getElementById("metricDistOilyValue");
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
    const sidebarCollapseKey = "skinanalysis_sidebar_collapsed";
    const guideServerTrigger = document.body?.dataset.guideTrigger === "1";
    const settingsInlineTabs = Array.from(document.querySelectorAll("[data-settings-tab]"));
    const settingsInlinePanels = Array.from(document.querySelectorAll("[data-settings-panel]"));
    const routinePage = document.getElementById("dashboard-routine-view");
    const routineSkinButtons = Array.from(document.querySelectorAll("[data-routine-skin-btn]"));
    const routinePeriodButtons = Array.from(document.querySelectorAll("[data-routine-period-btn]"));
    const routineStepGrid = document.getElementById("routineStepGrid");
    const routineProgressDone = document.getElementById("routineProgressDone");
    const routineProgressTotal = document.getElementById("routineProgressTotal");
    const routineProgressBadge = document.getElementById("routineProgressBadge");
    const routineMorningDone = document.getElementById("routineMorningDone");
    const routineMorningTotal = document.getElementById("routineMorningTotal");
    const routineEveningDone = document.getElementById("routineEveningDone");
    const routineEveningTotal = document.getElementById("routineEveningTotal");
    let activeGuideStep = 0;
    let selectedFile = null;

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

    const safeLocalStorage = {
        get(key) {
            try {
                return window.localStorage.getItem(key);
            } catch (_err) {
                return null;
            }
        },
        set(key, value) {
            try {
                window.localStorage.setItem(key, value);
            } catch (_err) {
                return;
            }
        },
    };

    const routineCompletionKey = "skinanalysis_routine_completion";
    const routineCatalog = {
        oily: {
            label: "Oily Skin",
            morning: [
                { title: "Cleanser", description: "Foaming gel cleanser", tip: "Gently massage for 60 seconds" },
                { title: "Toner", description: "Salicylic acid toner", tip: "Use a cotton pad, sweep upward" },
                { title: "Serum", description: "Niacinamide 10% serum", tip: "Apply 3-4 drops, pat gently" },
                { title: "Moisturizer", description: "Oil-free gel moisturizer", tip: "Use a thin layer, let absorb" },
                { title: "Sunscreen", description: "SPF 50 matte finish", tip: "Reapply every 2 hours outdoors" },
            ],
            evening: [
                { title: "Makeup Remove", description: "Micellar water cleanse", tip: "Wipe gently without friction" },
                { title: "Cleanser", description: "Foaming cleanser refresh", tip: "Focus on oily zones and jawline" },
                { title: "Toner", description: "BHA balancing toner", tip: "Use only on non-irritated skin" },
                { title: "Serum", description: "Niacinamide serum layer", tip: "Use thin layer on full face" },
                { title: "Night Gel", description: "Lightweight gel hydrator", tip: "Finish with a breathable layer" },
            ],
        },
        normal: {
            label: "Normal Skin",
            morning: [
                { title: "Cleanser", description: "Gentle daily cleanser", tip: "Rinse with lukewarm water" },
                { title: "Vitamin C", description: "Brightening antioxidant serum", tip: "Use 2-3 drops before cream" },
                { title: "Moisturizer", description: "Lightweight daily moisturizer", tip: "Press in, do not rub hard" },
                { title: "Eye Cream", description: "Hydrating under-eye care", tip: "Tap with ring finger softly" },
                { title: "Sunscreen", description: "SPF 30+ broad spectrum", tip: "Apply as final morning step" },
            ],
            evening: [
                { title: "Makeup Remove", description: "Clean base with remover", tip: "Lift makeup before cleansing" },
                { title: "Cleanser", description: "Balanced gel cleanser", tip: "Keep cleanse under 1 minute" },
                { title: "Toner", description: "Hydrating toner", tip: "Pat lightly to calm skin" },
                { title: "Retinol", description: "Low-strength retinol serum", tip: "Use every other night first" },
                { title: "Night Cream", description: "Repair moisturizer", tip: "Seal hydration overnight" },
            ],
        },
        dry: {
            label: "Dry Skin",
            morning: [
                { title: "Cream Cleanser", description: "Non-foaming cream wash", tip: "Do not over-cleanse" },
                { title: "Hydration Serum", description: "Hyaluronic acid serum", tip: "Apply on damp skin" },
                { title: "Barrier Cream", description: "Ceramide-rich moisturizer", tip: "Layer generously on dry areas" },
                { title: "Face Oil", description: "Squalane or nourishing oil", tip: "Use 2 drops to seal moisture" },
                { title: "Sunscreen", description: "Hydrating SPF 50", tip: "Use full-face even indoors" },
            ],
            evening: [
                { title: "Milk Cleanser", description: "Soft cleansing milk", tip: "Massage slowly, rinse lukewarm" },
                { title: "Essence", description: "Hydrating essence toner", tip: "Use palms for better absorption" },
                { title: "Repair Serum", description: "Ceramide support serum", tip: "Layer before moisturizer" },
                { title: "Rich Cream", description: "Deep moisture night cream", tip: "Cover cheeks and forehead well" },
                { title: "Overnight Balm", description: "Occlusive final layer", tip: "Use as lock-in step at night" },
            ],
        },
    };
    const routineSkinTypes = Object.keys(routineCatalog);
    let routineActiveSkin = "oily";
    let routineActivePeriod = "morning";
    let routineCompletionState = {};

    const setSidebarCollapsed = (isCollapsed) => {
        if (!dashboardShell || !sidebarCollapseBtn) {
            return;
        }

        dashboardShell.classList.toggle("sidebar-collapsed", isCollapsed);
        sidebarCollapseBtn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
        sidebarCollapseBtn.setAttribute("aria-label", isCollapsed ? "Expand menu" : "Collapse menu");
    };

    const initSidebarCollapse = () => {
        if (!dashboardShell || !sidebarCollapseBtn) {
            return;
        }

        const hasDesktopSidebar = window.matchMedia("(min-width: 1021px)").matches;
        const isInitiallyCollapsed = hasDesktopSidebar && safeLocalStorage.get(sidebarCollapseKey) === "1";
        setSidebarCollapsed(isInitiallyCollapsed);

        sidebarCollapseBtn.addEventListener("click", () => {
            const willCollapse = !dashboardShell.classList.contains("sidebar-collapsed");
            setSidebarCollapsed(willCollapse);
            safeLocalStorage.set(sidebarCollapseKey, willCollapse ? "1" : "0");
        });
    };

    const setSettingsInlineTab = (requestedTab) => {
        if (!settingsInlineTabs.length || !settingsInlinePanels.length) {
            return;
        }

        const availableTabs = new Set(settingsInlinePanels.map((panel) => panel.dataset.settingsPanel));
        const fallbackTab = settingsInlineTabs[0]?.dataset.settingsTab || "profile";
        const activeTab = availableTabs.has(requestedTab) ? requestedTab : fallbackTab;

        settingsInlineTabs.forEach((tab) => {
            const isActive = tab.dataset.settingsTab === activeTab;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        settingsInlinePanels.forEach((panel) => {
            const isActive = panel.dataset.settingsPanel === activeTab;
            panel.classList.toggle("is-active", isActive);
            panel.hidden = !isActive;
        });
    };

    const initSettingsInlineTabs = () => {
        if (!settingsInlineTabs.length || !settingsInlinePanels.length) {
            return;
        }

        setSettingsInlineTab(settingsInlineTabs[0]?.dataset.settingsTab || "profile");
        settingsInlineTabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                setSettingsInlineTab(tab.dataset.settingsTab || "profile");
            });
        });
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
    initSidebarCollapse();
    initSettingsInlineTabs();

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

    const normalizeRoutineSkin = (value) => {
        const normalized = String(value || "").trim().toLowerCase();
        return routineSkinTypes.includes(normalized) ? normalized : null;
    };

    const buildEmptyRoutineCompletionState = () => {
        const state = {};
        routineSkinTypes.forEach((skin) => {
            state[skin] = {
                morning: new Array(routineCatalog[skin].morning.length).fill(false),
                evening: new Array(routineCatalog[skin].evening.length).fill(false),
            };
        });
        return state;
    };

    const sanitizeRoutineCompletionState = (raw) => {
        const safeState = buildEmptyRoutineCompletionState();
        if (!raw || typeof raw !== "object") {
            return safeState;
        }

        routineSkinTypes.forEach((skin) => {
            ["morning", "evening"].forEach((period) => {
                const targetLength = routineCatalog[skin][period].length;
                const source = Array.isArray(raw?.[skin]?.[period]) ? raw[skin][period] : [];
                safeState[skin][period] = Array.from({ length: targetLength }, (_unused, index) => {
                    return source[index] === true;
                });
            });
        });

        return safeState;
    };

    const loadRoutineCompletionState = () => {
        const raw = safeLocalStorage.get(routineCompletionKey);
        if (!raw) {
            return buildEmptyRoutineCompletionState();
        }

        try {
            return sanitizeRoutineCompletionState(JSON.parse(raw));
        } catch (_err) {
            return buildEmptyRoutineCompletionState();
        }
    };

    const persistRoutineCompletionState = () => {
        safeLocalStorage.set(routineCompletionKey, JSON.stringify(routineCompletionState));
    };

    const getRoutineSteps = (skin, period) => {
        return Array.isArray(routineCatalog?.[skin]?.[period]) ? routineCatalog[skin][period] : [];
    };

    const getRoutineCompletedCount = (skin, period) => {
        const steps = getRoutineSteps(skin, period);
        const completionRow = Array.isArray(routineCompletionState?.[skin]?.[period])
            ? routineCompletionState[skin][period]
            : [];
        return steps.reduce((count, _step, index) => count + (completionRow[index] === true ? 1 : 0), 0);
    };

    const getRoutineTotalCount = (skin, period) => getRoutineSteps(skin, period).length;

    const renderRoutinePage = () => {
        if (!routinePage || !routineStepGrid) {
            return;
        }

        const normalizedSkin = normalizeRoutineSkin(routineActiveSkin);
        routineActiveSkin = normalizedSkin || "oily";
        routineActivePeriod = routineActivePeriod === "evening" ? "evening" : "morning";

        const activeCatalog = routineCatalog[routineActiveSkin] || routineCatalog.oily;
        const morningTotal = getRoutineTotalCount(routineActiveSkin, "morning");
        const eveningTotal = getRoutineTotalCount(routineActiveSkin, "evening");
        const morningDone = getRoutineCompletedCount(routineActiveSkin, "morning");
        const eveningDone = getRoutineCompletedCount(routineActiveSkin, "evening");
        const totalSteps = morningTotal + eveningTotal;
        const totalDone = morningDone + eveningDone;

        routineSkinButtons.forEach((button) => {
            const isActive = button.dataset.routineSkinBtn === routineActiveSkin;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        routinePeriodButtons.forEach((button) => {
            const isActive = button.dataset.routinePeriodBtn === routineActivePeriod;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        if (routineMorningDone) routineMorningDone.textContent = String(morningDone);
        if (routineMorningTotal) routineMorningTotal.textContent = String(morningTotal);
        if (routineEveningDone) routineEveningDone.textContent = String(eveningDone);
        if (routineEveningTotal) routineEveningTotal.textContent = String(eveningTotal);
        if (routineProgressDone) routineProgressDone.textContent = String(totalDone);
        if (routineProgressTotal) routineProgressTotal.textContent = String(totalSteps);
        if (routineProgressBadge) routineProgressBadge.textContent = `${activeCatalog.label} Routine`;

        const steps = getRoutineSteps(routineActiveSkin, routineActivePeriod);
        const completionRow = routineCompletionState?.[routineActiveSkin]?.[routineActivePeriod] || [];
        routineStepGrid.innerHTML = "";

        if (!steps.length) {
            const emptyState = document.createElement("div");
            emptyState.className = "routine-step-empty";
            emptyState.textContent = "No routine steps available for this skin type yet.";
            routineStepGrid.append(emptyState);
            return;
        }

        steps.forEach((step, index) => {
            const checkboxId = `routine-step-${routineActiveSkin}-${routineActivePeriod}-${index}`;
            const isDone = completionRow[index] === true;

            const card = document.createElement("article");
            card.className = "routine-step-card";
            if (isDone) {
                card.classList.add("is-done");
            }

            const head = document.createElement("div");
            head.className = "routine-step-head";

            const number = document.createElement("span");
            number.className = "routine-step-number";
            number.textContent = String(index + 1).padStart(2, "0");

            const checkLabel = document.createElement("label");
            checkLabel.className = "routine-step-check";
            checkLabel.setAttribute("for", checkboxId);

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = checkboxId;
            checkbox.checked = isDone;
            checkbox.setAttribute("aria-label", `Mark ${step.title} as complete`);
            checkbox.addEventListener("change", () => {
                if (!routineCompletionState?.[routineActiveSkin]?.[routineActivePeriod]) {
                    return;
                }
                routineCompletionState[routineActiveSkin][routineActivePeriod][index] = checkbox.checked;
                persistRoutineCompletionState();
                renderRoutinePage();
            });

            checkLabel.append(checkbox);
            head.append(number, checkLabel);

            const title = document.createElement("h4");
            title.className = "routine-step-title";
            title.textContent = String(step.title || `Step ${index + 1}`);

            const description = document.createElement("p");
            description.className = "routine-step-description";
            description.textContent = String(step.description || "");

            const tip = document.createElement("p");
            tip.className = "routine-step-tip";
            tip.textContent = String(step.tip || "");

            card.append(head, title, description, tip);
            routineStepGrid.append(card);
        });
    };

    const syncRoutineSkinFromStats = (stats) => {
        const preferredSkin = normalizeRoutineSkin(
            stats?.routine_skin_type_label || stats?.overall_health_skin_type_label
        );
        if (!preferredSkin || preferredSkin === routineActiveSkin) {
            return;
        }
        routineActiveSkin = preferredSkin;
        renderRoutinePage();
    };

    const initRoutinePage = () => {
        if (!routinePage || !routineStepGrid) {
            return;
        }

        routineCompletionState = loadRoutineCompletionState();
        const defaultRoutineSkin = normalizeRoutineSkin(routinePage.dataset.defaultRoutineSkin);
        if (defaultRoutineSkin) {
            routineActiveSkin = defaultRoutineSkin;
        }

        routineSkinButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const nextSkin = normalizeRoutineSkin(button.dataset.routineSkinBtn);
                if (!nextSkin || nextSkin === routineActiveSkin) {
                    return;
                }
                routineActiveSkin = nextSkin;
                routineActivePeriod = "morning";
                renderRoutinePage();
            });
        });

        routinePeriodButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const nextPeriod = button.dataset.routinePeriodBtn === "evening" ? "evening" : "morning";
                if (nextPeriod === routineActivePeriod) {
                    return;
                }
                routineActivePeriod = nextPeriod;
                renderRoutinePage();
            });
        });

        renderRoutinePage();
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

    const dashboardModule = initDashboardModule({
        elements: {
            dashboardHomeView,
            dashboardRoutineView,
            dashboardHistoryView,
            dashboardSettingsView,
            sidebarDashboardLink,
            sidebarNewScanLink,
            sidebarRoutineLink,
            sidebarScheduleLink,
            sidebarHistoryLink,
            sidebarSettingsLink,
            statTotalScans,
            statScansThisMonth,
            statAvgScore,
            statAvgScoreChange,
            statTotalDays,
            statActiveDaysSubtext,
            overallHealthSkinTypeLabel,
            overallHealthScoreRing,
            overallHealthScoreLabel,
            drySignal,
            normalSignal,
            oilySignal,
            metricLatestConfidence,
            metricLatestInference,
            metricLatestModelVersion,
            metricTrendDelta,
            metricTrendMeta,
            metricsTrendArea,
            metricsTrendLine,
            metricsTrendPoints,
            metricDistDryBar,
            metricDistNormalBar,
            metricDistOilyBar,
            metricDistDryValue,
            metricDistNormalValue,
            metricDistOilyValue,
        },
        syncRoutineSkinFromStats,
        formatScore,
        formatPercent,
        clampScore,
    });
    const { setDashboardView, resolveDashboardViewFromHash, refreshTrendMetrics, updateDashboardStats } =
        dashboardModule;

    const historyModule = initHistoryModule({
        elements: {
            historyList,
            historyToggleBtn,
            historyFallbackImage,
            csrfTokenInput,
        },
        helpers: {
            showError,
            confirmDelete,
            capitalize,
            formatScore,
            parseNumeric,
            resolveHistoryStatus,
            resolveScoreTrend,
        },
        onAfterHistoryChange: () => {
            refreshTrendMetrics().catch(() => {
                return;
            });
        },
    });
    const {
        bindHistoryToggle,
        bindHistoryDelete,
        refreshHistoryTrends,
        ensureHistoryEmptyState,
        refreshHistoryCollapseState,
        appendHistoryItem,
    } = historyModule;

    const { renderAnalysis } = initAnalysisModule({
        analysisResult,
        analysisCard,
        showError,
        capitalize,
    });

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

    const cameraModule = initCameraModule({
        elements: {
            cameraModal,
            cameraVideo,
            cameraStatus,
            cameraCloseBtn,
            cameraCancelBtn,
            cameraRotateBtn,
            cameraTakeBtn,
        },
        hooks: {
            syncBodyModalState,
            showError,
            clearError,
            showPreview,
            imageInput,
            cameraInput,
        },
    });

    if (hideAnalyzeUntilFile) {
        analyzeBtn.style.display = "none";
    }

    initRoutinePage();
    setDashboardView(resolveDashboardViewFromHash());
    window.addEventListener("hashchange", () => {
        setDashboardView(resolveDashboardViewFromHash());
    });
    dashboardViewLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const requestedView = String(link.dataset.dashboardView || "").toLowerCase();
            const view =
                requestedView === "routine" || requestedView === "history" || requestedView === "settings"
                    ? requestedView
                    : "home";
            const activeLink = link.classList.contains("sidebar-link") ? link : null;
            setDashboardView(view, { activeLink });
        });
    });

    bindHistoryToggle();
    bindHistoryDelete();
    refreshHistoryTrends();
    ensureHistoryEmptyState();
    refreshHistoryCollapseState();
    refreshTrendMetrics().catch(() => {
        return;
    });
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

    cameraModule.bindCameraEvents({ cameraCaptureBtn });

    uploadArea.addEventListener("click", (event) => {
        if (event.target instanceof HTMLElement && event.target.closest("button")) {
            return;
        }
        imageInput.click();
    });

    if (removeBtn) {
        removeBtn.addEventListener("click", resetPreview);
    }

    if (retakeBtn && removeBtn) {
        retakeBtn.addEventListener("click", () => {
            removeBtn.click();
        });
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
            refreshTrendMetrics().catch(() => {
                return;
            });
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
