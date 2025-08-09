// Firebase (CDN modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Your config (safe to embed)
const firebaseConfig = {
  apiKey: "AIzaSyAYA7OzOQBpyHsOYIDK89Z4-8BbrRleZ7A",
  authDomain: "vytron-maintenance-app.firebaseapp.com",
  projectId: "vytron-maintenance-app",
  storageBucket: "vytron-maintenance-app.appspot.com",
  messagingSenderId: "951172681125",
  appId: "1:951172681125:web:278450c515a89547f32c4c",
  measurementId: "G-FEKBB1K6V7"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// UI helpers
const $ = (s) => document.querySelector(s);
const listEl = $("#list");
const saveMsg = $("#saveMsg");
const detail = $("#detail");
const detailBody = $("#detailBody");
let selectedId = null;

// Live list
const col = collection(db, "equipment");
onSnapshot(col, (snap) => {
  if (snap.empty) {
    listEl.textContent = "No equipment yet — add one above.";
    return;
  }
  const items = [];
  snap.forEach(doc => {
    const d = doc.data();
    const title = `Line ${d.line || ""} — ${d.station || ""}`.replace(/ — $/, "");
    items.push(`
      <a class="row" href="#${doc.id}" data-id="${doc.id}">
        <div style="flex:1">
          <div><strong>${d.name || doc.id}</strong></div>
          <div class="meta">${title} • ${d.make || "-"} ${d.model || ""}</div>
        </div>
        <div class="meta">${doc.id}</div>
      </a>
    `);
  });
  listEl.innerHTML = items.join("");
  // wire clicks
  listEl.querySelectorAll("a.row").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showDetail(a.dataset.id);
    });
  });
});

// Detail panel
async function showDetail(id) {
  selectedId = id;
  const snap = await getDoc(doc(db, "equipment", id));
  if (!snap.exists()) {
    detailBody.textContent = "Not found.";
    detail.style.display = "";
    return;
  }
  const d = snap.data();
  detailBody.innerHTML = `
    <div><strong>${d.name || id}</strong></div>
    <div class="meta">Line ${d.line || ""} • ${d.station || ""}</div>
    <div>Make/Model: ${d.make || "-"} ${d.model || ""}</div>
    <div>Serial: ${d.serial || "-"}</div>
    <div>Location: ${d.location || "-"}</div>
    <div>Notes: ${d.notes || "-"}</div>
    <div class="meta" style="margin-top:6px">ID: ${id}</div>
  `;
  detail.style.display = "";
}

// Save (create/update)
$("#btnSave").addEventListener("click", async () => {
  const id = $("#f_id").value.trim();
  if (!id) { saveMsg.textContent = "ID is required."; return; }
  const data = {
    name: $("#f_name").value.trim(),
    line: $("#f_line").value.trim(),
    station: $("#f_station").value.trim(),
    make: $("#f_make").value.trim(),
    model: $("#f_model").value.trim(),
    serial: $("#f_serial").value.trim(),
    location: $("#f_location").value.trim(),
    notes: $("#f_notes").value.trim(),
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(db, "equipment", id), data, { merge: true });
    saveMsg.textContent = "Saved ✓";
    setTimeout(()=> saveMsg.textContent="", 1200);
  } catch (e) {
    saveMsg.textContent = "Error: " + e.message;
  }
});

// Clear form
$("#btnClear").addEventListener("click", () => {
  ["f_id","f_name","f_line","f_station","f_make","f_model","f_serial","f_location","f_notes"]
    .forEach(id => { document.getElementById(id).value = ""; });
});

// Detail → Load into form
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

// Detail → Open QR page (your existing static page by slug)
$("#btnToQR").addEventListener("click", () => {
  if (!selectedId) return;
  // If you want to map to your existing per-equipment pages, keep this format:
  // e.g., https://chasemyers.github.io/vytron-app/l4-extruder/
  const url = `https://chasemyers.github.io/vytron-app/${selectedId}/`;
  window.open(url, "_blank");
});

// Deep-link to a specific item (hash)
if (location.hash) {
  showDetail(location.hash.slice(1));
}
