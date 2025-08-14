// Firebase access (for saves if you already save machines here)
const F = (window.firebase && window.firebase.apps && window.firebase.apps.length) ? {
  db: firebase.firestore(),
  auth: firebase.auth()
} : null;

if (F) { F.auth.signInAnonymously().catch(()=>{}); }

const Machines = {
  async save(m) {
    if (!F) {
      // local fallback only (if you don't use Firestore on this page)
      const raw = localStorage.getItem('vytron_db');
      const db = raw ? JSON.parse(raw) : { machines:[], parts:[], repairs:[] };
      db.machines.push({ ...m, id: crypto.randomUUID(), created: Date.now() });
      localStorage.setItem('vytron_db', JSON.stringify(db));
      return;
    }
    await F.db.collection('machines').add({ ...m, created: Date.now() });
  }
};

// -------- Plate OCR parsing tuned for your plant --------
function parsePlateText(text){
  const lines = (text||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const whole = lines.join(' ');

  // Vytron blue plate often shows "NO."
  const vytron = (whole.match(/\bNO\.?\s*([A-Z0-9-]+)/i)||[])[1] || '';

  const mfg = (lines.find(l=>/\b(BALDOR|SIEMENS|STERLING|WEG|ABB|SEW|LENZE|SICK)\b/i.test(l))||'').trim();
  const model = (whole.match(/\b(MODEL|CAT\.?\s*NO|TYPE)\s*[:#]?\s*([A-Z0-9-]+)/i)||[])[2]
             || (lines.find(l=>/^[A-Z0-9-]{4,}$/.test(l))||'');
  const serial = (whole.match(/\b(SER(IAL)?|S\/N)\s*[:#]?\s*([A-Z0-9-]+)/i)||[])[3] || '';
  const volts = (whole.match(/\bVOLTS?\s*[:#]?\s*([0-9/]+)\b/i)||[])[1] || '';
  const amps  = (whole.match(/\bAMPS?\s*[:#]?\s*([0-9.\/]+)\b/i)||[])[1] || '';

  return { mfg, model, serial, volts, amps, vytron };
}

async function runPlateOCR(file){
  if(!file) return alert('Choose a plate photo first.');
  const worker = await Tesseract.createWorker('eng');
  const { data:{ text } } = await worker.recognize(file);
  await worker.terminate();

  const { mfg, model, serial, volts, amps, vytron } = parsePlateText(text || '');
  if (mfg)   document.getElementById('m_mfg').value    = mfg;
  if (model) document.getElementById('m_model').value  = model;
  if (serial)document.getElementById('m_serial').value = serial;
  if (volts) document.getElementById('m_volts').value  = volts;
  if (amps)  document.getElementById('m_amps').value   = amps;
  if (vytron)document.getElementById('m_vytron').value = vytron;

  alert('Plate OCR complete. Review fields and Save.');
}

// Wire up UI
const btn = document.getElementById('runPlateOCR');
if (btn) {
  btn.addEventListener('click', async ()=>{
    const f = document.getElementById('machinePhoto').files[0];
    await runPlateOCR(f);
  });
}

const saveBtn = document.getElementById('saveMachine');
if (saveBtn) {
  saveBtn.addEventListener('click', async ()=>{
    const m = {
      displayName: (document.getElementById('m_displayName')||{}).value || '',
      vytronTag: (document.getElementById('m_vytron')||{}).value || '',
      mfg: (document.getElementById('m_mfg')||{}).value || '',
      model: (document.getElementById('m_model')||{}).value || '',
      serial: (document.getElementById('m_serial')||{}).value || '',
      volts: (document.getElementById('m_volts')||{}).value || '',
      amps: (document.getElementById('m_amps')||{}).value || '',
      area: (document.getElementById('m_area')||{}).value || ''
    };
    await Machines.save(m);
    alert('Machine saved.');
  });
}
