"""Excel → app/data/words.json

Usage (from the project folder):
    python tools/excel_to_json.py

Reads source/Wloski.xlsx, sheet "Słownik", and writes app/data/words.json.
Required columns (by header name): Włoski, Polski, Angielski, Type, Rodzaj, Poziom.
Other columns (Typ, Tipo, Uwaga...) are ignored.
Stops with a list of problems if any row is invalid, so a broken file never reaches the app.
"""
import json
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("Brak biblioteki openpyxl. Zainstaluj: pip install openpyxl")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source" / "Wloski.xlsx"
OUT = ROOT / "app" / "data" / "words.json"
POS = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "pronoun", "interjection"]
LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
ARTICLES = ("il ", "lo ", "la ", "i ", "gli ", "le ", "l'")


def text(v):
    if isinstance(v, bool):           # Excel turns words like "prawda" into TRUE
        return None
    return str(v).strip() if v is not None else ""


def main():
    ws = openpyxl.load_workbook(SRC, read_only=True, data_only=True)["Słownik"]
    rows = ws.iter_rows(values_only=True)
    head = [text(h) for h in next(rows)]
    need = ["Włoski", "Polski", "Angielski", "Type", "Rodzaj", "Poziom"]
    missing = [n for n in need if n not in head]
    if missing:
        sys.exit(f"Brak kolumn: {', '.join(missing)}")
    col = {n: head.index(n) for n in need}

    words, problems, seen = [], [], set()
    for n, r in enumerate(rows, start=2):
        get = lambda name: text(r[col[name]]) if col[name] < len(r) else ""
        it, pl, en, pos, g, lvl = (get(x) for x in need)
        if not it and not pl:
            continue                                   # empty row
        pos = (pos or "").lower()
        g = (g or "").lower()
        if pl is None or en is None:
            problems.append(f"wiersz {n}: komórka z wartością PRAWDA/FAŁSZ zamiast tekstu")
            continue
        if not it or not pl:
            problems.append(f"wiersz {n}: brak słowa włoskiego lub polskiego")
        if pos not in POS:
            problems.append(f"wiersz {n} ({it}): nieznana część mowy w kolumnie Type: '{pos}'")
        if lvl not in LEVELS:
            problems.append(f"wiersz {n} ({it}): nieznany poziom '{lvl}'")
        if pos == "noun" and g not in ("m", "f"):
            problems.append(f"wiersz {n} ({it}): rzeczownik bez rodzaju m/f")
        if pos == "noun" and g and it != "internet" and not it.startswith(ARTICLES):
            problems.append(f"wiersz {n} ({it}): rzeczownik bez rodzajnika")
        key = (it, pos, g)
        if key in seen:
            print(f"uwaga: wiersz {n} ({it}) to duplikat – pominięty")
            continue
        seen.add(key)
        w = {"it": it, "pl": pl, "en": en, "pos": pos, "lvl": lvl}
        if g:
            w["g"] = g
        words.append(w)

    if problems:
        print("Nie zapisano pliku. Popraw w Excelu:")
        print("\n".join("  - " + p for p in problems))
        sys.exit(1)

    # one word per line = readable changes in Git
    OUT.write_text("[\n" + ",\n".join(json.dumps(w, ensure_ascii=False) for w in words) + "\n]\n", encoding="utf-8")
    by_lvl = {l: sum(w["lvl"] == l for w in words) for l in LEVELS if any(w["lvl"] == l for w in words)}
    print(f"Zapisano {len(words)} słów do {OUT.relative_to(ROOT)}: " + ", ".join(f"{k} {v}" for k, v in by_lvl.items()))


if __name__ == "__main__":
    main()
