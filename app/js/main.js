// Entry point: loads words, draws the shared top bar, routes clicks/keys to the active mode.
import { S, app, save, box, loadState } from "./state.js";
import { T } from "./i18n.js";
import { WORDS, LEVELS, POS, loadWords, inLevel, pool } from "./data.js";
import { $, esc } from "./ui.js";
import { speak, renderVoice, initSpeech } from "./speech.js";
import { renderPwa, initPwa, install, applyUpdate, closeNews } from "./pwa.js";
import * as cards from "./modes/cards.js";
import * as quiz from "./modes/quiz.js";
import * as write from "./modes/write.js";
import * as list from "./modes/list.js";

const MODES = { cards, quiz, write, list };

function renderTop() {
  const tr = T();
  document.documentElement.lang = S.ui;
  $("#sub").textContent = tr.sub(WORDS.length, LEVELS.join(" · "));
  $("#uiSel").value = S.ui;
  $("#tabCards").textContent = tr.cards; $("#tabQuiz").textContent = tr.quiz;
  $("#tabWrite").textContent = tr.write; $("#tabList").textContent = tr.list;
  $("#dirLbl").textContent = tr.dir; $("#dirSel").value = S.dir;
  $("#pos").setAttribute("aria-label", tr.pos);
  document.querySelectorAll("#modes .tab").forEach(b => b.setAttribute("aria-selected", b.dataset.mode === S.mode));

  $("#levels").innerHTML = LEVELS.map(c => {
    const ws = WORDS.filter(w => w.lvl === c), learned = ws.filter(w => (box(w) || 0) >= 3).length;
    return `<button class="lvl" role="tab" data-lvl="${esc(c)}" aria-selected="${S.lvl === c}">
      <span class="code">${esc(c)}</span><span class="name">${esc(tr.lvl[c] || "")}</span>
      <span class="bar"><i style="width:${Math.round(learned / ws.length * 100)}%"></i></span>
      <span class="count">${learned}/${ws.length} ${tr.mastered}</span></button>`;
  }).join("");

  const lv = inLevel();
  $("#pos").innerHTML = `<button class="chip" data-pos="-1" aria-pressed="${S.pos < 0}">${tr.all} <small>${lv.length}</small></button>`
    + POS.map((p, i) => {
      const n = lv.filter(w => w.p === i).length;
      return n ? `<button class="chip" data-pos="${i}" aria-pressed="${S.pos === i}" title="${esc(p.filter((_, k) => k !== tr.posIdx).join(" · "))}">${esc(p[tr.posIdx])} <small>${n}</small></button>` : "";
    }).join("");
}

function render() {
  renderTop(); renderVoice(); renderPwa();
  (MODES[S.mode] || cards).render();
}
app.render = render;

// The word currently on screen (for the big speaker button)
function currentWord() {
  if (S.mode === "quiz") return { w: quiz.current(), dir: S.quiz && S.quiz.dir };
  return { w: S.mode === "write" ? S.wcur : S.cur, dir: S.dir };
}

document.addEventListener("click", e => {
  const t = e.target.closest("button,#prompt");
  if (!t) return;
  const d = t.dataset;
  if (d.lvl) { S.lvl = d.lvl; S.cur = null; S.confirm = false; S.limit = 200; if (!pool().length) S.pos = -1; save(); render(); return; }
  if (d.mode) { S.mode = d.mode; S.confirm = false; save(); render(); return; }
  if (d.pos !== undefined) { S.pos = +d.pos; S.cur = null; S.limit = 200; save(); render(); return; }
  if (d.opt) { quiz.pickOpt(d.opt); return; }
  if (d.ins) { write.insert(d.ins); return; }
  if (d.say) { speak(d.say, d.lang || "it"); return; }
  switch (t.id) {
    case "prompt": cards.reveal(); break;
    case "again": S.mode === "write" ? write.answer(false) : cards.answer(false); break;
    case "got": S.mode === "write" ? write.answer(true) : cards.answer(true); break;
    case "say": { const { w, dir } = currentWord(); if (w) { const src = dir.slice(0, 2); speak(src === "it" ? w.it : w[src], src); } break; }
    case "wCheck": write.check(); break;
    case "startQuiz": quiz.newQuiz(); render(); break;
    case "next": quiz.next(); break;
    case "more": list.more(); break;
    case "reset": list.askReset(true); break;
    case "resetNo": list.askReset(false); break;
    case "resetYes": list.resetLevel(); break;
    case "installBtn": install(); break;
    case "updBtn": applyUpdate(); break;
    case "newsClose": closeNews(); break;
  }
});

document.addEventListener("change", e => {
  const id = e.target.id, v = e.target.value;
  if (id === "voiceSel") { S.itVoice = v; save(); speak("Buongiorno, come stai?", "it"); }
  else if (id === "uiSel") { S.ui = v; save(); render(); }
  else if (id === "dirSel") { S.dir = v; S.shown = false; S.cur = null; S.wcur = null; save(); render(); }
});

document.addEventListener("input", e => {
  if (e.target.id === "wIn") S.typed = e.target.value;
  else if (e.target.id === "q") list.search(e.target.value);
});

document.addEventListener("keydown", e => {
  const tag = e.target.tagName;
  if (S.mode === "write" && e.key === "Enter" && !e.isComposing
      && (e.target.id === "wIn" || tag !== "INPUT") && !(tag === "BUTTON" && e.target.id !== "wCheck")) { write.onEnter(e); return; }
  if (tag === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
  if (S.mode === "cards") cards.onKey(e);
  else if (S.mode === "quiz") quiz.onKey(e);
});

(async function start() {
  try { await loadWords(); }
  catch (e) { $("#view").innerHTML = `<section class="page"><p class="hint">Nie udało się wczytać listy słów (data/words.json).</p></section>`; return; }
  loadState(LEVELS);
  initSpeech();
  render();
  initPwa();
})();
