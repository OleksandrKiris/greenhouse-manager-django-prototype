(() => {
  "use strict";

  const FEATURE_PREFERENCES_KEY = "greenhouse-context-preferences-v1";
  const savedFeaturePreferences = loadFeaturePreferences();
  const featureState = {
    workDate: "2026-08-05",
    shift: "Poranna · 06:00–14:00",
    scope: "Wszystkie obiekty",
    search: "",
    attendanceFilter: "Wszyscy",
    taskFilter: "Wszystkie",
    productivityUnit: "Wszystkie",
    teamFilter: "Wszyscy",
    cropFilter: "Wszystkie",
    reminderSent: false,
    planValidated: false,
    planCopied: false,
    planAcknowledged: false,
    copiedPlans: {},
    protectionTaskCreated: false,
    materialOrderCreated: false,
    reportApproved: false,
    handover: null,
    planVersions: {},
    planAcknowledgements: {},
    planCompareSite: "",
    pauseReasons: {},
    pauseTaskId: null,
    shiftClock: "08:20",
    scheduleSaved: false,
    expandedTimeCards: [],
    listDensity: "compact",
    listLimits: {
      planning: 4,
      attendance: 6,
      tasks: 4,
      productivity: 6,
      team: 6,
      crop: 5,
      tickets: 5,
      materials: 4,
      reports: 5,
    },
    ...savedFeaturePreferences,
    listLimits: {
      planning: 4,
      attendance: 6,
      tasks: 4,
      productivity: 6,
      team: 6,
      crop: 5,
      tickets: 5,
      materials: 4,
      reports: 5,
      ...(savedFeaturePreferences.listLimits || {}),
    },
  };

  const designState = loadDesignState();

  let context = null;
  let eventsBound = false;
  let lastScreen = null;

  function loadFeaturePreferences() {
    try { return JSON.parse(localStorage.getItem(FEATURE_PREFERENCES_KEY) || "{}"); }
    catch (_) { return {}; }
  }

  function saveFeaturePreferences() {
    const allowed = ["workDate", "shift", "scope", "attendanceFilter", "taskFilter", "productivityUnit", "teamFilter", "cropFilter", "listDensity", "listLimits", "handover", "planVersions", "planAcknowledgements", "pauseReasons"];
    const snapshot = Object.fromEntries(allowed.map((key) => [key, featureState[key]]));
    try { localStorage.setItem(FEATURE_PREFERENCES_KEY, JSON.stringify(snapshot)); } catch (_) { /* Preferences remain optional. */ }
  }

  function loadDesignState() {
    try {
      const saved = JSON.parse(localStorage.getItem("greenhouse-layout-design") || "{}");
      return { decisions: saved.decisions || {}, proposals: saved.proposals || [] };
    } catch (_) {
      return { decisions: {}, proposals: [] };
    }
  }

  function saveDesignState() {
    localStorage.setItem("greenhouse-layout-design", JSON.stringify(designState));
  }

  const roleProfiles = {
    Brygadzista: {
      title: "Realizacja bieżącej zmiany",
      description: "Widzisz swoją szklarnię, własną brygadę, przydzielone prace oraz problemy, które dotyczą Twojego obiektu.",
      rights: ["Potwierdź obecność", "Przydziel ludzi i wózki", "Raportuj wynik", "Zgłaszaj problemy"],
      restriction: "Plan kierownika i statusy działów specjalistycznych są tylko do odczytu.",
    },
    Kierownik: {
      title: "Decyzje dla całego przedsiębiorstwa",
      description: "Widzisz wszystkie obiekty, publikujesz plany, kontrolujesz obsadę, ryzyka, SLA i kompletność raportów.",
      rights: ["Redaguj i publikuj plany", "Zatwierdzaj decyzje", "Kontroluj wszystkie obiekty", "Eksportuj raporty"],
      restriction: "Zmiany wykonawcze pozostają zapisane z osobą odpowiedzialną.",
    },
    "Ochrona roślin": {
      title: "Zdrowie upraw i działania ochronne",
      description: "Widzisz obserwacje ze wszystkich szklarni, działania ochronne, potrzebne materiały i raport swojego działu.",
      rights: ["Oceniaj obserwacje", "Przypisuj działania", "Zamykaj wpisy", "Zgłaszaj potrzebne materiały"],
      restriction: "Nie widzisz ekranów obsady, prac ani planowania produkcji.",
    },
    "Dział techniczny": {
      title: "Usterki, SLA i przywrócenie pracy",
      description: "Widzisz zgłoszenia techniczne wszystkich obiektów, potrzebne materiały i raport historii napraw.",
      rights: ["Przyjmuj zgłoszenia", "Przypisuj techników", "Aktualizuj status", "Zamykaj naprawy"],
      restriction: "Nie widzisz planu produkcyjnego, obecności ani danych wydajnościowych.",
    },
    Kadry: {
      title: "Czas pracy, nieobecności i dokumenty",
      description: "Widzisz dane pracownicze, obecność oraz raporty potrzebne do rozliczenia czasu pracy.",
      rights: ["Koryguj obecność", "Kontroluj dokumenty", "Sprawdzaj bilans godzin", "Eksportuj dane kadrowe"],
      restriction: "Nie widzisz operacyjnych map, materiałów ani zgłoszeń technicznych.",
    },
  };

  const screensByRole = {
    Brygadzista: ["dashboard", "planning", "attendance", "tasks", "productivity", "team", "crop", "tickets", "materials", "reports"],
    Kierownik: ["dashboard", "planning", "attendance", "tasks", "productivity", "team", "crop", "tickets", "materials", "reports"],
    "Ochrona roślin": ["dashboard", "crop", "materials", "reports"],
    "Dział techniczny": ["dashboard", "tickets", "materials", "reports"],
    Kadry: ["dashboard", "attendance", "team", "reports"],
  };

  const screenDefinitions = {
    dashboard: { icon: "⌂", title: "Podsumowanie", purpose: "Priorytety i decyzje na teraz — bez szczegółowych tabel roboczych.", owns: ["KPI zmiany", "najpilniejsze alerty", "decyzje roli", "skróty do modułów"] },
    planning: { icon: "▣", title: "Plan zmiany", purpose: "Wyłącznie przygotowanie, obsada i publikacja planu dla obiektu.", owns: ["harmonogram", "potrzebna obsada", "norma i instrukcja", "publikacja"] },
    attendance: { icon: "✓", title: "Lista obecności", purpose: "Wyłącznie status obecności, czas pracy, przerwy i wyjątki.", owns: ["status osoby", "start i koniec", "1 lub 2 przerwy", "czas netto"] },
    tasks: { icon: "↗", title: "Prace", purpose: "Wyłącznie bieżąca realizacja zadań przez brygady.", owns: ["miejsce pracy", "ludzie i brygadzista", "wózek", "postęp i blokady"] },
    productivity: { icon: "≈", title: "Wydajność", purpose: "Wyłącznie wyniki osobowe i zespołowe liczone w zgodnych jednostkach.", owns: ["kg/h", "rz./h", "norma", "trend i wsparcie"] },
    team: { icon: "♙", title: "Pracownicy", purpose: "Wyłącznie dane potrzebne do doboru i rozwoju pracownika.", owns: ["dostępność", "kompetencje", "dokumenty", "bilans godzin"] },
    crop: { icon: "◎", title: "Mapa obserwacji", purpose: "Wyłącznie obserwacje upraw i ich dokładna lokalizacja.", owns: ["etap i nawa", "strona łącznika", "wjazd i strona", "ocena i działanie"] },
    tickets: { icon: "⌘", title: "Zgłoszenia", purpose: "Wyłącznie problemy techniczne, odpowiedzialność, SLA i historia.", owns: ["źródło zgłoszenia", "lokalizacja", "właściciel", "status i historia"] },
    materials: { icon: "◇", title: "Materiały", purpose: "Wyłącznie stany, rezerwacje, wydania i zapotrzebowania.", owns: ["stan i minimum", "rezerwacja", "wydanie do pracy", "zamówienie"] },
    reports: { icon: "▦", title: "Raporty", purpose: "Wyłącznie podsumowanie zatwierdzonych danych z zakresu roli.", owns: ["kompletność", "wynik zmiany", "wyjątki", "akceptacja i eksport"] },
  };

  const largeListDefinitions = {
    planning: { anchor: ".plan-board", item: ".plan-card", label: "pozycji planu", initial: 4, step: 4 },
    attendance: { anchor: ".time-roster-shell", item: ".time-worker-card", label: "pracowników", initial: 6, step: 6 },
    tasks: { anchor: ".task-grid", item: ".task", label: "prac", initial: 4, step: 4 },
    productivity: { anchor: ".ranking", item: ".rank-row", label: "wyników osobowych", initial: 6, step: 6 },
    team: { anchor: ".team-table", item: ".team-row", label: "pracowników", initial: 6, step: 6 },
    crop: { anchor: ".observation-register", item: ".observation-list > button", label: "obserwacji", initial: 5, step: 5 },
    tickets: { anchor: ".ticket-workspace", item: ".ticket-queue-item", label: "zgłoszeń", initial: 5, step: 5 },
    materials: { anchor: ".materials-grid", item: ".material", label: "materiałów", initial: 4, step: 4 },
    reports: { anchor: ".assignment-register", item: ".assignment-entry", label: "wpisów wykonania", initial: 5, step: 5 },
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character]));

  function employeeNameLink(employee) {
    return `<button type="button" class="employee-name-link" data-action="employee-detail" data-id="${employee.id}" aria-haspopup="dialog" aria-label="Otwórz kartę pracownika: ${escapeHtml(employee.name)}" title="Otwórz kartę pracownika">${escapeHtml(employee.name)}</button>`;
  }

  function employeeLanguageChip(employee) {
    return `<span class="employee-language-chip" title="Preferowany język komunikacji: ${escapeHtml(employee.language)}" aria-label="Preferowany język komunikacji: ${escapeHtml(employee.language)}"><b>${escapeHtml(employee.languageCode)}</b><em>${escapeHtml(employee.language)}</em></span>`;
  }

  const activePlan = () => {
    const { state } = context;
    const site = state.role === "Kierownik" ? state.selectedPlanSite : state.role === "Brygadzista" ? state.selectedSite : null;
    return state.plan.filter((item) => (!site || item.site === site) && (!state.currentOnly || item.current !== false));
  };

  const scopedTasks = () => context.state.role === "Brygadzista" ? context.state.tasks.filter((task) => task.site === context.state.selectedSite) : context.state.tasks;
  const scopedTickets = () => context.state.role === "Brygadzista" ? context.state.tickets.filter((ticket) => ticket.site === context.state.selectedSite) : context.state.tickets;
  const scopedObservations = () => context.state.role === "Brygadzista" ? context.state.observations.filter((item) => item.site === context.state.selectedSite) : context.state.observations;
  const activeTasks = () => scopedTasks().filter((task) => task.status !== "Zakończone");
  const openTickets = () => scopedTickets().filter((ticket) => ticket.status !== "Zamknięte");
  const openObservations = () => scopedObservations().filter((item) => item.status !== "Zamknięte");
  const lowMaterials = () => context.state.materials.filter((item) => item.quantity < item.min);

  function minutesFromTime(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return 0;
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function employeeNetMinutes(employee) {
    if (employee.status !== "Obecny") return 0;
    const start = minutesFromTime(employee.start);
    let end = minutesFromTime(employee.end);
    if (!start && !end) return 0;
    if (end < start) end += 24 * 60;
    return Math.max(0, end - start - breakAccounting(employee).deducted);
  }

  function breakAccounting(employee) {
    const breaks = employee.breaks || [];
    const total = breaks.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const paid = breaks.length ? Math.min(15, Number(breaks[0].minutes || 0)) : 0;
    return { total, paid, deducted: Math.max(0, total - paid) };
  }

  function formatMinutes(minutes) {
    const safe = Math.max(0, Math.round(minutes));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
  }

  function ensureTimeProfiles() {
    const patterns = [
      ["05:45", "14:00", [["09:00", 20]]],
      ["06:00", "14:30", [["09:15", 20], ["12:15", 15]]],
      ["06:15", "15:00", [["10:00", 30]]],
      ["07:00", "15:30", [["10:00", 15], ["13:15", 20]]],
      ["06:00", "13:45", [["09:30", 20]]],
    ];
    context.state.employees.forEach((employee, index) => {
      if (employee.timeProfileReady) return;
      const [start, end, breaks] = patterns[index % patterns.length];
      if (employee.status === "Obecny") {
        employee.start = start;
        employee.end = end;
        employee.breaks = breaks.map(([breakStart, minutes]) => ({ start: breakStart, minutes }));
        employee.breakMinutes = employee.breaks.reduce((sum, item) => sum + item.minutes, 0);
      } else {
        employee.breaks = [];
      }
      employee.timeProfileReady = true;
    });
  }

  function metric(label, value, detail, tone = "green") {
    return `<article class="upgrade-metric ${tone}"><span>${label}</span><b>${value}</b><small>${detail}</small></article>`;
  }

  function segmented(name, values, selected) {
    return `<div class="upgrade-segments" role="group" aria-label="${escapeHtml(name)}">${values.map((value) => `<button class="${value === selected ? "active" : ""}" data-module-action="set-filter" data-filter-name="${name}" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}</div>`;
  }

  function contextDateLabel(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    const today = new Date();
    const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
    const formatted = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(date);
    return `${isToday ? "Dzisiaj" : "Plan na"} · ${formatted}`;
  }

  const contextProfiles = {
    dashboard: { object: "Obiekt", search: "Zadanie, problem lub obiekt…" },
    planning: { object: "Obiekt planu", search: "Zadanie, brygadzista lub nawa…" },
    attendance: { object: "Miejsce pracy", search: "Imię, nazwisko lub kod pracownika…" },
    tasks: { object: "Obiekt realizacji", search: "Praca, wykonawca, nawa lub wózek…" },
    productivity: { object: "Zakres wyników", search: "Pracownik, rodzaj pracy lub wynik…" },
    team: { object: "Zakres zespołu", search: "Pracownik, kompetencja lub dokument…" },
    crop: { object: "Etap szklarni", search: "Objaw, nawa lub osoba odpowiedzialna…" },
    tickets: { object: "Obiekt zgłoszeń", search: "Problem, urządzenie, osoba lub numer…" },
    materials: { object: "Miejsce wydania", search: "Materiał, symbol lub lokalizacja…" },
    reports: { object: "Zakres raportu", search: "Pracownik, praca lub wyjątek…" },
  };

  function contextBar() {
    const { state, companySites } = context;
    const manager = state.role === "Kierownik";
    const [shiftName, shiftHours = ""] = featureState.shift.split(" · ");
    const profile = contextProfiles[state.screen] || contextProfiles.dashboard;
    const scopeControl = manager
      ? `<label class="context-scope"><span>${profile.object}</span><select data-module-change="scope"><option ${featureState.scope === "Wszystkie obiekty" ? "selected" : ""}>Wszystkie obiekty</option>${companySites.map((site) => `<option ${featureState.scope === site ? "selected" : ""}>${site}</option>`).join("")}</select></label>`
      : `<div class="context-fixed context-scope"><span>${profile.object}</span><b>${state.role === "Brygadzista" ? state.selectedSite : `Zakres: ${state.role}`}</b><small>${state.role === "Brygadzista" ? "przypisano przez kierownika" : "zgodnie z uprawnieniami roli"}</small></div>`;
    return `<section class="operations-context surface" aria-label="Kontekst operacyjny">
      <header class="context-summary">
        <div class="context-title"><i></i><span><small>${contextDateLabel(featureState.workDate)}</small><b>${escapeHtml(shiftName)} <em>${escapeHtml(shiftHours)}</em></b></span></div>
        <details class="context-schedule">
          <summary>Zmień datę lub zmianę</summary>
          <div>
            <label><span>Data planu</span><input type="date" value="${featureState.workDate}" data-module-change="work-date"></label>
            <label><span>Zmiana</span><select data-module-change="shift"><option ${featureState.shift.startsWith("Poranna") ? "selected" : ""}>Poranna · 06:00–14:00</option><option ${featureState.shift.startsWith("Popołudniowa") ? "selected" : ""}>Popołudniowa · 14:00–22:00</option><option ${featureState.shift.startsWith("Nocna") ? "selected" : ""}>Nocna · 22:00–06:00</option></select></label>
            <button type="button" class="context-current-shift" data-ux-action="current-shift">Ustaw bieżącą datę i zmianę</button>
          </div>
        </details>
        <div class="context-saved" data-context-save-state="saved" role="status"><i>✓</i><span><b>Zapis automatyczny</b><small>wszystkie zmiany zapisane</small></span></div>
      </header>
      <div class="context-controls">
        ${scopeControl}
        <label class="context-search"><span>Szukaj w tym widoku</span><input type="search" value="${escapeHtml(featureState.search)}" placeholder="${profile.search}" data-module-search><small class="context-search-count"></small></label>
      </div>
      <div class="context-active-row" data-context-active-row aria-live="polite"></div>
    </section>`;
  }

  function roleFocusPanel() {
    const { state } = context;
    const profile = roleProfiles[state.role];
    const scope = state.role === "Brygadzista" ? `${state.selectedSite} · własna brygada` : state.role === "Kierownik" ? featureState.scope : "zakres działu";
    return `<section class="role-focus-panel" aria-label="Zakres roli ${escapeHtml(state.role)}">
      <div class="role-focus-title"><i>${state.role.split(" ").map((part) => part[0]).join("").slice(0, 2)}</i><span><small>TWÓJ WIDOK · ${escapeHtml(scope)}</small><b>${profile.title}</b><p>${profile.description}</p></span></div>
      <div class="role-rights">${profile.rights.map((right) => `<span>✓ ${right}</span>`).join("")}</div>
      <div class="role-restriction"><i>i</i><span><small>OGRANICZENIE UPRAWNIEŃ</small><b>${profile.restriction}</b></span></div>
    </section>`;
  }

  function screenScopePanel() {
    const definition = screenDefinitions[context.state.screen];
    if (!definition) return "";
    return `<section class="module-scope surface" aria-label="Zakres widoku ${escapeHtml(definition.title)}">
      <div class="module-scope-title"><i>${definition.icon}</i><span><small>TEN WIDOK ZAWIERA TYLKO</small><b>${escapeHtml(definition.title)}</b><p>${escapeHtml(definition.purpose)}</p></span></div>
      <div class="module-scope-items">${definition.owns.map((item) => `<span>✓ ${escapeHtml(item)}</span>`).join("")}</div>
    </section>`;
  }

  function workflowPanel() {
    const { state } = context;
    const unsettled = state.employees.filter((employee) => employee.status === "Nieustalony").length;
    const openWork = activeTasks().length;
    const criticalTickets = openTickets().filter((ticket) => ticket.priority === "Krytyczny").length;
    const highCrop = openObservations().filter((item) => item.severity === "high").length;
    const missing = activePlan().reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
    const planPublished = state.role === "Kierownik"
      ? Boolean(state.planPublication[state.selectedPlanSite])
      : state.role === "Brygadzista"
        ? Boolean(state.planPublication[state.selectedSite])
        : true;
    const flows = {
      Brygadzista: [
        { screen: "planning", screens: ["dashboard", "planning"], label: "Plan", detail: missing ? `Brakuje ${missing} os.` : "Plan gotowy", done: planPublished && missing === 0 },
        { screen: "attendance", screens: ["attendance"], label: "Obecność", detail: unsettled ? `${unsettled} do decyzji` : "Statusy kompletne", done: unsettled === 0 },
        { screen: "tasks", screens: ["tasks", "productivity", "team", "crop", "tickets", "materials"], label: "Realizacja", detail: openWork ? `${openWork} aktywne prace` : "Prace zakończone", done: openWork === 0 },
        { screen: "reports", screens: ["reports"], label: "Raport", detail: state.shiftClosed ? "Zmiana zamknięta" : "Do zamknięcia", done: state.shiftClosed },
      ],
      Kierownik: [
        { screen: "planning", screens: ["dashboard", "planning"], label: "Plan", detail: missing ? `Brakuje ${missing} os.` : "Obsada gotowa", done: planPublished && missing === 0 },
        { screen: "attendance", screens: ["attendance", "tasks", "team"], label: "Organizacja", detail: unsettled ? `${unsettled} nieustalone` : "Ludzie potwierdzeni", done: unsettled === 0 },
        { screen: "tickets", screens: ["crop", "tickets", "materials"], label: "Ryzyka", detail: criticalTickets ? `${criticalTickets} krytyczne` : "Bez krytycznych", done: criticalTickets === 0 },
        { screen: "reports", screens: ["productivity", "reports"], label: "Raport", detail: state.shiftClosed ? "Zmiana zamknięta" : "Oczekuje", done: state.shiftClosed },
      ],
      "Ochrona roślin": [
        { screen: "crop", screens: ["dashboard", "crop"], label: "Obserwacje", detail: highCrop ? `${highCrop} alarmy` : "Brak alarmów", done: highCrop === 0 },
        { screen: "materials", screens: ["materials"], label: "Działania", detail: "Materiały i zabiegi", done: featureState.protectionTaskCreated },
        { screen: "reports", screens: ["reports"], label: "Przekazanie", detail: "Raport kierownika", done: featureState.reportApproved },
      ],
      "Dział techniczny": [
        { screen: "tickets", screens: ["dashboard", "tickets"], label: "Zgłoszenia", detail: criticalTickets ? `${criticalTickets} krytyczne` : "SLA pod kontrolą", done: criticalTickets === 0 },
        { screen: "materials", screens: ["materials"], label: "Realizacja", detail: `${openTickets().length} aktywnych`, done: openTickets().length === 0 },
        { screen: "reports", screens: ["reports"], label: "Przekazanie", detail: "Historia napraw", done: featureState.reportApproved },
      ],
      Kadry: [
        { screen: "attendance", screens: ["dashboard", "attendance"], label: "Czas pracy", detail: unsettled ? `${unsettled} do decyzji` : "Kompletne dane", done: unsettled === 0 },
        { screen: "team", screens: ["team"], label: "Pracownicy", detail: "Dokumenty i bilans", done: false },
        { screen: "reports", screens: ["reports"], label: "Rozliczenie", detail: featureState.reportApproved ? "Zatwierdzone" : "Do zatwierdzenia", done: featureState.reportApproved },
      ],
    };
    const steps = flows[state.role];
    const activeIndex = Math.max(0, steps.findIndex((step) => step.screens.includes(state.screen)));
    return `<section class="workflow-panel" aria-label="Przebieg pracy dla roli ${escapeHtml(state.role)}">
      <header><span><small>TWÓJ PROCES · ${escapeHtml(state.role)}</small><b>Wiesz, co jest teraz i co będzie dalej</b></span><em>Etap ${activeIndex + 1} z ${steps.length}</em></header>
      <div>${steps.map((step, index) => { const active = step.screens.includes(state.screen); const attention = !step.done && ((step.label === "Plan" && missing) || step.label === "Obecność" && unsettled || step.label === "Czas pracy" && unsettled || step.label === "Ryzyka" && criticalTickets || step.label === "Obserwacje" && highCrop || step.label === "Zgłoszenia" && criticalTickets); return `<button class="${active ? "active" : ""} ${step.done ? "done" : ""} ${attention ? "attention" : ""}" data-nav="${step.screen}" ${active ? 'aria-current="step"' : ""}><i>${step.done ? "✓" : attention ? "!" : index + 1}</i><span><b>${step.label}</b><small>${step.detail}</small></span><em>→</em></button>`; }).join("")}</div>
    </section>`;
  }

  function resourceState() {
    const tasks = activeTasks();
    const peopleAssignments = new Map();
    const cartAssignments = new Map();
    tasks.forEach((task) => {
      (task.people || []).forEach((person) => {
        if (!peopleAssignments.has(person)) peopleAssignments.set(person, []);
        peopleAssignments.get(person).push(task);
      });
      if (task.cart && task.cart !== "—") {
        if (!cartAssignments.has(task.cart)) cartAssignments.set(task.cart, []);
        cartAssignments.get(task.cart).push(task);
      }
    });
    const present = context.state.employees.filter((employee) => employee.status === "Obecny");
    const peopleConflicts = [...peopleAssignments.entries()].filter(([, assignments]) => assignments.length > 1);
    const cartConflicts = [...cartAssignments.entries()].filter(([, assignments]) => assignments.length > 1);
    return {
      tasks,
      peopleAssignments,
      cartAssignments,
      peopleConflicts,
      cartConflicts,
      availablePeople: present.filter((employee) => !peopleAssignments.has(employee.name)),
      freeCarts: Math.max(0, 12 - cartAssignments.size),
    };
  }

  function exceptionCenterPanel() {
    const { state } = context;
    const missingPlan = activePlan().reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
    const unsettled = state.employees.filter((employee) => employee.status === "Nieustalony").length;
    const paused = activeTasks().filter((task) => task.status === "Wstrzymane").length;
    const incomplete = scopedTasks().filter((task) => task.status === "Zakończone" && (!task.contributions?.length || !task.result || !task.hours)).length;
    const alarms = openObservations().filter((item) => item.severity === "high").length;
    const critical = openTickets().filter((ticket) => ticket.priority === "Krytyczny").length;
    const unassignedTickets = openTickets().filter((ticket) => ticket.owner.includes("kolejka")).length;
    const lowMaterials = state.materials.filter((item) => item.quantity < item.min).length;
    const allowed = {
      Brygadzista: ["planning", "attendance", "tasks", "crop", "tickets", "materials", "reports"],
      Kierownik: ["planning", "attendance", "tasks", "crop", "tickets", "materials", "reports"],
      "Ochrona roślin": ["crop", "materials", "reports"],
      "Dział techniczny": ["tickets", "materials", "reports"],
      Kadry: ["attendance", "team", "reports"],
    }[state.role];
    const issues = [
      ["attendance", "Nieustalona obecność", unsettled, `${unsettled} osób wymaga decyzji przed rozliczeniem`, "red"],
      ["planning", "Brak obsady planu", missingPlan, `Brakuje ${missingPlan} osób w bieżącym planie`, "amber"],
      ["tasks", "Wstrzymane prace", paused, `${paused} zadań czeka na decyzję brygadzisty`, "red"],
      ["tasks", "Niekompletne wyniki", incomplete, `${incomplete} zakończonych prac nie ma pełnych danych`, "amber"],
      ["crop", "Alarmy upraw", alarms, `${alarms} miejsc wymaga pilnej kontroli`, "red"],
      ["tickets", "Krytyczne zgłoszenia", critical, `${critical} zgłoszeń ma najwyższy priorytet`, "red"],
      ["tickets", "Zgłoszenia bez właściciela", unassignedTickets, `${unassignedTickets} zgłoszeń czeka w kolejce`, "amber"],
      ["materials", "Niskie stany", lowMaterials, `${lowMaterials} materiałów jest poniżej minimum`, "amber"],
    ].filter(([screen, , count]) => allowed.includes(screen) && count > 0);
    return `<section class="v5-exception-center surface" aria-label="Centrum wyjątków"><header><div><span class="kicker">WYMAGA DZIAŁANIA</span><h2>${issues.length ? `${issues.length} typów wyjątków do sprawdzenia` : "Brak wyjątków blokujących zmianę"}</h2><p>${issues.length ? "Każdy przycisk prowadzi bezpośrednio do modułu, w którym można rozwiązać problem." : "System nie wykrył braków wymagających reakcji w Twoim zakresie."}</p></div><span class="v5-exception-total ${issues.length ? "attention" : "ready"}"><b>${issues.reduce((sum, issue) => sum + issue[2], 0)}</b><small>rekordów</small></span></header>${issues.length ? `<div class="v5-exception-list">${issues.map(([screen, title, count, detail, tone]) => `<button class="${tone}" data-module-action="quick-nav" data-target="${screen}"><i>${count}</i><span><b>${title}</b><small>${detail}</small></span><em>Otwórz →</em></button>`).join("")}</div>` : `<div class="v5-exception-ready"><i>✓</i><span><b>Możesz kontynuować bieżący etap.</b><small>Nowe wyjątki pojawią się tutaj automatycznie.</small></span></div>`}</section>`;
  }

  function locationRangeLabel(item) {
    const nave = item.naveEnd && item.naveEnd !== item.nave ? `${item.nave}–${item.naveEnd}` : item.nave;
    return [item.site, item.greenhouseSide, nave, item.entrance, item.passageSide].filter(Boolean).join(" · ");
  }

  function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function planSite() {
    return context.state.role === "Kierownik" ? context.state.selectedPlanSite : context.state.selectedSite;
  }

  function planSiteSnapshot(site) {
    return cloneValue(context.state.plan.filter((item) => item.site === site));
  }

  function ensurePlanVersion(site = planSite()) {
    if (!Array.isArray(featureState.planVersions[site]) || !featureState.planVersions[site].length) {
      featureState.planVersions[site] = [{ number: 1, author: "Kierownik produkcji", createdAt: "05.08.2026 · 05:42", items: planSiteSnapshot(site) }];
      featureState.planAcknowledgements[site] = { version: 1, people: {} };
      saveFeaturePreferences();
    }
    return featureState.planVersions[site];
  }

  function recordPlanVersion(site = planSite()) {
    const versions = ensurePlanVersion(site);
    const version = { number: versions[versions.length - 1].number + 1, author: "Kierownik produkcji", createdAt: `${featureState.workDate} · teraz`, items: planSiteSnapshot(site) };
    versions.push(version);
    featureState.planAcknowledgements[site] = { version: version.number, people: {} };
    featureState.planCompareSite = "";
    saveFeaturePreferences();
    return version;
  }

  function planVersionDifferences(site) {
    const versions = ensurePlanVersion(site);
    if (versions.length < 2) return [];
    const previous = versions[versions.length - 2];
    const current = versions[versions.length - 1];
    const fields = { time: "godziny", title: "rodzaj pracy", nave: "nawa", naveEnd: "zakres naw", assigned: "obsada", need: "zapotrzebowanie", foreman: "brygadzista", target: "norma", instructions: "instrukcja" };
    const previousById = new Map(previous.items.map((item) => [item.id, item]));
    const currentById = new Map(current.items.map((item) => [item.id, item]));
    const changes = [];
    current.items.forEach((item) => {
      const old = previousById.get(item.id);
      if (!old) return changes.push({ title: item.title, detail: "Dodano nową pozycję" });
      const changed = Object.entries(fields).filter(([field]) => String(old[field] ?? "") !== String(item[field] ?? "")).map(([, label]) => label);
      if (changed.length) changes.push({ title: item.title, detail: `Zmieniono: ${changed.join(", ")}` });
    });
    previous.items.filter((item) => !currentById.has(item.id)).forEach((item) => changes.push({ title: item.title, detail: "Usunięto pozycję" }));
    return changes;
  }

  function planVersionPanel() {
    const site = planSite();
    const versions = ensurePlanVersion(site);
    const current = versions[versions.length - 1];
    const responsibility = context.siteResponsibility.find((item) => item.site === site);
    const foremen = responsibility?.foremen || [responsibility?.chief || "Brygadzista"];
    const acknowledgements = featureState.planAcknowledgements[site]?.version === current.number ? featureState.planAcknowledgements[site].people : {};
    const confirmed = foremen.filter((name) => acknowledgements[name]).length;
    const compare = featureState.planCompareSite === site;
    const differences = compare ? planVersionDifferences(site) : [];
    const published = context.state.planPublication[site];
    return `<section class="v7-plan-version ${published ? "published" : "draft"}"><header><div><span class="kicker">WERSJA I POTWIERDZENIA</span><h3>Plan ${escapeHtml(site)} · wersja ${current.number}</h3><p>${published ? `Opublikowany ${escapeHtml(current.createdAt)} przez ${escapeHtml(current.author)}.` : `Zmiany robocze po wersji ${current.number}; brygadziści nadal realizują ostatnią publikację.`}</p></div><span><b>V${current.number}</b><small>${published ? "opublikowana" : "robocza"}</small></span></header><div class="v7-version-body"><div class="v7-ack-list">${foremen.map((name) => `<span class="${acknowledgements[name] ? "done" : "waiting"}"><i>${acknowledgements[name] ? "✓" : "…"}</i><span><b>${escapeHtml(name)}</b><small>${acknowledgements[name] ? `potwierdził ${escapeHtml(acknowledgements[name])}` : "oczekuje na potwierdzenie"}</small></span></span>`).join("")}</div><div class="v7-version-actions"><span><b>${confirmed}/${foremen.length}</b><small>potwierdziło wersję</small></span>${context.state.role === "Kierownik" ? `<button class="secondary" data-module-action="compare-plan-version" ${versions.length < 2 ? "disabled" : ""}>${compare ? "Ukryj porównanie" : "Porównaj wersje"}</button><button class="secondary" data-module-action="rollback-plan-version" ${versions.length < 2 ? "disabled" : ""}>Przywróć poprzednią</button>` : `<button class="primary" data-module-action="confirm-plan-version" ${acknowledgements[responsibility?.chief] ? "disabled" : ""}>${acknowledgements[responsibility?.chief] ? "✓ Potwierdzono" : `Potwierdź wersję ${current.number}`}</button>`}</div></div>${compare ? `<div class="v7-version-compare"><header><b>V${versions[versions.length - 2].number} → V${current.number}</b><small>${differences.length ? `${differences.length} zmian` : "brak różnic danych"}</small></header>${differences.map((change) => `<span><i>↕</i><b>${escapeHtml(change.title)}</b><small>${escapeHtml(change.detail)}</small></span>`).join("") || `<p>Wersję opublikowano ponownie bez zmiany pozycji.</p>`}</div>` : ""}</section>`;
  }

  function chiefForemanPanel() {
    if (context.state.role !== "Brygadzista") return "";
    const site = context.state.selectedSite;
    const responsibility = context.siteResponsibility.find((item) => item.site === site);
    if (!responsibility) return "";
    const tasks = context.state.tasks.filter((task) => task.site === site && task.status !== "Zakończone");
    const issues = openTickets().filter((ticket) => ticket.site === site && ticket.priority === "Krytyczny").length;
    const assignedPeople = new Set(tasks.flatMap((task) => task.people || [])).size;
    return `<section class="v7-chief-panel"><header><div><span class="kicker">GŁÓWNY BRYGADZISTA · ${escapeHtml(site)}</span><h2>${escapeHtml(responsibility.chief)} nadzoruje całą szklarnię</h2><p>Najpierw widać brygady, ich obciążenie i miejsca wymagające decyzji.</p></div><span><b>${responsibility.people}</b><small>osób łącznie</small></span></header><div class="v7-foreman-grid">${responsibility.teams.map((team) => { const foremanTasks = tasks.filter((task) => task.foreman === team.foreman); const sampleAssigned = new Set(foremanTasks.flatMap((task) => task.people || [])).size; const average = foremanTasks.length ? Math.round(foremanTasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / foremanTasks.length) : 0; return `<article><div><i>${team.foreman === responsibility.chief ? "G" : "B"}</i><span><b>${escapeHtml(team.foreman)}</b><small>${team.foreman === responsibility.chief ? "główny brygadzista" : "brygadzista realizujący"}</small></span><em>${foremanTasks.length ? "W realizacji" : "Gotowy"}</em></div><div class="v7-foreman-metrics"><span><small>Brygada</small><b>${team.people} os.</b></span><span><small>Aktywne prace</small><b>${foremanTasks.length}</b></span><span><small>Widoczni w pracach</small><b>${sampleAssigned}</b></span><span><small>Średni postęp</small><b>${average}%</b></span></div><button class="secondary" data-module-action="focus-foreman" data-foreman="${escapeHtml(team.foreman)}">Zobacz prace brygady →</button></article>`; }).join("")}</div><footer><span><small>Przypisani w aktywnych pracach</small><b>${assignedPeople}</b></span><span><small>Wolni w podglądzie</small><b>${resourceState().availablePeople.length}</b></span><span class="${issues ? "attention" : ""}"><small>Problemy krytyczne</small><b>${issues}</b></span><button class="primary" data-nav="tasks">Przenieś ludzi między brygadami</button></footer></section>`;
  }

  function taskForPlan(plan) {
    return context.state.tasks.find((task) => task.planId === plan.id)
      || context.state.tasks.find((task) => task.site === plan.site && task.title === plan.title && task.nave === plan.nave);
  }

  function executionSnapshot(plan) {
    const task = taskForPlan(plan);
    const pause = featureState.pauseReasons[task?.id];
    const finished = task?.status === "Zakończone";
    const blocked = task?.status === "Wstrzymane" || !task && plan.assigned < plan.need;
    const rate = finished && task.hours
      ? `${(task.result / task.hours).toFixed(task.unit === "kg" ? 0 : 2)} ${task.unit}/h`
      : task ? `${task.progress || 0}%` : "0%";
    const plannedEnd = String(plan.time || "").split(/[–-]/).pop() || "—";
    const forecast = finished ? "Zakończono" : blocked ? (pause?.reason || "Wymaga decyzji") : task && (task.progress || 0) < 50 ? `ryzyko po ${plannedEnd}` : task ? `około ${plannedEnd}` : "Nie rozpoczęto";
    return {
      task,
      rate,
      forecast,
      tone: finished ? "done" : blocked ? "blocked" : task ? "active" : "pending",
      status: finished ? "Wykonane" : blocked ? (pause ? `Przestój: ${pause.reason}` : task?.status || "Brak obsady") : task ? "W realizacji" : "Do rozpoczęcia",
    };
  }

  function planExecutionPanel() {
    const plan = activePlan();
    const snapshots = plan.map((item) => ({ item, execution: executionSnapshot(item) }));
    const started = snapshots.filter(({ execution }) => execution.task).length;
    const finished = snapshots.filter(({ execution }) => execution.task?.status === "Zakończone").length;
    const risks = snapshots.filter(({ execution }) => execution.tone === "blocked").length;
    return `<section class="v6-plan-execution" aria-label="Plan kontra wykonanie"><header><div><span class="kicker">PLAN KONTRA WYKONANIE</span><h3>Od razu widać różnicę między założeniem a realizacją</h3><p>Obsada, wynik, postęp i przewidywane zakończenie są połączone z właściwą pracą.</p></div><div class="v6-plan-execution-summary"><span><b>${plan.length}</b><small>zaplanowano</small></span><span><b>${started}</b><small>rozpoczęto</small></span><span><b>${finished}</b><small>wykonano</small></span><span class="${risks ? "attention" : ""}"><b>${risks}</b><small>ryzyka</small></span></div></header><div class="v6-plan-execution-list">${snapshots.map(({ item, execution }) => `<article class="${execution.tone}"><i></i><div class="v6-execution-work"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(locationRangeLabel(item))}</small></div><span><small>Plan</small><b>${item.target} ${item.unit} · ${item.need} os.</b></span><span><small>Wykonanie</small><b>${execution.rate} · ${execution.task?.people?.length || 0} os.</b></span><span><small>Przewidywanie</small><b>${execution.forecast}</b></span><em>${execution.status}</em>${execution.task ? `<button class="secondary" data-module-action="focus-plan-execution" data-task-id="${execution.task.id}" data-task-title="${escapeHtml(execution.task.title)}">Otwórz pracę</button>` : context.state.role === "Brygadzista" ? `<button class="primary" data-module-action="start-plan-item" data-plan-id="${item.id}">Rozpocznij</button>` : `<span class="v6-read-only">Czeka na brygadzistę</span>`}</article>`).join("") || `<div class="v6-empty">Brak pozycji planu w wybranym zakresie.</div>`}</div></section>`;
  }

  function workGroups() {
    const present = context.state.employees.filter((employee) => employee.status === "Obecny");
    const middle = Math.ceil(present.length / 2);
    return [
      { id: "free", label: "Wolni teraz", people: resourceState().availablePeople.map((employee) => employee.name) },
      { id: "team-a", label: "Brygada A", people: present.slice(0, middle).map((employee) => employee.name) },
      { id: "team-b", label: "Brygada B", people: present.slice(middle).map((employee) => employee.name) },
    ];
  }

  function bulkAssignmentPanel() {
    const tasks = activeTasks();
    const groups = workGroups();
    if (context.state.role === "Kierownik") return `<section class="v6-bulk-assignment read-only"><div><span class="kicker">OPERACJE GRUPOWE</span><h3>Brygadzista przenosi ludzi, kierownik widzi rezultat</h3><p>Zmiany obsady są widoczne w aktywnych pracach i kontroli konfliktów.</p></div><span><b>${groups.length}</b><small>gotowe grupy robocze</small></span></section>`;
    return `<form class="v6-bulk-assignment" data-v6-form="bulk-assignment"><header><div><span class="kicker">OPERACJE GRUPOWE</span><h3>Przenieś całą grupę do innej pracy</h3><p>Jedna operacja usuwa ludzi z poprzednich aktywnych prac i zapisuje ich przy nowym zadaniu.</p></div><span><b>${tasks.length}</b><small>aktywnych prac</small></span></header><div><label><span>Grupa</span><select name="group">${groups.map((group) => `<option value="${group.id}">${group.label} · ${group.people.length} os.</option>`).join("")}</select></label><label><span>Praca docelowa</span><select name="task" ${tasks.length ? "" : "disabled"}>${tasks.map((task) => `<option value="${task.id}">${escapeHtml(task.title)} · ${escapeHtml(task.nave)} · ${escapeHtml(task.foreman)}</option>`).join("")}</select></label><label><span>Sposób</span><select name="mode"><option value="move">Przenieś z innych prac</option><option value="free">Dodaj tylko wolnych</option></select></label><button class="primary" ${tasks.length ? "" : "disabled"}>Zastosuj do grupy</button></div></form>`;
  }

  function timeValue(value) {
    const match = String(value || "").match(/(\d{2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  }

  function shiftTimelinePanel() {
    const now = timeValue(featureState.shiftClock);
    const plan = activePlan().map((item) => {
      const [startLabel, endLabel] = String(item.time || "").split(/[–-]/);
      const task = taskForPlan(item);
      const reason = featureState.pauseReasons[task?.id];
      const start = timeValue(startLabel);
      const end = timeValue(endLabel);
      let tone = "next";
      let status = "Następne";
      if (task?.status === "Zakończone") { tone = "done"; status = "Zakończone"; }
      else if (task?.status === "Wstrzymane" || now > end && task?.status !== "Zakończone") { tone = "delayed"; status = reason?.reason || "Opóźnione"; }
      else if (task && now >= start && now <= end) { tone = "now"; status = "Trwa teraz"; }
      else if (task) { tone = "active"; status = "W realizacji"; }
      return { item, task, tone, status, start, reason };
    });
    const firstBreak = context.state.employees.find((employee) => employee.status === "Obecny" && employee.breaks?.length)?.breaks?.[0] || { start: "09:15", minutes: 20 };
    const breakEntry = { break: true, start: timeValue(firstBreak.start), time: `${firstBreak.start} · ${firstBreak.minutes} min`, tone: now >= timeValue(firstBreak.start) && now <= timeValue(firstBreak.start) + Number(firstBreak.minutes) ? "now" : now < timeValue(firstBreak.start) ? "next" : "done" };
    const entries = [...plan, breakEntry].sort((a, b) => a.start - b.start);
    const delayed = plan.filter((entry) => entry.tone === "delayed").length;
    return `<section class="v7-shift-timeline"><header><div><span class="kicker">OŚ BIEŻĄCEJ ZMIANY</span><h3>Teraz, następne i opóźnione</h3><p>Plan, aktywne prace i przerwy są ułożone w kolejności czasu.</p></div><span class="v7-clock"><small>CZAS MAKIETY</small><b>${featureState.shiftClock}</b><em>${delayed ? `${delayed} opóźnione` : "zgodnie z planem"}</em></span></header><div class="v7-timeline-track">${entries.map((entry) => entry.break ? `<article class="break ${entry.tone}"><i>Ⅱ</i><span><small>PRZERWA</small><b>Pierwsza przerwa</b><em>${entry.time} · pierwsze 15 min płatne</em></span></article>` : `<article class="${entry.tone}"><i>${entry.tone === "done" ? "✓" : entry.tone === "delayed" ? "!" : "●"}</i><span><small>${escapeHtml(entry.item.time)}</small><b>${escapeHtml(entry.item.title)}</b><em>${escapeHtml(entry.item.naveEnd && entry.item.naveEnd !== entry.item.nave ? `${entry.item.nave}–${entry.item.naveEnd}` : entry.item.nave)} · ${escapeHtml(entry.status)}</em>${entry.reason ? `<strong>Powód: ${escapeHtml(entry.reason.reason)}</strong>` : ""}</span>${entry.task ? `<button data-module-action="focus-plan-execution" data-task-id="${entry.task.id}" data-task-title="${escapeHtml(entry.task.title)}">Otwórz</button>` : context.state.role === "Brygadzista" ? `<button data-module-action="start-plan-item" data-plan-id="${entry.item.id}">Rozpocznij</button>` : ""}</article>`).join("")}</div></section>`;
  }

  function pauseReasonModal() {
    const task = context.state.tasks.find((item) => item.id === Number(featureState.pauseTaskId));
    if (!task) return "";
    const reasons = ["Brak ludzi", "Awaria wózka", "Brak materiału", "Problem z uprawą", "Oczekiwanie na decyzję", "Przerwa", "Inna przyczyna"];
    return `<div class="modal-backdrop v7-pause-modal"><section class="modal" role="dialog" aria-modal="true" aria-label="Powód wstrzymania pracy"><div class="modal-head"><div><span class="kicker">WSTRZYMANIE PRACY</span><h2>Podaj przyczynę przestoju</h2><p>${escapeHtml(task.title)} · ${escapeHtml(locationRangeLabel(task))}</p></div><button class="icon-btn" data-module-action="close-pause-reason" aria-label="Zamknij">×</button></div><form data-v7-form="pause-reason"><label class="field"><span>Przyczyna</span><select name="reason">${reasons.map((reason) => `<option>${reason}</option>`).join("")}</select></label><label class="field"><span>Co trzeba zrobić, aby wznowić?</span><textarea name="note" rows="3" required placeholder="np. technik sprawdza wózek WZ-03"></textarea></label><label class="field"><span>Odpowiedzialny za rozwiązanie</span><select name="owner"><option>${escapeHtml(task.foreman)}</option><option>Dział techniczny · kolejka</option><option>Ochrona roślin · kolejka</option><option>Kierownik produkcji</option></select></label><div class="hint"><b>i</b><span>Przyczyna pozostanie przy zadaniu i będzie uwzględniona przy ocenie wydajności.</span></div><div class="modal-actions"><button type="button" class="ghost" data-module-action="close-pause-reason">Anuluj</button><button class="primary">Wstrzymaj i zapisz powód</button></div></form></section></div>`;
  }

  function enhanceTaskCards() {
    if (context.state.screen !== "tasks") return;
    context.app.querySelectorAll("[data-task-card-id]").forEach((card) => {
      const task = context.state.tasks.find((item) => item.id === Number(card.dataset.taskCardId));
      if (!task) return;
      const toggle = card.querySelector('[data-action="toggle-task"]');
      if (toggle) {
        toggle.removeAttribute("data-action");
        toggle.dataset.moduleAction = task.status === "Wstrzymane" ? "resume-task" : "open-pause-reason";
        toggle.dataset.taskId = task.id;
        toggle.textContent = task.status === "Wstrzymane" ? "Wznów i zamknij przestój" : "Wstrzymaj z powodem";
      }
      const reason = featureState.pauseReasons[task.id];
      if (reason && task.status === "Wstrzymane") card.querySelector(".task-result")?.insertAdjacentHTML("beforebegin", `<div class="v7-task-pause"><i>!</i><span><small>POWÓD PRZESTOJU</small><b>${escapeHtml(reason.reason)}</b><em>${escapeHtml(reason.note)} · odpowiada ${escapeHtml(reason.owner)}</em></span></div>`);
    });
  }

  function downtimeContextPanel() {
    const records = Object.entries(featureState.pauseReasons).map(([taskId, reason]) => ({ task: context.state.tasks.find((item) => item.id === Number(taskId)), ...reason })).filter((item) => item.task);
    const grouped = records.reduce((result, item) => { result[item.reason] = (result[item.reason] || 0) + 1; return result; }, {});
    return `<section class="v7-downtime-context"><header><div><span class="kicker">KONTEKST WYDAJNOŚCI</span><h3>Wynik nie jest oceniany bez przyczyny przestoju</h3><p>Raport rozdziela czas pracy od awarii, braku materiału, przerwy i oczekiwania na decyzję.</p></div><span><b>${records.length}</b><small>zapisanych przyczyn</small></span></header>${records.length ? `<div>${Object.entries(grouped).map(([reason, count]) => `<span><i>${count}</i><b>${escapeHtml(reason)}</b></span>`).join("")}</div>` : `<p class="v7-no-downtime">✓ Brak zarejestrowanych przestojów w bieżącym zakresie.</p>`}</section>`;
  }

  function handoverPanel() {
    if (!["Brygadzista", "Kierownik"].includes(context.state.role)) return "";
    const saved = featureState.handover;
    const tasks = activeTasks();
    const tickets = openTickets();
    const carts = [...new Set(tasks.map((task) => task.cart).filter(Boolean))];
    const status = saved?.status || "Wysłane";
    if (context.state.role === "Kierownik") return `<section class="v6-handover v7-handover-confirmation ${saved ? "saved" : "waiting"}"><header><div><span class="kicker">PRZEKAZANIE ZMIANY</span><h3>${saved ? `${escapeHtml(saved.site)} przekazała zmianę` : "Oczekiwanie na przekazanie brygadzisty"}</h3><p>${saved ? `${escapeHtml(saved.author)} → ${escapeHtml(saved.recipient)} · ${escapeHtml(saved.savedAt)}` : "Po zapisaniu kierownik zobaczy niezakończone prace, problemy, wózki i notatkę."}</p></div><span class="status-${status.toLowerCase().replace(/ł/g, "l").replace(/ę/g, "e")}"><b>${status === "Przyjęte" ? "✓" : status === "Odczytane" ? "◎" : saved ? "→" : "…"}</b><small>${escapeHtml(status)}</small></span></header>${saved ? `<div class="v6-handover-readout"><span><small>Prace do kontynuacji</small><b>${saved.tasks.length}</b></span><span><small>Otwarte problemy</small><b>${saved.tickets.length}</b></span><span><small>Wózki w użyciu</small><b>${saved.carts.length}</b></span><p><small>Notatka brygadzisty</small><b>${escapeHtml(saved.note)}</b></p></div><form class="v7-handover-accept" data-v7-form="accept-handover"><label><span>Komentarz osoby przejmującej</span><textarea name="comment" rows="2" required placeholder="Potwierdź, co zostanie przejęte na następnej zmianie">${escapeHtml(saved.acceptanceComment || "Przejmuję aktywne prace, wskazane wózki i otwarte problemy.")}</textarea></label><div><button type="button" class="secondary" data-module-action="mark-handover-read" ${status !== "Wysłane" ? "disabled" : ""}>${status === "Wysłane" ? "Oznacz jako odczytane" : "✓ Odczytano"}</button><button class="primary" ${status === "Przyjęte" ? "disabled" : ""}>${status === "Przyjęte" ? "✓ Zmiana przyjęta" : "Przyjmij zmianę"}</button></div>${saved.acceptedAt ? `<small>Przyjął: ${escapeHtml(saved.acceptedBy)} · ${escapeHtml(saved.acceptedAt)}</small>` : ""}</form>` : ""}</section>`;
    const foremen = context.siteResponsibility.find((item) => item.site === context.state.selectedSite)?.foremen || ["Tomasz Wójcik"];
    return `<details class="v6-handover v7-handover-confirmation ${saved ? "saved" : "waiting"}" ${saved ? "" : "open"}><summary><div><span class="kicker">PRZEKAZANIE ZMIANY</span><h3>${saved ? `Przekazanie: ${escapeHtml(status)}` : "Przygotuj następną zmianę"}</h3><p>${saved ? `${escapeHtml(saved.author)} → ${escapeHtml(saved.recipient)} · ${escapeHtml(saved.savedAt)}${saved.acceptanceComment ? ` · komentarz: ${escapeHtml(saved.acceptanceComment)}` : ""}` : "System automatycznie zbiera aktywne prace, problemy i używane wózki."}</p></div><span><b>${status === "Przyjęte" ? "✓" : saved ? "→" : tasks.length + tickets.length}</b><small>${saved ? escapeHtml(status) : "pozycji"}</small></span></summary><form data-v6-form="handover"><div class="v6-handover-auto"><span><small>Niezakończone prace</small><b>${tasks.length}</b><em>${tasks.map((task) => task.title).join(" · ") || "brak"}</em></span><span><small>Otwarte problemy</small><b>${tickets.length}</b><em>${tickets.filter((ticket) => ticket.priority === "Krytyczny").length} krytycznych</em></span><span><small>Wózki pozostające w pracy</small><b>${carts.length}</b><em>${carts.join(" · ") || "brak"}</em></span></div><div class="v6-handover-fields"><label><span>Następna zmiana</span><select name="nextShift"><option>Popołudniowa · 14:00–22:00</option><option>Nocna · 22:00–06:00</option><option>Poranna · 06:00–14:00</option></select></label><label><span>Przekaż do</span><select name="recipient">${foremen.map((name) => `<option>${escapeHtml(name)}</option>`).join("")}</select></label><label class="wide"><span>Najważniejsza informacja dla następnej zmiany</span><textarea name="note" rows="3" required placeholder="Co trzeba dokończyć, sprawdzić lub zabezpieczyć?">${escapeHtml(saved?.note || "Dokończyć aktywne prace i sprawdzić otwarte zgłoszenia przed rozpoczęciem kolejnego zakresu.")}</textarea></label></div><footer><small>Zapis obejmie dokładne miejsca, osoby odpowiedzialne i automatycznie przeniesie niezakończone prace.</small><div>${saved ? `<button type="button" class="secondary" data-module-action="download-handover">Pobierz przekazanie</button>` : ""}<button class="primary">${saved ? "Wyślij zaktualizowane" : "Zapisz i wyślij"}</button></div></footer></form></details>`;
  }

  function designStudioPanel() {
    if (!context.state.review) return "";
    const prefix = `${context.state.role}:${context.state.screen}:`;
    const decisions = Object.entries(designState.decisions).filter(([key]) => key.startsWith(prefix));
    const proposals = designState.proposals.filter((item) => item.role === context.state.role && item.screen === context.state.screen);
    const count = (decision) => decisions.filter(([, value]) => value === decision).length;
    return `<section class="design-studio" aria-label="Projektowanie ekranu"><header><div><span class="kicker">TRYB PROJEKTOWANIA</span><h2>Zdecyduj, co zostawić, zmienić, usunąć lub dodać</h2><p>Każdy blok na ekranie ma własne przyciski oceny. Decyzje zapisują się lokalnie i można je wyeksportować.</p></div><div class="design-summary"><span class="keep"><b>${count("keep")}</b><small>zostawić</small></span><span class="change"><b>${count("change")}</b><small>zmienić</small></span><span class="remove"><b>${count("remove")}</b><small>usunąć</small></span><span class="add"><b>${proposals.length}</b><small>dodać</small></span></div></header>
      <form class="design-add-form" data-design-add-form><label><span>Propozycja nowego elementu</span><input name="proposal" required placeholder="np. dodać informację o nadgodzinach"></label><label><span>Miejsce</span><select name="location"><option>Pod podsumowaniem</option><option>Przed listą</option><option>Na końcu ekranu</option></select></label><button class="primary">+ Dodaj propozycję</button><button type="button" class="ghost" data-module-action="export-design">Eksport decyzji</button><button type="button" class="ghost" data-module-action="clear-design-screen">Wyczyść ekran</button></form>
      ${proposals.length ? `<div class="design-proposals">${proposals.map((item) => `<article><i>+</i><span><b>${escapeHtml(item.text)}</b><small>${escapeHtml(item.location)} · propozycja do makiety</small></span><button data-design-remove-proposal="${item.id}" aria-label="Usuń propozycję">×</button></article>`).join("")}</div>` : ""}
    </section>`;
  }

  function reviewBlockTitle(element, index) {
    return element.querySelector("h1, h2, h3")?.textContent.trim() || element.querySelector(".kicker")?.textContent.trim() || `Blok ${index + 1}`;
  }

  function decorateReviewBlocks() {
    if (!context.state.review) return;
    const blocks = Array.from(context.app.querySelectorAll(".content > section:not(.operations-context):not(.role-focus-panel):not(.design-studio), .content > article"));
    blocks.forEach((block, index) => {
      const identity = Array.from(block.classList).find((name) => !["surface", "single-column"].includes(name)) || "section";
      const key = `${context.state.role}:${context.state.screen}:${identity}-${index}`;
      const decision = designState.decisions[key] || "";
      block.classList.add("design-review-block");
      if (decision) block.classList.add(`design-${decision}`);
      block.dataset.designKey = key;
      block.insertAdjacentHTML("afterbegin", `<div class="design-block-toolbar"><span><i>◆</i>${escapeHtml(reviewBlockTitle(block, index))}</span><div><button class="${decision === "keep" ? "active keep" : ""}" data-design-decision="keep" data-design-key="${escapeHtml(key)}">✓ Zostaw</button><button class="${decision === "change" ? "active change" : ""}" data-design-decision="change" data-design-key="${escapeHtml(key)}">↺ Zmień</button><button class="${decision === "remove" ? "active remove" : ""}" data-design-decision="remove" data-design-key="${escapeHtml(key)}">× Usuń</button></div></div>`);
      if (decision === "remove") block.insertAdjacentHTML("beforeend", '<div class="design-remove-stamp">DO USUNIĘCIA</div>');
    });
  }

  function dashboardPanel() {
    const { state } = context;
    const planScope = state.role === "Brygadzista" ? state.plan.filter((item) => item.site === state.selectedSite) : state.plan;
    const missing = planScope.reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
    const unpublished = state.role === "Brygadzista" ? Number(!state.planPublication[state.selectedSite]) : Object.values(state.planPublication).filter((value) => !value).length;
    const critical = openTickets().filter((ticket) => ticket.priority === "Krytyczny").length;
    const present = state.employees.filter((employee) => employee.status === "Obecny").length;
    const unsettled = state.employees.filter((employee) => employee.status === "Nieustalony").length;
    const cropAlarms = openObservations().filter((item) => item.severity === "high").length;
    const cropQueued = openObservations().filter((item) => item.owner.includes("kolejka")).length;
    const ticketQueued = openTickets().filter((ticket) => ticket.owner.includes("kolejka")).length;
    const cardsByRole = {
      Brygadzista: [
        critical
          ? ["priority", "ZACZNIJ TUTAJ", "Krytyczny problem w Twojej szklarni", `${critical} zgłoszenie wymaga natychmiastowego sprawdzenia.`, "tickets", "Otwórz problem"]
          : unsettled
            ? ["priority", "ZACZNIJ TUTAJ", "Potwierdź obecność brygady", `${unsettled} osoba nadal ma status nieustalony.`, "attendance", "Sprawdź obecność"]
            : ["priority", "ZACZNIJ TUTAJ", "Przejdź do aktualnych prac", `${activeTasks().length} prace są teraz realizowane w ${state.selectedSite}.`, "tasks", "Otwórz prace"],
        ["green", "PLAN KIEROWNIKA", unpublished ? "Plan czeka na publikację" : "Plan jest gotowy do realizacji", missing ? `Do obsady brakuje ${missing} os.` : "Obsada planu jest kompletna.", "planning", "Zobacz plan"],
        ["gold", "NA KONIEC ZMIANY", "Wyniki i raport brygady", "Sprawdź osoby, czas, kilogramy lub rzędy i zamknij zmianę.", "reports", "Przejdź do raportu"],
      ],
      Kierownik: [
        critical
          ? ["priority", "ZACZNIJ TUTAJ", "Reakcja na krytyczne zgłoszenia", `${critical} zgłoszenie ma najwyższy priorytet i aktywne SLA.`, "tickets", "Otwórz zgłoszenia"]
          : missing || unpublished
            ? ["priority", "ZACZNIJ TUTAJ", "Dokończ plan przedsiębiorstwa", `${missing} brakujących osób · ${unpublished} planów roboczych.`, "planning", "Otwórz plan"]
            : ["priority", "ZACZNIJ TUTAJ", "Zmiana jest gotowa do nadzoru", "Plany są opublikowane, a obsada została sprawdzona.", "tasks", "Kontroluj realizację"],
        ["green", "LUDZIE I WYKONANIE", "Sprawdź aktualną realizację", `${present} obecnych · ${activeTasks().length} aktywnych prac.`, "tasks", "Zobacz wykonanie"],
        ["gold", "DECYZJE", "Zatwierdź raport zmiany", "Kompletność danych, wyjątki oraz wynik całego przedsiębiorstwa.", "reports", "Otwórz raport"],
      ],
      "Ochrona roślin": [
        ["priority", "ZACZNIJ TUTAJ", cropAlarms ? "Obsłuż alarmy upraw" : "Sprawdź nowe obserwacje", cropAlarms ? `${cropAlarms} alarmy wymagają oceny i przypisania działania.` : "Brak alarmów wysokiego ryzyka; sprawdź kolejkę obserwacji.", "crop", "Otwórz obserwacje"],
        ["green", "DZIAŁANIA", "Sprawdź materiały ochrony", "Kontroluj dostępność środków i zgłoś zapotrzebowanie dla działań ochronnych.", "materials", "Otwórz materiały"],
        ["gold", "PRZEKAZANIE", "Przygotuj raport ochrony", "Właściciel, działanie, lokalizacja i historia pozostają w jednym wpisie.", "reports", "Otwórz raport"],
      ],
      "Dział techniczny": [
        ["priority", "ZACZNIJ TUTAJ", critical ? "Obsłuż krytyczne zgłoszenie" : "Sprawdź kolejkę techniczną", critical ? `${critical} zgłoszenie wymaga natychmiastowej reakcji.` : `${openTickets().length} aktywnych zgłoszeń do sprawdzenia.`, "tickets", "Otwórz kolejkę"],
        ["green", "CZĘŚCI I MATERIAŁY", "Sprawdź dostępność do napraw", "Zarezerwuj część, wydaj materiał lub zgłoś brak potrzebny do realizacji.", "materials", "Otwórz materiały"],
        ["gold", "PRZEKAZANIE", "Uzupełnij historię napraw", "Status, realizujący, czas reakcji i potwierdzenie rozwiązania.", "reports", "Otwórz raport"],
      ],
      Kadry: [
        ["priority", "ZACZNIJ TUTAJ", unsettled ? "Wyjaśnij nieustaloną obecność" : "Sprawdź czas pracy", unsettled ? `${unsettled} osoba blokuje kompletne rozliczenie.` : "Statusy są kompletne; sprawdź indywidualne godziny i przerwy.", "attendance", "Otwórz czas pracy"],
        ["green", "PRACOWNICY", "Dokumenty i bilans godzin", "Dostępność, kompetencje i kończące się dokumenty.", "team", "Otwórz pracowników"],
        ["gold", "ROZLICZENIE", "Zatwierdź dane kadrowe", "Obecność, czas netto, wyjątki i eksport bieżącej zmiany.", "reports", "Otwórz raport"],
      ],
    };
    const cards = cardsByRole[state.role];
    const startMetric = (value, label, tone = "") => `<span class="${tone}"><b>${value}</b><small>${label}</small></span>`;
    const footerByRole = {
      Brygadzista: `${startMetric(present, "obecnych")}${startMetric(activeTasks().length, "aktywnych prac")}${startMetric(critical, "krytycznych problemów", critical ? "danger" : "")}${startMetric(missing, "brakujących osób", missing ? "warn" : "")}`,
      Kierownik: `${startMetric(present, "obecnych w podglądzie")}${startMetric(activeTasks().length, "aktywnych prac")}${startMetric(critical, "krytycznych problemów", critical ? "danger" : "")}${startMetric(unpublished, "planów roboczych", unpublished ? "warn" : "")}`,
      "Ochrona roślin": `${startMetric(openObservations().length, "aktywnych obserwacji")}${startMetric(cropAlarms, "alarmów", cropAlarms ? "danger" : "")}${startMetric(cropQueued, "bez właściciela", cropQueued ? "warn" : "")}${startMetric(featureState.protectionTaskCreated ? "Tak" : "Nie", "działanie utworzone")}`,
      "Dział techniczny": `${startMetric(openTickets().length, "aktywnych zgłoszeń")}${startMetric(critical, "krytycznych", critical ? "danger" : "")}${startMetric(ticketQueued, "bez technika", ticketQueued ? "warn" : "")}${startMetric(openTickets().filter((ticket) => ticket.status === "W realizacji").length, "w realizacji")}`,
      Kadry: `${startMetric(present, "obecnych")}${startMetric(unsettled, "nieustalonych", unsettled ? "danger" : "")}${startMetric(state.employees.filter((employee) => employee.status === "Obecny" && employee.breaks?.length === 2).length, "z dwiema przerwami")}${startMetric(`${Math.floor(state.employees.reduce((sum, employee) => sum + employeeNetMinutes(employee), 0) / 60)} h`, "czasu netto")}`,
    };
    return `<section class="hydra-start-panel">
      <header><div><span class="kicker">PANEL STARTOWY · ${escapeHtml(state.role)}</span><h2>Najpierw wybierz, czego potrzebujesz</h2><p>Najważniejsza czynność jest zawsze pierwsza. Pozostałe informacje otworzysz dopiero wtedy, gdy będą potrzebne.</p></div><span class="hydra-live"><i></i> ${state.currentOnly ? "Tylko aktualne" : "Aktualne i historia"}</span></header>
      <div class="hydra-action-grid">${cards.map(([tone, label, title, copy, target, buttonLabel], index) => `<article class="hydra-action-card ${tone}"><i class="hydra-card-number">${String(index + 1).padStart(2, "0")}</i><div><span>${label}</span><h3>${title}</h3><p>${copy}</p><button class="${tone === "priority" ? "primary" : "secondary"}" data-module-action="quick-nav" data-target="${target}">${buttonLabel} <b>→</b></button></div></article>`).join("")}</div>
      <footer>${footerByRole[state.role]}</footer>
    </section>`;
  }

  function simplifyDashboard() {
    if (context.state.screen !== "dashboard") return;
    context.app.querySelectorAll(".content > .scope-strip, .content > .hero, .content > .metrics, .content > .two-col").forEach((element) => element.remove());
  }

  function planningPanel() {
    const { state } = context;
    const plan = activePlan();
    const missing = plan.reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
    const high = plan.filter((item) => item.priority === "Wysoki").length;
    const published = state.role === "Kierownik" ? state.planPublication[state.selectedPlanSite] : state.role === "Brygadzista" ? state.planPublication[state.selectedSite] : Object.values(state.planPublication).every(Boolean);
    const resources = resourceState();
    const conflicts = resources.peopleConflicts.length + resources.cartConflicts.length;
    return `<section class="module-upgrade planning-upgrade">
      <div class="upgrade-head"><div><span class="kicker">${state.role === "Kierownik" ? "KONTROLA PRZED PUBLIKACJĄ" : "PLAN DO REALIZACJI"}</span><h2>${state.role === "Kierownik" ? "Plan kompletny i bez konfliktów" : "Sprawdź instrukcję i potwierdź plan"}</h2><p>${state.role === "Kierownik" ? "Data, obsada, odpowiedzialność i norma są sprawdzane dla wybranego obiektu." : "W tym ekranie brygadzista sprawdza zakres, obsadę, normę i instrukcję kierownika."}</p></div><div class="upgrade-actions">${state.role === "Kierownik" ? `<button class="secondary" data-module-action="copy-plan">Kopiuj na jutro</button><button class="secondary" data-module-action="balance-plan">Zaproponuj obsadę</button><button class="primary" data-module-action="validate-plan">Sprawdź plan</button>` : `<button class="primary" data-module-action="acknowledge-plan">${featureState.planAcknowledged ? "✓ Plan potwierdzony" : "Potwierdź zapoznanie"}</button>`}</div></div>
      <div class="upgrade-metrics">${metric("Pozycje", plan.length, "dla wybranego obiektu")}${metric("Brakujące osoby", missing, missing ? "do przydzielenia" : "obsada kompletna", missing ? "amber" : "green")}${metric("Wysoki priorytet", high, "pozycji do omówienia", high ? "red" : "green")}${metric("Publikacja", published ? "Gotowa" : "Robocza", published ? "brygadziści widzą plan" : "wymaga publikacji", published ? "green" : "blue")}</div>
      <div class="publication-checklist"><span class="${plan.length ? "done" : ""}"><i>${plan.length ? "✓" : "1"}</i><b>Zadania</b><small>${plan.length ? `${plan.length} pozycji` : "brak pozycji"}</small></span><span class="${missing === 0 ? "done" : "warn"}"><i>${missing === 0 ? "✓" : "2"}</i><b>Obsada</b><small>${missing ? `brakuje ${missing} os.` : "kompletna"}</small></span><span class="${plan.every((item) => item.foreman && item.chief) ? "done" : ""}"><i>✓</i><b>Odpowiedzialność</b><small>główny + realizujący</small></span><span class="${published ? "done" : ""}"><i>${published ? "✓" : "4"}</i><b>Publikacja</b><small>${featureState.planValidated ? "sprawdzono teraz" : published ? "opublikowany" : "oczekuje"}</small></span></div>
      <div class="v5-plan-resources ${conflicts ? "attention" : "ready"}"><span><small>Dostępni teraz</small><b>${resources.availablePeople.length} osób · ${resources.freeCarts} wózków</b></span><span><small>Konflikty bieżących przydziałów</small><b>${conflicts || "brak"}</b></span><button class="secondary" data-nav="tasks">Sprawdź zasoby w Pracach →</button></div>
      ${planVersionPanel()}
      ${planExecutionPanel()}
      ${featureState.planCopied ? `<div class="inline-confirmation">✓ Utworzono roboczą kopię planu na następny dzień. Można ją dalej redagować.</div>` : featureState.planAcknowledged ? `<div class="inline-confirmation">✓ Brygadzista potwierdził zapoznanie z bieżącą wersją planu.</div>` : ""}
    </section>`;
  }

  function attendancePanel() {
    const { state } = context;
    const present = state.employees.filter((employee) => employee.status === "Obecny").length;
    const unsettled = state.employees.filter((employee) => employee.status === "Nieustalony").length;
    const absent = state.employees.length - present - unsettled;
    const netMinutes = state.employees.reduce((sum, employee) => sum + employeeNetMinutes(employee), 0);
    const paidBreakMinutes = state.employees.reduce((sum, employee) => sum + (employee.status === "Obecny" ? breakAccounting(employee).paid : 0), 0);
    const sitePeople = context.siteResponsibility?.find((item) => item.site === state.selectedSite)?.people || 55;
    const scopePeople = state.role === "Brygadzista" ? sitePeople : state.role === "Kadry" ? context.companyEmployeeCount : state.role === "Kierownik" ? context.greenhouseEmployeeCount : state.employees.length;
    const scopeLabel = state.role === "Brygadzista" ? `${state.selectedSite} · ${scopePeople} osób łącznie` : state.role === "Kierownik" ? `${scopePeople} osób w 6 szklarniach` : state.role === "Kadry" ? `${scopePeople} osób w przedsiębiorstwie` : "przykładowy podgląd";
    return `<section class="module-upgrade attendance-upgrade">
      <div class="upgrade-head"><div><span class="kicker">ELASTYCZNY CZAS PRACY</span><h2>Kompaktowa lista godzin i przerw</h2><p>Kliknij pracownika, aby rozwinąć szczegóły. Pierwsze 15 minut pierwszej przerwy jest płatne i pozostaje w czasie pracy.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="attendance-reminder">Przypomnij o potwierdzeniu</button><button class="primary" data-module-action="save-schedule">Zapisz czas i przerwy</button></div></div>
      <div class="upgrade-metrics">${metric("Obecni w podglądzie", present, `${state.employees.length} kart · ${scopeLabel}`)}${metric("Czas netto", `${Math.floor(netMinutes / 60)} h ${netMinutes % 60} min`, "z uwzględnieniem płatnej przerwy", "blue")}${metric("Płatne przerwy", `${paidBreakMinutes} min`, "do 15 min pierwszej przerwy")}${metric("Nieustaleni", unsettled, unsettled ? "wymagają decyzji" : "statusy kompletne", unsettled ? "amber" : "green")}</div>
      <div class="filter-row"><span>Filtr listy</span>${segmented("attendance", ["Wszyscy", "Obecni", "Nieustaleni", "Nieobecni"], featureState.attendanceFilter)}<small class="filter-result">${featureState.scheduleSaved ? "✓ harmonogram zapisany" : featureState.reminderSent ? "✓ przypomnienie zapisane" : `${absent} nieobecnych`}</small></div>
    </section>`;
  }

  function tasksPanel() {
    const tasks = scopedTasks();
    const running = tasks.filter((task) => task.status === "W trakcie");
    const paused = tasks.filter((task) => task.status === "Wstrzymane");
    const complete = tasks.filter((task) => task.status === "Zakończone");
    const people = new Set(activeTasks().flatMap((task) => task.people)).size;
    const resources = resourceState();
    const conflictCount = resources.peopleConflicts.length + resources.cartConflicts.length;
    return `<section class="module-upgrade tasks-upgrade">
      <div class="upgrade-head"><div><span class="kicker">STEROWANIE REALIZACJĄ</span><h2>Prace, ludzie i postęp w jednym miejscu</h2><p>Filtruj kolejkę, aktualizuj postęp i reaguj na zadania wstrzymane.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="advance-tasks">+10% do aktywnych</button><button class="primary" data-module-action="open-first-task">Otwórz najpilniejszą</button></div></div>
      <div class="upgrade-metrics">${metric("W trakcie", running.length, "aktywnych prac")}${metric("Wstrzymane", paused.length, paused.length ? "wymagają decyzji" : "brak blokad", paused.length ? "red" : "green")}${metric("Zakończone", complete.length, "z pełnym wynikiem", "blue")}${metric("Zaangażowani", people, "unikalnych osób")}</div>
      <div class="filter-row"><span>Status prac</span>${segmented("tasks", ["Wszystkie", "W trakcie", "Wstrzymane", "Zakończone"], featureState.taskFilter)}</div>
      ${shiftTimelinePanel()}
      <section class="v5-resource-board"><header><div><span class="kicker">ASYSTENT ZASOBÓW</span><h3>Ludzie i wózki bez podwójnych przydziałów</h3></div><span class="${conflictCount ? "attention" : "ready"}">${conflictCount ? `${conflictCount} konflikty` : "✓ Bez konfliktów"}</span></header><div class="v5-resource-metrics"><span><small>Wolni pracownicy</small><b>${resources.availablePeople.length}</b></span><span><small>Przypisani</small><b>${resources.peopleAssignments.size}</b></span><span><small>Wolne wózki</small><b>${resources.freeCarts}/12</b></span><span><small>Konflikty</small><b>${conflictCount}</b></span></div>${conflictCount ? `<div class="v5-conflict-list">${resources.peopleConflicts.map(([person, assignments]) => `<span><i>!</i><b>${escapeHtml(person)}</b><small>${assignments.map((task) => task.title).join(" · ")}</small></span>`).join("")}${resources.cartConflicts.map(([cart, assignments]) => `<span><i>!</i><b>${escapeHtml(cart)}</b><small>${assignments.map((task) => task.title).join(" · ")}</small></span>`).join("")}</div>` : `<p class="v5-resource-ok">Każda osoba i każdy wózek ma tylko jedno aktywne przypisanie.</p>`}<footer><button class="secondary" data-module-action="show-resource-conflicts" ${conflictCount ? "" : "disabled"}>Pokaż konflikty</button>${context.state.role !== "Kierownik" ? `<button class="primary" data-action="new-task">Przydziel pracę</button>` : `<span>Kierownik widzi konflikty; brygadzista zmienia obsadę.</span>`}</footer></section>
      ${bulkAssignmentPanel()}
    </section>`;
  }

  function productivityPanel() {
    const results = scopedTasks().flatMap((task) => (task.contributions || []).map((entry) => ({ ...entry, unit: task.unit })));
    const kg = results.filter((entry) => entry.unit === "kg");
    const rows = results.filter((entry) => entry.unit === "rz.");
    const kgRate = kg.length ? Math.round(kg.reduce((sum, entry) => sum + entry.result / entry.hours, 0) / kg.length) : 0;
    const rowRate = rows.length ? (rows.reduce((sum, entry) => sum + entry.result / entry.hours, 0) / rows.length).toFixed(2) : "0.00";
    return `<section class="module-upgrade productivity-upgrade">
      <div class="upgrade-head"><div><span class="kicker">NORMY I TREND</span><h2>Porównuj tylko zgodne jednostki</h2><p>Kilogramy i rzędy są analizowane osobno, aby wynik był czytelny i uczciwy.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="check-productivity">Sprawdź wyniki poniżej normy</button><button class="primary" data-module-action="download-productivity">Eksportuj wyniki</button></div></div>
      <div class="upgrade-metrics">${metric("Średnio kg/h", kgRate, `${kg.length} zapisanych wyników`)}${metric("Średnio rz./h", rowRate, `${rows.length} zapisanych wyników`, "blue")}${metric("Powyżej normy", results.filter((entry) => entry.result / entry.hours >= (entry.unit === "kg" ? 120 : 1)).length, "indywidualnych wyników")}${metric("Do wsparcia", results.filter((entry) => entry.result / entry.hours < (entry.unit === "kg" ? 120 : .75)).length, "sprawdź przyczynę", "amber")}</div>
      <div class="filter-row"><span>Jednostka</span>${segmented("productivity", ["Wszystkie", "kg/h", "rz./h"], featureState.productivityUnit)}<small class="filter-result">Normy: zbiór 120 kg/h · prace rzędowe zależnie od rodzaju</small></div>
      ${downtimeContextPanel()}
    </section>`;
  }

  function teamPanel() {
    const { state } = context;
    const mentors = Array.from(context.app.querySelectorAll(".team-row")).filter((row) => row.textContent.toLowerCase().includes("mentor")).length;
    const available = state.employees.filter((employee) => employee.status === "Obecny").length;
    const expiring = Array.from(context.app.querySelectorAll(".team-row")).filter((row) => /08\.2026|09\.2026/.test(row.textContent)).length;
    const assignedPeople = new Set(activeTasks().flatMap((task) => task.people)).size;
    return `<section class="module-upgrade team-upgrade">
      <div class="upgrade-head"><div><span class="kicker">DOSTĘPNOŚĆ I OBCIĄŻENIE</span><h2>Dobieraj ludzi według gotowości</h2><p>Status, kompetencje, obciążenie i dokumenty są widoczne w jednej karcie pracownika.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="set-team-expiring">Dokumenty do odnowienia</button><button class="primary" data-module-action="download-team">Eksportuj listę pracowników</button></div></div>
      <div class="upgrade-metrics">${metric("Dostępni", available, "w przykładowej brygadzie")}${metric("Już przydzieleni", assignedPeople, "do aktywnych prac", "blue")}${metric("Dokumenty", expiring, "wygasają do 60 dni", expiring ? "amber" : "green")}${metric("Mentorzy", mentors, "mogą wspierać wdrożenie")}</div>
      <div class="filter-row"><span>Widok zespołu</span>${segmented("team", ["Wszyscy", "Dostępni", "Mentorzy", "Dokumenty"], featureState.teamFilter)}</div>
    </section>`;
  }

  function cropPanel() {
    const canManage = context.state.role === "Ochrona roślin" || context.state.role === "Kierownik";
    const observations = openObservations();
    const high = observations.filter((item) => item.severity === "high").length;
    const medium = observations.filter((item) => item.severity === "medium").length;
    const unassigned = observations.filter((item) => item.owner.includes("kolejka")).length;
    return `<section class="module-upgrade crop-upgrade">
      <div class="upgrade-head"><div><span class="kicker">${canManage ? "KOLEJKA OCHRONY ROŚLIN" : "OBSERWACJE MOJEJ SZKLARNI"}</span><h2>${canManage ? "Od obserwacji do działania" : "Zgłoś objaw i śledź odpowiedź"}</h2><p>${canManage ? "Najpierw alarmy, następnie wpisy do kontroli i obserwacja zmian w czasie." : "Brygadzista zgłasza miejsce i objaw; ocenę, działanie oraz zamknięcie prowadzi ochrona roślin."}</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="focus-high-observation">Pokaż pierwszy alarm</button>${canManage ? `<button class="primary" data-module-action="create-protection-task">Utwórz działanie</button>` : `<button class="primary" data-module-action="report-observation">+ Zgłoś obserwację</button>`}</div></div>
      <div class="upgrade-metrics">${metric("Alarmy", high, "wysoki poziom", high ? "red" : "green")}${metric("Do kontroli", medium, "średni poziom", medium ? "amber" : "green")}${metric("Bez właściciela", unassigned, "czeka w kolejce", unassigned ? "blue" : "green")}${metric("Aktywne", observations.length, "we wszystkich szklarniach")}</div>
      <div class="filter-row"><span>Poziom ryzyka</span>${segmented("crop", ["Wszystkie", "Alarm", "Do kontroli", "Obserwacja"], featureState.cropFilter)}${featureState.protectionTaskCreated ? `<small class="filter-result">✓ działanie przypisane</small>` : ""}</div>
    </section>`;
  }

  function ticketsPanel() {
    const canManage = context.state.role === "Dział techniczny" || context.state.role === "Kierownik";
    const tickets = openTickets();
    const critical = tickets.filter((ticket) => ticket.priority === "Krytyczny").length;
    const newCount = tickets.filter((ticket) => ticket.status === "Nowe").length;
    const queued = tickets.filter((ticket) => ticket.owner.includes("kolejka")).length;
    return `<section class="module-upgrade tickets-upgrade">
      <div class="upgrade-head"><div><span class="kicker">${canManage ? "SLA I ODPOWIEDZIALNOŚĆ" : "PROBLEMY MOJEGO OBIEKTU"}</span><h2>${canManage ? "Każde zgłoszenie ma właściciela" : "Zgłoś problem i sprawdź postęp"}</h2><p>${canManage ? "Źródło informacji, zgłaszający, realizujący i historia decyzji pozostają razem." : "Brygadzista widzi tylko zgłoszenia swojej szklarni. Status i realizującego aktualizuje dział techniczny."}</p></div><div class="upgrade-actions">${canManage ? `<button class="secondary" data-module-action="assign-ticket-queue">Przypisz kolejkę</button>` : `<button class="secondary" data-module-action="report-ticket">+ Nowe zgłoszenie</button>`}<button class="primary" data-module-action="open-critical-ticket">Otwórz krytyczne</button></div></div>
      <div class="upgrade-metrics">${metric("Krytyczne", critical, "reakcja natychmiastowa", critical ? "red" : "green")}${metric("Nowe", newCount, "czekają na przyjęcie", newCount ? "amber" : "green")}${metric("W kolejce", queued, "bez osoby realizującej", queued ? "blue" : "green")}${metric("Aktywne", tickets.length, "wszystkie kategorie")}</div>
      <div class="sla-lane"><span><small>NOWE</small><b>${newCount}</b></span><i>→</i><span><small>PRZYJĘTE</small><b>${tickets.filter((ticket) => ticket.status === "Przyjęte").length}</b></span><i>→</i><span><small>W REALIZACJI</small><b>${tickets.filter((ticket) => ticket.status === "W realizacji").length}</b></span><i>→</i><span><small>ZAMKNIĘTE DZISIAJ</small><b>${context.state.tickets.filter((ticket) => ticket.status === "Zamknięte").length}</b></span></div>
    </section>`;
  }

  function materialsPanel() {
    const { state } = context;
    const canOrder = state.role === "Kierownik";
    const low = lowMaterials();
    const reserved = context.state.materials.filter((item) => item.reserved).reduce((sum, item) => sum + item.reserved, 0);
    return `<section class="module-upgrade materials-upgrade">
      <div class="upgrade-head"><div><span class="kicker">PROGNOZA ZAPASU</span><h2>${canOrder ? "Zamów zanim materiał się skończy" : "Pobierz lub zgłoś potrzebny materiał"}</h2><p>${canOrder ? "Stan minimalny, rezerwacje i przewidywane zużycie wspierają planowanie zmiany." : "Widzisz stan potrzebny do swojej pracy. Zamówienie zatwierdza kierownik."}</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="${state.role === "Brygadzista" ? "reserve-materials" : "request-materials"}">${state.role === "Brygadzista" ? "Rezerwuj do planu" : "Zgłoś zapotrzebowanie"}</button>${canOrder ? `<button class="primary" data-module-action="create-material-orders">Zamów braki</button>` : ""}</div></div>
      <div class="upgrade-metrics">${metric("Poniżej minimum", low.length, "pozycje do zamówienia", low.length ? "red" : "green")}${metric("Rezerwacje", reserved, "jednostek dla planu", "blue")}${metric("Pozycje magazynowe", context.state.materials.length, "w demonstracji")}${metric("Zamówienie", featureState.materialOrderCreated ? "Utworzone" : "Oczekuje", featureState.materialOrderCreated ? "przekazane do akceptacji" : "dla niskich stanów", featureState.materialOrderCreated ? "green" : "amber")}</div>
      <div class="forecast-list">${context.state.materials.map((item) => { const below = item.quantity < item.min; const days = Math.max(1, Math.round(item.quantity / Math.max(1, item.min / 7))); return `<span class="${below ? "low" : ""}"><i>${below ? "!" : "✓"}</i><b>${item.name}</b><small>${below ? `poniżej minimum · około ${days} dni zapasu` : `stan bezpieczny · około ${days} dni`}</small></span>`; }).join("")}</div>
    </section>`;
  }

  function reportsPanel() {
    const { state } = context;
    const canApprove = state.role === "Kierownik" || state.role === "Kadry";
    const tasks = scopedTasks();
    const unsettled = state.employees.filter((employee) => employee.status === "Nieustalony").length;
    const incomplete = tasks.filter((task) => task.status === "Zakończone" && (!task.result || !task.hours || !task.contributions?.length)).length;
    const openCritical = openTickets().filter((ticket) => ticket.priority === "Krytyczny").length;
    const observations = openObservations();
    const tickets = openTickets();
    const ready = state.role === "Kadry" ? unsettled === 0 : unsettled + incomplete === 0;
    let metricsHtml;
    let readinessHtml;
    if (state.role === "Ochrona roślin") {
      const high = observations.filter((item) => item.severity === "high").length;
      const queued = observations.filter((item) => item.owner.includes("kolejka")).length;
      metricsHtml = `${metric("Aktywne obserwacje", observations.length, "w zakresie ochrony")}${metric("Alarmy", high, "wymagają dalszego działania", high ? "red" : "green")}${metric("Bez właściciela", queued, "czeka w kolejce", queued ? "amber" : "green")}${metric("Status przekazania", queued ? "Niekompletny" : "Gotowy", "raport działu", queued ? "blue" : "green")}`;
      readinessHtml = `<span class="${high ? "blocked" : "done"}"><i>${high ? "!" : "✓"}</i><b>Alarmy</b><small>${high ? `${high} aktywne` : "brak"}</small></span><span class="${queued ? "blocked" : "done"}"><i>${queued ? "!" : "✓"}</i><b>Odpowiedzialność</b><small>${queued ? `${queued} bez właściciela` : "przypisana"}</small></span><span class="done"><i>✓</i><b>Lokalizacje</b><small>pełna ścieżka miejsca</small></span><span><i>4</i><b>Przekazanie</b><small>dla kierownika</small></span>`;
    } else if (state.role === "Dział techniczny") {
      const queued = tickets.filter((ticket) => ticket.owner.includes("kolejka")).length;
      metricsHtml = `${metric("Aktywne zgłoszenia", tickets.length, "w zakresie technicznym")}${metric("Krytyczne", openCritical, "wymagają reakcji", openCritical ? "red" : "green")}${metric("Bez technika", queued, "czeka w kolejce", queued ? "amber" : "green")}${metric("Status przekazania", queued ? "Niekompletny" : "Gotowy", "raport działu", queued ? "blue" : "green")}`;
      readinessHtml = `<span class="${openCritical ? "blocked" : "done"}"><i>${openCritical ? "!" : "✓"}</i><b>Krytyczne SLA</b><small>${openCritical ? `${openCritical} aktywne` : "brak"}</small></span><span class="${queued ? "blocked" : "done"}"><i>${queued ? "!" : "✓"}</i><b>Odpowiedzialność</b><small>${queued ? `${queued} bez technika` : "przypisana"}</small></span><span class="done"><i>✓</i><b>Historia</b><small>zmiany zapisane</small></span><span><i>4</i><b>Przekazanie</b><small>dla kierownika</small></span>`;
    } else if (state.role === "Kadry") {
      const absent = state.employees.filter((employee) => employee.status !== "Obecny" && employee.status !== "Nieustalony").length;
      metricsHtml = `${metric("Nieustalona obecność", unsettled, unsettled ? "blokuje rozliczenie" : "kompletna", unsettled ? "red" : "green")}${metric("Nieobecni", absent, "urlop lub zwolnienie", "blue")}${metric("Karty pracowników", state.employees.length, "w bieżącym podglądzie")}${metric("Status danych", featureState.reportApproved ? "Zatwierdzone" : ready ? "Gotowe" : "Niekompletne", "raport kadrowy", ready ? "green" : "blue")}`;
      readinessHtml = `<span class="${unsettled ? "blocked" : "done"}"><i>${unsettled ? "!" : "✓"}</i><b>Obecność</b><small>${unsettled ? `${unsettled} do wyjaśnienia` : "kompletna"}</small></span><span class="done"><i>✓</i><b>Godziny</b><small>policzone</small></span><span class="done"><i>✓</i><b>Dokumenty</b><small>sprawdzone</small></span><span class="${featureState.reportApproved ? "done" : ""}"><i>${featureState.reportApproved ? "✓" : "4"}</i><b>Decyzja</b><small>${featureState.reportApproved ? "zatwierdzono" : "oczekuje"}</small></span>`;
    } else {
      metricsHtml = `${metric("Nieustalona obecność", unsettled, unsettled ? "blokuje zamknięcie" : "kompletna", unsettled ? "red" : "green")}${metric("Brakujące wyniki", incomplete, incomplete ? "uzupełnij zadania" : "wszystkie zapisane", incomplete ? "amber" : "green")}${metric("Krytyczne problemy", openCritical, "przejdą do następnej zmiany", openCritical ? "red" : "green")}${metric("Status raportu", featureState.reportApproved ? "Zatwierdzony" : ready ? "Gotowy" : "Niekompletny", featureState.reportApproved ? "zapisano decyzję" : ready ? "można przekazać" : "usuń blokady", ready ? "green" : "blue")}`;
      readinessHtml = `<span class="${unsettled ? "blocked" : "done"}"><i>${unsettled ? "!" : "✓"}</i><b>Obecność</b><small>${unsettled ? `${unsettled} do wyjaśnienia` : "kompletna"}</small></span><span class="${incomplete ? "blocked" : "done"}"><i>${incomplete ? "!" : "✓"}</i><b>Wyniki prac</b><small>${incomplete ? `${incomplete} braków` : "kompletne"}</small></span><span class="done"><i>✓</i><b>Lokalizacje</b><small>pełna ścieżka miejsca</small></span><span class="${featureState.reportApproved ? "done" : ""}"><i>${featureState.reportApproved ? "✓" : "4"}</i><b>${canApprove ? "Decyzja" : "Przekazanie"}</b><small>${featureState.reportApproved ? "zatwierdzono" : "oczekuje"}</small></span>`;
    }
    return `<section class="module-upgrade reports-upgrade">
      <div class="upgrade-head"><div><span class="kicker">KOMPLETNOŚĆ ZMIANY</span><h2>${canApprove ? "Raport gotowy do zatwierdzenia" : "Raport z Twojego zakresu"}</h2><p>${canApprove ? "Przed zatwierdzeniem system sprawdza obecność, wyniki, osoby, lokalizacje i otwarte ryzyka." : "Eksport obejmuje tylko dane dostępne dla Twojej roli i obiektu."}</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="download-full-report">Eksport mojego zakresu</button>${canApprove ? `<button class="primary" data-module-action="approve-report" ${!ready ? "disabled" : ""}>${featureState.reportApproved ? "✓ Zatwierdzono" : "Zatwierdź raport"}</button>` : ""}</div></div>
      <div class="upgrade-metrics">${metricsHtml}</div>
      <div class="report-readiness">${readinessHtml}</div>
    </section>${handoverPanel()}`;
  }

  function modulePanel() {
    return ({
      dashboard: dashboardPanel,
      planning: planningPanel,
      attendance: attendancePanel,
      tasks: tasksPanel,
      productivity: productivityPanel,
      team: teamPanel,
      crop: cropPanel,
      tickets: ticketsPanel,
      materials: materialsPanel,
      reports: reportsPanel,
    }[context.state.screen] || dashboardPanel)();
  }

  function loginEnhancement() {
    const roleGrid = context.app.querySelector(".role-grid");
    if (!roleGrid) return;
    roleGrid.insertAdjacentHTML("afterend", `<section class="login-capabilities"><span><i>01</i><b>Wybierz rolę</b><small>Zobacz dokładnie jej zakres decyzji.</small></span><span><i>02</i><b>Przejdź proces</b><small>Od planu przez ludzi do raportu.</small></span><span><i>03</i><b>Zapisz uwagi</b><small>Oceń, co pasuje przed wdrożeniem.</small></span></section>`);
  }

  function renderFlexibleAttendance() {
    if (context.state.screen !== "attendance") return;
    const legacy = Array.from(context.app.querySelectorAll(".content > section.surface")).find((section) => section.querySelector(".table .tr.head"));
    if (!legacy) return;
    legacy.className = "time-roster-shell surface";
    const statusOrder = { Nieustalony: 0, Obecny: 1, Urlop: 2, Zwolnienie: 3 };
    const employees = [...context.state.employees].sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || a.name.localeCompare(b.name));
    legacy.innerHTML = `<header class="time-roster-head"><div><span class="kicker">KOMPAKTOWA LISTA OBECNOŚCI</span><h3>Pracownicy, godziny i przerwy</h3><p>Najpierw widzisz tylko podsumowanie. Kliknij wiersz pracownika, aby zmienić jego harmonogram.</p></div><div class="time-legend"><span><i class="green"></i>czas netto</span><span><i class="amber"></i>15 min płatne</span><span><i class="blue"></i>czas obecności</span></div></header>
      <div class="time-roster">${employees.map((employee) => {
        const present = employee.status === "Obecny";
        const breaks = employee.breaks || [];
        const accounting = breakAccounting(employee);
        const net = employeeNetMinutes(employee);
        const gross = present ? net + accounting.deducted : 0;
        const expanded = featureState.expandedTimeCards.includes(employee.id) || employee.status === "Nieustalony";
        return `<details class="time-worker-card ${present ? "" : "inactive"}" data-time-card-id="${employee.id}" ${expanded ? "open" : ""}>
          <summary><span class="person"><i class="avatar">${employee.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</i><span>${employeeNameLink(employee)}<span class="employee-identity-meta"><small>${employee.code}</small>${employeeLanguageChip(employee)}</span></span></span><span class="time-worker-summary"><em>${employee.status}</em><span class="time-range"><small>Godziny</small><b>${present ? `${employee.start}–${employee.end}` : "—"}</b></span><span class="time-break-summary"><small>Przerwy</small><b>${present ? `${accounting.total} min · ${accounting.paid} płatne` : "—"}</b></span><strong>${present ? `${formatMinutes(net)} netto` : "Brak godzin"}</strong><i class="time-chevron">⌄</i></span></summary>
          <div class="time-worker-details"><div class="time-card-grid"><label><span>Status</span><select data-change="attendance" data-id="${employee.id}" aria-label="Status ${escapeHtml(employee.name)}">${["Obecny", "Urlop", "Zwolnienie", "Nieustalony"].map((status) => `<option ${employee.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label><label><span>Szablon</span><select data-time-template data-id="${employee.id}" ${present ? "" : "disabled"}><option value="custom">Indywidualnie</option><option value="early">05:45–14:00 · 1 przerwa</option><option value="double">06:00–14:30 · 2 przerwy</option><option value="late">07:00–15:30 · 1 przerwa</option></select></label><label><span>Start</span><input type="time" value="${present ? employee.start : ""}" data-time-field="start" data-id="${employee.id}" ${present ? "" : "disabled"}></label><label><span>Koniec</span><input type="time" value="${present ? employee.end : ""}" data-time-field="end" data-id="${employee.id}" ${present ? "" : "disabled"}></label><label><span>Liczba przerw</span><select data-break-count data-id="${employee.id}" ${present ? "" : "disabled"}><option value="1" ${breaks.length === 1 ? "selected" : ""}>1 przerwa</option><option value="2" ${breaks.length === 2 ? "selected" : ""}>2 przerwy</option></select></label></div>
          <div class="break-editor">${present ? breaks.map((item, index) => `<div><span><b>Przerwa ${index + 1}</b><small>${item.start} · ${item.minutes} min${index === 0 ? ` · ${accounting.paid} min płatne` : ""}</small></span><label><span>Od</span><input type="time" value="${item.start}" data-break-start data-break-index="${index}" data-id="${employee.id}"></label><label><span>Minuty</span><input type="number" min="5" max="90" step="5" value="${item.minutes}" data-break-minutes data-break-index="${index}" data-id="${employee.id}"></label></div>`).join("") : `<div class="break-empty">Przerwy nie są liczone przy statusie „${employee.status}”.</div>`}</div>
          <footer><label><span>Notatka do czasu pracy</span><input value="${escapeHtml(employee.timeNote || "")}" placeholder="np. późniejszy przyjazd" data-time-note data-id="${employee.id}"></label><div class="time-total"><span><small>Obecność</small><b>${present ? formatMinutes(gross) : "—"}</b></span><i>−</i><span><small>Do odliczenia</small><b>${present ? `${accounting.deducted} min` : "—"}</b></span><i>=</i><span class="net"><small>Do rozliczenia</small><b>${present ? formatMinutes(net) : "—"}</b></span></div></footer></div>
        </details>`;
      }).join("")}</div>
      <footer class="time-roster-foot"><span><b>Zasada rozliczenia:</b> pierwsze 15 minut pierwszej przerwy jest wliczone do godzin pracy. Odliczana jest pozostała część pierwszej przerwy i cała druga przerwa.</span><button class="primary" data-module-action="save-schedule">Zapisz harmonogram czasu</button></footer>`;
  }

  function applyRolePermissions() {
    const { app, state } = context;
    const forbiddenActions = {
      Brygadzista: ["edit-observation", "resolve-observation", "order-material"],
      Kierownik: [],
      "Ochrona roślin": ["fill-plan", "fill-all-plan", "issue-material", "order-material"],
      "Dział techniczny": ["fill-plan", "fill-all-plan", "order-material"],
      Kadry: [],
    }[state.role];
    forbiddenActions.forEach((action) => app.querySelectorAll(`[data-action="${action}"]`).forEach((element) => element.remove()));

    if (state.role === "Ochrona roślin" || state.role === "Dział techniczny") {
      app.querySelectorAll(".plan-card [data-nav='tasks']").forEach((element) => element.remove());
      app.querySelectorAll(".plan-card-actions").forEach((actions) => {
        if (!actions.children.length) actions.innerHTML = '<span class="read-only-note">Tylko do odczytu</span>';
      });
    }

    if (state.role === "Brygadzista") {
      app.querySelectorAll("[data-action='select-crop-site']").forEach((button) => {
        if (button.dataset.site !== state.selectedSite) button.remove();
      });
    }

    const hiddenMetricLabels = {
      "Ochrona roślin": ["Usterki"],
      "Dział techniczny": ["Alerty upraw"],
      Kadry: ["Aktywne prace", "Alerty upraw", "Usterki"],
    }[state.role] || [];
    const coreMetrics = app.querySelector(".content > .metrics");
    if (coreMetrics && hiddenMetricLabels.length) {
      coreMetrics.classList.add("role-filtered-metrics");
      coreMetrics.querySelectorAll(".metric").forEach((card) => {
        const label = card.querySelector("span")?.textContent.trim();
        if (hiddenMetricLabels.includes(label)) card.remove();
      });
    }

    const events = Array.from(app.querySelectorAll(".events .event"));
    if (state.role === "Brygadzista") events.forEach((event) => { if (!event.textContent.includes(state.selectedSite)) event.remove(); });
    if (state.role === "Ochrona roślin") events.forEach((event) => { if (!/liści|upraw|obserw/i.test(event.textContent)) event.remove(); });
    if (state.role === "Dział techniczny") events.forEach((event) => { if (!/wózek|uster|brama|przewód|lamp/i.test(event.textContent)) event.remove(); });
    if (state.role === "Kadry") app.querySelector(".events")?.closest(".card-pad")?.remove();
    const dashboardColumns = app.querySelector(".content > .two-col");
    if (dashboardColumns && dashboardColumns.children.length === 1) dashboardColumns.classList.add("single-column");

    if (state.screen === "reports" && state.role === "Brygadzista") {
      app.querySelectorAll(".breakdown .break-row").forEach((row) => { if (row.textContent.includes("kg")) row.remove(); });
    }
    if (state.screen === "reports" && (state.role === "Ochrona roślin" || state.role === "Dział techniczny")) {
      app.querySelector(".assignment-register")?.remove();
      app.querySelector(".reports .breakdown")?.remove();
      app.querySelector(".reports")?.classList.add("single-column");
    }

    app.querySelectorAll(".notification").forEach((notification) => {
      const button = notification.querySelector("[data-action='open-notification']");
      const item = state.notifications.find((entry) => entry.id === Number(button?.dataset.id));
      if (item && !screensByRole[state.role].includes(item.screen)) notification.remove();
    });
  }

  function renderLargeListControls() {
    const definition = largeListDefinitions[context.state.screen];
    const shell = context.app.querySelector(".shell");
    shell?.classList.toggle("compact-lists", featureState.listDensity === "compact");
    if (!definition) return;
    const anchor = context.app.querySelector(definition.anchor);
    const total = context.app.querySelectorAll(definition.item).length;
    if (!anchor || !total) return;
    anchor.classList.add("large-list-target");
    anchor.dataset.listScreen = context.state.screen;
    anchor.insertAdjacentHTML("beforebegin", `<section class="large-list-toolbar surface" aria-label="Sterowanie dużą listą">
      <div class="large-list-summary"><i>≡</i><span><small>DUŻA LISTA · ${escapeHtml(screenDefinitions[context.state.screen]?.title || "REJESTR")}</small><b data-large-list-count aria-live="polite">Pokazano 0 z ${total}</b><p>Najpierw widzisz krótki zestaw; filtry i wyszukiwanie obejmują całą listę.</p></span></div>
      <div class="list-density" role="group" aria-label="Gęstość listy"><button class="${featureState.listDensity === "compact" ? "active" : ""}" data-module-action="set-list-density" data-density="compact">Kompaktowo</button><button class="${featureState.listDensity === "comfortable" ? "active" : ""}" data-module-action="set-list-density" data-density="comfortable">Wygodnie</button></div>
      <div class="large-list-actions"><button class="secondary" data-module-action="collapse-large-list">Zwiń</button><button class="secondary" data-module-action="show-more-list">Pokaż kolejne ${definition.step}</button><button class="primary" data-module-action="show-all-list">Pokaż wszystko</button></div>
    </section>`);
  }

  function applyListWindow() {
    const definition = largeListDefinitions[context.state.screen];
    if (!definition) return;
    const items = Array.from(context.app.querySelectorAll(definition.item));
    const matching = items.filter((item) => item.dataset.filterHidden !== "true");
    const limit = featureState.listLimits[context.state.screen] ?? definition.initial;
    matching.forEach((item, index) => { item.hidden = index >= limit; });
    const visible = Math.min(limit, matching.length);
    const toolbar = context.app.querySelector(".large-list-toolbar");
    if (!toolbar) return;
    const counter = toolbar.querySelector("[data-large-list-count]");
    if (counter) counter.textContent = `Pokazano ${visible} z ${matching.length} ${definition.label}`;
    const more = toolbar.querySelector('[data-module-action="show-more-list"]');
    const all = toolbar.querySelector('[data-module-action="show-all-list"]');
    const collapse = toolbar.querySelector('[data-module-action="collapse-large-list"]');
    if (more) more.hidden = visible >= matching.length;
    if (all) all.hidden = visible >= matching.length || matching.length <= definition.initial;
    if (collapse) collapse.hidden = limit <= definition.initial;
  }

  function updateSmartAssignmentSummary(form) {
    if (!form) return;
    const checked = Array.from(form.querySelectorAll('.employee-picker input[name="employees"]:checked'));
    const peopleConflicts = checked.filter((input) => Number(input.closest("label")?.dataset.activeAssignments || 0) > 0);
    const cart = form.querySelector('select[name="cart"]');
    const cartBusy = cart?.selectedOptions[0]?.dataset.busy === "true";
    const selected = form.querySelector("[data-v5-selected]");
    const warning = form.querySelector("[data-v5-assignment-warning]");
    if (selected) selected.textContent = String(checked.length);
    if (warning) {
      warning.classList.toggle("active", peopleConflicts.length > 0 || cartBusy);
      warning.innerHTML = peopleConflicts.length || cartBusy
        ? `<b>Sprawdź konflikt:</b> ${peopleConflicts.length ? `${peopleConflicts.map((input) => input.value).join(", ")} ma już aktywną pracę. ` : ""}${cartBusy ? `${cart.value} jest zajęty.` : ""}`
        : "✓ Wybrani ludzie i wózek są dostępni.";
    }
  }

  function enhanceTaskAssignmentForm() {
    const form = context.app.querySelector('form[data-form="new-task"]');
    if (form && !form.classList.contains("v5-smart-assignment")) {
      form.classList.add("v5-smart-assignment");
      const resources = resourceState();
      const picker = form.querySelector(".employee-picker");
      const cart = form.querySelector('select[name="cart"]');
      const skills = ["Zbiór", "Liście", "Zawieszki", "Wózek", "Kontrola", "Prace rzędowe"];
      if (picker) {
        picker.insertAdjacentHTML("beforebegin", `<section class="v5-assignment-summary"><span><small>Dostępni pracownicy</small><b>${resources.availablePeople.length}</b></span><span><small>Wybrano</small><b data-v5-selected>0</b></span><span><small>Wolne wózki</small><b>${resources.freeCarts}</b></span><span><small>Aktywne konflikty</small><b>${resources.peopleConflicts.length + resources.cartConflicts.length}</b></span></section>`);
        picker.insertAdjacentHTML("beforebegin", `<section class="v6-employee-tools"><div><span>Gotowe zaznaczenie</span><button type="button" data-v6-employee-preset="free">Wolni</button><button type="button" data-v6-employee-preset="team-a">Brygada A</button><button type="button" data-v6-employee-preset="team-b">Brygada B</button><button type="button" data-v6-employee-preset="clear">Wyczyść</button></div><label><span>Kompetencja</span><select data-v6-skill-filter><option value="all">Wszystkie</option>${skills.map((skill) => `<option>${skill}</option>`).join("")}</select></label></section>`);
        const labels = Array.from(picker.querySelectorAll(":scope > label"));
        labels.forEach((label, index) => {
          const input = label.querySelector('input[name="employees"]');
          const employee = context.state.employees.find((item) => item.name === input?.value);
          const assignments = resources.peopleAssignments.get(input?.value) || [];
          label.dataset.skill = skills[index % skills.length];
          label.dataset.activeAssignments = String(assignments.length);
          label.classList.toggle("busy", assignments.length > 0);
          if (assignments.length && input) {
            input.checked = false;
            input.disabled = true;
            label.title = `Niedostępny: ${assignments.map((task) => task.title).join(" · ")}`;
          }
          label.querySelector("span")?.insertAdjacentHTML("beforeend", `${employee ? employeeLanguageChip(employee) : ""}<span class="v5-person-state ${assignments.length ? "busy" : "free"}">${assignments.length ? `${assignments.length} aktywna praca` : "Dostępny"}</span><span class="v5-person-skill">${skills[index % skills.length]}</span>`);
        });
        const availableInputs = labels.filter((label) => label.dataset.activeAssignments === "0").map((label) => label.querySelector('input[name="employees"]')).filter(Boolean);
        if (!availableInputs.some((input) => input.checked)) availableInputs.slice(0, 2).forEach((input) => { input.checked = true; });
      }
      if (cart) {
        let firstFree = null;
        Array.from(cart.options).forEach((option) => {
          const cartId = option.value;
          option.value = cartId;
          const assignments = resources.cartAssignments.get(cartId) || [];
          option.dataset.busy = String(assignments.length > 0);
          if (assignments.length) {
            option.textContent = `${cartId} — zajęty: ${assignments[0].title}`;
            option.disabled = true;
          } else if (!firstFree) firstFree = option;
        });
        if (cart.selectedOptions[0]?.disabled && firstFree) firstFree.selected = true;
      }
      form.querySelector(".modal-actions")?.insertAdjacentHTML("beforebegin", `<div class="v5-assignment-warning" data-v5-assignment-warning></div>`);
      updateSmartAssignmentSummary(form);
    }

    const reassign = context.app.querySelector('form[data-form="reassign-task"]');
    if (reassign && !reassign.classList.contains("v5-smart-reassign")) {
      reassign.classList.add("v5-smart-reassign");
      const resources = resourceState();
      const select = reassign.querySelector('select[name="employee"]');
      let firstFree = null;
      Array.from(select?.options || []).forEach((option) => {
        const employeeName = option.value;
        const employee = context.state.employees.find((item) => item.name === employeeName);
        const identity = employee ? `${employeeName} · ${employee.code} · ${employee.languageCode} ${employee.language}` : employeeName;
        option.value = employeeName;
        const assignments = resources.peopleAssignments.get(employeeName) || [];
        option.textContent = assignments.length ? `${identity} — ${assignments.length} aktywna praca` : `${identity} — dostępny`;
        option.disabled = assignments.length > 0;
        if (!assignments.length && !firstFree) firstFree = option;
      });
      if (firstFree) firstFree.selected = true;
      select?.closest("label")?.insertAdjacentHTML("afterend", `<div class="v5-reassign-note"><b>Asystent obsady</b><span>Wybierz osobę oznaczoną jako dostępna. System ostrzeże przed podwójnym przydziałem.</span></div>`);
    }
  }

  function locationRecordForForm(form) {
    if (form.dataset.form === "finish-task") return context.state.tasks.find((item) => item.id === context.state.selectedTask);
    if (form.dataset.form === "new-plan") return context.state.plan.find((item) => item.id === context.state.selectedPlanId);
    return null;
  }

  function recentLocations() {
    const scope = context.state.role === "Brygadzista" ? context.state.selectedSite : context.state.selectedPlanSite;
    const unique = new Map();
    [...context.state.tasks, ...context.state.plan].filter((item) => item.site === scope).forEach((item) => {
      const key = [item.site, item.greenhouseSide, item.nave, item.naveEnd, item.entrance, item.passageSide].join("|");
      if (!unique.has(key)) unique.set(key, item);
    });
    return [...unique.values()].slice(0, 3);
  }

  function updateLocationAssistant(form) {
    const start = form.querySelector('select[name="nave"]');
    const end = form.querySelector('select[name="naveEnd"]');
    if (!start || !end) return;
    const options = Array.from(start.options, (option) => option.value);
    if (!Array.from(end.options).some((option) => option.value === end.value)) end.innerHTML = start.innerHTML;
    const startIndex = Math.max(0, options.indexOf(start.value));
    const endIndex = options.indexOf(end.value);
    if (endIndex < startIndex) end.value = start.value;
    const site = form.querySelector('[name="site"]')?.value;
    const greenhouseSide = form.querySelector('[name="greenhouseSide"]')?.value;
    const entrance = form.querySelector('[name="entrance"]')?.value;
    const passageSide = form.querySelector('[name="passageSide"]')?.value;
    const preview = form.querySelector("[data-v6-location-preview]");
    if (preview) preview.innerHTML = `<small>WYBRANY ZAKRES</small><b>${escapeHtml([site, greenhouseSide, start.value === end.value ? start.value : `${start.value}–${end.value}`, entrance, passageSide].filter(Boolean).join(" → "))}</b>`;
  }

  function enhanceLocationForms() {
    const selector = 'form[data-form="new-task"], form[data-form="new-plan"], form[data-form="finish-task"]';
    context.app.querySelectorAll(selector).forEach((form) => {
      if (form.classList.contains("v6-location-enhanced")) return;
      const location = form.querySelector(".location-form");
      const start = location?.querySelector('select[name="nave"]');
      if (!location || !start) return;
      form.classList.add("v6-location-enhanced");
      const record = locationRecordForForm(form);
      start.closest("label")?.insertAdjacentHTML("afterend", `<label class="field v6-nave-end"><span>Nawa końcowa</span><select name="naveEnd" data-v6-nave-end>${start.innerHTML}</select></label>`);
      const end = form.querySelector('select[name="naveEnd"]');
      if (end) end.value = record?.naveEnd || start.value;
      const recent = recentLocations();
      location.insertAdjacentHTML("beforebegin", `<section class="v6-location-tools"><div><span>Zakres naw</span><button type="button" data-v6-location-range="single">Jedna nawa</button><button type="button" data-v6-location-range="five">+ 5 naw</button><button type="button" data-v6-location-range="end">Do końca etapu</button></div>${recent.length ? `<div class="v6-recent-locations"><span>Ostatnie miejsca</span>${recent.map((item, index) => `<button type="button" data-v6-location-recent="${index}" data-site="${escapeHtml(item.site)}" data-greenhouse-side="${escapeHtml(item.greenhouseSide)}" data-nave="${escapeHtml(item.nave)}" data-nave-end="${escapeHtml(item.naveEnd || item.nave)}" data-entrance="${escapeHtml(item.entrance)}" data-passage-side="${escapeHtml(item.passageSide)}"><b>${escapeHtml(item.naveEnd && item.naveEnd !== item.nave ? `${item.nave}–${item.naveEnd}` : item.nave)}</b><small>${escapeHtml(item.entrance)} · ${escapeHtml(item.passageSide)}</small></button>`).join("")}</div>` : ""}</section>`);
      location.insertAdjacentHTML("afterend", `<div class="v6-location-preview" data-v6-location-preview></div>`);
      updateLocationAssistant(form);
    });
  }

  function injectEnhancements() {
    if (!context.state.loggedIn) {
      loginEnhancement();
      return;
    }
    ensureTimeProfiles();
    const pageHead = context.app.querySelector(".content > .page-head");
    if (!pageHead) return;
    const guidance = context.state.screen === "dashboard" ? roleFocusPanel() : screenScopePanel();
    const operationalDashboard = context.state.screen === "dashboard" ? `${workflowPanel()}${chiefForemanPanel()}${exceptionCenterPanel()}` : "";
    pageHead.insertAdjacentHTML("afterend", `${contextBar()}${guidance}${operationalDashboard}${designStudioPanel()}${modulePanel()}`);
    context.app.insertAdjacentHTML("beforeend", pauseReasonModal());
    applyRolePermissions();
    renderFlexibleAttendance();
    simplifyDashboard();
    enhanceTaskAssignmentForm();
    enhanceLocationForms();
    enhanceTaskCards();
    decorateReviewBlocks();
    renderLargeListControls();
    applyFilters();
  }

  function searchTargets() {
    const selectors = {
      dashboard: ".facility, .event",
      planning: ".plan-card",
      attendance: ".time-worker-card",
      tasks: ".task",
      productivity: ".rank-row",
      team: ".team-row",
      crop: ".observation-list > button",
      tickets: ".ticket-queue-item",
      materials: ".material",
      reports: ".assignment-entry, .break-row",
    };
    return Array.from(context.app.querySelectorAll(selectors[context.state.screen] || ""));
  }

  function matchesModuleFilter(element) {
    const text = element.textContent.toLowerCase();
    switch (context.state.screen) {
      case "attendance":
        if (featureState.attendanceFilter === "Obecni") return text.includes("obecny");
        if (featureState.attendanceFilter === "Nieustaleni") return text.includes("nieustalony");
        if (featureState.attendanceFilter === "Nieobecni") return text.includes("urlop") || text.includes("zwolnienie");
        return true;
      case "tasks":
        return featureState.taskFilter === "Wszystkie" || text.includes(featureState.taskFilter.toLowerCase());
      case "productivity":
        return featureState.productivityUnit === "Wszystkie" || text.includes(featureState.productivityUnit.toLowerCase().replace("/h", ""));
      case "team":
        if (featureState.teamFilter === "Dostępni") return text.includes("obecny");
        if (featureState.teamFilter === "Mentorzy") return text.includes("mentor");
        if (featureState.teamFilter === "Dokumenty") return /08\.2026|09\.2026/.test(text);
        return true;
      case "crop": {
        if (featureState.cropFilter === "Alarm") return Boolean(element.querySelector(".severity-dot.high"));
        if (featureState.cropFilter === "Do kontroli") return Boolean(element.querySelector(".severity-dot.medium"));
        if (featureState.cropFilter === "Obserwacja") return Boolean(element.querySelector(".severity-dot:not(.high):not(.medium)"));
        return true;
      }
      default:
        return true;
    }
  }

  function applyFilters() {
    if (!context?.state.loggedIn) return;
    const search = featureState.search.trim().toLowerCase();
    const scope = featureState.scope === "Wszystkie obiekty" ? "" : featureState.scope.toLowerCase();
    const targets = searchTargets();
    let visible = 0;
    targets.forEach((element) => {
      const text = element.textContent.toLowerCase();
      const show = (!search || text.includes(search)) && (!scope || text.includes(scope)) && matchesModuleFilter(element);
      element.dataset.filterHidden = show ? "false" : "true";
      element.hidden = !show;
      if (show) visible += 1;
    });
    const counter = context.app.querySelector(".context-search-count");
    if (counter) counter.textContent = search || scope || visible !== targets.length ? `${visible} z ${targets.length}` : "";
    applyListWindow();
  }

  function handleFilter(button) {
    const names = {
      attendance: "attendanceFilter",
      tasks: "taskFilter",
      productivity: "productivityUnit",
      team: "teamFilter",
      crop: "cropFilter",
    };
    const key = names[button.dataset.filterName];
    if (!key) return;
    featureState[key] = button.dataset.value;
    saveFeaturePreferences();
    context.render();
  }

  function handleAction(button) {
    const { state, notify, navigate, render, exportJson, addTicketEvent } = context;
    const action = button.dataset.moduleAction;
    if (action === "set-filter") return handleFilter(button);
    if (action === "quick-nav") return navigate(button.dataset.target);
    if (action === "set-list-density") {
      featureState.listDensity = button.dataset.density === "comfortable" ? "comfortable" : "compact";
      saveFeaturePreferences();
      render();
      return;
    }
    if (["show-more-list", "show-all-list", "collapse-large-list"].includes(action)) {
      const definition = largeListDefinitions[state.screen];
      if (!definition) return;
      const current = featureState.listLimits[state.screen] ?? definition.initial;
      if (action === "show-more-list") featureState.listLimits[state.screen] = current + definition.step;
      if (action === "show-all-list") featureState.listLimits[state.screen] = Number.MAX_SAFE_INTEGER;
      if (action === "collapse-large-list") featureState.listLimits[state.screen] = definition.initial;
      saveFeaturePreferences();
      applyListWindow();
      return;
    }
    if (action === "validate-plan") {
      featureState.planValidated = true;
      const missing = activePlan().reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
      notify(missing ? `Plan sprawdzony: brakuje ${missing} os.` : "Plan sprawdzony: gotowy do publikacji");
    }
    if (action === "compare-plan-version") {
      const site = planSite();
      featureState.planCompareSite = featureState.planCompareSite === site ? "" : site;
      render();
      return;
    }
    if (action === "rollback-plan-version") {
      const site = planSite();
      const versions = ensurePlanVersion(site);
      if (versions.length < 2) return notify("Brak wcześniejszej wersji planu");
      const previous = versions[versions.length - 2];
      state.plan = [...state.plan.filter((item) => item.site !== site), ...cloneValue(previous.items)];
      state.planPublication[site] = false;
      featureState.planCompareSite = site;
      notify(`Przywrócono zawartość wersji ${previous.number} jako plan roboczy`);
      return;
    }
    if (action === "confirm-plan-version") {
      const site = planSite();
      const versions = ensurePlanVersion(site);
      const version = versions[versions.length - 1].number;
      const responsibility = context.siteResponsibility.find((item) => item.site === site);
      const foreman = responsibility?.chief || "Brygadzista";
      if (!featureState.planAcknowledgements[site] || featureState.planAcknowledgements[site].version !== version) featureState.planAcknowledgements[site] = { version, people: {} };
      featureState.planAcknowledgements[site].people[foreman] = "teraz";
      featureState.planAcknowledged = true;
      saveFeaturePreferences();
      notify(`Potwierdzono plan V${version}: ${foreman}`);
      return;
    }
    if (action === "copy-plan") {
      const nextDate = new Date(`${featureState.workDate}T12:00:00`);
      nextDate.setDate(nextDate.getDate() + 1);
      const dateKey = nextDate.toISOString().slice(0, 10);
      featureState.copiedPlans[dateKey] = activePlan().map((item) => ({ ...item, assigned: 0, status: "Wymaga obsady", publication: "Roboczy" }));
      featureState.planCopied = true;
      state.planPublication[state.selectedPlanSite] = false;
      notify(`Skopiowano ${featureState.copiedPlans[dateKey].length} pozycji planu na ${dateKey}`);
    }
    if (action === "balance-plan") {
      activePlan().forEach((item) => {
        item.assigned = item.need;
        item.status = "Gotowe";
      });
      state.planPublication[state.selectedPlanSite] = false;
      notify("Zaproponowano pełną obsadę — plan pozostaje roboczy");
    }
    if (action === "acknowledge-plan") {
      featureState.planAcknowledged = true;
      notify("Potwierdzono zapoznanie z bieżącym planem");
    }
    if (action === "attendance-reminder") {
      featureState.reminderSent = true;
      notify("Zapisano przypomnienie dla osób niepotwierdzonych");
    }
    if (action === "save-schedule") {
      state.employees.forEach((employee) => { employee.breakMinutes = (employee.breaks || []).reduce((sum, item) => sum + Number(item.minutes || 0), 0); });
      featureState.scheduleSaved = true;
      notify("Zapisano indywidualny czas pracy i przerwy");
    }
    if (action === "advance-tasks") {
      activeTasks().filter((task) => task.status === "W trakcie").forEach((task) => { task.progress = Math.min(95, (task.progress || 0) + 10); });
      notify("Zaktualizowano postęp aktywnych prac");
    }
    if (action === "open-first-task") {
      const task = activeTasks().find((item) => item.status === "Wstrzymane") || activeTasks()[0];
      if (task) {
        state.selectedTask = task.id;
        state.modal = "reassign-task";
        render();
      } else notify("Brak aktywnych prac");
    }
    if (action === "focus-foreman") {
      featureState.pendingTaskFocus = button.dataset.foreman || "";
      navigate("tasks");
      return;
    }
    if (action === "open-pause-reason") {
      featureState.pauseTaskId = Number(button.dataset.taskId);
      render();
      return;
    }
    if (action === "close-pause-reason") {
      featureState.pauseTaskId = null;
      render();
      return;
    }
    if (action === "resume-task") {
      const task = state.tasks.find((item) => item.id === Number(button.dataset.taskId));
      if (!task) return;
      task.status = "W trakcie";
      if (featureState.pauseReasons[task.id]) Object.assign(featureState.pauseReasons[task.id], { resumedAt: "teraz", duration: "18 min", closed: true });
      saveFeaturePreferences();
      notify(`Wznowiono pracę: ${task.title}; przestój zapisano w historii`);
      return;
    }
    if (action === "show-resource-conflicts") {
      const resources = resourceState();
      const target = resources.peopleConflicts[0]?.[0] || resources.cartConflicts[0]?.[0];
      if (!target) return notify("Nie wykryto konfliktów ludzi ani wózków");
      featureState.taskFilter = "Wszystkie";
      featureState.search = target;
      saveFeaturePreferences();
      render();
      return;
    }
    if (action === "focus-plan-execution") {
      state.selectedTask = Number(button.dataset.taskId);
      featureState.pendingTaskFocus = button.dataset.taskTitle || "";
      navigate("tasks");
      return;
    }
    if (action === "start-plan-item") {
      const plan = state.plan.find((item) => item.id === Number(button.dataset.planId));
      if (!plan) return notify("Nie znaleziono pozycji planu");
      const resources = resourceState();
      const people = resources.availablePeople.slice(0, plan.need).map((employee) => employee.name);
      if (!people.length) return notify("Brak wolnych pracowników — najpierw przenieś grupę w module Prace");
      const freeCart = Array.from({ length: 12 }, (_, index) => `WZ-${String(index + 1).padStart(2, "0")}`).find((cart) => !resources.cartAssignments.has(cart)) || "—";
      const task = {
        id: Date.now(),
        planId: plan.id,
        title: plan.title,
        site: plan.site,
        greenhouseSide: plan.greenhouseSide,
        nave: plan.nave,
        naveEnd: plan.naveEnd || plan.nave,
        entrance: plan.entrance,
        passageSide: plan.passageSide,
        row: plan.nave.replace(/^N/, "R"),
        side: plan.passageSide,
        cart: freeCart,
        foreman: plan.foreman,
        people,
        status: "W trakcie",
        unit: plan.unit.startsWith("kg") ? "kg" : "rz.",
        progress: 0,
        contributions: [],
      };
      state.tasks.push(task);
      plan.assigned = people.length;
      plan.status = people.length >= plan.need ? "Gotowe" : `Brak ${plan.need - people.length} os.`;
      state.selectedTask = task.id;
      featureState.pendingTaskFocus = task.title;
      notify(`Rozpoczęto plan: ${people.length} os. · ${freeCart}`);
      navigate("tasks");
      return;
    }
    if (action === "download-tasks") {
      exportJson("prace-biezace-demo.json", scopedTasks());
      notify("Przygotowano eksport prac i odpowiedzialności");
    }
    if (action === "check-productivity") {
      const results = scopedTasks().flatMap((task) => (task.contributions || []).map((entry) => ({ ...entry, unit: task.unit })));
      const below = results.filter((entry) => entry.result / entry.hours < (entry.unit === "kg" ? 120 : .75)).length;
      notify(below ? `${below} wyniki wymagają sprawdzenia przyczyny` : "Wszystkie zapisane wyniki spełniają normę");
    }
    if (action === "download-productivity") {
      exportJson("wydajnosc-zmiany-demo.json", scopedTasks().flatMap((task) => (task.contributions || []).map((entry) => ({ ...entry, zadanie: task.title, jednostka: task.unit, miejsce: task.site }))));
      notify("Przygotowano eksport wydajności");
    }
    if (action === "set-team-expiring") {
      featureState.teamFilter = "Dokumenty";
      render();
    }
    if (action === "download-team") {
      exportJson("pracownicy-zakresu-demo.json", state.employees);
      notify("Przygotowano eksport listy pracowników");
    }
    if (action === "focus-high-observation") {
      const observation = openObservations().find((item) => item.severity === "high");
      if (observation) {
        state.selectedCropSite = observation.site;
        state.selectedCropNave = observation.nave;
        state.selectedCropGreenhouseSide = observation.greenhouseSide;
        state.selectedCropEntrance = observation.entrance;
        state.selectedCropPassageSide = observation.passageSide;
        state.selectedObservationId = observation.id;
        render();
      } else notify("Brak aktywnych alarmów");
    }
    if (action === "report-observation") {
      state.selectedObservationId = null;
      state.modal = "observation";
      render();
    }
    if (action === "create-protection-task") {
      const observation = openObservations().find((item) => item.severity === "high") || openObservations()[0];
      if (observation) {
        observation.status = "W realizacji";
        if (observation.owner.includes("kolejka")) observation.owner = "Ochrona roślin · Joanna Król";
        featureState.protectionTaskCreated = true;
        notify(`Działanie utworzone: ${observation.site} · ${observation.nave}`);
      }
    }
    if (action === "assign-ticket-queue") {
      const queued = openTickets().filter((ticket) => ticket.owner.includes("kolejka"));
      queued.forEach((ticket) => {
        ticket.owner = "Piotr Zieliński";
        if (ticket.status === "Nowe") ticket.status = "Przyjęte";
        addTicketEvent(ticket, "Przypisano z kolejki", "Odpowiedzialny: Piotr Zieliński.");
      });
      notify(`Przypisano ${queued.length} zgłoszeń z kolejki`);
    }
    if (action === "open-critical-ticket") {
      const ticket = openTickets().find((item) => item.priority === "Krytyczny");
      if (ticket) {
        state.selectedTicketId = ticket.id;
        state.ticketFilter = "critical";
        render();
      } else notify("Brak krytycznych zgłoszeń");
    }
    if (action === "report-ticket") {
      state.modal = "ticket";
      render();
    }
    if (action === "reserve-materials") {
      state.materials.forEach((item) => { item.reserved = Math.min(item.quantity, Math.max(0, Math.round(item.min * .15))); });
      notify("Zarezerwowano materiały dla bieżącego planu");
    }
    if (action === "request-materials") {
      state.modal = "material-request";
      render();
    }
    if (action === "create-material-orders") {
      lowMaterials().forEach((item) => { item.orderPending = item.min * 2 - item.quantity; });
      featureState.materialOrderCreated = true;
      const notification = state.notifications.find((item) => item.id === 3);
      if (notification) notification.read = true;
      notify("Utworzono zbiorcze zamówienie niskich stanów");
    }
    if (action === "download-full-report") {
      const plan = state.role === "Brygadzista" ? state.plan.filter((item) => item.site === state.selectedSite) : state.plan;
      exportJson("raport-pelny-zmiany-demo.json", { rola: state.role, zakres: state.role === "Brygadzista" ? state.selectedSite : featureState.scope, data: featureState.workDate, zmiana: featureState.shift, obecność: state.employees, plan, prace: scopedTasks(), obserwacje: scopedObservations(), zgłoszenia: scopedTickets(), materiały: state.materials });
      notify("Przygotowano pełny raport zmiany");
    }
    if (action === "approve-report") {
      featureState.reportApproved = true;
      if (!state.approvedItems.includes("report")) state.approvedItems.push("report");
      notify("Raport zmiany został zatwierdzony");
    }
    if (action === "download-handover") {
      if (!featureState.handover) return notify("Najpierw zapisz przekazanie zmiany");
      exportJson("przekazanie-zmiany-demo.json", featureState.handover);
      notify("Przygotowano przekazanie zmiany");
    }
    if (action === "mark-handover-read") {
      if (!featureState.handover) return;
      featureState.handover.status = "Odczytane";
      featureState.handover.readAt = "teraz";
      featureState.handover.readBy = "Kierownik produkcji";
      saveFeaturePreferences();
      notify("Przekazanie oznaczono jako odczytane");
      return;
    }
    if (action === "export-design") {
      exportJson("projekt-zmian-makiety.json", { decyzje: designState.decisions, propozycje: designState.proposals });
      notify("Przygotowano eksport decyzji projektowych");
    }
    if (action === "clear-design-screen") {
      const prefix = `${state.role}:${state.screen}:`;
      Object.keys(designState.decisions).filter((key) => key.startsWith(prefix)).forEach((key) => delete designState.decisions[key]);
      designState.proposals = designState.proposals.filter((item) => item.role !== state.role || item.screen !== state.screen);
      saveDesignState();
      render();
    }
  }

  function rememberExpandedTimeCards(extraId = null) {
    const ids = Array.from(context.app.querySelectorAll(".time-worker-card[open]"), (card) => Number(card.dataset.timeCardId));
    if (extraId && !ids.includes(Number(extraId))) ids.push(Number(extraId));
    featureState.expandedTimeCards = ids.filter(Boolean);
  }

  function handleTimeControl(control) {
    const employee = context.state.employees.find((item) => item.id === Number(control.dataset.id));
    if (!employee) return;
    rememberExpandedTimeCards(employee.id);
    if (control.matches("[data-time-template]")) {
      const templates = {
        early: { start: "05:45", end: "14:00", breaks: [{ start: "09:00", minutes: 20 }] },
        double: { start: "06:00", end: "14:30", breaks: [{ start: "09:15", minutes: 20 }, { start: "12:15", minutes: 15 }] },
        late: { start: "07:00", end: "15:30", breaks: [{ start: "11:00", minutes: 30 }] },
      };
      if (templates[control.value]) Object.assign(employee, { ...templates[control.value], breaks: templates[control.value].breaks.map((item) => ({ ...item })) });
    }
    if (control.matches("[data-time-field]")) employee[control.dataset.timeField] = control.value;
    if (control.matches("[data-break-count]")) {
      const count = Number(control.value);
      const current = employee.breaks || [];
      while (current.length < count) current.push({ start: current.length ? "12:15" : "09:30", minutes: current.length ? 15 : 20 });
      employee.breaks = current.slice(0, count);
    }
    if (control.matches("[data-break-start]")) employee.breaks[Number(control.dataset.breakIndex)].start = control.value;
    if (control.matches("[data-break-minutes]")) employee.breaks[Number(control.dataset.breakIndex)].minutes = Number(control.value);
    employee.breakMinutes = (employee.breaks || []).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    featureState.scheduleSaved = false;
    context.render();
  }

  function handleFeatureForm(form) {
    const data = new FormData(form);
    if (form.dataset.v7Form === "pause-reason") {
      const task = context.state.tasks.find((item) => item.id === featureState.pauseTaskId);
      if (!task) return context.notify("Nie znaleziono pracy do wstrzymania");
      task.status = "Wstrzymane";
      task.updatedAt = "teraz";
      featureState.pauseReasons[task.id] = {
        reason: String(data.get("reason") || "Inna przyczyna"),
        note: String(data.get("note") || "").trim(),
        owner: String(data.get("owner") || task.foreman),
        startedAt: "teraz",
        startedBy: task.foreman,
        closed: false,
      };
      featureState.pauseTaskId = null;
      saveFeaturePreferences();
      context.notify(`Wstrzymano pracę: ${task.title}; przyczyna trafiła do raportu`);
      return;
    }
    if (form.dataset.v7Form === "accept-handover") {
      if (!featureState.handover) return context.notify("Brak przekazania do przyjęcia");
      Object.assign(featureState.handover, {
        status: "Przyjęte",
        acceptanceComment: String(data.get("comment") || "").trim(),
        acceptedAt: `${featureState.workDate} · teraz`,
        acceptedBy: "Kierownik produkcji",
        carriedTasks: featureState.handover.tasks.map((task) => task.id),
      });
      saveFeaturePreferences();
      context.notify(`Przyjęto zmianę i przeniesiono ${featureState.handover.carriedTasks.length} aktywnych prac`);
      return;
    }
    if (form.dataset.v6Form === "bulk-assignment") {
      const group = workGroups().find((item) => item.id === data.get("group"));
      const target = context.state.tasks.find((task) => task.id === Number(data.get("task")));
      if (!group || !target) return context.notify("Wybierz grupę i pracę docelową");
      let people = group.people;
      if (data.get("mode") === "free") {
        const free = new Set(resourceState().availablePeople.map((employee) => employee.name));
        people = people.filter((person) => free.has(person));
      } else {
        activeTasks().filter((task) => task.id !== target.id).forEach((task) => { task.people = (task.people || []).filter((person) => !people.includes(person)); });
      }
      people.forEach((person) => { if (!target.people.includes(person)) target.people.push(person); });
      target.updatedAt = "teraz";
      context.notify(people.length ? `Przypisano grupę: ${people.length} os. → ${target.title}` : "W wybranej grupie nie ma wolnych osób");
      return;
    }
    if (form.dataset.v6Form === "handover") {
      const tasks = activeTasks();
      const tickets = openTickets();
      const site = context.state.selectedSite;
      const author = context.siteResponsibility.find((item) => item.site === site)?.chief || "Brygadzista zmiany";
      featureState.handover = {
        site,
        date: featureState.workDate,
        shift: featureState.shift,
        nextShift: data.get("nextShift"),
        author,
        recipient: data.get("recipient"),
        note: String(data.get("note") || "").trim(),
        savedAt: `${featureState.workDate} · teraz`,
        status: "Wysłane",
        carried: true,
        tasks: tasks.map((task) => ({ id: task.id, title: task.title, location: locationRangeLabel(task), foreman: task.foreman, people: [...task.people], cart: task.cart, status: task.status, progress: task.progress })),
        tickets: tickets.map((ticket) => ({ id: ticket.id, title: ticket.title, location: locationRangeLabel(ticket), owner: ticket.owner, priority: ticket.priority, status: ticket.status })),
        carts: [...new Set(tasks.map((task) => task.cart).filter(Boolean))],
      };
      saveFeaturePreferences();
      context.notify("Przekazanie zmiany zapisane i widoczne dla kierownika");
    }
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    context.app.addEventListener("click", (event) => {
      const publishPlan = event.target.closest('[data-action="publish-plan"]');
      if (publishPlan) {
        const site = context.state.selectedPlanSite;
        const version = recordPlanVersion(site);
        context.state.planPublication[site] = true;
        context.notify(`Opublikowano plan ${site} · wersja ${version.number}`);
        return;
      }
      const employeePreset = event.target.closest("[data-v6-employee-preset]");
      if (employeePreset) {
        const form = employeePreset.closest('form[data-form="new-task"]');
        const labels = Array.from(form?.querySelectorAll('.employee-picker > label') || []).filter((label) => !label.querySelector("input")?.disabled);
        const middle = Math.ceil(labels.length / 2);
        labels.forEach((label, index) => {
          const preset = employeePreset.dataset.v6EmployeePreset;
          label.querySelector("input").checked = preset === "free" || preset === "team-a" && index < middle || preset === "team-b" && index >= middle;
          if (preset === "clear") label.querySelector("input").checked = false;
        });
        updateSmartAssignmentSummary(form);
        return;
      }
      const rangeButton = event.target.closest("[data-v6-location-range]");
      if (rangeButton) {
        const form = rangeButton.closest("form");
        const start = form?.querySelector('select[name="nave"]');
        const end = form?.querySelector('select[name="naveEnd"]');
        if (!start || !end) return;
        const options = Array.from(start.options, (option) => option.value);
        const startIndex = Math.max(0, options.indexOf(start.value));
        if (rangeButton.dataset.v6LocationRange === "single") end.value = start.value;
        if (rangeButton.dataset.v6LocationRange === "five") end.value = options[Math.min(options.length - 1, startIndex + 4)];
        if (rangeButton.dataset.v6LocationRange === "end") end.value = options[options.length - 1];
        updateLocationAssistant(form);
        return;
      }
      const recentButton = event.target.closest("[data-v6-location-recent]");
      if (recentButton) {
        const form = recentButton.closest("form");
        const setValue = (name, value) => { const control = form?.querySelector(`[name="${name}"]`); if (control && value) control.value = value; return control; };
        const site = setValue("site", recentButton.dataset.site);
        site?.dispatchEvent(new Event("change", { bubbles: true }));
        setValue("greenhouseSide", recentButton.dataset.greenhouseSide);
        setValue("nave", recentButton.dataset.nave);
        setValue("naveEnd", recentButton.dataset.naveEnd);
        setValue("entrance", recentButton.dataset.entrance);
        setValue("passageSide", recentButton.dataset.passageSide);
        updateLocationAssistant(form);
        return;
      }
      const decisionButton = event.target.closest("[data-design-decision]");
      if (decisionButton) {
        designState.decisions[decisionButton.dataset.designKey] = decisionButton.dataset.designDecision;
        saveDesignState();
        context.render();
        return;
      }
      const removeProposal = event.target.closest("[data-design-remove-proposal]");
      if (removeProposal) {
        designState.proposals = designState.proposals.filter((item) => item.id !== Number(removeProposal.dataset.designRemoveProposal));
        saveDesignState();
        context.render();
        return;
      }
      const button = event.target.closest("[data-module-action]");
      if (button && !button.disabled) handleAction(button);
    });
    context.app.addEventListener("submit", (event) => {
      const featureForm = event.target.closest("[data-v6-form], [data-v7-form]");
      if (featureForm) {
        event.preventDefault();
        handleFeatureForm(featureForm);
        return;
      }
      const form = event.target.closest("[data-design-add-form]");
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      designState.proposals.push({ id: Date.now(), role: context.state.role, screen: context.state.screen, text: String(data.get("proposal") || "").trim(), location: data.get("location") });
      saveDesignState();
      context.render();
    });
    context.app.addEventListener("toggle", (event) => {
      if (event.target.matches(".time-worker-card")) rememberExpandedTimeCards();
    }, true);
    context.app.addEventListener("input", (event) => {
      if (event.target.matches("[data-module-search]")) {
        featureState.search = event.target.value;
        applyFilters();
      }
      if (event.target.matches("[data-time-note]")) {
        const employee = context.state.employees.find((item) => item.id === Number(event.target.dataset.id));
        if (employee) employee.timeNote = event.target.value;
        featureState.scheduleSaved = false;
      }
    });
    context.app.addEventListener("change", (event) => {
      const assignmentForm = event.target.closest('form[data-form="new-task"]');
      if (assignmentForm) updateSmartAssignmentSummary(assignmentForm);
      if (event.target.matches("[data-v6-skill-filter]")) {
        const skill = event.target.value;
        event.target.closest("form")?.querySelectorAll(".employee-picker > label").forEach((label) => { label.hidden = skill !== "all" && label.dataset.skill !== skill; });
      }
      const locationForm = event.target.closest(".v6-location-enhanced");
      if (locationForm && event.target.matches('[name="site"]')) {
        const start = locationForm.querySelector('select[name="nave"]');
        const end = locationForm.querySelector('select[name="naveEnd"]');
        if (start && end) end.innerHTML = start.innerHTML;
      }
      if (locationForm) updateLocationAssistant(locationForm);
      if (event.target.matches('[data-change="attendance"]')) {
        rememberExpandedTimeCards(event.target.dataset.id);
        featureState.scheduleSaved = false;
        context.render();
        return;
      }
      const timeControl = event.target.closest("[data-time-template], [data-time-field], [data-break-count], [data-break-start], [data-break-minutes]");
      if (timeControl) {
        handleTimeControl(timeControl);
        return;
      }
      const control = event.target.closest("[data-module-change]");
      if (!control) return;
      if (control.dataset.moduleChange === "work-date") featureState.workDate = control.value;
      if (control.dataset.moduleChange === "shift") featureState.shift = control.value;
      if (control.dataset.moduleChange === "scope") {
        featureState.scope = control.value;
        saveFeaturePreferences();
        if (context.state.screen === "planning" && context.state.role === "Kierownik" && control.value !== "Wszystkie obiekty") {
          context.state.selectedPlanSite = control.value;
          context.render();
          return;
        }
      }
      saveFeaturePreferences();
      applyFilters();
    });
  }

  window.GreenhouseEnhancements = {
    afterRender(nextContext) {
      if (nextContext.state.loggedIn && lastScreen && lastScreen !== nextContext.state.screen) featureState.search = "";
      context = nextContext;
      if (nextContext.state.screen === "tasks" && featureState.pendingTaskFocus) {
        featureState.search = featureState.pendingTaskFocus;
        featureState.pendingTaskFocus = "";
      }
      lastScreen = nextContext.state.loggedIn ? nextContext.state.screen : null;
      if (nextContext.state.role === "Brygadzista" && nextContext.state.selectedCropSite !== nextContext.state.selectedSite) {
        const first = nextContext.state.observations.find((item) => item.site === nextContext.state.selectedSite && item.status !== "Zamknięte");
        nextContext.state.selectedCropSite = nextContext.state.selectedSite;
        nextContext.state.selectedCropNave = first?.nave || "N01";
        nextContext.state.selectedCropGreenhouseSide = first?.greenhouseSide || "Lewa od łącznika";
        nextContext.state.selectedCropEntrance = first?.entrance || "Wjazd 1";
        nextContext.state.selectedCropPassageSide = first?.passageSide || "Lewa";
        nextContext.state.selectedObservationId = first?.id || null;
        nextContext.render();
        return;
      }
      bindEvents();
      injectEnhancements();
    },
  };
})();
