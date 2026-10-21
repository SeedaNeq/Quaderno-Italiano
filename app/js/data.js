// Word list: loading data/words.json, levels, filtering, picking the next word.
import { S, box } from "./state.js";

// Order matters: the index is part of every word id (saved progress), never reorder.
export const POS_KEYS = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "pronoun", "interjection"];
// Names shown in the UI: [Polish, Italian, English] – index = T().posIdx
export const POS = [
  ["rzeczownik", "sostantivo", "noun"], ["czasownik", "verbo", "verb"], ["przymiotnik", "aggettivo", "adjective"],
  ["przysłówek", "avverbio", "adverb"], ["przyimek", "preposizione", "preposition"], ["spójnik", "congiunzione", "conjunction"],
  ["zaimek", "pronome", "pronoun"], ["wykrzyknik", "interiezione", "interjection"],
];

export const WORDS = [];
export let LEVELS = [];

export async function loadWords() {
  const res = await fetch("data/words.json");
  const list = await res.json();
  const seen = new Set();
  for (const r of list) {
    const p = POS_KEYS.indexOf(r.pos);
    const id = r.it + "|" + p + "|" + (r.g || "");
    if (p < 0 || seen.has(id)) continue;
    seen.add(id);
    WORDS.push({ id, it: r.it, pl: r.pl, en: r.en || "", p, g: r.g || "", lvl: r.lvl || "?",
      ex: r.ex || "", exPl: r.exPl || "", exEn: r.exEn || "" });
  }
  LEVELS = [...new Set(WORDS.map(w => w.lvl))].sort();
}

// Direction helpers, e.g. S.dir = "it-pl"
export const SRC = () => S.dir.slice(0, 2);
export const TGT = () => S.dir.slice(3);
export const L = () => (S.dir.includes("en") ? "en" : "pl");      // the non-Italian language in play
export const OTHER = () => (L() === "en" ? "pl" : "en");          // the third language, shown as extra
export const LBL = { pl: "PL", en: "EN" };

export const inLevel = () => WORDS.filter(w => w.lvl === S.lvl);
export const pool = () => inLevel().filter(w => (S.pos < 0 || w.p === S.pos) && (!S.dir.includes("en") || w.en));

export const shuffle = a => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Weighted random: new words weight 4, box n weight 6-n. Avoids repeating the last word.
export function pickNext() {
  const all = pool();
  if (!all.length) return null;
  const ws = all.length > 1 ? all.filter(w => w.id !== S.last) : all;
  const weight = w => { const b = box(w); return b === undefined ? 4 : 6 - b; };
  let r = Math.random() * ws.reduce((s, w) => s + weight(w), 0);
  for (const w of ws) { r -= weight(w); if (r <= 0) return w; }
  return ws[0];
}
