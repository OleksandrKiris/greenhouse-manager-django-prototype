(() => {
  "use strict";

  const app = document.getElementById("prototype-app");
  const navItems = [
    ["dashboard", "Podsumowanie", "Start", "⌂"],
    ["planning", "Plan zmiany", "Plan", "▣"],
    ["attendance", "Lista obecności", "Obsada", "✓"],
    ["tasks", "Prace", "Prace", "↗"],
    ["productivity", "Wydajność", "Wynik", "≈"],
    ["team", "Pracownicy", "Zespół", "♙"],
    ["crop", "Mapa obserwacji", "Uprawy", "◎"],
    ["tickets", "Zgłoszenia", "Usterki", "⌘"],
    ["materials", "Materiały", "Magazyn", "◇"],
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
    "Ochrona roślin": ["dashboard", "planning", "crop", "materials", "reports"],
    "Dział techniczny": ["dashboard", "planning", "tickets", "materials", "reports"],
    Kadry: ["dashboard", "attendance", "team", "reports"],
  };
  const companyEmployeeCount = 500;
  const greenhouseStructure = [
    { site: "Szklarnia 1", stage: "1 etap", naveCount: 39 },
    { site: "Szklarnia 2", stage: "2 etap", naveCount: 40 },
    { site: "Szklarnia 3", stage: "3 etap", naveCount: 39 },
    { site: "Szklarnia 4", stage: "4 etap", naveCount: 36 },
    { site: "Szklarnia 5", stage: "5 etap", naveCount: 38 },
    { site: "Szklarnia 6", stage: "6 etap", naveCount: 37 },
  ];
  const greenhouseSites = greenhouseStructure.map((item) => item.site);
  const companySites = [...greenhouseSites, "Sortownia główna", "Sortownia · etap 6", "Stary magazyn"];
  const foremen = ["Anna Kowalska", "Tomasz Wójcik", "Karol Mazur", "Marta Lis", "Piotr Pawlak", "Joanna Król", "Adam Zając", "Ewa Nowak"];
  const siteResponsibility = [
    { site:"Szklarnia 1", chief:"Anna Kowalska", foremen:["Anna Kowalska","Tomasz Wójcik"], people:86, activeTasks:4 },
    { site:"Szklarnia 2", chief:"Karol Mazur", foremen:["Karol Mazur","Marta Lis"], people:78, activeTasks:3 },
    { site:"Szklarnia 3", chief:"Piotr Pawlak", foremen:["Piotr Pawlak","Joanna Król"], people:74, activeTasks:5 },
    { site:"Szklarnia 4", chief:"Adam Zając", foremen:["Adam Zając"], people:69, activeTasks:2 },
    { site:"Szklarnia 5", chief:"Ewa Nowak", foremen:["Ewa Nowak","Tomasz Wójcik"], people:71, activeTasks:4 },
    { site:"Szklarnia 6", chief:"Joanna Król", foremen:["Joanna Król","Marta Lis"], people:82, activeTasks:3 },
  ];
  function naveCount(site) { return greenhouseStructure.find((item) => item.site === site)?.naveCount || 0; }
  function naveOptions(site, selected = "N01") {
    const count = naveCount(site);
    if (!count) return ["Hala A", "Hala B", "Magazyn"].map((name) => `<option ${name === selected ? "selected" : ""}>${name}</option>`).join("");
    return Array.from({ length: count }, (_, index) => {
      const name = `N${String(index + 1).padStart(2, "0")}`;
      return `<option ${name === selected ? "selected" : ""}>${name}</option>`;
    }).join("");
  }
  function optionList(items, selected = "") { return items.map((item) => `<option ${item === selected ? "selected" : ""}>${item}</option>`).join(""); }
  function siteOptions(selected, includeSupport = true) { return optionList(includeSupport ? companySites : greenhouseSites, selected); }
  function entranceOptions(selected = "Wjazd 1") { return optionList(Array.from({ length: 5 }, (_, index) => `Wjazd ${index + 1}`), selected); }
  const employeesSeed = [
    [1, "Anar Akhmedov", "EMP-007", "Obecny"], [2, "Chidi Eze", "EMP-002", "Obecny"],
    [3, "Elmar Gabarimov", "EMP-006", "Obecny"], [4, "Eleanor Hastings", "EMP-003", "Urlop"],
    [5, "Natalia Khodorovska", "EMP-008", "Zwolnienie"], [6, "Rachid Khudaverdov", "EMP-011", "Obecny"],
    [7, "Ismail Kuliev", "EMP-012", "Obecny"], [8, "Maria Lutak", "EMP-009", "Obecny"],
    [9, "Mariah Parker", "EMP-004", "Obecny"], [10, "Ali Sidyma", "EMP-013", "Obecny"],
    [11, "Riley Tan", "EMP-014", "Obecny"], [12, "Ewa Nowak", "EMP-015", "Nieustalony"],
  ].map(([id, name, code, status]) => ({ id, name, code, status, start: status === "Obecny" ? "06:00" : "—", end: status === "Obecny" ? "14:15" : "—", breakMinutes: status === "Obecny" ? 30 : 0 }));
  const taskSeed = [
    { id: 1, title: "Zakładanie zawieszek", site:"Szklarnia 1", greenhouseSide:"Lewa od łącznika", nave:"N01", entrance:"Wjazd 1", passageSide:"Lewa", row: "R01", side: "Lewa", cart: "WZ-01", foreman:"Anna Kowalska", people: ["Chidi Eze", "Elmar Gabarimov", "Mariah Parker"], status: "W trakcie", unit: "rz.", progress: 68, contributions: [] },
    { id: 2, title: "Zakładanie zawieszek", site:"Szklarnia 1", greenhouseSide:"Lewa od łącznika", nave:"N01", entrance:"Wjazd 2", passageSide:"Prawa", row: "R01", side: "Prawa", cart: "WZ-02", foreman:"Anna Kowalska", people: ["Riley Tan", "Rachid Khudaverdov"], status: "Zakończone", unit: "rz.", result: 6, hours: 6, progress: 100, contributions: [{ person: "Riley Tan", result: 3, hours: 3 }, { person: "Rachid Khudaverdov", result: 3, hours: 3 }] },
    { id: 3, title: "Obcinanie liści", site:"Szklarnia 1", greenhouseSide:"Prawa od łącznika", nave:"N07", entrance:"Wjazd 3", passageSide:"Lewa", row: "R07", side: "Lewa", cart: "WZ-03", foreman:"Tomasz Wójcik", people: ["Anar Akhmedov", "Ismail Kuliev", "Maria Lutak"], status: "W trakcie", unit: "rz.", progress: 58, contributions: [] },
    { id: 4, title: "Zbiór", site:"Szklarnia 2", greenhouseSide:"Prawa od łącznika", nave:"N12", entrance:"Wjazd 4", passageSide:"Obie", row: "R12", side: "Obie", cart: "WZ-07", foreman:"Karol Mazur", people: ["Ali Sidyma"], status: "Zakończone", unit: "kg", result: 132, hours: 1, progress: 100, contributions: [{ person: "Ali Sidyma", result: 132, hours: 1 }] },
  ];
  const ticketSeed = [
    { id: 1, title: "Uszkodzone oświetlenie", site:"Szklarnia 3", greenhouseSide:"Lewa od łącznika", nave:"N19", entrance:"Wjazd 2", passageSide:"Prawa", priority: "Średni", status: "Nowe", reporter:"Joanna Król", source:"Maria Lutak", owner: "Anna Kowalska", sla: "4 h", createdAt:"07:42" },
    { id: 2, title: "Nieszczelność przewodu", site:"Szklarnia 2", greenhouseSide:"Prawa od łącznika", nave:"N11", entrance:"Wjazd 4", passageSide:"Lewa", priority: "Wysoki", status: "Przyjęte", reporter:"Karol Mazur", source:"Rachid Khudaverdov", owner: "Marek Wiśniewski", sla: "1 h 18 min", createdAt:"07:18" },
    { id: 3, title: "Wózek zbiorczy nie reaguje", site:"Szklarnia 1", greenhouseSide:"Lewa od łącznika", nave:"N04", entrance:"Wjazd 1", passageSide:"Lewa", priority: "Krytyczny", status: "W realizacji", reporter:"Anna Kowalska", source:"Chidi Eze", owner: "Piotr Zieliński", sla: "42 min", createdAt:"06:54" },
    { id: 4, title: "Wymiana koła wózka zakończona", site:"Stary magazyn", greenhouseSide:"Strefa wspólna", nave:"Magazyn", entrance:"Brama 1", passageSide:"Prawa", priority: "Średni", status: "Zamknięte", reporter:"Adam Zając", source:"Ewa Nowak", owner:"Piotr Zieliński", sla:"Zrealizowano", createdAt:"wczoraj 13:20" },
  ];
  const observationSeed = [
    { row: 3, severity: "high", symptom: "Mozaikowate przebarwienia", plants: 3 },
    { row: 9, severity: "medium", symptom: "Zwijanie młodych liści", plants: 7 },
    { row: 16, severity: "medium", symptom: "Nietypowe plamy", plants: 1 },
  ];
  const planSeed = [
    { id: 1, time: "06:15–09:00", site:"Szklarnia 1", greenhouseSide:"Lewa od łącznika", nave:"N01", entrance:"Wjazd 1", passageSide:"Lewa", title: "Zakładanie zawieszek", chief:"Anna Kowalska", foreman:"Anna Kowalska", need: 5, assigned: 5, status: "Gotowe", unit: "rz./h", current:true },
    { id: 2, time: "06:15–10:30", site:"Szklarnia 1", greenhouseSide:"Prawa od łącznika", nave:"N07", entrance:"Wjazd 3", passageSide:"Lewa", title: "Obcinanie liści", chief:"Anna Kowalska", foreman:"Tomasz Wójcik", need: 4, assigned: 3, status: "Brak 1 osoby", unit: "rz./h", current:true },
    { id: 3, time: "07:00–12:00", site:"Szklarnia 2", greenhouseSide:"Prawa od łącznika", nave:"N12", entrance:"Wjazd 4", passageSide:"Prawa", title: "Zbiór", chief:"Karol Mazur", foreman:"Karol Mazur", need: 3, assigned: 3, status: "Gotowe", unit: "kg/h", current:true },
    { id: 4, time: "12:15–13:45", site:"Sortownia główna", greenhouseSide:"Strefa wspólna", nave:"Hala A", entrance:"Brama 2", passageSide:"Lewa", title: "Sortowanie i porządek", chief:"Marta Lis", foreman:"Marta Lis", need: 2, assigned: 2, status: "Gotowe", unit: "kg/h", current:true },
  ];
  const materialsSeed = [
    { id: 1, name: "Zawieszki do roślin", sku: "MAT-001", quantity: 840, unit: "szt.", min: 500, location: "Magazyn A · regał 2" },
    { id: 2, name: "Sznurek ogrodniczy", sku: "MAT-014", quantity: 18, unit: "rol.", min: 20, location: "Magazyn A · regał 4" },
    { id: 3, name: "Skrzynki zbiorcze", sku: "MAT-021", quantity: 126, unit: "szt.", min: 80, location: "S2 · punkt wydania" },
    { id: 4, name: "Rękawice nitrylowe", sku: "BHP-006", quantity: 7, unit: "op.", min: 12, location: "Magazyn BHP" },
  ];
  const employeeDetails = {
    1: { skills: ["Liście", "Zbiór"], level: "Samodzielny", balance: "+2:15", certificate: "BHP · 12.2026" },
    2: { skills: ["Zawieszki", "Liście"], level: "Mentor", balance: "+0:45", certificate: "BHP · 02.2027" },
    3: { skills: ["Zawieszki", "Zbiór"], level: "Samodzielny", balance: "−1:00", certificate: "BHP · 11.2026" },
    4: { skills: ["Pakownia"], level: "Samodzielny", balance: "+4:00", certificate: "Badania · 09.2026" },
    5: { skills: ["Liście", "Pakownia"], level: "Wdrożenie", balance: "0:00", certificate: "BHP · 01.2027" },
    6: { skills: ["Liście", "Zbiór"], level: "Mentor", balance: "+1:30", certificate: "Wózek · 10.2026" },
    7: { skills: ["Liście"], level: "Samodzielny", balance: "−0:30", certificate: "BHP · 03.2027" },
    8: { skills: ["Zbiór", "Pakownia"], level: "Samodzielny", balance: "+2:00", certificate: "BHP · 12.2026" },
    9: { skills: ["Zawieszki"], level: "Wdrożenie", balance: "0:00", certificate: "BHP · 08.2026" },
    10: { skills: ["Zbiór", "Wózek"], level: "Mentor", balance: "+3:15", certificate: "Wózek · 11.2026" },
    11: { skills: ["Zawieszki", "Liście"], level: "Samodzielny", balance: "+0:15", certificate: "BHP · 04.2027" },
    12: { skills: ["Pakownia"], level: "Samodzielny", balance: "−2:00", certificate: "Badania · 08.2026" },
  };
  const notificationSeed = [
    { id: 1, tone: "red", title: "Krytyczna usterka w R04", detail: "Wózek zbiorczy nie reaguje · SLA 42 min", screen: "tickets", read: false },
    { id: 2, tone: "amber", title: "Brakuje 1 osoby w planie", detail: "Obcinanie liści · S1 R07–R10", screen: "planning", read: false },
    { id: 3, tone: "amber", title: "Niski stan rękawic", detail: "7 op. przy minimum 12 op.", screen: "materials", read: false },
    { id: 4, tone: "green", title: "Wynik zbioru zapisany", detail: "132 kg/h · Ali Sidyma", screen: "productivity", read: true },
  ];

  const routeScreen = app.dataset.initialScreen || "login";
  const hashScreen = location.hash.replace("#", "");
  const requestedScreen = navItems.some((item) => item[0] === hashScreen) ? hashScreen : routeScreen;
  const state = {
    loggedIn: routeScreen !== "login",
    role: "Brygadzista",
    screen: requestedScreen === "login" ? "dashboard" : requestedScreen,
    employees: employeesSeed.map((item) => ({ ...item })),
    tasks: taskSeed.map((item) => ({ ...item, people: [...item.people], contributions: item.contributions.map((entry) => ({ ...entry })) })),
    tickets: ticketSeed.map((item) => ({ ...item })),
    observations: observationSeed.map((item) => ({ ...item })),
    plan: planSeed.map((item) => ({ ...item })),
    materials: materialsSeed.map((item) => ({ ...item })),
    notifications: notificationSeed.map((item) => ({ ...item })),
    selectedRow: 3,
    modal: null,
    selectedTask: null,
    selectedEmployee: null,
    selectedMaterial: null,
    review: !window.matchMedia("(max-width: 900px)").matches,
    feedbackOpen: false,
    notificationsOpen: false,
    mobileNavOpen: false,
    currentOnly: true,
    selectedSite: "Szklarnia 1",
    planPublished: false,
    approvedItems: [],
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
  function locationLabel(item) { return [item.site,item.greenhouseSide,item.nave,item.entrance,item.passageSide].filter(Boolean).join(" · "); }
  function individualResults() {
    return state.tasks.flatMap((task) => (task.contributions || []).map((entry) => ({ ...entry, title: task.title, row: task.row, cart: task.cart, unit: task.unit, site:task.site, greenhouseSide:task.greenhouseSide, nave:task.nave, entrance:task.entrance, passageSide:task.passageSide, foreman:task.foreman })));
  }
  function scopedPlan() { const rolePlan=state.role === "Brygadzista" ? state.plan.filter((item)=>item.site===state.selectedSite) : state.plan; return state.currentOnly ? rolePlan.filter((item)=>item.current!==false) : rolePlan; }
  function scopedTasks() { const roleTasks=state.role === "Brygadzista" ? state.tasks.filter((item)=>item.site===state.selectedSite) : state.tasks; return state.currentOnly ? roleTasks.filter((item)=>item.status!=="Zakończone") : roleTasks; }
  function visibleTickets() { return state.currentOnly ? state.tickets.filter((item)=>item.status!=="Zamknięte") : state.tickets; }
  function visibleNav() { return navItems.filter((item) => access[state.role].includes(item[0])); }
  function blockers() {
    const result = [];
    if (state.employees.some((employee) => employee.status === "Nieustalony")) result.push("Ustal status wszystkich pracowników.");
    if (state.tasks.some((task) => task.status === "Zakończone" && (!task.result || !task.hours || !task.contributions?.length))) result.push("Uzupełnij wynik, wykonawców, rząd i wózek zakończonych prac.");
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
    state.mobileNavOpen = false;
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
    const present = presentCount(); const done = completedTasks().length; const manager=state.role==="Kierownik";
    return `${pageHead(`PANEL · ${state.role.toUpperCase()}`, manager ? "Operacja przedsiębiorstwa" : state.role === "Brygadzista" ? "Dzień dobry, Anna" : `Panel: ${state.role}`, manager ? "Najpierw aktualne plany, braki obsady i problemy ze wszystkich obiektów." : roleDescriptions[state.role], manager ? `<button class="primary" data-nav="planning">Ułóż plan zmiany</button>` : `<button class="secondary" data-action="open-close">Zakończ zmianę</button>`)}
      <section class="scope-strip"><div><span class="kicker">AKTUALNY ZAKRES</span><b>${manager?"Wszystkie obiekty · bieżąca zmiana":state.role==="Brygadzista"?`${state.selectedSite} · główny brygadzista`:"Zadania mojego działu"}</b></div><span class="live-dot">● ${state.currentOnly ? "Tylko aktualne" : "Aktualne i historia"}</span></section>
      <section class="hero"><div><span class="kicker light">${manager?"6 SZKLARNI · 3 OBIEKTY WSPARCIA":"BRYGADA A · SZKLARNIA 1"}</span><h2>${manager?`${companyEmployeeCount} osób<br>w strukturze zakładu`:`${present} z 12 osób<br>gotowych do pracy`}</h2><p>${manager?"Kierownik ustala plan, a główni brygadziści rozdzielają wykonanie między brygady.":`${12 - present} osoby wymagają sprawdzenia przed zamknięciem zmiany.`}</p><div class="hero-buttons"><button class="secondary" data-nav="${manager?"planning":"attendance"}">${manager?"Sprawdź plan":"Sprawdź obecność"}</button><button class="ghost" data-nav="${manager?"tickets":"tasks"}">${manager?"Aktualne problemy":"Przejdź do prac"} →</button></div></div><div class="hero-score"><span>${manager?"AKTYWNE PLANY":"REALIZACJA ZMIANY"}</span><b>${manager?siteResponsibility.reduce((sum,item)=>sum+item.activeTasks,0):`${done}/6`}</b><small>${manager?"pozycji w 6 szklarniach":"zadań zakończonych"}</small><div class="progress"><i style="width:${manager?74:Math.min(100, done * 16)}%"></i></div></div></section>
      ${state.role === "Kierownik" ? `<section class="approval-strip surface"><div><span class="kicker">DO ZATWIERDZENIA</span><h3>${2 - state.approvedItems.length} decyzje czekają na kierownika</h3></div>${[["attendance","Korekta obecności · Ewa Nowak"],["report","Raport brygady A · zmiana poranna"]].filter(([id])=>!state.approvedItems.includes(id)).map(([id,label])=>`<div class="approval-item"><span>${label}</span><button class="secondary" data-action="approve-item" data-id="${id}">Zatwierdź</button></div>`).join("") || `<div class="approval-ready">✓ Wszystkie decyzje zatwierdzone</div>`}</section>` : ""}
      ${manager?`<section class="facility-grid">${siteResponsibility.map((item)=>{const structure=greenhouseStructure.find((entry)=>entry.site===item.site);return `<article class="facility surface"><div><span class="kicker">${item.site} · ${structure.stage}</span><b>${item.people} osób</b></div><span class="facility-state">${item.activeTasks} zadań</span><p class="nave-range"><small>Numeracja naw</small><b>N01–N${String(structure.naveCount).padStart(2,"0")}</b></p><p><small>Główny brygadzista</small><b>${item.chief}</b></p><p><small>Brygadziści</small><span>${item.foremen.join(" · ")}</span></p></article>`;}).join("")}<article class="facility support surface"><span class="kicker">OBIEKTY WSPARCIA</span><h3>Sortownia główna</h3><p>Sortownia · etap 6</p><p>Stary magazyn</p><b>40 osób łącznie</b></article></section>`:""}
      <section class="metrics">${metric(manager?"Pracownicy":"Obecni", manager?companyEmployeeCount:present, manager?"w całym zakładzie":"z 12 zaplanowanych", "✓")}${metric(manager?"Szklarnie":"Aktywne prace", manager?greenhouseSites.length:state.tasks.length - done, manager?"każda z głównym brygadzistą":`${done} zakończone`, "↗", "blue")}${metric("Alerty upraw", state.observations.length, "wymagają uwagi", "◎", "amber")}${metric("Usterki", activeTickets(), "aktywnych zgłoszeń", "⌘", "red")}</section>
      <section class="two-col"><article class="surface card-pad"><span class="kicker">SKRÓTY</span><h3>Co chcesz zrobić?</h3><div class="quick-grid">${[["planning","▣","Plan zmiany","Sprawdź obsadę stref"],["attendance","✓","Obecność","Ustal obsadę zmiany"],["tasks","↗","Przydziel pracę","Połącz ludzi i rząd"],["materials","◇","Materiały","Sprawdź stany i wydania"],["crop","◎","Dodaj obserwację","Zgłoś objaw uprawy"],["tickets","⌘","Zgłoś usterkę","Przekaż do technicznych"]].filter(([screen]) => access[state.role].includes(screen)).map(([screen,icon,title,sub]) => `<button data-nav="${screen}"><i>${icon}</i><span><b>${title}</b><small>${sub}</small></span><em>→</em></button>`).join("")}</div></article>
      <article class="surface card-pad"><span class="kicker">NA TERAZ</span><h3>Aktualne zdarzenia</h3><div class="events"><div class="event"><i class="dot red"></i><span><b>Wózek zbiorczy nie reaguje</b><small>Szklarnia 1 · N04 · zgłosiła Anna Kowalska od Chidi Eze</small></span></div><div class="event"><i class="dot amber"></i><span><b>Zwijanie młodych liści</b><small>Szklarnia 1 · N09 · 34 minuty temu</small></span></div><div class="event"><i class="dot"></i><span><b>Wynik zapisany: 132 kg</b><small>Szklarnia 2 · N12 · Ali Sidyma</small></span></div></div></article></section>`;
  }

  function planning() {
    const items=scopedPlan(); const manager=state.role==="Kierownik";
    const missing = items.reduce((sum, item) => sum + Math.max(0, item.need - item.assigned), 0);
    const assigned = items.reduce((sum, item) => sum + item.assigned, 0);
    return `${pageHead("ORGANIZACJA DNIA", manager?"Plan przedsiębiorstwa":"Realizacja planu kierownika", manager?"Kierownik ustala miejsce, zadanie, głównego brygadzistę i odpowiedzialnego brygadzistę.":`Widzisz aktualne pozycje dla ${state.selectedSite}; jako główny brygadzista rozdzielasz ludzi i pilnujesz wykonania.`, manager?`<button class="secondary" data-action="new-plan">+ Pozycja planu</button> <button class="primary" data-action="publish-plan">${state.planPublished ? "✓ Plan opublikowany" : "Opublikuj plan"}</button>`:`<span class="state-pill">PLAN KIEROWNIKA</span>`)}
      ${missing ? `<div class="warning"><i>!</i><p><b>Plan ma lukę w obsadzie.</b> Brakuje ${missing} osoby. ${manager?"Oczekuje na uzupełnienie przez brygadzistę.":"Uzupełnij ludzi w swojej szklarni."}</p>${manager?"":`<button class="ghost" data-action="fill-all-plan">Uzupełnij dostępnymi</button>`}</div>` : `<div class="success"><i>✓</i><p><b>Aktualny plan jest kompletny.</b> Wszystkie widoczne miejsca mają wymaganą obsadę.</p></div>`}
      <section class="compact surface"><div><span>Widoczne pozycje</span><b>${items.length}</b></div><div><span>Zaplanowane osoby</span><b>${assigned}</b></div><div><span>Luki w obsadzie</span><b>${missing}</b></div><div><span>Tryb</span><b>${manager?"Planowanie":"Realizacja"}</b></div></section>
      <section class="plan-board">${items.map((item,index)=>{ const fill=Math.min(100,Math.round(item.assigned/item.need*100)); const shortage=item.assigned<item.need; return `<article class="plan-row surface ${shortage?"shortage":""}"><div class="plan-time"><b>${item.time}</b><small>${item.site}</small></div><div class="plan-work"><span class="kicker">${item.greenhouseSide} · ${item.nave} · ${item.entrance} · ${item.passageSide}</span><h3>${item.title}</h3><small>Główny: ${item.chief} · realizuje: ${item.foreman} · pomiar: ${item.unit}</small></div><div class="staffing"><div><span>Obsada</span><b>${item.assigned}/${item.need} os.</b></div><div class="bar"><i style="width:${fill}%"></i></div></div><span class="plan-status ${shortage?"bad":""}">${shortage?"WYMAGA OBSADY":"GOTOWE"}</span>${shortage&&!manager?`<button class="secondary" data-action="fill-plan" data-id="${item.id}">Dodaj osobę</button>`:manager?`<button class="ghost" data-action="edit-plan" data-id="${item.id}">Edytuj plan</button>`:`<button class="primary" data-nav="tasks">Realizuj</button>`}</article>`;}).join("")}</section>
      <section class="logic-note"><b>Odpowiedzialność</b><span>Kierownik publikuje plan → główny brygadzista widzi całą szklarnię → pozostali brygadziści widzą swoje zadania i ludzi → wyniki wracają do kierownika.</span></section>`;
  }

  function team() {
    const present = state.employees.filter((item)=>item.status==="Obecny").length;
    const expiring = Object.values(employeeDetails).filter((item)=>item.certificate.includes("08.2026") || item.certificate.includes("09.2026")).length;
    const companyView = state.role === "Kierownik" || state.role === "Kadry";
    return `${pageHead("ZESPÓŁ I KOMPETENCJE", "Pracownicy", "Dostępność, umiejętności, dokumenty i bilans godzin pomagają dobrać właściwe osoby.", `<select aria-label="Filtr kompetencji"><option>Wszystkie kompetencje</option><option>Zbiór</option><option>Liście</option><option>Zawieszki</option><option>Wózek</option></select>`)}
      <section class="metrics">${metric("Pracownicy", companyView?companyEmployeeCount:86, companyView?"w całym zakładzie":`${state.selectedSite} · wszystkie brygady`, "♙")}${metric("Przykładowo dostępni", present, "w bieżącym podglądzie", "✓")}${metric("Mentorzy", 3, "mogą wdrażać", "★", "blue")}${metric("Dokumenty", expiring, "wygasają do 60 dni", "!", "amber")}</section>
      <section class="surface team-table"><div class="sample-note">Pokazano 12 przykładowych kart z ${companyView?companyEmployeeCount:86} pracowników · docelowo wyszukiwanie i filtry po szklarni, brygadzie i kompetencji.</div><div class="team-head"><span>Pracownik</span><span>Dostępność</span><span>Kompetencje</span><span>Poziom</span><span>Bilans</span><span>Dokument</span><span></span></div>${state.employees.map((employee)=>{const detail=employeeDetails[employee.id];return `<div class="team-row"><span class="person"><i class="avatar">${initials(employee.name)}</i><span><b>${employee.name}</b><small>${employee.code}</small></span></span><span class="availability ${employee.status!=="Obecny"?"off":""}">${employee.status}</span><span class="skill-list">${detail.skills.map((skill)=>`<i>${skill}</i>`).join("")}</span><b>${detail.level}</b><span class="balance">${detail.balance}</span><span class="document ${detail.certificate.includes("08.2026")?"warn":""}">${detail.certificate}</span><button class="ghost" data-action="employee-detail" data-id="${employee.id}">Szczegóły</button></div>`;}).join("")}</section>`;
  }

  function materials() {
    const low = state.materials.filter((item)=>item.quantity<item.min);
    return `${pageHead("MAGAZYN PODRĘCZNY", "Materiały i wyposażenie", "Stany minimalne, lokalizacja oraz wydanie materiałów na zmianę.", `<button class="primary" data-action="material-request">+ Zgłoś zapotrzebowanie</button>`)}
      ${low.length ? `<div class="warning"><i>!</i><p><b>${low.length} pozycje poniżej minimum.</b> System proponuje utworzenie zapotrzebowania.</p><button class="ghost" data-action="request-low">Zamów brakujące</button></div>` : `<div class="success"><i>✓</i><p><b>Stany są prawidłowe.</b> Wszystkie materiały są powyżej minimum.</p></div>`}
      <section class="materials-grid">${state.materials.map((item)=>{const lowStock=item.quantity<item.min; const width=Math.min(100,Math.round(item.quantity/(item.min*2)*100));return `<article class="material surface ${lowStock?"low":""}"><div class="material-top"><span class="material-icon">◇</span><span class="stock-state">${lowStock?"NISKI STAN":"DOSTĘPNE"}</span></div><h3>${item.name}</h3><small>${item.sku} · ${item.location}</small><div class="material-value"><b>${item.quantity}</b><span>${item.unit}</span><em>min. ${item.min}</em></div><div class="bar"><i style="width:${width}%"></i></div><div class="material-actions"><button class="ghost" data-action="issue-material" data-id="${item.id}">Wydaj</button>${lowStock?`<button class="primary" data-action="order-material" data-id="${item.id}">Zamów</button>`:""}</div></article>`;}).join("")}</section>
      <section class="logic-note"><b>Ślad materiału</b><span>Wydanie jest przypisane do zadania, brygady i osoby. Stan zmniejsza się automatycznie, a zejście poniżej minimum tworzy alert.</span></section>`;
  }

  function attendance() {
    const unresolved = state.employees.filter((employee) => employee.status === "Nieustalony").length;
    return `${pageHead("ZESPÓŁ", "Lista obecności", "Godziny i nieobecności są zatwierdzane przed rozpoczęciem przydziałów.", `<div class="state-pill">${presentCount()}/12 OBECNYCH</div>`)}
      ${unresolved ? `<div class="warning"><i>!</i><p><b>${unresolved} status wymaga decyzji.</b> Bez tego system nie pozwoli zamknąć zmiany.</p></div>` : `<div class="success"><i>✓</i><p><b>Obsada jest kompletna.</b> Można przejść do zamknięcia zmiany.</p></div>`}
      <section class="surface"><div class="toolbar"><div class="tabs"><button class="active">Wszyscy <b>12</b></button><button>Obecni <b>${presentCount()}</b></button><button>Do ustalenia <b>${unresolved}</b></button></div><input class="search" placeholder="Szukaj pracownika" aria-label="Szukaj pracownika"></div><div class="table-wrap"><div class="table"><div class="tr head"><span>Pracownik</span><span>Status</span><span>Start</span><span>Koniec</span><span>Przerwa</span><span>Notatka</span></div>
      ${state.employees.map((employee) => `<div class="tr ${employee.status === "Nieustalony" ? "attention" : ""}"><span class="person"><i class="avatar">${initials(employee.name)}</i><span><b>${employee.name}</b><small>${employee.code}</small></span></span><select data-change="attendance" data-id="${employee.id}" aria-label="Status ${employee.name}">${["Obecny","Urlop","Zwolnienie","Nieustalony"].map((status) => `<option ${employee.status === status ? "selected" : ""}>${status}</option>`).join("")}</select><input value="${employee.start}" aria-label="Start ${employee.name}"><input value="${employee.end}" aria-label="Koniec ${employee.name}"><input type="number" value="${employee.breakMinutes}" aria-label="Przerwa ${employee.name}"><input placeholder="Dodaj uwagę…" aria-label="Notatka ${employee.name}"></div>`).join("")}</div></div><div class="table-foot"><span>Dane demonstracyjne — zmiany nie trafiają do prawdziwej bazy.</span><button class="primary" data-action="save-attendance">Zapisz obecność</button></div></section>`;
  }

  function tasks() {
    const visible=scopedTasks(); const manager=state.role==="Kierownik";
    return `${pageHead("PLAN I WYKONANIE", manager?"Kontrola realizacji":"Moje aktualne prace", manager?"Kierownik kontroluje wykonanie planu; zadania i ludzi obsługują odpowiedzialni brygadziści.":"Każde zadanie łączy ludzi z dokładnym miejscem i wózkiem.", manager?`<button class="secondary" data-nav="planning">Wróć do planu</button>`:`<button class="primary" data-action="new-task">+ Dodaj zadanie z planu</button>`)}
      <section class="compact surface"><div><span>Zakres</span><b>${manager?"Cały zakład":state.selectedSite}</b></div><div><span>Widoczne zadania</span><b>${visible.length}</b></div><div><span>Widok</span><b>${state.currentOnly?"Aktualne":"Wszystkie"}</b></div><div><span>Rola</span><b>${manager?"Kontrola":"Realizacja"}</b></div></section>
      <section class="task-grid">${visible.map((task) => `<article class="task surface"><div class="task-top"><span class="chip ${task.status === "Zakończone" ? "done" : task.status === "Wstrzymane" ? "paused" : ""}">${task.status}</span><small>${task.site}</small></div><h3>${task.title}</h3><p class="location-path">${locationLabel(task)}</p><div class="task-location"><span><small>BRYGADZISTA</small><b>${task.foreman}</b></span><span><small>WÓZEK</small><b>${task.cart || "—"}</b></span></div><div class="people">${task.people.map((person) => `<i class="avatar" title="${person}">${initials(person)}</i>`).join("")}<small>${task.people.length} os.</small>${task.status !== "Zakończone"&&!manager ? `<button class="mini-link" data-action="reassign-task" data-id="${task.id}">Zmień obsadę</button>` : ""}</div><p class="assigned-names"><b>${task.status === "Zakończone" ? "Wykonali:" : "Pracują:"}</b> ${task.people.join(", ")}</p><div class="task-result"><div><span>Realizacja</span><b>${task.status === "Zakończone" ? rate(task) : `${task.progress}%`}</b></div><div class="bar"><i style="width:${task.progress}%"></i></div></div>${task.status !== "Zakończone"&&!manager ? `<div class="task-actions"><button class="ghost" data-action="toggle-task" data-id="${task.id}">${task.status === "Wstrzymane" ? "Wznów" : "Wstrzymaj"}</button><button class="primary" data-action="finish-task" data-id="${task.id}">Zakończ i oznacz osoby</button></div>` : task.status === "Zakończone"?`<div class="saved">✓ ${task.contributions.length} os. potwierdzone · ${rate(task)}</div>`:`<div class="saved">Nadzór: ${task.foreman}</div>`}</article>`).join("") || `<div class="empty surface"><b>Brak aktualnych prac</b><p>Włącz „Wszystkie”, aby zobaczyć historię.</p></div>`}</section>`;
  }

  function productivity() {
    const entries = individualResults();
    const percents = entries.map((entry) => Math.round((entry.result / entry.hours) / (entry.unit === "kg" ? 120 : .75) * 100));
    const average = percents.length ? Math.round(percents.reduce((sum,value)=>sum+value,0)/percents.length) : 0;
    const above = percents.filter((value)=>value>=100).length;
    return `${pageHead("WYNIKI ZESPOŁU", "Wydajność pracowników", "Pielęgnację mierzymy w rz./h, a zbiór w kg/h — osobno dla każdej oznaczonej osoby.", `<select><option>Wszystkie prace</option><option>Pielęgnacja · rz./h</option><option>Zbiór · kg/h</option></select>`)}
      <section class="product-hero"><div><span>ŚREDNIA REALIZACJA NORMY</span><b>${average}%</b><small>na podstawie indywidualnych wpisów</small></div><div class="ring"><b>${average}%</b></div><div><span>POWYŻEJ NORMY</span><b>${above}</b><small>pracowników</small></div></section>
      <section class="formulas surface"><div><span class="kicker">JAK LICZYMY</span><h3>Jedna zasada, dwie jednostki</h3></div><div class="formula"><span>PIELĘGNACJA</span><b>6 rz. ÷ 6 h = 1,00 rz./h</b><small>wykonane rzędy ÷ efektywny czas</small></div><div class="formula"><span>ZBIÓR</span><b>132 kg ÷ 1 h = 132 kg/h</b><small>zebrane kilogramy ÷ efektywny czas</small></div></section>
      <section class="ranking surface"><span class="kicker">REJESTR OSOBOWY</span><h3>Kto, gdzie i z jakim wynikiem</h3>${entries.map((entry, index) => { const value = entry.result / entry.hours; const target = entry.unit === "kg" ? 120 : .75; const percent = Math.round(value / target * 100); return `<div class="rank-row"><span>${String(index + 1).padStart(2,"0")}</span><span class="person"><i class="avatar">${initials(entry.person)}</i><span><b>${entry.person}</b><small>${entry.title} · ${locationLabel(entry)} · ${entry.cart}</small></span></span><b>${value.toFixed(entry.unit === "kg" ? 0 : 2)} ${entry.unit}/h</b><span class="bar"><i style="width:${Math.min(100, percent)}%"></i></span><strong>${percent}%</strong></div>`; }).join("") || `<div class="empty"><b>Brak potwierdzonych wyników</b><p>Zakończ pracę i oznacz wykonawców.</p></div>`}</section>`;
  }

  function crop() {
    const selected = state.observations.find((item) => item.row === state.selectedRow);
    return `${pageHead("OCHRONA ROŚLIN", "Mapa obserwacji", "Każde zgłoszenie ma rząd, objaw, liczbę roślin i poziom zagrożenia.", `<button class="primary" data-action="new-observation">+ Dodaj obserwację</button>`)}
      <section class="crop-layout"><article class="crop-map surface"><div class="section-title"><div><span class="kicker">SZKLARNIA 1</span><h3>Sektory i rzędy</h3></div><div class="legend">● brak · <span style="color:#efa61b">● obserwacja</span> · <span style="color:#ed0016">● alarm</span></div></div><div class="rows">${Array.from({ length: 24 }, (_, index) => { const row = index + 1; const obs = state.observations.find((item) => item.row === row); return `<button class="row ${obs?.severity || ""} ${state.selectedRow === row ? "selected" : ""}" data-action="select-row" data-row="${row}"><b>R${String(row).padStart(2,"0")}</b><small>${obs ? `${obs.plants} rośl.` : "czysto"}</small></button>`; }).join("")}</div></article>
      <aside class="crop-detail surface"><span class="kicker">WYBRANY RZĄD</span><h2>R${String(state.selectedRow).padStart(2,"0")}</h2>${selected ? `<span class="severity ${selected.severity}">${selected.severity === "high" ? "WYSOKI" : selected.severity === "medium" ? "ŚREDNI" : "OBSERWACJA"}</span><h3>${selected.symptom}</h3><p>Dotyczy ${selected.plants} roślin. Właściciel: Ochrona roślin. Termin decyzji: dziś 10:30.</p><div class="detail-actions"><button class="secondary" data-action="new-observation">Aktualizuj</button><button class="primary" data-action="resolve-observation">Zamknij alert</button></div>` : `<div class="empty"><b>Brak obserwacji</b><p>Ten rząd nie ma aktywnych zgłoszeń.</p><button class="secondary" data-action="new-observation">Dodaj obserwację</button></div>`}</aside></section>`;
  }

  function tickets() {
    const tickets=visibleTickets();
    return `${pageHead("UTRZYMANIE RUCHU", "Zgłoszenia problemów", "Każde zgłoszenie pokazuje dokładne miejsce, kto je wprowadził, od kogo otrzymał informację i kto odpowiada.", `<button class="primary" data-action="new-ticket">+ Nowe zgłoszenie</button>`)}
      <section class="compact surface"><div><span>Widok</span><b>${state.currentOnly?"Tylko aktualne":"Aktualne i historia"}</b></div><div><span>Aktywne</span><b>${activeTickets()}</b></div><div><span>Krytyczne</span><b>${state.tickets.filter((item)=>item.priority==="Krytyczny"&&item.status!=="Zamknięte").length}</b></div><div><span>Obiekty</span><b>${new Set(tickets.map((item)=>item.site)).size}</b></div></section>
      <section class="ticket-grid">${tickets.map((ticket) => `<article class="ticket surface ${ticket.priority === "Krytyczny" ? "critical" : ticket.priority === "Wysoki" ? "high" : ""}"><div class="ticket-top"><span>${ticket.priority}</span><small>#${String(ticket.id).padStart(4,"0")} · ${ticket.createdAt}</small></div><h3>${ticket.title}</h3><p class="location-path">${locationLabel(ticket)}</p><div class="ticket-origin"><span><small>Zgłosił do systemu</small><b>${ticket.reporter}</b></span><span><small>Informacja od</small><b>${ticket.source}</b></span></div><div class="sla"><span>Czas reakcji (SLA)</span><b>${ticket.status === "Zamknięte" ? "Zrealizowano" : ticket.sla}</b></div><div class="ticket-owner"><i class="avatar">${initials(ticket.owner)}</i><span><small>Odpowiedzialny za rozwiązanie</small><b>${ticket.owner}</b></span></div><select data-change="ticket-status" data-id="${ticket.id}" aria-label="Status zgłoszenia ${ticket.title}">${["Nowe","Przyjęte","W realizacji","Zamknięte"].map((status) => `<option ${ticket.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></article>`).join("") || `<div class="empty surface"><b>Brak aktualnych problemów</b><p>Włącz historię, aby zobaczyć zamknięte zgłoszenia.</p></div>`}</section>
      <div class="flow-note"><i>1</i><div><b>Brygadzista opisuje miejsce i priorytet</b><small>System przypisuje zgłoszeniu właściciela i czas.</small></div><span>→</span><i>2</i><div><b>Dział techniczny aktualizuje postęp</b><small>Historia pozostaje widoczna aż do zamknięcia.</small></div></div>`;
  }

  function reports() {
    const totalHours = presentCount() * 7.75; const block = blockers(); const entries = individualResults();
    return `${pageHead("ANALIZA OPERACYJNA", "Raport zmiany", "System agreguje obecność, wykonane prace, wyniki i wyjątki.", `<button class="secondary" data-action="export-report">↓ Eksport JSON</button> <button class="primary" data-action="open-close">${state.shiftClosed ? "Zobacz zamknięcie" : "Zamknij zmianę"}</button>`)}
      ${state.shiftClosed ? `<div class="success"><i>✓</i><p><b>Zmiana została zamknięta.</b> Raport jest gotowy do akceptacji kierownika.</p></div>` : block.length ? `<div class="warning"><i>!</i><p><b>Raport nie jest gotowy.</b> ${block[0]}</p><button class="ghost" data-action="open-close">Sprawdź</button></div>` : ""}
      <section class="metrics">${metric("Łączne godziny", totalHours.toFixed(2), "w widocznym okresie", "◷")}${metric("Aktywni pracownicy", presentCount(), "w brygadzie", "♙")}${metric("Wpisy osobowe", entries.length, "osoba + pełne miejsce + wózek", "✓")}${metric("Pozycje z uwagami", activeTickets(), "do weryfikacji", "!", "red")}</section>
      <section class="assignment-register surface"><div><span class="kicker">REJESTR WYKONANIA</span><h3>Kto, gdzie i dla którego brygadzisty</h3></div>${entries.map((entry)=>`<div class="assignment-entry"><span class="person"><i class="avatar">${initials(entry.person)}</i><span><b>${entry.person}</b><small>${entry.title} · ${entry.foreman}</small></span></span><span class="assignment-location"><small>Miejsce</small><b>${entry.site} · ${entry.nave} · ${entry.entrance} / ${entry.passageSide}</b></span><span><small>Wózek</small><b>${entry.cart}</b></span><span><small>Wynik</small><b>${entry.result} ${entry.unit}</b></span><span><small>Czas</small><b>${entry.hours} h</b></span></div>`).join("")}</section>
      <section class="reports"><article class="breakdown surface"><span class="kicker">WYKONANIE</span><h3>Wyniki według rodzaju pracy</h3>${[["Zbiór","132 kg",92],["Obcinanie liści","6,00 rz.",58],["Zakładanie zawieszek","6,00 rz.",68],["Kisowanie","0 rz.",0]].map(([label,value,width]) => `<div class="break-row"><span>${label}</span><span class="bar"><i style="width:${width}%"></i></span><b>${value}</b></div>`).join("")}</article><aside class="report-types surface"><span class="kicker">WIDOKI</span><h3>Typ raportu</h3>${[["◷","Godziny","czas pracy i wyjątki"],["●","Zbiory","ilość i lokalizacja"],["♙","Zatrudnienie","obsada zmiany"],["!","Błędne odbicia","braki i rozbieżności"]].map((item,index) => `<button class="${index === 0 ? "active" : ""}"><span>${item[0]}</span><span><b>${item[1]}</b><small>${item[2]}</small></span></button>`).join("")}</aside></section>
      <section class="audit surface"><span class="kicker">ŚCIEŻKA DANYCH</span><h3>Co trafia dalej?</h3><div class="table-wrap"><div class="table"><div class="tr head"><span>Moduł</span><span>Wprowadza</span><span>Zatwierdza</span><span>Dane dalej</span></div>${[["Obecność","Brygadzista","Kierownik","Osoby i godziny"],["Prace","Brygadzista","Kierownik","Etap, strona łącznika, nawa, wjazd, strona, ludzie, wózek"],["Wydajność","System","Kierownik","rz./h, kg/h, norma"],["Problemy","Brygadzista","Właściciel działu","Zgłaszający, źródło, odpowiedzialny, status, historia"]].map((row) => `<div class="tr"><b>${row[0]}</b><span>${row[1]}</span><span>${row[2]}</span><span>${row[3]}</span></div>`).join("")}</div></div></section>`;
  }

  function modalHtml() {
    if (!state.modal) return "";
    const close = `<button class="icon-btn" data-action="close-modal" aria-label="Zamknij">×</button>`;
    if (state.modal === "new-task") return `<div class="modal-backdrop"><section class="modal modal-large" role="dialog" aria-label="Przydziel nową pracę"><div class="modal-head"><div><span class="kicker">REALIZACJA PLANU</span><h2>Przydziel miejsce, ludzi i wózek</h2></div>${close}</div><form data-form="new-task"><div class="form-2"><label class="field"><span>Rodzaj pracy</span><select name="title"><option>Obcinanie liści</option><option>Zakładanie zawieszek</option><option>Zbiór</option><option>Kisowanie</option></select></label><label class="field"><span>Jednostka wyniku</span><select name="unit"><option>rz.</option><option>kg</option></select></label></div><div class="location-form"><label class="field"><span>Szklarnia / etap</span><select name="site" data-change="location-site">${siteOptions(state.selectedSite,false)}</select></label><label class="field"><span>Strona szklarni względem łącznika</span><select name="greenhouseSide">${optionList(["Lewa od łącznika","Prawa od łącznika"],"Lewa od łącznika")}</select></label><label class="field"><span>Nawa</span><select name="nave" data-location-naves>${naveOptions(state.selectedSite)}</select></label><label class="field"><span>Wjazd / przejście</span><select name="entrance">${entranceOptions()}</select></label><label class="field"><span>Strona przejścia</span><select name="passageSide">${optionList(["Lewa","Prawa","Obie"],"Lewa")}</select></label><label class="field"><span>Odpowiedzialny brygadzista</span><select name="foreman">${optionList(foremen,"Anna Kowalska")}</select></label></div><label class="field"><span>Wózek</span><select name="cart">${Array.from({length:12},(_,i)=>`<option>WZ-${String(i+1).padStart(2,"0")}</option>`).join("")}</select></label><fieldset class="employee-picker"><legend>Osoby przydzielone do pracy</legend>${state.employees.filter((employee)=>employee.status==="Obecny").map((employee,index)=>`<label><input type="checkbox" name="employees" value="${esc(employee.name)}" ${index<2?"checked":""}><i class="avatar">${initials(employee.name)}</i><span><b>${employee.name}</b><small>${employee.code}</small></span></label>`).join("")}</fieldset><div class="hint"><b>i</b><span>Zakres naw zmienia się automatycznie po wyborze etapu. Po zakończeniu podasz wynik i czas każdej osoby.</span></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Przydziel pracę</button></div></form></section></div>`;
    if (state.modal === "finish-task") { const task=state.tasks.find((item)=>item.id===state.selectedTask); return `<div class="modal-backdrop"><section class="modal modal-large" role="dialog" aria-label="Zapisz wynik pracy"><div class="modal-head"><div><span class="kicker">${task.title}</span><h2>Potwierdź miejsce i wykonawców</h2></div>${close}</div><form data-form="finish-task"><div class="location-form"><label class="field"><span>Szklarnia / etap</span><select name="site" data-change="location-site">${siteOptions(task.site,false)}</select></label><label class="field"><span>Strona szklarni</span><select name="greenhouseSide">${optionList(["Lewa od łącznika","Prawa od łącznika"],task.greenhouseSide)}</select></label><label class="field"><span>Nawa</span><select name="nave" data-location-naves>${naveOptions(task.site,task.nave)}</select></label><label class="field"><span>Wjazd / przejście</span><select name="entrance">${entranceOptions(task.entrance)}</select></label><label class="field"><span>Strona przejścia</span><select name="passageSide">${optionList(["Lewa","Prawa","Obie"],task.passageSide)}</select></label><label class="field"><span>Potwierdzony wózek</span><select name="cart">${Array.from({length:12},(_,i)=>{const cart=`WZ-${String(i+1).padStart(2,"0")}`;return `<option ${cart===task.cart?"selected":""}>${cart}</option>`;}).join("")}</select></label></div><div class="hint"><b>i</b><span>Zaznacz osoby, które faktycznie wykonały pracę, i wpisz ich indywidualną ilość oraz efektywny czas.</span></div><div class="worker-results"><div class="worker-result-head"><span>Wykonawca</span><span>Wynik (${task.unit})</span><span>Czas (h)</span></div>${task.people.map((person,index)=>`<div class="worker-result"><label><input type="checkbox" name="people" value="${esc(person)}" checked><i class="avatar">${initials(person)}</i><b>${person}</b></label><input name="result-${index}" aria-label="Wynik ${esc(person)}" type="number" min="0.1" step="0.1" value="${task.unit==="kg"?120:1}" required><input name="hours-${index}" aria-label="Czas ${esc(person)}" type="number" min="0.25" step="0.25" value="1" required></div>`).join("")}</div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Zapisz osoby i wyniki</button></div></form></section></div>`; }
    if (state.modal === "observation") return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Nowa obserwacja"><div class="modal-head"><div><span class="kicker">R${String(state.selectedRow).padStart(2,"0")}</span><h2>Nowa obserwacja</h2></div>${close}</div><form data-form="observation"><label class="field"><span>Objaw</span><input name="symptom" required placeholder="np. Nietypowe plamy"></label><div class="form-2"><label class="field"><span>Liczba roślin</span><input name="plants" type="number" min="1" value="1" required></label><label class="field"><span>Poziom</span><select name="severity"><option value="watch">Obserwacja</option><option value="medium">Średni</option><option value="high">Wysoki</option></select></label></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Zapisz obserwację</button></div></form></section></div>`;
    if (state.modal === "ticket") return `<div class="modal-backdrop"><section class="modal modal-large" role="dialog" aria-label="Nowe zgłoszenie techniczne"><div class="modal-head"><div><span class="kicker">UTRZYMANIE RUCHU</span><h2>Nowe zgłoszenie z pełnym źródłem</h2></div>${close}</div><form data-form="ticket"><label class="field"><span>Co się stało?</span><input name="title" required placeholder="Krótki opis usterki"></label><div class="form-2"><label class="field"><span>Informacja od</span><select name="source">${optionList([...new Set([...state.employees.map((item)=>item.name),...foremen])],"Chidi Eze")}</select></label><label class="field"><span>Priorytet</span><select name="priority"><option>Średni</option><option>Wysoki</option><option>Krytyczny</option></select></label></div><div class="location-form"><label class="field"><span>Szklarnia / etap</span><select name="site" data-change="location-site">${siteOptions(state.selectedSite,false)}</select></label><label class="field"><span>Strona szklarni</span><select name="greenhouseSide">${optionList(["Lewa od łącznika","Prawa od łącznika"],"Lewa od łącznika")}</select></label><label class="field"><span>Nawa</span><select name="nave" data-location-naves>${naveOptions(state.selectedSite)}</select></label><label class="field"><span>Wjazd / przejście</span><select name="entrance">${entranceOptions()}</select></label><label class="field"><span>Strona przejścia</span><select name="passageSide">${optionList(["Lewa","Prawa","Obie"],"Lewa")}</select></label></div><div class="hint"><b>AK</b><span>Zgłaszający do systemu: Anna Kowalska. System zapisze także źródło informacji i odpowiedzialnego za rozwiązanie.</span></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Wyślij zgłoszenie</button></div></form></section></div>`;
    if (state.modal === "new-plan") return `<div class="modal-backdrop"><section class="modal modal-large" role="dialog" aria-label="Dodaj pozycję planu"><div class="modal-head"><div><span class="kicker">PLAN KIEROWNIKA</span><h2>Dodaj pozycję planu</h2></div>${close}</div><form data-form="new-plan"><div class="form-2"><label class="field"><span>Od–do</span><input name="time" value="10:30–13:30" required></label><label class="field"><span>Rodzaj pracy</span><select name="title"><option>Obcinanie liści</option><option>Zakładanie zawieszek</option><option>Zbiór</option><option>Sortowanie i porządek</option></select></label></div><div class="location-form"><label class="field"><span>Obiekt / etap</span><select name="site" data-change="location-site">${siteOptions("Szklarnia 1")}</select></label><label class="field"><span>Strona szklarni</span><select name="greenhouseSide">${optionList(["Lewa od łącznika","Prawa od łącznika","Strefa wspólna"],"Lewa od łącznika")}</select></label><label class="field"><span>Nawa</span><select name="nave" data-location-naves>${naveOptions("Szklarnia 1")}</select></label><label class="field"><span>Wjazd / przejście</span><select name="entrance">${entranceOptions()}</select></label><label class="field"><span>Strona przejścia</span><select name="passageSide">${optionList(["Lewa","Prawa","Obie"],"Lewa")}</select></label><label class="field"><span>Główny brygadzista</span><select name="chief">${optionList(foremen,"Anna Kowalska")}</select></label><label class="field"><span>Realizujący brygadzista</span><select name="foreman">${optionList(foremen,"Anna Kowalska")}</select></label></div><div class="form-2"><label class="field"><span>Potrzebna obsada</span><input name="need" type="number" min="1" value="2" required></label><label class="field"><span>Jednostka wyniku</span><select name="unit"><option>rz./h</option><option>kg/h</option></select></label></div><div class="hint"><b>i</b><span>Numeracja naw jest zależna od etapu: 1/39, 2/40, 3/39, 4/36, 5/38, 6/37.</span></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Dodaj do planu</button></div></form></section></div>`;
    if (state.modal === "reassign-task") { const task=state.tasks.find((item)=>item.id===state.selectedTask); return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Zmień obsadę zadania"><div class="modal-head"><div><span class="kicker">${task.row} · ${task.title}</span><h2>Zmień obsadę</h2></div>${close}</div><form data-form="reassign-task"><label class="field"><span>Pracownik dostępny</span><select name="employee">${state.employees.filter((employee)=>employee.status==="Obecny").map((employee)=>`<option>${employee.name}</option>`).join("")}</select></label><label class="field"><span>Sposób zmiany</span><select name="mode"><option value="add">Dodaj do obsady</option><option value="replace">Zastąp pierwszą osobę</option></select></label><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Zapisz obsadę</button></div></form></section></div>`; }
    if (state.modal === "employee") { const employee=state.employees.find((item)=>item.id===state.selectedEmployee); const detail=employeeDetails[employee.id]; return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Karta pracownika"><div class="modal-head"><div><span class="kicker">${employee.code}</span><h2>${employee.name}</h2></div>${close}</div><div class="employee-card"><div class="profile-line"><i class="avatar">${initials(employee.name)}</i><div><span>Status dzisiaj</span><b>${employee.status}</b></div><div><span>Bilans godzin</span><b>${detail.balance}</b></div></div><div class="profile-block"><span>Kompetencje</span><div class="skill-list">${detail.skills.map((skill)=>`<i>${skill}</i>`).join("")}</div></div><div class="profile-block"><span>Poziom samodzielności</span><b>${detail.level}</b></div><div class="profile-block"><span>Najbliższy dokument</span><b>${detail.certificate}</b></div><div class="hint"><b>i</b><span>W docelowym systemie karta pokaże historię przydziałów, wydajność według typu pracy i szkolenia.</span></div></div><div class="modal-actions"><button class="secondary" data-action="close-modal">Zamknij</button></div></section></div>`; }
    if (state.modal === "material-request") return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Zgłoś zapotrzebowanie"><div class="modal-head"><div><span class="kicker">ZAPOTRZEBOWANIE</span><h2>Zamów materiał</h2></div>${close}</div><form data-form="material-request"><label class="field"><span>Materiał</span><select name="material">${state.materials.map((item)=>`<option value="${item.id}">${item.name}</option>`).join("")}</select></label><div class="form-2"><label class="field"><span>Ilość</span><input name="quantity" type="number" min="1" value="10" required></label><label class="field"><span>Potrzebne do</span><input name="needed" type="date" value="2026-08-06" required></label></div><label class="field"><span>Uzasadnienie</span><textarea name="reason" rows="3" placeholder="Do jakiej pracy materiał jest potrzebny?"></textarea></label><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Wyślij zapotrzebowanie</button></div></form></section></div>`;
    if (state.modal === "issue-material") { const item=state.materials.find((material)=>material.id===state.selectedMaterial); return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Wydaj materiał"><div class="modal-head"><div><span class="kicker">${item.sku}</span><h2>Wydaj: ${item.name}</h2></div>${close}</div><form data-form="issue-material"><div class="hint"><b>${item.quantity}</b><span>${item.unit} dostępnych · minimum ${item.min} ${item.unit}</span></div><div class="form-2"><label class="field"><span>Ilość do wydania</span><input name="quantity" type="number" min="1" max="${item.quantity}" value="1" required></label><label class="field"><span>Przypisz do zadania</span><select name="task">${state.tasks.filter((task)=>task.status!=="Zakończone").map((task)=>`<option>${task.row} · ${task.title}</option>`).join("")}</select></label></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Anuluj</button><button class="primary">Potwierdź wydanie</button></div></form></section></div>`; }
    if (state.modal === "close") { const block = blockers(); return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-label="Kontrola przed zamknięciem zmiany"><div class="modal-head"><div><span class="kicker">KONTROLA</span><h2>Przed zamknięciem zmiany</h2></div>${close}</div><div class="checklist"><div class="check ${block.some((item)=>item.includes("status"))?"error":""}"><i>${block.some((item)=>item.includes("status"))?"!":"✓"}</i><b>Obecność i godziny są kompletne</b><small>${block.some((item)=>item.includes("status"))?"Wymaga działania":"Gotowe"}</small></div><div class="check ${block.some((item)=>item.includes("wynik"))?"error":""}"><i>${block.some((item)=>item.includes("wynik"))?"!":"✓"}</i><b>Zakończone prace mają wynik</b><small>${block.some((item)=>item.includes("wynik"))?"Wymaga działania":"Gotowe"}</small></div><div class="check"><i>✓</i><b>Wyjątki mają właściciela i status</b><small>Gotowe</small></div></div>${block.length ? `<div class="blocker"><b>Nie można zamknąć zmiany</b>${block.map((item)=>`<p>• ${item}</p>`).join("")}</div>` : `<div class="ready"><b>Zmiana jest gotowa do zamknięcia.</b><p>Dane trafią do raportu kierownika.</p></div>`}<div class="modal-actions"><button class="ghost" data-action="close-modal">Wróć</button><button class="primary" data-action="confirm-close" ${block.length||state.shiftClosed?"disabled":""}>${state.shiftClosed?"Zmiana zamknięta":"Zatwierdź i zamknij"}</button></div></section></div>`; }
    return "";
  }

  function feedbackDrawer() {
    if (!state.feedbackOpen) return "";
    const entries = Object.entries(state.feedback);
    return `<div class="drawer-backdrop"><aside class="drawer"><div class="modal-head"><div><span class="kicker">PODSUMOWANIE TESTÓW</span><h2>Uwagi do makiety</h2></div><button class="icon-btn" data-action="close-feedback">×</button></div>${entries.length ? `<div class="feedback-list">${entries.map(([key,value])=>`<article class="feedback-item"><span class="${value.value==="fit"?"ok":"no"}">${value.value==="fit"?"PASUJE":"DO ZMIANY"}</span><b>${key.replace(":"," · ")}</b><small>${esc(value.note||"Bez komentarza")}</small></article>`).join("")}</div>` : `<div class="empty"><b>Brak uwag</b><p>Oceń dowolny ekran na dolnym pasku.</p></div>`}<button class="secondary wide" data-action="export-feedback">Pobierz wszystkie uwagi</button></aside></div>`;
  }

  function notificationsDrawer() {
    if (!state.notificationsOpen) return "";
    const unread = state.notifications.filter((item)=>!item.read).length;
    return `<div class="drawer-backdrop"><aside class="drawer notification-drawer"><div class="modal-head"><div><span class="kicker">CENTRUM UWAGI</span><h2>Powiadomienia</h2></div><button class="icon-btn" data-action="close-notifications">×</button></div><div class="drawer-summary"><b>${unread} nowe</b><button class="mini-link" data-action="read-all">Oznacz wszystkie jako przeczytane</button></div><div class="notification-list">${state.notifications.map((item)=>`<article class="notification ${item.read?"read":""}"><i class="dot ${item.tone}"></i><div><b>${item.title}</b><small>${item.detail}</small></div><button class="ghost" data-action="open-notification" data-id="${item.id}">Otwórz</button></article>`).join("")}</div><div class="logic-note"><b>Docelowo</b><span>Powiadomienia powstają z terminów, niskich stanów, braków obsady, przekroczonego SLA i decyzji oczekujących na akceptację.</span></div></aside></div>`;
  }

  function renderApp() {
    const nav = visibleNav(); const index = nav.findIndex((item) => item[0] === state.screen);
    const screens = { dashboard, planning, attendance, tasks, productivity, team, crop, tickets, materials, reports };
    const unread = state.notifications.filter((item)=>!item.read).length;
    const mobileTabs = ["dashboard","planning","tasks","reports"].filter((screen)=>access[state.role].includes(screen)).map((screen)=>navItems.find((item)=>item[0]===screen));
    return `<div class="shell ${state.mobileNavOpen?"mobile-menu-open":""} ${state.review?"reviewing":""}"><aside class="sidebar"><div class="sidebar-title"><div class="brand"><span>CITR</span><i>O</i><span>NEX</span></div><button class="mobile-menu-button" data-action="toggle-mobile-nav" aria-expanded="${state.mobileNavOpen}" aria-label="${state.mobileNavOpen?"Zamknij menu":"Otwórz menu"}"><i>${state.mobileNavOpen?"×":"☰"}</i><span>Menu</span></button></div><small class="brand-sub">GREENHOUSE MANAGER · DJANGO</small><nav class="nav" aria-label="Nawigacja główna">${nav.map((item)=>`<button class="${state.screen===item[0]?"active":""}" data-nav="${item[0]}"><i>${item[3]}</i>${item[1]}</button>`).join("")}</nav><div class="role-switch"><span class="kicker light">PODGLĄD ROLI</span><select data-change="role" aria-label="Zmień rolę">${roles.map((role)=>`<option ${state.role===role?"selected":""}>${role}</option>`).join("")}</select></div><button class="user" data-action="logout"><i class="avatar">AK</i><span><b>Anna Kowalska</b><small>${state.role}</small></span><span>↩</span></button></aside>
      <div class="workspace"><header class="topbar"><div class="shift-info"><span>BIEŻĄCA ZMIANA</span><b>05.08.2026 · ${state.role==="Brygadzista"?state.selectedSite:"wszystkie obiekty"}</b></div><div class="top-actions"><button class="current-view-toggle ${state.currentOnly?"active":""}" data-action="toggle-current">${state.currentOnly?"● Aktualne":"◷ Wszystkie"}</button><button class="notification-button" data-action="open-notifications" aria-label="Powiadomienia">●<span>Powiadomienia</span>${unread?`<b>${unread}</b>`:""}</button><button class="review-toggle" data-action="toggle-review">● Tryb oceny makiety</button><span class="state-pill ${state.shiftClosed?"closed":""}">${state.shiftClosed?"ZAMKNIĘTA":"W TRAKCIE"}</span></div></header><main class="content">${screens[state.screen]()}</main><div class="journey"><button data-nav="${nav[Math.max(0,index-1)][0]}" ${index<=0?"disabled":""}>← Poprzedni</button><div class="steps">${nav.map((item,i)=>`<button class="${i<index?"done":""} ${i===index?"active":""}" data-nav="${item[0]}"><i>${i+1}</i><small>${item[2]}</small></button>`).join("")}</div><button data-nav="${nav[Math.min(nav.length-1,index+1)][0]}" ${index>=nav.length-1?"disabled":""}>Następny →</button></div></div>
      <nav class="mobile-bottom-nav" aria-label="Skróty mobilne">${mobileTabs.map((item)=>`<button class="${state.screen===item[0]?"active":""}" data-nav="${item[0]}"><i>${item[3]}</i><span>${item[2]}</span></button>`).join("")}<button class="${state.mobileNavOpen?"active":""}" data-action="toggle-mobile-nav"><i>☰</i><span>Menu</span></button></nav>
      ${state.review ? `<section class="review-bar"><div class="review-context"><i>●</i><span><b>Ocena: ${navItems.find((item)=>item[0]===state.screen)[1]}</b><small>${state.role} · zapis lokalny</small></span></div><input id="review-note" placeholder="Co zostawić albo zmienić?" aria-label="Komentarz do makiety"><button class="fit" data-action="feedback-fit">✓ Pasuje</button><button class="change" data-action="feedback-change">↺ Do zmiany</button><button class="feedback-open" data-action="open-feedback">Uwagi <b>${Object.keys(state.feedback).length}</b></button></section>`:""}
      ${modalHtml()}${feedbackDrawer()}${notificationsDrawer()}${state.toast?`<div class="toast" role="status"><i>✓</i>${esc(state.toast)}</div>`:""}</div>`;
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
    else if (action === "toggle-current") { state.currentOnly = !state.currentOnly; notify(state.currentOnly ? "Pokazuję tylko aktualne pozycje" : "Pokazuję również historię"); }
    else if (action === "toggle-mobile-nav") { state.mobileNavOpen = !state.mobileNavOpen; render(); }
    else if (action === "new-plan" || action === "edit-plan") { state.modal = "new-plan"; render(); }
    else if (action === "fill-plan") { const item=state.plan.find((plan)=>plan.id===Number(button.dataset.id)); item.assigned=Math.min(item.need,item.assigned+1); const alert=state.notifications.find((notice)=>notice.id===2); if(state.plan.every((plan)=>plan.assigned>=plan.need))alert.read=true; notify("Obsada pozycji została uzupełniona"); }
    else if (action === "fill-all-plan") { state.plan.forEach((item)=>{item.assigned=item.need;}); state.notifications.find((item)=>item.id===2).read=true; notify("System uzupełnił luki dostępnymi pracownikami"); }
    else if (action === "publish-plan") { state.planPublished=true; notify("Plan kierownika opublikowany dla brygadzistów"); }
    else if (action === "new-task") { state.modal = "new-task"; render(); }
    else if (action === "finish-task") { state.selectedTask = Number(button.dataset.id); state.modal = "finish-task"; render(); }
    else if (action === "toggle-task") { const task=state.tasks.find((item)=>item.id===Number(button.dataset.id)); task.status=task.status==="Wstrzymane"?"W trakcie":"Wstrzymane"; notify(task.status==="Wstrzymane"?"Praca została wstrzymana":"Praca została wznowiona"); }
    else if (action === "reassign-task") { state.selectedTask=Number(button.dataset.id); state.modal="reassign-task"; render(); }
    else if (action === "employee-detail") { state.selectedEmployee=Number(button.dataset.id); state.modal="employee"; render(); }
    else if (action === "new-observation") { state.modal = "observation"; render(); }
    else if (action === "resolve-observation") { state.observations=state.observations.filter((item)=>item.row!==state.selectedRow); notify("Alert uprawy został zamknięty z zapisem historii"); }
    else if (action === "new-ticket") { state.modal = "ticket"; render(); }
    else if (action === "material-request") { state.modal="material-request"; render(); }
    else if (action === "issue-material") { state.selectedMaterial=Number(button.dataset.id); state.modal="issue-material"; render(); }
    else if (action === "order-material") { state.notifications.find((item)=>item.id===3).read=true; notify("Utworzono zapotrzebowanie do akceptacji"); }
    else if (action === "request-low") { state.modal="material-request"; render(); }
    else if (action === "select-row") { state.selectedRow = Number(button.dataset.row); render(); }
    else if (action === "open-close") { state.modal = "close"; render(); }
    else if (action === "close-modal") { state.modal = null; render(); }
    else if (action === "confirm-close") { if (!blockers().length) { state.shiftClosed = true; state.modal = null; notify("Zmiana została zamknięta"); } }
    else if (action === "save-attendance") notify("Lista obecności zapisana");
    else if (action === "approve-item") { state.approvedItems.push(button.dataset.id); notify("Decyzja zatwierdzona i zapisana w historii"); }
    else if (action === "open-notifications") { state.notificationsOpen=true; render(); }
    else if (action === "close-notifications") { state.notificationsOpen=false; render(); }
    else if (action === "read-all") { state.notifications.forEach((item)=>{item.read=true;}); render(); }
    else if (action === "open-notification") { const item=state.notifications.find((notification)=>notification.id===Number(button.dataset.id)); item.read=true; state.notificationsOpen=false; navigate(item.screen); }
    else if (action === "feedback-fit" || action === "feedback-change") { const note = document.getElementById("review-note")?.value.trim() || ""; state.feedback[`${state.role}:${state.screen}`] = { value: action === "feedback-fit" ? "fit" : "change", note }; saveFeedbackState(); notify(action === "feedback-fit" ? "Zapisano: ekran pasuje" : "Zapisano: ekran do zmiany"); }
    else if (action === "open-feedback") { state.feedbackOpen = true; render(); }
    else if (action === "close-feedback") { state.feedbackOpen = false; render(); }
    else if (action === "export-feedback") exportJson("uwagi-do-makiety.json", Object.entries(state.feedback).map(([key,value])=>({ ekran_i_rola:key, ocena:value.value==="fit"?"Pasuje":"Do zmiany", komentarz:value.note })));
    else if (action === "export-report") exportJson("raport-zmiany-demo.json", { obecni: presentCount(), godziny: presentCount()*7.75, prace: state.tasks, zgloszenia: state.tickets, zamknieta: state.shiftClosed });
  });

  app.addEventListener("change", (event) => {
    const control = event.target.closest("[data-change]"); if (!control) return;
    if (control.dataset.change === "role") { state.role = control.value; state.mobileNavOpen=false; if (!access[state.role].includes(state.screen)) state.screen = access[state.role][0]; history.replaceState(null,"",`#${state.screen}`); notify(`Widok roli: ${state.role}`); }
    if (control.dataset.change === "location-site") { const naveSelect=control.closest("form")?.querySelector("[data-location-naves]"); if(naveSelect) naveSelect.innerHTML=naveOptions(control.value); }
    if (control.dataset.change === "attendance") { const employee = state.employees.find((item)=>item.id===Number(control.dataset.id)); employee.status = control.value; employee.start = control.value === "Obecny" ? "06:00" : "—"; employee.end = control.value === "Obecny" ? "14:15" : "—"; employee.breakMinutes = control.value === "Obecny" ? 30 : 0; render(); }
    if (control.dataset.change === "ticket-status") { const ticket = state.tickets.find((item)=>item.id===Number(control.dataset.id)); ticket.status = control.value; notify("Status zgłoszenia zaktualizowany"); }
  });

  app.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-form]"); if (!form) return; event.preventDefault(); const data = new FormData(form);
    if (form.dataset.form === "new-task") { const people=data.getAll("employees"); if(!people.length){notify("Wybierz co najmniej jedną osobę");return;} const nave=data.get("nave"); state.tasks.push({ id:Date.now(), title:data.get("title"), site:data.get("site"), greenhouseSide:data.get("greenhouseSide"), nave, entrance:data.get("entrance"), passageSide:data.get("passageSide"), row:nave.replace(/^N/,"R"), side:data.get("passageSide"), cart:data.get("cart"), foreman:data.get("foreman"), people, status:"W trakcie", unit:data.get("unit"), progress:0, contributions:[] }); state.modal=null; notify(`Przydzielono ${people.length} os. · ${data.get("site")} · ${nave} · ${data.get("entrance")}`); }
    if (form.dataset.form === "new-plan") { const need=Number(data.get("need")); state.plan.push({id:Date.now(),time:data.get("time"),site:data.get("site"),greenhouseSide:data.get("greenhouseSide"),nave:data.get("nave"),entrance:data.get("entrance"),passageSide:data.get("passageSide"),title:data.get("title"),chief:data.get("chief"),foreman:data.get("foreman"),need,assigned:0,status:"Wymaga obsady",unit:data.get("unit"),current:true}); state.planPublished=false; state.modal=null; notify("Pozycja dodana do planu kierownika"); }
    if (form.dataset.form === "reassign-task") { const task=state.tasks.find((item)=>item.id===state.selectedTask); const employee=data.get("employee"); if(data.get("mode")==="replace")task.people[0]=employee;else if(!task.people.includes(employee))task.people.push(employee); state.modal=null; notify("Obsada zadania została zmieniona"); }
    if (form.dataset.form === "finish-task") { const task=state.tasks.find((item)=>item.id===state.selectedTask); const people=data.getAll("people"); if(!people.length){notify("Oznacz co najmniej jednego wykonawcę");return;} const contributions=people.map((person)=>{const index=task.people.indexOf(person);return {person,result:Number(data.get(`result-${index}`)),hours:Number(data.get(`hours-${index}`))};}); if(contributions.some((entry)=>!entry.result||!entry.hours)){notify("Podaj wynik i czas każdej oznaczonej osoby");return;} const result=contributions.reduce((sum,entry)=>sum+entry.result,0); const hours=contributions.reduce((sum,entry)=>sum+entry.hours,0); const nave=data.get("nave"); Object.assign(task,{status:"Zakończone",progress:100,site:data.get("site"),greenhouseSide:data.get("greenhouseSide"),nave,entrance:data.get("entrance"),passageSide:data.get("passageSide"),row:nave.replace(/^N/,"R"),side:data.get("passageSide"),cart:data.get("cart"),people,result,hours,contributions}); state.modal=null; notify(`Zapisano ${people.length} wykonawców · ${locationLabel(task)}`); }
    if (form.dataset.form === "observation") { state.observations=state.observations.filter((item)=>item.row!==state.selectedRow); state.observations.push({row:state.selectedRow,severity:data.get("severity"),symptom:data.get("symptom"),plants:Number(data.get("plants"))}); state.modal=null; notify(`Obserwacja dla R${String(state.selectedRow).padStart(2,"0")} zapisana`); }
    if (form.dataset.form === "ticket") { const priority=data.get("priority"); state.tickets.push({id:Date.now(),title:data.get("title"),site:data.get("site"),greenhouseSide:data.get("greenhouseSide"),nave:data.get("nave"),entrance:data.get("entrance"),passageSide:data.get("passageSide"),priority,status:"Nowe",reporter:"Anna Kowalska",source:data.get("source"),owner:"Dział techniczny · kolejka",sla:priority==="Krytyczny"?"45 min":priority==="Wysoki"?"2 h":"8 h",createdAt:"teraz"}); state.modal=null; notify("Zgłoszenie z pełnym źródłem przekazane do działu technicznego"); }
    if (form.dataset.form === "material-request") { state.modal=null; notify("Zapotrzebowanie wysłane do akceptacji"); }
    if (form.dataset.form === "issue-material") { const item=state.materials.find((material)=>material.id===state.selectedMaterial); const quantity=Number(data.get("quantity")); if(!quantity||quantity>item.quantity){notify("Sprawdź ilość do wydania");return;} item.quantity-=quantity; state.modal=null; notify(`Wydano ${quantity} ${item.unit} i zapisano przy zadaniu`); }
  });

  function exportJson(filename, payload) { const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=filename; link.click(); URL.revokeObjectURL(url); }
  render();
})();
