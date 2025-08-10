// Firebase (CDN v10 modules – same style as your inventory page)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ---- your config (same as index/inventory pages) ----
const firebaseConfig = {
  apiKey: "AIzaSyAYA7OzOQBpyHsOYIDK89Z4-8BbrRleZ7A",
  authDomain: "vytron-maintenance-app.firebaseapp.com",
  projectId: "vytron-maintenance-app",
  storageBucket: "vytron-maintenance-app.firebasestorage.app",
  messagingSenderId: "951172681125",
  appId: "1:951172681125:web:278450c515a89547f32c4c",
  measurementId: "G-FEKB8K1K6V7"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// DOM helpers (no .join anywhere)
const $ = sel => document.querySelector(sel);
const listEl = $("#pmList");

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
}

async function loadPM() {
  listEl.textContent = "Loading…";
  try {
    const snap = await getDocs(collection(db, "pm"));
    if (snap.empty) {
      listEl.textContent = "No PM tasks found.";
      return;
    }

    // Clear and rebuild
    listEl.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();

      const row = document.createElement("div");
      row.className = "pm-row";
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr auto";
      row.style.gap = "8px";
      row.style.alignItems = "center";
      row.style.padding = "8px 0";
      row.style.borderBottom = "1px solid rgba(255,255,255,.06)";

      const left = document.createElement("div");
      left.innerHTML = `
        <div class="pm-name"><b>${d.name || "(unnamed task)"} </b> <span class="meta">(${d.frequency || ""})</span></div>
        <div class="meta">Last done: ${fmtDate(d.lastDone)}${d.lastBy ? " • by " + d.lastBy : ""}</div>
      `;

      const btn = document.createElement("button");
      btn.className = "primary";
      btn.textContent = "Done";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await updateDoc(doc(db, "pm", docSnap.id), {
            lastDone: serverTimestamp(),
            lastBy: "Tech" // TODO: when we add auth, put the user’s name/UID here
          });
          await loadPM(); // refresh
        } catch (e) {
          alert("Failed to update: " + e.message);
        } finally {
          btn.disabled = false;
        }
      });

      row.appendChild(left);
      row.appendChild(btn);
      listEl.appendChild(row);
    });
  } catch (e) {
    listEl.innerHTML = `<span class="bad">Error: ${e.message}</span>`;
  }
}

loadPM();
