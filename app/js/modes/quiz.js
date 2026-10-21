// Mode: Quiz. 10 questions, 4 options; distractors come from the same part of speech.
import { S, app, bump } from "../state.js";
import { T } from "../i18n.js";
import { WORDS, POS, pool, inLevel, shuffle } from "../data.js";
import { $, esc, itHTML, tagHTML, empty, exampleHTML, lvlLabel, SPK } from "../ui.js";
import { speak, canSpeak } from "../speech.js";

const answerText = (w, dir) => (dir.slice(3) === "it" ? w.it : w[dir.slice(3)]);
const quizKey = () => [S.my ? "+" : S.lvls.join(), S.pos.join(), S.topics.join(), S.dir].join("|");
const active = () => S.quiz && S.quiz.key === quizKey() && S.quiz.i < S.quiz.qs.length;

export function newQuiz() {
  const ws = pool(), lv = inLevel(), dir = S.dir;
  const qs = shuffle(ws).slice(0, 10).map(w => {
    const used = new Set([answerText(w, dir)]), opts = [w];
    for (const src of [shuffle(lv.filter(x => x.p === w.p)), shuffle(WORDS.filter(x => x.p === w.p)), shuffle(WORDS)])
      for (const x of src) {
        if (opts.length >= 4) break;
        const a = answerText(x, dir);
        if (a && !used.has(a)) { used.add(a); opts.push(x); }
      }
    return { w, opts: shuffle(opts), pick: null };
  });
  S.quiz = { qs, i: 0, key: quizKey(), dir };
}

export function render() {
  const Q = S.quiz, n = Math.min(10, pool().length), tr = T();
  if (!n) { $("#view").innerHTML = empty(); return; }

  if (!Q || Q.key !== quizKey()) {                       // start screen
    $("#view").innerHTML = `<section class="page stack"><div class="meta"><span>${tr.quiz} · ${esc(lvlLabel())}${S.pos.length === 1 ? " · " + esc(POS[S.pos[0]][tr.posIdx]) : ""}</span><span>${tr.qn(n)}</span></div>
      <div class="word" style="font-size:2.2rem">Mettiti alla prova.</div>
      <p class="hint" style="margin:0">${tr.qIntro}</p>
      <div class="row"><button class="btn primary" id="startQuiz">${tr.start}</button></div></section>`;
    return;
  }

  if (Q.i >= Q.qs.length) {                              // results
    const right = Q.qs.filter(q => q.pick === q.w.id).length, miss = Q.qs.filter(q => q.pick !== q.w.id), pct = right / Q.qs.length;
    const verdict = pct >= .9 ? "Perfetto!" : pct >= .7 ? "Molto bene!" : pct >= .5 ? "Non male." : "Coraggio, riprova.";
    $("#view").innerHTML = `<section class="page stack"><div class="meta"><span>${tr.quiz} · ${esc(lvlLabel())}</span><span>${tr.end}</span></div>
      <div><div class="score">${right}<small> / ${Q.qs.length}</small></div><div class="hint" style="font-size:1.05rem;margin-top:4px">${verdict}</div></div>
      ${miss.length ? `<div><div class="meta" style="margin-bottom:6px"><span>${tr.review}</span></div><ul class="misslist">${miss.map(q => `<li><b>${itHTML(q.w.it)}</b><span>${esc(Q.dir.includes("en") ? q.w.en : q.w.pl)}</span></li>`).join("")}</ul></div>` : ""}
      <div class="row"><button class="btn primary" id="startQuiz">${tr.newQuiz}</button></div></section>`;
    return;
  }

  const q = Q.qs[Q.i], fromIt = Q.dir.slice(0, 2) === "it", lq = Q.dir.includes("en") ? "en" : "pl", done = q.pick !== null;
  const opts = q.opts.map((o, k) => {
    let c = "";
    if (done) { if (o.id === q.w.id) c = "right"; else if (o.id === q.pick) c = "wrong"; }
    return `<button class="opt ${c}" data-opt="${esc(o.id)}" ${done ? "disabled" : ""}><kbd>${k + 1}</kbd><span>${fromIt ? esc(o[lq]) : itHTML(o.it)}</span></button>`;
  }).join("");
  $("#view").innerHTML = `<section class="page"><div class="meta"><span>${tr.qOf(Q.i + 1, Q.qs.length)}</span><span>${tr.right}: ${Q.qs.slice(0, Q.i + (done ? 1 : 0)).filter(x => x.pick === x.w.id).length}</span></div>
    <div class="prompt short"><div class="tagrow">${tagHTML(q.w)}</div>
      ${fromIt ? `<div class="word">${itHTML(q.w.it)}</div>` : `<div class="word pl">${esc(q.w[lq])}</div>`}
      ${done ? exampleHTML(q.w, lq) : ""}</div>
    <div class="opts">${opts}</div>
    <div class="actions" style="margin-top:14px">${canSpeak ? `<button class="btn icon" id="say" aria-label="${tr.say}">${SPK}</button>` : "<span></span>"}<span></span>
      <button class="btn primary" id="next" ${done ? "" : "disabled"}>${Q.i === Q.qs.length - 1 ? tr.result : tr.next} <kbd>↵</kbd></button></div></section>`;
}

export function pickOpt(id) {
  const q = S.quiz.qs[S.quiz.i];
  if (q.pick !== null) return;
  q.pick = id;
  bump(q.w, id === q.w.id);
  speak(q.w.it);
  app.render();
}

export function next() { S.quiz.i++; app.render(); }
export const current = () => S.quiz && S.quiz.qs[S.quiz.i] && S.quiz.qs[S.quiz.i].w;

export function onKey(e) {
  if (!active()) return;
  const q = S.quiz.qs[S.quiz.i];
  if (/^[1-4]$/.test(e.key) && q.pick === null && q.opts[+e.key - 1]) pickOpt(q.opts[+e.key - 1].id);
  else if (e.key === "Enter" && q.pick !== null) { e.preventDefault(); next(); }
}
