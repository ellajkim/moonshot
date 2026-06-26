// js/linkedin.js — Career positions (manual entry) + Gantt chart
// The Gantt renders into #li-gantt inside .timeline-col, directly below the journey arc SVG.

const LinkedInModule = (() => {
  const STORAGE_KEY = 'li_positions';
  const COLORS = [
    '#4e9de0', '#7c6fe0', '#3db88a', '#e0a030',
    '#d06090', '#60b0d0', '#a070e0', '#e07060',
    '#50c090', '#c09040',
  ];

  let _positions = []; // { company, title, startDate: Date, endDate: Date|null, color }

  // ── Persistence ──────────────────────────────────────────────────────────────

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(
        _positions.map(p => ({
          company:   p.company,
          title:     p.title,
          startDate: p.startDate.toISOString(),
          endDate:   p.endDate ? p.endDate.toISOString() : null,
          color:     p.color,
        }))
      ));
    } catch (_) {}
  }

  const EXAMPLE_POSITIONS = [
    { company: 'Northeastern University', title: 'B.S. Computer Science',     startDate: '2025-09', endDate: null      },
    { company: 'Disrupt FinTech',         title: 'Quant Research Analyst',    startDate: '2026-03', endDate: null      },
    { company: 'Data Club',               title: 'Tech Lead',                 startDate: '2026-04', endDate: null      },
    { company: 'Checkit Analytics',       title: 'ML Engineering Intern',     startDate: '2026-06', endDate: null      },
  ];

  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const raw = JSON.parse(stored || '[]');
      const source = (Array.isArray(raw) && raw.length) ? raw : EXAMPLE_POSITIONS.map(p => ({
        company:   p.company,
        title:     p.title,
        startDate: p.startDate + '-01',
        endDate:   p.endDate ? p.endDate + '-01' : null,
      }));
      _positions = source.map(p => ({
        company:   p.company  || '',
        title:     p.title    || '',
        startDate: new Date(p.startDate),
        endDate:   p.endDate  ? new Date(p.endDate) : null,
        color:     p.color    || COLORS[0],
      })).filter(p => !isNaN(p.startDate.getTime()));
    } catch (_) {
      _positions = [];
    }
  }

  // ── Date parsing (handles "YYYY-MM" from <input type="month">) ───────────────

  function parseDate(str) {
    if (!str) return null;
    const s = str.trim();
    if (!s) return null;
    const m = s.match(/^(\d{4})-(\d{2})$/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, 1));
    return null;
  }

  // ── Color assignment ──────────────────────────────────────────────────────────

  function assignColors() {
    const map = {};
    let ci = 0;
    _positions.forEach(p => {
      if (!map[p.company]) map[p.company] = COLORS[ci++ % COLORS.length];
      p.color = map[p.company];
    });
  }

  // ── Gantt chart ───────────────────────────────────────────────────────────────

  function escXml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function drawGantt() {
    const container = document.getElementById('li-gantt');
    if (!container) return;

    if (!_positions.length) { container.style.display = 'none'; return; }
    container.style.display = '';

    const sorted = [..._positions].sort((a, b) => a.startDate - b.startDate);
    const now    = new Date();

    // Sync x-axis with the journey arc — extend only if positions fall outside that range.
    const tlRange = (typeof TimelineModule !== 'undefined') ? TimelineModule.getTimeRange() : null;
    const posMinT = Math.min(...sorted.map(p => p.startDate.getTime()));
    const posMaxT = Math.max(...sorted.map(p => (p.endDate || now).getTime()));
    const minT    = tlRange ? Math.min(tlRange.minT, posMinT) : posMinT;
    const maxT    = tlRange ? Math.max(tlRange.maxT, posMaxT) : posMaxT;
    const tRange  = maxT - minT || 1;

    // Identical to timeline.js so SVG x-coordinates map to the same screen pixels.
    const PL = 24, PR = 14, W = 480;
    const ROW_H = 22, GAP = 3, PT = 6, PB = 4;
    const H = PT + sorted.length * (ROW_H + GAP) - GAP + PB;

    const toX = t => PL + ((t - minT) / tRange) * (W - PL - PR);

    // Subtle year gridlines — no labels; the shared tick-row below shows dates.
    let ticksHtml = '';
    const startYr = new Date(minT).getUTCFullYear();
    const endYr   = new Date(maxT).getUTCFullYear() + 1;
    for (let yr = startYr; yr <= endYr; yr++) {
      const x = toX(Date.UTC(yr, 0, 1));
      if (x < PL || x > W - PR) continue;
      ticksHtml += `<line x1="${x.toFixed(1)}" y1="${PT}" x2="${x.toFixed(1)}" y2="${H - PB}"
                          stroke="rgba(255,255,255,.06)" stroke-width=".5"/>`;
    }

    // "Now" dashed line
    const nowX = toX(now.getTime());
    if (nowX >= PL && nowX <= W - PR) {
      ticksHtml += `<line x1="${nowX.toFixed(1)}" y1="${PT}" x2="${nowX.toFixed(1)}" y2="${H - PB}"
                          stroke="rgba(80,200,120,.18)" stroke-width="1" stroke-dasharray="3,3"/>`;
    }

    // Bars — clamped to visible range
    let barsHtml = '';
    sorted.forEach((p, i) => {
      const y   = PT + i * (ROW_H + GAP);
      const x1  = Math.max(PL,     toX(p.startDate.getTime()));
      const x2  = Math.min(W - PR, toX((p.endDate || now).getTime()));
      const bw  = Math.max(2, x2 - x1);
      const col = p.color || COLORS[0];

      const startLbl = p.startDate.toLocaleDateString('en-US',
        { month: 'short', year: 'numeric', timeZone: 'UTC' });
      const endLbl = p.endDate
        ? p.endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
        : 'Present';

      barsHtml += `
        <rect x="${x1.toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="${ROW_H}"
              rx="3" fill="${col}28" stroke="${col}70" stroke-width=".5">
          <title>${escXml(p.company)} — ${escXml(p.title)}\n${startLbl} → ${endLbl}</title>
        </rect>`;

      if (!p.endDate) {
        barsHtml += `<rect x="${(x2 - 3).toFixed(1)}" y="${y}" width="3" height="${ROW_H}"
                           rx="1.5" fill="${col}aa"/>`;
      }

      if (bw > 20) {
        barsHtml += `
          <clipPath id="li-cp-${i}">
            <rect x="${x1.toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="${ROW_H}"/>
          </clipPath>
          <text x="${(x1 + 4).toFixed(1)}" y="${(y + 9).toFixed(1)}"
                font-size="7" font-weight="600" font-family="inherit"
                fill="${col}e0" clip-path="url(#li-cp-${i})">${escXml(p.company)}</text>
          <text x="${(x1 + 4).toFixed(1)}" y="${(y + 17).toFixed(1)}"
                font-size="6.5" font-family="inherit"
                fill="${col}a0" clip-path="url(#li-cp-${i})">${escXml(p.title)}</text>`;
      }
    });

    container.innerHTML = `
      <div class="li-gantt-label">Career timeline</div>
      <svg viewBox="0 0 ${W} ${H}" class="li-gantt-svg" style="height:${H}px">
        ${ticksHtml}${barsHtml}
      </svg>`;
  }

  // ── Positions list ────────────────────────────────────────────────────────────

  function renderList() {
    const list = document.getElementById('li-manual-list');
    if (!list) return;

    if (!_positions.length) {
      list.innerHTML = '<div class="li-empty">No positions yet.</div>';
      return;
    }

    list.innerHTML = _positions.map((p, i) => {
      const startStr = p.startDate.toLocaleDateString('en-US',
        { month: 'short', year: 'numeric', timeZone: 'UTC' });
      const endStr = p.endDate
        ? p.endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
        : 'Present';
      return `
        <div class="li-pos-row">
          <span class="li-pos-dot" style="background:${p.color || '#4e9de0'}"></span>
          <div class="li-pos-info">
            <span class="li-pos-title-txt">${p.title || '—'}</span>
            <span class="li-pos-company-txt">${p.company}</span>
          </div>
          <span class="li-pos-dates">${startStr} – ${endStr}</span>
          <button class="li-pos-del" data-idx="${i}" title="Remove">×</button>
        </div>`;
    }).join('');

    list.querySelectorAll('.li-pos-del').forEach(btn => {
      btn.addEventListener('click', function () {
        _positions.splice(+this.dataset.idx, 1);
        assignColors();
        save();
        drawGantt();
        renderList();
      });
    });
  }

  // ── Panel ─────────────────────────────────────────────────────────────────────

  function render() {
    const mount = document.getElementById('linkedin-import-mount');
    if (!mount) return;
    load();

    mount.innerHTML = `
      <div class="li-container">
        <button class="li-toggle" id="li-toggle" type="button">
          + Add career positions
        </button>

        <div class="li-panel" id="li-panel">
          <div class="li-manual-form">
            <input type="text"  id="li-company"   class="li-input" placeholder="Company name"/>
            <input type="text"  id="li-job-title" class="li-input" placeholder="Job title"/>
            <div class="li-date-pair">
              <label class="li-date-lbl">From<input type="month" id="li-start" class="li-input li-month"/></label>
              <label class="li-date-lbl">To<input type="month" id="li-end" class="li-input li-month"/></label>
              <span class="li-date-hint">leave "To" empty = Present</span>
            </div>
            <button type="button" id="li-add-btn" class="li-add-btn">Add</button>
          </div>
          <div id="li-add-status" class="li-add-status"></div>
          <div id="li-manual-list" class="li-manual-list"></div>
        </div>
      </div>`;

    let isOpen = false;
    document.getElementById('li-toggle').addEventListener('click', () => {
      isOpen = !isOpen;
      document.getElementById('li-panel').classList.toggle('li-panel-open', isOpen);
      if (isOpen) renderList();
    });

    const tryAdd = () => {
      const company  = (document.getElementById('li-company').value   || '').trim();
      const title    = (document.getElementById('li-job-title').value || '').trim();
      const startVal = document.getElementById('li-start').value || '';
      const endVal   = document.getElementById('li-end').value   || '';
      const status   = document.getElementById('li-add-status');

      if (!company)  { status.textContent = 'Company name is required.'; document.getElementById('li-company').focus(); return; }
      if (!startVal) { status.textContent = 'Start date is required.';   document.getElementById('li-start').focus();   return; }

      const start = parseDate(startVal);
      const end   = parseDate(endVal);
      if (!start) { status.textContent = 'Could not read start date.'; return; }

      _positions.push({ company, title, startDate: start, endDate: end });
      assignColors();
      save();
      drawGantt();

      ['li-company','li-job-title','li-start','li-end'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('li-company').focus();
      renderList();

      status.textContent = '✓ Added';
      setTimeout(() => { if (status) status.textContent = ''; }, 2000);

      document.getElementById('li-gantt').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    document.getElementById('li-add-btn').addEventListener('click', tryAdd);
    ['li-company', 'li-job-title'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') tryAdd(); });
    });

    drawGantt();
  }

  return { render, drawGantt };
})();
