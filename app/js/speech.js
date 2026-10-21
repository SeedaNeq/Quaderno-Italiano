// Pronunciation with the device's built-in voices (Web Speech API).
// Each language uses its own voice; the Italian voice can be chosen by the user.
import { S } from "./state.js";
import { T } from "./i18n.js";
import { $, esc, SPK } from "./ui.js";

export const canSpeak = "speechSynthesis" in window;
const VOICE = { it: "it-IT", pl: "pl-PL", en: "en-GB" };
let VOICES = [];

const norm = s => String(s).replace("_", "-").toLowerCase();
// Prefer high-quality voices ("Natural", "Google", ...) and the exact locale
const rank = (v, code) => (/natural|neural|online|premium|enhanced|google/i.test(v.name) ? 0 : 2) + (norm(v.lang) === code.toLowerCase() ? 0 : 1);

function voicesFor(lang) {
  const code = (VOICE[lang] || "").toLowerCase();
  return VOICES.filter(v => norm(v.lang).startsWith(lang)).sort((a, b) => rank(a, code) - rank(b, code));
}

function pickVoice(lang) {
  const vs = voicesFor(lang);
  if (lang === "it" && S.itVoice) { const v = vs.find(v => v.name === S.itVoice); if (v) return v; }
  return vs[0] || null;
}

// Text in parentheses is skipped; ";" and "/" become short pauses.
export function speak(t, lang = "it") {
  if (!canSpeak || !t) return;
  try {
    const txt = String(t).replace(/\([^)]*\)/g, " ").replace(/[;/]/g, ", ").replace(/\s+/g, " ").trim();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = VOICE[lang] || "it-IT";
    const v = pickVoice(lang); if (v) u.voice = v;
    u.rate = lang === "it" ? 0.9 : 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {}
}

// Small speaker button next to a word
export const mini = (t, l) => canSpeak && t
  ? `<button class="sp mini" data-say="${esc(t)}" data-lang="${l}" aria-label="${T().say} (${l.toUpperCase()})">${SPK}</button>` : "";

// Italian voice picker + warning when the device has no Italian voice
export function renderVoice() {
  if (!canSpeak) return;
  const tr = T(), vs = voicesFor("it");
  $("#voiceLbl").textContent = tr.voice;
  $("#voiceWarn").textContent = tr.noVoice;
  $("#voiceWrap").hidden = vs.length < 2;
  $("#voiceWarn").hidden = !(VOICES.length && !vs.length);
  const cur = pickVoice("it");
  $("#voiceSel").innerHTML = vs.map(v => `<option value="${esc(v.name)}"${cur && cur.name === v.name ? " selected" : ""}>${esc(v.name.replace(/^Microsoft |^Google /, ""))}</option>`).join("");
}

function loadVoices() {
  try { VOICES = speechSynthesis.getVoices() || []; } catch (e) { VOICES = []; }
  renderVoice();
}

export function initSpeech() {
  if (!canSpeak) return;
  loadVoices();
  try { speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch (e) {}
  setTimeout(loadVoices, 800);
}
