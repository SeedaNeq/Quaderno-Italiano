// Mode: Writing (Pisanie). Type the translation, Enter checks, Enter again accepts the suggestion.
// Rules:
//  - target IT (PL→IT, EN→IT): must equal the Italian entry incl. article and accents.
//    Ignored: letter case, extra spaces, apostrophe type (’ vs ').
//  - target PL/EN: any variant separated by ";" is accepted, text in (...) is ignored.
//    English verbs accepted with or without "to ".
//  - "near" hints: only accents/Polish letters differ, or only the article differs.
import { S, app, box, bump } from "../state.js";
import { T } from "../i18n.js";
import { pool, pickNext, SRC, TGT, L, OTHER, LBL } from "../data.js";
import { $, esc, itHTML, dots, tagHTML, empty, fitWriting, SPK } from "../ui.js";
import { speak, mini, canSpeak } from "../speech.js";

const nrm = s => String(s).replace(/[’‘`´]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
const ART = /^(il |lo |la |le |gli |i |l')/;

function accepted(w, dir) {
  const tg = dir.slice(3);
  if (tg === "it") return [w.it];
  return String(w[tg] || "").split(";").map(x => x.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
}

export function checkAnswer(w, dir, typed) {
  const tg = dir.slice(3), t = nrm(typed);
  if (!t) return null;
  const drop = s => (tg === "en" ? s.replace(/^to /, "") : s);
  const acc = accepted(w, dir).map(nrm);
  const ok = acc.includes(t) || (tg === "en" && acc.some(a => drop(a) === drop(t)));
  let near = "";
  if (!ok) {
    if (acc.some(a => plain(drop(a)) === plain(drop(t)))) near = "accent";
    else if (tg === "it" && acc.some(a => a.replace(ART, "") === t.replace(ART, ""))) near = "article";
  }
  return { ok, near };
}

export function render() {
  if (!S.wcur || !pool().some(w => w.id === S.wcur.id)) { S.last = null; S.wcur = pickNext(); S.wres = null; S.typed = ""; }
  const w = S.wcur, tr = T();
  if (!w) { $("#view").innerHTML = empty(); return; }
  const b = box(w), tg = TGT(), fromIt = SRC() === "it", o = OTHER(), r = S.wres;
  const front = fromIt ? `<div class="word">${itHTML(w.it)}</div>` : `<div class="word pl">${esc(w[L()])}</div>`;
  const answer = fromIt ? esc(w[tg]) : itHTML(w.it);
  const result = r ? `<div class="result ${r.ok ? "ok" : "bad"}">
      <div class="verdict">${r.ok ? tr.wCorrect : tr.wWrong}</div>
      ${r.near ? `<div class="near">${r.near === "accent" ? tr.wAccent : tr.wArticle}</div>` : ""}
      <div class="main ${fromIt ? "" : "it"}">${answer} ${fromIt ? mini(w[tg], tg) : mini(w.it, "it")}</div>
      ${w[o] && o !== tg ? `<div class="en"><b>${LBL[o]}</b>${esc(w[o])} ${mini(w[o], o)}</div>` : ""}
    </div>` : "";
  const accents = tg === "it" && !r
    ? `<div class="accents" aria-label="${tr.wAccents}">${["à", "è", "é", "ì", "ò", "ù", "'"].map(c => `<button class="acc" data-ins="${c}" tabindex="-1">${c}</button>`).join("")}</div>` : "";
  const ph = tr.wPlaceholder(tg.toUpperCase());
  $("#view").innerHTML = `<section class="page">
    <div class="meta"><span>${b === undefined ? tr.newWord : tr.box + " " + b + " " + dots(b)}</span><span>${tr.today}: ${S.session}</span></div>
    <div class="prompt short"><div class="tagrow">${tagHTML(w)}</div>${front}</div>
    <div class="writebox">
      <div class="inrow"><input id="wIn" class="answerIn ${r ? (r.ok ? "ok" : "bad") : ""}" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
        lang="${tg}" placeholder="${ph}" value="${esc(S.typed)}" ${r ? "readonly" : ""} aria-label="${ph}">
        ${r ? "" : `<button class="btn primary" id="wCheck">${tr.wCheck} <kbd>↵</kbd></button>`}</div>
      ${accents}${result}
      <div class="hint">${r ? tr.wNextHint(r.ok ? tr.got : tr.again) : tr.wHint}</div>
    </div>
    <div class="actions">
      <button class="btn bad ${r && !r.ok ? "suggest" : ""}" id="again" ${r ? "" : "disabled"}>${tr.again}</button>
      ${canSpeak ? `<button class="btn icon" id="say" aria-label="${tr.say}">${SPK}</button>` : "<span></span>"}
      <button class="btn good ${r && r.ok ? "suggest" : ""}" id="got" ${r ? "" : "disabled"}>${tr.got}</button>
    </div></section>`;
  const inp = $("#wIn");
  if (inp) { try { inp.focus({ preventScroll: true }); inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {} fitWriting(); }
}

export function check() {
  if (S.wres || !S.wcur) return;
  const r = checkAnswer(S.wcur, S.dir, S.typed);
  if (!r) { const i = $("#wIn"); if (i) i.focus(); return; }
  S.wres = r;
  speak(S.wcur.it, "it");
  app.render();
}

export function answer(ok) {
  if (!S.wres) return;
  bump(S.wcur, ok); S.session++; S.last = S.wcur.id;
  S.wcur = pickNext(); S.wres = null; S.typed = "";
  app.render();
}

// Accent buttons insert a character at the cursor
export function insert(ch) {
  const i = $("#wIn");
  if (!i || i.readOnly) return;
  const a = i.selectionStart ?? i.value.length, z = i.selectionEnd ?? a;
  i.value = i.value.slice(0, a) + ch + i.value.slice(z);
  S.typed = i.value;
  i.focus(); i.setSelectionRange(a + 1, a + 1);
}

// Enter: check, then accept the suggested button
export function onEnter(e) {
  e.preventDefault();
  S.wres ? answer(S.wres.ok) : check();
}
