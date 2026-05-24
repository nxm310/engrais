/* ==========================================
   VICON — Gestion Engrais
   Core Logic & State Management
   ========================================== */

// Default champagne parcels
const DEFAULT_PARCELS = [
  { nom: "40 Rangs meunier", cul: "vigne champenoise", surface: 0.43, lon: 100, rg: 40 },
  { nom: "6 rangs Malivas", cul: "vigne champenoise", surface: 0.04, lon: 80, rg: 6 },
  { nom: "Asperges", cul: "vigne champenoise", surface: 0.02, lon: 50, rg: 5 },
  { nom: "Catherine", cul: "vigne champenoise", surface: 0.06, lon: 40, rg: 14 },
  { nom: "Chauffours Chardonnay", cul: "vigne champenoise", surface: 0.35, lon: 140, rg: 140 },
  { nom: "Chauffours Meuniers", cul: "vigne champenoise", surface: 0.53, lon: 140, rg: 140 },
  { nom: "Chauffours meuniers Gr", cul: "vigne champenoise", surface: 0.36, lon: 140, rg: 140 },
  { nom: "Le Barré", cul: "vigne champenoise", surface: 0.31, lon: 150, rg: 21 },
  { nom: "Le rez", cul: "vigne champenoise", surface: 0.06, lon: 40, rg: 15 },
  { nom: "les 7 Rangs", cul: "vigne champenoise", surface: 0.07, lon: 100, rg: 7 },
  { nom: "Les Hayes", cul: "vigne champenoise", surface: 0.39, lon: 50, rg: 80 },
  { nom: "Les Petits Pinots", cul: "vigne champenoise", surface: 0.11, lon: 60, rg: 15 },
  { nom: "Les Russiaux", cul: "vigne champenoise", surface: 0.23, lon: 100, rg: 11 },
  { nom: "Malivas Chardonnay", cul: "vigne champenoise", surface: 0.26, lon: 140, rg: 17 },
  { nom: "Malivas Pinot", cul: "vigne champenoise", surface: 0.15, lon: 140, rg: 11 },
  { nom: "montagne de Reims", cul: "vigne champenoise", surface: 0.21, lon: 90, rg: 20 },
  { nom: "Pelles à Fours", cul: "vigne champenoise", surface: 0.23, lon: 130, rg: 15 },
  { nom: "Poncelet", cul: "vigne champenoise", surface: 0.26, lon: 130, rg: 21 }
];

const BAG_WEIGHT = 25; // 25 kg bags
const KEYS = {
  CAMPAIGNS: 'vicon_campaigns_list',
  ACTIVE_CAMP: 'vicon_active_campaign_id',
  PARCELS: 'vicon_parcels_custom',
  HISTORY: 'vicon_treatment_history'
};

// Global reactive-like state
let State = {
  campaigns: {},      // Map of id -> campaign object
  activeCampaignId: '',
  parcels: [],        // Custom parcels list
  history: [],        // Passage logs
  currentParcelIndex: null,
  parcelMarkedDone: false,
  deleteTargetId: null,
  deleteTargetAll: false,
  editingParcelIndex: null // null = adding, index = editing
};

// ── UTILITIES ──
function r2(v) {
  return Math.round(v * 100) / 100;
}

