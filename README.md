# Greenhouse Manager — klikalny prototyp Django

Publiczna makieta aplikacji zastępującej zeszyty brygadzistów w szklarni. Repozytorium zawiera prawdziwy projekt Django oraz identyczną wersję demonstracyjną w katalogu `docs/`, publikowaną przez GitHub Pages.

## Demo online

**[Otwórz klikalną makietę](https://oleksandrkiris.github.io/greenhouse-manager-django-prototype/)**

## Co można sprawdzić

- logowanie i wybór roli,
- firmowe logo oraz odświeżony, responsywny system wizualny dla komputerów, tabletów i telefonów,
- wspólny kontekst daty, zmiany, obiektu i wyszukiwania oraz modułowe centra decyzji z filtrami i szybkimi akcjami,
- panel zmiany dla brygadzisty i kierownika,
- plan kierownika przekazywany do realizacji głównym i odpowiedzialnym brygadzistom,
- osobny plan dla każdej szklarni i obiektu pomocniczego: dodawanie, edycja, duplikowanie, priorytet, norma, obsada, instrukcja oraz niezależny status roboczy/opublikowany,
- strukturę 6 szklarni/etapów z właściwą numeracją naw: 1/39, 2/40, 3/39, 4/36, 5/38 i 6/37,
- dokładne miejsce pracy: strona szklarni względem łącznika → nawa → jeden z 5 wjazdów → lewa/prawa strona przejścia,
- około 500 pracowników oraz obiekty wsparcia: sortownia główna, sortownia etap 6 i stary magazyn,
- priorytet widoku aktualnych planów, prac i problemów z możliwością włączenia historii,
- obecność pracowników oraz status „nieustalony”,
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
- raport zmiany i walidację brakujących danych,
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
