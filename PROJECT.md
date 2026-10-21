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
source/tematy.csv       tematy wszystkich słów (przegląd, wgrane w 1.4.0); nowe słowa dostają temat w kolumnie Temat w Excelu
tools/import_examples.py  CSV ze zdaniami lub tematami → kolumny Przykład*/Temat w Excelu
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
  js/myset.js           własny zestaw: wczytanie pliku, walidacja, szablon, strona zestawu (zasady na górze pliku)
  js/sheet.js           zapis .xlsx i odczyt .xlsx/.csv bez biblioteki
  js/pwa.js             instalacja, pasek aktualizacji, „Co nowego”
  js/modes/cards.js     Fiszki
  js/modes/quiz.js      Quiz
  js/modes/write.js     Pisanie (zasady sprawdzania na górze pliku)
  js/modes/list.js      Lista słów
```

## Format danych
Excel `source/Wloski.xlsx`, arkusz **Słownik**, kolumny: Włoski · Polski · Angielski · Typ · Tipo · Type · Rodzaj · Poziom · Przykład · Przykład PL · Przykład EN · Temat.

`app/data/words.json` – jedno słowo w linii:
```json
{"it": "il cane", "pl": "pies", "en": "dog", "pos": "noun", "lvl": "A1", "g": "m"}
```
- `it` – rzeczowniki zawsze z rodzajnikiem (il, lo, la, l', i, gli, le). Wyjątek: `internet`.
- `pl`, `en` – kilka znaczeń rozdzielonych `;`; tekst w nawiasie to dopisek (pomijany przy sprawdzaniu i wymowie).
- `pos` – noun, verb, adjective, adverb, preposition, conjunction, pronoun, interjection, numeral.
- `g` – m/f tylko dla rzeczowników. Rzeczowniki m/f są rozdzielone na dwa wiersze (il cliente / la cliente).
- `lvl` – A1, A2, B1, B2, C1, C2. Nowy poziom w Excelu = nowa zakładka w aplikacji automatycznie.
- `ex`, `exPl`, `exEn` – opcjonalne zdanie przykładowe i jego tłumaczenia (wszystkie trzy albo żadne).
- `t` – tematy, np. `["food", "nature"]` (maks. 2). W Excelu kolumna **Temat** z polskimi nazwami rozdzielonymi `;`; lista nazw i kluczy w `TOPICS` w `data.js` i `excel_to_json.py` (trzymać zgodnie).

## Decyzje (nie roztrząsać od nowa)
- **Id słowa = `it|indeks części mowy|rodzaj`** – na nim opiera się zapisany postęp. Nie zmieniać kolejności `POS_KEYS` w `data.js`. Poprawka tłumaczenia nie kasuje postępu; zmiana pisowni włoskiego słowa – tak.
- **Powtórki:** pudełka Leitnera 0–5; dobrze = +1, źle = 0; „opanowane” od pudełka 3. Nowe słowa losowane z wagą 4, pudełko n z wagą 6−n.
- **Pisanie – sprawdzanie:** cel IT = identycznie z bazą (z rodzajnikiem i akcentami; ignorujemy wielkość liter, spacje, rodzaj apostrofu). Cel PL/EN = dowolny wariant spośród rozdzielonych `;`, bez nawiasów; w EN czasownik z „to” lub bez. Podpowiedzi „prawie”: akcenty/polskie znaki albo rodzajnik.
- **Wymowa:** głosy wbudowane w urządzenie (Web Speech API), każdy język swoim głosem. Brak włoskiego głosu → komunikat z instrukcją. Nagrane pliki audio – ewentualnie później.
- **Postęp** zapisywany w przeglądarce (localStorage, klucz `quaderno-italiano.v2`). Każdy użytkownik ma własny postęp; nie przenosi się między urządzeniami. Postęp jest przypisany do adresu strony – adresu nie zmieniamy.
- **Aktualizacje:** nowy numer w `version.js` → użytkownicy widzą pasek „Dostępna nowa wersja – Odśwież”, potem „Co nowego” z `changelog.json`.
- **Poziomy przypisujemy uczciwie** – słowo łatwiejsze niż B2 dostaje swój prawdziwy poziom, nawet jeśli dodawaliśmy pakiet B2.
- **Przykładowe zdania:** jedno na słowo, krótkie i codzienne; słowo w naturalnej formie (odmienione). Gramatyka rośnie z poziomem: A1 głównie czas teraźniejszy; A2 passato prossimo, imperfetto, zwrotne; B1 condizionale, congiuntivo presente, zaimki łączone; B2 congiuntivo imperfetto, okresy warunkowe, strona bierna. Słowa wieloznaczne – zdanie z najczęstszym znaczeniem. Zdania nie powtarzają się między poziomami. Fiszki – po odkryciu karty; Quiz – dopiero po odpowiedzi (żeby nie zdradzać). Tłumaczenie w języku wybranego kierunku. Proces: CSV do przeglądu (`source/przyklady_XX.csv`) → akceptacja Wojtka → `import_examples.py` → `excel_to_json.py`.
- **Poziomy** to niezależne przełączniki (`S.lvls`, np. `["A1","B2"]`); zawsze co najmniej jeden włączony. Bez osobnego kafelka „Wszystkie”.
- **Filtry:** część mowy i temat to listy rozwijane z wielokrotnym wyborem (`S.pos`, `S.topics` – tablice indeksów, pusta = wszystkie); liczby w jednej liście uwzględniają drugi filtr. Lista tematów pokazuje się dopiero, gdy słowa mają tematy.
- **Tematy (12):** Człowiek i rodzina (dane osobowe, ciało, charakter, uczucia, rodzina; też ubrania i narodowości) · Dom i otoczenie (też miasto) · Praca i edukacja · Zakupy i żywienie (też pieniądze) · Podróże i transport · Zdrowie · Czas i przyroda · Kultura, rozrywka i sport · Społeczeństwo i prawo (polityka, prawo, przestępstwa, religia) · Technologia (urządzenia, internet, wiadomości – kanały komunikacji) · Opinie i dyskusja (mówienie, wyrażanie i uzasadnianie zdania, zgoda/sprzeciw, łączniki argumentacji) · Inne (reszta: słowa ogólne i abstrakcyjne, słowa funkcyjne, liczebniki). Słowo ma 1–2 tematy.
- **Liczebniki:** część mowy `numeral` (liczebnik, indeks 8 – dopisana na końcu `POS_KEYS`). A1: 1–20, 30–90, 100, 1000; milion to rzeczownik „il milione” (przeniesiony z A2 do A1).
- **Własny zestaw:** jeden na przeglądarkę, kafelek obok poziomów („+” gdy brak, „Mój” gdy jest; kliknięcie aktywnego otwiera stronę zestawu). Działa osobno od poziomów (`S.my`). Słowa w localStorage `quaderno-italiano.myset`, postęp w `S.boxes` z prefiksem id `+|`. Szablon .xlsx generowany w przeglądarce w języku interfejsu (arkusz słów z listami rozwijanymi + arkusz z instrukcją). Kolumny rozpoznawane po nagłówkach PL/EN/IT, kolejność dowolna. Kierunki tylko dla języków z zestawu; filtr tematów ukryty. Plik z błędami nie jest zapisywany – lista błędów z numerami wierszy. Podmiana zestawu zachowuje postęp słów, które w nim zostały.
- **Interfejs** w trzech językach (PL/EN/IT); nowy tekst dodajemy do wszystkich trzech bloków w `i18n.js`.

## Jak wydać nową wersję
1. Zmiany w słowach: popraw `source/Wloski.xlsx` → `python tools/excel_to_json.py`. Nowe zdania z CSV: najpierw `python tools/import_examples.py source/przyklady_XX.csv`.
2. Podnieś numer w `app/version.js` i dopisz wpis w `app/data/changelog.json`.
3. Sprawdź lokalnie: `cd app && python -m http.server 8000` → http://localhost:8000
4. `git add -A && git commit -m "opis zmiany" && git push` – Netlify sam opublikuje (gdy repo jest połączone z Netlify).

Środowisko (komputer Wojtka): Python 3.12 + openpyxl zainstalowane. Git jest dostępny tylko jako część GitHub Desktop (`%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`) – commit działa z terminala, ale **push robi Wojtek w GitHub Desktop** (brak zapisanych danych logowania w terminalu).

## Historia wersji
- **1.2.0** – przykładowe zdania (IT + PL + EN) w Fiszkach i Quizie; zdania A1 (370). Kolumny Przykład* w Excelu, `tools/import_examples.py`.
- **1.3.0** – zdania A2 (708). Poprawione tłumaczenia: spegnere, la destra, la nota, il vestito, il bicchiere; zbędne średniki; literówka w la domanda; usunięty zdublowany wiersz il coraggio.
- **1.4.0** – poziomy jako niezależne przełączniki; filtry części mowy i tematu (listy z wielokrotnym wyborem); 12 tematów przypisanych do wszystkich słów (kolumna Temat); liczebniki w A1 (nowa część mowy `numeral`), il milione przeniesiony do A1; poprawki: sito (przym.), assai.
- **1.5.0** – zdania B1 (1135).
- **1.6.0** – zdania B2 (1326). Od tej wersji wszystkie 3568 słów ma przykładowe zdania.
- **1.7.0** – własny zestaw słów (kafelek „+”, szablon .xlsx, wgrywanie .xlsx/.csv, walidacja, tylko wpisane języki).

## Stan (2026-10-21)
- Wersja **1.7.0**: własny zestaw słów (jeden, z pliku .xlsx/.csv). 3568 słów (A1 400, A2 707, B1 1135, B2 1326), w tym liczebniki w A1. Wszystkie słowa mają przykładowe zdanie z tłumaczeniem PL i EN. Wszystkie słowa mają tematy (12). Poziomy łączone dowolnie; filtry części mowy i tematu z wielokrotnym wyborem. Tryby: Fiszki, Quiz, Pisanie, Lista. Kierunki IT↔PL, IT↔EN. Interfejs PL/EN/IT. PWA: instalacja, offline, pasek aktualizacji.
- Kod podzielony na moduły; dane wyniesione do `data/words.json`; Excel jest źródłem.

## Do zrobienia
1. **Poprawki aplikacji** – następny krok (lista do ustalenia z Wojtkiem).
2. **Pisanie – uzupełnianie zdań** (IT→PL, IT→EN): zdanie po włosku z luką, podpowiedź PL/EN. Zdania są już gotowe dla wszystkich słów (`ex`/`exPl`/`exEn`); słowo w zdaniu często jest odmienione. Do decyzji: czy wymagać formy odmienionej, czy pokazywać formę podstawową.
3. **Odmiana czasowników**: wybór poziomu i czasu, losowana osoba. Tabele odmiany w osobnym arkuszu Excela; czasy przypisane do poziomów.
4. **Gramatyka**: zagadnienia od A1, teoria + ćwiczenia; zacząć od 5–6 tematów A1.
5. **Słownictwo C1 i C2** – później.
6. **Własny zestaw słów** – zrobione w 1.7.0. Do sprawdzenia przez Wojtka: otwarcie szablonu w prawdziwym Excelu / Google Sheets / Numbers i wgranie pliku na iPhonie. Możliwe rozszerzenia: kilka zestawów, opcjonalne kolumny ze zdaniami przykładowymi.
7. Opcjonalnie: wspólny postęp na wielu urządzeniach (wymaga logowania, np. Firebase/Supabase); nagrane pliki wymowy.
