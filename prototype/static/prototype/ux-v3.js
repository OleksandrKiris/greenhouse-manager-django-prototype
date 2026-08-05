(() => {
  "use strict";

  const STORAGE_KEY = "greenhouse-ux-v3";
  const screenLabels = {
    dashboard: "Podsumowanie",
    planning: "Plan zmiany",
    attendance: "Lista obecności",
    tasks: "Prace",
    productivity: "Wydajność",
    team: "Pracownicy",
    crop: "Mapa obserwacji",
    tickets: "Zgłoszenia",
    materials: "Materiały",
    reports: "Raporty",
  };
  const navigationGroups = [
    ["START", ["dashboard"]],
    ["ZMIANA", ["planning", "attendance", "tasks", "productivity", "team"]],
    ["OBSŁUGA", ["crop", "tickets", "materials"]],
    ["KONTROLA", ["reports"]],
  ];
  const issueSearch = {
    planning: "brak",
    attendance: "nieustalony",
    tasks: "wstrzymane",
    productivity: "poniżej",
    team: "08.2026",
    crop: "alarm",
    tickets: "krytyczny",
    materials: "niski stan",
    reports: "brak",
  };

  let context = null;
  let bound = false;
  let ticketWasOpen = false;
  const ux = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        brigade: saved.brigade || "Wszystkie brygady",
        savedFilters: saved.savedFilters || {},
        attendanceExceptions: false,
        ticketStep: 0,
      };
    } catch (_) {
      return { brigade: "Wszystkie brygady", savedFilters: {}, attendanceExceptions: false, ticketStep: 0 };
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ brigade: ux.brigade, savedFilters: ux.savedFilters }));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    }[character]));
  }

  function minutes(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return 0;
    const [hours, mins] = value.split(":").map(Number);
    return hours * 60 + mins;
  }

  function breakSummary(employee) {
    const breaks = employee.breaks || [];
    const total = breaks.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const paid = breaks.length ? Math.min(15, Number(breaks[0].minutes || 0)) : 0;
    return { total, paid, deducted: Math.max(0, total - paid) };
  }

  function workedMinutes(employee) {
    if (employee.status !== "Obecny") return 0;
    const start = minutes(employee.start);
    let end = minutes(employee.end);
    if (!start && !end) return 0;
    if (end < start) end += 1440;
    return Math.max(0, end - start - breakSummary(employee).deducted);
  }

  function formatMinutes(value) {
    const safe = Math.max(0, Math.round(value));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
  }

  function groupNavigation() {
    const nav = context.app.querySelector(".sidebar .nav");
    if (!nav) return;
    navigationGroups.forEach(([label, screens]) => {
      const first = screens.map((screen) => nav.querySelector(`[data-nav="${screen}"]`)).find(Boolean);
      if (!first) return;
      const group = document.createElement("span");
      group.className = "ux-nav-group";
      group.textContent = label;
      first.before(group);
    });
  }

  function availableForemen() {
    const site = context.state.role === "Brygadzista" ? context.state.selectedSite : null;
    return [...new Set(context.state.plan
      .filter((item) => !site || item.site === site)
      .flatMap((item) => [item.chief, item.foreman])
      .filter(Boolean))].sort((a, b) => a.localeCompare(b, "pl"));
  }

  function moduleContextControl(foremen) {
    const { role, screen } = context.state;
    if (["planning", "tasks"].includes(screen)) {
      return `<label class="ux-brigade-filter"><span>${screen === "planning" ? "Brygada planu" : "Brygadzista realizujący"}</span><select data-ux-change="brigade"><option>Wszystkie brygady</option>${foremen.map((name) => `<option ${ux.brigade === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></label>`;
    }
    const details = {
      dashboard: ["Priorytet widoku", context.state.currentOnly ? "Tylko aktualne" : "Aktualne i historia", "najpilniejsze pozycje są pierwsze"],
      attendance: ["Brygada", role === "Brygadzista" ? "Moja brygada" : "Wszystkie brygady", "szczegóły godzin tylko w tym module"],
      productivity: ["Jednostki wyniku", "rz./h i kg/h", "liczone osobno dla każdej osoby"],
      team: ["Widok danych", role === "Kadry" ? "Pracownicy i dokumenty" : "Dostępność i kompetencje", "zgodnie z zakresem roli"],
      crop: ["Wybrane miejsce", `${context.state.selectedCropSite} · ${context.state.selectedCropNave}`, "szczegóły wjazdu są na mapie"],
      tickets: ["Kolejka", context.state.currentOnly ? "Aktywne zgłoszenia" : "Aktualne i historia", "krytyczne i nowe są pierwsze"],
      materials: ["Stan magazynowy", "Wszystkie materiały", "niskie stany są pierwsze"],
      reports: ["Okres raportu", "Bieżąca zmiana", "agregacja zatwierdzonych danych"],
    }[screen] || ["Widok", screenLabels[screen], "zakres bieżącego modułu"];
    return `<div class="context-fixed ux-module-context"><span>${details[0]}</span><b>${escapeHtml(details[1])}</b><small>${escapeHtml(details[2])}</small></div>`;
  }

  function activeModuleFilter() {
    const segments = context.app.querySelector(".upgrade-segments");
    if (!segments) return null;
    const buttons = Array.from(segments.querySelectorAll("button"));
    const active = buttons.find((button) => button.classList.contains("active"));
    if (!active || active === buttons[0]) return null;
    return { label: segments.getAttribute("aria-label") || "Filtr", value: active.textContent.trim(), reset: buttons[0] };
  }

  function renderContextChips() {
    const row = context.app.querySelector("[data-context-active-row]");
    if (!row) return;
    const chips = [];
    const search = context.app.querySelector("[data-module-search]")?.value.trim() || "";
    const scope = context.app.querySelector('[data-module-change="scope"]')?.value || "";
    const moduleFilter = activeModuleFilter();
    if (scope && scope !== "Wszystkie obiekty") chips.push(["scope", "Obiekt", scope]);
    if (ux.brigade !== "Wszystkie brygady" && ["planning", "tasks"].includes(context.state.screen)) chips.push(["brigade", "Brygada", ux.brigade]);
    if (moduleFilter) chips.push(["module", moduleFilter.label, moduleFilter.value]);
    if (search && search !== ux.brigade) chips.push(["search", "Szukaj", search]);
    if (!context.state.currentOnly) chips.push(["history", "Widok", "Historia włączona"]);

    row.innerHTML = chips.length
      ? `<span class="context-active-label">Aktywne filtry</span><div class="context-chips">${chips.map(([id, label, value]) => `<button type="button" data-ux-action="clear-context-${id}" title="Usuń filtr: ${escapeHtml(label)} ${escapeHtml(value)}"><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b><i aria-hidden="true">×</i></button>`).join("")}</div><button type="button" class="context-clear-all" data-ux-action="clear-context-all">Wyczyść wszystko</button>`
      : `<span class="context-no-filters"><i aria-hidden="true">✓</i> Brak dodatkowych filtrów · pokazujemy domyślny zakres tego modułu</span>`;
    row.classList.toggle("has-filters", Boolean(chips.length));

    const menu = context.app.querySelector(".ux-filter-menu");
    if (menu) menu.dataset.activeCount = String(chips.length);
    window.GreenhouseVisualV4?.refreshContext?.();
  }

  function enhanceContextBar() {
    const bar = context.app.querySelector(".operations-context");
    const search = bar?.querySelector(".context-search");
    if (!bar || !search) return;
    const foremen = availableForemen();
    if (!foremen.includes(ux.brigade)) ux.brigade = "Wszystkie brygady";
    search.insertAdjacentHTML("beforebegin", moduleContextControl(foremen));
    const saved = ux.savedFilters[context.state.screen];
    search.insertAdjacentHTML("beforeend", `<details class="ux-filter-menu"><summary aria-label="Szybkie filtry">Filtry</summary><div>${issueSearch[context.state.screen] ? `<button type="button" data-ux-action="filter-issues">Tylko wymagające uwagi</button>` : ""}<button type="button" data-ux-action="filter-reset">Wyczyść filtry</button><button type="button" data-ux-action="filter-save">Zapisz obecny filtr</button>${saved ? `<button type="button" data-ux-action="filter-apply">Zastosuj „Mój filtr”</button>` : ""}</div></details>`);
    renderContextChips();
  }

  function setSearch(value) {
    const input = context.app.querySelector("[data-module-search]");
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function filterIssues() {
    if (context.state.screen === "tickets") {
      context.app.querySelector('[data-action="set-ticket-filter"][data-filter="critical"]')?.click();
      return;
    }
    if (context.state.screen === "crop") {
      context.app.querySelector('[data-module-action="set-filter"][data-filter-name="crop"][data-value="Alarm"]')?.click();
      return;
    }
    if (context.state.screen === "productivity") {
      setSearch("");
      const rows = Array.from(context.app.querySelectorAll(".rank-row"));
      let visible = 0;
      rows.forEach((row) => {
        const percent = Number(row.querySelector("strong")?.textContent.replace(/\D/g, "") || 0);
        row.hidden = percent >= 100;
        if (percent < 100) visible += 1;
      });
      const count = context.app.querySelector("[data-large-list-count]");
      if (count) count.textContent = `Pokazano ${visible} wyników poniżej normy`;
      return;
    }
    setSearch(issueSearch[context.state.screen] || "brak");
  }

  function resetFilters() {
    ux.brigade = "Wszystkie brygady";
    persist();
    const search = context.app.querySelector("[data-module-search]");
    if (search) search.value = "";
    const scope = context.app.querySelector('[data-module-change="scope"]');
    if (scope && scope.value !== "Wszystkie obiekty") {
      scope.value = "Wszystkie obiekty";
      scope.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (context.state.screen === "tickets") {
      context.app.querySelector('[data-action="set-ticket-filter"][data-filter="all"]')?.click();
      return;
    }
    if (context.state.screen === "crop") {
      context.app.querySelector('[data-module-action="set-filter"][data-filter-name="crop"][data-value="Wszystkie"]')?.click();
      return;
    }
    const select = context.app.querySelector('[data-ux-change="brigade"]');
    if (select) select.value = ux.brigade;
    const defaultModuleFilter = activeModuleFilter()?.reset;
    if (defaultModuleFilter) {
      defaultModuleFilter.click();
      return;
    }
    setSearch("");
    renderContextChips();
  }

  function setCurrentShift() {
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const currentShift = now.getHours() >= 22 || now.getHours() < 6 ? "Nocna · 22:00–06:00" : now.getHours() >= 14 ? "Popołudniowa · 14:00–22:00" : "Poranna · 06:00–14:00";
    const date = context.app.querySelector('[data-module-change="work-date"]');
    const shift = context.app.querySelector('[data-module-change="shift"]');
    if (date) {
      date.value = localDate;
      date.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (shift) {
      shift.value = currentShift;
      shift.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const details = context.app.querySelector(".context-schedule");
    if (details) details.open = false;
    context.notify("Ustawiono bieżącą datę i zmianę");
  }

  function rolePrimaryAction() {
    const { role, screen } = context.state;
    if (screen === "dashboard") {
      const target = { Brygadzista: "planning", Kierownik: "planning", "Ochrona roślin": "crop", "Dział techniczny": "tickets", Kadry: "attendance" }[role];
      return { label: `Otwórz: ${screenLabels[target]}`, icon: "→", nav: target };
    }
    const actions = {
      planning: role === "Kierownik" ? { label: "Dodaj pozycję planu", icon: "+", action: "new-plan" } : { label: "Realizuj plan", icon: "→", nav: "tasks" },
      attendance: { label: "Zapisz obecność", icon: "✓", module: "save-schedule" },
      tasks: { label: "Przydziel nową pracę", icon: "+", action: "new-task" },
      productivity: { label: "Otwórz raport", icon: "→", nav: "reports" },
      team: { label: "Sprawdź obecność", icon: "→", nav: "attendance" },
      crop: { label: "Dodaj obserwację", icon: "+", action: "new-observation" },
      tickets: { label: "Nowe zgłoszenie", icon: "+", action: "new-ticket" },
      materials: { label: "Zgłoś zapotrzebowanie", icon: "+", action: "material-request" },
      reports: { label: context.state.shiftClosed ? "Zobacz zamknięcie" : "Zamknij zmianę", icon: "✓", action: "open-close" },
    };
    return actions[screen] || { label: "Podsumowanie", icon: "⌂", nav: "dashboard" };
  }

  function mobilePrimaryAction() {
    if (!context.state.loggedIn || context.state.modal || context.state.review) return;
    const item = rolePrimaryAction();
    const attrs = item.nav ? `data-nav="${item.nav}"` : item.action ? `data-action="${item.action}"` : `data-module-action="${item.module}"`;
    context.app.querySelector(".shell")?.insertAdjacentHTML("beforeend", `<aside class="ux-mobile-primary" aria-label="Najważniejsze działanie"><span><small>${escapeHtml(context.state.role)} · ${escapeHtml(screenLabels[context.state.screen])}</small><b>${escapeHtml(item.label)}</b></span><button class="primary" ${attrs}><i>${item.icon}</i><span>${escapeHtml(item.label)}</span></button></aside>`);
  }

  function attendanceCommandCenter() {
    if (context.state.screen !== "attendance") return;
    const roster = context.app.querySelector(".time-roster-shell");
    if (!roster) return;
    const employees = context.state.employees;
    const exceptions = employees.filter((employee) => employee.status !== "Obecny" || !employee.start || !employee.end || employee.timeNote).length;
    const totalPaid = employees.reduce((sum, employee) => sum + breakSummary(employee).paid, 0);
    const totalDeducted = employees.reduce((sum, employee) => sum + breakSummary(employee).deducted, 0);
    const totalWork = employees.reduce((sum, employee) => sum + workedMinutes(employee), 0);
    roster.insertAdjacentHTML("beforebegin", `<section class="ux-attendance-command surface"><div class="ux-command-copy"><span class="kicker">SZYBKA OBSADA</span><h3>Najpierw potwierdź brygadę, później popraw wyjątki</h3><p>Jedno działanie ustawia obecność całej widocznej brygady. Indywidualne godziny i przerwy pozostają dostępne po rozwinięciu pracownika.</p></div><div class="ux-attendance-metrics"><span><small>Do sprawdzenia</small><b class="${exceptions ? "danger" : ""}">${exceptions}</b></span><span><small>Czas netto</small><b>${formatMinutes(totalWork)}</b></span><span><small>Płatna przerwa</small><b>${formatMinutes(totalPaid)}</b></span><span><small>Odliczane</small><b>${formatMinutes(totalDeducted)}</b></span></div><div class="ux-command-actions"><button class="secondary ${ux.attendanceExceptions ? "active" : ""}" data-ux-action="attendance-exceptions">${ux.attendanceExceptions ? "Pokaż wszystkich" : `Tylko wyjątki (${exceptions})`}</button><button class="primary" data-ux-action="attendance-all-present">✓ Cała brygada obecna</button></div><div class="ux-paid-rule"><i>15</i><span><b>Pierwsze 15 minut pierwszej przerwy jest płatne</b><small>Od czasu pracy odejmowana jest dopiero pozostała część pierwszej przerwy oraz cała druga przerwa.</small></span></div></section>`);
    applyAttendanceExceptionFilter();
  }

  function applyAttendanceExceptionFilter() {
    if (context.state.screen !== "attendance" || !ux.attendanceExceptions) return;
    let visible = 0;
    context.app.querySelectorAll(".time-worker-card").forEach((card) => {
      const employee = context.state.employees.find((item) => item.id === Number(card.dataset.timeCardId));
      const exception = employee && (employee.status !== "Obecny" || !employee.start || !employee.end || employee.timeNote);
      card.hidden = !exception;
      if (exception) visible += 1;
    });
    const count = context.app.querySelector("[data-large-list-count]");
    if (count) count.textContent = `Pokazano ${visible} wyjątków z ${context.state.employees.length} pracowników`;
  }

  function planExecutionPanel() {
    if (context.state.screen !== "planning") return;
    const site = context.state.role === "Kierownik" ? context.state.selectedPlanSite : context.state.selectedSite;
    const plan = context.state.plan.filter((item) => item.site === site && (!context.state.currentOnly || item.current !== false));
    const tasks = context.state.tasks.filter((item) => item.site === site);
    const anchor = context.app.querySelector(".large-list-toolbar, .plan-board");
    if (!anchor || !plan.length) return;
    const rows = plan.map((item, index) => {
      const matches = tasks.filter((task) => task.title === item.title || task.nave === item.nave);
      const progress = matches.length ? Math.round(matches.reduce((sum, task) => sum + Number(task.progress || (task.status === "Zakończone" ? 100 : 0)), 0) / matches.length) : 0;
      const result = matches.reduce((sum, task) => sum + Number(task.result || 0), 0);
      const shortage = Math.max(0, item.need - item.assigned);
      const tone = shortage ? "danger" : progress >= 100 ? "done" : progress ? "active" : "waiting";
      return `<article class="ux-plan-execution-row ${tone}"><div class="ux-plan-index">${String(index + 1).padStart(2, "0")}</div><div><small>${escapeHtml(item.time)} · ${escapeHtml(item.nave)} · ${escapeHtml(item.entrance)}</small><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.foreman)}</span></div><div><small>Obsada</small><b>${item.assigned}/${item.need} os.</b><span>${shortage ? `Brak ${shortage}` : "Kompletna"}</span></div><div><small>Cel</small><b>${item.target} ${escapeHtml(item.unit)}</b><span>${result ? `Wynik ${result}` : "Bez wyniku"}</span></div><div class="ux-execution-progress"><span><small>Wykonanie</small><b>${progress}%</b></span><div><i style="width:${Math.min(100, progress)}%"></i></div></div></article>`;
    }).join("");
    const completed = plan.filter((item) => tasks.some((task) => (task.title === item.title || task.nave === item.nave) && task.status === "Zakończone")).length;
    anchor.insertAdjacentHTML("beforebegin", `<section class="ux-plan-execution surface"><header><div><span class="kicker">PLAN ↔ WYKONANIE · ${escapeHtml(site)}</span><h3>Kontrola realizacji bez przechodzenia do innego raportu</h3><p>Obsada, cel i bieżący postęp są zestawione w tej samej kolejności co plan kierownika.</p></div><div class="ux-plan-total"><b>${completed}/${plan.length}</b><small>pozycji zakończonych</small></div></header><div class="ux-plan-execution-list">${rows}</div><footer><span>Pełne osoby, wózki i wyniki pozostają w module „Prace”.</span><button class="secondary" data-nav="tasks">Otwórz szczegóły wykonania →</button></footer></section>`);
  }

  function mapRiskOverview() {
    if (context.state.screen !== "crop") return;
    const toolbar = context.app.querySelector(".crop-toolbar");
    if (!toolbar) return;
    const structure = context.greenhouseStructure?.find((item) => item.site === context.state.selectedCropSite);
    if (!structure) return;
    const observations = context.state.observations.filter((item) => item.site === structure.site && (!context.state.currentOnly || item.status !== "Zamknięte"));
    const cells = Array.from({ length: structure.naveCount }, (_, index) => {
      const nave = `N${String(index + 1).padStart(2, "0")}`;
      const entries = observations.filter((item) => item.nave === nave);
      const tone = entries.some((item) => item.severity === "high") ? "high" : entries.some((item) => item.severity === "medium") ? "medium" : entries.length ? "watch" : "clear";
      return `<button class="${tone} ${context.state.selectedCropNave === nave ? "selected" : ""}" data-ux-action="select-risk-nave" data-nave="${nave}" aria-label="${nave}, ${entries.length} obserwacji"><span>${String(index + 1).padStart(2, "0")}</span>${entries.length ? `<b>${entries.length}</b>` : ""}</button>`;
    }).join("");
    toolbar.insertAdjacentHTML("afterend", `<section class="ux-risk-overview surface"><header><div><span class="kicker">MAPA RYZYKA CAŁEGO ETAPU</span><h3>${escapeHtml(structure.site)} · nawy 1–${structure.naveCount}</h3></div><div class="ux-risk-legend"><span class="clear">Brak</span><span class="watch">Obserwacja</span><span class="medium">Kontrola</span><span class="high">Alarm</span></div></header><div class="ux-risk-grid">${cells}</div><footer>Kliknij nawę, aby od razu otworzyć jej dwa boki, pięć wjazdów i strony przejść.</footer></section>`);
  }

  function ticketWizard() {
    const form = context.app.querySelector('form[data-form="ticket"]');
    if (!form) {
      if (ticketWasOpen) ux.ticketStep = 0;
      ticketWasOpen = false;
      return;
    }
    ticketWasOpen = true;
    if (form.classList.contains("ux-ticket-wizard")) return;
    form.classList.add("ux-ticket-wizard");
    const nodes = Array.from(form.children);
    if (nodes.length < 7) return;
    const originalActions = nodes.find((node) => node.classList?.contains("modal-actions"));
    const groups = [
      { title: "Problem", copy: "Co się stało i jaki ma wpływ na pracę?", nodes: [nodes[0], nodes[1], nodes[2]] },
      { title: "Lokalizacja", copy: "Wskaż dokładny obiekt, nawę, wjazd i stronę.", nodes: [nodes[4]] },
      { title: "Odpowiedzialność", copy: "Podaj źródło informacji, priorytet i właściciela.", nodes: [nodes[3], nodes[5]] },
    ];
    const progress = document.createElement("nav");
    progress.className = "ux-wizard-progress";
    progress.setAttribute("aria-label", "Etapy zgłoszenia");
    progress.innerHTML = groups.map((group, index) => `<button type="button" data-ux-action="ticket-step-jump" data-step="${index}"><i>${index + 1}</i><span><b>${group.title}</b><small>${group.copy}</small></span></button>`).join("");
    form.prepend(progress);
    groups.forEach((group, index) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "ux-ticket-step";
      fieldset.dataset.ticketStep = String(index);
      fieldset.innerHTML = `<legend><span>Krok ${index + 1} z 3</span><b>${group.title}</b><small>${group.copy}</small></legend>`;
      group.nodes.filter(Boolean).forEach((node) => fieldset.append(node));
      form.append(fieldset);
    });
    originalActions?.remove();
    form.insertAdjacentHTML("beforeend", `<div class="ux-wizard-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><span></span><button type="button" class="secondary" data-ux-action="ticket-prev">← Wstecz</button><button type="button" class="primary" data-ux-action="ticket-next">Dalej →</button><button type="submit" class="primary" data-ux-ticket-submit>Utwórz zgłoszenie</button></div>`);
    showTicketStep(Math.min(2, ux.ticketStep));
  }

  function showTicketStep(index) {
    const form = context.app.querySelector('form[data-form="ticket"]');
    if (!form) return;
    ux.ticketStep = Math.max(0, Math.min(2, Number(index)));
    form.querySelectorAll("[data-ticket-step]").forEach((step) => { step.hidden = Number(step.dataset.ticketStep) !== ux.ticketStep; });
    form.querySelectorAll(".ux-wizard-progress button").forEach((button) => {
      const step = Number(button.dataset.step);
      button.classList.toggle("active", step === ux.ticketStep);
      button.classList.toggle("done", step < ux.ticketStep);
      button.disabled = step > ux.ticketStep;
    });
    const previous = form.querySelector('[data-ux-action="ticket-prev"]');
    const next = form.querySelector('[data-ux-action="ticket-next"]');
    const submit = form.querySelector("[data-ux-ticket-submit]");
    if (previous) previous.hidden = ux.ticketStep === 0;
    if (next) next.hidden = ux.ticketStep === 2;
    if (submit) submit.hidden = ux.ticketStep !== 2;
    form.querySelector(".ux-ticket-step:not([hidden]) input, .ux-ticket-step:not([hidden]) select, .ux-ticket-step:not([hidden]) textarea")?.focus();
  }

  function validateTicketStep() {
    const step = context.app.querySelector(`.ux-ticket-step[data-ticket-step="${ux.ticketStep}"]`);
    const invalid = Array.from(step?.querySelectorAll("input, select, textarea") || []).find((control) => !control.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    return true;
  }

  function reviewStateCatalog() {
    if (!context.state.review) return;
    const anchor = context.app.querySelector(".design-studio");
    if (!anchor) return;
    anchor.insertAdjacentHTML("afterend", `<details class="ux-state-catalog surface"><summary><span><i>◫</i><b>Stany systemu do zaprojektowania</b><small>Ładowanie, brak danych, offline, błąd i brak uprawnień</small></span><em>Rozwiń</em></summary><div><article class="loading"><i></i><span><b>Ładowanie</b><small>Dane są pobierane</small></span></article><article class="empty"><i>○</i><span><b>Brak danych</b><small>Pokaż następne możliwe działanie</small></span></article><article class="offline"><i>!</i><span><b>Praca offline</b><small>Zapis trafi do kolejki</small></span></article><article class="error"><i>×</i><span><b>Błąd zapisu</b><small>Zachowaj dane formularza</small></span></article><article class="locked"><i>◇</i><span><b>Brak uprawnień</b><small>Wyjaśnij, kto może wykonać działanie</small></span></article></div></details>`);
  }

  function improveEmptyStates() {
    context.app.querySelectorAll(".empty").forEach((empty) => {
      if (empty.closest(".ux-state-catalog")) return;
      empty.classList.add("ux-empty-state");
      if (!empty.querySelector(":scope > .ux-empty-icon")) empty.insertAdjacentHTML("afterbegin", '<i class="ux-empty-icon" aria-hidden="true">○</i>');
    });
  }

  function handleAttendanceAllPresent() {
    context.state.employees.forEach((employee) => {
      employee.status = "Obecny";
      if (!/^\d{2}:\d{2}$/.test(employee.start || "")) employee.start = "06:00";
      if (!/^\d{2}:\d{2}$/.test(employee.end || "")) employee.end = "14:15";
      if (!employee.breaks?.length) employee.breaks = [{ start: "09:30", minutes: 30 }];
      employee.breakMinutes = employee.breaks.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    });
    ux.attendanceExceptions = false;
    context.notify("Cała widoczna brygada została oznaczona jako obecna");
  }

  function handleAction(button) {
    const action = button.dataset.uxAction;
    if (action === "filter-issues") filterIssues();
    if (action === "filter-reset") resetFilters();
    if (action === "current-shift") setCurrentShift();
    if (action === "clear-context-search") setSearch("");
    if (action === "clear-context-scope") {
      const scope = context.app.querySelector('[data-module-change="scope"]');
      if (scope) {
        scope.value = "Wszystkie obiekty";
        scope.dispatchEvent(new Event("change", { bubbles: true }));
      }
      renderContextChips();
    }
    if (action === "clear-context-brigade") {
      const previous = ux.brigade;
      ux.brigade = "Wszystkie brygady";
      persist();
      const select = context.app.querySelector('[data-ux-change="brigade"]');
      if (select) select.value = ux.brigade;
      const search = context.app.querySelector("[data-module-search]");
      if (search?.value === previous) setSearch("");
      renderContextChips();
    }
    if (action === "clear-context-module") activeModuleFilter()?.reset?.click();
    if (action === "clear-context-history") context.app.querySelector(".current-view-toggle")?.click();
    if (action === "clear-context-all") resetFilters();
    if (action === "filter-save") {
      ux.savedFilters[context.state.screen] = { search: context.app.querySelector("[data-module-search]")?.value || "", brigade: ux.brigade };
      persist();
      context.notify(`Zapisano filtr: ${screenLabels[context.state.screen]}`);
    }
    if (action === "filter-apply") {
      const saved = ux.savedFilters[context.state.screen];
      if (saved) {
        ux.brigade = saved.brigade || "Wszystkie brygady";
        const select = context.app.querySelector('[data-ux-change="brigade"]');
        if (select) select.value = ux.brigade;
        setSearch(saved.search || (ux.brigade === "Wszystkie brygady" ? "" : ux.brigade));
        renderContextChips();
      }
    }
    if (action === "attendance-exceptions") {
      ux.attendanceExceptions = !ux.attendanceExceptions;
      context.render();
    }
    if (action === "attendance-all-present") handleAttendanceAllPresent();
    if (action === "select-risk-nave") {
      context.state.selectedCropNave = button.dataset.nave;
      const first = context.state.observations.find((item) => item.site === context.state.selectedCropSite && item.nave === button.dataset.nave && (!context.state.currentOnly || item.status !== "Zamknięte"));
      context.state.selectedCropGreenhouseSide = first?.greenhouseSide || "Lewa od łącznika";
      context.state.selectedCropEntrance = first?.entrance || "Wjazd 1";
      context.state.selectedCropPassageSide = first?.passageSide || "Lewa";
      context.state.selectedObservationId = first?.id || null;
      context.render();
    }
    if (action === "ticket-prev") showTicketStep(ux.ticketStep - 1);
    if (action === "ticket-next" && validateTicketStep()) showTicketStep(ux.ticketStep + 1);
    if (action === "ticket-step-jump" && Number(button.dataset.step) <= ux.ticketStep) showTicketStep(Number(button.dataset.step));
  }

  function bindEvents() {
    if (bound) return;
    bound = true;
    context.app.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ux-action]");
      if (button && !button.disabled) handleAction(button);
    });
    context.app.addEventListener("input", (event) => {
      if (event.target.matches("[data-module-search]")) renderContextChips();
    });
    context.app.addEventListener("change", (event) => {
      const select = event.target.closest('[data-ux-change="brigade"]');
      if (select) {
        ux.brigade = select.value;
        persist();
        if (["planning", "tasks"].includes(context.state.screen)) setSearch(ux.brigade === "Wszystkie brygady" ? "" : ux.brigade);
      }
      if (event.target.closest(".operations-context")) renderContextChips();
    });
  }

  function afterRender(nextContext) {
    context = nextContext;
    bindEvents();
    if (!context.state.loggedIn) {
      ticketWasOpen = false;
      ux.ticketStep = 0;
      return;
    }
    groupNavigation();
    enhanceContextBar();
    attendanceCommandCenter();
    planExecutionPanel();
    mapRiskOverview();
    ticketWizard();
    reviewStateCatalog();
    improveEmptyStates();
    mobilePrimaryAction();
  }

  window.GreenhouseUXV3 = { afterRender };
})();
