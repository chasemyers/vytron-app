// ========================
// Firebase + DB wrapper
// ========================
const F = (window.firebase && window.firebase.apps && window.firebase.apps.length) ? {
  db: firebase.firestore(),
  storage: firebase.storage(),
  auth: firebase.auth()
} : null;

// Ensure signed in (anon ok)
if (F) {
  F.auth.signInAnonymously().catch(console.warn);
}

// Collections approach, with fallback to localStorage snapshot if Firestore isn’t available.
const Local = {
  read() {
    const raw = localStorage.getItem('vytron_db');
    return raw ? JSON.parse(raw) : { machines:[], parts:[], repairs:[] };
  },
  write(data) {
    localStorage.setItem('vytron_db', JSON.stringify(data));
  }
};

const DB = {
  // ----- PARTS -----
  async listParts() {
    if (!F) return Local.read().parts;
    const snap = await F.db.collection('parts').orderBy('partNo').get();
    return snap.docs.map(d=>({ id:d.id, ...d.data() }));
  },
  async getPartByNo(partNo) {
    if (!F) return Local.read().parts.find(p=>p.partNo===partNo) || null;
    const q = await F.db.collection('parts').where('partNo','==',partNo).limit(1).get();
    return q.empty ? null : ({ id:q.docs[0].id, ...q.docs[0].data() });
  },
  async savePart(part) {
    const data = {
      partNo: part.partNo,
      desc: part.desc || '',
      qty: Number(part.qty||0),
      min: Number(part.min||0),
      bin: part.bin || '',
      vendor: part.vendor || '',
      updated: Date.now(),
      created: part.created || Date.now()
    };
    if (!F) {
      const db = Local.read();
      const i = db.parts.findIndex(x=>x.partNo===data.partNo);
      if (i>=0) db.parts[i] = { ...db.parts[i], ...data };
      else db.parts.push({ ...data, id: crypto.randomUUID() });
      Local.write(db);
      return;
    }
    const existing = await this.getPartByNo(data.partNo);
    if (existing) {
      await F.db.collection('parts').doc(existing.id).set({ ...existing, ...data }, { merge:true });
    } else {
      await F.db.collection('parts').add(data);
    }
  },
  async adjustQty(partNo, delta) {
    if (!F) {
      const db = Local.read();
      const i = db.parts.findIndex(x=>x.partNo===partNo);
      if (i>=0) { db.parts[i].qty = Math.max(0, (db.parts[i].qty||0) + Number(delta)); db.parts[i].updated = Date.now(); }
      Local.write(db);
      return;
    }
    const p = await this.getPartByNo(partNo);
    if (!p) return;
    const newQty = Math.max(0, Number(p.qty||0) + Number(delta));
    await F.db.collection('parts').doc(p.id).update({ qty:newQty, updated:Date.now() });
  },

  // ----- REPAIRS (for export) -----
  async listRepairs() {
    if (!F) return Local.read().repairs;
    const snap = await F.db.collection('repairs').orderBy('created','desc').get();
    return snap.docs.map(d=>({ id:d.id, ...d.data() }));
  },

  // ----- MACHINES (for export context) -----
  async listMachines() {
    if (!F) return Local.read().machines;
    const snap = await F.db.collection('machines').orderBy('displayName').get();
    return snap.docs.map(d=>({ id:d.id, ...d.data() }));
  }
};

// ========================
// OCR helpers (Parts labels)
// ========================
function parsePartFromText(txt) {
  const t = (txt || '').replace(/\s{2,}/g,' ').trim();

  // Tokens that contain letters+digits (skip common noise)
  const tokens = t.split(/[\s,;:/\[\]\(\)]+/).filter(x=>x.length>=3);
  const skip = /^(MADE|IN|CENTRALE|LISTED|CLASS|SPEC|FRAME|SER|VOLTS?|HZ|VDC|VAC|QTY|PCS|DATE|CODE)$/i;
  const isPN = s => /[A-Z]/i.test(s) && /\d/.test(s) && !skip.test(s);

  // Brand hints (tune as you see labels)
  let partNo =
      (tokens.find(x=>/^DFS?25[A-Z0-9-]+$/i.test(x)))       // SICK DFS25A-...
   || (tokens.find(x=>/^\d{4,}[A-Z]\d{2,}$/i.test(x)))      // Socomec style
   || (tokens.find(isPN))
   || '';

  const cleaned = t.replace(/\b(MADE IN [A-Z]+|CENTRALE.*|LISTED.*|CE\b)/ig,'').trim();
  const desc = cleaned.slice(0, 140);

  return { partNo, desc };
}

async function handleLabelOCR(file) {
  if (!file) return alert('Choose a label photo first.');
  const worker = await Tesseract.createWorker('eng');
  const { data:{ text } } = await worker.recognize(file);
  await worker.terminate();

  const { partNo, desc } = parsePartFromText(text || '');
  if (partNo) document.getElementById('p_partNo').value = partNo;
  if (desc)   document.getElementById('p_desc').value   = desc;

  const auto = document.getElementById('autoAddNew');
  if (auto && auto.checked && partNo) {
    await DB.savePart({ partNo, desc, qty: 0, min: 0, bin: '', vendor: '' });
    await refresh();
  }
  alert('Label read. Check fields and Save/Update if needed.');
}

