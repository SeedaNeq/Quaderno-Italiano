// App state and saving to the browser (localStorage).
// Progress = S.boxes: { wordId: box 0..5 }. A word counts as "mastered" from box 3.

const KEY = "quaderno-italiano.v2";
const DIRS = ["it-pl", "pl-it", "it-en", "en-it"];

export const S = {
  lvl: null, mode: "cards", dir: "it-pl", ui: "pl", itVoice: "", pos: -1,
  boxes: {},
  // per-session, not saved
  cur: null, shown: false, session: 0, last: null,   // flashcards
  quiz: null,                                         // quiz
  wcur: null, wres: null, typed: "",                  // writing
  q: "", confirm: false, limit: 200,                  // word list
};

// render() lives in main.js; modes call app.render() to redraw.
export const app = { render: () => {} };

export function loadState(levels) {
  S.lvl = levels[0];
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (levels.includes(d.lvl)) S.lvl = d.lvl;
    if (d.mode) S.mode = d.mode;
    if (["pl", "en", "it"].includes(d.ui)) S.ui = d.ui;
    if (typeof d.itVoice === "string") S.itVoice = d.itVoice;
    if (d.dir) S.dir = { it: "it-pl", pl: "pl-it" }[d.dir] || d.dir;
    if (!DIRS.includes(S.dir)) S.dir = "it-pl";
    if (typeof d.pos === "number") S.pos = d.pos;
    if (d.boxes) S.boxes = d.boxes;
  } catch (e) {}
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      lvl: S.lvl, mode: S.mode, dir: S.dir, ui: S.ui, itVoice: S.itVoice, pos: S.pos, boxes: S.boxes,
    }));
  } catch (e) {}
}

export const box = w => S.boxes[w.id];

// Leitner boxes: correct = one box up (max 5), wrong = back to 0.
export function bump(w, ok) {
  const b = box(w) || 0;
  S.boxes[w.id] = ok ? Math.min(5, b + 1) : 0;
  save();
}
