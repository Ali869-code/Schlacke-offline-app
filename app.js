
const fields = ["cao","sio2","al2o3","mgo"];
const resultEl = document.getElementById("result");
const preview = document.getElementById("preview");
const statusEl = document.getElementById("status");

function setStatus() {
  const online = navigator.onLine;
  statusEl.textContent = online ? "Online – bereit für Installation" : "Offline – App läuft lokal";
  statusEl.style.background = online ? "#dbeafe" : "#dcfce7";
  statusEl.style.color = online ? "#1d4ed8" : "#166534";
}
window.addEventListener("online", setStatus);
window.addEventListener("offline", setStatus);

function readNumber(id){
  const v = parseFloat(document.getElementById(id).value);
  return Number.isFinite(v) ? v : null;
}
function computeResult() {
  const cao = readNumber("cao");
  const sio2 = readNumber("sio2");
  const al2o3 = readNumber("al2o3");
  const mgo = readNumber("mgo");
  if (cao == null || sio2 == null) {
    resultEl.className = "result";
    resultEl.innerHTML = "<strong>Ergebnis:</strong><div>Bitte mindestens CaO und SiO₂ eingeben.</div>";
    return;
  }
  const b2 = sio2 > 0 ? (cao / sio2) : null;
  let tone = "warn";
  let text = "B2 konnte nicht sauber bewertet werden.";
  if (b2 !== null) {
    if (b2 >= 2.0 && b2 <= 2.2) { tone = "ok"; text = `Basizität B2 ≈ ${b2.toFixed(2)}. Das liegt im Stückverzinker-Bereich.`; }
    else if (b2 >= 1.7 && b2 < 2.0) { tone = "warn"; text = `Basizität B2 ≈ ${b2.toFixed(2)}. Eher normal basisch, aber unter Stückverzinker-Ziel.`; }
    else if (b2 < 1.7) { tone = "bad"; text = `Basizität B2 ≈ ${b2.toFixed(2)}. Schlacke wirkt eher zu sauer.`; }
    else if (b2 > 2.2) { tone = "warn"; text = `Basizität B2 ≈ ${b2.toFixed(2)}. Ziemlich hoch basisch.`; }
  }
  const extras = [];
  if (al2o3 != null) extras.push(`Al₂O₃: ${al2o3.toFixed(1)} %`);
  if (mgo != null) extras.push(`MgO: ${mgo.toFixed(1)} %`);
  resultEl.className = `result ${tone}`;
  resultEl.innerHTML = `<strong>Ergebnis:</strong><div>${text}</div><div><strong>Werte:</strong> CaO ${cao.toFixed(1)} %, SiO₂ ${sio2.toFixed(1)} %${extras.length ? ", " + extras.join(", ") : ""}</div>`;
}
function saveValues() {
  for (const id of fields) localStorage.setItem("slag_" + id, document.getElementById(id).value || "");
  computeResult();
}
function loadValues() {
  for (const id of fields) document.getElementById(id).value = localStorage.getItem("slag_" + id) || "";
  computeResult();
}
async function clearValues() {
  for (const id of fields) { localStorage.removeItem("slag_" + id); document.getElementById(id).value = ""; }
  await deletePhoto();
  computeResult();
}
document.getElementById("saveBtn").addEventListener("click", saveValues);
document.getElementById("clearBtn").addEventListener("click", clearValues);
fields.forEach(id => document.getElementById(id).addEventListener("input", computeResult));

const DB_NAME = "schlackenAppDB";
const STORE = "files";
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function savePhoto(file) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(file, "latestPhoto");
  await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  renderPreview(file);
}
async function loadPhoto() {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).get("latestPhoto");
  const file = await new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error); });
  if (file) renderPreview(file);
}
async function deletePhoto() {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete("latestPhoto");
  await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  preview.hidden = true;
  preview.removeAttribute("src");
}
function renderPreview(file) {
  const url = URL.createObjectURL(file);
  preview.src = url;
  preview.hidden = false;
}
document.getElementById("photo").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) await savePhoto(file);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try { await navigator.serviceWorker.register("./sw.js"); } catch (e) { console.error("Service Worker Fehler:", e); }
  });
}
loadValues();
loadPhoto();
setStatus();
