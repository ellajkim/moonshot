// js/app.js — entry point, wires all modules together
// Depends on: data.js, skills.js, timeline.js, skills-timeline.js, companion.js, ledger.js, Entryform.js
//
// selectEvent(idx) is the single source of truth for all UI updates.
// It is exposed globally so SVG onclick/onmouseenter attributes can call it.

(function () {
  // Remember how many events shipped in data.js, before any custom entries
  // are loaded back in — Entryform.js uses this to know what to persist.
  window.__SEED_COUNT__ = EVENTS.length;

  // Restore any entries the user added in a previous session.
  EntryFormModule.loadSavedEntries();
  // Rebuild timeline index to include any restored custom events.
  TimelineModule.rebuild();

  let _currentMode = 'all';      // 'all' | 'skills'
  let _currentPredicate = () => true;
  let _currentIdx = 0;

  window.selectEvent = function (idx) {
    if (idx === null || idx === undefined) return;
    _currentIdx = idx;
    // Recompute scores on every call so the timeline rescales correctly
    // as new entries are added at runtime via the entry form.
    const scores   = TimelineModule.cumScores();
    const maxScore = scores[scores.length - 1];

    const ev    = EVENTS[idx];
    const score = scores[idx];
    const pct   = Math.max(0, Math.round((score / maxScore) * 100));

    document.getElementById('score-pill').textContent = 'Score: ' + score;

    const skillTotals = SkillsModule.getSkillsAtEvent(idx);
    SkillsModule.update(skillTotals);

    if (_currentMode === 'all') {
      TimelineModule.draw(idx);
      TimelineModule.buildTicks(idx);
    } else {
      SkillsTimelineModule.draw(idx);
    }

    TimelineModule.showDetail(idx);
    CompanionModule.update(idx, pct, ev.positive);
    LedgerModule.update(idx);
  };

  // ── Graph mode switch ─────────────────────────────────────────────────────
  document.getElementById('graph-mode').addEventListener('change', function () {
    _currentMode = this.value;
    const sidebar = document.getElementById('skills-sidebar');
    const tickRow = document.getElementById('tick-row');
    const tlLabel = document.getElementById('tl-label');

    if (_currentMode === 'skills') {
      sidebar.style.display = 'flex';
      tickRow.style.display = 'none';
      tlLabel.textContent   = 'Skills journey — hover a line to focus';
      SkillsTimelineModule.setFilter(_currentPredicate);
      SkillsTimelineModule.reset();
      const initIdx = SkillsTimelineModule.getLastOrigIdx() !== null
        ? SkillsTimelineModule.getLastOrigIdx() : 0;
      selectEvent(initIdx);
    } else {
      sidebar.style.display = 'none';
      tickRow.style.display = '';
      tlLabel.textContent   = 'Journey arc — hover any point to explore';
      selectEvent(TimelineModule.firstActiveOrigIdx());
    }
  });

  // ── Time filter ───────────────────────────────────────────────────────────
  document.getElementById('time-filter').addEventListener('change', function () {
    const val = this.value;
    // Recompute max each time so newly-added entries are included.
    const maxEventTime = Math.max(...EVENTS.map(e => new Date(e.month).getTime()));

    if (val === 'year') {
      const d = new Date(maxEventTime);
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      const cutoff = d.getTime();
      _currentPredicate = e => new Date(e.month).getTime() >= cutoff;
    } else if (val === 'month') {
      const d = new Date(maxEventTime);
      d.setUTCMonth(d.getUTCMonth() - 1);
      const cutoff = d.getTime();
      _currentPredicate = e => new Date(e.month).getTime() >= cutoff;
    } else {
      _currentPredicate = () => true;
    }

    TimelineModule.setFilter(_currentPredicate);
    SkillsTimelineModule.setFilter(_currentPredicate);

    if (_currentMode === 'all') {
      selectEvent(TimelineModule.firstActiveOrigIdx());
    } else {
      const idx = SkillsTimelineModule.getLastOrigIdx() !== null
        ? SkillsTimelineModule.getLastOrigIdx() : 0;
      SkillsTimelineModule.draw(idx);
    }
  });

  // ── Skill checkboxes ──────────────────────────────────────────────────────
  function buildSkillCheckboxes() {
    const panel = document.getElementById('skills-sidebar');
    SKILLS.forEach(s => {
      const label = document.createElement('label');
      label.className = 'skill-cb';
      label.innerHTML = `
        <input type="checkbox" checked value="${s.key}">
        <span class="skill-cb-dot" style="background:${s.color}"></span>
        <span class="skill-cb-name">${s.label}</span>
      `;
      label.querySelector('input').addEventListener('change', function () {
        SkillsTimelineModule.setVisible(s.key, this.checked);
        const idx = SkillsTimelineModule.getLastOrigIdx();
        SkillsTimelineModule.draw(idx !== null ? idx : 0);
      });
      panel.appendChild(label);
    });
  }

  // ── Add a brand-new skill to the whole system ─────────────────────────────
  window.addNewSkillToSystem = function (skillDef) {
    SKILLS.push(skillDef);
    SkillsModule.build();
    SkillsTimelineModule.addSkill(skillDef.key);

    // Add a checkbox to the skills sidebar if it's visible
    const panel = document.getElementById('skills-sidebar');
    if (panel) {
      const label = document.createElement('label');
      label.className = 'skill-cb';
      label.innerHTML = `
        <input type="checkbox" checked value="${skillDef.key}">
        <span class="skill-cb-dot" style="background:${skillDef.color}"></span>
        <span class="skill-cb-name">${skillDef.label}</span>
      `;
      label.querySelector('input').addEventListener('change', function () {
        SkillsTimelineModule.setVisible(skillDef.key, this.checked);
        const idx = SkillsTimelineModule.getLastOrigIdx();
        SkillsTimelineModule.draw(idx !== null ? idx : 0);
      });
      panel.appendChild(label);
    }

    // Refresh current display with updated skill totals
    selectEvent(_currentIdx);
  };

  // ── Rerender after a new event is inserted ────────────────────────────────
  // Called by EntryFormModule after splicing a new event into EVENTS.
  window.rerenderAll = function (selectedIdx) {
    TimelineModule.rebuild();
    TimelineModule.setFilter(_currentPredicate);
    SkillsTimelineModule.setFilter(_currentPredicate);
    if (_currentMode === 'all') {
      TimelineModule.draw(selectedIdx);
      TimelineModule.buildTicks(selectedIdx);
    } else {
      SkillsTimelineModule.draw(selectedIdx);
    }
    selectEvent(selectedIdx);
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  SkillsModule.build();
  buildSkillCheckboxes();
  TimelineModule.draw(null);
  TimelineModule.buildTicks(-1);
  CompanionModule.draw(0, true);
  EntryFormModule.render();
  if (typeof GoalsModule !== 'undefined') GoalsModule.init();

  // Auto-select the first event after a brief paint delay — but if the user
  // submits an entry before this fires, cancel it so their new entry stays
  // selected instead of being overwritten back to event 0.
  const initialSelectTimer = setTimeout(() => selectEvent(0), 80);
  window.__cancelInitialSelect = () => clearTimeout(initialSelectTimer);
})();