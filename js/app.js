// js/app.js — entry point, wires all modules together
// Depends on: data.js, skills.js, timeline.js, companion.js, ledger.js
//
// selectEvent(idx) is the single source of truth for all UI updates.
// It is exposed globally so SVG onclick attributes can call it.

(function () {
  const scores   = TimelineModule.cumScores();
  const maxScore = scores[scores.length - 1];

  /**
   * Select an event by index and update every panel accordingly.
   * Exposed as window.selectEvent so SVG inline handlers can reach it.
   */
  window.selectEvent = function (idx) {
    const ev      = EVENTS[idx];
    const score   = scores[idx];
    const pct     = Math.max(0, Math.round((score / maxScore) * 100));

    // Header score pill
    document.getElementById('score-pill').textContent = 'Score: ' + score;

    // Skill donuts
    const skillTotals = SkillsModule.getSkillsAtEvent(idx);
    SkillsModule.update(skillTotals);

    // Timeline arc + ticks + detail card
    TimelineModule.draw(idx);
    TimelineModule.buildTicks(idx);
    TimelineModule.showDetail(idx);

    // Companion
    CompanionModule.update(idx, pct, ev.positive);

    // Journey log
    LedgerModule.update(idx);
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  SkillsModule.build();
  TimelineModule.draw(null);
  TimelineModule.buildTicks(-1);
  CompanionModule.draw(0, true);

  // Auto-select the first event after a brief paint delay
  setTimeout(() => selectEvent(0), 80);
})();
