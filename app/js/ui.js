// Small shared HTML helpers.
import { T } from "./i18n.js";
import { POS, LEVELS } from "./data.js";
import { S } from "./state.js";
import { mini } from "./speech.js";

export const $ = s => document.querySelector(s);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const SPK = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';

// Italian word with the article greyed out: "il cane" → <span class="art">il </span>cane
export function itHTML(it) {
  const m = it.match(/^(il |lo |la |le |gli |i |l')(.*)$/);
  return m ? `<span class="art">${esc(m[1])}</span>${esc(m[2])}` : esc(it);
}

// Five dots showing the memory box (0..5)
export function dots(b) {
  const n = b || 0;
  let s = "";
  for (let i = 1; i <= 5; i++) s += i <= n ? "●" : '<span class="off">●</span>';
  return `<span class="dots" title="${T().box} ${n}/5">${s}</span>`;
}

// Part-of-speech + gender chip, e.g. "SOSTANTIVO · M"
export function tagHTML(w) {
  const tr = T(), it = POS[w.p][1];
  const g = w.g === "m" ? " · m" : w.g === "f" ? " · f" : "";
  const cls = w.g === "m" ? "t-m" : w.g === "f" ? "t-f" : "t-o";
  const title = esc(POS[w.p][tr.posIdx]) + (w.g === "m" ? ", " + tr.m : w.g === "f" ? ", " + tr.f : "");
  return `<span class="tag ${cls}" title="${title}">${esc(it)}${g}</span>`;
}

// Example sentence (Italian) with its translation in `lang` ("pl" or "en"); empty if the word has none
export function exampleHTML(w, lang) {
  if (!w.ex) return "";
  const tr = lang === "en" ? w.exEn : w.exPl;
  return `<div class="ex"><div class="ex-it">${esc(w.ex)} ${mini(w.ex, "it")}</div>${tr ? `<div class="ex-tr">${esc(tr)}</div>` : ""}</div>`;
}

// Selected levels for headings: "B1", "A1 + B2", "All levels" or the own set
export const lvlLabel = () => (S.my ? T().mySet : S.lvls.length > 1 && S.lvls.length === LEVELS.length ? T().allLvl : S.lvls.join(" + "));

export const empty = () => `<section class="page"><p class="hint" style="margin:0">${T().empty}</p></section>`;
