// Entry point: loads words, draws the shared top bar, routes clicks/keys to the active mode.
import { S, app, save, box, loadState } from "./state.js";
import { T } from "./i18n.js";
import { WORDS, LEVELS, POS, TOPICS, MY, topicName, loadWords, filtered, inLevel, L, hasTopics, hasLang, fixDir, pool } from "./data.js";
import { $, esc, lvlLabel, fitWriting, dropdown, insertChar } from "./ui.js";
import { speak, renderVoice, initSpeech } from "./speech.js";
import { renderPwa, initPwa, install, applyUpdate, closeNews } from "./pwa.js";
import { loadVerbs } from "./verbs.js";
import * as cards from "./modes/cards.js";
import * as quiz from "./modes/quiz.js";
import * as write from "./modes/write.js";
import * as conj from "./modes/conj.js";
import * as list from "./modes/list.js";
import * as myset from "./myset.js";

const MODES = { cards, quiz, write, conj, list };

function renderTop() {
  const tr = T();
  document.documentElement.lang = S.ui;
  $("#sub").textContent = tr.sub(WORDS.length, LEVELS.join(" · "));
  $("#uiSel").value = S.ui;
  $("#tabCards").textContent = tr.cards; $("#tabQuiz").textContent = tr.quiz;
  $("#tabWrite").textContent = tr.write; $("#tabConj").textContent = tr.conj; $("#tabList").textContent = tr.list;
  $("#dirLbl").textContent = tr.dir;
  for (const o of $("#dirSel").options) o.disabled = o.hidden = !hasLang(o.value.includes("en") ? "en" : "pl");   // own set: only its languages
  $("#dirSel").value = S.dir;
  $("#pos").setAttribute("aria-label", tr.pos);
  document.querySelectorAll("#modes .tab").forEach(b => b.setAttribute("aria-selected", !S.myPage && b.dataset.mode === S.mode));

  // Levels are independent toggles: any combination, at least one stays on. The own set is the last tile and works alone.
  const tile = (attrs, code, name, ws) => {
    const learned = ws.filter(w => (box(w) || 0) >= 3).length;
    return `<button class="lvl" ${attrs}><span class="code">${esc(code)}</span><span class="name">${esc(name)}</span>
      <span class="bar"><i style="width:${Math.round(learned / ws.length * 100)}%"></i></span>
      <span class="count">${learned}/${ws.length} ${tr.mastered}</span></button>`;
  };
  $("#levels").innerHTML = LEVELS.map(c => tile(`data-lvl="${esc(c)}" aria-pressed="${!S.my && S.lvls.includes(c)}"`, c, tr.lvl[c] || "", WORDS.filter(w => w.lvl === c))).join("")
    + (MY.words.length ? tile(`data-my="on" aria-pressed="${S.my}" title="${esc(MY.name)}"`, tr.myCode, MY.name, MY.words)
      : `<button class="lvl add" data-my="page" aria-pressed="${S.myPage}"><span class="code" aria-hidden="true">+</span><span class="name">${tr.mySet}</span><span class="count">${tr.myAdd}</span></button>`);

  // Phones: one-line summary of the folded scope, e.g. "A1 + A2 · IT → PL · czasownik"
  const pick = (sel, name) => (!sel.length ? "" : sel.length === 1 ? name(sel[0]) : tr.nSel(sel.length));
  const verbsOnly = S.mode === "conj" && !S.myPage;                       // Conjugation: part of speech is always "verb"
  $("#scopeLbl").textContent = tr.scope;
  $("#scopeSum").textContent = [lvlLabel(), S.dir.toUpperCase().replace("-", " → "), verbsOnly ? "" : pick(S.pos, i => POS[i][tr.posIdx]),
    hasTopics() ? pick(S.topics, i => topicName(i, tr.posIdx)) : ""].filter(Boolean).join(" · ");
  $("#scopeBtn").setAttribute("aria-expanded", !S.fold);
  $("#scope").dataset.fold = S.fold;

  // Counts in each drop-down respect the other filter, e.g. "verbs" under the topic Food
  const byPos = filtered("pos"), byTopic = verbsOnly ? inLevel().filter(w => w.p === 1 && w[L()]) : filtered("topics");
  $("#pos").innerHTML = (verbsOnly ? "" : dropdown("pos", tr.pos, byPos.length, POS.map((p, i) => ({ i, name: p[tr.posIdx], n: byPos.filter(w => w.p === i).length }))))
    + (hasTopics() ? dropdown("topics", tr.topic, byTopic.length, TOPICS.map((_, i) => ({ i, name: topicName(i, tr.posIdx), n: byTopic.filter(w => w.t.includes(i)).length }))) : "");
}

function toggleFilter(kind, i) {
  S[kind] = i < 0 ? [] : S[kind].includes(i) ? S[kind].filter(x => x !== i) : [...S[kind], i].sort((a, b) => a - b);
  S.cur = null; S.cj = null; S.limit = 200; save(); render();
  const el = document.querySelector(`[data-f="${kind}"][data-i="${i}"]`); if (el) el.focus();
}

