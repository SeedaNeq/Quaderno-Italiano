// Spreadsheets in the browser without a library: writing .xlsx (the template) and reading .xlsx / .csv (the upload).
// An .xlsx file is a zip of XML files. We write it uncompressed and read compressed parts with DecompressionStream.
// readSheet() returns rows as arrays of strings; index = row number - 1 (empty rows stay as []).

const enc = new TextEncoder(), dec = new TextDecoder();
const xesc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const colName = i => (i >= 26 ? colName(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));
const colIdx = ref => [...ref.replace(/\d+$/, "")].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

// ---- zip ----
const CRC = new Uint32Array(256).map((_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n; });
function crc32(b) { let c = ~0; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return ~c >>> 0; }

// files: { path: text } → zip Blob, stored without compression
function zip(files) {
  const parts = [], central = [];
  let off = 0;
  for (const [path, text] of Object.entries(files)) {
    const nm = enc.encode(path), data = enc.encode(text), crc = crc32(data);
    const loc = new DataView(new ArrayBuffer(30)), cen = new DataView(new ArrayBuffer(46));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [12, 33, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, nm.length, 2]]
      .forEach(([o, v, n]) => (n === 4 ? loc.setUint32(o, v, true) : loc.setUint16(o, v, true)));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [14, 33, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, nm.length, 2], [42, off, 4]]
      .forEach(([o, v, n]) => (n === 4 ? cen.setUint32(o, v, true) : cen.setUint16(o, v, true)));
    parts.push(loc, nm, data); central.push(cen, nm);
    off += 30 + nm.length + data.length;
  }
  const size = central.reduce((s, p) => s + p.byteLength, 0), end = new DataView(new ArrayBuffer(22)), n = central.length / 2;
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, n, true); end.setUint16(10, n, true);
  end.setUint32(12, size, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// zip ArrayBuffer → function(path) returning the file's text (or null)
function unzip(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf), files = {};
  let e = buf.byteLength - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("not a zip");
  for (let i = 0, p = v.getUint32(e + 16, true), n = v.getUint16(e + 10, true); i < n; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("bad zip");
    const nlen = v.getUint16(p + 28, true);
    files[dec.decode(u8.subarray(p + 46, p + 46 + nlen))] = { method: v.getUint16(p + 10, true), size: v.getUint32(p + 20, true), loc: v.getUint32(p + 42, true) };
    p += 46 + nlen + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  return async path => {
    const f = files[path];
    if (!f) return null;
    const start = f.loc + 30 + v.getUint16(f.loc + 26, true) + v.getUint16(f.loc + 28, true), raw = u8.subarray(start, start + f.size);
    if (f.method === 0) return dec.decode(raw);
    if (f.method !== 8) throw new Error("unsupported zip method");
    return new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  };
}

// ---- writing .xlsx ----
// sheets: [{ name, rows: [[text]], widths: [chars], head: true (bold, frozen first row), lists: [{ col, values }] }]
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const RNS = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function sheetXML(sh, first) {
  const rows = sh.rows.map((r, i) => `<row r="${i + 1}">${r.map((t, c) => (t === "" || t == null ? "" :
    `<c r="${colName(c)}${i + 1}" t="inlineStr"${sh.head && i === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${xesc(t)}</t></is></c>`)).join("")}</row>`).join("");
  const pane = sh.head ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : "";
  const cols = sh.widths ? `<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
  // Drop-down lists only suggest values: other spellings (e.g. another language) are still allowed
  const dv = sh.lists && sh.lists.length ? `<dataValidations count="${sh.lists.length}">${sh.lists.map(l =>
    `<dataValidation type="list" allowBlank="1" showErrorMessage="0" sqref="${l.col}2:${l.col}2000"><formula1>"${xesc(l.values.join(","))}"</formula1></dataValidation>`).join("")}</dataValidations>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet ${NS}><sheetViews><sheetView${first ? ' tabSelected="1"' : ""} workbookViewId="0">${pane}</sheetView></sheetViews>${cols}<sheetData>${rows}</sheetData>${dv}</worksheet>`;
}

export function writeXlsx(sheets) {
  const x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', T = "application/vnd.openxmlformats-officedocument.spreadsheetml";
  const files = {
    "[Content_Types].xml": `${x}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${T}.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="${T}.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${T}.worksheet+xml"/>`).join("")}</Types>`,
    "_rels/.rels": `${x}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `${x}<workbook ${NS} ${RNS}><sheets>${sheets.map((s, i) => `<sheet name="${xesc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `${x}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `${x}<styleSheet ${NS}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  };
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXML(s, i === 0); });
  return zip(files);
}

// ---- reading ----
const parseXML = t => new DOMParser().parseFromString(t, "application/xml");
const all = (node, tag) => [...node.getElementsByTagNameNS("*", tag)];
const attr = (el, local) => { for (const a of el.attributes) if (a.localName === local) return a.value; return null; };
// Text of a string item, skipping phonetic hints (<rPh>)
const text = el => all(el, "t").filter(t => t.parentNode.localName !== "rPh").map(t => t.textContent).join("");

async function readXlsx(buf) {
  const get = unzip(buf);
  const wb = parseXML(await get("xl/workbook.xml")), rels = parseXML(await get("xl/_rels/workbook.xml.rels"));
  const rid = attr(all(wb, "sheet")[0], "id");                 // first sheet in the workbook
  const target = attr(all(rels, "Relationship").find(r => r.getAttribute("Id") === rid), "Target");
  const path = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
  const ssText = await get("xl/sharedStrings.xml");
  const shared = ssText ? all(parseXML(ssText), "si").map(text) : [];
  const rows = [];
  all(parseXML(await get(path)), "row").forEach((row, k) => {
    const r = +row.getAttribute("r") || k + 1, cells = [];
    all(row, "c").forEach((c, j) => {
      const ref = c.getAttribute("r"), t = c.getAttribute("t"), v = all(c, "v")[0];
      cells[ref ? colIdx(ref) : j] = t === "s" ? shared[+(v && v.textContent)] || "" : t === "inlineStr" ? text(c) : v ? v.textContent : "";
    });
    rows[r - 1] = Array.from(cells, x => x || "");
  });
  return Array.from(rows, r => r || []);
}

function readCsv(buf) {
  let s;
  try { s = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { s = new TextDecoder("windows-1250").decode(buf); }  // Polish Excel saves CSV in cp1250
  s = s.replace(/^﻿/, "");
  const line = s.split(/\r?\n/)[0], count = ch => line.split(ch).length;
  const sep = [";", "\t", ","].reduce((a, b) => (count(b) > count(a) ? b : a));
  const rows = [[]];
  let cell = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], row = rows[rows.length - 1];
    if (q) { if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"' && !cell) q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(cell); cell = ""; rows.push([]); }
    else cell += c;
  }
  rows[rows.length - 1].push(cell);
  return rows;
}

// File → rows. .csv by name, otherwise .xlsx (zip starts with "PK")
export async function readSheet(file) {
  const buf = await file.arrayBuffer(), u8 = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
  return u8[0] === 0x50 && u8[1] === 0x4b ? readXlsx(buf) : readCsv(buf);
}
