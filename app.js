// --------- Firebase (CDN modules) ---------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getFirestore, doc, getDoc, getDocs, collection, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// --------- Firebase config ---------
const firebaseConfig = {
    apiKey: "AIzaSyAYA7Ozq0BpvHSOYIDK89Z4-8BbrRleZ7A",
    authDomain: "vytron-maintenance-app.firebaseapp.com",
    projectId: "vytron-maintenance-app",
    storageBucket: "vytron-maintenance-app.appspot.com",
    messagingSenderId: "951172681125",
    appId: "1:951172681125:web:278450c515a89547f32c4c",
    measurementId: "G-FEKBK81K6V"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let selectedId = null;

// Load all equipment from Firestore
async function loadEquipmentList() {
    const listDiv = document.getElementById("list");
    listDiv.innerHTML = "Loading...";

    try {
        const querySnapshot = await getDocs(collection(db, "equipment"));
        let html = "";
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            html += `<div class="item" data-id="${docSnap.id}">
                        ${docSnap.id} &bull; Line ${data.line || "?"} &bull; ${data.name || "?"}
                     </div>`;
        });
        listDiv.innerHTML = html;

        document.querySelectorAll(".item").forEach((el) => {
            el.addEventListener("click", () => selectItem(el.dataset.id));
        });
    } catch (err) {
        console.error("Error loading list:", err);
        listDiv.innerHTML = "Error loading list.";
    }
}

// Select an item from the list
async function selectItem(id) {
    selectedId = id;
    const docRef = doc(db, "equipment", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const detailBody = document.getElementById("detailBody");
    if (detailBody) {
        detailBody.innerHTML = `
            <p><strong>ID:</strong> ${id}</p>
            <p><strong>Name:</strong> ${data.name || ""}</p>
            <p><strong>Line:</strong> ${data.line || ""}</p>
            <p><strong>Station:</strong> ${data.station || ""}</p>
            <p><strong>Make:</strong> ${data.make || ""}</p>
            <p><strong>Model:</strong> ${data.model || ""}</p>
            <p><strong>Serial:</strong> ${data.serial || ""}</p>
            <p><strong>Location:</strong> ${data.location || ""}</p>
            <p><strong>Notes:</strong> ${data.notes || ""}</p>
        `;
    }
}

// Save button
document.getElementById("btnSave").addEventListener("click", async () => {
    const id = document.getElementById("f_id").value.trim();
    if (!id) return alert("ID is required");

    const data = {
        name: document.getElementById("f_name").value.trim(),
        line: document.getElementById("f_line").value.trim(),
        station: document.getElementById("f_station").value.trim(),
        make: document.getElementById("f_make").value.trim(),
        model: document.getElementById("f_model").value.trim(),
        serial: document.getElementById("f_serial").value.trim(),
        location: document.getElementById("f_location").value.trim(),
        notes: document.getElementById("f_notes").value.trim(),
        updated: serverTimestamp()
    };

    try {
        await setDoc(doc(db, "equipment", id), data);
        alert("Saved successfully!");
        loadEquipmentList();
    } catch (err) {
        console.error("Error saving document:", err);
    }
});

// Clear button
document.getElementById("btnClear").addEventListener("click", () => {
    document.getElementById("f_id").value = "";
    document.getElementById("f_name").value = "";
    document.getElementById("f_line").value = "";
    document.getElementById("f_station").value = "";
    document.getElementById("f_make").value = "";
    document.getElementById("f_model").value = "";
    document.getElementById("f_serial").value = "";
    document.getElementById("f_location").value = "";
    document.getElementById("f_notes").value = "";
    selectedId = null;
});

// Load into form
document.getElementById("btnFill").addEventListener("click", async () => {
    if (!selectedId) return;
    const docRef = doc(db, "equipment", selectedId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const d = docSnap.data();
    document.getElementById("f_id").value = selectedId;
    document.getElementById("f_name").value = d.name || "";
    document.getElementById("f_line").value = d.line || "";
    document.getElementById("f_station").value = d.station || "";
    document.getElementById("f_make").value = d.make || "";
    document.getElementById("f_model").value = d.model || "";
    document.getElementById("f_serial").value = d.serial || "";
    document.getElementById("f_location").value = d.location || "";
    document.getElementById("f_notes").value = d.notes || "";
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// Open QR page
function slugToPath(id) {
    if (id.startsWith("l4-")) {
        return `equipment/line4-${id.slice(3)}.html`;
    }
    return `${id}/`;
}

document.getElementById("btnToQR").addEventListener("click", () => {
    if (!selectedId) return;
    const url = `https://chasemyers.github.io/vytron-app/${slugToPath(selectedId)}`;
    window.open(url, "_blank");
});

// Initial load
loadEquipmentList();