// ========================
// Barcode
// ========================
let codeReader;
async function startScanner(){
  const video = document.getElementById('preview');
  try{
    codeReader = new ZXing.BrowserMultiFormatReader();
    video.classList.remove('hide');
    const devices = await codeReader.listVideoInputDevices();
    const deviceId = (devices[0]||{}).deviceId;
    const result = await codeReader.decodeOnceFromVideoDevice(deviceId, 'preview');
    document.getElementById('p_partNo').value = result.text || '';
    video.classList.add('hide');
    try{ codeReader.reset(); } catch {}
  } catch(e){
    console.warn('Live scan unavailable', e);
    alert('Live camera scan not available in this browser/context. Use OCR Label or take a photo of the barcode.');
  }
}

// ========================
// CSV Exports
// ========================
function toCSV(rows) {
  if (!rows.length) return '';
  const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
  const keys = Object.keys(rows[0]);
  const head = keys.map(esc).join(',');
  const body = rows.map(r=> keys.map(k=>esc(r[k])).join(',')).join('\n');
  return head + '\n' + body;
}
function download(name, text, mime='text/csv') {
  const blob = new Blob([text], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

async function exportPartsCsv(){
  const parts = await DB.listParts();
  const rows = parts.map(p=>({
    partNo:p.partNo, desc:p.desc, qty:p.qty||0, min:p.min||0, bin:p.bin||'', vendor:p.vendor||'',
    updated:p.updated || p.created || ''
  }));
  download('parts.csv', toCSV(rows));
}
async function exportRepairsCsv(){
  const [repairs, machines] = await Promise.all([DB.listRepairs(), DB.listMachines()]);
  const mIndex = Object.fromEntries(machines.map(m=>[m.id, m.displayName || m.model || m.serial || '']));
  const rows = repairs.map(r=>({
    when: r.when || (r.created ? new Date(r.created).toISOString() : ''),
    machine: mIndex[r.machineId] || '',
    fault: r.fault || '',
    steps: r.steps || '',
    downtimeMin: r.downtimeMin || 0,
    parts: (r.parts||[]).join('|')
  }));
  download('repairs.csv', toCSV(rows));
}

// ========================
// UI wiring
// ========================
async function refresh(){
  const q = (document.getElementById('partsSearch').value||'').toLowerCase();
  const list = document.getElementById('partsList');
  const parts = await DB.listParts();
  const filtered = parts.filter(p=> (p.partNo||'').toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q));

  list.innerHTML = filtered.map(p=>`
    <li>
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
        <div>
          <strong>${p.partNo||'(no part #)'}</strong> — ${p.desc||''}<br>
          Bin: ${p.bin||'-'} — On hand: ${p.qty||0} (min ${p.min||0})
          ${ (p.qty||0) <= (p.min||0) ? '<span style="color:#f88"> LOW</span>' : '' }
        </div>
        <div style="display:flex;gap:6px">
          <button class="qtyBtn" data-no="${p.partNo}" data-delta="1">+1</button>
          <button class="qtyBtn" data-no="${p.partNo}" data-delta="-1">-1</button>
        </div>
      </div>
    </li>
  `).join('');

  // Low stock count
  const low = parts.filter(p=>(p.qty||0) <= (p.min||0)).length;
  const lbl = document.getElementById('lowStockCount');
  if (lbl) lbl.textContent = low ? `Low stock items: ${low}` : 'All parts above min.';

  // Wire buttons
  list.querySelectorAll('.qtyBtn').forEach(b=>{
    b.addEventListener('click', async ()=>{
      await DB.adjustQty(b.dataset.no, Number(b.dataset.delta));
      await refresh();
    });
  });
}

document.getElementById('p_runOCR').addEventListener('click', async ()=>{
  const f = document.getElementById('p_labelPhoto').files[0];
  await handleLabelOCR(f);
});
document.getElementById('startScanner').addEventListener('click', startScanner);
document.getElementById('savePart').addEventListener('click', async ()=>{
  const p = {
    partNo: document.getElementById('p_partNo').value.trim(),
    desc:   document.getElementById('p_desc').value.trim(),
    qty:    Number(document.getElementById('p_qty').value||0),
    min:    Number(document.getElementById('p_min').value||0),
    bin:    document.getElementById('p_bin').value.trim(),
    vendor: document.getElementById('p_vendor').value.trim()
  };
  if (!p.partNo) return alert('Part # required.');
  await DB.savePart(p);
  await refresh();
  alert('Saved/updated part.');
});
document.getElementById('partsSearch').addEventListener('input', refresh);
document.getElementById('exportPartsCsv').addEventListener('click', exportPartsCsv);
document.getElementById('exportRepairsCsv').addEventListener('click', exportRepairsCsv);

// Initial load
refresh();
