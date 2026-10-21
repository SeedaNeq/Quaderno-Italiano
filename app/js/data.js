// Word list: loading data/words.json, levels, filtering, picking the next word.
import { S, box } from "./state.js";

// Order matters: the index is part of every word id (saved progress), never reorder.
export const POS_KEYS = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "pronoun", "interjection", "numeral"];
// Names shown in the UI: [Polish, Italian, English] – index = T().posIdx
export const POS = [
  ["rzeczownik", "sostantivo", "noun"], ["czasownik", "verbo", "verb"], ["przymiotnik", "aggettivo", "adjective"],
  ["przysłówek", "avverbio", "adverb"], ["przyimek", "preposizione", "preposition"], ["spójnik", "congiunzione", "conjunction"],
  ["zaimek", "pronome", "pronoun"], ["wykrzyknik", "interiezione", "interjection"], ["liczebnik", "numerale", "numeral"],
];

// Topics: key in words.json → names [Polish, Italian, English]. The Polish name is what goes into the Excel column "Temat"
// (keep in sync with TOPICS in tools/excel_to_json.py). Order = order in the topic filter.
export const TOPICS = [
  ["person", "Człowiek i rodzina", "Persona e famiglia", "People and family"],
  ["home", "Dom i otoczenie", "Casa e dintorni", "Home and surroundings"],
  ["work", "Praca i edukacja", "Lavoro e istruzione", "Work and education"],
  ["food", "Zakupy i żywienie", "Spesa e alimentazione", "Shopping and food"],
  ["travel", "Podróże i transport", "Viaggi e trasporti", "Travel and transport"],
  ["health", "Zdrowie", "Salute", "Health"],
  ["nature", "Czas i przyroda", "Tempo e natura", "Time and nature"],
  ["culture", "Kultura, rozrywka i sport", "Cultura, svago e sport", "Culture, leisure and sport"],
  ["society", "Społeczeństwo i prawo", "Società e diritto", "Society and law"],
  ["tech", "Technologia", "Tecnologia", "Technology"],
  ["opinions", "Opinie i dyskusja", "Opinioni e discussione", "Opinions and discussion"],
  ["other", "Inne", "Altro", "Other"],
];
const TOPIC_IDX = Object.fromEntries(TOPICS.map((t, i) => [t[0], i]));
export const topicName = (i, posIdx) => TOPICS[i][1 + posIdx];

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
      ex: r.ex || "", exPl: r.exPl || "", exEn: r.exEn || "",
      t: (r.t || []).map(k => TOPIC_IDX[k]).filter(i => i !== undefined) });
  }
  LEVELS = [...new Set(WORDS.map(w => w.lvl))].sort();
}

// Own word set (see myset.js). Ids start with "+|" so its progress never mixes with the dictionary.
export const MY = { name: "", words: [] };
export function setMy(name, list) {
  MY.name = name;
  MY.words = list.map(r => ({ id: "+|" + r.it + "|" + r.p + "|" + (r.g || ""), it: r.it, pl: r.pl || "", en: r.en || "", p: r.p, g: r.g || "",
    lvl: "+", ex: "", exPl: "", exEn: "", t: [] }));
}
// A language can be used only if the current word source has it (the own set may have only PL or only EN)
export const hasLang = l => !S.my || MY.words.some(w => w[l]);
export function fixDir() { if (!hasLang(L())) S.dir = S.dir.replace(L(), OTHER()); }

// Direction helpers, e.g. S.dir = "it-pl"
export const SRC = () => S.dir.slice(0, 2);
export const TGT = () => S.dir.slice(3);
export const L = () => (S.dir.includes("en") ? "en" : "pl");      // the non-Italian language in play
export const OTHER = () => (L() === "en" ? "pl" : "en");          // the third language, shown as extra
export const LBL = { pl: "PL", en: "EN" };

export const inLevel = () => (S.my ? MY.words : WORDS.filter(w => S.lvls.includes(w.lvl)));
export const hasTopics = () => !S.my && WORDS.some(w => w.t.length);

// Filters: S.pos and S.topics are lists of indexes; an empty list means "all".
// skip = "pos" or "topics" ignores that filter (used for the counts shown in its own drop-down).
export function filtered(skip) {
  const pos = skip === "pos" ? [] : S.pos, top = skip === "topics" || !hasTopics() ? [] : S.topics;
  return inLevel().filter(w => (!pos.length || pos.includes(w.p)) && (!top.length || w.t.some(t => top.includes(t)))
    && w[L()]);
}
export const pool = () => filtered();

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
