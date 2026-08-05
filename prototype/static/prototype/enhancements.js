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
  };

  let context = null;
  let eventsBound = false;
  let lastScreen = null;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character]));

  const activePlan = () => {
    const { state } = context;
    const site = state.role === "Kierownik" ? state.selectedPlanSite : state.selectedSite;
    return state.plan.filter((item) => item.site === site && (!state.currentOnly || item.current !== false));
  };

  const activeTasks = () => context.state.tasks.filter((task) => task.status !== "Zakończone");
  const openTickets = () => context.state.tickets.filter((ticket) => ticket.status !== "Zamknięte");
  const openObservations = () => context.state.observations.filter((item) => item.status !== "Zamknięte");
  const lowMaterials = () => context.state.materials.filter((item) => item.quantity < item.min);

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

  function dashboardPanel() {
    const { state } = context;
    const planningTarget = state.role === "Kadry" ? "attendance" : "planning";
    const planningLabel = state.role === "Kadry" ? "Sprawdź obecność" : "Sprawdź plan";
    const issueTarget = state.role === "Ochrona roślin" ? "crop" : state.role === "Kadry" ? "reports" : "tickets";
    const issueLabel = state.role === "Ochrona roślin" ? "Obsłuż obserwacje" : state.role === "Kadry" ? "Sprawdź raport" : "Obsłuż problemy";
    const missing = state.plan.reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
    const unpublished = Object.values(state.planPublication).filter((value) => !value).length;
    const critical = openTickets().filter((ticket) => ticket.priority === "Krytyczny").length;
    return `<section class="module-upgrade dashboard-upgrade">
      <div class="upgrade-head"><div><span class="kicker">CENTRUM DECYZJI</span><h2>Najważniejsze na tej zmianie</h2><p>Każda rola od razu widzi, co wymaga reakcji, a co jest już pod kontrolą.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="quick-nav" data-target="${planningTarget}">${planningLabel}</button><button class="primary" data-module-action="quick-nav" data-target="${issueTarget}">${issueLabel}</button></div></div>
      <div class="upgrade-metrics">${metric("Braki obsady", missing, "osób we wszystkich planach", missing ? "amber" : "green")}${metric("Plany robocze", unpublished, "obiektów czeka na publikację", unpublished ? "blue" : "green")}${metric("Krytyczne usterki", critical, "wymagają reakcji", critical ? "red" : "green")}${metric("Gotowość zmiany", `${Math.max(0, 100 - missing * 4 - critical * 8)}%`, "plan + obsada + bezpieczeństwo", "green")}</div>
      <div class="decision-lane"><span><i class="red"></i><b>Najpierw</b><small>Krytyczne SLA i zatrzymane prace</small></span><em>→</em><span><i class="amber"></i><b>Następnie</b><small>Braki ludzi i nieopublikowane plany</small></span><em>→</em><span><i class="green"></i><b>Na końcu</b><small>Kontrola wyniku i raport zmiany</small></span></div>
    </section>`;
  }

  function planningPanel() {
    const { state } = context;
    const plan = activePlan();
    const missing = plan.reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
    const high = plan.filter((item) => item.priority === "Wysoki").length;
    const published = state.planPublication[state.role === "Kierownik" ? state.selectedPlanSite : state.selectedSite];
    return `<section class="module-upgrade planning-upgrade">
      <div class="upgrade-head"><div><span class="kicker">KONTROLA PRZED PUBLIKACJĄ</span><h2>Plan kompletny i bez konfliktów</h2><p>Data, obsada, odpowiedzialność i norma są sprawdzane dla wybranego obiektu.</p></div><div class="upgrade-actions">${state.role === "Kierownik" ? `<button class="secondary" data-module-action="copy-plan">Kopiuj na jutro</button><button class="secondary" data-module-action="balance-plan">Zaproponuj obsadę</button><button class="primary" data-module-action="validate-plan">Sprawdź plan</button>` : `<button class="primary" data-module-action="quick-nav" data-target="tasks">Przejdź do realizacji</button>`}</div></div>
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
    return `<section class="module-upgrade attendance-upgrade">
      <div class="upgrade-head"><div><span class="kicker">GOTOWOŚĆ OBSADY</span><h2>Obecność przed przydzieleniem pracy</h2><p>Najpierw wyjaśnij niepotwierdzone osoby, potem zatwierdź gotową obsadę.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="attendance-reminder">Przypomnij o potwierdzeniu</button><button class="primary" data-module-action="quick-nav" data-target="${nextTarget}">${nextLabel}</button></div></div>
      <div class="upgrade-metrics">${metric("Obecni", present, `z ${state.employees.length} pokazanych`)}${metric("Nieustaleni", unsettled, "wymagają decyzji", unsettled ? "amber" : "green")}${metric("Nieobecni", absent, "urlop lub zwolnienie", "blue")}${metric("Gotowość", `${Math.round(present / state.employees.length * 100)}%`, "przykładowej brygady")}</div>
      <div class="filter-row"><span>Filtr listy</span>${segmented("attendance", ["Wszyscy", "Obecni", "Nieustaleni", "Nieobecni"], featureState.attendanceFilter)}${featureState.reminderSent ? `<small class="filter-result">✓ przypomnienie zapisane</small>` : ""}</div>
    </section>`;
  }

  function tasksPanel() {
    const { state } = context;
    const running = state.tasks.filter((task) => task.status === "W trakcie");
    const paused = state.tasks.filter((task) => task.status === "Wstrzymane");
    const complete = state.tasks.filter((task) => task.status === "Zakończone");
    const people = new Set(activeTasks().flatMap((task) => task.people)).size;
    return `<section class="module-upgrade tasks-upgrade">
      <div class="upgrade-head"><div><span class="kicker">STEROWANIE REALIZACJĄ</span><h2>Prace, ludzie i postęp w jednym miejscu</h2><p>Filtruj kolejkę, aktualizuj postęp i reaguj na zadania wstrzymane.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="advance-tasks">+10% do aktywnych</button><button class="primary" data-module-action="open-first-task">Otwórz najpilniejszą</button></div></div>
      <div class="upgrade-metrics">${metric("W trakcie", running.length, "aktywnych prac")}${metric("Wstrzymane", paused.length, paused.length ? "wymagają decyzji" : "brak blokad", paused.length ? "red" : "green")}${metric("Zakończone", complete.length, "z pełnym wynikiem", "blue")}${metric("Zaangażowani", people, "unikalnych osób")}</div>
      <div class="filter-row"><span>Status prac</span>${segmented("tasks", ["Wszystkie", "W trakcie", "Wstrzymane", "Zakończone"], featureState.taskFilter)}</div>
    </section>`;
  }

  function productivityPanel() {
    const { state } = context;
    const results = state.tasks.flatMap((task) => (task.contributions || []).map((entry) => ({ ...entry, unit: task.unit })));
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
    const observations = openObservations();
    const high = observations.filter((item) => item.severity === "high").length;
    const medium = observations.filter((item) => item.severity === "medium").length;
    const unassigned = observations.filter((item) => item.owner.includes("kolejka")).length;
    return `<section class="module-upgrade crop-upgrade">
      <div class="upgrade-head"><div><span class="kicker">KOLEJKA OCHRONY ROŚLIN</span><h2>Od obserwacji do działania</h2><p>Najpierw alarmy, następnie wpisy do kontroli i obserwacja zmian w czasie.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="focus-high-observation">Pokaż pierwszy alarm</button><button class="primary" data-module-action="create-protection-task">Utwórz działanie</button></div></div>
      <div class="upgrade-metrics">${metric("Alarmy", high, "wysoki poziom", high ? "red" : "green")}${metric("Do kontroli", medium, "średni poziom", medium ? "amber" : "green")}${metric("Bez właściciela", unassigned, "czeka w kolejce", unassigned ? "blue" : "green")}${metric("Aktywne", observations.length, "we wszystkich szklarniach")}</div>
      <div class="filter-row"><span>Poziom ryzyka</span>${segmented("crop", ["Wszystkie", "Alarm", "Do kontroli", "Obserwacja"], featureState.cropFilter)}${featureState.protectionTaskCreated ? `<small class="filter-result">✓ działanie przypisane</small>` : ""}</div>
    </section>`;
  }

  function ticketsPanel() {
    const tickets = openTickets();
    const critical = tickets.filter((ticket) => ticket.priority === "Krytyczny").length;
    const newCount = tickets.filter((ticket) => ticket.status === "Nowe").length;
    const queued = tickets.filter((ticket) => ticket.owner.includes("kolejka")).length;
    return `<section class="module-upgrade tickets-upgrade">
      <div class="upgrade-head"><div><span class="kicker">SLA I ODPOWIEDZIALNOŚĆ</span><h2>Każde zgłoszenie ma właściciela</h2><p>Źródło informacji, zgłaszający, realizujący i historia decyzji pozostają razem.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="assign-ticket-queue">Przypisz kolejkę</button><button class="primary" data-module-action="open-critical-ticket">Otwórz krytyczne</button></div></div>
      <div class="upgrade-metrics">${metric("Krytyczne", critical, "reakcja natychmiastowa", critical ? "red" : "green")}${metric("Nowe", newCount, "czekają na przyjęcie", newCount ? "amber" : "green")}${metric("W kolejce", queued, "bez osoby realizującej", queued ? "blue" : "green")}${metric("Aktywne", tickets.length, "wszystkie kategorie")}</div>
      <div class="sla-lane"><span><small>NOWE</small><b>${newCount}</b></span><i>→</i><span><small>PRZYJĘTE</small><b>${tickets.filter((ticket) => ticket.status === "Przyjęte").length}</b></span><i>→</i><span><small>W REALIZACJI</small><b>${tickets.filter((ticket) => ticket.status === "W realizacji").length}</b></span><i>→</i><span><small>ZAMKNIĘTE DZISIAJ</small><b>${context.state.tickets.filter((ticket) => ticket.status === "Zamknięte").length}</b></span></div>
    </section>`;
  }

  function materialsPanel() {
    const low = lowMaterials();
    const reserved = context.state.materials.filter((item) => item.reserved).reduce((sum, item) => sum + item.reserved, 0);
    return `<section class="module-upgrade materials-upgrade">
      <div class="upgrade-head"><div><span class="kicker">PROGNOZA ZAPASU</span><h2>Zamów zanim materiał się skończy</h2><p>Stan minimalny, rezerwacje i przewidywane zużycie wspierają planowanie zmiany.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="reserve-materials">Rezerwuj do planu</button><button class="primary" data-module-action="create-material-orders">Zamów braki</button></div></div>
      <div class="upgrade-metrics">${metric("Poniżej minimum", low.length, "pozycje do zamówienia", low.length ? "red" : "green")}${metric("Rezerwacje", reserved, "jednostek dla planu", "blue")}${metric("Pozycje magazynowe", context.state.materials.length, "w demonstracji")}${metric("Zamówienie", featureState.materialOrderCreated ? "Utworzone" : "Oczekuje", featureState.materialOrderCreated ? "przekazane do akceptacji" : "dla niskich stanów", featureState.materialOrderCreated ? "green" : "amber")}</div>
      <div class="forecast-list">${context.state.materials.map((item) => { const below = item.quantity < item.min; const days = Math.max(1, Math.round(item.quantity / Math.max(1, item.min / 7))); return `<span class="${below ? "low" : ""}"><i>${below ? "!" : "✓"}</i><b>${item.name}</b><small>${below ? `poniżej minimum · około ${days} dni zapasu` : `stan bezpieczny · około ${days} dni`}</small></span>`; }).join("")}</div>
    </section>`;
  }

  function reportsPanel() {
    const { state } = context;
    const unsettled = state.employees.filter((employee) => employee.status === "Nieustalony").length;
    const incomplete = state.tasks.filter((task) => task.status === "Zakończone" && (!task.result || !task.hours || !task.contributions?.length)).length;
    const openCritical = openTickets().filter((ticket) => ticket.priority === "Krytyczny").length;
    const ready = unsettled + incomplete === 0;
    return `<section class="module-upgrade reports-upgrade">
      <div class="upgrade-head"><div><span class="kicker">KOMPLETNOŚĆ ZMIANY</span><h2>Raport gotowy do zatwierdzenia</h2><p>Przed eksportem system sprawdza obecność, wyniki, osoby, lokalizacje i otwarte ryzyka.</p></div><div class="upgrade-actions"><button class="secondary" data-module-action="download-full-report">Eksport pełnych danych</button><button class="primary" data-module-action="approve-report" ${!ready ? "disabled" : ""}>${featureState.reportApproved ? "✓ Zatwierdzono" : "Zatwierdź raport"}</button></div></div>
      <div class="upgrade-metrics">${metric("Nieustalona obecność", unsettled, unsettled ? "blokuje zamknięcie" : "kompletna", unsettled ? "red" : "green")}${metric("Brakujące wyniki", incomplete, incomplete ? "uzupełnij zadania" : "wszystkie zapisane", incomplete ? "amber" : "green")}${metric("Krytyczne problemy", openCritical, "przejdą do następnej zmiany", openCritical ? "red" : "green")}${metric("Status raportu", featureState.reportApproved ? "Zatwierdzony" : ready ? "Gotowy" : "Niekompletny", featureState.reportApproved ? "zapisano decyzję" : ready ? "można zatwierdzić" : "usuń blokady", ready ? "green" : "blue")}</div>
      <div class="report-readiness"><span class="${unsettled ? "blocked" : "done"}"><i>${unsettled ? "!" : "✓"}</i><b>Obecność</b><small>${unsettled ? `${unsettled} do wyjaśnienia` : "kompletna"}</small></span><span class="${incomplete ? "blocked" : "done"}"><i>${incomplete ? "!" : "✓"}</i><b>Wyniki prac</b><small>${incomplete ? `${incomplete} braków` : "kompletne"}</small></span><span class="done"><i>✓</i><b>Lokalizacje</b><small>pełna ścieżka miejsca</small></span><span class="${featureState.reportApproved ? "done" : ""}"><i>${featureState.reportApproved ? "✓" : "4"}</i><b>Decyzja</b><small>${featureState.reportApproved ? "zatwierdzono" : "oczekuje"}</small></span></div>
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

  function injectEnhancements() {
    if (!context.state.loggedIn) {
      loginEnhancement();
      return;
    }
    const pageHead = context.app.querySelector(".content > .page-head");
    if (!pageHead) return;
    pageHead.insertAdjacentHTML("afterend", `${contextBar()}${modulePanel()}`);
    applyFilters();
  }

  function searchTargets() {
    const selectors = {
      dashboard: ".facility, .event",
      planning: ".plan-card",
      attendance: ".tr:not(.head)",
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
      exportJson("wydajnosc-zmiany-demo.json", state.tasks.flatMap((task) => (task.contributions || []).map((entry) => ({ ...entry, zadanie: task.title, jednostka: task.unit, miejsce: task.site }))));
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
    if (action === "reserve-materials") {
      state.materials.forEach((item) => { item.reserved = Math.min(item.quantity, Math.max(0, Math.round(item.min * .15))); });
      notify("Zarezerwowano materiały dla bieżącego planu");
    }
    if (action === "create-material-orders") {
      lowMaterials().forEach((item) => { item.orderPending = item.min * 2 - item.quantity; });
      featureState.materialOrderCreated = true;
      const notification = state.notifications.find((item) => item.id === 3);
      if (notification) notification.read = true;
      notify("Utworzono zbiorcze zamówienie niskich stanów");
    }
    if (action === "download-full-report") {
      exportJson("raport-pelny-zmiany-demo.json", { data: featureState.workDate, zmiana: featureState.shift, obecność: state.employees, plan: state.plan, prace: state.tasks, obserwacje: state.observations, zgłoszenia: state.tickets, materiały: state.materials });
      notify("Przygotowano pełny raport zmiany");
    }
    if (action === "approve-report") {
      featureState.reportApproved = true;
      if (!state.approvedItems.includes("report")) state.approvedItems.push("report");
      notify("Raport zmiany został zatwierdzony");
    }
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    context.app.addEventListener("click", (event) => {
      const button = event.target.closest("[data-module-action]");
      if (button && !button.disabled) handleAction(button);
    });
    context.app.addEventListener("input", (event) => {
      if (!event.target.matches("[data-module-search]")) return;
      featureState.search = event.target.value;
      applyFilters();
    });
    context.app.addEventListener("change", (event) => {
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
      bindEvents();
      injectEnhancements();
    },
  };
})();
