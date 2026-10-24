// Verb conjugation: loading data/verbs.json (made from the Excel sheet "Odmiana"), checking typed forms, tables.
// Forms: several variants separated by ";", gender with essere written as "andato/a", "andati/e" (both accepted).
import { T } from "./i18n.js";
import { esc } from "./ui.js";
import { mini } from "./speech.js";

// key, Italian name, level – same order as TENSES in tools/conjugate.py (the order of forms in verbs.json)
export const TENSES = [
  ["pres", "presente", "A1"],
  ["pp", "passato prossimo", "A2"], ["impf", "imperfetto", "A2"], ["fut", "futuro semplice", "A2"], ["imp", "imperativo", "A2"],
  ["cond", "condizionale presente", "B1"], ["cong", "congiuntivo presente", "B1"], ["trap", "trapassato prossimo", "B1"],
  ["congi", "congiuntivo imperfetto", "B2"], ["congp", "congiuntivo passato", "B2"], ["condp", "condizionale passato", "B2"],
  ["rem", "passato remoto", "B2"],
];
export const PERSONS = ["io", "tu", "lui/lei", "noi", "voi", "loro"];
const IMP_PERSONS = ["", "(tu)", "(Lei)", "(noi)", "(voi)", "(Loro)"];
export const personName = (t, p) => (TENSES[t][0] === "imp" ? IMP_PERSONS : PERSONS)[p];

export const VERBS = {};
let loading = null;
export function loadVerbs() {
  if (!loading) loading = fetch("data/verbs.json").then(r => r.json()).then(d => { Object.assign(VERBS, d); return true; })
    .catch(() => { loading = null; return false; });
  return loading;
}
export const verbsReady = () => Object.keys(VERBS).length > 0;
export const conj = it => VERBS[it] || null;

// "sono andato/a; ho salito" → ["sono andato", "sono andata", "ho salito"]
export function variants(form) {
  return String(form).split(";").map(s => s.trim()).filter(Boolean)
    .flatMap(s => { const m = s.match(/^(.*?)([oi])\/([ae])(\b.*)$/); return m ? [m[1] + m[2] + m[4], m[1] + m[3] + m[4]] : [s]; });
}
const nrm = s => String(s).replace(/[’‘`´]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const SUBJ = /^(io|tu|lui|lei|lui\/lei|noi|voi|loro) /;            // a typed subject pronoun is ignored: "noi andiamo"

export function checkForm(form, typed) {
  const t = nrm(typed).replace(SUBJ, "");
  if (!t) return null;
  const acc = variants(form).map(nrm);
  const ok = acc.includes(t);
  return { ok, near: !ok && acc.some(a => plain(a) === plain(t)) ? "accent" : "" };
}

// First variant, readable aloud: "sono andato/a" → "sono andato"
export const sayable = form => variants(form)[0] || "";

// One tense as a small table; hi = person to highlight
export function tenseHTML(it, t, hi = -1) {
  const v = conj(it);
  if (!v) return "";
  const rows = v.f[t].map((f, p) => f ? `<tr class="${p === hi ? "hi" : ""}"><th>${esc(personName(t, p))}</th><td>${esc(f)} ${mini(sayable(f), "it")}</td></tr>` : "").join("");
  return `<table class="conj"><caption>${esc(TENSES[t][1])} <small>${TENSES[t][2]}</small></caption><tbody>${rows}</tbody></table>`;
}

// All tenses of a verb (word list)
export function allTensesHTML(it) {
  const v = conj(it);
  if (!v) return `<p class="hint">${T().cjLoading}</p>`;
  return `<div class="conjgrid">${TENSES.map((_, t) => (v.f[t].some(Boolean) ? tenseHTML(it, t) : "")).join("")}</div>`;
}

// Italian verb as a button that opens its presente (Flashcards, Writing); plain text for other words
export function verbLink(w, html, open) {
  if (w.p !== 1 || !conj(w.it)) return html;
  return `<button class="vlink" data-conj="${esc(w.it)}" aria-expanded="${open}" title="${T().vShow}">${html}</button>`;
}
export const presentBox = w => `<div class="vbox">${tenseHTML(w.it, 0)}<div class="vtag">${conj(w.it).irr ? T().irrTag : T().regTag}</div></div>`;
