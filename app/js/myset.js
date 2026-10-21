// Own word set (Własny zestaw): the user's words from an .xlsx/.csv file. One set at a time, kept only in this browser.
// Columns in any order, header names in PL/EN/IT (as in the template): Italian · Polish · English · Part of speech · Gender.
//  - required: Italian, Polish or English (or both), part of speech (name in any of the three languages);
//  - gender m/f only for nouns, may be empty when the article shows it (il/lo/i/gli/un/uno → m, la/le/una/un' → f);
//  - only languages present in the set are offered as directions; words without that language are skipped.
// Progress stays in S.boxes under ids starting with "+|" (see setMy in data.js).
import { S, app, save } from "./state.js";
import { T } from "./i18n.js";
import { MY, POS, POS_KEYS, setMy, fixDir, pool } from "./data.js";
import { $, esc } from "./ui.js";
import { readSheet, writeXlsx } from "./sheet.js";

const KEY = "quaderno-italiano.myset";
const key = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-z]/g, "");
const clean = s => String(s == null ? "" : s).replace(/\s+/g, " ").trim();

// Header names accepted for each column (normalised with key())
const HEAD = { it: ["wloski", "italian", "italiano"], pl: ["polski", "polish", "polacco"], en: ["angielski", "english", "inglese"],
  pos: ["czescmowy", "partofspeech", "partedeldiscorso", "typ", "type", "tipo", "pos"], g: ["rodzaj", "gender", "genere"] };
const POS_IDX = new Map(POS.flatMap((names, i) => [...names, POS_KEYS[i]].map(n => [key(n), i])));
const genderOf = v => { const k = key(v); return /^m/.test(k) ? "m" : /^[fz]/.test(k) ? "f" : null; };   // m, maschile, męski / f, femminile, żeński
const genderFromArticle = it => (/^(il|lo|i|gli|un|uno) /i.test(it) ? "m" : /^(la|le|una) |^un'/i.test(it) ? "f" : "");

export function loadMy() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || "null"); if (d && Array.isArray(d.words)) setMy(d.name || "", d.words); } catch (e) {}
}

