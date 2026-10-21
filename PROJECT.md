# Quaderno Italiano – pamięć projektu

> Przeczytaj ten plik na początku każdej sesji. Na końcu sesji zaktualizuj sekcje „Stan” i „Do zrobienia”.

## Cel
Aplikacja do nauki włoskiego słownictwa (A1–B2, później C1–C2) dla polskojęzycznych uczniów, z angielskim jako drugim językiem tłumaczeń. Autor: Wojtek. Udostępniana znajomym jako aplikacja webowa do zainstalowania (PWA) na Androidzie, Windows i iPhonie.

## Stos i struktura
Czysty HTML + CSS + JavaScript (moduły ES), bez frameworka i bez kroku budowania. Hosting: Netlify (publikuje folder `app/`).

```
PROJECT.md              ten plik
netlify.toml            Netlify publikuje folder app/
source/Wloski.xlsx      ŹRÓDŁO SŁÓW – edytujesz tylko tutaj
source/przyklady_*.csv  zdania przykładowe do przeglądu (przed wgraniem do Excela)
tools/excel_to_json.py  Excel → app/data/words.json (sprawdza błędy)
tools/import_examples.py  CSV ze zdaniami → kolumny Przykład* w Excelu
app/
  index.html            szkielet strony
  version.js            JEDYNE miejsce z numerem wersji
  sw.js                 tryb offline + wykrywanie aktualizacji
  manifest.webmanifest  nazwa, ikony, kolory aplikacji
  css/style.css         wygląd (tokeny kolorów na górze, tryb jasny i ciemny)
  data/words.json       lista słów (generowana z Excela – nie edytuj ręcznie)
  data/changelog.json   „Co nowego” dla każdej wersji (pl/en/it)
  js/main.js            start, górny pasek, obsługa kliknięć i klawiszy
  js/state.js           stan aplikacji, zapis postępu (localStorage)
  js/data.js            wczytanie słów, poziomy, filtry, losowanie słowa
  js/i18n.js            teksty interfejsu PL/EN/IT
  js/ui.js              wspólne kawałki HTML (rodzajnik, kropki, etykieta)
  js/speech.js          wymowa (głosy urządzenia), wybór głosu IT
  js/pwa.js             instalacja, pasek aktualizacji, „Co nowego”
  js/modes/cards.js     Fiszki
  js/modes/quiz.js      Quiz
  js/modes/write.js     Pisanie (zasady sprawdzania na górze pliku)
  js/modes/list.js      Lista słów
```

## Format danych
Excel `source/Wloski.xlsx`, arkusz **Słownik**, kolumny: Włoski · Polski · Angielski · Typ · Tipo · Type · Rodzaj · Poziom · Przykład · Przykład PL · Przykład EN.

