// App state and saving to the browser (localStorage).
// Progress = S.boxes: { wordId: box 0..5 }. A word counts as "mastered" from box 3.

const KEY = "quaderno-italiano.v2";
const DIRS = ["it-pl", "pl-it", "it-en", "en-it"];

export const S = {
  lvls: [], mode: "cards", dir: "it-pl", ui: "pl", itVoice: "", pos: [], topics: [],
  my: false,                                          // true = working on the own word set instead of the levels
  fold: true,                                         // phones: levels/filters/direction folded behind the summary button
  boxes: {},
  dd: null,                                           // open filter drop-down: "pos" | "topics" | null
  myPage: false, myErr: null, myDel: false,           // own set page: shown, upload errors, delete confirmation
  // per-session, not saved
  cur: null, shown: false, session: 0, last: null,   // flashcards
  quiz: null,                                         // quiz
  wcur: null, wres: null, typed: "",                  // writing
  q: "", confirm: false, limit: 200,                  // word list
};

// render() lives in main.js; modes call app.render() to redraw.
export const app = { render: () => {} };

export function loadState(levels) {
  S.lvls = [levels[0]];
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "{}");
    const lv = Array.isArray(d.lvls) ? d.lvls.filter(l => levels.includes(l)) : levels.includes(d.lvl) ? [d.lvl] : [];   // before 1.4.0: one level in d.lvl
    if (lv.length) S.lvls = lv;
    if (d.mode) S.mode = d.mode;
    if (["pl", "en", "it"].includes(d.ui)) S.ui = d.ui;
    if (typeof d.itVoice === "string") S.itVoice = d.itVoice;
    if (d.dir) S.dir = { it: "it-pl", pl: "pl-it" }[d.dir] || d.dir;
    if (!DIRS.includes(S.dir)) S.dir = "it-pl";
    const nums = a => (Array.isArray(a) ? a.filter(n => Number.isInteger(n) && n >= 0) : []);
    S.pos = typeof d.pos === "number" ? (d.pos >= 0 ? [d.pos] : []) : nums(d.pos);   // before 1.4.0: one number, -1 = all
    S.topics = nums(d.topics);
    S.my = d.my === true;
    if (typeof d.fold === "boolean") S.fold = d.fold;
    if (d.boxes) S.boxes = d.boxes;
  } catch (e) {}
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      lvls: S.lvls, mode: S.mode, dir: S.dir, ui: S.ui, itVoice: S.itVoice, pos: S.pos, topics: S.topics, my: S.my, fold: S.fold, boxes: S.boxes,
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
