// Entry point: loads words, draws the shared top bar, routes clicks/keys to the active mode.
import { S, app, save, box, loadState } from "./state.js";
import { T } from "./i18n.js";
import { WORDS, LEVELS, POS, TOPICS, topicName, loadWords, filtered, hasTopics, pool } from "./data.js";
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

  // Levels are independent toggles: any combination, at least one stays on
  $("#levels").innerHTML = LEVELS.map(c => {
    const ws = WORDS.filter(w => w.lvl === c), learned = ws.filter(w => (box(w) || 0) >= 3).length;
    return `<button class="lvl" data-lvl="${esc(c)}" aria-pressed="${S.lvls.includes(c)}">
      <span class="code">${esc(c)}</span><span class="name">${esc(tr.lvl[c] || "")}</span>
      <span class="bar"><i style="width:${Math.round(learned / ws.length * 100)}%"></i></span>
      <span class="count">${learned}/${ws.length} ${tr.mastered}</span></button>`;
  }).join("");

  // Counts in each drop-down respect the other filter, e.g. "verbs" under the topic Food
  const byPos = filtered("pos"), byTopic = filtered("topics");
  $("#pos").innerHTML = dropdown("pos", tr.pos, byPos.length, POS.map((p, i) => ({ i, name: p[tr.posIdx], n: byPos.filter(w => w.p === i).length })))
    + (hasTopics() ? dropdown("topics", tr.topic, byTopic.length, TOPICS.map((_, i) => ({ i, name: topicName(i, tr.posIdx), n: byTopic.filter(w => w.t.includes(i)).length }))) : "");
}

// Multi-select filter: a button showing the selection and, when open, a list of check boxes
function dropdown(kind, label, total, opts) {
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

function toggleFilter(kind, i) {
  S[kind] = i < 0 ? [] : S[kind].includes(i) ? S[kind].filter(x => x !== i) : [...S[kind], i].sort((a, b) => a - b);
  S.cur = null; S.limit = 200; save(); render();
  const el = document.querySelector(`[data-f="${kind}"][data-i="${i}"]`); if (el) el.focus();
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
  if (S.dd && !e.target.closest(".dd")) { S.dd = null; render(); }      // click outside closes the open filter
  if (!t) return;
  const d = t.dataset;
  if (d.dd) { S.dd = S.dd === d.dd ? null : d.dd; render(); const b = document.querySelector(`[data-dd="${d.dd}"]`); if (b) b.focus(); return; }
  if (d.f) { toggleFilter(d.f, +d.i); return; }
  if (d.lvl) {
    const on = S.lvls.includes(d.lvl);
    if (on && S.lvls.length === 1) return;                               // keep at least one level
    S.lvls = on ? S.lvls.filter(l => l !== d.lvl) : LEVELS.filter(l => l === d.lvl || S.lvls.includes(l));
    S.cur = null; S.confirm = false; S.limit = 200; if (!pool().length) { S.pos = []; S.topics = []; }
    save(); render(); return;
  }
  if (d.mode) { S.mode = d.mode; S.confirm = false; save(); render(); return; }
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
  if (S.dd && e.key === "Escape") { const k = S.dd; S.dd = null; render(); document.querySelector(`[data-dd="${k}"]`).focus(); return; }
  if (e.target.closest(".dd")) return;                                   // Space/Enter there toggle the filter, not the card
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
