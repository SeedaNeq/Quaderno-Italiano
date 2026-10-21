// Mode: Flashcards (Fiszki). Reveal the answer, then "Again" or "Got it".
import { S, app, box, bump } from "../state.js";
import { T } from "../i18n.js";
import { pool, pickNext, SRC, L, OTHER, LBL } from "../data.js";
import { $, esc, itHTML, dots, tagHTML, empty, exampleHTML, SPK } from "../ui.js";
import { speak, mini, canSpeak } from "../speech.js";

export function render() {
  if (!S.cur || !pool().some(w => w.id === S.cur.id)) { S.cur = pickNext(); S.shown = false; }
  const w = S.cur, tr = T();
  if (!w) { $("#view").innerHTML = empty(); return; }
  const b = box(w), fromIt = SRC() === "it", o = OTHER();
  const front = fromIt ? `<div class="word">${itHTML(w.it)}</div>` : `<div class="word pl">${esc(w[L()])}</div>`;
  const back = `<div class="main ${fromIt ? "" : "it"}">${fromIt ? esc(w[L()]) : itHTML(w.it)} ${fromIt ? mini(w[L()], L()) : mini(w.it, "it")}</div>`
    + (w[o] ? `<div class="en"><b>${LBL[o]}</b>${esc(w[o])} ${mini(w[o], o)}</div>` : "")
    + exampleHTML(w, L());
  $("#view").innerHTML = `<section class="page">
    <div class="meta"><span>${b === undefined ? tr.newWord : tr.box + " " + b + " " + dots(b)}</span><span>${tr.today}: ${S.session}</span></div>
    <div class="prompt" id="prompt" tabindex="0" role="button" aria-label="${tr.reveal}">
      <div class="tagrow">${tagHTML(w)}</div>
      ${front}
      ${S.shown ? `<div class="answer">${back}</div>` : `<div class="hint">${tr.hint}</div>`}
    </div>
    <div class="actions">
      <button class="btn bad" id="again" ${S.shown ? "" : "disabled"}>${tr.again} <kbd>1</kbd></button>
      ${canSpeak ? `<button class="btn icon" id="say" aria-label="${tr.say}">${SPK}</button>` : "<span></span>"}
      <button class="btn good" id="got" ${S.shown ? "" : "disabled"}>${tr.got} <kbd>2</kbd></button>
    </div></section>`;
}

export function reveal() {
  if (S.mode !== "cards" || S.shown || !S.cur) return;
  S.shown = true;
  if (SRC() !== "it") speak(S.cur.it);
  app.render();
}

export function answer(ok) {
  if (!S.shown) return;
  bump(S.cur, ok); S.session++; S.last = S.cur.id;
  S.cur = pickNext(); S.shown = false;
  app.render();
}

export function onKey(e) {
  if ((e.key === " " || e.key === "Enter") && !S.shown) { e.preventDefault(); reveal(); }
  else if (e.key === "1") answer(false);
  else if (e.key === "2") answer(true);
}
