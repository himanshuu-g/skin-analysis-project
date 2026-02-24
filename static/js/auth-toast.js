(() => {
    const toast = document.getElementById("authStatusToast");
    if (!toast) return;

    const closeButton = document.getElementById("authStatusToastClose");
    let isClosed = false;
    let hideTimer = null;

    const closeToast = () => {
        if (isClosed) return;
        isClosed = true;
        toast.classList.remove("is-visible");
        window.setTimeout(() => {
            toast.remove();
        }, 220);
    };

    if (closeButton) {
        closeButton.addEventListener("click", () => {
            if (hideTimer !== null) {
                window.clearTimeout(hideTimer);
                hideTimer = null;
            }
            closeToast();
        });
    }

    window.requestAnimationFrame(() => {
        toast.classList.add("is-visible");
    });

    hideTimer = window.setTimeout(() => {
        closeToast();
    }, 3200);
})();