function generateId() {
  return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️'}</span>
    <span>${msg}</span>
  `;
  el.className = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── BUSINESS CALCULATIONS ──
function calcP(p, targetQteHa, rowsA = 9, rowsB = 11) {
  const tk = r2(p.surface * targetQteHa); // Total kg target
  const ts = r2(tk / BAG_WEIGHT);          // Total bags target
  
  // Formulas for 9 & 11 rows:
  // kg_descente = (targetQte * length * rowsCount) / 10000
  const k9 = r2(targetQteHa * p.lon * rowsA / 10000);
  const k11 = r2(targetQteHa * p.lon * rowsB / 10000);
  
  return {
    tk,
    ts,
    k9,
    s9: r2(k9 / BAG_WEIGHT),
    k11,
    s11: r2(k11 / BAG_WEIGHT)
  };
}

// ── STATE PERSISTENCE ──
function loadState() {
  try {
    // 1. Load Custom Parcels or fallback to default
    const savedParcels = localStorage.getItem(KEYS.PARCELS);
    if (savedParcels) {
      State.parcels = JSON.parse(savedParcels);
    } else {
      State.parcels = [...DEFAULT_PARCELS];
      localStorage.setItem(KEYS.PARCELS, JSON.stringify(State.parcels));
    }

    // 2. Load Campaigns list
    const savedCampaigns = localStorage.getItem(KEYS.CAMPAIGNS);
    if (savedCampaigns) {
      State.campaigns = JSON.parse(savedCampaigns);
    } else {
      // Create first default campaign
      const defaultCampId = generateId();
      State.campaigns[defaultCampId] = {
        id: defaultCampId,
        name: 'Campagne Printemps ' + new Date().getFullYear(),
        date: new Date().toISOString().slice(0, 10),
        ref: 'NPK 15-15-15',
        qte: 1000,
        sacsTot: 100,
        rowsA: 9,
        rowsB: 11
      };
      localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(State.campaigns));
    }

    // 3. Load Active Campaign ID
    const savedActiveId = localStorage.getItem(KEYS.ACTIVE_CAMP);
    if (savedActiveId && State.campaigns[savedActiveId]) {
      State.activeCampaignId = savedActiveId;
    } else {
      State.activeCampaignId = Object.keys(State.campaigns)[0];
      localStorage.setItem(KEYS.ACTIVE_CAMP, State.activeCampaignId);
    }

    // 4. Load History
    const savedHistory = localStorage.getItem(KEYS.HISTORY);
    State.history = savedHistory ? JSON.parse(savedHistory) : [];
  } catch (err) {
    console.error('State load failed, resetting locally', err);
    State.parcels = [...DEFAULT_PARCELS];
    State.history = [];
  }
}

function saveState() {
  localStorage.setItem(KEYS.PARCELS, JSON.stringify(State.parcels));
  localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(State.campaigns));
  localStorage.setItem(KEYS.ACTIVE_CAMP, State.activeCampaignId);
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(State.history));
}

// ── ACTIVE CAMPAIGN ACCESSR ──
function getActiveCamp() {
  return State.campaigns[State.activeCampaignId];
}

// ── RENDER & DATA BINDING ──

function populateCampaignSelector() {
  const select = document.getElementById('g-camp-select');
  if (!select) return;
  
  select.innerHTML = '';
  Object.keys(State.campaigns).forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = State.campaigns[id].name;
    opt.selected = (id === State.activeCampaignId);
    select.appendChild(opt);
  });
}

function updateCampagneUI() {
  const camp = getActiveCamp();
  if (!camp) return;

  document.getElementById('g-date').value = camp.date || new Date().toISOString().slice(0, 10);
  document.getElementById('g-ref').value = camp.ref || '';
  document.getElementById('g-qte').value = camp.qte || 1000;
  document.getElementById('g-sacs-tot').value = camp.sacsTot || '';
  document.getElementById('g-rows-a').value = camp.rowsA || 9;
  document.getElementById('g-rows-b').value = camp.rowsB || 11;

  updateStockBox();
}

function updateStockBox() {
  const camp = getActiveCamp();
  const box = document.getElementById('sac-box');
  if (!camp || !box) return;

  const tot = parseFloat(camp.sacsTot);
  if (!tot || isNaN(tot)) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'flex';

  // Filters history logs matching current campaign
  const campLogs = State.history.filter(e => e.campaignId === State.activeCampaignId);

  // Sum real bags used (or default to calculated theoretical if blank)
  const used = r2(campLogs.reduce((acc, log) => acc + (parseFloat(log.sr) || 0), 0));
  const calc = r2(campLogs.reduce((acc, log) => acc + (parseFloat(log.ts) || 0), 0));
  const rem = r2(tot - used);
  const delta = r2(calc - used);

  document.getElementById('sac-used').textContent = used;
  
  const remEl = document.getElementById('sac-rem');
  remEl.textContent = rem;
  remEl.style.color = (rem < 0 || rem < 5) ? 'var(--neon-red)' : 'var(--neon-amber)';

  const deltaEl = document.getElementById('sac-delta');
  const deltaCell = document.getElementById('sac-delta-cell');
  const deltaSub = document.getElementById('sac-delta-sub');
  
  deltaEl.textContent = (delta >= 0 ? '+' : '') + delta;
  deltaCell.className = 'stock-cell ' + (delta >= 0 ? 'delta-pos' : 'delta-neg');
  deltaEl.style.color = delta >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';
  deltaSub.textContent = delta >= 0 ? 'économie de sacs' : 'dépassement';
}

function populateParcelSelector() {
  const select = document.getElementById('psel');
  if (!select) return;

  // Preserve selected value if any
  const previousVal = select.value;
  select.innerHTML = '<option value="">— Choisir une parcelle —</option>';

  // Filter out parcels that are marked 'done' for the current campaign
  const campLogs = State.history.filter(e => e.campaignId === State.activeCampaignId && e.done);
  const doneParcelNames = new Set(campLogs.map(e => e.nom));

  State.parcels.forEach((p, idx) => {
    if (doneParcelNames.has(p.nom)) return; // Exclude done parcels!
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = p.nom;
    select.appendChild(opt);
  });

  if (previousVal !== '' && State.parcels[previousVal] && !doneParcelNames.has(State.parcels[previousVal].nom)) {
    select.value = previousVal;
  } else {
    select.value = '';
    if (document.getElementById('fiche')) {
      document.getElementById('fiche').style.display = 'none';
    }
    State.currentParcelIndex = null;
  }
}

function renderParcelProgress() {
  const campLogs = State.history.filter(e => e.campaignId === State.activeCampaignId && e.done);
  const uniqueDoneNames = new Set(campLogs.map(e => e.nom));
  
  const total = State.parcels.length;
  const done = uniqueDoneNames.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const bar = document.getElementById('pbar');
  const lbl = document.getElementById('plbl');
  if (bar) bar.style.width = pct + '%';
  if (lbl) lbl.textContent = `${done} / ${total} parcelles traitées (${pct}%)`;
}

function loadSelectedParcel() {
  const select = document.getElementById('psel');
  const fiche = document.getElementById('fiche');
  if (!select || !fiche) return;

  const val = select.value;
  if (val === '') {
    fiche.style.display = 'none';
    State.currentParcelIndex = null;
    return;
  }

  State.currentParcelIndex = parseInt(val);
  State.parcelMarkedDone = false;
  
  document.getElementById('cbox').classList.remove('checked');
  document.getElementById('sr-input').value = '';

  renderParcelCard();
  fiche.style.display = 'block';
}

function renderParcelCard() {
  if (State.currentParcelIndex === null) return;
  const p = State.parcels[State.currentParcelIndex];
  const camp = getActiveCamp();
  const targetQ = camp ? camp.qte : 1000;
  const rowsA = camp ? (camp.rowsA || 9) : 9;
  const rowsB = camp ? (camp.rowsB || 11) : 11;
  
  const c = calcP(p, targetQ, rowsA, rowsB);

  document.getElementById('lbl-rows-a').textContent = `${rowsA} rangs`;
  document.getElementById('lbl-rows-b').textContent = `${rowsB} rangs`;

  document.getElementById('f-nom').textContent = p.nom;
  document.getElementById('f-cul').textContent = p.cul;
  document.getElementById('f-surf').textContent = p.surface + ' ha';
  document.getElementById('f-lon').textContent = p.lon + ' m';
  document.getElementById('f-rg').textContent = p.rg;

  document.getElementById('d9s').innerHTML = `<strong>${c.s9}</strong> sac${c.s9 > 1 ? 's' : ''}`;
  document.getElementById('d9k').innerHTML = `<strong>${c.k9}</strong> kg`;
  document.getElementById('d11s').innerHTML = `<strong>${c.s11}</strong> sac${c.s11 > 1 ? 's' : ''}`;
  document.getElementById('d11k').innerHTML = `<strong>${c.k11}</strong> kg`;

  document.getElementById('t-kg').textContent = c.tk;
  document.getElementById('t-sc').textContent = c.ts;
  document.getElementById('t-ha').textContent = p.surface;
  
  document.getElementById('sr-note').textContent = `Valeur calculée : ${c.ts} sacs. Saisissez une valeur réelle ou laissez vide pour utiliser celle-ci.`;

  updateRealBagsOutput();
}

function updateRealBagsOutput() {
  if (State.currentParcelIndex === null) return;
  const p = State.parcels[State.currentParcelIndex];
  const camp = getActiveCamp();
  const rowsA = camp ? (camp.rowsA || 9) : 9;
  const rowsB = camp ? (camp.rowsB || 11) : 11;
  const c = calcP(p, camp ? camp.qte : 1000, rowsA, rowsB);

  const inputVal = document.getElementById('sr-input').value;
  const realBags = inputVal === '' ? c.ts : (parseFloat(inputVal) || c.ts);
  
  document.getElementById('t-sr').textContent = isNaN(realBags) ? '—' : realBags;
}

function toggleParcelDone() {
  State.parcelMarkedDone = !State.parcelMarkedDone;
  document.getElementById('cbox').classList.toggle('checked', State.parcelMarkedDone);
}

// ── SAVE PASSAGE RECORD ──
function savePassage() {
  if (State.currentParcelIndex === null) return;
  const p = State.parcels[State.currentParcelIndex];
  const camp = getActiveCamp();
  if (!camp) return;

  const q = parseFloat(camp.qte) || 1000;
  const rowsA = camp.rowsA || 9;
  const rowsB = camp.rowsB || 11;
  const c = calcP(p, q, rowsA, rowsB);
  
  const inputVal = document.getElementById('sr-input').value;
  const sr = inputVal === '' ? c.ts : (parseFloat(inputVal) || c.ts);

  const passage = {
    id: Date.now(),
    campaignId: State.activeCampaignId,
    date: document.getElementById('g-date').value,
    ref: document.getElementById('g-ref').value.trim(),
    q,
    sr,
    nom: p.nom,
    cul: p.cul,
    surface: p.surface,
    lon: p.lon,
    rg: p.rg,
    done: State.parcelMarkedDone,
    tk: c.tk,
    ts: c.ts,
    k9: c.k9,
    s9: c.s9,
    k11: c.k11,
    s11: c.s11,
    rowsA,
    rowsB
  };

  // Add to start of history array
  State.history.unshift(passage);
  saveState();

  // Reset form UI
  State.currentParcelIndex = null;
  State.parcelMarkedDone = false;
  document.getElementById('psel').value = '';
  document.getElementById('fiche').style.display = 'none';
  document.getElementById('sr-input').value = '';
  document.getElementById('cbox').classList.remove('checked');

  // Update overall UI
  updateStockBox();
  renderParcelProgress();
  renderHistoryList();
  populateParcelSelector(); // Re-populate to filter out the completed parcel!
  
  toast('✅ Parcelle enregistrée dans l\'historique', 'success');
}

// ── HISTORY STUFF ──
function renderHistoryList() {
  const listEl = document.getElementById('hlist');
  if (!listEl) return;

  // Filter logs for the active campaign
  const campLogs = State.history.filter(e => e.campaignId === State.activeCampaignId);

  if (campLogs.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M9 11H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="8" rx="1"/>
        </svg>
        <p>Aucun enregistrement pour cette campagne.<br>Sélectionnez une parcelle et enregistrez-la.</p>
      </div>`;
    return;
  }

  function fmtDate(dStr) {
    if (!dStr) return '—';
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  listEl.innerHTML = campLogs.map(e => `
    <div class="history-card glass-panel">
      <div class="history-card-head">
        <div class="history-card-name">${e.nom}</div>
        <div class="history-card-chips">
          <span class="chip ${e.done ? 'green' : 'amber'}">${e.done ? '✅ Traitée' : '⏳ En attente'}</span>
          <span class="chip blue">📅 ${fmtDate(e.date)}</span>
          ${e.ref ? `<span class="chip dim">🧪 ${e.ref}</span>` : ''}
        </div>
      </div>
      <div class="history-card-body">
        <div class="history-card-row">
          <div class="history-meta-item">Réf. Engrais : <span contenteditable="true" class="editable" data-id="${e.id}" data-field="ref">${e.ref || '—'}</span></div>
          <div class="history-meta-item">Dose ciblée : <strong>${e.q} kg/ha</strong></div>
          <div class="history-meta-item">Surface : <strong>${e.surface} ha</strong></div>
          <div class="history-meta-item">Rangs : <strong>${e.rg}</strong> × ${e.lon} m</div>
        </div>
        <div class="history-card-row">
          <div class="history-meta-item blue">Total calculé : <strong>${e.tk} kg</strong> / <strong>${e.ts} sacs</strong></div>
          <div class="history-meta-item anonymous">Sacs réels épandus : <span contenteditable="true" class="editable" data-id="${e.id}" data-field="sr" data-type="number">${e.sr}</span></div>
        </div>
        <div class="history-card-foot">
          <button class="btn btn-glass btn-sm btn-toggle-done" data-id="${e.id}">
            ${e.done ? '↩ Non traitée' : '✅ Marquer traitée'}
          </button>
          <button class="btn btn-glass btn-sm btn-export-pdf-single" data-id="${e.id}">
            📄 Exporter PDF
          </button>
          <button class="btn btn-danger btn-sm btn-delete-single" data-id="${e.id}">
            🗑 Supprimer
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Bind inline event listeners for editable elements
  listEl.querySelectorAll('.editable').forEach(cell => {
    cell.addEventListener('blur', (evt) => {
      const id = parseInt(evt.target.getAttribute('data-id'));
      const field = evt.target.getAttribute('data-field');
      const isNum = evt.target.getAttribute('data-type') === 'number';
      const textVal = evt.target.textContent.trim();
      
      const record = State.history.find(x => x.id === id);
      if (record) {
        if (isNum) {
          const val = parseFloat(textVal);
          if (!isNaN(val)) {
            record[field] = val;
          } else {
            // Restore previous
            evt.target.textContent = record[field];
            toast('Veuillez entrer un nombre valide', 'warn');
            return;
          }
        } else {
          record[field] = textVal === '—' ? '' : textVal;
        }
        
        saveState();
        updateStockBox();
        renderHistoryList(); // Refreshes text and styles
      }
    });

    // Handle Enter key on contenteditable
    cell.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') {
        evt.preventDefault();
        evt.target.blur();
      }
    });
  });

  // Bind action buttons
  listEl.querySelectorAll('.btn-toggle-done').forEach(btn => {
    btn.addEventListener('click', (evt) => {
      const id = parseInt(evt.currentTarget.getAttribute('data-id'));
      const record = State.history.find(x => x.id === id);
      if (record) {
        record.done = !record.done;
        saveState();
        renderHistoryList();
        renderParcelProgress();
      }
    });
  });

  listEl.querySelectorAll('.btn-export-pdf-single').forEach(btn => {
    btn.addEventListener('click', (evt) => {
      const id = parseInt(evt.currentTarget.getAttribute('data-id'));
      exportSinglePDF(id);
    });
  });

  listEl.querySelectorAll('.btn-delete-single').forEach(btn => {
    btn.addEventListener('click', (evt) => {
      const id = parseInt(evt.currentTarget.getAttribute('data-id'));
      openDeleteDialog(id, false);
    });
  });
}

// ── DELETE DIALOG HANDLERS ──
function openDeleteDialog(targetId, all) {
  const dialog = document.getElementById('delete-dialog');
  if (!dialog) return;

  State.deleteTargetId = targetId;
  State.deleteTargetAll = all;

  const title = dialog.querySelector('h3');
  const desc = dialog.querySelector('.dialog-desc');

  if (all) {
    title.textContent = '🗑️ Supprimer tout l\'historique ?';
    desc.innerHTML = 'Cette action est irréversible. <strong>Toutes</strong> les entrées de l\'historique de cette campagne seront définitivement supprimées.';
  } else {
    title.textContent = '🗑️ Supprimer l\'entrée ?';
    desc.textContent = 'Cette action est irréversible. L\'enregistrement sélectionné sera définitivement retiré de l\'historique.';
  }

  dialog.showModal();
}

function closeDeleteDialog() {
  const dialog = document.getElementById('delete-dialog');
  if (dialog) dialog.close();
  State.deleteTargetId = null;
  State.deleteTargetAll = false;
}

function confirmDelete() {
  if (State.deleteTargetAll) {
    // Delete only for the current active campaign
    State.history = State.history.filter(e => e.campaignId !== State.activeCampaignId);
    toast('🗑️ Tout l\'historique de la campagne a été effacé', 'info');
  } else if (State.deleteTargetId) {
    State.history = State.history.filter(e => e.id !== State.deleteTargetId);
    toast('🗑️ Enregistrement supprimé', 'info');
  }

  saveState();
  closeDeleteDialog();
  
  // Refresh UI
  updateStockBox();
  renderParcelProgress();
  renderHistoryList();
}

// ── MULTI-CAMPAIGN MANAGER ──
function openCampaignDialog() {
  const dialog = document.getElementById('campaign-dialog');
  if (!dialog) return;

  const camp = getActiveCamp();
  
  // Prefill active campaign fields for potential editing/cloning
  document.getElementById('c-name').value = camp ? camp.name : '';
  
  dialog.showModal();
}

function closeCampaignDialog() {
  const dialog = document.getElementById('campaign-dialog');
  if (dialog) dialog.close();
}

function saveCampaign() {
  const name = document.getElementById('c-name').value.trim();
  if (!name) {
    toast('Veuillez spécifier un nom de campagne', 'warn');
    return;
  }

  const activeCamp = getActiveCamp();
  const id = generateId();
  
  // Creates a new campaign by duplicating the previous settings but resetting the name
  const newCamp = {
    id,
    name,
    date: new Date().toISOString().slice(0, 10),
    ref: activeCamp ? activeCamp.ref : 'NPK 15-15-15',
    qte: activeCamp ? activeCamp.qte : 1000,
    sacsTot: activeCamp ? activeCamp.sacsTot : 100,
    rowsA: activeCamp ? (activeCamp.rowsA || 9) : 9,
    rowsB: activeCamp ? (activeCamp.rowsB || 11) : 11
  };

  State.campaigns[id] = newCamp;
  State.activeCampaignId = id;
  
  saveState();
  closeCampaignDialog();
  
  populateCampaignSelector();
  updateCampagneUI();
  
  // Reset selected parcel and active history list
  State.currentParcelIndex = null;
  document.getElementById('psel').value = '';
  document.getElementById('fiche').style.display = 'none';

  renderParcelProgress();
  renderHistoryList();
  populateParcelSelector();
  
  toast(`📅 Nouvelle campagne "${name}" créée`, 'success');
}

function changeActiveCampaign(id) {
  if (!State.campaigns[id]) return;
  
  State.activeCampaignId = id;
  saveState();
  
  updateCampagneUI();
  
  // Reset selected parcel state
  State.currentParcelIndex = null;
  document.getElementById('psel').value = '';
  document.getElementById('fiche').style.display = 'none';

  renderParcelProgress();
  renderHistoryList();
  populateParcelSelector();
  
  toast(`Campagne commutée : ${State.campaigns[id].name}`, 'info');
}

function deleteCurrentCampaign() {
  const keys = Object.keys(State.campaigns);
  if (keys.length <= 1) {
    toast('Impossible de supprimer la seule campagne existante', 'error');
    return;
  }

  const campToDelete = getActiveCamp();
  const confirmDel = confirm(`Voulez-vous vraiment supprimer la campagne "${campToDelete.name}" ainsi que tout son historique ?`);
  if (!confirmDel) return;

  // Filter history logs for the deleted campaign
  State.history = State.history.filter(e => e.campaignId !== State.activeCampaignId);
  
  // Delete campaign
  delete State.campaigns[State.activeCampaignId];
  
  // Fallback to first campaign
  State.activeCampaignId = Object.keys(State.campaigns)[0];
  
  saveState();
  
  populateCampaignSelector();
  updateCampagneUI();
  renderParcelProgress();
  renderHistoryList();
  populateParcelSelector();
  
  toast(`Campagne "${campToDelete.name}" supprimée`, 'info');
}

// ── INTERACTIVE PARCEL EDITOR ──
function openParcelEditorDialog(isEditing = false) {
  const dialog = document.getElementById('parcel-editor-dialog');
  if (!dialog) return;

  const title = dialog.querySelector('h3');
  State.editingParcelIndex = isEditing ? State.currentParcelIndex : null;

  if (isEditing && State.editingParcelIndex !== null) {
    const p = State.parcels[State.editingParcelIndex];
    title.textContent = '✏️ Modifier la parcelle';
    document.getElementById('p-nom').value = p.nom;
    document.getElementById('p-cul').value = p.cul;
    document.getElementById('p-surf').value = p.surface;
    document.getElementById('p-lon').value = p.lon;
    document.getElementById('p-rg').value = p.rg;
    
    document.getElementById('btn-delete-parcel').style.display = 'inline-flex';
  } else {
    title.textContent = '➕ Ajouter une parcelle';
    document.getElementById('p-nom').value = '';
    document.getElementById('p-cul').value = 'vigne champenoise';
    document.getElementById('p-surf').value = '';
    document.getElementById('p-lon').value = '';
    document.getElementById('p-rg').value = '';
    
    document.getElementById('btn-delete-parcel').style.display = 'none';
  }

  dialog.showModal();
}

function closeParcelEditorDialog() {
  const dialog = document.getElementById('parcel-editor-dialog');
  if (dialog) dialog.close();
  State.editingParcelIndex = null;
}

function saveParcelForm() {
  const nom = document.getElementById('p-nom').value.trim();
  const cul = document.getElementById('p-cul').value.trim();
  const surface = parseFloat(document.getElementById('p-surf').value);
  const lon = parseFloat(document.getElementById('p-lon').value);
  const rg = parseInt(document.getElementById('p-rg').value);

  if (!nom || isNaN(surface) || isNaN(lon) || isNaN(rg)) {
    toast('Veuillez remplir tous les champs numériques requis', 'warn');
    return;
  }

  const parcelObj = { nom, cul, surface, lon, rg };

  if (State.editingParcelIndex !== null) {
    // Edit existing
    State.parcels[State.editingParcelIndex] = parcelObj;
    toast(`📍 Parcelle "${nom}" mise à jour`, 'success');
  } else {
    // Add new
    State.parcels.push(parcelObj);
    toast(`📍 Nouvelle parcelle "${nom}" ajoutée`, 'success');
  }

  saveState();
  closeParcelEditorDialog();
  
  // Refresh parcel selectors and progression details
  populateParcelSelector();
  renderAdminParcelsList();
  
  if (State.editingParcelIndex !== null && State.currentParcelIndex === State.editingParcelIndex) {
    // Re-trigger load to refresh values inside card
    loadSelectedParcel();
  }
  
  renderParcelProgress();
}

function deleteCurrentParcelFromEditor() {
  if (State.editingParcelIndex === null) return;
  const p = State.parcels[State.editingParcelIndex];
  
  const confirmDel = confirm(`Voulez-vous vraiment supprimer définitivement la parcelle "${p.nom}" ?`);
  if (!confirmDel) return;

  State.parcels.splice(State.editingParcelIndex, 1);
  saveState();
  
  closeParcelEditorDialog();
  
  // Reset selected parcel if it was the deleted one
  if (State.currentParcelIndex === State.editingParcelIndex) {
    State.currentParcelIndex = null;
    document.getElementById('psel').value = '';
    document.getElementById('fiche').style.display = 'none';
  }

  populateParcelSelector();
  renderAdminParcelsList();
  renderParcelProgress();
  
  toast(`🗑️ Parcelle "${p.nom}" supprimée`, 'info');
}

// ── PDF EXPORT (jsPDF) ──
function genPDF(entries, filename) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  let y = 0;

  // Modern Premium Header
  doc.setFillColor(5, 10, 22); // Deep dark blue background
  doc.rect(0, 0, W, 28, 'F');
  
  doc.setFillColor(59, 122, 246); // Neon Blue line
  doc.rect(0, 28, W, 1.5, 'F');

  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('VICON — Gestion Engrais', M, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('SCEV Champagne — Commune CHARLY | N° Siret 42264831100013', M, 21);
  doc.text(`Rapport généré le : ${new Date().toLocaleDateString('fr-FR')}`, W - M, 21, { align: 'right' });
  
  y = 38;

  entries.forEach(e => {
    // Page break prevention
    if (y > 240) {
      doc.addPage();
      y = 16;
    }

    // Glass panel equivalent
    doc.setFillColor(241, 245, 249); // light background for high contrast print readability
    doc.roundedRect(M, y, W - 2 * M, 42, 2, 2, 'F');
    
    // Header for parcel
    doc.setFillColor(13, 22, 42); // Navy head
    doc.rect(M, y, W - 2 * M, 7, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(e.nom, M + 4, y + 5);

    doc.setFontSize(8);
    doc.setTextColor(e.done ? 16 : 245, e.done ? 185 : 166, e.done ? 129 : 35);
    doc.text(e.done ? '✓ Traitée' : 'En attente', W - M - 4, y + 5, { align: 'right' });

    y += 11;
    
    // Details
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    
    doc.text(`Date : ${e.date ? e.date.split('-').reverse().join('/') : '—'}`, M + 4, y);
    doc.text(`Réf. engrais : ${e.ref || '—'}`, M + 45, y);
    doc.text(`Dose visée : ${e.q} kg/ha`, M + 110, y);
    
    y += 5.5;
    doc.text(`Surface : ${e.surface} ha`, M + 4, y);
    doc.text(`Configuration rangs : ${e.rg} rangs × ${e.lon} m`, M + 45, y);
    
    y += 8;
    
    // Mini summary table
    const colW = [68, 56, 56];
    const sX = M + 2;
    
    // Header Row
    doc.setFillColor(59, 122, 246);
    doc.rect(sX, y, 178, 6, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Calcul d\'épandage', sX + 3, y + 4.5);
    doc.text('Nombre de sacs (25 kg)', sX + colW[0] + 3, y + 4.5);
    doc.text('Poids Total (kg)', sX + colW[0] + colW[1] + 3, y + 4.5);
    
    y += 6;
    
    // Theoretical Row
    doc.setFillColor(255, 255, 255);
    doc.rect(sX, y, 178, 6, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.text('Besoin calculé (théorique)', sX + 3, y + 4.5);
    doc.text(`${e.ts} sacs`, sX + colW[0] + 3, y + 4.5);
    doc.text(`${e.tk} kg`, sX + colW[0] + colW[1] + 3, y + 4.5);
    
    y += 6;

    // Real Row
    doc.setFillColor(245, 247, 250);
    doc.rect(sX, y, 178, 6, 'F');
    doc.setTextColor(245, 166, 35); // Warm Amber
    doc.setFont('helvetica', 'bold');
    doc.text('Sacs réellement appliqués', sX + 3, y + 4.5);
    doc.text(`${e.sr} sacs`, sX + colW[0] + 3, y + 4.5);
    doc.text(`${r2(e.sr * BAG_WEIGHT)} kg`, sX + colW[0] + colW[1] + 3, y + 4.5);
    
    y += 12; // Extra spacer
  });

  doc.save(filename + '.pdf');
  toast('📄 Rapport PDF téléchargé avec succès', 'success');
}

function exportSinglePDF(id) {
  const record = State.history.find(e => e.id === id);
  if (record) {
    genPDF([record], `VICON_Passage_${record.nom.replace(/\s+/g, '_')}`);
  }
}

function exportCampaignPDF() {
  const campLogs = State.history.filter(e => e.campaignId === State.activeCampaignId);
  if (campLogs.length === 0) {
    toast('Historique de campagne vide, impossible d\'exporter', 'warn');
    return;
  }
  
  const camp = getActiveCamp();
  const cName = camp ? camp.name.replace(/\s+/g, '_') : 'Campagne';
  genPDF(campLogs, `VICON_Rapport_${cName}`);
}

// ── CSV EXPORT ──
function exportCampaignCSV() {
  const campLogs = State.history.filter(e => e.campaignId === State.activeCampaignId);
  if (campLogs.length === 0) {
    toast('Aucun enregistrement à exporter pour cette campagne', 'warn');
    return;
  }

  // Define headers
  const headers = [
    'Date',
    'Parcelle',
    'Culture',
    'Ref Engrais',
    'Dose (kg/ha)',
    'Surface (ha)',
    'Longueur (m)',
    'Nbre Rangs',
    'Qte Calculee (kg)',
    'Sacs Calcules',
    'Sacs Reels',
    'Ecart sacs',
    'Statut'
  ];

  // Map rows
  const rows = campLogs.map(e => [
    e.date || '',
    `"${e.nom.replace(/"/g, '""')}"`,
    `"${e.cul.replace(/"/g, '""')}"`,
    `"${(e.ref || '').replace(/"/g, '""')}"`,
    e.q,
    e.surface,
    e.lon,
    e.rg,
    e.tk,
    e.ts,
    e.sr,
    r2(e.ts - e.sr),
    e.done ? 'Traitee' : 'En attente'
  ]);

  // Join as CSV
  const csvContent = "\uFEFF" + [ // Add UTF-8 BOM for proper Excel accents load
    headers.join(';'),
    ...rows.map(r => r.join(';'))
  ].join('\n');

  // Trigger browser download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const camp = getActiveCamp();
  const cName = camp ? camp.name.replace(/\s+/g, '_') : 'Campagne';
  
  link.setAttribute("href", url);
  link.setAttribute("download", `VICON_Export_${cName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast('📊 Données CSV téléchargées avec succès', 'success');
}

// ── DEDICATED PARCELS ADMIN LIST ──
function renderAdminParcelsList() {
  const listEl = document.getElementById('admin-parcels-list');
  if (!listEl) return;

  if (State.parcels.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="9" x2="15" y2="9"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="13" y2="17"/>
        </svg>
        <p>Aucune parcelle configurée. Cliquez sur "Ajouter une parcelle" pour commencer.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = State.parcels.map((p, idx) => `
    <div class="card glass-panel" style="display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
      <div>
        <div class="card-title" style="margin-bottom: 12px; font-size: 0.95rem; color: var(--text-primary); font-family: 'Syne', sans-serif;">
          📍 ${p.nom}
        </div>
        <div class="info-grid" style="gap: 8px 12px; grid-template-columns: 1fr 1fr;">
          <div class="info-item">
            <span class="info-lbl" style="font-size: 0.6rem;">Culture</span>
            <span class="info-val" style="font-size: 0.85rem; font-weight:600;">${p.cul}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl" style="font-size: 0.6rem;">Surface</span>
            <span class="info-val" style="font-size: 0.85rem; font-weight:600;">${p.surface} ha</span>
          </div>
          <div class="info-item">
            <span class="info-lbl" style="font-size: 0.6rem;">Longueur</span>
            <span class="info-val" style="font-size: 0.85rem; font-weight:600;">${p.lon} m</span>
          </div>
          <div class="info-item">
            <span class="info-lbl" style="font-size: 0.6rem;">Rangs</span>
            <span class="info-val" style="font-size: 0.85rem; font-weight:600;">${p.rg}</span>
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px; border-top: 1px solid var(--border-light); padding-top: 12px;">
        <button class="btn btn-glass btn-sm btn-edit-parcel-admin" data-index="${idx}" style="flex: 1; justify-content: center;">
          ✏️ Modifier
        </button>
        <button class="btn btn-danger btn-sm btn-delete-parcel-admin" data-index="${idx}" style="flex: 1; justify-content: center;">
          🗑️ Supprimer
        </button>
      </div>
    </div>
  `).join('');

  // Bind event listeners
  listEl.querySelectorAll('.btn-edit-parcel-admin').forEach(btn => {
    btn.addEventListener('click', (evt) => {
      const idx = parseInt(evt.currentTarget.getAttribute('data-index'));
      State.currentParcelIndex = idx;
      openParcelEditorDialog(true);
    });
  });

  listEl.querySelectorAll('.btn-delete-parcel-admin').forEach(btn => {
    btn.addEventListener('click', (evt) => {
      const idx = parseInt(evt.currentTarget.getAttribute('data-index'));
      State.editingParcelIndex = idx;
      deleteCurrentParcelFromEditor();
    });
  });
}

// ── TAB SWITCHER ──
function switchTab(tabId, triggerBtn) {
  // Toggle sections
  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById('sec-' + tabId).classList.add('active');

  // Toggle active buttons
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  triggerBtn.classList.add('active');

  if (tabId === 'historique') {
    renderHistoryList();
  } else if (tabId === 'admin-parcelles') {
    renderAdminParcelsList();
  }
}

// ── EVENT ATTACHMENT & INIT ──
function bindEvents() {
  // Campaign listeners
  document.getElementById('g-camp-select').addEventListener('change', (evt) => {
    changeActiveCampaign(evt.target.value);
  });
  document.getElementById('btn-add-camp').addEventListener('click', openCampaignDialog);
  document.getElementById('btn-delete-camp').addEventListener('click', deleteCurrentCampaign);
  
  // Campaign input auto-saves
  document.getElementById('g-date').addEventListener('input', () => {
    const camp = getActiveCamp();
    if (camp) {
      camp.date = document.getElementById('g-date').value;
      saveState();
    }
  });
  
  document.getElementById('g-ref').addEventListener('input', () => {
    const camp = getActiveCamp();
    if (camp) {
      camp.ref = document.getElementById('g-ref').value;
      saveState();
    }
  });

  document.getElementById('g-qte').addEventListener('input', () => {
    const camp = getActiveCamp();
    if (camp) {
      camp.qte = parseFloat(document.getElementById('g-qte').value) || 1000;
      saveState();
      updateStockBox();
      if (State.currentParcelIndex !== null) {
        renderParcelCard();
      }
    }
  });

  document.getElementById('g-sacs-tot').addEventListener('input', () => {
    const camp = getActiveCamp();
    if (camp) {
      camp.sacsTot = parseFloat(document.getElementById('g-sacs-tot').value) || '';
      saveState();
      updateStockBox();
    }
  });

  document.getElementById('g-rows-a').addEventListener('input', () => {
    const camp = getActiveCamp();
    if (camp) {
      camp.rowsA = parseInt(document.getElementById('g-rows-a').value) || 9;
      saveState();
      if (State.currentParcelIndex !== null) {
        renderParcelCard();
      }
    }
  });

  document.getElementById('g-rows-b').addEventListener('input', () => {
    const camp = getActiveCamp();
    if (camp) {
      camp.rowsB = parseInt(document.getElementById('g-rows-b').value) || 11;
      saveState();
      if (State.currentParcelIndex !== null) {
        renderParcelCard();
      }
    }
  });

  // Dialog campaigns buttons
  document.getElementById('campaign-dialog-cancel').addEventListener('click', closeCampaignDialog);
  document.getElementById('campaign-dialog-save').addEventListener('click', saveCampaign);

  // Selected parcel change
  document.getElementById('psel').addEventListener('change', loadSelectedParcel);

  // Add new parcel triggers (admin page and modal)
  document.getElementById('btn-admin-add-parcel').addEventListener('click', () => {
    openParcelEditorDialog(false);
  });

  // Real bags live output recalculation
  document.getElementById('sr-input').addEventListener('input', updateRealBagsOutput);

  // Checkbox toggle
  document.getElementById('cbox-wrap').addEventListener('click', toggleParcelDone);

  // Save treatment record
  document.getElementById('btn-save-treatment').addEventListener('click', savePassage);

  // Parcel editor dialog actions
  document.getElementById('parcel-editor-cancel').addEventListener('click', closeParcelEditorDialog);
  document.getElementById('parcel-editor-save').addEventListener('click', saveParcelForm);
  document.getElementById('btn-delete-parcel').addEventListener('click', deleteCurrentParcelFromEditor);

  // Delete modal buttons
  document.getElementById('delete-dialog-cancel').addEventListener('click', closeDeleteDialog);
  document.getElementById('delete-dialog-confirm').addEventListener('click', confirmDelete);

  // Global history exports & cleanups
  document.getElementById('btn-export-all-pdf').addEventListener('click', exportCampaignPDF);
  document.getElementById('btn-export-all-csv').addEventListener('click', exportCampaignCSV);
  document.getElementById('btn-delete-all-histo').addEventListener('click', () => {
    openDeleteDialog(null, true);
  });

  // Nav tabs switching
  document.getElementById('tab-btn-parcelle').addEventListener('click', (evt) => {
    switchTab('parcelle', evt.currentTarget);
    populateParcelSelector(); // Refreshes to make sure done parcels are filtered
  });
  document.getElementById('tab-btn-historique').addEventListener('click', (evt) => {
    switchTab('historique', evt.currentTarget);
  });
  document.getElementById('tab-btn-admin-parcelles').addEventListener('click', (evt) => {
    switchTab('admin-parcelles', evt.currentTarget);
  });
}

function initApp() {
  loadState();
  bindEvents();
  
  populateCampaignSelector();
  updateCampagneUI();
  populateParcelSelector();
  
  renderParcelProgress();
  renderHistoryList();
  renderAdminParcelsList();
}

// Start application logic
document.addEventListener('DOMContentLoaded', initApp);
export { switchTab };
