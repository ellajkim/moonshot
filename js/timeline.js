// js/timeline.js — draws the journey arc SVG and tick labels
// Depends on: data.js (EVENTS), app.js exposes selectEvent() as a global

const TimelineModule = (() => {
  // SVG coordinate constants — adjust if you resize the viewBox in index.html
  const PL = 24, PR = 14, PT = 22, PB = 28;
  const W  = 480, H  = 180;

  /** Returns an array of cumulative scores, one per event. */
  function cumScores() {
    let running = 0;
    return EVENTS.map(e => { running += e.delta; return running; });
  }

  /** Redraws the full timeline SVG. selectedIdx may be null (no selection). */
  function draw(selectedIdx) {
    const scores = cumScores();
    const minS   = Math.min(...scores) - 8;
    const maxS   = Math.max(...scores) + 8;
    const n      = EVENTS.length;

    const toX = i => PL + (i / (n - 1)) * (W - PL - PR);
    const toY = s => PT + (H - PT - PB) * (1 - (s - minS) / (maxS - minS));
    const pts = scores.map((s, i) => ({ x: toX(i), y: toY(s) }));

    // Smooth bezier path
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

    // Points / stars
    pts.forEach((p, i) => {
      const ev     = EVENTS[i];
      const isSel  = i === selectedIdx;
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
                       onclick="selectEvent(${i})"/>`;
        if (isSel) {
          html += `<circle cx="${p.x}" cy="${p.y}" r="13" fill="none"
                           stroke="rgba(240,190,40,.3)" stroke-width="1"/>`;
        }
      } else {
        const col = ev.positive ? '#4070d8' : '#c05050';
        html += `<circle cx="${p.x}" cy="${p.y}" r="${isSel ? 6.5 : 4}"
                         fill="${col}" style="cursor:pointer"
                         onclick="selectEvent(${i})"/>`;
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

  /** Rebuild the tick label row below the SVG. */
  function buildTicks(selectedIdx) {
    const row = document.getElementById('tick-row');
    row.innerHTML = '';
    EVENTS.forEach((ev, i) => {
      const div = document.createElement('div');
      div.className = 'tick'
        + (i < selectedIdx ? ' past' : '')
        + (i === selectedIdx ? ' sel' : '');
      div.textContent = ev.label;
      div.onclick = () => selectEvent(i);
      row.appendChild(div);
    });
  }

  /** Populate the event detail card for a given index. */
  function showDetail(idx) {
    const ev = EVENTS[idx];
    document.getElementById('ed-month').textContent    = ev.month;
    document.getElementById('ed-title-el').textContent = ev.title;
    document.getElementById('ed-desc').textContent     = ev.desc;

    const de = document.getElementById('ed-delta');
    de.textContent = (ev.delta > 0 ? '+' : '') + ev.delta + ' points';
    de.className   = 'ed-delta ' + (ev.positive ? 'pos' : 'neg');

    document.getElementById('ed-goal').innerHTML = ev.goalAchieved
      ? `<div class="goal-tag">⭐ Goal achieved: ${ev.goalAchieved}</div>`
      : '';

    document.getElementById('ev-detail').className = 'ev-detail show';
  }

  return { draw, buildTicks, showDetail, cumScores };
})();
