// -------- Firebase (CDN modules) --------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// -------- Firebase config (yours) --------
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
const db = getFirestore(app);

// --- helpers ---
const $ = sel => document.querySelector(sel);
const detail = $("#detail");

function lineRow(label, value) {
  return `<div style="margin:4px 0"><strong>${label}:</strong> ${value || ""}</div>`;
}

function renderDoc(id, d) {
  detail.innerHTML = `
    <h2>${d.name ? d.name : "(unnamed)"} • ${id}</h2>
    ${lineRow("Line", d.line)}${lineRow("Station", d.station)}
    ${lineRow("Make/Model", [d.make, d.model].filter(Boolean).join(" "))}
    ${lineRow("Serial", d.serial)}${lineRow("Location", d.location)}
    ${d.notes ? `<div class="meta" style="margin-top:8px">${d.notes}</div>` : ""}

    <div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap">
      <a class="btn" href="./index.html">&larr; Back to list</a>
      <a class="btn primary" href="./index.html?id=${encodeURIComponent(id)}#edit">Edit this item</a>
    </div>
  `;
}

// --- load based on ?id= ---
const params = new URLSearchParams(location.search);
const id = params.get("id");

(async () => {
  if (!id) {
    detail.innerHTML = `<p>No equipment ID in URL.</p>
                        <p><a class="btn" href="./index.html">Back to list</a></p>`;
    return;
  }
  try {
    const snap = await getDoc(doc(db, "equipment", id));
    if (!snap.exists()) {
      detail.innerHTML = `<p>Equipment <code>${id}</code> not found.</p>
                          <p><a class="btn" href="./index.html">Back to list</a></p>`;
      return;
    }
    renderDoc(id, snap.data());
  } catch (e) {
    detail.innerHTML = `<p>Error loading data.</p><pre class="meta">${e.message}</pre>`;
  }
})();
