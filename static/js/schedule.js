const FILTER_KEY = "skinanalysis_schedule_filter_v1";
const SELECTED_KEY = "skinanalysis_schedule_selected_v1";
const DEFAULT_REMINDER_MINUTES = 30;
const EVENT_DURATION_MINUTES = 30;
const CALENDAR_PROD_ID = "-//SkinAnalysis AI//Schedule Reminder//EN";
const FILTER_TYPES = new Set(["all", "scan", "appointment", "reminder"]);

const EVENT_TYPE_META = {
    scan: {
        label: "scan",
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="5" width="15" height="15" rx="2"></rect><path d="M8 3.5v3"></path><path d="M16 3.5v3"></path><path d="M4.5 10h15"></path></svg>',
    },
    appointment: {
        label: "appointment",
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v4l2.8 2"></path></svg>',
    },
    reminder: {
        label: "reminder",
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 16.8h11.6"></path><path d="M8.2 16.8V10a3.8 3.8 0 1 1 7.6 0v6.8"></path><path d="M10.2 16.8a1.8 1.8 0 0 0 3.6 0"></path></svg>',
    },
    refill: {
        label: "refill",
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c2.8 4.6 5 7 5 10.1a5 5 0 1 1-10 0c0-3.1 2.2-5.5 5-10.1z"></path></svg>',
    },
};

const PRIORITY_META = {
    low: { label: "Low", className: "is-low" },
    medium: { label: "Medium", className: "is-medium" },
    high: { label: "High", className: "is-high" },
};

const safeLocalStorage = {
    get(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (_error) {
            return null;
        }
    },
    set(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (_error) {
            return;
        }
    },
};

const clampNumber = (value, min, max, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(numeric)));
};

const pad = (value) => String(value).padStart(2, "0");

const formatDateInput = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatTimeInput = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const formatDateLabel = (date) =>
    date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
    });

const formatTimeLabel = (date) =>
    date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

const slugify = (value) =>
    String(value || "reminder")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64) || "reminder";

const toIcsUtc = (date) =>
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
        date.getUTCHours()
    )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

const escapeIcsValue = (value) =>
    String(value || "")
        .replaceAll("\\", "\\\\")
        .replaceAll(";", "\\;")
        .replaceAll(",", "\\,")
        .replaceAll(/\r?\n/g, "\\n");

const buildIcsEventSection = (event) => {
    const start = new Date(event.datetime);
    const end = new Date(start.getTime() + EVENT_DURATION_MINUTES * 60 * 1000);
    const reminderMinutes = clampNumber(event.reminderMinutes, 0, 1440, DEFAULT_REMINDER_MINUTES);
    const description = event.description || `Skincare ${event.type} event`;
    const alarmText = `Reminder: ${event.title}`;

    return [
        "BEGIN:VEVENT",
        `UID:${escapeIcsValue(event.id)}@skinanalysis-ai.local`,
        `DTSTAMP:${toIcsUtc(new Date())}`,
        `DTSTART:${toIcsUtc(start)}`,
        `DTEND:${toIcsUtc(end)}`,
        `SUMMARY:${escapeIcsValue(event.title)}`,
        `DESCRIPTION:${escapeIcsValue(description)}`,
        "STATUS:CONFIRMED",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcsValue(alarmText)}`,
        `TRIGGER:-PT${Math.max(reminderMinutes, 0)}M`,
        "END:VALARM",
        "END:VEVENT",
    ];
};

const buildReminderIcs = (event) => {
    return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:${CALENDAR_PROD_ID}`,
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        ...buildIcsEventSection(event),
        "END:VCALENDAR",
        "",
    ].join("\r\n");
};

