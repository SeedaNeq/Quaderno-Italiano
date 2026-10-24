// Mode: Conjugation (Odmiana). Verbs from the chosen levels/topics, tenses from the multi-select (S.tenses, empty = all),
// regular/irregular filter (S.vreg). Two kinds of exercise (S.cjTable):
//  - one form: verb + tense + person, type the form, Enter checks, Enter again goes on;
//  - whole table: type all persons of one tense, Enter moves to the next box, on the last one checks.
// Checking: like Writing to IT (accents count, case/spaces/apostrophe type ignored), any variant from ";" is fine,
// "andato/a" accepts both genders, a typed subject pronoun ("noi andiamo") is ignored.
// Progress: Leitner box per verb + tense, id "v|verb|tense key" in S.boxes (never mixes with word ids).
import { S, app, box, bump, save } from "../state.js";
import { T } from "../i18n.js";
import { filtered, L, LBL } from "../data.js";
import { $, esc, dots, dropdown, keepInput, accentsHTML, fitWriting } from "../ui.js";
import { speak, mini } from "../speech.js";
import { TENSES, conj, loadVerbs, verbsReady, checkForm, sayable, tenseHTML, personName } from "../verbs.js";

const tenses = () => (S.tenses.length ? S.tenses : TENSES.map((_, i) => i));
const key = (w, t) => "v|" + w.it + "|" + TENSES[t][0];

// Verbs in play: chosen levels + topic filter (the part-of-speech filter is ignored here) + regular/irregular
export function verbPool() {
  return filtered("pos").filter(w => w.p === 1 && conj(w.it)
    && (S.vreg === "all" || (S.vreg === "irr") === !!conj(w.it).irr));
}

// Weighted random verb + tense, like words: new weight 4, box n weight 6-n; never the same pair twice in a row
function pick() {
  const items = [];
  for (const w of verbPool()) for (const t of tenses()) if (conj(w.it).f[t].some(Boolean)) items.push({ w, t, id: key(w, t) });
  if (!items.length) return null;
  const xs = items.length > 1 ? items.filter(x => x.id !== S.last) : items;
  const weight = x => { const b = box(x); return b === undefined ? 4 : 6 - b; };
  let r = Math.random() * xs.reduce((s, x) => s + weight(x), 0);
  let it = xs[0];
  for (const x of xs) { r -= weight(x); if (r <= 0) { it = x; break; } }
  const ps = conj(it.w.it).f[it.t].map((f, p) => (f ? p : -1)).filter(p => p >= 0);
  return { ...it, p: ps[Math.floor(Math.random() * ps.length)], res: null, typed: ["", "", "", "", "", ""] };
}

function controls() {
  const tr = T();
  const seg = (attr, val, cur, label) => `<button class="chip" data-${attr}="${val}" aria-pressed="${val === cur}">${esc(label)}</button>`;
  const n = verbPool().length;
  return `<div class="cjbar">
    ${dropdown("tenses", tr.tense, TENSES.length, TENSES.map(([, name, lvl], i) => ({ i, name, n: lvl })))}
    <div class="seg" role="group">${seg("vreg", "all", S.vreg, tr.vAll)}${seg("vreg", "reg", S.vreg, tr.vReg)}${seg("vreg", "irr", S.vreg, tr.vIrr)}</div>
    <div class="seg" role="group">${seg("cjm", "one", S.cjTable ? "table" : "one", tr.cjOne)}${seg("cjm", "table", S.cjTable ? "table" : "one", tr.cjTable)}</div>
    <span class="cjcount">${n} ${tr.verbs}</span>
  </div>`;
}

export function render() {
  const tr = T();
  if (!verbsReady()) {
    $("#view").innerHTML = `<section class="page"><p class="hint" style="margin:0">${tr.cjLoading}</p></section>`;
    loadVerbs().then(ok => { if (ok && S.mode === "conj") app.render(); });
    return;
  }
  const c = S.cj;
  if (!c || !verbPool().some(w => w.id === c.w.id) || !tenses().includes(c.t)) { S.last = null; S.cj = pick(); }
  if (!S.cj) { $("#view").innerHTML = `<section class="page stack">${controls()}<p class="hint" style="margin:0">${tr.cjEmpty}</p></section>`; return; }
  const { w, t } = S.cj, b = box(S.cj), v = conj(w.it);
  const head = `${controls()}
    <div class="meta"><span>${b === undefined ? tr.newWord : tr.box + " " + b + " " + dots(b)}</span><span>${tr.today}: ${S.session}</span></div>
    <div class="cjhead">
      <div class="tagrow"><span class="tag t-o">${esc(TENSES[t][1])} · ${TENSES[t][2]}</span><span class="tag t-o">${v.irr ? tr.irrTag : tr.regTag}</span></div>
      <div class="word">${esc(w.it)} ${mini(w.it, "it")}</div>
      <div class="cjtr"><b>${LBL[L()]}</b>${esc(w[L()])}</div>
    </div>`;
  const html = `<section class="page">${head}${S.cjTable ? tableBody() : oneBody()}</section>`;
  const old = document.activeElement;
  if (!S.cjTable && old && old.id === "cIn") keepInput(old, html, S.cj.typed[0]);
  else $("#view").innerHTML = html;
  const focus = $(S.cjTable ? "#cIn" + (S.cjFocus ?? firstP()) : "#cIn");
  if (focus) { try { focus.focus({ preventScroll: true }); focus.setSelectionRange(focus.value.length, focus.value.length); } catch (e) {} fitWriting(); }
}

