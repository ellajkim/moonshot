// js/goals.js — flexible goal tracker with auto-escalating successors
// Depends on: data.js (optional GOALS seed array)
// Used by: entryform.js, which calls GoalsModule.checkEntry(text) every time
//          a new ledger entry is logged.
//
// v3 changes:
//   • Completed goals automatically spawn a harder successor goal so the
//     list is never empty. The escalation ladder:
//       - Number-based goals (gym 3 times): next target follows a progressive
//         curve — roughly doubles at first then tapers (3→8→15→25→40→60→100).
//       - Non-trackable / target=1 goals: goal repeats at a higher implied
//         standard, e.g. "Debug 120 lines" → "Debug 250 lines".
//       - Apply-style goals: 5→10→20→35→50→75→100.
//   • The list always has at least one active (not-done) goal rendered.
//   • Successor goals are marked with a 🔥 streak badge so the user sees
//     the escalation clearly.
//   • Star-transform on timeline still fires on completion (unchanged from v2).

const GoalsModule = (() => {
  const STORAGE_KEY = 'psl_goals';

  // ── Escalation helpers ────────────────────────────────────────────────────

  /**
   * Given a completed goal, return the text for its successor.
   * Strategy:
   *   1. If the original text contains a number, replace it with the next
   *      target on the escalation ladder.
   *   2. If no number, repeat the goal — same text, same keywords — which
   *      keeps the tracking working and signals "do it again, keep the streak."
   */
  function nextGoalText(completedGoal) {
    const numMatch = completedGoal.text.match(/\b(\d+)\b/);
    if (!numMatch) {
      // No number — repeat the goal as-is (habits, one-time achievements
      // that should be sustained, untrackable things like "debug X lines"
      // where no number was given).
      return completedGoal.text;
    }

    const current = parseInt(numMatch[1], 10);
    const next    = escalate(current);
    return completedGoal.text.replace(/\b\d+\b/, String(next));
  }

  /**
   * Progressive escalation curve.
   * Small numbers grow quickly; large numbers grow by ~40-60%.
   * Examples: 1→3, 3→8, 5→10, 8→15, 10→20, 15→25, 20→35,
   *           25→40, 50→75, 100→150, 120→200, 250→400.
   */
  function escalate(n) {
    if (n <= 1)   return 3;
    if (n <= 3)   return 8;
    if (n <= 5)   return 10;
    if (n <= 8)   return 15;
    if (n <= 10)  return 20;
    if (n <= 15)  return 25;
    if (n <= 20)  return 35;
    if (n <= 25)  return 40;
    if (n <= 35)  return 55;
    if (n <= 50)  return 75;
    if (n <= 75)  return 100;
    if (n <= 100) return 150;
    // For large arbitrary numbers (debug 120 lines → ~2×)
    return Math.round(n * 1.65 / 5) * 5; // round to nearest 5
  }

  /**
   * Spawn a successor goal from a completed one and push it into the list.
   * Carries forward the progress from the completed goal's target so the
   * counter reads e.g. "3/8" the moment it appears (head-start credit).
   */
  function spawnSuccessor(completedGoal) {
    const text      = nextGoalText(completedGoal);
    const parsed    = parseGoal(text);
    // Give head-start credit: the work already done counts toward the new goal.
    const headStart = Math.min(completedGoal.target, parsed.target - 1);
    goals.push({
      ...parsed,
      progress:    headStart,
      done:        false,
      isSuccessor: true,           // drives the 🔥 badge in the UI
      streak:      (completedGoal.streak || 0) + 1,
    });
  }

  // ── Text processing ───────────────────────────────────────────────────────

  const STOPWORDS = new Set([
    'a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'at', 'my', 'your', 'our',
    'his', 'her', 'their', 'i', 'you', 'we', 'they', 'it', 'this', 'that',
    'and', 'or', 'with', 'today', 'yesterday', 'time', 'times', 'x', 'finally',
    'have', 'has', 'had', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
    'will', 'just', 'really', 'very', 'so', 'then', 'also', 'again', 'up',
  ]);

  const IRREGULAR = {
    went: 'go', gone: 'go', going: 'go',
    did: 'do', done: 'do', doing: 'do',
    got: 'get', getting: 'get',
    ran: 'run', running: 'run',
    ate: 'eat', eaten: 'eat',
    wrote: 'write', written: 'write',
    made: 'make', making: 'make',
    saw: 'see', seen: 'see',
  };

  const STEM_STOPWORDS = new Set(['go', 'get']);

  function stem(word) {
    if (IRREGULAR[word]) return IRREGULAR[word];
    let w = word;
    if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
    else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
    else if (w.length > 4 && w.endsWith('es')) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith('s'))  w = w.slice(0, -1);
    return w;
  }

  function tokenize(text) {
    return (text.toLowerCase().match(/[a-z']+/g) || []);
  }

  function parseGoal(rawText) {
    const text  = rawText.trim();
    const lower = text.toLowerCase();

    const numMatch      = lower.match(/\b(\d+)\b/);
    const target        = numMatch ? Math.max(1, parseInt(numMatch[1], 10)) : 1;
    const withoutNumber = numMatch ? lower.replace(numMatch[0], ' ') : lower;

    const words    = tokenize(withoutNumber);
    const keywords = [];
    words.forEach(w => {
      if (STOPWORDS.has(w)) return;
      const s = stem(w);
      if (STEM_STOPWORDS.has(s)) return;
      keywords.push(s);
    });
    const uniqueKeywords = [...new Set(keywords.length ? keywords : words.map(stem))];

    return { text, target, keywords: uniqueKeywords };
  }

  function entryMatchesGoal(entryText, goal) {
    if (!goal.keywords.length) return false;
    const entryLower = entryText.toLowerCase();
    const entryStems = new Set(tokenize(entryText).map(stem));
    return goal.keywords.every(k => entryStems.has(k) || entryLower.includes(k));
  }

  // ── State ─────────────────────────────────────────────────────────────────

  let goals = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        goals = JSON.parse(raw);
        // Guarantee at least one active goal after loading
        ensureActiveGoal();
        return;
      }
    } catch (e) {
      console.warn('GoalsModule: could not load saved goals', e);
    }
    if (typeof GOALS !== 'undefined' && Array.isArray(GOALS)) {
      goals = GOALS.map(g => {
        const parsed = parseGoal(typeof g === 'string' ? g : g.text);
        return { ...parsed, progress: 0, done: false, streak: 0 };
      });
    }
  }

  /**
   * If every goal in the list is done, spawn a successor from the most
   * recently completed one so the panel is never empty of active goals.
   */
  function ensureActiveGoal() {
    const hasActive = goals.some(g => !g.done);
    if (!hasActive && goals.length > 0) {
      // Find the last completed goal (highest index)
      const lastDone = [...goals].reverse().find(g => g.done);
      if (lastDone) spawnSuccessor(lastDone);
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch (e) {
      console.warn('GoalsModule: could not persist goals', e);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function render() {
    const mount = document.getElementById('goals-mount');
    if (!mount) return;

    // Separate active and done for display order: active first, done below
    const active = goals.filter(g => !g.done);
    const done   = goals.filter(g =>  g.done);
    const ordered = [...active, ...done];

    const items = ordered.map((g, displayIdx) => {
      // Map back to the real index in goals[] for deletion
      const realIdx = goals.indexOf(g);

      const progressLabel = g.target > 1
        ? `<span class="goal-progress">${Math.min(g.progress, g.target)}/${g.target}</span>`
        : '';

      const streakBadge = g.isSuccessor && !g.done
        ? `<span class="goal-streak" title="Streak level ${g.streak}">🔥${g.streak}</span>`
        : '';

      return `
        <li class="goal-item ${g.done ? 'done' : ''}">
          <span class="goal-check">${g.done ? '✓' : ''}</span>
          <span class="goal-text">${g.text}</span>
          ${streakBadge}
          ${progressLabel}
          <button type="button" class="goal-del" data-idx="${realIdx}" title="Remove goal">×</button>
        </li>
      `;
    }).join('');

    mount.innerHTML = `
      <div class="goals-card">
        <div class="goals-ttl">Goals</div>
        <ul class="goals-list" id="goals-list">
          ${items || '<li class="goal-empty">No goals yet — add one below.</li>'}
        </ul>
        <form id="goal-add-form" class="goal-add-row" autocomplete="off">
          <input type="text" id="goal-add-input" placeholder="Add a goal, e.g. Go to the gym 3 times"/>
          <button type="submit" class="goal-add-btn" aria-label="Add goal">+</button>
        </form>
      </div>
    `;

    document.getElementById('goal-add-form').addEventListener('submit', handleAddGoal);
    mount.querySelectorAll('.goal-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        goals.splice(idx, 1);
        ensureActiveGoal();
        persist();
        render();
      });
    });
  }

  function handleAddGoal(e) {
    e.preventDefault();
    const input = document.getElementById('goal-add-input');
    const text  = input.value.trim();
    if (!text) return;
    goals.push({ ...parseGoal(text), progress: 0, done: false, streak: 0 });
    persist();
    render();
    input.value = '';
  }

  // ── Entry checking ────────────────────────────────────────────────────────

  /**
   * Called every time a new ledger entry is logged.
   * `entryText` is matched against active goals' keywords.
   * `eventIdx`  is the EVENTS index of the entry that was just logged
   *             (pass this explicitly — do not assume it's the last
   *             element, since backdated entries are inserted
   *             chronologically and may land anywhere in EVENTS).
   * Returns the text of a goal that just completed (or null).
   */
  function checkEntry(entryText, eventIdx) {
    let justCompleted = null;

    goals.forEach(g => {
      if (g.done) return;
      if (entryMatchesGoal(entryText, g)) {
        g.progress = Math.min(g.target, (g.progress || 0) + 1);
        if (g.progress >= g.target) {
          g.done        = true;
          justCompleted = g.text;

          // Spawn the next harder goal immediately
          spawnSuccessor(g);

          // ── Star transform: mark the event that was just logged ───────────
          const idx = (eventIdx !== undefined && eventIdx !== null) ? eventIdx : EVENTS.length - 1;
          if (idx >= 0 && EVENTS[idx] && !EVENTS[idx].goalAchieved) {
            EVENTS[idx].goalAchieved = g.text;
            // No need to call into TimelineModule here — both timeline.js and
            // skills-timeline.js read ev.goalAchieved directly on every draw,
            // and Entryform.js's handleSubmit calls window.rerenderAll(targetIdx)
            // right after this, which redraws and picks up the star.
          }
        }
      }
    });

    persist();
    render();
    return justCompleted;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    load();
    persist();
    render();
  }

  return { init, checkEntry, getGoals: () => goals.slice() };
})();