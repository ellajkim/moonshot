// js/timeline.js — draws the journey arc SVG and tick labels
// Depends on: data.js (EVENTS), app.js exposes selectEvent() as a global

const TimelineModule = (() => {
  const PL = 24, PR = 14, PT = 22, PB = 28;
  const W  = 480, H  = 240;

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function formatMonth(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const day = d ? ` ${+d},` : ',';
    return `${MONTH_NAMES[+m - 1]}${day} ${y}`;
  }

  // Each entry keeps _origIdx so onclick always maps back to the full EVENTS array.
  let EVENTS_INDEXED = EVENTS.map((e, i) => Object.assign({ _origIdx: i }, e));
  let activeEvents = EVENTS_INDEXED;
  let _hoveredOrigIdx = null;
  let _lockedOrigIdx  = null; // set when user clicks a dot; cleared on background click
  let _tlEventPositions = []; // [{origIdx, x}] — rebuilt each draw(), read by mousemove handler

  // Rebuild EVENTS_INDEXED from the current EVENTS array (call after splicing in new events).
  function rebuild() {
    EVENTS_INDEXED = EVENTS.map((e, i) => Object.assign({ _origIdx: i }, e));
    activeEvents = EVENTS_INDEXED;
  }

  function setFilter(predicate) {
    activeEvents = EVENTS_INDEXED.filter(predicate);
  }

  function firstActiveOrigIdx() {
    return activeEvents.length > 0 ? activeEvents[0]._origIdx : 0;
  }

  /** Cumulative scores over ALL events — used by app.js for score display. */
  function cumScores() {
    let running = 0;
    return EVENTS.map(e => { running += e.delta; return running; });
  }

  /** Redraws the SVG using activeEvents. selectedIdx is an original EVENTS index. */
  function draw(selectedIdx) {
    if (activeEvents.length === 0) return;

    let running = 0;
    const scores = activeEvents.map(e => { running += e.delta; return running; });
    const minS   = Math.min(...scores) - 8;
    const maxS   = Math.max(...scores) + 8;

    const timestamps = activeEvents.map(e => new Date(e.month).getTime());
    const minT  = Math.min(...timestamps);
    const maxT  = Math.max(...timestamps);
    const range = maxT - minT || 1;

    const toX = i => PL + ((timestamps[i] - minT) / range) * (W - PL - PR);
    const toY = s => PT + (H - PT - PB) * (1 - (s - minS) / (maxS - minS));
    const pts = scores.map((s, i) => ({ x: toX(i), y: toY(s) }));
    const n = pts.length;
    _tlEventPositions = activeEvents.map((ev, i) => ({ origIdx: ev._origIdx, x: pts[i].x }));

    let pathD = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      pathD += ` C${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
    }

    const fillD = pathD + ` L${pts[n - 1].x},${H - PB} L${pts[0].x},${H - PB} Z`;
    const zy    = toY(0);

    let html = `
      <defs>
        <linearGradient id="tl-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#3858c0" stop-opacity=".28"/>
          <stop offset="100%" stop-color="#3858c0" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line x1="${PL}" y1="${zy}" x2="${W - PR}" y2="${zy}"
            stroke="rgba(255,255,255,.05)" stroke-width=".5" stroke-dasharray="3,5"/>
      <path d="${fillD}" fill="url(#tl-grad)"/>
      <path d="${pathD}" fill="none" stroke="#3858d0" stroke-width="2"/>
    `;

    // Vertical guide line — shown only while hovering an event dot
    const _hi = _hoveredOrigIdx !== null
      ? activeEvents.findIndex(e => e._origIdx === _hoveredOrigIdx) : -1;
    const _vx = _hi >= 0 ? pts[_hi].x : 0;
    html += `<line id="tl-vline" x1="${_vx}" x2="${_vx}" y1="${PT}" y2="${H - PB}"
                   stroke="rgba(255,255,255,0.28)" stroke-width="1"
                   pointer-events="none"${_hi < 0 ? ' display="none"' : ''}/>`;

    pts.forEach((p, i) => {
      const ev     = activeEvents[i];
      const isSel  = ev._origIdx === selectedIdx;
      const isGoal = !!ev.goalAchieved;

      if (isGoal) {
        const r = isSel ? 9 : 6.5, ri = r * 0.42;
        let starPath = '';
        for (let s = 0; s < 5; s++) {
          const a1 = (s * 72 - 90) * Math.PI / 180;
          const a2 = (s * 72 - 90 + 36) * Math.PI / 180;
          starPath += (s === 0 ? 'M' : 'L')
            + `${p.x + Math.cos(a1) * r},${p.y + Math.sin(a1) * r} `
            + `L${p.x + Math.cos(a2) * ri},${p.y + Math.sin(a2) * ri} `;
        }
        html += `<path d="${starPath}Z" fill="${isSel ? '#f0c030' : '#c09020'}"
                       opacity="${isSel ? 1 : 0.8}" style="cursor:pointer"
                       onmouseenter="window._tlDotEnter(${ev._origIdx})"
                       onmouseleave="window._tlDotLeave()"
                       onclick="window._tlDotClick(${ev._origIdx})"/>`;
        if (isSel) {
          html += `<circle cx="${p.x}" cy="${p.y}" r="13" fill="none"
                           stroke="rgba(240,190,40,.3)" stroke-width="1"/>`;
        }
      } else {
        const col = ev.positive ? '#4070d8' : '#c05050';
        html += `<circle cx="${p.x}" cy="${p.y}" r="${isSel ? 6.5 : 4}"
                         fill="${col}" style="cursor:pointer"
                         onmouseenter="window._tlDotEnter(${ev._origIdx})"
                         onmouseleave="window._tlDotLeave()"
                         onclick="window._tlDotClick(${ev._origIdx})"/>`;
        if (isSel) {
          const ringCol = ev.positive
            ? 'rgba(70,120,220,.4)' : 'rgba(200,80,80,.4)';
          html += `<circle cx="${p.x}" cy="${p.y}" r="10" fill="none"
                           stroke="${ringCol}" stroke-width="1"/>`;
        }
      }
    });

    document.getElementById('svg-timeline').innerHTML = html;
  }

  /** One calendar-month tick per step across the activeEvents date range. */
  function buildTicks(selectedIdx) {
    if (activeEvents.length === 0) return;

    const timestamps = activeEvents.map(e => new Date(e.month).getTime());
    const minT  = Math.min(...timestamps);
    const maxT  = Math.max(...timestamps);
    const range = maxT - minT || 1;

    const row = document.getElementById('tick-row');
    row.innerHTML = '';

    let cur = new Date(minT);
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), 1));
    const end = new Date(maxT);

    while (cur.getTime() <= end.getTime()) {
      const t       = cur.getTime();
      const svgX    = PL + ((t - minT) / range) * (W - PL - PR);
      const leftPct = (svgX / W) * 100;
      const mo      = cur.getUTCMonth();
      const label   = mo === 0
        ? `Jan '${String(cur.getUTCFullYear()).slice(2)}`
        : MONTH_NAMES[mo];

      const div = document.createElement('div');
      div.className = 'tick';
      div.textContent = label;
      div.style.left = `${leftPct}%`;
      row.appendChild(div);

      cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
    }
  }

  /** Populate the event detail card. idx is an original EVENTS index. */
  function showDetail(idx) {
    const ev = EVENTS[idx];
    document.getElementById('ed-month').textContent    = formatMonth(ev.month);
    document.getElementById('ed-title-el').textContent = ev.title;
    document.getElementById('ed-desc').textContent     = ev.desc;

    const de = document.getElementById('ed-delta');
    de.className = 'ed-delta';
    const skillDeltas = ev.skillDeltas && Object.keys(ev.skillDeltas).length > 0
      ? Object.entries(ev.skillDeltas).filter(([, v]) => v !== 0)
      : null;
    if (skillDeltas && skillDeltas.length > 0) {
      de.innerHTML = skillDeltas.map(([key, val]) => {
        const sk = SKILLS.find(s => s.key === key);
        const color = sk ? sk.color : '#8090b0';
        const label = sk ? sk.label : key;
        return `<div style="color:${color}">${val > 0 ? '+' : ''}${val} ${label}</div>`;
      }).join('');
    } else {
      de.textContent = (ev.delta > 0 ? '+' : '') + ev.delta + ' points';
      de.className  += ev.positive ? ' pos' : ' neg';
    }

    document.getElementById('ed-goal').innerHTML = ev.goalAchieved
      ? `<div class="goal-tag">⭐ Goal achieved: ${ev.goalAchieved}</div>`
      : '';

    const editBtn = document.getElementById('ed-edit-btn');
    if (editBtn) editBtn.onclick = () => EntryFormModule.openEdit(idx);

    document.getElementById('ev-detail').className = 'ev-detail show';
  }

  // ── Persistent SVG mousemove — runs once, survives innerHTML rebuilds ──────
  ;(function() {
    const svg = document.getElementById('svg-timeline');
    if (!svg) return;
    let _prevOrigIdx = null; // local: avoids redundant selectEvent calls

    svg.addEventListener('mousemove', function(evt) {
      if (_lockedOrigIdx !== null) return; // locked — ignore hover
      const vl = document.getElementById('tl-vline');
      if (!vl) return; // skills mode uses st-vline instead
      if (!_tlEventPositions.length) return;

      const rect = svg.getBoundingClientRect();
      const svgX = (evt.clientX - rect.left) * (W / rect.width);

      let best = null, bestDist = 18;
      _tlEventPositions.forEach(pos => {
        const d = Math.abs(svgX - pos.x);
        if (d < bestDist) { best = pos; bestDist = d; }
      });

      if (best) {
        _hoveredOrigIdx = best.origIdx;
        vl.setAttribute('x1', best.x); vl.setAttribute('x2', best.x);
        vl.removeAttribute('display');

        if (best.origIdx !== _prevOrigIdx) {
          _prevOrigIdx = best.origIdx;
          if (window.selectEvent) window.selectEvent(best.origIdx);
        }
      } else {
        if (_prevOrigIdx !== null) {
          _prevOrigIdx = null;
          _hoveredOrigIdx = null;
          vl.setAttribute('display', 'none');
        }
      }
    });

    svg.addEventListener('mouseleave', function() {
      if (_lockedOrigIdx !== null) return; // keep locked state visible
      _prevOrigIdx = null;
      _hoveredOrigIdx = null;
      const vl = document.getElementById('tl-vline');
      if (vl) vl.setAttribute('display', 'none');
    });

    svg.addEventListener('click', function(evt) {
      if (_lockedOrigIdx === null) return;
      if (!evt.target.hasAttribute('onclick')) {
        _lockedOrigIdx = null;
        _hoveredOrigIdx = null;
        const vl = document.getElementById('tl-vline');
        if (vl) vl.setAttribute('display', 'none');
      }
    });
  })();

  // Dot click — lock selection to this event
  window._tlDotClick = function(origIdx) {
    _lockedOrigIdx  = origIdx;
    _hoveredOrigIdx = origIdx;
    if (window.selectEvent) window.selectEvent(origIdx);
  };

  // Dot hover handlers — show/hide vertical guide line
  window._tlDotEnter = function(origIdx) {
    if (_lockedOrigIdx !== null) return;
    _hoveredOrigIdx = origIdx;
    if (window.selectEvent) window.selectEvent(origIdx);
    // draw() called by selectEvent above rebuilds the SVG with the vline baked in
  };

  window._tlDotLeave = function() {
    if (_lockedOrigIdx !== null) return;
    _hoveredOrigIdx = null;
    const vl = document.getElementById('tl-vline');
    if (vl) vl.setAttribute('display', 'none');
  };

  return { draw, buildTicks, showDetail, cumScores, setFilter, firstActiveOrigIdx, rebuild };
})();