// Rows from the file → { words, errors } – errors is a list of row errors, or one string when the whole file is wrong.
// Row numbers in errors are the spreadsheet's own.
export function parseRows(rows) {
  const tr = T(), h = tr.tplHead;
  const hi = rows.findIndex(r => r.some(c => clean(c)));
  const col = {};
  if (hi >= 0) rows[hi].forEach((c, i) => {
    const k = key(c), name = Object.keys(HEAD).find(n => HEAD[n].includes(k));
    if (name && col[name] === undefined) col[name] = i;
  });
  const missing = [col.it === undefined && h[0], col.pl === undefined && col.en === undefined && `${h[1]} / ${h[2]}`, col.pos === undefined && h[3]].filter(Boolean);
  if (missing.length) return { words: [], errors: tr.errCols(missing.join(", ")) };

  const words = [], errors = [], seen = new Map();
  rows.forEach((r, i) => {
    if (i <= hi) return;
    const get = name => (col[name] === undefined ? "" : clean(r[col[name]]));
    const it = get("it").replace(/[’‘`´]/g, "'"), pl = get("pl"), en = get("en"), pv = get("pos"), gv = get("g");
    if (!it && !pl && !en && !pv && !gv) return;                    // empty row
    const bad = [], p = POS_IDX.get(key(pv));
    if (!it) bad.push(tr.errIt);
    if (!pl && !en) bad.push(tr.errTr);
    if (!pv) bad.push(tr.errPos0); else if (p === undefined) bad.push(tr.errPos(pv));
    let g = "";
    if (p === 0) {
      g = gv ? genderOf(gv) : genderFromArticle(it);
      if (gv && !g) bad.push(tr.errGv(gv)); else if (!g && it) bad.push(tr.errG);
    }
    const id = it + "|" + p + "|" + g;
    if (!bad.length && seen.has(id)) bad.push(tr.errDup(seen.get(id)));
    if (bad.length) { errors.push(tr.errRow(i + 1, bad.join("; "))); return; }
    seen.set(id, i + 1);
    words.push({ it, pl, en, p, g });
  });
  return { words, errors: !words.length && !errors.length ? tr.errNone : errors };
}

export async function upload(file) {
  const tr = T();
  S.myErr = null; S.myDel = false;
  let res;
  try { res = file.size > 5e6 ? null : parseRows(await readSheet(file)); } catch (e) { res = null; }
  if (!res) { S.myErr = tr.errFile; app.render(); return; }
  if (res.errors.length) { S.myErr = res.errors; app.render(); return; }
  const name = file.name.replace(/\.[^.]+$/, "");
  try { localStorage.setItem(KEY, JSON.stringify({ name, words: res.words })); } catch (e) { S.myErr = tr.errSave; app.render(); return; }
  setMy(name, res.words);
  const ids = new Set(MY.words.map(w => w.id));                     // progress stays for words kept in the new file
  for (const id of Object.keys(S.boxes)) if (id.startsWith("+|") && !ids.has(id)) delete S.boxes[id];
  S.myPage = false;
  use();
}

// Switch to the own set (levels off)
export function use() {
  S.my = true; S.confirm = false; S.limit = 200; S.cur = null; S.wcur = null; S.quiz = null;
  fixDir();
  if (!pool().length) S.pos = [];
  save(); app.render();
}

export function remove() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  for (const id of Object.keys(S.boxes)) if (id.startsWith("+|")) delete S.boxes[id];
  setMy("", []);
  S.my = false; S.myDel = false; S.myErr = null; S.cur = null; S.wcur = null; S.quiz = null;
  save(); app.render();
}

export function downloadTemplate() {
  const tr = T(), posNames = POS.map(p => p[tr.posIdx]), ex = tr.tplEx.map(r => [r[0], r[1], r[2], posNames[r[3]], r[4]]);
  const blob = writeXlsx([
    { name: tr.tplSheet, head: true, rows: [tr.tplHead], widths: [26, 26, 26, 18, 10],
      lists: [{ col: "D", values: posNames }, { col: "E", values: ["m", "f"] }] },
    { name: tr.tplHelpSheet, widths: [26, 26, 26, 18, 10],
      rows: [...tr.tplHelp.map(l => [l]), [], tr.tplHead, ...ex] },
  ]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = tr.tplFile;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function render() {
  const tr = T(), n = MY.words.length;
  const langs = ["pl", "en"].filter(l => MY.words.some(w => w[l])).map(l => l.toUpperCase());
  const e = S.myErr;    // a string (the whole file is wrong) or a list of row errors
  const errs = !e ? "" : typeof e === "string" ? `<div class="errbox" role="alert">${esc(e)}</div>`
    : `<div class="errbox" role="alert"><b>${tr.myErrs(e.length)}</b><ul>${e.slice(0, 15).map(x => `<li>${esc(x)}</li>`).join("")}</ul>${e.length > 15 ? `<p>${tr.myErrMore(e.length - 15)}</p>` : ""}</div>`;
  $("#view").innerHTML = `<section class="page stack">
    <div class="meta"><span>${tr.mySet}</span>${n ? `<span>${esc(MY.name)} · ${n} ${tr.words} · IT + ${langs.join(" + ")}</span>` : ""}</div>
    <p style="margin:0">${tr.myIntro}</p>
    <ol class="steps">${tr.mySteps.map(s => `<li>${s}</li>`).join("")}</ol>
    <div class="row">
      <button class="btn" id="myTpl">${tr.myTpl}</button>
      <button class="btn primary" id="myPick">${n ? tr.myReplace : tr.myUpload}</button>
      <input type="file" id="myFile" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden>
    </div>
    ${n ? `<p class="hint" style="margin:0">${tr.myReplaceNote}</p>` : ""}
    ${errs}
    <p class="hint" style="margin:0">${tr.myNote}</p>
    <div class="row">${n ? (S.myDel
      ? `<div class="confirm">${tr.myDelQ} <button class="btn bad" id="myDelYes">${tr.myDel}</button><button class="btn" id="myDelNo">${tr.cancel}</button></div>`
      : `<button class="btn primary" id="myUse">${tr.myStart}</button><button class="linkbtn" id="myDel">${tr.myDel}</button>`) : ""}
      <button class="linkbtn" id="myClose">${tr.close}</button></div>
  </section>`;
}
