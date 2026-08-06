(() => {
  "use strict";

  const VERSION = "2026.08.06.1";
  const STORAGE_KEY = "greenhouse-hydra-settings-v1";
  const PENDING_KEY = "greenhouse-offline-queue-v1";
  const languages = {
    pl: { label: "Polski", locale: "pl-PL" },
    ua: { label: "Українська", locale: "uk-UA" },
    ru: { label: "Русский", locale: "ru-RU" },
    en: { label: "English", locale: "en-US" },
  };
  const screenLabels = {
    pl: { dashboard: "Podsumowanie", planning: "Plan zmiany", attendance: "Lista obecności", tasks: "Prace", productivity: "Wydajność", team: "Pracownicy", crop: "Mapa obserwacji", tickets: "Zgłoszenia", materials: "Materiały", reports: "Raporty" },
    ua: { dashboard: "Підсумок", planning: "План зміни", attendance: "Облік присутності", tasks: "Роботи", productivity: "Продуктивність", team: "Працівники", crop: "Карта спостережень", tickets: "Заявки", materials: "Матеріали", reports: "Звіти" },
    ru: { dashboard: "Итоги", planning: "План смены", attendance: "Учёт присутствия", tasks: "Работы", productivity: "Производительность", team: "Сотрудники", crop: "Карта наблюдений", tickets: "Заявки", materials: "Материалы", reports: "Отчёты" },
    en: { dashboard: "Summary", planning: "Shift plan", attendance: "Attendance", tasks: "Work", productivity: "Productivity", team: "Employees", crop: "Observation map", tickets: "Tickets", materials: "Materials", reports: "Reports" },
  };
  const ui = {
    pl: { language: "Język", guide: "Przewodnik", install: "Zainstaluj", online: "Online · zapis automatyczny", offline: "Offline", pending: "oczekuje", syncing: "Synchronizacja…", version: "Wersja", update: "Nowa wersja jest gotowa", reload: "Odśwież aplikację", close: "Zamknij", listen: "Odsłuchaj", stop: "Zatrzymaj", understood: "Rozumiem, zaczynam pracę", introLead: "Krótka instrukcja pokazuje tylko działania dostępne dla tej roli.", firstLogin: "PIERWSZE LOGOWANIE", step: "Krok", installHelp: "W menu przeglądarki wybierz „Dodaj do ekranu głównego” lub „Zainstaluj aplikację”.", queued: "Brak połączenia — operacja została oznaczona do synchronizacji", synced: "Połączenie przywrócone — dane demonstracyjne zsynchronizowane", loading: "Zapisywanie…", notifications: "Powiadomienia", review: "Tryb oceny", current: "Aktualne", all: "Wszystkie", active: "W TRAKCIE", closed: "ZAMKNIĘTA", only: "TEN WIDOK ZAWIERA TYLKO", compact: "Kompaktowo", comfortable: "Wygodnie", showAll: "Pokaż wszystko", collapse: "Zwiń", showMore: "Pokaż kolejne" },
    ua: { language: "Мова", guide: "Посібник", install: "Встановити", online: "Онлайн · автозбереження", offline: "Офлайн", pending: "очікує", syncing: "Синхронізація…", version: "Версія", update: "Нова версія готова", reload: "Оновити застосунок", close: "Закрити", listen: "Прослухати", stop: "Зупинити", understood: "Зрозуміло, починаю роботу", introLead: "Коротка інструкція показує лише дії, доступні для цієї ролі.", firstLogin: "ПЕРШИЙ ВХІД", step: "Крок", installHelp: "У меню браузера виберіть «Додати на головний екран» або «Встановити застосунок».", queued: "Немає з’єднання — операція очікує синхронізації", synced: "З’єднання відновлено — демонстраційні дані синхронізовано", loading: "Збереження…", notifications: "Сповіщення", review: "Оцінка макета", current: "Актуальні", all: "Усі", active: "ТРИВАЄ", closed: "ЗАКРИТО", only: "ЦЕЙ ЕКРАН МІСТИТЬ ЛИШЕ", compact: "Компактно", comfortable: "Зручно", showAll: "Показати все", collapse: "Згорнути", showMore: "Показати ще" },
    ru: { language: "Язык", guide: "Инструкция", install: "Установить", online: "Онлайн · автосохранение", offline: "Офлайн", pending: "ожидает", syncing: "Синхронизация…", version: "Версия", update: "Новая версия готова", reload: "Обновить приложение", close: "Закрыть", listen: "Прослушать", stop: "Остановить", understood: "Понятно, начинаю работу", introLead: "Короткая инструкция показывает только действия, доступные этой роли.", firstLogin: "ПЕРВЫЙ ВХОД", step: "Шаг", installHelp: "В меню браузера выберите «Добавить на главный экран» или «Установить приложение».", queued: "Нет соединения — операция ожидает синхронизации", synced: "Соединение восстановлено — демонстрационные данные синхронизированы", loading: "Сохранение…", notifications: "Уведомления", review: "Оценка макета", current: "Актуальные", all: "Все", active: "В РАБОТЕ", closed: "ЗАКРЫТО", only: "ЭТОТ ЭКРАН СОДЕРЖИТ ТОЛЬКО", compact: "Компактно", comfortable: "Удобно", showAll: "Показать всё", collapse: "Свернуть", showMore: "Показать ещё" },
    en: { language: "Language", guide: "Guide", install: "Install", online: "Online · autosave", offline: "Offline", pending: "pending", syncing: "Syncing…", version: "Version", update: "A new version is ready", reload: "Refresh app", close: "Close", listen: "Listen", stop: "Stop", understood: "Understood, start work", introLead: "This short guide shows only the actions available to this role.", firstLogin: "FIRST SIGN-IN", step: "Step", installHelp: "From the browser menu choose “Add to Home Screen” or “Install app”.", queued: "No connection — the operation is waiting to sync", synced: "Connection restored — demo data synchronized", loading: "Saving…", notifications: "Notifications", review: "Review mode", current: "Current", all: "All", active: "IN PROGRESS", closed: "CLOSED", only: "THIS VIEW CONTAINS ONLY", compact: "Compact", comfortable: "Comfortable", showAll: "Show all", collapse: "Collapse", showMore: "Show more" },
  };
  const roleNames = {
    pl: { Brygadzista: "Brygadzista", Kierownik: "Kierownik", "Ochrona roślin": "Ochrona roślin", "Dział techniczny": "Dział techniczny", Kadry: "Kadry" },
    ua: { Brygadzista: "Бригадир", Kierownik: "Керівник", "Ochrona roślin": "Захист рослин", "Dział techniczny": "Технічний відділ", Kadry: "Кадри" },
    ru: { Brygadzista: "Бригадир", Kierownik: "Руководитель", "Ochrona roślin": "Защита растений", "Dział techniczny": "Технический отдел", Kadry: "Кадры" },
    en: { Brygadzista: "Foreman", Kierownik: "Manager", "Ochrona roślin": "Plant protection", "Dział techniczny": "Technical team", Kadry: "HR" },
  };
  const guides = {
    pl: {
      Brygadzista: ["Potwierdź obecność i indywidualne godziny pracy.", "Sprawdź opublikowany plan kierownika.", "Przydziel ludzi i wózki do dokładnych miejsc.", "Zapisz wynik oraz przekaż raport zmiany."],
      Kierownik: ["Wybierz obiekt i przygotuj osobny plan.", "Sprawdź obsadę, odpowiedzialność i normy.", "Opublikuj plan dla właściwych brygadzistów.", "Kontroluj wyjątki i zatwierdź raport."],
      "Ochrona roślin": ["Otwórz alarmy na mapie obserwacji.", "Sprawdź dokładną lokalizację i źródło informacji.", "Przypisz działanie oraz potrzebne materiały.", "Zamknij obserwację i przygotuj raport."],
      "Dział techniczny": ["Sprawdź krytyczne zgłoszenia i czas SLA.", "Przyjmij zgłoszenie oraz przypisz technika.", "Zapisuj kolejne etapy naprawy.", "Potwierdź rozwiązanie i zamknij zgłoszenie."],
      Kadry: ["Sprawdź nieustalone statusy obecności.", "Kontroluj indywidualne godziny i przerwy.", "Zweryfikuj dokumenty oraz bilans czasu.", "Zatwierdź i wyeksportuj dane kadrowe."],
    },
    ua: {
      Brygadzista: ["Підтвердьте присутність та індивідуальний робочий час.", "Перевірте опублікований план керівника.", "Призначте людей і візки до точних місць.", "Запишіть результат і передайте звіт зміни."],
      Kierownik: ["Виберіть об’єкт і створіть окремий план.", "Перевірте склад, відповідальність і норми.", "Опублікуйте план для відповідних бригадирів.", "Контролюйте винятки та затвердьте звіт."],
      "Ochrona roślin": ["Відкрийте тривоги на карті спостережень.", "Перевірте точне місце та джерело інформації.", "Призначте дію і потрібні матеріали.", "Закрийте спостереження та підготуйте звіт."],
      "Dział techniczny": ["Перевірте критичні заявки та час SLA.", "Прийміть заявку і призначте техніка.", "Записуйте етапи ремонту.", "Підтвердьте результат і закрийте заявку."],
      Kadry: ["Перевірте невизначені статуси присутності.", "Контролюйте години та перерви.", "Перевірте документи й баланс часу.", "Затвердьте та експортуйте кадрові дані."],
    },
    ru: {
      Brygadzista: ["Подтвердите присутствие и индивидуальное рабочее время.", "Проверьте опубликованный план руководителя.", "Назначьте людей и тележки на точные места.", "Запишите результат и передайте отчёт смены."],
      Kierownik: ["Выберите объект и подготовьте отдельный план.", "Проверьте состав, ответственность и нормы.", "Опубликуйте план для нужных бригадиров.", "Контролируйте исключения и утвердите отчёт."],
      "Ochrona roślin": ["Откройте тревоги на карте наблюдений.", "Проверьте точное место и источник информации.", "Назначьте действие и необходимые материалы.", "Закройте наблюдение и подготовьте отчёт."],
      "Dział techniczny": ["Проверьте критические заявки и время SLA.", "Примите заявку и назначьте техника.", "Записывайте этапы ремонта.", "Подтвердите результат и закройте заявку."],
      Kadry: ["Проверьте неопределённые статусы присутствия.", "Контролируйте часы и перерывы.", "Проверьте документы и баланс времени.", "Утвердите и экспортируйте кадровые данные."],
    },
    en: {
      Brygadzista: ["Confirm attendance and individual working hours.", "Review the manager’s published plan.", "Assign people and carts to exact locations.", "Record results and submit the shift report."],
      Kierownik: ["Select a facility and prepare its own plan.", "Check staffing, responsibility and targets.", "Publish the plan to the correct foremen.", "Review exceptions and approve the report."],
      "Ochrona roślin": ["Open alarms on the observation map.", "Check the exact location and information source.", "Assign an action and required materials.", "Close the observation and prepare the report."],
      "Dział techniczny": ["Review critical tickets and SLA time.", "Accept the ticket and assign a technician.", "Record every repair stage.", "Confirm the solution and close the ticket."],
      Kadry: ["Review unresolved attendance statuses.", "Check individual hours and breaks.", "Verify documents and time balances.", "Approve and export HR data."],
    },
  };

  function safeJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "") || fallback; }
    catch (_) { return fallback; }
  }
  function initialLanguage() {
    const fromUrl = new URLSearchParams(location.search).get("lang");
    if (languages[fromUrl]) return fromUrl;
    const stored = safeJson(STORAGE_KEY, {}).language;
    if (languages[stored]) return stored;
    const browser = String(navigator.language || "").toLowerCase().split("-")[0];
    return browser === "uk" ? "ua" : languages[browser] ? browser : "pl";
  }

  const settings = { language: initialLanguage(), seen: safeJson(STORAGE_KEY, {}).seen || {} };
  let pending = safeJson(PENDING_KEY, []);
  let context = null;
  let eventsBound = false;
  let installPrompt = null;
  let introOpen = false;
  let lastRoleSession = "";
  let updateReady = false;
  let speaking = false;
  let syncing = false;

  const text = () => ui[settings.language] || ui.pl;
  const labels = () => screenLabels[settings.language] || screenLabels.pl;
  const saveSettings = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  const savePending = () => localStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  function languageOptions() {
    return Object.entries(languages).map(([code, language]) => `<option value="${code}" ${settings.language === code ? "selected" : ""}>${language.label}</option>`).join("");
  }

  function syncLabel() {
    const copy = text();
    if (syncing) return copy.syncing;
    if (!navigator.onLine) return `${copy.offline}${pending.length ? ` · ${pending.length} ${copy.pending}` : ""}`;
    if (pending.length) return `${pending.length} ${copy.pending}`;
    return copy.online;
  }

  function systemControls() {
    const copy = text();
    return `<div class="hydra-system-controls">
      <label class="hydra-language"><span>${copy.language}</span><select data-hydra-change="language" aria-label="${copy.language}">${languageOptions()}</select></label>
      <button class="hydra-tool" data-hydra-action="open-guide"><i>?</i><span>${copy.guide}</span></button>
      <button class="hydra-tool" data-hydra-action="install"><i>⇩</i><span>${copy.install}</span></button>
      <span class="hydra-sync ${navigator.onLine ? "online" : "offline"}" role="status"><i></i><span>${syncLabel()}</span></span>
      <button class="hydra-version" data-hydra-action="version" title="${copy.version} ${VERSION}">v${VERSION}</button>
    </div>`;
  }

  function renderControls() {
    if (!context.state.loggedIn) {
      const card = context.app.querySelector(".login-card");
      if (!card) return;
      const target = card.querySelector(".credentials") || card.querySelector(".login-submit");
      target?.insertAdjacentHTML("beforebegin", `<section class="hydra-login-tools"><label><span>${text().language}</span><select data-hydra-change="language">${languageOptions()}</select></label><button type="button" data-hydra-action="open-guide">? ${text().guide}</button><button type="button" data-hydra-action="install">⇩ ${text().install}</button></section>`);
      return;
    }
    const topbar = context.app.querySelector(".topbar");
    if (!topbar) return;
    topbar.insertAdjacentHTML("afterend", systemControls());
    if (updateReady) {
      topbar.insertAdjacentHTML("afterend", `<section class="hydra-update-banner" role="status"><span><i>↻</i><b>${text().update}</b></span><button data-hydra-action="reload">${text().reload}</button></section>`);
    }
  }

  function translateInterface() {
    const copy = text();
    document.documentElement.lang = settings.language === "ua" ? "uk" : settings.language;
    document.title = `Greenhouse Manager · ${labels()[context.state.screen] || labels().dashboard}`;
    context.app.querySelectorAll("[data-nav]").forEach((button) => {
      const label = labels()[button.dataset.nav];
      if (!label) return;
      const span = button.querySelector(":scope > span");
      if (span) span.textContent = label;
      else {
        const node = Array.from(button.childNodes).find((item) => item.nodeType === Node.TEXT_NODE);
        if (node) node.nodeValue = label;
      }
    });
    const pageTitle = context.app.querySelector(".content > .page-head h1");
    if (pageTitle && labels()[context.state.screen]) pageTitle.textContent = labels()[context.state.screen];
    const scopeTitle = context.app.querySelector(".module-scope-title b");
    if (scopeTitle && labels()[context.state.screen]) scopeTitle.textContent = labels()[context.state.screen];
    const scopeOnly = context.app.querySelector(".module-scope-title small");
    if (scopeOnly) scopeOnly.textContent = copy.only;
    const notifications = context.app.querySelector(".notification-button > span");
    if (notifications) notifications.textContent = copy.notifications;
    const review = context.app.querySelector(".review-toggle");
    if (review) review.innerHTML = `● ${copy.review}`;
    const current = context.app.querySelector(".current-view-toggle");
    if (current) current.textContent = context.state.currentOnly ? `● ${copy.current}` : `◷ ${copy.all}`;
    const statePill = context.app.querySelector(".topbar .state-pill");
    if (statePill) statePill.textContent = context.state.shiftClosed ? copy.closed : copy.active;
    const shiftLabel = context.app.querySelector(".shift-info > span");
    if (shiftLabel) shiftLabel.textContent = settings.language === "pl" ? "BIEŻĄCA ZMIANA" : settings.language === "ua" ? "ПОТОЧНА ЗМІНА" : settings.language === "ru" ? "ТЕКУЩАЯ СМЕНА" : "CURRENT SHIFT";
    const compact = context.app.querySelector('[data-module-action="set-list-density"][data-density="compact"]');
    const comfortable = context.app.querySelector('[data-module-action="set-list-density"][data-density="comfortable"]');
    const showAll = context.app.querySelector('[data-module-action="show-all-list"]');
    const collapse = context.app.querySelector('[data-module-action="collapse-large-list"]');
    const showMore = context.app.querySelector('[data-module-action="show-more-list"]');
    if (compact) compact.textContent = copy.compact;
    if (comfortable) comfortable.textContent = copy.comfortable;
    if (showAll) showAll.textContent = copy.showAll;
    if (collapse) collapse.textContent = copy.collapse;
    if (showMore) showMore.textContent = `${copy.showMore} ${showMore.textContent.match(/\d+/)?.[0] || ""}`.trim();
    if (!context.state.loggedIn) {
      const heading = context.app.querySelector(".login-card h2");
      const lead = context.app.querySelector(".login-card > .muted");
      const submit = context.app.querySelector(".login-submit");
      if (heading) heading.textContent = settings.language === "pl" ? "Zaloguj się do wybranej roli" : settings.language === "ua" ? "Увійдіть з вибраною роллю" : settings.language === "ru" ? "Войдите с выбранной ролью" : "Sign in with a selected role";
      if (lead) lead.textContent = settings.language === "pl" ? "Każda rola widzi tylko swój zakres ekranów i decyzji." : settings.language === "ua" ? "Кожна роль бачить лише дозволені екрани та рішення." : settings.language === "ru" ? "Каждая роль видит только разрешённые экраны и решения." : "Each role only sees its permitted screens and decisions.";
      if (submit) submit.innerHTML = `${settings.language === "pl" ? "Otwórz makietę" : settings.language === "ua" ? "Відкрити макет" : settings.language === "ru" ? "Открыть макет" : "Open prototype"} <b>→</b>`;
    }
  }

  function guideMarkup() {
    const copy = text();
    const role = context.state.role;
    const steps = guides[settings.language]?.[role] || guides.pl[role];
    const roleLabel = roleNames[settings.language]?.[role] || role;
    return `<div class="hydra-guide-backdrop" role="presentation"><section class="hydra-guide" role="dialog" aria-modal="true" aria-labelledby="hydraGuideTitle">
      <header><div><span>${copy.firstLogin} · ${roleLabel}</span><h2 id="hydraGuideTitle">${labels().dashboard}: ${roleLabel}</h2><p>${copy.introLead}</p></div><button data-hydra-action="close-guide" aria-label="${copy.close}">×</button></header>
      <div class="hydra-guide-steps">${steps.map((step, index) => `<article><i>${index + 1}</i><span><small>${copy.step} ${index + 1}</small><b>${step}</b></span></article>`).join("")}</div>
      <footer><button class="secondary" data-hydra-action="speak-guide">${speaking ? `■ ${copy.stop}` : `▶ ${copy.listen}`}</button><button class="primary" data-hydra-action="finish-guide">✓ ${copy.understood}</button></footer>
    </section></div>`;
  }

  function renderGuide() {
    const session = context.state.loggedIn ? context.state.role : "login";
    if (context.state.loggedIn && session !== lastRoleSession && !settings.seen[session]) introOpen = true;
    lastRoleSession = session;
    if (!introOpen) return;
    context.app.insertAdjacentHTML("beforeend", guideMarkup());
    requestAnimationFrame(() => context.app.querySelector('.hydra-guide [data-hydra-action="close-guide"]')?.focus());
  }

  function closeGuide(markSeen = true) {
    window.speechSynthesis?.cancel?.();
    speaking = false;
    introOpen = false;
    if (markSeen && context.state.loggedIn) settings.seen[context.state.role] = true;
    saveSettings();
    context.render();
  }

  function speakGuide() {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      const unavailable = {
        pl: "Odsłuch instrukcji nie jest dostępny w tej przeglądarce.",
        ua: "Озвучення інструкції недоступне в цьому браузері.",
        ru: "Озвучивание инструкции недоступно в этом браузере.",
        en: "The spoken guide is not available in this browser.",
      };
      context.notify(unavailable[settings.language] || unavailable.pl);
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      speaking = false;
      context.render();
      return;
    }
    const steps = guides[settings.language]?.[context.state.role] || guides.pl[context.state.role];
    const message = new SpeechSynthesisUtterance(steps.join(" "));
    message.lang = languages[settings.language].locale;
    message.rate = settings.language === "en" ? .9 : .82;
    message.onend = () => { speaking = false; context.render(); };
    message.onerror = () => { speaking = false; context.render(); };
    speaking = true;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(message);
    context.render();
  }

  function queueOfflineOperation(label) {
    pending.push({ id: Date.now(), label, at: new Date().toISOString() });
    savePending();
    context?.notify(text().queued);
  }

  function startSync() {
    if (!navigator.onLine || !pending.length) return;
    syncing = true;
    context?.render();
    window.setTimeout(() => {
      pending = [];
      savePending();
      syncing = false;
      context?.notify(text().synced);
    }, 900);
  }

  function installApp() {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.finally(() => { installPrompt = null; });
      return;
    }
    context.notify(text().installHelp);
  }

  function showSaving() {
    let overlay = document.querySelector(".hydra-saving-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "hydra-saving-overlay";
      overlay.setAttribute("role", "status");
      overlay.setAttribute("aria-live", "polite");
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<span><i></i><b>${text().loading}</b></span>`;
    overlay.classList.add("visible");
    window.setTimeout(() => overlay.classList.remove("visible"), 650);
  }

  function setupScrollHelpers() {
    if (document.querySelector(".hydra-to-top")) return;
    const progress = document.createElement("div");
    progress.className = "hydra-scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    const button = document.createElement("button");
    button.className = "hydra-to-top";
    button.type = "button";
    button.innerHTML = '<span aria-hidden="true">↑</span>';
    button.setAttribute("aria-label", "Do góry");
    button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
    document.body.append(progress, button);
    let ticking = false;
    const update = () => {
      ticking = false;
      const root = document.scrollingElement || document.documentElement;
      const max = Math.max(1, root.scrollHeight - innerHeight);
      const value = Math.min(100, Math.max(0, root.scrollTop / max * 100));
      document.body.style.setProperty("--hydra-scroll", `${value}%`);
      button.classList.toggle("visible", root.scrollTop > 420);
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("resize", update);
    update();
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    context.app.addEventListener("change", (event) => {
      const select = event.target.closest('[data-hydra-change="language"]');
      if (!select) return;
      settings.language = languages[select.value] ? select.value : "pl";
      saveSettings();
      const url = new URL(location.href);
      url.searchParams.set("lang", settings.language);
      history.replaceState(null, "", url);
      context.render();
    });
    context.app.addEventListener("click", (event) => {
      const button = event.target.closest("[data-hydra-action]");
      if (button) {
        const action = button.dataset.hydraAction;
        if (action === "open-guide") { introOpen = true; context.render(); }
        if (action === "close-guide") closeGuide(true);
        if (action === "finish-guide") closeGuide(true);
        if (action === "speak-guide") speakGuide();
        if (action === "install") installApp();
        if (action === "version") context.notify(`${text().version} ${VERSION}`);
        if (action === "reload") {
          Promise.resolve(navigator.serviceWorker?.getRegistration?.())
            .then((registration) => registration?.waiting?.postMessage("SKIP_WAITING"))
            .finally(() => location.reload());
        }
        return;
      }
      const mutation = event.target.closest('[data-action="save-attendance"], [data-action="publish-plan"], [data-action="ticket-step"], [data-module-action="save-schedule"], [data-module-action="approve-report"], [data-module-action="create-material-orders"]');
      if (mutation) {
        mutation.classList.add("hydra-pressed");
        window.setTimeout(() => mutation.classList.remove("hydra-pressed"), 260);
        if (!navigator.onLine) queueOfflineOperation(mutation.dataset.action || mutation.dataset.moduleAction);
      }
    }, true);
    context.app.addEventListener("submit", (event) => {
      const form = event.target.closest("form[data-form]");
      if (!form) return;
      showSaving();
      if (!navigator.onLine) queueOfflineOperation(form.dataset.form);
    }, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && introOpen) closeGuide(false);
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    addEventListener("load", async () => {
      try {
        const app = document.getElementById("prototype-app");
        const registration = await navigator.serviceWorker.register(app?.dataset.serviceWorkerUrl || "./sw.js", { updateViaCache: "none" });
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              updateReady = true;
              context?.render();
            }
          });
        });
      } catch (_) { /* The web prototype still works without installation. */ }
    });
  }

  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    context?.render();
  });
  addEventListener("appinstalled", () => { installPrompt = null; context?.notify(text().install); });
  addEventListener("online", startSync);
  addEventListener("offline", () => context?.render());
  registerServiceWorker();
  setupScrollHelpers();

  window.GreenhouseHydra = {
    afterRender(nextContext) {
      context = nextContext;
      bindEvents();
      renderControls();
      translateInterface();
      renderGuide();
      if (navigator.onLine && pending.length && !syncing) startSync();
    },
  };
})();
