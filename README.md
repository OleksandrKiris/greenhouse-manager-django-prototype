# Greenhouse Manager — klikalny prototyp Django

Publiczna makieta aplikacji zastępującej zeszyty brygadzistów w szklarni. Repozytorium zawiera prawdziwy projekt Django oraz identyczną wersję demonstracyjną w katalogu `docs/`, publikowaną przez GitHub Pages.

## Demo online

**[Otwórz klikalną makietę](https://oleksandrkiris.github.io/greenhouse-manager-django-prototype/)**

## Co można sprawdzić

- logowanie i wybór roli,
- kluczową nawigację i przewodniki roli w językach polskim, ukraińskim, rosyjskim i angielskim z zapamiętaniem wyboru oraz parametrem `?lang=`,
- krótkie wprowadzenie po pierwszym logowaniu dla każdej roli oraz opcjonalny odczyt instrukcji głosem systemowym telefonu,
- instalację makiety na ekranie głównym jako PWA, pamięć ostatnio otwartych ekranów i tryb awaryjny przy słabym internecie,
- widoczny stan połączenia, kolejkę demonstracyjnych operacji offline, komunikat synchronizacji, numer wersji i informację o dostępnej aktualizacji,
- firmowe logo oraz odświeżony, responsywny system wizualny dla komputerów, tabletów i telefonów,
- frontend 2.0 z większą typografią, wyraźniejszą hierarchią priorytetów, czytelnymi statusami, wygodnymi polami dotykowymi i spójnym wyglądem wszystkich modułów,
- operacyjny UX 3.0: grupowaną nawigację, filtry brygady i zapisane filtry, zbiorczą obecność, widok plan–wykonanie, mapę ryzyka wszystkich naw, trzyetapowe zgłoszenia oraz mobilne działanie kontekstowe,
- Visual System 4.0: spójne ikony Lucide, ciemny panel nawigacyjny, większą typografię, lżejsze karty, wyraźniejsze statusy i priorytety, responsywne karty dużych tabel, zwijany panel wybranego miejsca na mapie oraz zapamiętywany tryb wysokiego kontrastu do pracy w szklarni,
- spokojny system wizualny inspirowany portalem CITRONEX Hydra: białe powierzchnie, stonowana czerwień, proste karty i jeden wyróżniony pierwszy krok,
- wspólny kontekst daty, zmiany, obiektu i wyszukiwania oraz dziesięć odrębnych centrów pracy z własnymi metrykami, filtrami i działaniami,
- ścisłe rozdzielenie ekranów: szczegóły obecności są tylko w „Liście obecności”, wykonanie tylko w „Pracach”, wyniki tylko w „Wydajności”, a widok łączący priorytety znajduje się wyłącznie w „Podsumowaniu”,
- personalizację według roli: ograniczony zakres danych i menu, ukryte niedozwolone operacje, własne priorytety i czytelny opis uprawnień,
- automatyczne ustawianie najpilniejszych pozycji na początku: braki planu, wstrzymane prace oraz krytyczne zgłoszenia,
- panel zmiany dla brygadzisty i kierownika,
- plan kierownika przekazywany do realizacji głównym i odpowiedzialnym brygadzistom,
- osobny plan dla każdej szklarni i obiektu pomocniczego: dodawanie, edycja, duplikowanie, priorytet, norma, obsada, instrukcja oraz niezależny status roboczy/opublikowany,
- strukturę 6 szklarni/etapów z właściwą numeracją naw: 1/39, 2/40, 3/39, 4/36, 5/38 i 6/37,
- dokładne miejsce pracy: strona szklarni względem łącznika → nawa → jeden z 5 wjazdów → lewa/prawa strona przejścia,
- około 500 pracowników w przedsiębiorstwie, średnio 50–60 osób łącznie w każdej szklarni oraz pozostała obsada w obiektach wsparcia: sortowni głównej, sortowni etap 6 i starym magazynie,
- priorytet widoku aktualnych planów, prac i problemów z możliwością włączenia historii,
- usprawnione duże listy: priorytetowe rekordy na początku, licznik „pokazano X z Y”, stopniowe rozwijanie, pokazanie całości, zwijanie oraz przełącznik widoku kompaktowego i wygodnego,
- kompaktową, rozwijaną listę obecności oraz status „nieustalony”, indywidualne godziny rozpoczęcia i zakończenia pracy, 1 albo 2 przerwy o różnych porach i długościach oraz automatycznie liczony czas netto; pierwsze 15 minut pierwszej przerwy jest płatne i pozostaje w godzinach pracy,
- planowanie, wstrzymywanie, zmiana obsady i zamykanie prac,
- przypisanie każdej pracy do konkretnych osób, brygadzisty, pełnej lokalizacji i wózka,
- indywidualne potwierdzenie wykonawców, ilości i czasu przy zamykaniu pracy,
- wydajność konkretnej osoby w `rz./h` oraz `kg/h`,
- karty pracowników, kompetencje, dokumenty i bilans godzin,
- interaktywna mapa obserwacji: 6 etapów, nawa, strona względem łącznika, 5 wjazdów i obie strony przejścia,
- rejestr obserwacji z poziomem, liczbą roślin, zgłaszającym, źródłem informacji, właścicielem, statusem i historią,
- centrum zgłoszeń z kolejką, filtrami, kategorią, wpływem na pracę, pełną lokalizacją, odpowiedzialnym i czasem reakcji SLA,
- przepływ zgłoszenia: nowe → przyjęte → w realizacji → zamknięte, z możliwością eskalacji i pełną historią decyzji,
- informację kto zgłosił problem, od kogo ją otrzymał oraz kto aktualnie realizuje naprawę,
- materiały, stany minimalne, wydania i zapotrzebowania,
- centrum powiadomień i akceptacje kierownika,
- wygodny widok telefonu i tabletu z dolnymi skrótami, rozwijanym menu i pełnoekranowymi formularzami,
- obsługę bezpiecznych marginesów telefonu, ograniczenia animacji, pasek postępu przewijania i przycisk powrotu na górę,
- raport zmiany i walidację brakujących danych,
- projektowanie makiety wspólnie z zespołem: oznaczanie każdego bloku jako „zostawić”, „zmienić” lub „usunąć”, dopisywanie propozycji nowych elementów i eksport wszystkich decyzji do JSON,
- zbieranie komentarzy do makiety i eksport opinii do JSON.

Makieta nie zawiera kodów QR. Dane są demonstracyjne, a operacje wykonywane w przeglądarce nie trafiają do bazy produkcyjnej.

## Uruchomienie lokalne

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Otwórz `http://127.0.0.1:8000/`. Na stronie logowania można użyć dowolnych danych demonstracyjnych lub przycisku „Wejdź do makiety”.

## Struktura

- `greenhouse_manager/` — konfiguracja projektu Django,
- `prototype/` — widoki, adresy URL, szablon i pliki statyczne,
- `docs/` — samodzielna wersja HTML/CSS/JS dla GitHub Pages,
- `prototype/tests.py` — testy wszystkich tras i połączenia plików statycznych.

## Ważne przed produkcją

To prototyp UX, nie gotowy system produkcyjny. Kolejny etap powinien dodać modele danych, logowanie Django, uprawnienia, audyt zmian, API, kopie zapasowe oraz wdrożenie zgodne z zasadami bezpieczeństwa firmy.