function render() {
  renderTop(); renderVoice(); renderPwa();
  (S.myPage ? myset : MODES[S.mode] || cards).render();
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
    S.myPage = false;
    if (S.my) { S.my = false; S.lvls = [d.lvl]; S.wcur = null; }          // leaving the own set: start from the tapped level
    else {
      const on = S.lvls.includes(d.lvl);
      if (on && S.lvls.length === 1) { render(); return; }               // keep at least one level
      S.lvls = on ? S.lvls.filter(l => l !== d.lvl) : LEVELS.filter(l => l === d.lvl || S.lvls.includes(l));
    }
    S.cur = null; S.cj = null; S.confirm = false; S.limit = 200; if (!pool().length) { S.pos = []; S.topics = []; }
    save(); render(); return;
  }
  if (d.conj) { S.vopen = S.vopen === d.conj ? null : d.conj; render(); return; }   // verb → its conjugation (Flashcards, Writing, List)
  if (d.vreg) { conj.setOption("vreg", d.vreg); return; }
  if (d.cjm) { conj.setOption("cjm", d.cjm); return; }
  if (d.my === "on") { if (S.my && !S.myPage) { S.myPage = true; render(); } else { S.myPage = false; myset.use(); } return; }   // tapping the active set opens its page
  if (d.my === "page") { S.myPage = !S.myPage || !!MY.words.length; S.myErr = null; S.myDel = false; render(); return; }
  if (d.mode) { S.mode = d.mode; S.myPage = false; S.confirm = false; S.vopen = null; save(); render(); return; }
  if (d.opt) { quiz.pickOpt(d.opt); return; }
  if (d.ins) { insertChar(d.ins); return; }
  if (d.say) { speak(d.say, d.lang || "it"); return; }
  switch (t.id) {
    case "prompt": cards.reveal(); break;
    case "again": S.mode === "write" ? write.answer(false) : cards.answer(false); break;
    case "got": S.mode === "write" ? write.answer(true) : cards.answer(true); break;
    case "say": { const { w, dir } = currentWord(); if (w) { const src = dir.slice(0, 2); speak(src === "it" ? w.it : w[src], src); } break; }
    case "wCheck": write.check(); break;
    case "cCheck": conj.check(); break;
    case "cNext": conj.next(); break;
    case "startQuiz": quiz.newQuiz(); render(); break;
    case "next": quiz.next(); break;
    case "more": list.more(); break;
    case "reset": list.askReset(true); break;
    case "resetNo": list.askReset(false); break;
    case "resetYes": list.resetLevel(); break;
    case "installBtn": install(); break;
    case "updBtn": applyUpdate(); break;
    case "newsClose": closeNews(); break;
    case "scopeBtn": S.fold = !S.fold; save(); render(); break;
    case "myTpl": myset.downloadTemplate(); break;
    case "myPick": $("#myFile").click(); break;
    case "myUse": S.myPage = false; myset.use(); break;
    case "myClose": S.myPage = false; S.myErr = null; S.myDel = false; render(); break;
    case "myDel": S.myDel = true; render(); break;
    case "myDelNo": S.myDel = false; render(); break;
    case "myDelYes": myset.remove(); break;
  }
});

document.addEventListener("change", e => {
  const id = e.target.id, v = e.target.value;
  if (id === "voiceSel") { S.itVoice = v; save(); speak("Buongiorno, come stai?", "it"); }
  else if (id === "uiSel") { S.ui = v; save(); render(); }
  else if (id === "dirSel") { S.dir = v; S.shown = false; S.cur = null; S.wcur = null; save(); render(); }
  else if (id === "myFile") { const f = e.target.files[0]; e.target.value = ""; if (f) myset.upload(f); }
});

// Writing/Conjugation: after checking, the answer box stays focused (keyboard open) but locked – typing is undone
document.addEventListener("beforeinput", e => {
  if ((e.target.id === "wIn" && S.wres) || (/^cIn/.test(e.target.id) && S.cj && S.cj.res)) e.preventDefault();
});
// Tapping a button must not take focus from the answer box, or the phone keyboard closes
document.addEventListener("mousedown", e => {
  const a = document.activeElement;
  if ((S.mode === "write" || S.mode === "conj") && !S.myPage && a && a.classList.contains("answerIn") && e.target.closest("#view button")) e.preventDefault();
});
document.addEventListener("focusin", e => { if (e.target.dataset && e.target.dataset.p !== undefined && /^cIn/.test(e.target.id)) S.cjFocus = +e.target.dataset.p; });

document.addEventListener("input", e => {
  if (e.target.id === "wIn") { if (S.wres) e.target.value = S.typed; else S.typed = e.target.value; }
  else if (/^cIn/.test(e.target.id)) conj.input(e.target);
  else if (e.target.id === "q") list.search(e.target.value);
});

document.addEventListener("keydown", e => {
  if (S.dd && e.key === "Escape") { const k = S.dd; S.dd = null; render(); document.querySelector(`[data-dd="${k}"]`).focus(); return; }
  if (e.target.closest(".dd") || S.myPage) return;                       // Space/Enter there toggle the filter, not the card
  const tag = e.target.tagName;
  if (S.mode === "write" && e.key === "Enter" && !e.isComposing
      && (e.target.id === "wIn" || tag !== "INPUT") && !(tag === "BUTTON" && e.target.id !== "wCheck")) { write.onEnter(e); return; }
  if (S.mode === "conj" && e.key === "Enter" && !e.isComposing
      && (/^cIn/.test(e.target.id) || tag !== "INPUT") && !(tag === "BUTTON" && !/^c(Check|Next)$/.test(e.target.id))) { conj.onEnter(e); return; }
  if (tag === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
  if (S.mode === "cards") cards.onKey(e);
  else if (S.mode === "quiz") quiz.onKey(e);
});

fitWriting();
(window.visualViewport || window).addEventListener("resize", fitWriting);

(async function start() {
  try { await loadWords(); }
  catch (e) { $("#view").innerHTML = `<section class="page"><p class="hint">Nie udało się wczytać listy słów (data/words.json).</p></section>`; return; }
  myset.loadMy();
  loadState(LEVELS);
  if (!MY.words.length) S.my = false;
  fixDir();
  initSpeech();
  render();
  initPwa();
  loadVerbs().then(ok => { if (ok) render(); });                          // conjugation tables: verb links, List, Conjugation
})();
