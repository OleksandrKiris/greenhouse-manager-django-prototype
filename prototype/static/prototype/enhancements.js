(() => {
  "use strict";

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
    copiedPlans: {},
    protectionTaskCreated: false,
    materialOrderCreated: false,
    reportApproved: false,
    scheduleSaved: false,
  };

  const designState = loadDesignState();

  let context = null;
  let eventsBound = false;
  let lastScreen = null;

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
      description: "Widzisz obserwacje ze wszystkich szklarni oraz plan pracy potrzebny do oceny ryzyka dla upraw.",
      rights: ["Oceniaj obserwacje", "Przypisuj działania", "Zamykaj wpisy", "Zgłaszaj potrzebne materiały"],
      restriction: "Nie zmieniasz obsady ani planu kierownika.",
    },
    "Dział techniczny": {
      title: "Usterki, SLA i przywrócenie pracy",
      description: "Widzisz zgłoszenia techniczne wszystkich obiektów oraz kontekst planu potrzebny do ustalenia priorytetu.",
      rights: ["Przyjmuj zgłoszenia", "Przypisuj techników", "Aktualizuj status", "Zamykaj naprawy"],
      restriction: "Plan produkcyjny i obsada pozostają tylko do odczytu.",
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
    "Ochrona roślin": ["dashboard", "planning", "crop", "materials", "reports"],
    "Dział techniczny": ["dashboard", "planning", "tickets", "materials", "reports"],
    Kadry: ["dashboard", "attendance", "team", "reports"],
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character]));

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
    const breaks = (employee.breaks || []).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    return Math.max(0, end - start - breaks);
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

  function contextBar() {
    const { state, companySites } = context;
    const manager = state.role === "Kierownik";
    const scopeControl = manager
      ? `<label><span>Zakres</span><select data-module-change="scope"><option ${featureState.scope === "Wszystkie obiekty" ? "selected" : ""}>Wszystkie obiekty</option>${companySites.map((site) => `<option ${featureState.scope === site ? "selected" : ""}>${site}</option>`).join("")}</select></label>`
      : `<div class="context-fixed"><span>Zakres</span><b>${state.role === "Brygadzista" ? state.selectedSite : `Rola: ${state.role}`}</b></div>`;
    return `<section class="operations-context surface" aria-label="Kontekst operacyjny">
      <div class="context-title"><i></i><span><small>KONTEKST PRACY</small><b>${featureState.shift}</b></span></div>
      <label><span>Data planu</span><input type="date" value="${featureState.workDate}" data-module-change="work-date"></label>
      <label><span>Zmiana</span><select data-module-change="shift"><option ${featureState.shift.startsWith("Poranna") ? "selected" : ""}>Poranna · 06:00–14:00</option><option ${featureState.shift.startsWith("Popołudniowa") ? "selected" : ""}>Popołudniowa · 14:00–22:00</option><option ${featureState.shift.startsWith("Nocna") ? "selected" : ""}>Nocna · 22:00–06:00</option></select></label>
      ${scopeControl}
      <label class="context-search"><span>Szukaj na ekranie</span><input type="search" value="${escapeHtml(featureState.search)}" placeholder="osoba, zadanie, nawa…" data-module-search><small class="context-search-count"></small></label>
      <div class="context-saved"><i>✓</i><span><small>OSTATNI ZAPIS</small><b>przed chwilą</b></span></div>
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
        { screen: "planning", screens: ["planning"], label: "Plan", detail: missing ? `Brakuje ${missing} os.` : "Plan gotowy", done: planPublished && missing === 0 },
        { screen: "attendance", screens: ["attendance"], label: "Obecność", detail: unsettled ? `${unsettled} do decyzji` : "Statusy kompletne", done: unsettled === 0 },
        { screen: "tasks", screens: ["tasks", "productivity", "team", "crop", "tickets", "materials"], label: "Realizacja", detail: openWork ? `${openWork} aktywne prace` : "Prace zakończone", done: openWork === 0 },
        { screen: "reports", screens: ["reports"], label: "Raport", detail: state.shiftClosed ? "Zmiana zamknięta" : "Do zamknięcia", done: state.shiftClosed },
      ],
      Kierownik: [
        { screen: "planning", screens: ["planning"], label: "Plan", detail: missing ? `Brakuje ${missing} os.` : "Obsada gotowa", done: planPublished && missing === 0 },
        { screen: "attendance", screens: ["attendance", "tasks", "team"], label: "Organizacja", detail: unsettled ? `${unsettled} nieustalone` : "Ludzie potwierdzeni", done: unsettled === 0 },
        { screen: "tickets", screens: ["crop", "tickets", "materials"], label: "Ryzyka", detail: criticalTickets ? `${criticalTickets} krytyczne` : "Bez krytycznych", done: criticalTickets === 0 },
        { screen: "reports", screens: ["productivity", "reports"], label: "Raport", detail: state.shiftClosed ? "Zmiana zamknięta" : "Oczekuje", done: state.shiftClosed },
      ],
      "Ochrona roślin": [
        { screen: "planning", screens: ["planning"], label: "Kontekst", detail: "Plan do wglądu", done: true },
        { screen: "crop", screens: ["crop"], label: "Obserwacje", detail: highCrop ? `${highCrop} alarmy` : "Brak alarmów", done: highCrop === 0 },
        { screen: "materials", screens: ["materials"], label: "Działania", detail: "Materiały i zabiegi", done: featureState.protectionTaskCreated },
        { screen: "reports", screens: ["reports"], label: "Przekazanie", detail: "Raport kierownika", done: featureState.reportApproved },
      ],
      "Dział techniczny": [
        { screen: "planning", screens: ["planning"], label: "Kontekst", detail: "Plan do wglądu", done: true },
        { screen: "tickets", screens: ["tickets"], label: "Zgłoszenia", detail: criticalTickets ? `${criticalTickets} krytyczne` : "SLA pod kontrolą", done: criticalTickets === 0 },
        { screen: "materials", screens: ["materials"], label: "Realizacja", detail: `${openTickets().length} aktywnych`, done: openTickets().length === 0 },
        { screen: "reports", screens: ["reports"], label: "Przekazanie", detail: "Historia napraw", done: featureState.reportApproved },
      ],
      Kadry: [
        { screen: "attendance", screens: ["attendance"], label: "Czas pracy", detail: unsettled ? `${unsettled} do decyzji` : "Kompletne dane", done: unsettled === 0 },
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
    const planningTarget = state.role === "Kadry" ? "attendance" : "planning";
    const planningLabel = state.role === "Kadry" ? "Sprawdź obecność" : "Sprawdź plan";
    const issueTarget = state.role === "Ochrona roślin" ? "crop" : state.role === "Kadry" ? "reports" : "tickets";
    const issueLabel = state.role === "Ochrona roślin" ? "Obsłuż obserwacje" : state.role === "Kadry" ? "Sprawdź raport" : "Obsłuż problemy";
    const planScope = state.role === "Brygadzista" ? state.plan.filter((item) => item.site === state.selectedSite) : state.plan;
    const missing = planScope.reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
    const unpublished = state.role === "Brygadzista" ? Number(!state.planPublication[state.selectedSite]) : Object.values(state.planPublication).filter((value) => !value).length;
    const critical = openTickets().filter((ticket) => ticket.priority === "Krytyczny").length;
    const present = state.employees.filter((employee) => employee.status === "Obecny").length;
    const unsettled = state.employees.filter((employee) => employee.status === "Nieustalony").length;
    const activeCrop = openObservations();
    const metricsByRole = {
      Brygadzista: [metric("Braki w mojej obsadzie", missing, "osób w planie szklarni", missing ? "amber" : "green"), metric("Mój plan", unpublished ? "Roboczy" : "Opublikowany", unpublished ? "czeka na kierownika" : "gotowy do realizacji", unpublished ? "blue" : "green"), metric("Krytyczne w obiekcie", critical, "zgłoszenia mojej szklarni", critical ? "red" : "green"), metric("Gotowość brygady", `${Math.max(0, 100 - missing * 8 - critical * 10)}%`, "obsada + bezpieczeństwo")],
      Kierownik: [metric("Braki obsady", missing, "osób we wszystkich planach", missing ? "amber" : "green"), metric("Plany robocze", unpublished, "obiektów czeka na publikację", unpublished ? "blue" : "green"), metric("Krytyczne usterki", critical, "wymagają reakcji", critical ? "red" : "green"), metric("Gotowość zmiany", `${Math.max(0, 100 - missing * 4 - critical * 8)}%`, "plan + obsada + bezpieczeństwo")],
      "Ochrona roślin": [metric("Alarmy", activeCrop.filter((item) => item.severity === "high").length, "wysoki poziom ryzyka", "red"), metric("Do kontroli", activeCrop.filter((item) => item.severity === "medium").length, "średni poziom", "amber"), metric("Bez właściciela", activeCrop.filter((item) => item.owner.includes("kolejka")).length, "czeka na przypisanie", "blue"), metric("Aktywne obserwacje", activeCrop.length, "we wszystkich szklarniach")],
      "Dział techniczny": [metric("Krytyczne", critical, "reakcja natychmiastowa", "red"), metric("Nowe", openTickets().filter((ticket) => ticket.status === "Nowe").length, "czekają na przyjęcie", "amber"), metric("W kolejce", openTickets().filter((ticket) => ticket.owner.includes("kolejka")).length, "bez technika", "blue"), metric("W realizacji", openTickets().filter((ticket) => ticket.status === "W realizacji").length, "aktywne naprawy")],
      Kadry: [metric("Obecni", present, `z ${state.employees.length} pokazanych`), metric("Nieustaleni", unsettled, "wymagają wyjaśnienia", unsettled ? "red" : "green"), metric("Nieobecni", state.employees.length - present - unsettled, "urlop lub zwolnienie", "blue"), metric("Gotowość danych", `${Math.round((state.employees.length - unsettled) / state.employees.length * 100)}%`, "do rozliczenia zmiany")],
    };
    const stepsByRole = {
      Brygadzista: [["red", "Najpierw", "Problemy blokujące moją brygadę"], ["amber", "Następnie", "Braki ludzi w moim planie"], ["green", "Na końcu", "Wyniki i raport mojej zmiany"]],
      Kierownik: [["red", "Najpierw", "Krytyczne SLA i zatrzymane prace"], ["amber", "Następnie", "Braki ludzi i plany robocze"], ["green", "Na końcu", "Wynik całego przedsiębiorstwa"]],
      "Ochrona roślin": [["red", "Najpierw", "Alarmy wysokiego ryzyka"], ["amber", "Następnie", "Przypisanie kolejki obserwacji"], ["green", "Na końcu", "Kontrola skuteczności działania"]],
      "Dział techniczny": [["red", "Najpierw", "Krytyczne zgłoszenia i SLA"], ["amber", "Następnie", "Nowe wpisy bez technika"], ["green", "Na końcu", "Potwierdzenie naprawy i historia"]],
      Kadry: [["red", "Najpierw", "Nieustalona obecność"], ["amber", "Następnie", "Dokumenty i korekty godzin"], ["green", "Na końcu", "Kompletny eksport kadrowy"]],
    };
    return `<section class="module-upgrade dashboard-upgrade">
      <div class="upgrade-head"><div><span class="kicker">CENTRUM DECYZJI</span><h2>Najważniejsze na tej zmianie</h2><p>Każda rola od razu widzi, co wymaga reakcji, a co jest już pod kontrolą.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="quick-nav" data-target="${planningTarget}">${planningLabel}</button><button class="primary" data-module-action="quick-nav" data-target="${issueTarget}">${issueLabel}</button></div></div>
      <div class="upgrade-metrics">${metricsByRole[state.role].join("")}</div>
      <div class="decision-lane">${stepsByRole[state.role].map(([tone, title, copy], index) => `${index ? "<em>→</em>" : ""}<span><i class="${tone}"></i><b>${title}</b><small>${copy}</small></span>`).join("")}</div>
    </section>`;
  }

  function planningPanel() {
    const { state } = context;
    const nextByRole = state.role === "Brygadzista" ? ["tasks", "Przejdź do moich prac"] : state.role === "Ochrona roślin" ? ["crop", "Sprawdź ryzyko upraw"] : ["tickets", "Sprawdź zgłoszenia"];
    const plan = activePlan();
    const missing = plan.reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
    const high = plan.filter((item) => item.priority === "Wysoki").length;
    const published = state.role === "Kierownik" ? state.planPublication[state.selectedPlanSite] : state.role === "Brygadzista" ? state.planPublication[state.selectedSite] : Object.values(state.planPublication).every(Boolean);
    return `<section class="module-upgrade planning-upgrade">
      <div class="upgrade-head"><div><span class="kicker">${state.role === "Kierownik" ? "KONTROLA PRZED PUBLIKACJĄ" : "PLAN DO WGLĄDU"}</span><h2>${state.role === "Kierownik" ? "Plan kompletny i bez konfliktów" : "Tylko informacje potrzebne do Twojej pracy"}</h2><p>${state.role === "Kierownik" ? "Data, obsada, odpowiedzialność i norma są sprawdzane dla wybranego obiektu." : "Plan kierownika jest dostępny jako kontekst. Zmiany wykonuje wyłącznie osoba z odpowiednim uprawnieniem."}</p></div><div class="upgrade-actions">${state.role === "Kierownik" ? `<button class="secondary" data-module-action="copy-plan">Kopiuj na jutro</button><button class="secondary" data-module-action="balance-plan">Zaproponuj obsadę</button><button class="primary" data-module-action="validate-plan">Sprawdź plan</button>` : `<button class="primary" data-module-action="quick-nav" data-target="${nextByRole[0]}">${nextByRole[1]}</button>`}</div></div>
      <div class="upgrade-metrics">${metric("Pozycje", plan.length, "dla wybranego obiektu")}${metric("Brakujące osoby", missing, missing ? "do przydzielenia" : "obsada kompletna", missing ? "amber" : "green")}${metric("Wysoki priorytet", high, "pozycji do omówienia", high ? "red" : "green")}${metric("Publikacja", published ? "Gotowa" : "Robocza", published ? "brygadziści widzą plan" : "wymaga publikacji", published ? "green" : "blue")}</div>
      <div class="publication-checklist"><span class="${plan.length ? "done" : ""}"><i>${plan.length ? "✓" : "1"}</i><b>Zadania</b><small>${plan.length ? `${plan.length} pozycji` : "brak pozycji"}</small></span><span class="${missing === 0 ? "done" : "warn"}"><i>${missing === 0 ? "✓" : "2"}</i><b>Obsada</b><small>${missing ? `brakuje ${missing} os.` : "kompletna"}</small></span><span class="${plan.every((item) => item.foreman && item.chief) ? "done" : ""}"><i>✓</i><b>Odpowiedzialność</b><small>główny + realizujący</small></span><span class="${published ? "done" : ""}"><i>${published ? "✓" : "4"}</i><b>Publikacja</b><small>${featureState.planValidated ? "sprawdzono teraz" : published ? "opublikowany" : "oczekuje"}</small></span></div>
      ${featureState.planCopied ? `<div class="inline-confirmation">✓ Utworzono roboczą kopię planu na następny dzień. Można ją dalej redagować.</div>` : ""}
    </section>`;
  }

  function attendancePanel() {
    const { state } = context;
    const nextTarget = state.role === "Kadry" ? "reports" : "tasks";
    const nextLabel = state.role === "Kadry" ? "Przejdź do raportu" : "Przydziel obecnych";
    const present = state.employees.filter((employee) => employee.status === "Obecny").length;
    const unsettled = state.employees.filter((employee) => employee.status === "Nieustalony").length;
    const absent = state.employees.length - present - unsettled;
    const netMinutes = state.employees.reduce((sum, employee) => sum + employeeNetMinutes(employee), 0);
    const doubleBreaks = state.employees.filter((employee) => employee.status === "Obecny" && employee.breaks?.length === 2).length;
    return `<section class="module-upgrade attendance-upgrade">
      <div class="upgrade-head"><div><span class="kicker">ELASTYCZNY CZAS PRACY</span><h2>Każda osoba może mieć inny czas i przerwy</h2><p>Start, koniec oraz jedna lub dwie przerwy są zapisywane indywidualnie. System automatycznie liczy czas netto.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="attendance-reminder">Przypomnij o potwierdzeniu</button><button class="primary" data-module-action="quick-nav" data-target="${nextTarget}">${nextLabel}</button></div></div>
      <div class="upgrade-metrics">${metric("Obecni", present, `z ${state.employees.length} pokazanych`)}${metric("Czas netto", `${Math.floor(netMinutes / 60)} h ${netMinutes % 60} min`, "suma bieżącego podglądu", "blue")}${metric("Dwie przerwy", doubleBreaks, "indywidualne harmonogramy")}${metric("Nieustaleni", unsettled, unsettled ? "wymagają decyzji" : "statusy kompletne", unsettled ? "amber" : "green")}</div>
      <div class="filter-row"><span>Filtr listy</span>${segmented("attendance", ["Wszyscy", "Obecni", "Nieustaleni", "Nieobecni"], featureState.attendanceFilter)}<small class="filter-result">${featureState.scheduleSaved ? "✓ harmonogram zapisany" : featureState.reminderSent ? "✓ przypomnienie zapisane" : `${absent} nieobecnych`}</small></div>
    </section>`;
  }

  function tasksPanel() {
    const tasks = scopedTasks();
    const running = tasks.filter((task) => task.status === "W trakcie");
    const paused = tasks.filter((task) => task.status === "Wstrzymane");
    const complete = tasks.filter((task) => task.status === "Zakończone");
    const people = new Set(activeTasks().flatMap((task) => task.people)).size;
    return `<section class="module-upgrade tasks-upgrade">
      <div class="upgrade-head"><div><span class="kicker">STEROWANIE REALIZACJĄ</span><h2>Prace, ludzie i postęp w jednym miejscu</h2><p>Filtruj kolejkę, aktualizuj postęp i reaguj na zadania wstrzymane.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="advance-tasks">+10% do aktywnych</button><button class="primary" data-module-action="open-first-task">Otwórz najpilniejszą</button></div></div>
      <div class="upgrade-metrics">${metric("W trakcie", running.length, "aktywnych prac")}${metric("Wstrzymane", paused.length, paused.length ? "wymagają decyzji" : "brak blokad", paused.length ? "red" : "green")}${metric("Zakończone", complete.length, "z pełnym wynikiem", "blue")}${metric("Zaangażowani", people, "unikalnych osób")}</div>
      <div class="filter-row"><span>Status prac</span>${segmented("tasks", ["Wszystkie", "W trakcie", "Wstrzymane", "Zakończone"], featureState.taskFilter)}</div>
    </section>`;
  }

  function productivityPanel() {
    const results = scopedTasks().flatMap((task) => (task.contributions || []).map((entry) => ({ ...entry, unit: task.unit })));
    const kg = results.filter((entry) => entry.unit === "kg");
    const rows = results.filter((entry) => entry.unit === "rz.");
    const kgRate = kg.length ? Math.round(kg.reduce((sum, entry) => sum + entry.result / entry.hours, 0) / kg.length) : 0;
    const rowRate = rows.length ? (rows.reduce((sum, entry) => sum + entry.result / entry.hours, 0) / rows.length).toFixed(2) : "0.00";
    return `<section class="module-upgrade productivity-upgrade">
      <div class="upgrade-head"><div><span class="kicker">NORMY I TREND</span><h2>Porównuj tylko zgodne jednostki</h2><p>Kilogramy i rzędy są analizowane osobno, aby wynik był czytelny i uczciwy.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="quick-nav" data-target="team">Sprawdź kompetencje</button><button class="primary" data-module-action="download-productivity">Eksportuj wyniki</button></div></div>
      <div class="upgrade-metrics">${metric("Średnio kg/h", kgRate, `${kg.length} zapisanych wyników`)}${metric("Średnio rz./h", rowRate, `${rows.length} zapisanych wyników`, "blue")}${metric("Powyżej normy", results.filter((entry) => entry.result / entry.hours >= (entry.unit === "kg" ? 120 : 1)).length, "indywidualnych wyników")}${metric("Do wsparcia", results.filter((entry) => entry.result / entry.hours < (entry.unit === "kg" ? 120 : .75)).length, "sprawdź przyczynę", "amber")}</div>
      <div class="filter-row"><span>Jednostka</span>${segmented("productivity", ["Wszystkie", "kg/h", "rz./h"], featureState.productivityUnit)}<small class="filter-result">Normy: zbiór 120 kg/h · prace rzędowe zależnie od rodzaju</small></div>
    </section>`;
  }

  function teamPanel() {
    const { state } = context;
    const mentors = Array.from(context.app.querySelectorAll(".team-row")).filter((row) => row.textContent.toLowerCase().includes("mentor")).length;
    const available = state.employees.filter((employee) => employee.status === "Obecny").length;
    const expiring = Array.from(context.app.querySelectorAll(".team-row")).filter((row) => /08\.2026|09\.2026/.test(row.textContent)).length;
    const assignedPeople = new Set(activeTasks().flatMap((task) => task.people)).size;
    return `<section class="module-upgrade team-upgrade">
      <div class="upgrade-head"><div><span class="kicker">DOSTĘPNOŚĆ I OBCIĄŻENIE</span><h2>Dobieraj ludzi według gotowości</h2><p>Status, kompetencje, obciążenie i dokumenty są widoczne przed przydziałem.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="set-team-expiring">Dokumenty do odnowienia</button><button class="primary" data-module-action="quick-nav" data-target="${state.role === "Kadry" ? "reports" : "tasks"}">${state.role === "Kadry" ? "Przejdź do raportu" : "Przydziel do pracy"}</button></div></div>
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
    </section>`;
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
    legacy.innerHTML = `<header class="time-roster-head"><div><span class="kicker">HARMONOGRAM INDYWIDUALNY</span><h3>Czas pracy i przerwy</h3><p>Każdy wpis może mieć inny start, koniec, liczbę przerw oraz ich długość.</p></div><div class="time-legend"><span><i class="green"></i>czas netto</span><span><i class="amber"></i>przerwy</span><span><i class="blue"></i>czas obecności</span></div></header>
      <div class="time-roster">${context.state.employees.map((employee) => {
        const present = employee.status === "Obecny";
        const breaks = employee.breaks || [];
        const net = employeeNetMinutes(employee);
        const gross = present ? net + breaks.reduce((sum, item) => sum + Number(item.minutes || 0), 0) : 0;
        return `<article class="time-worker-card ${present ? "" : "inactive"}">
          <header><span class="person"><i class="avatar">${employee.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</i><span><b>${employee.name}</b><small>${employee.code}</small></span></span><strong>${present ? `${formatMinutes(net)} netto` : employee.status}</strong></header>
          <div class="time-card-grid"><label><span>Status</span><select data-change="attendance" data-id="${employee.id}" aria-label="Status ${escapeHtml(employee.name)}">${["Obecny", "Urlop", "Zwolnienie", "Nieustalony"].map((status) => `<option ${employee.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label><label><span>Szablon</span><select data-time-template data-id="${employee.id}" ${present ? "" : "disabled"}><option value="custom">Indywidualnie</option><option value="early">05:45–14:00 · 1 przerwa</option><option value="double">06:00–14:30 · 2 przerwy</option><option value="late">07:00–15:30 · 1 przerwa</option></select></label><label><span>Start</span><input type="time" value="${present ? employee.start : ""}" data-time-field="start" data-id="${employee.id}" ${present ? "" : "disabled"}></label><label><span>Koniec</span><input type="time" value="${present ? employee.end : ""}" data-time-field="end" data-id="${employee.id}" ${present ? "" : "disabled"}></label><label><span>Liczba przerw</span><select data-break-count data-id="${employee.id}" ${present ? "" : "disabled"}><option value="1" ${breaks.length === 1 ? "selected" : ""}>1 przerwa</option><option value="2" ${breaks.length === 2 ? "selected" : ""}>2 przerwy</option></select></label></div>
          <div class="break-editor">${present ? breaks.map((item, index) => `<div><span><b>Przerwa ${index + 1}</b><small>${item.start} · ${item.minutes} min</small></span><label><span>Od</span><input type="time" value="${item.start}" data-break-start data-break-index="${index}" data-id="${employee.id}"></label><label><span>Minuty</span><input type="number" min="5" max="90" step="5" value="${item.minutes}" data-break-minutes data-break-index="${index}" data-id="${employee.id}"></label></div>`).join("") : `<div class="break-empty">Przerwy nie są liczone przy statusie „${employee.status}”.</div>`}</div>
          <footer><label><span>Notatka do czasu pracy</span><input value="${escapeHtml(employee.timeNote || "")}" placeholder="np. późniejszy przyjazd" data-time-note data-id="${employee.id}"></label><div class="time-total"><span><small>Obecność</small><b>${present ? formatMinutes(gross) : "—"}</b></span><i>−</i><span><small>Przerwy</small><b>${present ? `${breaks.reduce((sum, item) => sum + Number(item.minutes || 0), 0)} min` : "—"}</b></span><i>=</i><span class="net"><small>Do rozliczenia</small><b>${present ? formatMinutes(net) : "—"}</b></span></div></footer>
        </article>`;
      }).join("")}</div>
      <footer class="time-roster-foot"><span><b>Automatyczne rozliczenie:</b> koniec − start − suma przerw. Obsługiwane są również zmiany przechodzące przez północ.</span><button class="primary" data-module-action="save-schedule">Zapisz harmonogram czasu</button></footer>`;
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

  function injectEnhancements() {
    if (!context.state.loggedIn) {
      loginEnhancement();
      return;
    }
    ensureTimeProfiles();
    const pageHead = context.app.querySelector(".content > .page-head");
    if (!pageHead) return;
    const guidance = context.state.screen === "dashboard" ? roleFocusPanel() : workflowPanel();
    pageHead.insertAdjacentHTML("afterend", `${contextBar()}${guidance}${designStudioPanel()}${modulePanel()}`);
    applyRolePermissions();
    renderFlexibleAttendance();
    decorateReviewBlocks();
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
      element.hidden = !show;
      if (show) visible += 1;
    });
    const counter = context.app.querySelector(".context-search-count");
    if (counter) counter.textContent = search || scope || visible !== targets.length ? `${visible} z ${targets.length}` : "";
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
    context.render();
  }

  function handleAction(button) {
    const { state, notify, navigate, render, exportJson, addTicketEvent } = context;
    const action = button.dataset.moduleAction;
    if (action === "set-filter") return handleFilter(button);
    if (action === "quick-nav") return navigate(button.dataset.target);
    if (action === "validate-plan") {
      featureState.planValidated = true;
      const missing = activePlan().reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
      notify(missing ? `Plan sprawdzony: brakuje ${missing} os.` : "Plan sprawdzony: gotowy do publikacji");
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
    if (action === "download-productivity") {
      exportJson("wydajnosc-zmiany-demo.json", scopedTasks().flatMap((task) => (task.contributions || []).map((entry) => ({ ...entry, zadanie: task.title, jednostka: task.unit, miejsce: task.site }))));
      notify("Przygotowano eksport wydajności");
    }
    if (action === "set-team-expiring") {
      featureState.teamFilter = "Dokumenty";
      render();
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

  function handleTimeControl(control) {
    const employee = context.state.employees.find((item) => item.id === Number(control.dataset.id));
    if (!employee) return;
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

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    context.app.addEventListener("click", (event) => {
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
      const form = event.target.closest("[data-design-add-form]");
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      designState.proposals.push({ id: Date.now(), role: context.state.role, screen: context.state.screen, text: String(data.get("proposal") || "").trim(), location: data.get("location") });
      saveDesignState();
      context.render();
    });
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
      if (event.target.matches('[data-change="attendance"]')) {
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
        if (context.state.screen === "planning" && context.state.role === "Kierownik" && control.value !== "Wszystkie obiekty") {
          context.state.selectedPlanSite = control.value;
          context.render();
          return;
        }
      }
      applyFilters();
    });
  }

  window.GreenhouseEnhancements = {
    afterRender(nextContext) {
      if (nextContext.state.loggedIn && lastScreen && lastScreen !== nextContext.state.screen) featureState.search = "";
      context = nextContext;
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
