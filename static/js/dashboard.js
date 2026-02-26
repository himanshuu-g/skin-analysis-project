export const initDashboardModule = ({
    elements,
    syncRoutineSkinFromStats,
    formatScore,
    formatPercent,
    clampScore,
}) => {
    const {
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
    } = elements;

    const renderTrendChart = (scores) => {
        if (!metricsTrendArea || !metricsTrendLine || !metricsTrendPoints) {
            return;
        }

        const chartWidth = 260;
        const chartHeight = 90;
        const padding = 8;
        const baselineY = chartHeight - padding;

        if (!Array.isArray(scores) || scores.length === 0) {
            metricsTrendArea.setAttribute("d", "");
            metricsTrendLine.setAttribute("d", "");
            metricsTrendPoints.innerHTML = "";
            if (metricTrendMeta) {
                metricTrendMeta.textContent = "No scan trend data yet.";
            }
            if (metricTrendDelta) {
                metricTrendDelta.textContent = "Baseline";
                metricTrendDelta.classList.remove("is-up", "is-down");
                metricTrendDelta.classList.add("is-neutral");
            }
            return;
        }

        const normalizedScores = scores.map((value) => clampScore(value));
        const denominator = Math.max(normalizedScores.length - 1, 1);
        const points = normalizedScores.map((value, index) => {
            const x = padding + (index / denominator) * (chartWidth - padding * 2);
            const y = baselineY - (value / 100) * (chartHeight - padding * 2);
            return { x, y, value };
        });

        const linePath = points
            .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
            .join(" ");
        const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L${points[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;

        metricsTrendLine.setAttribute("d", linePath);
        metricsTrendArea.setAttribute("d", areaPath);
        metricsTrendPoints.innerHTML = points
            .map(
                (point) =>
                    `<circle class="metrics-trend-point" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="2.4"></circle>`
            )
            .join("");

        const latestScore = points[points.length - 1]?.value;
        const previousScore = points[points.length - 2]?.value;
        if (metricTrendDelta) {
            metricTrendDelta.classList.remove("is-up", "is-down", "is-neutral");
            if (!Number.isFinite(latestScore) || !Number.isFinite(previousScore)) {
                metricTrendDelta.textContent = "Baseline";
                metricTrendDelta.classList.add("is-neutral");
            } else {
                const delta = Math.round((latestScore - previousScore) * 10) / 10;
                if (Math.abs(delta) < 0.1) {
                    metricTrendDelta.textContent = "No change";
                    metricTrendDelta.classList.add("is-neutral");
                } else if (delta > 0) {
                    metricTrendDelta.textContent = `+${formatScore(delta)}`;
                    metricTrendDelta.classList.add("is-up");
                } else {
                    metricTrendDelta.textContent = formatScore(delta);
                    metricTrendDelta.classList.add("is-down");
                }
            }
        }

        if (metricTrendMeta) {
            metricTrendMeta.textContent = `Latest confidence ${formatScore(latestScore)}%`;
        }
    };

    const renderSkinDistribution = (results) => {
        const fillTargets = [
            { key: "dry", bar: metricDistDryBar, value: metricDistDryValue },
            { key: "normal", bar: metricDistNormalBar, value: metricDistNormalValue },
            { key: "oily", bar: metricDistOilyBar, value: metricDistOilyValue },
        ];

        const safeResults = Array.isArray(results) ? results : [];
        const totals = { dry: 0, normal: 0, oily: 0 };
        safeResults.forEach((item) => {
            const skin = String(item?.skin_type || "").trim().toLowerCase();
            if (skin in totals) {
                totals[skin] += 1;
            }
        });

        const totalCount = safeResults.length;
        fillTargets.forEach(({ key, bar, value }) => {
            const percent = totalCount > 0 ? (totals[key] / totalCount) * 100 : 0;
            if (bar) {
                bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
            }
            if (value) {
                value.textContent = `${formatScore(percent)}%`;
            }
        });
    };

    const refreshTrendMetrics = async () => {
        if (
            !metricsTrendArea &&
            !metricsTrendLine &&
            !metricsTrendPoints &&
            !metricDistDryBar &&
            !metricDistNormalBar &&
            !metricDistOilyBar
        ) {
            return;
        }

        try {
            const response = await fetch("/api/results?limit=30", {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                },
            });
            if (!response.ok) {
                throw new Error("Unable to load trend metrics.");
            }

            const payload = await response.json();
            const results = Array.isArray(payload?.results) ? payload.results : [];

            const latestTwelveScores = results
                .slice(0, 12)
                .map((item) => clampScore(item?.confidence))
                .reverse();

            renderTrendChart(latestTwelveScores);
            renderSkinDistribution(results.slice(0, 30));
        } catch (_err) {
            renderTrendChart([]);
            renderSkinDistribution([]);
            if (metricTrendMeta) {
                metricTrendMeta.textContent = "Unable to load trend data.";
            }
        }
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
        if (metricLatestConfidence) {
            metricLatestConfidence.textContent = String(stats.latest_confidence_display || "0%");
        }
        if (metricLatestInference) {
            metricLatestInference.textContent = String(stats.latest_inference_display || "n/a");
        }
        if (metricLatestModelVersion) {
            metricLatestModelVersion.textContent = String(stats.latest_model_version || "n/a");
        }

        syncRoutineSkinFromStats(stats);
    };

    const sidebarPrimaryLinks = [
        sidebarDashboardLink,
        sidebarNewScanLink,
        sidebarRoutineLink,
        sidebarScheduleLink,
        sidebarHistoryLink,
        sidebarSettingsLink,
    ].filter(Boolean);

    const setActiveSidebarLink = (activeLink) => {
        const safeActiveLink = sidebarPrimaryLinks.includes(activeLink) ? activeLink : null;
        sidebarPrimaryLinks.forEach((link) => {
            link.classList.toggle("is-active", link === safeActiveLink);
        });
    };

    const resolveActiveSidebarLinkFromHash = () => {
        const hash = window.location.hash.toLowerCase();
        if (hash === "#uploadform") {
            return sidebarNewScanLink || sidebarDashboardLink;
        }
        if (hash === "#dashboard-routine" || hash === "#dashboard-routine-view") {
            return sidebarRoutineLink || sidebarDashboardLink;
        }
        if (hash === "#dashboard-schedule") {
            return sidebarScheduleLink || sidebarDashboardLink;
        }
        if (hash === "#dashboard-settings") {
            return sidebarSettingsLink || sidebarDashboardLink;
        }
        if (hash === "#dashboard-history-view" || hash.startsWith("#dashboard-history")) {
            return sidebarHistoryLink || sidebarDashboardLink;
        }
        return sidebarDashboardLink || null;
    };

    const setDashboardView = (view, options = {}) => {
        if (!dashboardHomeView || !dashboardRoutineView || !dashboardHistoryView || !dashboardSettingsView) {
            return;
        }

        const activeLinkFromOptions =
            options && options.activeLink && sidebarPrimaryLinks.includes(options.activeLink)
                ? options.activeLink
                : null;

        const normalizedView =
            view === "routine" || view === "history" || view === "settings" ? view : "home";
        const viewMap = {
            home: dashboardHomeView,
            routine: dashboardRoutineView,
            history: dashboardHistoryView,
            settings: dashboardSettingsView,
        };

        Object.entries(viewMap).forEach(([key, node]) => {
            const isActive = normalizedView === key;
            node.hidden = !isActive;
            node.classList.toggle("is-active", isActive);
        });

        setActiveSidebarLink(activeLinkFromOptions || resolveActiveSidebarLinkFromHash());

        if (normalizedView === "history") {
            const historyAnchor = document.getElementById("dashboard-history-view");
            if (historyAnchor) {
                historyAnchor.scrollIntoView({ block: "start" });
            }
        }
    };

    const resolveDashboardViewFromHash = () => {
        const hash = window.location.hash.toLowerCase();
        if (hash === "#dashboard-routine" || hash === "#dashboard-routine-view") {
            return "routine";
        }
        if (hash === "#dashboard-settings") {
            return "settings";
        }
        if (hash === "#dashboard-history-view" || hash.startsWith("#dashboard-history")) {
            return "history";
        }
        return "home";
    };

    return {
        refreshTrendMetrics,
        updateDashboardStats,
        setDashboardView,
        resolveDashboardViewFromHash,
    };
};
