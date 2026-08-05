(() => {
  "use strict";

  const STORAGE_KEY = "greenhouse-visual-v4";
  const screenIcons = {
    dashboard: "layout-dashboard",
    planning: "clipboard-list",
    attendance: "user-check",
    tasks: "list-checks",
    productivity: "gauge",
    team: "users",
    crop: "map-pinned",
    tickets: "wrench",
    materials: "package-open",
    reports: "chart-no-axes-combined",
  };
  const roleIcons = {
    Brygadzista: "clipboard-check",
    Kierownik: "briefcase-business",
    "Ochrona roślin": "leaf",
    "Dział techniczny": "wrench",
    Kadry: "users-round",
  };
  const glyphIcons = {
    "⌂": "layout-dashboard",
    "▣": "clipboard-list",
    "✓": "circle-check",
    "↗": "list-checks",
    "≈": "gauge",
    "♙": "users",
    "◎": "map-pinned",
    "⌘": "wrench",
    "◇": "package-open",
    "▦": "chart-no-axes-combined",
    "★": "graduation-cap",
    "!": "triangle-alert",
    "◷": "timer",
    "●": "circle-dot",
  };

  let context;
  let bound = false;
  let preferences = loadPreferences();

  function loadPreferences() {
    try {
      return { greenhouseMode: false, mapSheetOpen: true, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch (_) {
      return { greenhouseMode: false, mapSheetOpen: true };
    }
  }

  function persistPreferences() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch (_) { /* Local preferences are optional. */ }
  }

  function asset(name) {
    const prefix = context?.app?.dataset.assetsPrefix || "./";
    return `${prefix}${name}`;
  }

  function icon(name, label = "") {
    const hidden = label ? "" : ' aria-hidden="true"';
    const title = label ? `<title>${label}</title>` : "";
    return `<svg class="v4-icon"${hidden} focusable="false"><use href="${asset("lucide-sprite.svg")}#${name}"></use>${title}</svg>`;
  }

  function setIcon(target, name, label = "") {
    if (!target || !name) return;
    target.innerHTML = icon(name, label);
    target.classList.add("v4-icon-host");
  }

  function applyMode() {
    document.body.classList.add("visual-system-v4");
    document.body.classList.toggle("v4-greenhouse-mode", preferences.greenhouseMode);
    document.body.classList.toggle("v4-login-view", !context.state.loggedIn);
    document.documentElement.style.colorScheme = "light";
  }

  function decorateNavigation() {
    context.app.querySelectorAll(".nav button[data-nav], .mobile-bottom-nav button[data-nav]").forEach((button) => {
      setIcon(button.querySelector(":scope > i"), screenIcons[button.dataset.nav] || "circle-dot");
    });
    setIcon(context.app.querySelector('.mobile-bottom-nav button[data-action="toggle-mobile-nav"] > i'), "menu");

    context.app.querySelectorAll(".ux-nav-group").forEach((group) => {
      if (!group.querySelector(".v4-section-line")) group.insertAdjacentHTML("beforeend", '<i class="v4-section-line" aria-hidden="true"></i>');
    });
  }

  function decorateTopbar() {
    const actions = context.app.querySelector(".top-actions");
    if (!actions) return;
    if (!actions.querySelector("[data-v4-action='greenhouse-mode']")) {
      const review = actions.querySelector(".review-toggle");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "v4-display-toggle";
      toggle.dataset.v4Action = "greenhouse-mode";
      toggle.title = "Większy kontrast i elementy dotykowe do pracy w szklarni";
      toggle.innerHTML = `${icon("sun-medium")}<span>Tryb szklarni</span>`;
      actions.insertBefore(toggle, review || null);
    }

    const current = actions.querySelector(".current-view-toggle");
    if (current) current.innerHTML = `${icon(context.state.currentOnly ? "clock-3" : "panels-top-left")}<span>${context.state.currentOnly ? "Aktualne" : "Wszystkie"}</span>`;

    const notifications = actions.querySelector(".notification-button");
    if (notifications) {
      const badge = notifications.querySelector("b")?.outerHTML || "";
      notifications.innerHTML = `${icon("bell")}<span>Powiadomienia</span>${badge}`;
    }

    const review = actions.querySelector(".review-toggle");
    if (review) review.innerHTML = `${icon("eye")}<span>Oceń makietę</span>`;

    const modeToggle = actions.querySelector("[data-v4-action='greenhouse-mode']");
    if (modeToggle) {
      modeToggle.classList.toggle("active", preferences.greenhouseMode);
      modeToggle.setAttribute("aria-pressed", String(preferences.greenhouseMode));
      modeToggle.innerHTML = `${icon(preferences.greenhouseMode ? "sun" : "sun-medium")}<span>${preferences.greenhouseMode ? "Tryb szklarni: włączony" : "Tryb szklarni"}</span>`;
    }

    setIcon(context.app.querySelector(".user > span:last-child"), "log-out", "Wyloguj");
  }

  function decorateLogin() {
    const card = context.app.querySelector(".login-card");
    if (!card) return;
    context.app.querySelectorAll(".role-card").forEach((button) => {
      const role = button.dataset.role;
      if (!button.querySelector(":scope > .v4-role-icon")) button.insertAdjacentHTML("afterbegin", `<i class="v4-role-icon">${icon(roleIcons[role] || "users")}</i>`);
    });
    if (!card.querySelector("[data-v4-action='greenhouse-mode']")) {
      card.insertAdjacentHTML("afterbegin", `<button type="button" class="v4-login-display ${preferences.greenhouseMode ? "active" : ""}" data-v4-action="greenhouse-mode" aria-pressed="${preferences.greenhouseMode}">${icon(preferences.greenhouseMode ? "sun" : "sun-medium")}<span>${preferences.greenhouseMode ? "Tryb szklarni włączony" : "Włącz tryb szklarni"}</span></button>`);
    }
  }

  function decorateContentIcons() {
    context.app.querySelectorAll(".quick-grid button[data-nav]").forEach((button) => {
      setIcon(button.querySelector(":scope > i"), screenIcons[button.dataset.nav] || "circle-dot");
      setIcon(button.querySelector(":scope > em"), "chevron-right");
    });

    context.app.querySelectorAll(".metric > i, .material-icon, .report-types button > span:first-child").forEach((host) => {
      const glyph = host.textContent.trim();
      setIcon(host, glyphIcons[glyph] || "circle-dot");
    });

    context.app.querySelectorAll(".ux-empty-icon").forEach((host) => setIcon(host, "inbox"));
    context.app.querySelectorAll(".ux-state-catalog article").forEach((article) => {
      if (article.classList.contains("loading")) return;
      const mapping = { empty: "inbox", offline: "wifi-off", error: "triangle-alert", locked: "lock-keyhole" };
      setIcon(article.querySelector(":scope > i"), Object.entries(mapping).find(([className]) => article.classList.contains(className))?.[1] || "circle-dot");
    });

    context.app.querySelectorAll(".icon-btn[data-action='close-modal'], .icon-btn[data-action='close-feedback'], .icon-btn[data-action='close-notifications']").forEach((button) => {
      button.innerHTML = icon("x");
    });
  }

  function decorateContextBar() {
    const bar = context.app.querySelector(".operations-context");
    if (!bar) return;
    setIcon(bar.querySelector(".context-title > i"), "calendar-clock");
    setIcon(bar.querySelector(".context-saved > i"), "circle-check-big");

    const search = bar.querySelector(".context-search");
    if (search && !search.querySelector(":scope > .v4-context-search-icon")) {
      search.querySelector(":scope > input")?.insertAdjacentHTML("beforebegin", `<i class="v4-context-search-icon">${icon("search")}</i>`);
    }

    const schedule = bar.querySelector(".context-schedule > summary");
    if (schedule) schedule.innerHTML = `${icon("calendar-clock")}<span>Zmień datę lub zmianę</span>`;
    const filters = bar.querySelector(".ux-filter-menu > summary");
    if (filters) filters.innerHTML = `${icon("sliders-horizontal")}<span>Filtry</span>`;
  }

  function labelResponsiveRows() {
    const attendanceLabels = ["Pracownik", "Status", "Start", "Koniec", "Przerwa", "Notatka"];
    context.app.querySelectorAll(".table .tr:not(.head)").forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (!cell.dataset.label) cell.dataset.label = attendanceLabels[index] || `Pole ${index + 1}`;
      });
    });

    const teamLabels = ["Pracownik", "Dostępność", "Kompetencje", "Poziom", "Bilans", "Dokument", "Działanie"];
    context.app.querySelectorAll(".team-row").forEach((row) => {
      Array.from(row.children).forEach((cell, index) => { cell.dataset.label = teamLabels[index]; });
    });

    const reportLabels = ["Osoba", "Miejsce", "Wózek", "Wynik", "Czas"];
    context.app.querySelectorAll(".assignment-entry").forEach((row) => {
      Array.from(row.children).forEach((cell, index) => { cell.dataset.label = reportLabels[index]; });
    });
  }

  function enhanceMapSheet() {
    const detail = context.app.querySelector(".crop-detail");
    if (!detail) return;
    detail.classList.add("v4-location-sheet");
    detail.classList.toggle("collapsed", !preferences.mapSheetOpen);
    if (!detail.querySelector(".v4-sheet-handle")) {
      detail.insertAdjacentHTML("afterbegin", `<button type="button" class="v4-sheet-handle" data-v4-action="map-sheet" aria-expanded="${preferences.mapSheetOpen}"><i>${icon("map-pinned")}</i><span><b>Wybrane miejsce</b><small>Dotknij, aby ${preferences.mapSheetOpen ? "zwinąć" : "rozwinąć"} szczegóły</small></span><em>${icon("chevron-up")}</em></button>`);
    }
  }

  function addPageIdentity() {
    const pageHead = context.app.querySelector(".page-head");
    if (!pageHead || pageHead.querySelector(".v4-page-icon")) return;
    pageHead.insertAdjacentHTML("afterbegin", `<i class="v4-page-icon">${icon(screenIcons[context.state.screen] || "layout-dashboard")}</i>`);
  }

  function toggleGreenhouseMode() {
    preferences.greenhouseMode = !preferences.greenhouseMode;
    persistPreferences();
    applyMode();
    if (context.state.loggedIn) decorateTopbar(); else context.render();
    context.notify?.(preferences.greenhouseMode ? "Tryb szklarni włączony: większy kontrast i pola dotykowe" : "Przywrócono standardowy widok");
  }

  function toggleMapSheet(button) {
    preferences.mapSheetOpen = !preferences.mapSheetOpen;
    persistPreferences();
    const sheet = button.closest(".v4-location-sheet");
    sheet?.classList.toggle("collapsed", !preferences.mapSheetOpen);
    button.setAttribute("aria-expanded", String(preferences.mapSheetOpen));
    const help = button.querySelector("small");
    if (help) help.textContent = `Dotknij, aby ${preferences.mapSheetOpen ? "zwinąć" : "rozwinąć"} szczegóły`;
  }

  function bindEvents() {
    if (bound) return;
    bound = true;
    context.app.addEventListener("click", (event) => {
      const button = event.target.closest("[data-v4-action]");
      if (!button) return;
      if (button.dataset.v4Action === "greenhouse-mode") toggleGreenhouseMode();
      if (button.dataset.v4Action === "map-sheet") toggleMapSheet(button);
    });
  }

  function afterRender(nextContext) {
    context = nextContext;
    bindEvents();
    applyMode();
    decorateLogin();
    if (!context.state.loggedIn) return;
    decorateNavigation();
    decorateTopbar();
    decorateContextBar();
    decorateContentIcons();
    labelResponsiveRows();
    enhanceMapSheet();
    addPageIdentity();
  }

  window.GreenhouseVisualV4 = { afterRender };
})();
