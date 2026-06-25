// js/skills.js — builds and updates the skill donut charts
// Depends on: data.js (SKILLS, EVENTS, SKILL_MAX)

const SkillsModule = (() => {
  const R    = 24;
  const CIRC = 2 * Math.PI * R;

  /** Compute cumulative skill totals up to and including eventIndex. */
  function getSkillsAtEvent(eventIndex) {
    const totals = {};
    SKILLS.forEach(s => { totals[s.key] = 0; });

    for (let i = 0; i <= eventIndex; i++) {
      const deltas = EVENTS[i].skillDeltas || {};
      Object.keys(deltas).forEach(k => {
        if (totals[k] !== undefined) totals[k] += deltas[k];
      });
    }

    // Clamp each skill to SKILL_MAX
    Object.keys(totals).forEach(k => {
      totals[k] = Math.min(totals[k], SKILL_MAX);
    });

    return totals;
  }

  /** Render the donut HTML into #skills-grid (called once on init). */
  function build() {
    const grid = document.getElementById('skills-grid');
    grid.innerHTML = '';

    SKILLS.forEach(s => {
      const wrapper = document.createElement('div');
      wrapper.className = 'skill-item';
      wrapper.innerHTML = `
        <div class="donut-wrap">
          <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
            <circle class="donut-bg" cx="30" cy="30" r="${R}"/>
            <circle
              class="donut-fg"
              id="donut-${s.key}"
              cx="30" cy="30" r="${R}"
              stroke="${s.color}"
              stroke-dasharray="${CIRC}"
              stroke-dashoffset="${CIRC}"
            />
          </svg>
          <div class="donut-label" id="donut-label-${s.key}">
            0%<span>${s.label}</span>
          </div>
        </div>
        <div class="skill-name">${s.label}</div>
      `;
      grid.appendChild(wrapper);
    });
  }

  /** Update all donut fills to match the given skill totals object. */
  function update(skillTotals) {
    SKILLS.forEach(s => {
      const pct    = Math.round((skillTotals[s.key] / SKILL_MAX) * 100);
      const offset = CIRC * (1 - pct / 100);
      const ring   = document.getElementById('donut-' + s.key);
      const label  = document.getElementById('donut-label-' + s.key);
      if (ring)  ring.style.strokeDashoffset = offset;
      if (label) label.innerHTML = `${pct}%<span>${s.label}</span>`;
    });
  }

  return { build, update, getSkillsAtEvent };
})();
