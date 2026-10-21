// Installable app: service worker, "new version" bar, install button, "what's new" box.
// The version number lives ONLY in version.js (read by the page and by sw.js).
import { S } from "./state.js";
import { T } from "./i18n.js";
import { $, esc } from "./ui.js";

const VERSION = self.APP_VERSION || "dev";
const PWA = { prompt: null, waiting: null, news: null };   // news = list of changes to show once

// Listen from the very start: the browser may offer installation before the word list has loaded
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); PWA.prompt = e; if ($("#foot")) renderPwa(); });
window.addEventListener("appinstalled", () => { PWA.prompt = null; renderPwa(); });

export function renderPwa() {
  const tr = T();
  $("#foot").textContent = tr.foot + " · v" + VERSION;
  const ib = $("#installBtn"); ib.hidden = !PWA.prompt; ib.textContent = tr.install;
  $("#updBar").hidden = !PWA.waiting; $("#updTxt").textContent = tr.updAvail; $("#updBtn").textContent = tr.updNow;
  const nb = $("#newsBox"); nb.hidden = !PWA.news;
  if (PWA.news) {
    nb.querySelector("h2").textContent = tr.whatsNew(VERSION);
    nb.querySelector("ul").innerHTML = (PWA.news[S.ui] || PWA.news.pl || []).map(x => `<li>${esc(x)}</li>`).join("");
    $("#newsClose").textContent = tr.close;
  }
}

export function install() {
  if (!PWA.prompt) return;
  PWA.prompt.prompt();
  PWA.prompt.userChoice.finally(() => { PWA.prompt = null; renderPwa(); });
}
export function applyUpdate() { if (PWA.waiting) PWA.waiting.postMessage({ type: "SKIP_WAITING" }); }
export function closeNews() { PWA.news = null; renderPwa(); }

export async function initPwa() {
  // Show "what's new" once, after the version changed (not on the very first visit)
  try {
    const last = localStorage.getItem("quaderno-version");
    localStorage.setItem("quaderno-version", VERSION);
    if (last && last !== VERSION) {
      const all = await fetch("data/changelog.json").then(r => r.json());
      if (all[VERSION]) { PWA.news = all[VERSION]; renderPwa(); }
    }
  } catch (e) {}

  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloading) return; reloading = true; location.reload(); });
  try {
    const reg = await navigator.serviceWorker.register("sw.js");
    const offer = w => { if (w && navigator.serviceWorker.controller) { PWA.waiting = w; renderPwa(); } };
    offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      if (w) w.addEventListener("statechange", () => { if (w.state === "installed") offer(w); });
    });
    const check = () => reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    setInterval(check, 60 * 60 * 1000);
  } catch (e) {}
}
