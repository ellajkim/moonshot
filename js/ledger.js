// js/ledger.js — builds the journey log entries
// Depends on: data.js (EVENTS)

const LedgerModule = (() => {

  /**
   * Render all events up to and including upToIndex into #ledger.
   * Entries are shown newest-first.
   */
  function update(upToIndex) {
    const container = document.getElementById('ledger');
    container.innerHTML = '';

    const entries = EVENTS.slice(0, upToIndex + 1).slice().reverse();

    entries.forEach(ev => {
      const color = ev.positive ? '#4070d8' : '#c05050';
      const div   = document.createElement('div');
      div.className = 'lentry';
      div.innerHTML = `
        <div class="lm">
          <div class="ldot" style="background:${color}"></div>
          ${ev.milestone}${ev.goalAchieved ? ' ⭐' : ''}
        </div>
        <div class="ltodo"><span>→ Next:</span> ${ev.todo}</div>
      `;
      container.appendChild(div);
    });
  }

  return { update };
})();
