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

// Part-of-speech chip, e.g. "SOSTANTIVO". The gender is never shown (no m/f, no colour): guessing it is part of the exercise.
export function tagHTML(w) {
  return `<span class="tag t-o" title="${esc(POS[w.p][T().posIdx])}">${esc(POS[w.p][1])}</span>`;
}

// Example sentence (Italian) with its translation in `lang` ("pl" or "en"); empty if the word has none
export function exampleHTML(w, lang) {
  if (!w.ex) return "";
  const tr = lang === "en" ? w.exEn : w.exPl;
  return `<div class="ex"><div class="ex-it">${esc(w.ex)} ${mini(w.ex, "it")}</div>${tr ? `<div class="ex-tr">${esc(tr)}</div>` : ""}</div>`;
}

// Selected levels for headings: "B1", "A1 + B2", "All levels" or the own set
export const lvlLabel = () => (S.my ? T().mySet : S.lvls.length > 1 && S.lvls.length === LEVELS.length ? T().allLvl : S.lvls.join(" + "));

// Phones: when the on-screen keyboard is open over the Writing answer box, scroll the header away
// so the word, the input and the buttons stay visible together. Keyboard = visible area much shorter than the tallest seen.
const phone = matchMedia("(max-width:560px)");
let fullH = 0;
export function fitWriting() {
  const h = window.visualViewport ? visualViewport.height : innerHeight;
  fullH = Math.max(fullH, h);
  const a = document.activeElement;
  if (phone.matches && h < fullH * 0.8 && a && a.classList.contains("answerIn")) $("#view").scrollIntoView({ block: "start" });
}

// Redraw #view around the focused answer box instead of replacing it: the box never loses focus,
// so on phones the on-screen keyboard stays open between answers. `value` = what the box should show.
export function keepInput(inp, html, value) {
  const root = $("#view"), tmp = document.createElement("div");
  tmp.innerHTML = html;
  const fresh = tmp.querySelector("#" + inp.id);
  if (!fresh) { root.innerHTML = html; return; }
  const copyAttrs = (to, from) => { for (const a of [...to.attributes]) to.removeAttribute(a.name); for (const a of from.attributes) to.setAttribute(a.name, a.value); };
  copyAttrs(inp, fresh);
  inp.value = value;
  for (let o = inp, n = fresh; o !== root; o = o.parentNode, n = n.parentNode) {
    const P = o.parentNode, N = n.parentNode;
    for (const c of [...P.childNodes]) if (c !== o) c.remove();
    let before = true;
    for (const c of [...N.childNodes]) { if (c === n) before = false; else if (before) P.insertBefore(c, o); else P.appendChild(c); }
    if (P !== root) copyAttrs(P, N);
  }
}

// Multi-select filter: a button showing the selection and, when open, a list of check boxes.
// S[kind] = list of selected indexes, empty = all. opts: [{ i, name, n }] – n is shown on the right, falsy n disables the option.
export function dropdown(kind, label, total, opts) {
  const tr = T(), sel = S[kind], open = S.dd === kind;
  const one = sel.length === 1 && opts.find(o => o.i === sel[0]);
  const summary = !sel.length ? tr.all : one ? one.name : tr.nSel(sel.length);
  const opt = (i, name, n, on) => `<button class="ddopt" data-f="${kind}" data-i="${i}" role="checkbox" aria-checked="${on}" ${!n && !on ? "disabled" : ""}>
    <span class="ck" aria-hidden="true"></span><span class="nm">${esc(name)}</span><small>${n}</small></button>`;
  return `<div class="dd${open ? " open" : ""}">
    <button class="ddbtn" data-dd="${kind}" aria-expanded="${open}"><span class="ddlbl">${esc(label)}</span><b>${esc(summary)}</b><span class="caret" aria-hidden="true">▾</span></button>
    ${open ? `<div class="ddmenu" role="group" aria-label="${esc(label)}">${opt(-1, tr.all, total, !sel.length)}${opts.map(o => opt(o.i, o.name, o.n, sel.includes(o.i))).join("")}</div>` : ""}
  </div>`;
}

// Accent button: insert a character at the cursor of the focused (or the first) answer box.
// An "input" event tells the mode about the new text; a locked box (after checking) undoes it there.
export function insertChar(ch) {
  const a = document.activeElement, i = a && a.classList.contains("answerIn") ? a : document.querySelector(".answerIn");
  if (!i || i.readOnly) return;
  const s = i.selectionStart ?? i.value.length, z = i.selectionEnd ?? s;
  i.value = i.value.slice(0, s) + ch + i.value.slice(z);
  i.focus(); i.setSelectionRange(s + 1, s + 1);
  i.dispatchEvent(new Event("input", { bubbles: true }));
}

// Accent buttons for typing Italian (data-ins inserts into the focused answer box)
export const accentsHTML = () => `<div class="accents" aria-label="${T().wAccents}">${["à", "è", "é", "ì", "ò", "ù", "'"].map(c => `<button class="acc" data-ins="${c}" tabindex="-1">${c}</button>`).join("")}</div>`;

export const empty = () => `<section class="page"><p class="hint" style="margin:0">${T().empty}</p></section>`;
