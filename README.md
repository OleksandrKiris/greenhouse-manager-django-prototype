# Greenhouse Manager — klikalny prototyp Django

Publiczna makieta aplikacji zastępującej zeszyty brygadzistów w szklarni. Repozytorium zawiera prawdziwy projekt Django oraz identyczną wersję demonstracyjną w katalogu `docs/`, publikowaną przez GitHub Pages.

## Demo online

**[Otwórz klikalną makietę](https://oleksandrkiris.github.io/greenhouse-manager-django-prototype/)**

## Co można sprawdzić

- logowanie i wybór roli,
- panel zmiany dla brygadzisty i kierownika,
- obecność pracowników oraz status „nieustalony”,
- planowanie i zamykanie prac,
- wydajność w `rz./h` oraz `kg/h`,
- mapa upraw i obserwacje,
- usterki oraz ich statusy,
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