`app/data/words.json` – jedno słowo w linii:
```json
{"it": "il cane", "pl": "pies", "en": "dog", "pos": "noun", "lvl": "A1", "g": "m"}
```
- `it` – rzeczowniki zawsze z rodzajnikiem (il, lo, la, l', i, gli, le). Wyjątek: `internet`.
- `pl`, `en` – kilka znaczeń rozdzielonych `;`; tekst w nawiasie to dopisek (pomijany przy sprawdzaniu i wymowie).
- `pos` – noun, verb, adjective, adverb, preposition, conjunction, pronoun, interjection.
- `g` – m/f tylko dla rzeczowników. Rzeczowniki m/f są rozdzielone na dwa wiersze (il cliente / la cliente).
- `lvl` – A1, A2, B1, B2, C1, C2. Nowy poziom w Excelu = nowa zakładka w aplikacji automatycznie.
- `ex`, `exPl`, `exEn` – opcjonalne zdanie przykładowe i jego tłumaczenia (wszystkie trzy albo żadne).

## Decyzje (nie roztrząsać od nowa)
- **Id słowa = `it|indeks części mowy|rodzaj`** – na nim opiera się zapisany postęp. Nie zmieniać kolejności `POS_KEYS` w `data.js`. Poprawka tłumaczenia nie kasuje postępu; zmiana pisowni włoskiego słowa – tak.
- **Powtórki:** pudełka Leitnera 0–5; dobrze = +1, źle = 0; „opanowane” od pudełka 3. Nowe słowa losowane z wagą 4, pudełko n z wagą 6−n.
- **Pisanie – sprawdzanie:** cel IT = identycznie z bazą (z rodzajnikiem i akcentami; ignorujemy wielkość liter, spacje, rodzaj apostrofu). Cel PL/EN = dowolny wariant spośród rozdzielonych `;`, bez nawiasów; w EN czasownik z „to” lub bez. Podpowiedzi „prawie”: akcenty/polskie znaki albo rodzajnik.
- **Wymowa:** głosy wbudowane w urządzenie (Web Speech API), każdy język swoim głosem. Brak włoskiego głosu → komunikat z instrukcją. Nagrane pliki audio – ewentualnie później.
- **Postęp** zapisywany w przeglądarce (localStorage, klucz `quaderno-italiano.v2`). Każdy użytkownik ma własny postęp; nie przenosi się między urządzeniami. Postęp jest przypisany do adresu strony – adresu nie zmieniamy.
- **Aktualizacje:** nowy numer w `version.js` → użytkownicy widzą pasek „Dostępna nowa wersja – Odśwież”, potem „Co nowego” z `changelog.json`.
- **Poziomy przypisujemy uczciwie** – słowo łatwiejsze niż B2 dostaje swój prawdziwy poziom, nawet jeśli dodawaliśmy pakiet B2.
- **Przykładowe zdania:** proste, w czasie teraźniejszym, słowo w naturalnej formie (odmienione). Fiszki – po odkryciu karty; Quiz – dopiero po odpowiedzi (żeby nie zdradzać). Tłumaczenie w języku wybranego kierunku. Tworzymy je poziomami: CSV do przeglądu → `import_examples.py` → `excel_to_json.py`.
- **Interfejs** w trzech językach (PL/EN/IT); nowy tekst dodajemy do wszystkich trzech bloków w `i18n.js`.

## Jak wydać nową wersję
1. Zmiany w słowach: popraw `source/Wloski.xlsx` → `python tools/excel_to_json.py`. Nowe zdania z CSV: najpierw `python tools/import_examples.py source/przyklady_XX.csv`.
2. Podnieś numer w `app/version.js` i dopisz wpis w `app/data/changelog.json`.
3. Sprawdź lokalnie: `cd app && python -m http.server 8000` → http://localhost:8000
4. `git add -A && git commit -m "opis zmiany" && git push` – Netlify sam opublikuje (gdy repo jest połączone z Netlify).

## Stan (2026-10-21)
- Wersja **1.2.0**: 3539 słów (A1 370, A2 708, B1 1135, B2 1326). Przykładowe zdania: A1 gotowe (370/370). Tryby: Fiszki, Quiz, Pisanie, Lista. Kierunki IT↔PL, IT↔EN. Interfejs PL/EN/IT. PWA: instalacja, offline, pasek aktualizacji.
- Kod podzielony na moduły; dane wyniesione do `data/words.json`; Excel jest źródłem.

## Do zrobienia
1. **Przykładowe zdania** – A1 gotowe; dalej A2 (708), B1 (1135), B2 (1326), każdy poziom jako CSV do przeglądu. Drobne poprawki w Excelu: „la domanda” (pl: „Do ZUS” → „do ZUS”), zbędny „;” na końcu EN w „il paese” i „per”; rozważyć dopisanie „sukienka; garnitur” do „il vestito” i „kieliszek” do „il bicchiere”.
2. **Pisanie – uzupełnianie zdań** (IT→PL, IT→EN): zdanie po włosku z luką, podpowiedź PL/EN. Do decyzji: czy wymagać formy odmienionej, czy pokazywać formę podstawową.
3. **Odmiana czasowników**: wybór poziomu i czasu, losowana osoba. Tabele odmiany w osobnym arkuszu Excela; czasy przypisane do poziomów.
4. **Gramatyka**: zagadnienia od A1, teoria + ćwiczenia; zacząć od 5–6 tematów A1.
5. **Słownictwo C1 i C2** – później.
6. **Własny zestaw słów** (backlog): zakładka „+” obok poziomów → wgranie pliku → praca na tych słowach we wszystkich trybach (Fiszki, Quiz, Pisanie, Lista). Potrzebny szablon do pobrania (te same kolumny co arkusz „Słownik”, przykłady opcjonalne). Do decyzji: format pliku (CSV prosto w przeglądarce; .xlsx wymaga biblioteki), zestaw i postęp tylko w przeglądarce (localStorage), osobny klucz postępu, żeby nie mieszać ze słownikiem, walidacja z czytelnymi błędami (jak w `excel_to_json.py`), usuwanie/podmiana zestawu.
7. Opcjonalnie: wspólny postęp na wielu urządzeniach (wymaga logowania, np. Firebase/Supabase); nagrane pliki wymowy.
