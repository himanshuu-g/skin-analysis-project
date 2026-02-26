export const initCameraModule = ({ elements, hooks }) => {
    const {
        cameraModal,
        cameraVideo,
        cameraStatus,
        cameraCloseBtn,
        cameraCancelBtn,
        cameraRotateBtn,
        cameraTakeBtn,
    } = elements;
    const { syncBodyModalState, showError, clearError, showPreview, imageInput, cameraInput } = hooks;

    let cameraStream = null;
    let cameraIsOpening = false;
    let cameraFacingMode = "environment";

    const setCameraStatus = (message, isError = false) => {
        if (!cameraStatus) {
            return;
        }
        const text = String(message || "").trim();
        cameraStatus.textContent = text;
        cameraStatus.hidden = !text;
        cameraStatus.classList.toggle("is-error", Boolean(text) && isError);
    };

    const setCameraRotateVisible = (isVisible) => {
        if (!cameraRotateBtn) {
            return;
        }
        cameraRotateBtn.hidden = !isVisible;
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
        setCameraRotateVisible(false);
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
                        ideal: cameraFacingMode,
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
            setCameraRotateVisible(true);
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

    const rotateInlineCamera = async () => {
        if (!cameraModal || cameraModal.hidden || cameraIsOpening) {
            return;
        }

        const previousFacingMode = cameraFacingMode;
        const nextFacingMode = previousFacingMode === "environment" ? "user" : "environment";
        cameraFacingMode = nextFacingMode;

        setCameraStatus("Switching camera...");
        const opened = await openInlineCamera();
        if (opened) {
            return;
        }

        cameraFacingMode = previousFacingMode;
        const restored = await openInlineCamera();
        if (!restored) {
            closeCameraModal();
            showError("Could not switch camera. Please try again.");
            return;
        }
        showError("Could not switch camera. Your current camera will continue.");
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

    const bindCameraEvents = ({ cameraCaptureBtn }) => {
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
        if (cameraRotateBtn) {
            cameraRotateBtn.addEventListener("click", () => {
                rotateInlineCamera().catch(() => {
                    showError("Could not rotate camera. Please try again.");
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
    };

    return {
        bindCameraEvents,
        stopCameraStream,
    };
};
