(() => {
  "use strict";

  const app = document.getElementById("prototype-app");
  const navItems = [
    ["dashboard", "Podsumowanie", "Start", "⌂"],
    ["attendance", "Lista obecności", "Obsada", "✓"],
    ["tasks", "Prace", "Prace", "↗"],
    ["productivity", "Wydajność", "Wynik", "≈"],
    ["crop", "Mapa obserwacji", "Uprawy", "◎"],
    ["tickets", "Zgłoszenia", "Usterki", "⌘"],
    ["reports", "Raporty", "Raport", "▦"],
  ];
  const roles = ["Brygadzista", "Kierownik", "Ochrona roślin", "Dział techniczny", "Kadry"];
  const roleDescriptions = {
    Brygadzista: "Obsada, przydziały, wyniki i zamknięcie zmiany",
    Kierownik: "Kontrola brygad, akceptacje, alerty i raporty",
    "Ochrona roślin": "Obserwacje upraw, priorytety i działania",
    "Dział techniczny": "Zgłoszenia, odpowiedzialność i historia napraw",
    Kadry: "Godziny, nieobecności i dane do eksportu",
  };
  const access = {
    Brygadzista: navItems.map((item) => item[0]),
    Kierownik: navItems.map((item) => item[0]),
    "Ochrona roślin": ["dashboard", "crop", "reports"],
    "Dział techniczny": ["dashboard", "tickets", "reports"],
    Kadry: ["dashboard", "attendance", "reports"],
  };
  const employeesSeed = [
    [1, "Anar Akhmedov", "EMP-007", "Obecny"], [2, "Chidi Eze", "EMP-002", "Obecny"],
    [3, "Elmar Gabarimov", "EMP-006", "Obecny"], [4, "Eleanor Hastings", "EMP-003", "Urlop"],
    [5, "Natalia Khodorovska", "EMP-008", "Zwolnienie"], [6, "Rachid Khudaverdov", "EMP-011", "Obecny"],
    [7, "Ismail Kuliev", "EMP-012", "Obecny"], [8, "Maria Lutak", "EMP-009", "Obecny"],
    [9, "Mariah Parker", "EMP-004", "Obecny"], [10, "Ali Sidyma", "EMP-013", "Obecny"],
    [11, "Riley Tan", "EMP-014", "Obecny"], [12, "Ewa Nowak", "EMP-015", "Nieustalony"],
  ].map(([id, name, code, status]) => ({ id, name, code, status, start: status === "Obecny" ? "06:00" : "—", end: status === "Obecny" ? "14:15" : "—", breakMinutes: status === "Obecny" ? 30 : 0 }));
  const taskSeed = [
    { id: 1, title: "Zakładanie zawieszek", row: "R01", side: "Lewa", people: ["Chidi Eze", "Elmar Gabarimov", "Mariah Parker"], status: "W trakcie", unit: "rz.", progress: 68 },
    { id: 2, title: "Zakładanie zawieszek", row: "R01", side: "Prawa", people: ["Riley Tan", "Rachid Khudaverdov"], status: "Zakończone", unit: "rz.", result: 6, hours: 6, progress: 100 },
    { id: 3, title: "Obcinanie liści", row: "R07", side: "Lewa", people: ["Anar Akhmedov", "Ismail Kuliev", "Maria Lutak"], status: "W trakcie", unit: "rz.", progress: 58 },
    { id: 4, title: "Zbiór", row: "R12", side: "Obie", people: ["Ali Sidyma"], status: "Zakończone", unit: "kg", result: 132, hours: 1, progress: 100 },
  ];
  const ticketSeed = [
    { id: 1, title: "Uszkodzone oświetlenie", place: "R19 · Rząd 19", priority: "Średni", status: "Nowe", owner: "Anna Kowalska" },
    { id: 2, title: "Nieszczelność przewodu", place: "R11 · Rząd 11", priority: "Wysoki", status: "Przyjęte", owner: "Marek Wiśniewski" },
    { id: 3, title: "Wózek zbiorczy nie reaguje", place: "R04 · Rząd 4", priority: "Krytyczny", status: "W realizacji", owner: "Piotr Zieliński" },
  ];
  const observationSeed = [
    { row: 3, severity: "high", symptom: "Mozaikowate przebarwienia", plants: 3 },
    { row: 9, severity: "medium", symptom: "Zwijanie młodych liści", plants: 7 },
    { row: 16, severity: "medium", symptom: "Nietypowe plamy", plants: 1 },
  ];

  const routeScreen = app.dataset.initialScreen || "login";
  const hashScreen = location.hash.replace("#", "");
  const requestedScreen = navItems.some((item) => item[0] === hashScreen) ? hashScreen : routeScreen;
  const state = {
    loggedIn: routeScreen !== "login",
    role: "Brygadzista",
    screen: requestedScreen === "login" ? "dashboard" : requestedScreen,
    employees: employeesSeed.map((item) => ({ ...item })),
    tasks: taskSeed.map((item) => ({ ...item, people: [...item.people] })),
    tickets: ticketSeed.map((item) => ({ ...item })),
    observations: observationSeed.map((item) => ({ ...item })),
    selectedRow: 3,
    modal: null,
    selectedTask: null,
    review: true,
    feedbackOpen: false,
    feedback: loadFeedback(),
    shiftClosed: false,
    toast: "",
  };

  function loadFeedback() {
    try { return JSON.parse(localStorage.getItem("greenhouse-django-feedback") || "{}"); }
    catch (_) { return {}; }
  }
  function saveFeedbackState() { localStorage.setItem("greenhouse-django-feedback", JSON.stringify(state.feedback)); }
  function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
  function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
  function presentCount() { return state.employees.filter((employee) => employee.status === "Obecny").length; }
  function completedTasks() { return state.tasks.filter((task) => task.status === "Zakończone"); }
  function activeTickets() { return state.tickets.filter((ticket) => ticket.status !== "Zamknięte").length; }
  function rate(task) { return task.result && task.hours ? `${(task.result / task.hours).toFixed(task.unit === "kg" ? 0 : 2)} ${task.unit}/h` : "—"; }
  function visibleNav() { return navItems.filter((item) => access[state.role].includes(item[0])); }
  function blockers() {
    const result = [];
    if (state.employees.some((employee) => employee.status === "Nieustalony")) result.push("Ustal status wszystkich pracowników.");
    if (state.tasks.some((task) => task.status === "Zakończone" && (!task.result || !task.hours))) result.push("Uzupełnij wynik i efektywny czas zakończonych prac.");
    return result;
  }
  function notify(message) {
    state.toast = message;
    render();
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => { state.toast = ""; render(); }, 2200);
  }
  function navigate(screen) {
    if (!access[state.role].includes(screen)) screen = access[state.role][0];
    state.screen = screen;
    state.modal = null;
    history.replaceState(null, "", `#${screen}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    render();
  }
  function pageHead(kicker, title, subtitle, action = "") {
    return `<header class="page-head"><div><span class="kicker">${kicker}</span><h1>${title}</h1><p>${subtitle}</p></div>${action ? `<div class="head-action">${action}</div>` : ""}</header>`;
  }
  function metric(label, value, detail, icon, tone = "") {
    return `<article class="metric surface ${tone}"><div><span>${label}</span><b>${value}</b><small>${detail}</small></div><i>${icon}</i></article>`;
  }

  function renderLogin() {
    return `<main class="login">
      <section class="login-visual"><div class="brand"><span>CITR</span><i>O</i><span>NEX</span></div>
        <div class="login-copy"><span class="kicker light">GREENHOUSE MANAGER · PROTOTYP DJANGO</span><h1>Zmiana pod kontrolą.<br>Od pierwszego wejścia.</h1><p>Obecność, prace, wydajność i zgłoszenia w jednym miejscu. Klikaj, sprawdzaj role i zapisuj uwagi do każdego ekranu.</p></div>
        <div class="login-flow"><b>01 Logowanie</b><span>02 Obsada</span><span>03 Praca</span><span>04 Raport</span></div>
      </section>
      <section class="login-form-side"><div class="login-card"><div class="app-mark">GM</div><span class="kicker">PANEL DEMONSTRACYJNY</span><h2>Zaloguj się do wybranej roli</h2><p class="muted">Każda rola widzi tylko swój zakres ekranów i decyzji.</p>
        <div class="role-grid">${roles.map((role) => `<button class="role-card ${state.role === role ? "selected" : ""}" data-action="choose-role" data-role="${esc(role)}"><strong>${role}</strong><small>${roleDescriptions[role]}</small></button>`).join("")}</div>
        <div class="credentials"><label class="field"><span>Login</span><input value="anna.kowalska" aria-label="Login"></label><label class="field"><span>Hasło</span><input type="password" value="demo1234" aria-label="Hasło"></label></div>
        <button class="primary wide login-submit" data-action="login">Otwórz makietę <b>→</b></button><p class="demo-note"><b>Bezpieczna makieta:</b> wszystkie dane są przykładowe i zapisują się tylko w tej przeglądarce.</p>
      </div></section>
    </main>`;
  }

  function dashboard() {
    const present = presentCount(); const done = completedTasks().length;
    return `${pageHead(`PANEL · ${state.role.toUpperCase()}`, state.role === "Brygadzista" ? "Dzień dobry, Anna" : `Panel: ${state.role}`, roleDescriptions[state.role], `<button class="secondary" data-action="open-close">Zakończ zmianę</button>`)}
      <section class="hero"><div><span class="kicker light">BRYGADA A</span><h2>${present} z 12 osób<br>gotowych do pracy</h2><p>${12 - present} osoby wymagają sprawdzenia przed zamknięciem zmiany.</p><div class="hero-buttons"><button class="secondary" data-nav="attendance">Sprawdź obecność</button><button class="ghost" data-nav="tasks">Przejdź do prac →</button></div></div><div class="hero-score"><span>REALIZACJA ZMIANY</span><b>${done}/6</b><small>zadań zakończonych</small><div class="progress"><i style="width:${Math.min(100, done * 16)}%"></i></div></div></section>
      <section class="metrics">${metric("Obecni", present, "z 12 zaplanowanych", "✓")}${metric("Aktywne prace", state.tasks.length - done, `${done} zakończone`, "↗", "blue")}${metric("Alerty upraw", state.observations.length, "wymagają uwagi", "◎", "amber")}${metric("Usterki", activeTickets(), "aktywnych zgłoszeń", "⌘", "red")}</section>
      <section class="two-col"><article class="surface card-pad"><span class="kicker">SKRÓTY</span><h3>Co chcesz zrobić?</h3><div class="quick-grid">${[["attendance","✓","Obecność","Ustal obsadę zmiany"],["tasks","↗","Przydziel pracę","Połącz ludzi i rząd"],["crop","◎","Dodaj obserwację","Zgłoś objaw uprawy"],["tickets","⌘","Zgłoś usterkę","Przekaż do technicznych"]].filter(([screen]) => access[state.role].includes(screen)).map(([screen,icon,title,sub]) => `<button data-nav="${screen}"><i>${icon}</i><span><b>${title}</b><small>${sub}</small></span><em>→</em></button>`).join("")}</div></article>
      <article class="surface card-pad"><span class="kicker">NA TERAZ</span><h3>Ostatnie zdarzenia</h3><div class="events"><div class="event"><i class="dot red"></i><span><b>Wózek zbiorczy nie reaguje</b><small>R04 · 18 minut temu</small></span></div><div class="event"><i class="dot amber"></i><span><b>Zwijanie młodych liści</b><small>R09 · 34 minuty temu</small></span></div><div class="event"><i class="dot"></i><span><b>Wynik zapisany: 132 kg</b><small>Zbiór · Ali Sidyma</small></span></div></div></article></section>`;
  }

  function attendance() {
    const unresolved = state.employees.filter((employee) => employee.status === "Nieustalony").length;
    return `${pageHead("ZESPÓŁ", "Lista obecności", "Godziny i nieobecności są zatwierdzane przed rozpoczęciem przydziałów.", `<div class="state-pill">${presentCount()}/12 OBECNYCH</div>`)}
      ${unresolved ? `<div class="warning"><i>!</i><p><b>${unresolved} status wymaga decyzji.</b> Bez tego system nie pozwoli zamknąć zmiany.</p></div>` : `<div class="success"><i>✓</i><p><b>Obsada jest kompletna.</b> Można przejść do zamknięcia zmiany.</p></div>`}
      <section class="surface"><div class="toolbar"><div class="tabs"><button class="active">Wszyscy <b>12</b></button><button>Obecni <b>${presentCount()}</b></button><button>Do ustalenia <b>${unresolved}</b></button></div><input class="search" placeholder="Szukaj pracownika" aria-label="Szukaj pracownika"></div><div class="table-wrap"><div class="table"><div class="tr head"><span>Pracownik</span><span>Status</span><span>Start</span><span>Koniec</span><span>Przerwa</span><span>Notatka</span></div>
      ${state.employees.map((employee) => `<div class="tr ${employee.status === "Nieustalony" ? "attention" : ""}"><span class="person"><i class="avatar">${initials(employee.name)}</i><span><b>${employee.name}</b><small>${employee.code}</small></span></span><select data-change="attendance" data-id="${employee.id}" aria-label="Status ${employee.name}">${["Obecny","Urlop","Zwolnienie","Nieustalony"].map((status) => `<option ${employee.status === status ? "selected" : ""}>${status}</option>`).join("")}</select><input value="${employee.start}" aria-label="Start ${employee.name}"><input value="${employee.end}" aria-label="Koniec ${employee.name}"><input type="number" value="${employee.breakMinutes}" aria-label="Przerwa ${employee.name}"><input placeholder="Dodaj uwagę…" aria-label="Notatka ${employee.name}"></div>`).join("")}</div></div><div class="table-foot"><span>Dane demonstracyjne — zmiany nie trafiają do prawdziwej bazy.</span><button class="primary" data-action="save-attendance">Zapisz obecność</button></div></section>`;
  }

  function tasks() {
    return `${pageHead("PLAN I WYKONANIE", "Prace na zmianie", "Przydzielaj ludzi do zadań, kontroluj wykonanie i zapisuj wynik.", `<button class="primary" data-action="new-task">+ Dodaj zadanie</button>`)}
      <section class="compact surface"><div><span>Dostępni pracownicy</span><b>${presentCount()}</b></div><div><span>Wszystkie zadania</span><b>${state.tasks.length}</b></div><div><span>Zmiana</span><b>Poranna</b></div><div><span>Brygada</span><b>A</b></div></section>
      <section class="task-grid">${state.tasks.map((task) => `<article class="task surface"><div class="task-top"><span class="chip ${task.status === "Zakończone" ? "done" : ""}">${task.status}</span><small>${task.row} · ${task.side}</small></div><h3>${task.title}</h3><p>Rząd ${Number(task.row.slice(1))}</p><div class="people">${task.people.map((person) => `<i class="avatar" title="${person}">${initials(person)}</i>`).join("")}<small>${task.people.length} os.</small></div><div class="task-result"><div><span>Realizacja</span><b>${task.status === "Zakończone" ? rate(task) : `${task.progress}%`}</b></div><div class="bar"><i style="width:${task.progress}%"></i></div></div>${task.status === "W trakcie" ? `<div class="task-actions"><button class="ghost">Wstrzymaj</button><button class="primary" data-action="finish-task" data-id="${task.id}">Zakończ</button></div>` : `<div class="saved">✓ Wynik zapisany</div>`}</article>`).join("")}</section>`;
  }

  function productivity() {
    const completed = state.tasks.filter((task) => task.status === "Zakończone" && task.result && task.hours);
    return `${pageHead("WYNIKI ZESPOŁU", "Wydajność pracowników", "Pielęgnację mierzymy w rz./h, a zbiór w kg/h — zawsze względem efektywnego czasu.", `<select><option>Wszystkie prace</option><option>Pielęgnacja · rz./h</option><option>Zbiór · kg/h</option></select>`)}
      <section class="product-hero"><div><span>ŚREDNIA REALIZACJA NORMY</span><b>108%</b><small>Zespół realizuje założony cel</small></div><div class="ring"><b>108%</b></div><div><span>POWYŻEJ NORMY</span><b>7</b><small>pracowników</small></div></section>
      <section class="formulas surface"><div><span class="kicker">JAK LICZYMY</span><h3>Jedna zasada, dwie jednostki</h3></div><div class="formula"><span>PIELĘGNACJA</span><b>6 rz. ÷ 6 h = 1,00 rz./h</b><small>wykonane rzędy ÷ efektywny czas</small></div><div class="formula"><span>ZBIÓR</span><b>132 kg ÷ 1 h = 132 kg/h</b><small>zebrane kilogramy ÷ efektywny czas</small></div></section>
      <section class="ranking surface"><span class="kicker">RANKING</span><h3>Realizacja normy</h3>${completed.map((task, index) => { const value = task.result / task.hours; const target = task.unit === "kg" ? 120 : .75; const percent = Math.round(value / target * 100); const person = task.people[0]; return `<div class="rank-row"><span>0${index + 1}</span><span class="person"><i class="avatar">${initials(person)}</i><span><b>${person}</b><small>${task.title}</small></span></span><b>${value.toFixed(task.unit === "kg" ? 0 : 2)} ${task.unit}/h</b><span class="bar"><i style="width:${Math.min(100, percent)}%"></i></span><strong>${percent}%</strong></div>`; }).join("")}</section>`;
  }

  function crop() {
    const selected = state.observations.find((item) => item.row === state.selectedRow);
    return `${pageHead("OCHRONA ROŚLIN", "Mapa obserwacji", "Każde zgłoszenie ma rząd, objaw, liczbę roślin i poziom zagrożenia.", `<button class="primary" data-action="new-observation">+ Dodaj obserwację</button>`)}
      <section class="crop-layout"><article class="crop-map surface"><div class="section-title"><div><span class="kicker">SZKLARNIA 1</span><h3>Sektory i rzędy</h3></div><div class="legend">● brak · <span style="color:#efa61b">● obserwacja</span> · <span style="color:#ed0016">● alarm</span></div></div><div class="rows">${Array.from({ length: 24 }, (_, index) => { const row = index + 1; const obs = state.observations.find((item) => item.row === row); return `<button class="row ${obs?.severity || ""} ${state.selectedRow === row ? "selected" : ""}" data-action="select-row" data-row="${row}"><b>R${String(row).padStart(2,"0")}</b><small>${obs ? `${obs.plants} rośl.` : "czysto"}</small></button>`; }).join("")}</div></article>
      <aside class="crop-detail surface"><span class="kicker">WYBRANY RZĄD</span><h2>R${String(state.selectedRow).padStart(2,"0")}</h2>${selected ? `<span class="severity ${selected.severity}">${selected.severity === "high" ? "WYSOKI" : selected.severity === "medium" ? "ŚREDNI" : "OBSERWACJA"}</span><h3>${selected.symptom}</h3><p>Dotyczy ${selected.plants} roślin. Informacja jest przekazana do ochrony roślin.</p><button class="secondary wide" data-action="new-observation">Aktualizuj wpis</button>` : `<div class="empty"><b>Brak obserwacji</b><p>Ten rząd nie ma aktywnych zgłoszeń.</p><button class="secondary" data-action="new-observation">Dodaj obserwację</button></div>`}</aside></section>`;
  }

  function tickets() {
    return `${pageHead("UTRZYMANIE RUCHU", "Zgłoszenia techniczne", "Usterka ma właściciela, priorytet, status i historię.", `<button class="primary" data-action="new-ticket">+ Nowe zgłoszenie</button>`)}
      <section class="ticket-grid">${state.tickets.map((ticket) => `<article class="ticket surface ${ticket.priority === "Krytyczny" ? "critical" : ticket.priority === "Wysoki" ? "high" : ""}"><div class="ticket-top"><span>${ticket.priority}</span><small>#${String(ticket.id).padStart(4,"0")} · 05.08.2026</small></div><h3>${ticket.title}</h3><p>${ticket.place}</p><div class="ticket-owner"><i class="avatar">${initials(ticket.owner)}</i><span><small>Odpowiedzialny</small><b>${ticket.owner}</b></span></div><select data-change="ticket-status" data-id="${ticket.id}" aria-label="Status zgłoszenia ${ticket.title}">${["Nowe","Przyjęte","W realizacji","Zamknięte"].map((status) => `<option ${ticket.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></article>`).join("")}</section>
      <div class="flow-note"><i>1</i><div><b>Brygadzista opisuje miejsce i priorytet</b><small>System przypisuje zgłoszeniu właściciela i czas.</small></div><span>→</span><i>2</i><div><b>Dział techniczny aktualizuje postęp</b><small>Historia pozostaje widoczna aż do zamknięcia.</small></div></div>`;
  }

  function reports() {
    const totalHours = presentCount() * 7.75; const block = blockers();
    return `${pageHead("ANALIZA OPERACYJNA", "Raport zmiany", "System agreguje obecność, wykonane prace, wyniki i wyjątki.", `<button class="secondary" data-action="export-report">↓ Eksport JSON</button> <button class="primary" data-action="open-close">${state.shiftClosed ? "Zobacz zamknięcie" : "Zamknij zmianę"}</button>`)}
      ${state.shiftClosed ? `<div class="success"><i>✓</i><p><b>Zmiana została zamknięta.</b> Raport jest gotowy do akceptacji kierownika.</p></div>` : block.length ? `<div class="warning"><i>!</i><p><b>Raport nie jest gotowy.</b> ${block[0]}</p><button class="ghost" data-action="open-close">Sprawdź</button></div>` : ""}
      <section class="metrics">${metric("Łączne godziny", totalHours.toFixed(2), "w widocznym okresie", "◷")}${metric("Aktywni pracownicy", presentCount(), "w brygadzie", "♙")}${metric("Zakończone prace", completedTasks().length, "z zapisanym wynikiem", "✓")}${metric("Pozycje z uwagami", activeTickets(), "do weryfikacji", "!", "red")}</section>
      <section class="reports"><article class="breakdown surface"><span class="kicker">WYKONANIE</span><h3>Wyniki według rodzaju pracy</h3>${[["Zbiór","132 kg",92],["Obcinanie liści","6,00 rz.",58],["Zakładanie zawieszek","6,00 rz.",68],["Kisowanie","0 rz.",0]].map(([label,value,width]) => `<div class="break-row"><span>${label}</span><span class="bar"><i style="width:${width}%"></i></span><b>${value}</b></div>`).join("")}</article><aside class="report-types surface"><span class="kicker">WIDOKI</span><h3>Typ raportu</h3>${[["◷","Godziny","czas pracy i wyjątki"],["●","Zbiory","ilość i lokalizacja"],["♙","Zatrudnienie","obsada zmiany"],["!","Błędne odbicia","braki i rozbieżności"]].map((item,index) => `<button class="${index === 0 ? "active" : ""}"><span>${item[0]}</span><span><b>${item[1]}</b><small>${item[2]}</small></span></button>`).join("")}</aside></section>
      <section class="audit surface"><span class="kicker">ŚCIEŻKA DANYCH</span><h3>Co trafia dalej?</h3><div class="table-wrap"><div class="table"><div class="tr head"><span>Moduł</span><span>Wprowadza</span><span>Zatwierdza</span><span>Dane dalej</span></div>${[["Obecność","Brygadzista","Kierownik","Osoby i godziny"],["Prace","Brygadzista","Kierownik","Czas, lokalizacja, ilość"],["Wydajność","System","Kierownik","rz./h, kg/h, norma"],["Alerty","Brygadzista","Właściciel działu","Priorytet, status, historia"]].map((row) => `<div class="tr"><b>${row[0]}</b><span>${row[1]}</span><span>${row[2]}</span><span>${row[3]}</span></div>`).join("")}</div></div></section>`;
  }

  function modalHtml() {
    if (!state.modal) return "";
    const close = `<button class="icon-btn" data-action="close-modal" aria-label="Zamknij">×</button>`;
    if (state.modal === "new-task") return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Przydziel nową pracę"><div class="modal-head"><div><span class="kicker">FORMULARZ</span><h2>Przydziel nową pracę</h2></div>${close}</div><form data-form="new-task"><label class="field"><span>Rodzaj pracy</span><select name="title"><option>Obcinanie liści</option><option>Zakładanie zawieszek</option><option>Zbiór</option><option>Kisowanie</option></select></label><div class="form-2"><label class="field"><span>Rząd</span><select name="row">${Array.from({length:24},(_,i)=>`<option>R${String(i+1).padStart(2,"0")}</option>`).join("")}</select></label><label class="field"><span>Jednostka</span><select name="unit"><option>rz.</option><option>kg</option></select></label></div><label class="field"><span>Pracownik obecny</span><select name="employee">${state.employees.filter((employee)=>employee.status==="Obecny").map((employee)=>`<option>${employee.name}</option>`).join("")}</select></label><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Przydziel pracę</button></div></form></section></div>`;
    if (state.modal === "finish-task") return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Zapisz wynik pracy"><div class="modal-head"><div><span class="kicker">FORMULARZ</span><h2>Zapisz wynik pracy</h2></div>${close}</div><form data-form="finish-task"><div class="hint"><b>i</b><span>System przeliczy wydajność dopiero po podaniu ilości i efektywnego czasu.</span></div><div class="form-2"><label class="field"><span>Wykonana ilość</span><input name="result" type="number" step="0.1" required placeholder="np. 6"></label><label class="field"><span>Efektywny czas (h)</span><input name="hours" type="number" step="0.25" required placeholder="np. 6"></label></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Zapisz i przelicz</button></div></form></section></div>`;
    if (state.modal === "observation") return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Nowa obserwacja"><div class="modal-head"><div><span class="kicker">R${String(state.selectedRow).padStart(2,"0")}</span><h2>Nowa obserwacja</h2></div>${close}</div><form data-form="observation"><label class="field"><span>Objaw</span><input name="symptom" required placeholder="np. Nietypowe plamy"></label><div class="form-2"><label class="field"><span>Liczba roślin</span><input name="plants" type="number" min="1" value="1" required></label><label class="field"><span>Poziom</span><select name="severity"><option value="watch">Obserwacja</option><option value="medium">Średni</option><option value="high">Wysoki</option></select></label></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Zapisz obserwację</button></div></form></section></div>`;
    if (state.modal === "ticket") return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Nowe zgłoszenie techniczne"><div class="modal-head"><div><span class="kicker">UTRZYMANIE RUCHU</span><h2>Nowe zgłoszenie</h2></div>${close}</div><form data-form="ticket"><label class="field"><span>Co się stało?</span><input name="title" required placeholder="Krótki opis usterki"></label><div class="form-2"><label class="field"><span>Miejsce</span><input name="place" required placeholder="np. R09 · kotłownia"></label><label class="field"><span>Priorytet</span><select name="priority"><option>Średni</option><option>Wysoki</option><option>Krytyczny</option></select></label></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Wyślij zgłoszenie</button></div></form></section></div>`;
    if (state.modal === "close") { const block = blockers(); return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Kontrola przed zamknięciem zmiany"><div class="modal-head"><div><span class="kicker">KONTROLA</span><h2>Przed zamknięciem zmiany</h2></div>${close}</div><div class="checklist"><div class="check ${block.some((item)=>item.includes("status"))?"error":""}"><i>${block.some((item)=>item.includes("status"))?"!":"✓"}</i><b>Obecność i godziny są kompletne</b><small>${block.some((item)=>item.includes("status"))?"Wymaga działania":"Gotowe"}</small></div><div class="check ${block.some((item)=>item.includes("wynik"))?"error":""}"><i>${block.some((item)=>item.includes("wynik"))?"!":"✓"}</i><b>Zakończone prace mają wynik</b><small>${block.some((item)=>item.includes("wynik"))?"Wymaga działania":"Gotowe"}</small></div><div class="check"><i>✓</i><b>Wyjątki mają właściciela i status</b><small>Gotowe</small></div></div>${block.length ? `<div class="blocker"><b>Nie można zamknąć zmiany</b>${block.map((item)=>`<p>• ${item}</p>`).join("")}</div>` : `<div class="ready"><b>Zmiana jest gotowa do zamknięcia.</b><p>Dane trafią do raportu kierownika.</p></div>`}<div class="modal-actions"><button class="ghost" data-action="close-modal">Wróć</button><button class="primary" data-action="confirm-close" ${block.length||state.shiftClosed?"disabled":""}>${state.shiftClosed?"Zmiana zamknięta":"Zatwierdź i zamknij"}</button></div></section></div>`; }
    return "";
  }

  function feedbackDrawer() {
    if (!state.feedbackOpen) return "";
    const entries = Object.entries(state.feedback);
    return `<div class="drawer-backdrop"><aside class="drawer"><div class="modal-head"><div><span class="kicker">PODSUMOWANIE TESTÓW</span><h2>Uwagi do makiety</h2></div><button class="icon-btn" data-action="close-feedback">×</button></div>${entries.length ? `<div class="feedback-list">${entries.map(([key,value])=>`<article class="feedback-item"><span class="${value.value==="fit"?"ok":"no"}">${value.value==="fit"?"PASUJE":"DO ZMIANY"}</span><b>${key.replace(":"," · ")}</b><small>${esc(value.note||"Bez komentarza")}</small></article>`).join("")}</div>` : `<div class="empty"><b>Brak uwag</b><p>Oceń dowolny ekran na dolnym pasku.</p></div>`}<button class="secondary wide" data-action="export-feedback">Pobierz wszystkie uwagi</button></aside></div>`;
  }

  function renderApp() {
    const nav = visibleNav(); const index = nav.findIndex((item) => item[0] === state.screen);
    const screens = { dashboard, attendance, tasks, productivity, crop, tickets, reports };
    return `<div class="shell"><aside class="sidebar"><div class="brand"><span>CITR</span><i>O</i><span>NEX</span></div><small class="brand-sub">GREENHOUSE MANAGER · DJANGO</small><nav class="nav" aria-label="Nawigacja główna">${nav.map((item)=>`<button class="${state.screen===item[0]?"active":""}" data-nav="${item[0]}"><i>${item[3]}</i>${item[1]}</button>`).join("")}</nav><div class="role-switch"><span class="kicker light">PODGLĄD ROLI</span><select data-change="role" aria-label="Zmień rolę">${roles.map((role)=>`<option ${state.role===role?"selected":""}>${role}</option>`).join("")}</select></div><button class="user" data-action="logout"><i class="avatar">AK</i><span><b>Anna Kowalska</b><small>${state.role}</small></span><span>↩</span></button></aside>
      <div class="workspace"><header class="topbar"><div class="shift-info"><span>BIEŻĄCA ZMIANA</span><b>05.08.2026 · Zmiana poranna</b></div><div class="top-actions"><button class="review-toggle" data-action="toggle-review">● Tryb oceny makiety</button><span class="state-pill ${state.shiftClosed?"closed":""}">${state.shiftClosed?"ZAMKNIĘTA":"W TRAKCIE"}</span></div></header><main class="content">${screens[state.screen]()}</main><div class="journey"><button data-nav="${nav[Math.max(0,index-1)][0]}" ${index<=0?"disabled":""}>← Poprzedni</button><div class="steps">${nav.map((item,i)=>`<button class="${i<index?"done":""} ${i===index?"active":""}" data-nav="${item[0]}"><i>${i+1}</i><small>${item[2]}</small></button>`).join("")}</div><button data-nav="${nav[Math.min(nav.length-1,index+1)][0]}" ${index>=nav.length-1?"disabled":""}>Następny →</button></div></div>
      ${state.review ? `<section class="review-bar"><div class="review-context"><i>●</i><span><b>Ocena: ${navItems.find((item)=>item[0]===state.screen)[1]}</b><small>${state.role} · zapis lokalny</small></span></div><input id="review-note" placeholder="Co zostawić albo zmienić?" aria-label="Komentarz do makiety"><button class="fit" data-action="feedback-fit">✓ Pasuje</button><button class="change" data-action="feedback-change">↺ Do zmiany</button><button class="feedback-open" data-action="open-feedback">Uwagi <b>${Object.keys(state.feedback).length}</b></button></section>`:""}
      ${modalHtml()}${feedbackDrawer()}${state.toast?`<div class="toast" role="status"><i>✓</i>${esc(state.toast)}</div>`:""}</div>`;
  }

  function render() { app.innerHTML = state.loggedIn ? renderApp() : renderLogin(); }

  app.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav && !nav.disabled) { navigate(nav.dataset.nav); return; }
    const button = event.target.closest("[data-action]"); if (!button) return;
    const action = button.dataset.action;
    if (action === "choose-role") { state.role = button.dataset.role; render(); }
    else if (action === "login") { state.loggedIn = true; if (!access[state.role].includes(state.screen)) state.screen = access[state.role][0]; history.replaceState(null,"",`#${state.screen}`); render(); }
    else if (action === "logout") { state.loggedIn = false; history.replaceState(null,"",location.pathname); render(); }
    else if (action === "toggle-review") { state.review = !state.review; render(); }
    else if (action === "new-task") { state.modal = "new-task"; render(); }
    else if (action === "finish-task") { state.selectedTask = Number(button.dataset.id); state.modal = "finish-task"; render(); }
    else if (action === "new-observation") { state.modal = "observation"; render(); }
    else if (action === "new-ticket") { state.modal = "ticket"; render(); }
    else if (action === "select-row") { state.selectedRow = Number(button.dataset.row); render(); }
    else if (action === "open-close") { state.modal = "close"; render(); }
    else if (action === "close-modal") { state.modal = null; render(); }
    else if (action === "confirm-close") { if (!blockers().length) { state.shiftClosed = true; state.modal = null; notify("Zmiana została zamknięta"); } }
    else if (action === "save-attendance") notify("Lista obecności zapisana");
    else if (action === "feedback-fit" || action === "feedback-change") { const note = document.getElementById("review-note")?.value.trim() || ""; state.feedback[`${state.role}:${state.screen}`] = { value: action === "feedback-fit" ? "fit" : "change", note }; saveFeedbackState(); notify(action === "feedback-fit" ? "Zapisano: ekran pasuje" : "Zapisano: ekran do zmiany"); }
    else if (action === "open-feedback") { state.feedbackOpen = true; render(); }
    else if (action === "close-feedback") { state.feedbackOpen = false; render(); }
    else if (action === "export-feedback") exportJson("uwagi-do-makiety.json", Object.entries(state.feedback).map(([key,value])=>({ ekran_i_rola:key, ocena:value.value==="fit"?"Pasuje":"Do zmiany", komentarz:value.note })));
    else if (action === "export-report") exportJson("raport-zmiany-demo.json", { obecni: presentCount(), godziny: presentCount()*7.75, prace: state.tasks, zgloszenia: state.tickets, zamknieta: state.shiftClosed });
  });

  app.addEventListener("change", (event) => {
    const control = event.target.closest("[data-change]"); if (!control) return;
    if (control.dataset.change === "role") { state.role = control.value; if (!access[state.role].includes(state.screen)) state.screen = access[state.role][0]; history.replaceState(null,"",`#${state.screen}`); notify(`Widok roli: ${state.role}`); }
    if (control.dataset.change === "attendance") { const employee = state.employees.find((item)=>item.id===Number(control.dataset.id)); employee.status = control.value; employee.start = control.value === "Obecny" ? "06:00" : "—"; employee.end = control.value === "Obecny" ? "14:15" : "—"; employee.breakMinutes = control.value === "Obecny" ? 30 : 0; render(); }
    if (control.dataset.change === "ticket-status") { const ticket = state.tickets.find((item)=>item.id===Number(control.dataset.id)); ticket.status = control.value; notify("Status zgłoszenia zaktualizowany"); }
  });

  app.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-form]"); if (!form) return; event.preventDefault(); const data = new FormData(form);
    if (form.dataset.form === "new-task") { state.tasks.push({ id:Date.now(), title:data.get("title"), row:data.get("row"), side:"Lewa", people:[data.get("employee")], status:"W trakcie", unit:data.get("unit"), progress:0 }); state.modal=null; notify("Nowa praca została przydzielona"); }
    if (form.dataset.form === "finish-task") { const result=Number(data.get("result")); const hours=Number(data.get("hours")); if(!result||!hours){notify("Podaj ilość i efektywny czas");return;} const task=state.tasks.find((item)=>item.id===state.selectedTask); Object.assign(task,{status:"Zakończone",progress:100,result,hours}); state.modal=null; notify("Wynik zapisany. Wydajność przeliczona."); }
    if (form.dataset.form === "observation") { state.observations=state.observations.filter((item)=>item.row!==state.selectedRow); state.observations.push({row:state.selectedRow,severity:data.get("severity"),symptom:data.get("symptom"),plants:Number(data.get("plants"))}); state.modal=null; notify(`Obserwacja dla R${String(state.selectedRow).padStart(2,"0")} zapisana`); }
    if (form.dataset.form === "ticket") { state.tickets.push({id:Date.now(),title:data.get("title"),place:data.get("place"),priority:data.get("priority"),status:"Nowe",owner:"Anna Kowalska"}); state.modal=null; notify("Zgłoszenie przekazane do działu technicznego"); }
  });

  function exportJson(filename, payload) { const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=filename; link.click(); URL.revokeObjectURL(url); }
  render();
})();