const firstP = () => conj(S.cj.w.it).f[S.cj.t].findIndex(Boolean);

function oneBody() {
  const tr = T(), { w, t, p, res } = S.cj, form = conj(w.it).f[t][p];
  const result = res ? `<div class="result ${res.ok ? "ok" : "bad"}">
      <div class="verdict">${res.ok ? tr.wCorrect : tr.wWrong}</div>
      ${res.near ? `<div class="near">${tr.wAccent}</div>` : ""}
      <div class="main it">${esc(form)} ${mini(sayable(form), "it")}</div>
      ${tenseHTML(w.it, t, p)}
    </div>` : "";
  return `<div class="writebox">
      <div class="inrow cjone"><span class="cjperson">${esc(personName(t, p))}</span>
        <input id="cIn" class="answerIn ${res ? (res.ok ? "ok" : "bad") : ""}" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
          lang="it" placeholder="${tr.cjPh}" value="${esc(S.cj.typed[0])}" aria-label="${esc(personName(t, p))}: ${tr.cjPh}">
        <button class="btn primary" id="${res ? "cNext" : "cCheck"}">${res ? tr.next : tr.wCheck} <kbd>↵</kbd></button></div>
      ${res ? "" : accentsHTML()}${result}
      <div class="hint">${res ? tr.cjNextHint : tr.cjHint}</div>
    </div>`;
}

function tableBody() {
  const tr = T(), { w, t, res } = S.cj, forms = conj(w.it).f[t];
  const rows = forms.map((f, p) => {
    if (!f) return "";
    const r = res && res.list[p];
    return `<div class="cjrow"><label class="cjperson" for="cIn${p}">${esc(personName(t, p))}</label>
      <div class="cjcell"><input id="cIn${p}" data-p="${p}" class="answerIn ${r ? (r.ok ? "ok" : "bad") : ""}" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
        lang="it" value="${esc(S.cj.typed[p])}" ${res ? "readonly" : ""}>
      ${r && !r.ok ? `<div class="cjfix">${esc(f)} ${mini(sayable(f), "it")}</div>` : ""}</div></div>`;
  }).join("");
  const n = res ? res.list.filter(r => r && r.ok).length : 0, all = forms.filter(Boolean).length;
  return `<div class="writebox">
      <div class="cjtable">${rows}</div>
      ${res ? `<div class="result ${res.ok ? "ok" : "bad"}"><div class="verdict">${res.ok ? tr.wCorrect : tr.cjScore(n, all)}</div>
        ${res.list.some(r => r && r.near) ? `<div class="near">${tr.wAccent}</div>` : ""}</div>` : accentsHTML()}
      <div class="actions1"><button class="btn primary" id="${res ? "cNext" : "cCheck"}">${res ? tr.next : tr.wCheck} <kbd>↵</kbd></button></div>
      <div class="hint">${res ? tr.cjNextHint : tr.cjTableHint}</div>
    </div>`;
}

export function check() {
  const c = S.cj;
  if (!c || c.res) return;
  const forms = conj(c.w.it).f[c.t];
  if (S.cjTable) {
    if (!c.typed.some(s => s.trim())) { const i = $("#cIn" + firstP()); if (i) i.focus(); return; }
    const list = forms.map((f, p) => (f ? checkForm(f, c.typed[p]) || { ok: false, near: "" } : null));
    c.res = { ok: list.every(r => !r || r.ok), list };
  } else {
    const r = checkForm(forms[c.p], c.typed[0]);
    if (!r) { const i = $("#cIn"); if (i) i.focus(); return; }
    c.res = r;
    speak(sayable(forms[c.p]), "it");
  }
  bump(c, c.res.ok); S.session++;
  app.render();
}

export function next() {
  if (!S.cj || !S.cj.res) return;
  S.last = S.cj.id; S.cj = pick(); S.cjFocus = null;
  app.render();
}

// Typing (answer boxes are locked after checking: the text is put back)
export function input(el) {
  const c = S.cj;
  if (!c) return;
  const p = el.id === "cIn" ? 0 : +el.dataset.p;
  if (c.res) { el.value = c.typed[p]; return; }
  c.typed[p] = el.value;
}

export function onEnter(e) {
  e.preventDefault();
  const c = S.cj;
  if (!c) return;
  if (c.res) { next(); return; }
  if (S.cjTable && e.target.dataset && e.target.dataset.p !== undefined) {
    const forms = conj(c.w.it).f[c.t], p = +e.target.dataset.p;
    const nxt = forms.findIndex((f, i) => f && i > p);
    if (nxt >= 0) { S.cjFocus = nxt; $("#cIn" + nxt).focus(); return; }
  }
  check();
}

export function setOption(kind, val) {
  if (kind === "vreg") S.vreg = val; else S.cjTable = val === "table";
  S.cj = null; S.cjFocus = null; save(); app.render();
}
