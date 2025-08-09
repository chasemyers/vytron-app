// ---------- Firebase (CDN modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, getDocs, collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ---------- Your Firebase config (from your console)
const firebaseConfig = {
  apiKey: "AIzaSyAYA7OzOQBpyHsOYIDK89Z4-8BbrRleZ7A",
  authDomain: "vytron-maintenance-app.firebaseapp.com",
  projectId: "vytron-maintenance-app",
  storageBucket: "vytron-maintenance-app.firebasestorage.app",
  messagingSenderId: "951172681125",
  appId: "1:951172681125:web:278450c515a89547f32c4c",
  measurementId: "G-FEKB8K16V7",
};

// ---------- Init
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ---------- DOM helpers
const $ = (sel) => document.querySelector(sel);
const listEl   = $("#list");
const detailEl = $("#detail");
const detailBody = $("#detailBody");

// ---------- State
let selectedId = null;

// ---------- Render list from Firestore
async function loadList() {
  listEl.textContent = "Loading…";
  const snap = await getDocs(collection(db, "equipment"));
  const items = [];
  snap.forEach(d => {
    const v = d.data();
    items.push({
      id: d.id,
      name: v.name || "(unnamed)",
      line: v.line || "?",
      station: v.station || "?"
    });
  });
  if (!items.length) {
    listEl.textContent = "No equipment yet.";
    return;
  }
  listEl.innerHTML = items.map(it =>
    `<div class="item" data-id="${it.id}">
        <strong>${it.name}</strong>
        <div class="meta">${it.id} • Line ${it.line} • ${it.station}</div>
     </div>`
  ).join("");
  listEl.querySelectorAll(".item").forEach(el => {
    el.addEventListener("click", () => showDetail(el.dataset.id));
  });
}

// ---------- Show detail panel
async function showDetail(id) {
  const snap = await getDoc(doc(db, "equipment", id));
  if (!snap.exists()) return;
  const d = snap.data();
  selectedId = id;
  detailBody.innerHTML = `
    <div><strong>${d.name || "(unnamed)"} </strong></div>
    <div class="meta">ID: ${id}</div>
    <div class="meta">Line: ${d.line || ""} • Station: ${d.station || ""}</div>
    <div class="meta">Make/Model: ${d.make || ""} ${d.model || ""}</div>
    <div class="meta">Serial: ${d.serial || ""}</div>
    <div class="meta">Location: ${d.location || ""}</div>
    ${d.notes ? `<div style="margin-top:8px">${d.notes}</div>` : ""}
  `;
  detailEl.style.display = "block";
}

// ---------- Save / update
$("#btnSave").addEventListener("click", async () => {
  const id = $("#f_id").value.trim();
  const name = $("#f_name").value.trim();
  if (!id || !name) { alert("ID and Name are required."); return; }

  const payload = {
    name,
    line: $("#f_line").value.trim(),
    station: $("#f_station").value.trim(),
    make: $("#f_make").value.trim(),
    model: $("#f_model").value.trim(),
    serial: $("#f_serial").value.trim(),
    location: $("#f_location").value.trim(),
    notes: $("#f_notes").value.trim(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "equipment", id), payload, { merge: true });
  $("#saveMsg").textContent = "Saved ✓";
  setTimeout(() => $("#saveMsg").textContent = "", 1200);
  await loadList();
});

// ---------- Clear form
$("#btnClear").addEventListener("click", () => {
  ["f_id","f_name","f_line","f_station","f_make","f_model","f_serial","f_location","f_notes"]
    .forEach(i => { const el = $("#"+i); if (el) el.value = ""; });
});

// ---------- Load selected into form
$("#btnFill").addEventListener("click", async () => {
  if (!selectedId) return;
  const snap = await getDoc(doc(db, "equipment", selectedId));
  if (!snap.exists()) return;
  const d = snap.data();
  $("#f_id").value = selectedId;
  $("#f_name").value = d.name || "";
  $("#f_line").value = d.line || "";
  $("#f_station").value = d.station || "";
  $("#f_make").value = d.make || "";
  $("#f_model").value = d.model || "";
  $("#f_serial").value = d.serial || "";
  $("#f_location").value = d.location || "";
  $("#f_notes").value = d.notes || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---------- Open QR page (GitHub Pages route)
function slugToPath(id) {
  return `equip.html?id=${encodeURIComponent(id)}`;
}

$("#btnToQR").addEventListener("click", () => {
  if (!selectedId) return;
  const url = `https://chasemyers.github.io/vytron-app/${slugToPath(selectedId)}`;
  window.open(url, "_blank");
});

// ---------- Boot
loadList();
