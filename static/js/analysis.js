export const initAnalysisModule = ({ analysisResult, analysisCard, showError, capitalize }) => {
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
        if (normalized === "dry") return "Low Sebum Production";
        if (normalized === "oily") return "Excess Sebum Production";
        if (normalized === "normal") return "Balanced Sebum Levels";
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
                percent = !hasProbabilityData ? (label === predictedSkin ? confidencePercent : fallbackOther) : 0;
            }
            return { label: capitalize(label), percent };
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
        if (!button) return;
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
        if (!analysisResult) return;
        const reportNode = analysisResult.querySelector("#prescriptionReport");
        if (!reportNode) return;
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
        if (!analysisResult) return;
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
            : "<li class=\"rx-note-item is-empty\">No additional DON'T guidance provided.</li>";
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
                    <div><span>Report ID</span><strong>${escapeHtml(buildReportId(safeAnalysis, issuedAt))}</strong></div>
                    <div><span>Date</span><strong>${escapeHtml(formatDateLabel(issuedAt))}</strong></div>
                    <div><span>Time</span><strong>${escapeHtml(formatTimeLabel(issuedAt))}</strong></div>
                    <div><span>Status</span><strong class="status-verified">Verified</strong></div>
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
                            <ul class="diagnosis-score-list">${probabilityRowsHtml}</ul>
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
                            <section class="rx-block"><h6>Morning Routine (AM)</h6><ol class="rx-list">${morningItemsHtml}</ol></section>
                            <section class="rx-block"><h6>Evening Routine (PM)</h6><ol class="rx-list">${eveningItemsHtml}</ol></section>
                        </div>
                    </div>
                </section>
                <section class="prescription-section">
                    <h4>Care Notes</h4>
                    <div class="rx-notes-grid">
                        <section class="rx-note-card"><h6>DO's</h6><ul>${dosItemsHtml}</ul></section>
                        <section class="rx-note-card"><h6>DON'Ts</h6><ul>${dontItemsHtml}</ul></section>
                    </div>
                </section>
                <section class="prescription-section">
                    <h4>Recommended Products</h4>
                    <div class="rx-products-grid">${renderProductCards(products)}</div>
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

    return { renderAnalysis };
};
