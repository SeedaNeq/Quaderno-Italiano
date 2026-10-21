"""Review CSV → columns in source/Wloski.xlsx (example sentences and/or topics)

Usage (from the project folder):
    python tools/import_examples.py source/przyklady_A1.csv
    python tools/import_examples.py source/tematy.csv

The CSV (semicolon-separated, UTF-8) needs columns Włoski, Type, Rodzaj and at least one of:
Przykład, Przykład PL, Przykład EN, Temat. Only the columns present in the CSV are imported.
Rows are matched to the sheet "Słownik" by Włoski + Type + Rodzaj (the same key as the word id).
Missing columns are added to the sheet. Existing values are overwritten.
Afterwards run: python tools/excel_to_json.py
"""
import csv
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("Brak biblioteki openpyxl. Zainstaluj: pip install openpyxl")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source" / "Wloski.xlsx"
IMPORTABLE = ["Przykład", "Przykład PL", "Przykład EN", "Temat"]


def key(it, pos, g):
    return (str(it or "").strip(), str(pos or "").strip().lower(), str(g or "").strip().lower())


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f, delimiter=";"))
    missing = [c for c in ["Włoski", "Type", "Rodzaj"] if rows and c not in rows[0]]
    if missing:
        sys.exit(f"Brak kolumn w CSV: {', '.join(missing)}")
    EXAMPLE = [c for c in IMPORTABLE if rows and c in rows[0]]
    if not EXAMPLE:
        sys.exit(f"CSV nie ma żadnej z kolumn: {', '.join(IMPORTABLE)}")
    new = {key(r["Włoski"], r["Type"], r["Rodzaj"]): [r[c].strip() for c in EXAMPLE] for r in rows}

    wb = openpyxl.load_workbook(SRC)
    ws = wb["Słownik"]
    head = [c.value for c in ws[1]]
    for name in EXAMPLE:
        if name not in head:
            ws.cell(row=1, column=len(head) + 1, value=name)
            head.append(name)
    col = {n: head.index(n) + 1 for n in ["Włoski", "Type", "Rodzaj"] + EXAMPLE}

    done, changed = set(), 0
    for n in range(2, ws.max_row + 1):
        k = key(*(ws.cell(row=n, column=col[c]).value for c in ["Włoski", "Type", "Rodzaj"]))
        if k not in new:
            continue
        for name, value in zip(EXAMPLE, new[k]):
            cell = ws.cell(row=n, column=col[name])
            if (cell.value or "") != value:
                cell.value = value or None
                changed += 1
        done.add(k)

    lost = [k for k in new if k not in done]
    if lost:
        print("Nie znaleziono w Excelu (pominięte):")
        print("\n".join(f"  - {k[0]} ({k[1]} {k[2]})".rstrip() for k in lost))
    wb.save(SRC)
    print(f"Wgrano {', '.join(EXAMPLE)} dla {len(done)} słów ({changed} zmienionych komórek) do {SRC.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
