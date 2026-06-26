// js/github.js — GitHub activity importer
// Depends on: data.js (SKILLS, EVENTS), Entryform.js (addBulk), app.js (addNewSkillToSystem)
//
// Uses /users/{username}/events, paginated up to 10 pages (GitHub's max, ~300 events, 90 days).
// Pagination is the key fix: without it, users with lots of watch/fork activity have their
// push events buried past the first page and never seen.

const GitHubModule = (() => {
  const STORAGE_KEY_TOKEN = 'gh_token';
  const STORAGE_KEY_USER  = 'gh_username';
  const STORAGE_KEY_SEEN  = 'gh_imported_ids';

  // GitHub language name → existing skill key
  const LANG_SKILL_MAP = {
    'Python':           'python',
    'Jupyter Notebook': 'python',
    'SQL':              'sql',
    'PLpgSQL':          'sql',
    'TSQL':             'sql',
    'PLSQL':            'sql',
    'R':                'stats',
    'C':                'systems',
    'C++':              'systems',
    'C#':               'systems',
    'Rust':             'systems',
    'Go':               'systems',
    'Java':             'systems',
    'Kotlin':           'systems',
    'Scala':            'systems',
    'Shell':            'systems',
    'Bash':             'systems',
    'Assembly':         'systems',
  };

  // Languages that auto-create a new skill (deduped by skill key)
  const LANG_NEW_SKILL = {
    'JavaScript':  { key: 'javascript', label: 'JavaScript', color: '#f0c040' },
    'TypeScript':  { key: 'javascript', label: 'JavaScript', color: '#f0c040' },
    'HTML':        { key: 'javascript', label: 'JavaScript', color: '#f0c040' },
    'CSS':         { key: 'javascript', label: 'JavaScript', color: '#f0c040' },
    'Vue':         { key: 'javascript', label: 'JavaScript', color: '#f0c040' },
    'Svelte':      { key: 'javascript', label: 'JavaScript', color: '#f0c040' },
    'Ruby':        { key: 'ruby',       label: 'Ruby',       color: '#e06060' },
    'PHP':         { key: 'php',        label: 'PHP',        color: '#9090cc' },
    'Swift':       { key: 'swift',      label: 'Swift',      color: '#e08050' },
    'Dart':        { key: 'dart',       label: 'Dart',       color: '#40b8d0' },
  };

  let _repoLangCache = {};
  let _pending       = [];
  let _checkStates   = {};

  // ── Seen IDs (deduplication) ──────────────────────────────────────────────────

  function getSeenIds() {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_SEEN) || '[]')); }
    catch (_) { return new Set(); }
  }

  function markSeen(ids) {
    const seen = getSeenIds();
    ids.forEach(id => seen.add(id));
    try { localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify([...seen])); } catch (_) {}
  }

  // ── GitHub API ────────────────────────────────────────────────────────────────

  async function apiFetch(url, token) {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      if (resp.status === 403 || resp.status === 429)
        throw new Error('Rate limited — add a personal access token for more requests.');
      if (resp.status === 404) throw new Error('User not found.');
      throw new Error(`GitHub API error ${resp.status}`);
    }
    return resp.json();
  }

  // Fetch all pages of a user's public events (GitHub caps at 10 pages / ~300 events).
  // Without pagination, push events can be buried past page 1 by watch/fork activity.
  async function fetchAllUserEvents(username, token, onProgress) {
    const all = [];
    for (let page = 1; page <= 10; page++) {
      onProgress(`Fetching events (page ${page})…`);
      const events = await apiFetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100&page=${page}`,
        token
      );
      if (!Array.isArray(events) || !events.length) break;
      all.push(...events);
      if (events.length < 100) break; // reached the last page
    }
    return all;
  }

  async function fetchRepoLanguages(repoFullName, token) {
    if (_repoLangCache[repoFullName]) return _repoLangCache[repoFullName];
    try {
      const langs = await apiFetch(`https://api.github.com/repos/${repoFullName}/languages`, token);
      _repoLangCache[repoFullName] = langs || {};
    } catch (_) {
      _repoLangCache[repoFullName] = {};
    }
    return _repoLangCache[repoFullName];
  }

  // ── Language → skill deltas ───────────────────────────────────────────────────

  function ensureSkillExists(def) {
    if (SKILLS.some(s => s.key === def.key)) return;
    if (window.addNewSkillToSystem) window.addNewSkillToSystem(def);
    else SKILLS.push(def);
  }

  function buildSkillDeltas(languages, totalXp) {
    const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
    const deltas = {};
    for (const [lang, bytes] of Object.entries(languages)) {
      const xp = Math.max(2, Math.round(totalXp * (bytes / totalBytes)));
      const existingKey = LANG_SKILL_MAP[lang];
      if (existingKey) {
        deltas[existingKey] = (deltas[existingKey] || 0) + xp;
      } else if (LANG_NEW_SKILL[lang]) {
        const def = LANG_NEW_SKILL[lang];
        ensureSkillExists(def);
        deltas[def.key] = (deltas[def.key] || 0) + xp;
      }
    }
    return deltas;
  }

  // Fill speech and todo via AutofillModule; leave milestone as-is (it has repo context).
  function applyAutofill(entry) {
    if (typeof AutofillModule === 'undefined') return;
    const auto = AutofillModule.generate(entry.title, entry.desc || '', entry.delta);
    if (auto) {
      entry.speech = auto.speech || '';
      entry.todo   = auto.todo   || '';
    }
  }

  // ── GitHub event → dashboard event ───────────────────────────────────────────

  async function convertGitHubEvents(ghEvents, token, onProgress) {
    const seen   = getSeenIds();
    const result = [];

    // ── Pass 1: bucket unseen PushEvents by repo; collect everything else ────────
    const pushByRepo  = {};  // repoFull → [ev, …]  (unseen only)
    const otherEvents = [];  // all unseen non-push events

    for (const ev of ghEvents) {
      if (seen.has(ev.id)) continue;
      if (ev.type === 'PushEvent') {
        const key = ev.repo ? ev.repo.name : null;
        if (!key) continue;
        (pushByRepo[key] = pushByRepo[key] || []).push(ev);
      } else {
        otherEvents.push(ev);
      }
    }

    // ── Pass 2: one merged event per repo ────────────────────────────────────────
    const repoKeys = Object.keys(pushByRepo);
    for (let ri = 0; ri < repoKeys.length; ri++) {
      const repoFull = repoKeys[ri];
      const repoName = repoFull.split('/')[1] || repoFull;
      const evs      = pushByRepo[repoFull];
      onProgress(`Fetching commits for ${repoName} (${ri + 1}/${repoKeys.length})…`);

      // oldest → newest so oldest.before…newest.head spans all commits
      evs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const oldestBefore = evs[0].payload.before || '';
      const newestHead   = evs[evs.length - 1].payload.head || '';
      const mostRecent   = evs[evs.length - 1];
      const date         = mostRecent.created_at.slice(0, 10);
      const allIds       = evs.map(ev => ev.id);

      // Fetch all commit messages between oldest before → newest head (one API call)
      let commitMsgs = [];
      const isZero = s => !s || /^0+$/.test(s);

      if (!isZero(oldestBefore) && !isZero(newestHead) && oldestBefore !== newestHead) {
        try {
          const cmp = await apiFetch(
            `https://api.github.com/repos/${repoFull}/compare/${oldestBefore}...${newestHead}`,
            token
          );
          if (cmp.commits && cmp.commits.length) {
            commitMsgs = cmp.commits.map(c => c.commit.message.split('\n')[0]);
          }
        } catch (_) {}
      }

      // Fallback 1: inline commits from payload (present when authenticated)
      if (!commitMsgs.length) {
        for (const ev of evs) {
          (ev.payload.commits || []).forEach(c => commitMsgs.push(c.message.split('\n')[0]));
        }
      }

      // Fallback 2: branch name only
      if (!commitMsgs.length) {
        const branches = [...new Set(
          evs.map(ev => (ev.payload.ref || '').replace('refs/heads/', '')).filter(Boolean)
        )];
        commitMsgs = branches.map(b => `Push to ${b}`);
      }

      const totalCommits = evs.reduce((sum, ev) =>
        sum + (ev.payload.size || ev.payload.distinct_size || (ev.payload.commits || []).length || 1), 0
      );
      const langs       = await fetchRepoLanguages(repoFull, token);
      const delta       = Math.min(25, Math.max(3, totalCommits * 2));
      const skillDeltas = buildSkillDeltas(langs, Math.round(delta * 0.9));
      const pushCount   = evs.length;

      // Deduplicate messages, cap at 8 for readability
      const uniqueMsgs = [...new Set(commitMsgs)].slice(0, 8);
      const msgStr     = uniqueMsgs.join(' · ');

      const pushEntry = {
        _ghId:     allIds[allIds.length - 1],  // most recent ID for UI
        _allGhIds: allIds,                      // all IDs to mark as seen on import
        label:     'Push',
        month:     date,
        title:     `Pushed to ${repoName}` +
                   (pushCount > 1 ? ` +${pushCount - 1} more push${pushCount > 2 ? 'es' : ''}` : ''),
        desc:      `[${repoFull}] ${msgStr}`.slice(0, 300),
        delta,
        positive:     true,
        goalAchieved: null,
        speech:       '',
        milestone:    `Committed to ${repoName}`,
        todo:         '',
        skillDeltas,
      };
      applyAutofill(pushEntry);
      result.push(pushEntry);
    }

    // ── Pass 3: non-push events ───────────────────────────────────────────────────
    for (const ev of otherEvents) {
      const repoFull = ev.repo ? ev.repo.name : null;
      const repoName = repoFull ? repoFull.split('/')[1] : '?';
      const date     = (ev.created_at || '').slice(0, 10);
      let entry      = null;

      if (ev.type === 'PullRequestEvent') {
        const action = ev.payload.action;
        const pr     = ev.payload.pull_request;
        if (!pr) continue;
        const merged = pr.merged || (action === 'closed' && pr.merged_at);

        const langs       = repoFull ? await fetchRepoLanguages(repoFull, token) : {};
        const delta       = merged ? 15 : 8;
        const skillDeltas = buildSkillDeltas(langs, delta);
        const prLabel     = merged ? 'Merged PR' : action === 'opened' ? 'Opened PR' :
                            action === 'closed'  ? 'Closed PR' : 'PR ' + action;

        entry = {
          _ghId:        ev.id,
          label:        'PR',
          month:        date,
          title:        `${prLabel}: ${pr.title}`,
          desc:         (pr.body || pr.title || '').slice(0, 300),
          delta,
          positive:     true,
          goalAchieved: merged ? `Merged PR in ${repoName}` : null,
          speech:       '',
          milestone:    `${prLabel} in ${repoName}`,
          todo:         '',
          skillDeltas,
        };

      } else if (ev.type === 'CreateEvent') {
        const refType = ev.payload.ref_type;
        const ref     = ev.payload.ref || '';
        const isRepo  = refType === 'repository';

        entry = {
          _ghId:        ev.id,
          label:        isRepo ? 'Repo' : 'Branch',
          month:        date,
          title:        isRepo ? `Created repo: ${repoName}` : `Created branch "${ref}" in ${repoName}`,
          desc:         isRepo
            ? (ev.payload.description || `Created GitHub repository ${repoName}.`)
            : `Created new branch "${ref}" in ${repoFull}.`,
          delta:        isRepo ? 10 : 3,
          positive:     true,
          goalAchieved: null,
          speech:       '',
          milestone:    isRepo ? `Created GitHub repo ${repoName}` : `New branch in ${repoName}`,
          todo:         '',
          skillDeltas:  {},
        };

      } else if (ev.type === 'IssuesEvent') {
        const issue  = ev.payload.issue;
        const action = ev.payload.action;
        if (!issue || !['opened', 'closed'].includes(action)) continue;

        entry = {
          _ghId:        ev.id,
          label:        'Issue',
          month:        date,
          title:        (action === 'closed' ? 'Closed issue: ' : 'Opened issue: ') + issue.title,
          desc:         (issue.body || issue.title || '').slice(0, 300),
          delta:        action === 'closed' ? 8 : 4,
          positive:     true,
          goalAchieved: action === 'closed' ? `Closed issue in ${repoName}` : null,
          speech:       '',
          milestone:    `${action === 'closed' ? 'Closed' : 'Filed'} issue in ${repoName}`,
          todo:         '',
          skillDeltas:  {},
        };

      } else if (ev.type === 'ReleaseEvent' && ev.payload.action === 'published') {
        const release = ev.payload.release;
        if (!release) continue;

        const langs       = repoFull ? await fetchRepoLanguages(repoFull, token) : {};
        const skillDeltas = buildSkillDeltas(langs, 15);

        entry = {
          _ghId:        ev.id,
          label:        'Release',
          month:        date,
          title:        `Released ${release.tag_name} — ${repoName}`,
          desc:         (release.body || `Published release ${release.tag_name} for ${repoFull}.`).slice(0, 300),
          delta:        20,
          positive:     true,
          goalAchieved: `Released ${release.tag_name} in ${repoName}`,
          speech:       '',
          milestone:    `Published ${release.tag_name} on ${repoName}`,
          todo:         '',
          skillDeltas,
        };

      } else if (ev.type === 'ForkEvent') {
        const forkee = ev.payload.forkee;
        entry = {
          _ghId:        ev.id,
          label:        'Fork',
          month:        date,
          title:        `Forked ${repoName}`,
          desc:         `Forked ${repoFull}${forkee ? ` → ${forkee.full_name}` : ''}.`,
          delta:        5,
          positive:     true,
          goalAchieved: null,
          speech:       '',
          milestone:    `Forked ${repoName}`,
          todo:         '',
          skillDeltas:  {},
        };
      }

      if (entry) { applyAutofill(entry); result.push(entry); }
    }

    return result;
  }

  // ── Result list rendering ─────────────────────────────────────────────────────

  function renderResults() {
    const container = document.getElementById('gh-results');
    if (!container) return;
    container.innerHTML = '';

    _pending.forEach(ev => {
      if (_checkStates[ev._ghId] === undefined) _checkStates[ev._ghId] = true;

      const skillTags = Object.entries(ev.skillDeltas || {})
        .map(([k, v]) => {
          const def = SKILLS.find(s => s.key === k);
          return def
            ? `<span class="gh-lang-tag" style="background:${def.color}22;color:${def.color};border-color:${def.color}44">${def.label} +${v}</span>`
            : '';
        }).join('');

      const row = document.createElement('label');
      row.className = 'gh-result-row';
      row.innerHTML = `
        <input type="checkbox" class="gh-cb" data-id="${ev._ghId}" ${_checkStates[ev._ghId] ? 'checked' : ''}/>
        <div class="gh-row-body">
          <div class="gh-row-top">
            <span class="gh-row-badge">${ev.label}</span>
            <span class="gh-row-date">${ev.month}</span>
            <span class="gh-row-title">${ev.title}</span>
            <span class="gh-row-delta">+${ev.delta}</span>
          </div>
          <div class="gh-row-desc">${ev.desc}</div>
          ${skillTags ? `<div class="gh-lang-tags">${skillTags}</div>` : ''}
        </div>
      `;

      row.querySelector('.gh-cb').addEventListener('change', function () {
        _checkStates[this.dataset.id] = this.checked;
      });

      container.appendChild(row);
    });
  }

  // ── Fetch handler ─────────────────────────────────────────────────────────────

  async function handleFetch() {
    const username = (document.getElementById('gh-username').value || '').trim();
    const token    = (document.getElementById('gh-token').value   || '').trim();
    if (!username) { document.getElementById('gh-username').focus(); return; }

    localStorage.setItem(STORAGE_KEY_USER, username);
    if (token) localStorage.setItem(STORAGE_KEY_TOKEN, token);

    const status  = document.getElementById('gh-status');
    const actions = document.getElementById('gh-import-actions');

    status.textContent = 'Starting…';
    document.getElementById('gh-results').innerHTML = '';
    actions.style.display = 'none';
    _pending       = [];
    _checkStates   = {};
    _repoLangCache = {};

    try {
      const ghEvents = await fetchAllUserEvents(username, token, msg => {
        status.textContent = msg;
      });

      if (!ghEvents.length) {
        status.textContent = 'No public events found for this user in the past 90 days.';
        return;
      }

      status.textContent = `Found ${ghEvents.length} raw events — detecting languages…`;
      _pending = await convertGitHubEvents(ghEvents, token, msg => {
        status.textContent = msg;
      });

      if (!_pending.length) {
        status.textContent =
          'No importable events (commits, PRs, new repos) found, or all have already been imported. ' +
          'Note: only public repo activity is visible without a token.';
        return;
      }

      // Show newest first
      _pending.sort((a, b) => b.month.localeCompare(a.month));

      status.textContent = `Found ${_pending.length} new event${_pending.length !== 1 ? 's' : ''} — select which to import.`;
      renderResults();
      actions.style.display = '';
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
    }
  }

  // ── Import handler ────────────────────────────────────────────────────────────

  async function handleImport() {
    const toImport = _pending.filter(ev => _checkStates[ev._ghId]);
    if (!toImport.length) return;

    const status = document.getElementById('gh-status');
    status.textContent = `Importing ${toImport.length} event${toImport.length !== 1 ? 's' : ''}…`;

    const clean = toImport.map(ev => {
      const e = Object.assign({}, ev);
      delete e._ghId;
      delete e._allGhIds;
      e._custom = true;
      return e;
    });

    if (typeof EntryFormModule !== 'undefined' && EntryFormModule.addBulk) {
      await EntryFormModule.addBulk(clean);
    }

    // Mark every constituent event ID as seen (merged push events carry _allGhIds)
    markSeen(toImport.flatMap(ev => ev._allGhIds || [ev._ghId]));

    const importedIds = new Set(toImport.map(ev => ev._ghId));
    _pending = _pending.filter(ev => !importedIds.has(ev._ghId));

    status.textContent = `✓ Imported ${toImport.length} event${toImport.length !== 1 ? 's' : ''} from GitHub.`;
    renderResults();
    if (!_pending.length) document.getElementById('gh-import-actions').style.display = 'none';
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function render() {
    const mount = document.getElementById('github-import-mount');
    if (!mount) return;

    const savedUser  = localStorage.getItem(STORAGE_KEY_USER)  || '';
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN) || '';

    mount.innerHTML = `
      <div class="gh-container">
        <button class="gh-toggle" id="gh-toggle" type="button">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
              0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
              -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
              .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
              -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
              1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82
              1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
              1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <span id="gh-toggle-label">Import from GitHub</span>
        </button>
        <button type="button" id="gh-download" class="gh-download-btn"
                title="Download ledger.js — add as a script tag to import your data">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path d="M8 2v8m0 0L5 7m3 3l3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 13h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>

        <div class="gh-panel" id="gh-panel">
          <div class="gh-fields">
            <div class="gh-field-row">
              <input type="text"     id="gh-username" class="gh-input" placeholder="GitHub username" value="${savedUser}" autocomplete="off"/>
              <input type="password" id="gh-token"    class="gh-input gh-input-token" placeholder="Personal access token (optional)" value="${savedToken}" autocomplete="off"/>
              <button type="button"  id="gh-fetch-btn" class="gh-fetch-btn">Fetch</button>
            </div>
            <div class="gh-hint-row">
              Fetches up to 300 public events from the past 90 days (commits, PRs, new repos).
              A token unlocks private repos and raises the rate limit.
            </div>
          </div>

          <div id="gh-status"  class="gh-status"></div>
          <div id="gh-results" class="gh-results"></div>

          <div id="gh-import-actions" class="gh-import-actions" style="display:none">
            <button type="button" id="gh-select-all"   class="gh-select-btn">Select all</button>
            <button type="button" id="gh-deselect-all" class="gh-select-btn">Deselect all</button>
            <button type="button" id="gh-import-btn"   class="gh-import-btn">Import Selected</button>
          </div>
        </div>
      </div>
    `;

    let isOpen = false;
    document.getElementById('gh-toggle').addEventListener('click', () => {
      const efPanel = document.getElementById('ef-panel');
      if (efPanel && efPanel.classList.contains('ef-panel-open')) {
        document.getElementById('ef-toggle').click();
      }
      isOpen = !isOpen;
      document.getElementById('gh-panel').classList.toggle('gh-panel-open', isOpen);
      document.getElementById('gh-toggle-label').textContent = isOpen ? 'Close GitHub Import' : 'Import from GitHub';
    });

    document.getElementById('gh-download').addEventListener('click', () => EntryFormModule.downloadLedgerJS());
    document.getElementById('gh-fetch-btn').addEventListener('click', handleFetch);
    document.getElementById('gh-username').addEventListener('keydown', e => { if (e.key === 'Enter') handleFetch(); });
    document.getElementById('gh-token').addEventListener('keydown',    e => { if (e.key === 'Enter') handleFetch(); });

    document.getElementById('gh-select-all').addEventListener('click', () => {
      _pending.forEach(ev => { _checkStates[ev._ghId] = true; });
      renderResults();
    });
    document.getElementById('gh-deselect-all').addEventListener('click', () => {
      _pending.forEach(ev => { _checkStates[ev._ghId] = false; });
      renderResults();
    });
    document.getElementById('gh-import-btn').addEventListener('click', handleImport);
  }

  return { render };
})();
