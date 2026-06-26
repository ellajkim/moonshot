// js/Entryform.js — rich entry form for logging new events
// Depends on: data.js (SKILLS, EVENTS), app.js (window.rerenderAll), autofill.js (AutofillModule)

const EntryFormModule = (() => {
  const STORAGE_KEY = 'psl_custom_entries';

  let _addedSkills = [];
  let _editIdx     = null;   // null = new entry, number = editing EVENTS[_editIdx]
  let _fileHandle  = null;   // FileSystemFileHandle for data.js (File System Access API)

  // ── File System Access API ───────────────────────────────────────────────────

  async function linkDataFile() {
    if (!window.showOpenFilePicker) {
      updateLinkStatus('unsupported');
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JavaScript files', accept: { 'text/javascript': ['.js'] } }],
        multiple: false,
      });
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        _fileHandle = handle;
        updateLinkStatus('linked');
      }
    } catch (e) {
      // User cancelled the picker — do nothing
    }
  }

  // Writes the full EVENTS array back into the linked data.js file,
  // replacing the `const EVENTS = [...];` block in place.
  async function writeToDataFile() {
    if (!_fileHandle) return false;
    try {
      const file = await _fileHandle.getFile();
      const text = await file.text();

      const clean = EVENTS.map(ev => {
        const c = Object.assign({}, ev);
        delete c._custom;
        return c;
      });

      const eventsStr = 'const EVENTS = ' + JSON.stringify(clean, null, 2) + ';';

      const startMarker = 'const EVENTS = [';
      const startIdx    = text.indexOf(startMarker);
      const endStr      = '\n];';
      const endIdx      = text.lastIndexOf(endStr);
      if (startIdx === -1 || endIdx === -1) return false;

      const newText = text.slice(0, startIdx) + eventsStr + text.slice(endIdx + endStr.length);

      const writable = await _fileHandle.createWritable();
      await writable.write(newText);
      await writable.close();

      // All events now live in data.js — clear custom flags and localStorage
      EVENTS.forEach(ev => delete ev._custom);
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}

      return true;
    } catch (e) {
      console.warn('EntryFormModule: could not write to data file:', e);
      return false;
    }
  }

  function updateLinkStatus(state) {
    const btn   = document.getElementById('ef-link-btn');
    const label = document.getElementById('ef-link-label');
    if (!btn || !label) return;

    btn.classList.remove('ef-link-btn-linked', 'ef-link-btn-error');

    if (state === 'linked' && _fileHandle) {
      label.textContent = _fileHandle.name;
      btn.classList.add('ef-link-btn-linked');
      btn.title = `Linked to ${_fileHandle.name} — submits write directly to this file`;
    } else if (state === 'unsupported') {
      label.textContent = 'Not supported';
      btn.classList.add('ef-link-btn-error');
      btn.title = 'File System Access API requires Chrome or Edge';
    } else {
      label.textContent = 'Link data.js';
      btn.title = 'Link your data.js so entries are saved directly to it';
    }
  }

  // ── Persistence (localStorage fallback) ─────────────────────────────────────

  function loadSavedEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved)) return;
      saved.forEach(ev => {
        ev._custom = true;
        insertChronologically(ev);
      });
    } catch (e) {
      console.warn('EntryFormModule: could not load saved entries', e);
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(EVENTS.filter(e => e._custom)));
    } catch (e) {
      console.warn('EntryFormModule: could not persist entries', e);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function insertChronologically(ev) {
    const t = new Date(ev.month).getTime();
    let idx = EVENTS.findIndex(e => new Date(e.month).getTime() > t);
    if (idx === -1) idx = EVENTS.length;
    EVENTS.splice(idx, 0, ev);
    return idx;
  }

  // ── Skill tag UI ─────────────────────────────────────────────────────────────

  function buildDropdown() {
    const dropdown = document.getElementById('ef-skill-dropdown');
    if (!dropdown) return;
    const used      = new Set(_addedSkills.map(s => s.key));
    const available = SKILLS.filter(s => !used.has(s.key));

    dropdown.innerHTML = '';

    if (!available.length) {
      dropdown.innerHTML = '<div class="ef-dropdown-empty">All skills added</div>';
    } else {
      available.forEach(s => {
        const opt = document.createElement('div');
        opt.className = 'ef-dropdown-opt';
        opt.innerHTML = `<span class="ef-skill-dot" style="background:${s.color}"></span><span>${s.label}</span>`;
        opt.addEventListener('click', e => {
          e.stopPropagation();
          _addedSkills.push({ key: s.key, delta: 10 });
          renderSkillTags();
          dropdown.style.display = 'none';
        });
        dropdown.appendChild(opt);
      });
    }

    const divider = document.createElement('div');
    divider.className = 'ef-dropdown-divider';
    dropdown.appendChild(divider);

    const create = document.createElement('div');
    create.className = 'ef-dropdown-create';
    create.innerHTML = `<svg viewBox="0 0 14 14" width="11" height="11" fill="none">
      <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg><span>Create new skill</span>`;
    create.addEventListener('click', e => { e.stopPropagation(); showNewSkillForm(); });
    dropdown.appendChild(create);
  }

  function showNewSkillForm() {
    const dropdown = document.getElementById('ef-skill-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = `
      <div class="ef-new-skill-form">
        <button type="button" class="ef-new-skill-back" id="ef-new-skill-back">← Back</button>
        <div class="ef-new-skill-row">
          <input type="text" class="ef-new-skill-name" id="ef-new-skill-name"
                 placeholder="Skill name" maxlength="20"/>
          <input type="color" class="ef-new-skill-color" id="ef-new-skill-color" value="#7090e0"/>
        </div>
        <button type="button" class="ef-new-skill-submit" id="ef-new-skill-submit">Add skill</button>
      </div>
    `;

    document.getElementById('ef-new-skill-back').addEventListener('click', e => {
      e.stopPropagation(); buildDropdown();
    });
    document.getElementById('ef-new-skill-name').addEventListener('click', e => e.stopPropagation());
    document.getElementById('ef-new-skill-submit').addEventListener('click', e => {
      e.stopPropagation();
      const name  = document.getElementById('ef-new-skill-name').value.trim();
      const color = document.getElementById('ef-new-skill-color').value;
      if (!name) { document.getElementById('ef-new-skill-name').focus(); return; }

      const key = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (SKILLS.some(s => s.key === key)) {
        document.getElementById('ef-new-skill-name').value = '';
        document.getElementById('ef-new-skill-name').placeholder = 'Key already exists';
        return;
      }

      const newSkill = { key, label: name, color };
      if (window.addNewSkillToSystem) window.addNewSkillToSystem(newSkill);
      _addedSkills.push({ key, delta: 10 });
      renderSkillTags();
      dropdown.style.display = 'none';
    });

    document.getElementById('ef-new-skill-name').focus();
  }

  function renderSkillTags() {
    const container = document.getElementById('ef-skill-tags');
    if (!container) return;
    container.innerHTML = '';

    _addedSkills.forEach(s => {
      const def = SKILLS.find(sk => sk.key === s.key);
      if (!def) return;

      const tag = document.createElement('div');
      tag.className = 'ef-skill-tag';
      tag.innerHTML = `
        <span class="ef-skill-dot" style="background:${def.color}"></span>
        <span class="ef-skill-name">${def.label}</span>
        <input type="number" class="ef-skill-delta-input" value="${s.delta}" data-key="${s.key}" title="XP delta"/>
        <button type="button" class="ef-skill-remove" data-key="${s.key}" aria-label="Remove">×</button>
      `;

      tag.querySelector('.ef-skill-delta-input').addEventListener('input', function () {
        const entry = _addedSkills.find(sk => sk.key === this.dataset.key);
        if (entry) entry.delta = parseInt(this.value, 10) || 0;
      });
      tag.querySelector('.ef-skill-remove').addEventListener('click', function () {
        _addedSkills = _addedSkills.filter(sk => sk.key !== this.dataset.key);
        renderSkillTags();
      });

      container.appendChild(tag);
    });
  }

  // ── Edit existing event ───────────────────────────────────────────────────────

  function openEdit(idx) {
    const ev = EVENTS[idx];
    _editIdx = idx;

    // Open the panel if it isn't already open
    const panel = document.getElementById('ef-panel');
    if (panel && !panel.classList.contains('ef-panel-open')) {
      document.getElementById('ef-toggle').click();
    }

    // Populate fields with the event's current values
    document.getElementById('ef-date').value  = ev.month;
    document.getElementById('ef-title').value = ev.title || '';
    document.getElementById('ef-desc').value  = (ev.desc && ev.desc !== ev.title) ? ev.desc : '';
    document.getElementById('ef-delta').value = ev.delta != null ? ev.delta : 0;

    const goalCheck = document.getElementById('ef-goal-check');
    const goalText  = document.getElementById('ef-goal-text');
    if (ev.goalAchieved) {
      goalCheck.checked = true;
      goalText.value = ev.goalAchieved;
      goalText.classList.add('ef-goal-text-visible');
    } else {
      goalCheck.checked = false;
      goalText.value = '';
      goalText.classList.remove('ef-goal-text-visible');
    }

    _addedSkills = Object.entries(ev.skillDeltas || {}).map(([key, delta]) => ({ key, delta }));
    renderSkillTags();

    const submitBtn = document.querySelector('#ef-form .ef-go');
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    const deleteBtn = document.getElementById('ef-delete-btn');
    if (deleteBtn) deleteBtn.style.display = '';

    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Autofill ──────────────────────────────────────────────────────────────────

  function getAutoFields(title, desc, delta, skillDeltas) {
    if (typeof AutofillModule === 'undefined') return null;
    return AutofillModule.generate(title, desc, delta, skillDeltas);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function render() {
    const mount = document.getElementById('entry-form-mount');
    if (!mount) return;
    _addedSkills = [];
    _editIdx = null;

    const today       = new Date();
    const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    mount.innerHTML = `
      <div class="ef-container">

        <button class="ef-toggle" id="ef-toggle" type="button">
          <svg class="ef-toggle-icon" id="ef-toggle-svg" viewBox="0 0 14 14" width="12" height="12" fill="none">
            <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span id="ef-toggle-label">New Entry</span>
        </button>

        <div class="ef-panel" id="ef-panel">
          <form id="ef-form" autocomplete="off">

            <div class="ef-row">
              <div class="ef-field">
                <label class="ef-label" for="ef-date">Date</label>
                <input type="date" id="ef-date" class="ef-input-field" value="${defaultDate}" required/>
              </div>
              <div class="ef-field ef-field-grow">
                <label class="ef-label" for="ef-title">Title</label>
                <input type="text" id="ef-title" class="ef-input-field" placeholder="What happened?" required/>
              </div>
            </div>

            <div class="ef-field">
              <label class="ef-label" for="ef-desc">Description</label>
              <textarea id="ef-desc" class="ef-textarea" rows="2" placeholder="2–3 sentences about this event…"></textarea>
            </div>

            <div class="ef-field">
              <label class="ef-label" for="ef-delta">Improvement</label>
              <input type="number" id="ef-delta" class="ef-input-field ef-number" value="0"/>
            </div>

            <div class="ef-field">
              <label class="ef-label">Skill XP</label>
              <div class="ef-skills-area">
                <div class="ef-skill-tags" id="ef-skill-tags"></div>
                <div class="ef-skill-add-wrap">
                  <button type="button" class="ef-add-skill-btn" id="ef-add-skill-btn">+ Add skill</button>
                  <div class="ef-skill-dropdown" id="ef-skill-dropdown" style="display:none"></div>
                </div>
              </div>
            </div>

            <div class="ef-field ef-goal-row">
              <label class="ef-label-checkbox">
                <input type="checkbox" id="ef-goal-check"/>
                <span>Goal achieved ⭐</span>
              </label>
              <input type="text" id="ef-goal-text" class="ef-input-field ef-goal-text" placeholder="Name the goal…"/>
            </div>

            <div class="ef-actions">
              <button type="submit" class="ef-go">Log Entry</button>
              <button type="button" id="ef-delete-btn" class="ef-delete-btn" style="display:none">Delete</button>
              <button type="button" id="ef-link-btn" class="ef-link-btn"
                      title="Link your data.js so entries are saved directly to it">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                  <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span id="ef-link-label">Link data.js</span>
              </button>
              <button type="button" id="ef-download" class="ef-icon-btn" title="Download ledger.json">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5" stroke="currentColor" stroke-width="1.6"
                        stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M5 19h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

          </form>
          <div class="ef-hint" id="ef-hint"></div>
        </div>

      </div>
    `;

    // Toggle open / close
    let isOpen = false;
    document.getElementById('ef-toggle').addEventListener('click', () => {
      isOpen = !isOpen;
      document.getElementById('ef-panel').classList.toggle('ef-panel-open', isOpen);
      const vLine = document.getElementById('ef-toggle-svg').querySelector('line:first-child');
      if (vLine) vLine.style.opacity = isOpen ? '0' : '1';
      document.getElementById('ef-toggle-label').textContent = isOpen ? 'Close' : 'New Entry';
    });

    // Goal checkbox reveals text input
    document.getElementById('ef-goal-check').addEventListener('change', function () {
      const gt = document.getElementById('ef-goal-text');
      gt.classList.toggle('ef-goal-text-visible', this.checked);
      if (this.checked) gt.focus();
    });

    // Skill dropdown toggle
    const addBtn   = document.getElementById('ef-add-skill-btn');
    const dropdown = document.getElementById('ef-skill-dropdown');
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      buildDropdown();
      dropdown.style.display = dropdown.style.display === 'none' ? '' : 'none';
    });
    document.addEventListener('click', () => { dropdown.style.display = 'none'; });

    // Link data.js button
    document.getElementById('ef-link-btn').addEventListener('click', () => linkDataFile());
    // Restore linked state label if handle already set (re-render after navigation)
    if (_fileHandle) updateLinkStatus('linked');

    document.getElementById('ef-form').addEventListener('submit', handleSubmit);
    document.getElementById('ef-download').addEventListener('click', downloadJSON);
    document.getElementById('ef-delete-btn').addEventListener('click', handleDelete);
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (_editIdx === null) return;

    EVENTS.splice(_editIdx, 1);
    _editIdx = null;

    const savedToFile = await writeToDataFile();
    if (!savedToFile) persist();

    const submitBtn = document.querySelector('#ef-form .ef-go');
    if (submitBtn) submitBtn.textContent = 'Log Entry';

    const deleteBtn = document.getElementById('ef-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'none';

    _addedSkills = [];
    renderSkillTags();
    document.getElementById('ef-title').value = '';
    document.getElementById('ef-desc').value  = '';
    document.getElementById('ef-delta').value = '0';
    document.getElementById('ef-goal-check').checked = false;
    document.getElementById('ef-goal-text').value    = '';
    document.getElementById('ef-goal-text').classList.remove('ef-goal-text-visible');

    const targetIdx = Math.max(0, Math.min(EVENTS.length - 1, 0));
    if (window.rerenderAll) {
      window.rerenderAll(targetIdx);
    } else if (window.selectEvent) {
      window.selectEvent(targetIdx);
    }

    const hint = document.getElementById('ef-hint');
    if (hint) {
      hint.textContent = '✓ Entry deleted.';
      setTimeout(() => { if (hint) hint.textContent = ''; }, 3000);
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();

    const dateVal     = document.getElementById('ef-date').value;
    const titleVal    = document.getElementById('ef-title').value.trim();
    const descVal     = document.getElementById('ef-desc').value.trim();
    const deltaVal    = parseInt(document.getElementById('ef-delta').value, 10) || 0;
    const goalChecked = document.getElementById('ef-goal-check').checked;
    const goalText    = document.getElementById('ef-goal-text').value.trim();

    if (!dateVal || !titleVal) return;

    const skillDeltas = {};
    _addedSkills.forEach(s => { skillDeltas[s.key] = s.delta; });

    const aiFields = getAutoFields(titleVal, descVal, deltaVal, skillDeltas);

    let targetIdx;
    let hintMsg;
    let shouldPersist = false;
    const isNew = _editIdx === null;

    if (_editIdx !== null) {
      // Edit mode — update fields, then re-sort so backdated events land correctly
      const ev = EVENTS[_editIdx];
      shouldPersist   = !!ev._custom;
      ev.month        = dateVal;
      ev.title        = titleVal;
      ev.desc         = descVal || titleVal;
      ev.delta        = deltaVal;
      ev.positive     = deltaVal >= 0;
      ev.goalAchieved = goalChecked && goalText ? goalText : null;
      ev.skillDeltas  = skillDeltas;
      if (aiFields) {
        ev.label     = aiFields.label     || ev.label;
        ev.speech    = aiFields.speech    || ev.speech;
        ev.milestone = aiFields.milestone || ev.milestone;
        ev.todo      = aiFields.todo      || ev.todo;
      }
      EVENTS.splice(_editIdx, 1);
      targetIdx = insertChronologically(ev);
      _editIdx  = null;
      hintMsg   = '✓ Entry updated.';

      const sBtn = document.querySelector('#ef-form .ef-go');
      if (sBtn) sBtn.textContent = 'Log Entry';

      const deleteBtn = document.getElementById('ef-delete-btn');
      if (deleteBtn) deleteBtn.style.display = 'none';
    } else {
      // New entry mode
      const newEvent = {
        label:        aiFields?.label     || '',
        month:        dateVal,
        title:        titleVal,
        desc:         descVal || titleVal,
        delta:        deltaVal,
        positive:     deltaVal >= 0,
        goalAchieved: goalChecked && goalText ? goalText : null,
        speech:       aiFields?.speech    || '',
        milestone:    aiFields?.milestone || '',
        todo:         aiFields?.todo      || '',
        skillDeltas,
        _custom:      true,
      };

      if (window.__cancelInitialSelect) window.__cancelInitialSelect();
      targetIdx     = insertChronologically(newEvent);
      hintMsg       = deltaVal >= 0 ? '✓ Entry logged.' : '✓ Setback logged.';
      shouldPersist = true;
    }

    // Write to data.js if linked, otherwise fall back to localStorage
    const savedToFile = await writeToDataFile();
    if (!savedToFile && shouldPersist) persist();

    if (window.rerenderAll) {
      window.rerenderAll(targetIdx);
    } else {
      window.selectEvent(targetIdx);
    }

    if (isNew && typeof EventAnimationModule !== 'undefined') {
      EventAnimationModule.play(targetIdx, deltaVal >= 0, deltaVal, skillDeltas);
    }

    // Reset form fields
    _addedSkills = [];
    renderSkillTags();
    document.getElementById('ef-title').value = '';
    document.getElementById('ef-desc').value  = '';
    document.getElementById('ef-delta').value = '0';
    document.getElementById('ef-goal-check').checked = false;
    document.getElementById('ef-goal-text').value    = '';
    document.getElementById('ef-goal-text').classList.remove('ef-goal-text-visible');

    const hint = document.getElementById('ef-hint');
    if (hint) {
      hint.textContent = savedToFile ? '✓ Saved to data.js.' : hintMsg;
      setTimeout(() => { if (hint) hint.textContent = ''; }, 3000);
    }
  }

  // ── Download ──────────────────────────────────────────────────────────────────

  function downloadJSON() {
    const exportData = EVENTS.map(ev => {
      const clean = Object.assign({}, ev);
      delete clean._custom;
      return clean;
    });
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'ledger.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Bulk import (used by github.js) ──────────────────────────────────────────

  async function addBulk(eventsArray) {
    if (!eventsArray || !eventsArray.length) return null;

    // Insert oldest-first so the last insert is the most recent event
    const sorted = [...eventsArray].sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
    );

    let lastIdx = 0;
    sorted.forEach(ev => {
      ev._custom = true;
      lastIdx = insertChronologically(ev);
    });

    const savedToFile = await writeToDataFile();
    if (!savedToFile) persist();

    if (window.rerenderAll) window.rerenderAll(lastIdx);

    return lastIdx;
  }

  return { render, loadSavedEntries, openEdit, addBulk };
})();
