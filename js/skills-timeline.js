// js/skills-timeline.js — per-skill interpolated line plots
// Depends on: data.js (SKILLS, EVENTS, SKILL_MAX)

const SkillsTimelineModule = (() => {
  const PL = 24, PR = 14, PT = 22, PB = 28;
  const W = 480, H = 240;

  let _focusedKey = null;
  let _lastOrigIdx = null;
  let _hoveredX = null;
  let _filter = () => true;
  let _eventPositions = []; // [{origIdx, x}] — rebuilt each draw(), read by mousemove handler
  const _visible = new Set(SKILLS.map(s => s.key));

  // Cumulative skill score at each event (within current filter) that affects this skill
  function skillPath(key) {
    let cum = 0;
    const result = [];
    EVENTS.forEach((ev, i) => {
      if (!_filter(ev)) return;
      const delta = (ev.skillDeltas || {})[key];
      if (delta) {
        cum = Math.min(cum + delta, SKILL_MAX);
        result.push({ ev: Object.assign({ _origIdx: i }, ev), cumScore: cum });
      }
    });
    return result;
  }

  function setFilter(predicate) {
    _filter = predicate;
  }

  // Date + score ranges across all visible skills (shared axes)
  function globalRanges() {
    const times = [], scores = [];
    SKILLS.forEach(s => {
      if (!_visible.has(s.key)) return;
      skillPath(s.key).forEach(p => {
        times.push(new Date(p.ev.month).getTime());
        scores.push(p.cumScore);
      });
    });
    if (!times.length) return null;
    const minT = Math.min(...times), maxT = Math.max(...times);
    return {
      minT,
      maxT: maxT > minT ? maxT : minT + 1,
      maxS: Math.max(...scores) + 8,
    };
  }

  function toX(t, r) {
    return PL + ((t - r.minT) / (r.maxT - r.minT)) * (W - PL - PR);
  }
  function toY(s, r) {
    return PT + (H - PT - PB) * (1 - s / r.maxS);
  }

  function draw(selectedOrigIdx) {
    const svg = document.getElementById('svg-timeline');
    if (!svg) return;
    const ranges = globalRanges();
    if (!ranges) { svg.innerHTML = ''; return; }

    // Focused skill renders last so it sits on top
    const ordered = [...SKILLS].sort((a, b) => {
      if (a.key === _focusedKey) return 1;
      if (b.key === _focusedKey) return -1;
      return 0;
    });

    let defs = '<defs>';
    ordered.forEach(s => {
      if (!_visible.has(s.key)) return;
      defs += `<linearGradient id="stg-${s.key}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${s.color}" stop-opacity=".18"/>
        <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/>
      </linearGradient>`;
    });
    defs += '</defs>';

    // Transparent background rect catches clicks outside all lines
    let body = `<rect x="0" y="0" width="${W}" height="${H}" fill="transparent"
                       onclick="window._stBgClick()"/>`;

    ordered.forEach(s => {
      if (!_visible.has(s.key)) return;
      const path = skillPath(s.key);
      if (!path.length) return;

      const pts = path.map(p => ({
        x: toX(new Date(p.ev.month).getTime(), ranges),
        y: toY(p.cumScore, ranges),
        p,
      }));
      const n = pts.length;

      const isFocused = _focusedKey === s.key;
      const opacity = _focusedKey === null ? 0.72 : (isFocused ? 1 : 0.12);

      let lineD = `M${pts[0].x},${pts[0].y}`;
      for (let i = 1; i < n; i++) {
        const cx = (pts[i - 1].x + pts[i].x) / 2;
        lineD += ` C${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
      }
      const fillD = n > 1
        ? `${lineD} L${pts[n - 1].x},${H - PB} L${pts[0].x},${H - PB} Z`
        : '';

      // Group id lets _stFocus/_stBgClick change opacity without a full redraw
      body += `<g id="sg-${s.key}" style="opacity:${opacity}"
                  onmouseenter="window._stFocus('${s.key}')">`;
      if (fillD) body += `<path d="${fillD}" fill="url(#stg-${s.key})"/>`;
      body += `<path d="${lineD}" fill="none" stroke="${s.color}"
                     stroke-width="${isFocused ? 2.5 : 2}"/>`;
      // Wide invisible stroke makes the line easy to hover
      body += `<path d="${lineD}" fill="none" stroke="transparent" stroke-width="14"/>`;

      // Dots and stars
      pts.forEach(pt => {
        const ev = pt.p.ev;
        const isSel = selectedOrigIdx !== null && ev._origIdx === selectedOrigIdx;
        const isGoal = !!ev.goalAchieved;

        if (isGoal) {
          const r = isSel ? 9 : 6.5, ri = r * 0.42;
          let star = '';
          for (let k = 0; k < 5; k++) {
            const a1 = (k * 72 - 90) * Math.PI / 180;
            const a2 = (k * 72 - 90 + 36) * Math.PI / 180;
            star += (k === 0 ? 'M' : 'L')
              + `${pt.x + Math.cos(a1) * r},${pt.y + Math.sin(a1) * r} `
              + `L${pt.x + Math.cos(a2) * ri},${pt.y + Math.sin(a2) * ri} `;
          }
          body += `<path d="${star}Z" fill="${s.color}" opacity="${isSel ? 1 : 0.85}"
                         style="cursor:pointer"
                         onmouseenter="window._stPointEnter(${ev._origIdx},'${s.key}',${pt.x})"
                         onmouseleave="window._stDotLeave()"
                         onclick="window._stPointClick(${ev._origIdx},'${s.key}')"/>`;
          if (isSel) {
            body += `<circle cx="${pt.x}" cy="${pt.y}" r="13" fill="none"
                             stroke="${s.color}" stroke-width="1" opacity="0.35"/>`;
          }
        } else {
          body += `<circle cx="${pt.x}" cy="${pt.y}" r="${isSel ? 6.5 : 4}"
                           fill="${s.color}" style="cursor:pointer"
                           onmouseenter="window._stPointEnter(${ev._origIdx},'${s.key}',${pt.x})"
                           onmouseleave="window._stDotLeave()"
                           onclick="window._stPointClick(${ev._origIdx},'${s.key}')"/>`;
          if (isSel) {
            body += `<circle cx="${pt.x}" cy="${pt.y}" r="10" fill="none"
                             stroke="${s.color}" stroke-width="1" opacity="0.35"/>`;
          }
        }
      });

      body += '</g>';
    });

    // Vertical guide line — rendered last (on top), pointer-events:none so dots stay clickable
    const _vx = _hoveredX !== null ? _hoveredX : 0;
    body += `<line id="st-vline" x1="${_vx}" x2="${_vx}" y1="${PT}" y2="${H - PB}"
                   stroke="rgba(255,255,255,0.28)" stroke-width="1"
                   pointer-events="none"${_hoveredX === null ? ' display="none"' : ''}/>`;

    // Rebuild event position index so the mousemove handler can snap to events
    const _epSeen = new Set();
    _eventPositions = [];
    ordered.forEach(s => {
      if (!_visible.has(s.key)) return;
      skillPath(s.key).forEach(p => {
        if (!_epSeen.has(p.ev._origIdx)) {
          _epSeen.add(p.ev._origIdx);
          _eventPositions.push({ origIdx: p.ev._origIdx, x: toX(new Date(p.ev.month).getTime(), ranges) });
        }
      });
    });

    svg.innerHTML = defs + body;
  }

  function setVisible(key, visible) {
    if (visible) _visible.add(key);
    else _visible.delete(key);
  }

  function getLastOrigIdx() { return _lastOrigIdx; }

  function reset() { _focusedKey = null; _eventPositions = []; }

  // ── Global SVG interaction handlers ────────────────────────────────────────

  // Focus a skill line by changing group opacities directly (no full redraw)
  window._stFocus = function(key) {
    _focusedKey = key;
    // Line-hover takes priority — hide any event vline
    _hoveredX = null;
    const vl = document.getElementById('st-vline');
    if (vl) vl.setAttribute('display', 'none');
    SKILLS.forEach(s => {
      const g = document.getElementById('sg-' + s.key);
      if (g) g.style.opacity = s.key === key ? '1' : '0.12';
    });
    // Thicken the focused line stroke
    const fg = document.getElementById('sg-' + key);
    if (fg) {
      const strokes = fg.querySelectorAll('path[stroke]');
      strokes.forEach(p => {
        if (p.getAttribute('stroke') !== 'transparent') p.setAttribute('stroke-width', '2.5');
      });
    }
  };

  // Background click: equal opacity for all, keep last event displayed
  window._stBgClick = function() {
    _focusedKey = null;
    _hoveredX = null;
    const vl = document.getElementById('st-vline');
    if (vl) vl.setAttribute('display', 'none');
    SKILLS.forEach(s => {
      const g = document.getElementById('sg-' + s.key);
      if (g) g.style.opacity = '0.72';
    });
  };

  // Hover over a specific point: focus line + update event detail + show vline
  window._stPointEnter = function(origIdx, key, x) {
    _lastOrigIdx = origIdx;
    _hoveredX = x !== undefined ? x : null;
    _focusedKey = key;
    if (window.selectEvent) window.selectEvent(origIdx);
    // selectEvent → draw() rebuilds SVG with vline baked in at _hoveredX
  };

  // Leave a dot: hide vline (line-focus state left unchanged)
  window._stDotLeave = function() {
    _hoveredX = null;
    const vl = document.getElementById('st-vline');
    if (vl) vl.setAttribute('display', 'none');
  };

  // Click a specific point
  window._stPointClick = function(origIdx, key) {
    _lastOrigIdx = origIdx;
    _focusedKey = key;
    if (window.selectEvent) window.selectEvent(origIdx);
  };

  function addSkill(key) { _visible.add(key); }

  // ── Persistent SVG mousemove — runs once, survives innerHTML rebuilds ──────
  ;(function() {
    const svg = document.getElementById('svg-timeline');
    if (!svg) return;
    let _hoverOrigIdx = null; // tracks which event is currently closest to cursor

    svg.addEventListener('mousemove', function(evt) {
      if (!_eventPositions.length) return; // not in skills mode

      const rect = svg.getBoundingClientRect();
      const svgX = (evt.clientX - rect.left) * (W / rect.width);

      // Detect whether cursor is on a skill line stroke (not a dot element)
      const t = evt.target;
      const inGroup = t.closest && t.closest('[id^="sg-"]');
      const isDot = t.tagName === 'circle' || (t.style && t.style.cursor === 'pointer');
      const overLinePath = !!(inGroup && !isDot);

      // Snap to nearest event within threshold
      let best = null, bestDist = 18;
      _eventPositions.forEach(pos => {
        const d = Math.abs(svgX - pos.x);
        if (d < bestDist) { best = pos; bestDist = d; }
      });

      if (best) {
        // Show vline only when not directly over a skill line stroke
        const showVline = !overLinePath;
        _hoveredX = showVline ? best.x : null;
        const vl = document.getElementById('st-vline');
        if (vl) {
          if (showVline) {
            vl.setAttribute('x1', best.x); vl.setAttribute('x2', best.x);
            vl.removeAttribute('display');
          } else {
            vl.setAttribute('display', 'none');
          }
        }

        // Update event detail only when the nearest event changes
        if (best.origIdx !== _hoverOrigIdx) {
          _hoverOrigIdx = best.origIdx;
          _lastOrigIdx = best.origIdx;
          if (window.selectEvent) window.selectEvent(best.origIdx);
        }
      } else {
        // Cursor not near any event
        if (_hoverOrigIdx !== null) {
          _hoverOrigIdx = null;
          _hoveredX = null;
          const vl = document.getElementById('st-vline');
          if (vl) vl.setAttribute('display', 'none');
        }
      }
    });

    svg.addEventListener('mouseleave', function() {
      _hoverOrigIdx = null;
      _hoveredX = null;
      const vl = document.getElementById('st-vline');
      if (vl) vl.setAttribute('display', 'none');
    });
  })();

  return { draw, setVisible, setFilter, getLastOrigIdx, reset, addSkill };
})();
