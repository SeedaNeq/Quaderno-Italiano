// Mode: Word list (Lista słów). Search, progress per word, reset progress for a level.
import { S, app, box, save } from "../state.js";
import { T } from "../i18n.js";
import { pool, inLevel, hasLang } from "../data.js";
import { $, esc, itHTML, dots, tagHTML, lvlLabel, SPK } from "../ui.js";
import { mini, canSpeak } from "../speech.js";

export function render() {
  const ws = pool(), term = S.q.trim().toLowerCase(), tr = T();
  const rows = ws.filter(w => !term || w.it.toLowerCase().includes(term) || w.pl.toLowerCase().includes(term) || w.en.toLowerCase().includes(term));
  const learned = ws.filter(w => (box(w) || 0) >= 3).length, seen = ws.filter(w => box(w) !== undefined).length;
  const shown = rows.slice(0, S.limit);
  const hadFocus = document.activeElement && document.activeElement.id === "q";
  const pl = hasLang("pl"), en = hasLang("en"), enCls = pl ? "col-en" : "";       // own set may lack one language; never hide the only one
  const body = shown.map(w => `<tr><td class="it">${itHTML(w.it)}</td>${pl ? `<td>${esc(w.pl)} ${mini(w.pl, "pl")}</td>` : ""}${en ? `<td class="en ${enCls}">${esc(w.en)} ${mini(w.en, "en")}</td>` : ""}<td>${tagHTML(w)}</td><td>${dots(box(w))}</td>${canSpeak ? `<td><button class="sp" data-say="${esc(w.it)}" aria-label="${tr.say}: ${esc(w.it)}">${SPK}</button></td>` : ""}</tr>`).join("")
    || `<tr><td colspan="6" class="hint">${tr.none(esc(S.q))}</td></tr>`;
  $("#view").innerHTML = `<section class="page stack">
    <div class="meta"><span>${esc(lvlLabel())} · ${ws.length} ${tr.words}</span><span>${tr.stats(learned, seen - learned, ws.length - seen)}</span></div>
    <input class="search" id="q" type="search" placeholder="${tr.search}" value="${esc(S.q)}" aria-label="${tr.search}">
    <div class="tablewrap"><table><thead><tr><th>Italiano</th>${pl ? "<th>Polski</th>" : ""}${en ? `<th class="${enCls}">English</th>` : ""}<th>${tr.thType}</th><th>${tr.thMem}</th>${canSpeak ? "<th></th>" : ""}</tr></thead><tbody>${body}</tbody></table></div>
    ${rows.length > shown.length ? `<button class="btn more" id="more">${tr.more(rows.length - shown.length)}</button>` : ""}
    <div>${S.confirm
      ? `<div class="confirm">${tr.resetQ(esc(lvlLabel()))} <button class="btn bad" id="resetYes">${tr.resetYes}</button><button class="btn" id="resetNo">${tr.cancel}</button></div>`
      : `<button class="linkbtn" id="reset">${tr.reset(esc(lvlLabel()))}</button>`}
      ${S.my ? `<button class="linkbtn" data-my="page" style="margin-left:16px">${tr.myManage}</button>` : ""}</div>
  </section>`;
  if (hadFocus) { const i = $("#q"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

export function search(v) { S.q = v; S.limit = 200; render(); }
export function more() { S.limit += 300; app.render(); }
export function askReset(on) { S.confirm = on; app.render(); }
export function resetLevel() {
  inLevel().forEach(w => delete S.boxes[w.id]);
  S.confirm = false; S.cur = null;
  save(); app.render();
}