const buildCalendarIcs = (calendarEvents) => {
    const safeEvents = Array.isArray(calendarEvents) ? calendarEvents : [];
    const eventSections = safeEvents.flatMap((event) => buildIcsEventSection(event));
    return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:${CALENDAR_PROD_ID}`,
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        ...eventSections,
        "END:VCALENDAR",
        "",
    ].join("\r\n");
};

const normalizeApiEvent = (rawEvent, index = 0) => {
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + index + 1);
    fallbackDate.setHours(10, 0, 0, 0);

    const safeDate = new Date(String(rawEvent?.datetime || ""));
    const parsedDate = Number.isNaN(safeDate.getTime()) ? fallbackDate : safeDate;

    const rawType = String(rawEvent?.type || "").trim().toLowerCase();
    const rawPriority = String(rawEvent?.priority || "").trim().toLowerCase();

    return {
        id: String(rawEvent?.id || `evt-${Date.now()}-${index}`),
        title:
            typeof rawEvent?.title === "string" && rawEvent.title.trim()
                ? rawEvent.title.trim()
                : `Event ${index + 1}`,
        type: EVENT_TYPE_META[rawType] ? rawType : "scan",
        priority: PRIORITY_META[rawPriority] ? rawPriority : "medium",
        datetime: parsedDate.toISOString(),
        description: String(rawEvent?.description || "").trim(),
        reminderMinutes: clampNumber(rawEvent?.reminder_minutes, 0, 1440, DEFAULT_REMINDER_MINUTES),
        completed: Boolean(rawEvent?.completed),
    };
};

export const initScheduleModule = ({ elements, hooks = {} }) => {
    const {
        scheduleAddEventBtn,
        scheduleFilterButtons,
        scheduleCountScan,
        scheduleCountAppointment,
        scheduleCountReminder,
        scheduleCountRefill,
        scheduleFilterCountAll,
        scheduleFilterCountScan,
        scheduleFilterCountAppointment,
        scheduleFilterCountReminder,
        scheduleExportAllBtn,
        scheduleListTitle,
        scheduleEventList,
        scheduleDetailDate,
        scheduleDetailTypeIcon,
        scheduleDetailTypeLabel,
        scheduleDetailTime,
        scheduleDetailDescription,
        scheduleDetailPriority,
        scheduleDetailComplete,
        scheduleReminderBtn,
        scheduleEventModal,
        scheduleModalCloseBtn,
        scheduleModalCancelBtn,
        scheduleEventForm,
        scheduleInputTitle,
        scheduleInputType,
        scheduleInputPriority,
        scheduleInputDate,
        scheduleInputTime,
        scheduleInputReminder,
        scheduleInputDescription,
        scheduleFormError,
        csrfTokenInput,
    } = elements || {};

    const { showError } = hooks;

    if (
        !scheduleEventList ||
        !scheduleListTitle ||
        !scheduleDetailDate ||
        !scheduleDetailTypeIcon ||
        !scheduleDetailTypeLabel ||
        !scheduleDetailTime ||
        !scheduleDetailDescription ||
        !scheduleDetailPriority ||
        !scheduleDetailComplete ||
        !scheduleReminderBtn
    ) {
        return {
            refreshSchedule: () => {
                return;
            },
        };
    }

    let events = [];
    let activeFilter = FILTER_TYPES.has(safeLocalStorage.get(FILTER_KEY))
        ? safeLocalStorage.get(FILTER_KEY)
        : "all";
    let selectedEventId = safeLocalStorage.get(SELECTED_KEY) || "";

    const showRuntimeError = (message) => {
        const safeMessage = String(message || "Unable to complete schedule action.").trim();
        if (typeof showError === "function") {
            showError(safeMessage);
            return;
        }
        window.alert(safeMessage);
    };

    const resolveCsrfToken = async () => {
        const inlineToken = csrfTokenInput?.value?.trim();
        if (inlineToken) {
            return inlineToken;
        }

        const response = await fetch("/api/csrf-token", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
            },
        });
        if (!response.ok) {
            throw new Error("Unable to refresh CSRF token.");
        }

        const payload = await response.json();
        const token = String(payload?.csrf_token || "").trim();
        if (csrfTokenInput && token) {
            csrfTokenInput.value = token;
        }
        if (!token) {
            throw new Error("Missing CSRF token.");
        }
        return token;
    };

    const requestJson = async (url, options = {}) => {
        const { method = "GET", body = null, requireCsrf = false } = options;
        const headers = {
            Accept: "application/json",
        };

        if (body !== null) {
            headers["Content-Type"] = "application/json";
        }

        if (requireCsrf) {
            const token = await resolveCsrfToken();
            headers["X-CSRF-Token"] = token;
        }

        const response = await fetch(url, {
            method,
            credentials: "same-origin",
            headers,
            body: body === null ? null : JSON.stringify(body),
        });

        let payload = {};
        try {
            payload = await response.json();
        } catch (_error) {
            payload = {};
        }

        if (!response.ok) {
            const message = String(payload?.error || "Schedule request failed.").trim();
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return payload;
    };

    const saveFilter = (filter) => {
        safeLocalStorage.set(FILTER_KEY, filter);
    };

    const saveSelected = (eventId) => {
        safeLocalStorage.set(SELECTED_KEY, eventId || "");
    };

    const isUpcoming = (event) => {
        const date = new Date(event.datetime);
        if (Number.isNaN(date.getTime())) {
            return false;
        }
        return date.getTime() >= Date.now() - 60 * 1000;
    };

    const sortEvents = (left, right) => {
        if (left.completed !== right.completed) {
            return left.completed ? 1 : -1;
        }
        return new Date(left.datetime).getTime() - new Date(right.datetime).getTime();
    };

    const getVisibleEvents = () => {
        const filtered = events.filter((event) => {
            if (!(isUpcoming(event) || event.completed)) {
                return false;
            }
            if (activeFilter === "all") {
                return true;
            }
            return event.type === activeFilter;
        });
        return filtered.sort(sortEvents);
    };

    const getEventById = (eventId) => events.find((event) => event.id === eventId) || null;

    const ensureSelectedEvent = (visibleEvents) => {
        if (selectedEventId && visibleEvents.some((event) => event.id === selectedEventId)) {
            return;
        }
        selectedEventId = visibleEvents[0]?.id || "";
        saveSelected(selectedEventId);
    };

    const setFormError = (message) => {
        if (!scheduleFormError) {
            return;
        }
        const safeMessage = String(message || "").trim();
        if (!safeMessage) {
            scheduleFormError.textContent = "";
            scheduleFormError.hidden = true;
            return;
        }
        scheduleFormError.textContent = safeMessage;
        scheduleFormError.hidden = false;
    };

    const renderSummaryCards = () => {
        const counts = { scan: 0, appointment: 0, reminder: 0, refill: 0 };
        events.forEach((event) => {
            if (!event.completed && isUpcoming(event) && counts[event.type] !== undefined) {
                counts[event.type] += 1;
            }
        });

        if (scheduleCountScan) scheduleCountScan.textContent = String(counts.scan);
        if (scheduleCountAppointment) scheduleCountAppointment.textContent = String(counts.appointment);
        if (scheduleCountReminder) scheduleCountReminder.textContent = String(counts.reminder);
        if (scheduleCountRefill) scheduleCountRefill.textContent = String(counts.refill);

        if (scheduleFilterCountAll) {
            scheduleFilterCountAll.textContent = String(
                counts.scan + counts.appointment + counts.reminder + counts.refill
            );
        }
        if (scheduleFilterCountScan) scheduleFilterCountScan.textContent = String(counts.scan);
        if (scheduleFilterCountAppointment) scheduleFilterCountAppointment.textContent = String(counts.appointment);
        if (scheduleFilterCountReminder) scheduleFilterCountReminder.textContent = String(counts.reminder);
    };

    const renderFilterButtons = () => {
        (Array.isArray(scheduleFilterButtons) ? scheduleFilterButtons : []).forEach((button) => {
            const isActive = button.dataset.scheduleFilter === activeFilter;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
        });
    };

    const createBadge = (text, className) => {
        const badge = document.createElement("span");
        badge.className = className;
        badge.textContent = text;
        return badge;
    };

    const createDeleteIcon = () =>
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 7.2h10.8"></path><path d="M9.2 7.2v-1.4h5.6v1.4"></path><path d="M8.3 7.2l.7 10h6l.7-10"></path><path d="M10.7 9.6v5.6"></path><path d="M13.3 9.6v5.6"></path></svg>';

    const renderEventList = (visibleEvents) => {
        scheduleEventList.innerHTML = "";

        const upcomingCount = visibleEvents.filter((event) => !event.completed).length;
        scheduleListTitle.textContent = `Upcoming Events (${upcomingCount})`;

        if (visibleEvents.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "schedule-empty";
            emptyState.textContent = "No events for this filter. Add a new schedule item.";
            scheduleEventList.append(emptyState);
            return;
        }

        visibleEvents.forEach((event) => {
            const eventDate = new Date(event.datetime);
            const priorityMeta = PRIORITY_META[event.priority] || PRIORITY_META.medium;
            const typeMeta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.scan;

            const row = document.createElement("article");
            row.className = "schedule-event-item";
            if (event.completed) {
                row.classList.add("is-complete");
            }
            if (event.id === selectedEventId) {
                row.classList.add("is-selected");
            }
            row.dataset.eventId = event.id;

            const checkWrap = document.createElement("label");
            checkWrap.className = "schedule-event-check";
            const checkInput = document.createElement("input");
            checkInput.type = "checkbox";
            checkInput.className = "schedule-event-checkbox";
            checkInput.checked = Boolean(event.completed);
            checkInput.setAttribute("aria-label", "Mark event as completed");
            checkWrap.append(checkInput);

            const icon = document.createElement("span");
            icon.className = `schedule-event-icon is-${event.type}`;
            icon.setAttribute("aria-hidden", "true");
            icon.innerHTML = typeMeta.icon;

            const content = document.createElement("div");
            content.className = "schedule-event-content";

            const topRow = document.createElement("div");
            topRow.className = "schedule-event-top";
            const title = document.createElement("h5");
            title.textContent = event.title;

            const badges = document.createElement("div");
            badges.className = "schedule-event-badges";
            badges.append(
                createBadge(typeMeta.label, "schedule-type-badge"),
                createBadge(priorityMeta.label, `schedule-priority-badge ${priorityMeta.className}`)
            );
            topRow.append(title, badges);

            const datetime = document.createElement("p");
            datetime.className = "schedule-event-datetime";
            datetime.textContent = `${formatDateLabel(eventDate)} at ${formatTimeLabel(eventDate)}`;
            content.append(topRow, datetime);

            const actions = document.createElement("div");
            actions.className = "schedule-event-actions";
            const reminderBtn = document.createElement("button");
            reminderBtn.type = "button";
            reminderBtn.className = "schedule-inline-action";
            reminderBtn.dataset.scheduleAction = "save-reminder";
            reminderBtn.textContent = "Reminder";

            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "schedule-delete-btn";
            deleteBtn.dataset.scheduleAction = "delete";
            deleteBtn.setAttribute("aria-label", "Delete event");
            deleteBtn.innerHTML = createDeleteIcon();

            actions.append(reminderBtn, deleteBtn);
            row.append(checkWrap, icon, content, actions);
            scheduleEventList.append(row);
        });
    };

    const setPriorityBadge = (priority) => {
        const priorityMeta = PRIORITY_META[priority] || PRIORITY_META.medium;
        scheduleDetailPriority.classList.remove("is-low", "is-medium", "is-high");
        scheduleDetailPriority.classList.add(priorityMeta.className);
        scheduleDetailPriority.textContent = priorityMeta.label;
    };

    const renderEventDetails = () => {
        const selected = getEventById(selectedEventId);
        if (!selected) {
            scheduleDetailDate.textContent = "Select an event to view details.";
            scheduleDetailTypeIcon.innerHTML = EVENT_TYPE_META.scan.icon;
            scheduleDetailTypeLabel.textContent = "-";
            scheduleDetailTime.textContent = "-";
            scheduleDetailDescription.textContent = "-";
            setPriorityBadge("medium");
            scheduleDetailComplete.checked = false;
            scheduleDetailComplete.disabled = true;
            scheduleReminderBtn.disabled = true;
            scheduleReminderBtn.textContent = "Save Reminder to Phone";
            return;
        }

        const eventDate = new Date(selected.datetime);
        const typeMeta = EVENT_TYPE_META[selected.type] || EVENT_TYPE_META.scan;
        scheduleDetailDate.textContent = formatDateLabel(eventDate);
        scheduleDetailTypeIcon.innerHTML = typeMeta.icon;
        scheduleDetailTypeLabel.textContent = typeMeta.label;
        scheduleDetailTime.textContent = `${formatTimeLabel(eventDate)} on ${formatDateLabel(eventDate)}`;
        scheduleDetailDescription.textContent = selected.description || "No description provided.";
        setPriorityBadge(selected.priority);
        scheduleDetailComplete.checked = Boolean(selected.completed);
        scheduleDetailComplete.disabled = false;
        scheduleReminderBtn.disabled = false;
        scheduleReminderBtn.textContent = `Save "${selected.title}" Reminder`;
    };

    const render = () => {
        renderSummaryCards();
        renderFilterButtons();
        const visibleEvents = getVisibleEvents();
        ensureSelectedEvent(visibleEvents);
        renderEventList(visibleEvents);
        renderEventDetails();
    };

    const renderLoadingState = () => {
        scheduleEventList.innerHTML = '<div class="schedule-empty">Loading schedule...</div>';
    };

    const replaceOrInsertEvent = (updatedEvent) => {
        const safeEvent = normalizeApiEvent(updatedEvent);
        const itemIndex = events.findIndex((event) => event.id === safeEvent.id);
        if (itemIndex >= 0) {
            events[itemIndex] = safeEvent;
        } else {
            events.push(safeEvent);
        }
        selectedEventId = safeEvent.id;
        saveSelected(selectedEventId);
    };

    const refreshEventsFromApi = async () => {
        const payload = await requestJson("/api/schedule/events", {
            method: "GET",
        });
        const apiEvents = Array.isArray(payload?.events) ? payload.events : [];
        events = apiEvents.map(normalizeApiEvent);
        render();
    };

    const openModal = () => {
        if (!scheduleEventModal || !scheduleEventForm) {
            return;
        }

        const selected = getEventById(selectedEventId);
        const defaultDate = selected ? new Date(selected.datetime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        if (scheduleInputDate) scheduleInputDate.value = formatDateInput(defaultDate);
        if (scheduleInputTime) scheduleInputTime.value = formatTimeInput(defaultDate);
        if (scheduleInputType) scheduleInputType.value = selected?.type || "scan";
        if (scheduleInputPriority) scheduleInputPriority.value = selected?.priority || "medium";
        if (scheduleInputReminder) {
            scheduleInputReminder.value = String(
                clampNumber(selected?.reminderMinutes, 0, 1440, DEFAULT_REMINDER_MINUTES)
            );
        }
        if (scheduleInputTitle) scheduleInputTitle.value = "";
        if (scheduleInputDescription) scheduleInputDescription.value = "";
        setFormError("");

        scheduleEventModal.hidden = false;
        scheduleEventModal.classList.add("is-open");
        scheduleInputTitle?.focus();
    };

    const closeModal = () => {
        if (!scheduleEventModal) {
            return;
        }
        scheduleEventModal.classList.remove("is-open");
        scheduleEventModal.hidden = true;
        setFormError("");
    };

    const saveReminderFile = (event) => {
        const ics = buildReminderIcs(event);
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${slugify(event.title)}-reminder.ics`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 250);
    };

    const saveCalendarFile = (calendarEvents) => {
        const ics = buildCalendarIcs(calendarEvents);
        const today = new Date();
        const dateStamp = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `skinanalysis-schedule-${dateStamp}.ics`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 250);
    };

    const updateCompletedState = async (eventId, completed) => {
        const payload = await requestJson(`/api/schedule/events/${encodeURIComponent(eventId)}`, {
            method: "PATCH",
            requireCsrf: true,
            body: { completed },
        });
        replaceOrInsertEvent(payload.event || {});
        render();
    };

    const deleteEvent = async (eventId) => {
        if (!eventId) {
            return;
        }
        const event = getEventById(eventId);
        if (!event) {
            return;
        }
        const confirmed = window.confirm(`Delete "${event.title}" from your schedule?`);
        if (!confirmed) {
            return;
        }

        await requestJson(`/api/schedule/events/${encodeURIComponent(eventId)}`, {
            method: "DELETE",
            requireCsrf: true,
        });

        events = events.filter((item) => item.id !== eventId);
        if (selectedEventId === eventId) {
            selectedEventId = "";
            saveSelected(selectedEventId);
        }
        render();
    };

    scheduleEventList.addEventListener("click", async (event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) {
            return;
        }

        const actionButton = target.closest("[data-schedule-action]");
        const row = target.closest(".schedule-event-item");
        const eventId = row?.dataset.eventId || "";
        if (!eventId) {
            return;
        }

        if (actionButton) {
            const action = actionButton.dataset.scheduleAction;
            const selected = getEventById(eventId);
            if (!selected) {
                return;
            }
            if (action === "delete") {
                try {
                    await deleteEvent(eventId);
                } catch (error) {
                    showRuntimeError(error.message || "Unable to delete event.");
                }
                return;
            }
            if (action === "save-reminder") {
                saveReminderFile(selected);
                selectedEventId = eventId;
                saveSelected(selectedEventId);
                render();
            }
            return;
        }

        if (target.closest(".schedule-event-check")) {
            return;
        }

        selectedEventId = eventId;
        saveSelected(selectedEventId);
        render();
    });

    scheduleEventList.addEventListener("change", async (event) => {
        const target = event.target instanceof HTMLInputElement ? event.target : null;
        if (!target || !target.classList.contains("schedule-event-checkbox")) {
            return;
        }
        const row = target.closest(".schedule-event-item");
        const eventId = row?.dataset.eventId || "";
        if (!eventId) {
            return;
        }

        target.disabled = true;
        try {
            await updateCompletedState(eventId, target.checked);
        } catch (error) {
            target.checked = !target.checked;
            showRuntimeError(error.message || "Unable to update event.");
        } finally {
            target.disabled = false;
        }
    });

    scheduleDetailComplete.addEventListener("change", async () => {
        const selected = getEventById(selectedEventId);
        if (!selected) {
            return;
        }

        scheduleDetailComplete.disabled = true;
        try {
            await updateCompletedState(selectedEventId, scheduleDetailComplete.checked);
        } catch (error) {
            scheduleDetailComplete.checked = !scheduleDetailComplete.checked;
            showRuntimeError(error.message || "Unable to update event.");
        } finally {
            scheduleDetailComplete.disabled = false;
        }
    });

    scheduleReminderBtn.addEventListener("click", () => {
        const selected = getEventById(selectedEventId);
        if (!selected) {
            return;
        }
        saveReminderFile(selected);
    });

    (Array.isArray(scheduleFilterButtons) ? scheduleFilterButtons : []).forEach((button) => {
        button.addEventListener("click", () => {
            const filter = String(button.dataset.scheduleFilter || "").toLowerCase();
            if (!FILTER_TYPES.has(filter)) {
                return;
            }
            activeFilter = filter;
            saveFilter(activeFilter);
            render();
        });
    });

    scheduleExportAllBtn?.addEventListener("click", () => {
        const exportEvents = events
            .filter((event) => !event.completed && isUpcoming(event))
            .sort(sortEvents);
        if (!exportEvents.length) {
            showRuntimeError("No upcoming events available to export.");
            return;
        }
        saveCalendarFile(exportEvents);
    });

    scheduleAddEventBtn?.addEventListener("click", openModal);
    scheduleModalCloseBtn?.addEventListener("click", closeModal);
    scheduleModalCancelBtn?.addEventListener("click", closeModal);
    scheduleEventModal?.addEventListener("click", (event) => {
        if (event.target === scheduleEventModal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && scheduleEventModal?.classList.contains("is-open")) {
            closeModal();
        }
    });

    scheduleEventForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        setFormError("");

        const title = String(scheduleInputTitle?.value || "").trim();
        const type = String(scheduleInputType?.value || "").trim().toLowerCase();
        const priority = String(scheduleInputPriority?.value || "").trim().toLowerCase();
        const dateValue = String(scheduleInputDate?.value || "").trim();
        const timeValue = String(scheduleInputTime?.value || "").trim();
        const description = String(scheduleInputDescription?.value || "").trim();
        const reminderMinutes = clampNumber(
            scheduleInputReminder?.value,
            0,
            1440,
            DEFAULT_REMINDER_MINUTES
        );

        if (!title) {
            setFormError("Please enter an event title.");
            return;
        }
        if (!EVENT_TYPE_META[type]) {
            setFormError("Please choose a valid event type.");
            return;
        }
        if (!PRIORITY_META[priority]) {
            setFormError("Please choose a valid priority.");
            return;
        }
        if (!dateValue || !timeValue) {
            setFormError("Please choose both date and time.");
            return;
        }

        const scheduledDate = new Date(`${dateValue}T${timeValue}`);
        if (Number.isNaN(scheduledDate.getTime())) {
            setFormError("Please provide a valid date and time.");
            return;
        }

        const submitButton = scheduleEventForm.querySelector('button[type="submit"]');
        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = true;
        }

        try {
            const payload = await requestJson("/api/schedule/events", {
                method: "POST",
                requireCsrf: true,
                body: {
                    title,
                    type,
                    priority,
                    datetime: scheduledDate.toISOString(),
                    description,
                    reminder_minutes: reminderMinutes,
                    completed: false,
                },
            });

            replaceOrInsertEvent(payload.event || {});

            if (!FILTER_TYPES.has(type)) {
                activeFilter = "all";
            } else if (activeFilter !== "all" && activeFilter !== type) {
                activeFilter = type;
            }
            saveFilter(activeFilter);

            closeModal();
            render();
        } catch (error) {
            setFormError(error.message || "Unable to save event.");
        } finally {
            if (submitButton instanceof HTMLButtonElement) {
                submitButton.disabled = false;
            }
        }
    });

    renderLoadingState();
    refreshEventsFromApi().catch((error) => {
        events = [];
        render();
        showRuntimeError(error.message || "Unable to load schedule events.");
    });

    return {
        refreshSchedule: async () => {
            try {
                await refreshEventsFromApi();
            } catch (error) {
                showRuntimeError(error.message || "Unable to refresh schedule events.");
            }
        },
    };
};
