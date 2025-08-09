<script type="module">
// ---------- Firebase (CDN modules) ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, getDocs, collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ---------- Firebase config ----------
const firebaseConfig = {
  apiKey: "AIzaSyAYA7OzOQBpyHsOYIDK89Z4-8BbrRleZ7A",
  authDomain: "vytron-maintenance-app.firebaseapp.com",
  projectId: "vytron-maintenance-app",
  storageBucket: "vytron-maintenance-app.firebasestorage.app",
  messagingSenderId: "951172681125",
  appId: "1:951172681125:web:278450c515a89547f32c4c",
  measurementId: "G-FEKBB1K6V7"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ---------- CONFIG YOU MAY EDIT ----------
const GITHUB_BASE = "https://chasemyers.github.io/vytron-app/"; // <- your Pages root
const COLLECTION  = "equipment";                                  // Firestore collection
// ----------------------------------------

// Shorthand
const $  = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];

// DOM refs (must exist in your HTML)
const refs = {
  form:        $("#frm"),
  id:          $("#f_id"),
  name:        $("#f_name"),
  line:        $("#f_line"),
  station:     $("#f_station"),
  make:        $("#f_make"),
  model:       $("#f_model"),
  serial:      $("#f_serial"),
  location:    $("#f_location"),
  notes:       $("#f_notes"),
  btnSave:     $("#btnSave"),
  btnFill:     $("#btnFill"),
  btnToQR:     $("#btnToQR"),
  list:        $("#list"),
  selectedBox: $("#selected")
};

let selectedId = ""; // currently highlighted item

// --- Helpers ---------------------------------------------------------------
const slugify = s => (s||"")
  .toLowerCase().trim()
  .replace(/[^a-z0-9]+/g,"-")
  .replace(/(^-|-$)/g,"");

/** Map a Firestore ID to a static file path */
function slugToPath(id) {
  // Rule: files live at /equipment/<id>.html
  return `equipment/${id}.html`;
}

function detailUrlFor(id) {
  // Try static file; if it 404s, user can still reach dynamic view with ?id=
  return `${GITHUB_BASE}${slugToPath(id)}`;
}

function dynamicUrlFor(id) {
  // Always works (no static file needed)
  return `${GITHUB_BASE}?id=${encodeURIComponent(id)}`;
}

function docToRow(d, id) {
  return `
    <button class="row" data-id="${id}">
      <strong>${d.name || id}</strong>
      <span class="muted"> • Line ${d.line || "?"}</span>
      <span class="muted"> • ${d.model || ""}</span>
    </button>
  `;
}

function selectedPreview(d, id) {
  return `
    <div><strong>ID:</strong> ${id}</div>
    <div><strong>Line:</strong> ${d.line || ""}</div>
    <div><strong>Station:</strong> ${d.station || ""}</div>
    <div><strong>Make/Model:</strong> ${d.make || ""} ${d.model || ""}</div>
    <div><strong>Serial:</strong> ${d.serial || ""}</div>
    <div><strong>Location:</strong> ${d.location || ""}</div>
    <div><strong>Notes:</strong> ${d.notes || ""}</div>
  `;
}

// --- Data I/O --------------------------------------------------------------
async function loadList() {
  const snap = await getDocs(collection(db, COLLECTION));
  const rows = [];
  snap.forEach(docSnap => {
    const d = docSnap.data();
    rows.push(docToRow(d, docSnap.id));
  });
  refs.list.innerHTML = rows.sort().join("") || "<div class='muted'>No equipment yet.</div>";
  // bind clicks
  $$(".row", refs.list).forEach(btn => {
    btn.addEventListener("click", () => selectItem(btn.dataset.id));
  });
}

async function selectItem(id) {
  selectedId = id;
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return;
  const d = snap.data();
  refs.selectedBox.innerHTML = selectedPreview(d, id);
}

async function saveForm() {
  // Use provided ID or generate from name/line
  let id = (refs.id.value || "").trim();
  if (!id) {
    id = slugify(`line${refs.line.value}-${refs.name.value || "equipment"}`);
    refs.id.value = id; // reflect generated id in the form
  }
  // Build payload
  const payload = {
    name:     refs.name.value.trim(),
    line:     (refs.line.value || "").toString().trim(),
    station:  refs.station.value.trim(),
    make:     refs.make.value.trim(),
    model:    refs.model.value.trim(),
    serial:   refs.serial.value.trim(),
    location: refs.location.value.trim(),
    notes:    refs.notes.value.trim(),
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, COLLECTION, id), payload, { merge: true });
  selectedId = id;
  await loadList();
  await selectItem(id);
}

// Fill the form from the currently selected doc (no overwrite if missing)
async function loadIntoForm() {
  if (!selectedId) return;
  const snap = await getDoc(doc(db, COLLECTION, selectedId));
  if (!snap.exists()) return;
  const d = snap.data();

  refs.id.value       = selectedId;
  refs.name.value     = d.name || "";
  refs.line.value     = d.line || "";
  refs.station.value  = d.station || "";
  refs.make.value     = d.make || "";
  refs.model.value    = d.model || "";
  refs.serial.value   = d.serial || "";
  refs.location.value = d.location || "";
  refs.notes.value    = d.notes || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Open the QR page (prefer static; always offer dynamic fallback)
function openQrPage() {
  if (!selectedId) return;
  const staticUrl  = detailUrlFor(selectedId);
  // open static in new tab; also show a toast-like hint for fallback
  window.open(staticUrl, "_blank");
  // Optional: also log the dynamic link in console for quick copy
  console.log("Dynamic (always works):", dynamicUrlFor(selectedId));
}

// --- Wire UI ---------------------------------------------------------------
refs.btnSave?.addEventListener("click", (e) => {
  e.preventDefault();
  saveForm().catch(console.error);
});

refs.btnFill?.addEventListener("click", (e) => {
  e.preventDefault();
  loadIntoForm().catch(console.error);
});

refs.btnToQR?.addEventListener("click", (e) => {
  e.preventDefault();
  openQrPage();
});

// Deep-link: ?id=<docId> to show one item on load
(function boot() {
  loadList().catch(console.error);

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (id) selectItem(id);
})();
</script>
