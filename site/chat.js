/**
 * GRIDLOCK CHAT ASSISTANT — site/chat.js
 *
 * Floating chat widget that queries a Vercel serverless function (/api/chat)
 * which in turn calls the Gemini API. No API key is present in this file.
 *
 * DATA PATH NOTE:
 *   Export JSON files must be reachable at ./exports/*.json relative to index.html.
 *   → For Vercel deploy: copy the exports/ folder into site/exports/
 *   → For local dev:     run `python3 -m http.server 8080` from the site/ directory
 *                        after copying exports there, OR serve from project root with
 *                        a dev server that also mounts /exports/.
 */

(function () {
  'use strict';

  // ── CONFIGURATION ─────────────────────────────────────────
  /** Base path for JSON data files (relative to index.html). */
  const DATA_BASE = './exports';

  /** Backend endpoint — Vercel serverless function. */
  const API_ENDPOINT = '/api/chat';

  /** Suggested starter questions shown in the welcome state. */
  const SUGGESTIONS = [
    'What is the top hotspot by impact score?',
    'Which police station has the highest workload?',
    'Tell me about KR Market violations',
    'Who are the top repeat offenders?',
    'What is the peak enforcement time?',
  ];

  // ── STATE ─────────────────────────────────────────────────
  let panelOpen      = false;
  let dataLoaded     = false;
  let dataLoading    = false;
  let awaitingReply  = false;

  // Data stores (populated from JSON files)
  let hotspots    = [];   // export_hotspots.json
  let offenders   = [];   // export_repeat_offenders.json
  let stations    = [];   // export_police_stations.json
  let keyFindings = {};   // export_key_findings.json

  // Known station names (populated after load, for fast matching)
  let stationNames = [];
  // Sorted hotspots by impact_score desc (populated after load)
  let hotspotsByScore = [];

  // Message history [{role:'user'|'assistant', text, id}]
  let messages = [];
  let msgIdCounter = 0;

  // ── DOM REFS ──────────────────────────────────────────────
  let elBtn, elPanel, elMsgList, elInput, elSend;
  let elStatusDot, elWelcome, elDataLoader;

  // ── ENTRY POINT ───────────────────────────────────────────
  function init() {
    buildDOM();
    bindEvents();
  }

  // ── BUILD DOM ─────────────────────────────────────────────
  function buildDOM() {
    const root = document.createElement('div');
    root.id = 'chat-root';
    root.innerHTML = `
      <button id="chat-btn" aria-label="Open AI assistant">
        <svg id="chat-icon-open" width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7l-4 3V4z"
                stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          <circle cx="8" cy="8.5" r="1" fill="currentColor"/>
          <circle cx="11" cy="8.5" r="1" fill="currentColor"/>
          <circle cx="14" cy="8.5" r="1" fill="currentColor"/>
        </svg>
        <svg id="chat-icon-close" width="18" height="18" viewBox="0 0 18 18" fill="none" style="display:none">
          <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <div id="chat-panel" aria-hidden="true" role="dialog" aria-label="GridLock AI Assistant">
        <div id="chat-header">
          <div id="chat-header-icon">🗺️</div>
          <div id="chat-header-text">
            <h4>GridLock Assistant</h4>
            <p>Bengaluru Parking Intelligence</p>
          </div>
          <div id="chat-status-dot" title="Status">Loading</div>
        </div>

        <div id="chat-messages">
          <div id="chat-welcome">
            <div class="welcome-icon">📊</div>
            <h5>Ask about Bengaluru parking hotspots</h5>
            <p>I have access to 298,450 violations, 2,298 hotspots, 35,587 repeat offenders, and 54 police stations.</p>
            <div class="chat-suggestion-chips" id="chat-chips"></div>
          </div>
          <div id="chat-data-loader">
            <div class="loader-spin"></div>
            <span>Loading analysis data…</span>
          </div>
        </div>

        <div id="chat-input-area">
          <textarea
            id="chat-input"
            rows="1"
            placeholder="Ask a question about the data…"
            aria-label="Your question"
            maxlength="600"
          ></textarea>
          <button id="chat-send" disabled aria-label="Send">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    elBtn        = document.getElementById('chat-btn');
    elPanel      = document.getElementById('chat-panel');
    elMsgList    = document.getElementById('chat-messages');
    elInput      = document.getElementById('chat-input');
    elSend       = document.getElementById('chat-send');
    elStatusDot  = document.getElementById('chat-status-dot');
    elWelcome    = document.getElementById('chat-welcome');
    elDataLoader = document.getElementById('chat-data-loader');

    // Render suggestion chips
    const chipsEl = document.getElementById('chat-chips');
    SUGGESTIONS.forEach(s => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = s;
      chip.addEventListener('click', () => submitQuery(s));
      chipsEl.appendChild(chip);
    });
  }

  // ── EVENT BINDING ─────────────────────────────────────────
  function bindEvents() {
    elBtn.addEventListener('click', togglePanel);

    elSend.addEventListener('click', () => {
      const q = elInput.value.trim();
      if (q) submitQuery(q);
    });

    elInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const q = elInput.value.trim();
        if (q && !awaitingReply) submitQuery(q);
      }
    });

    // Auto-resize textarea
    elInput.addEventListener('input', () => {
      elInput.style.height = 'auto';
      elInput.style.height = Math.min(elInput.scrollHeight, 100) + 'px';
      elSend.disabled = elInput.value.trim().length === 0 || awaitingReply || !dataLoaded;
    });

    // Close panel on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panelOpen) togglePanel();
    });
  }

  // ── PANEL TOGGLE ──────────────────────────────────────────
  function togglePanel() {
    panelOpen = !panelOpen;
    elPanel.classList.toggle('visible', panelOpen);
    elPanel.setAttribute('aria-hidden', String(!panelOpen));
    elBtn.classList.toggle('open', panelOpen);
    document.getElementById('chat-icon-open').style.display  = panelOpen ? 'none'  : '';
    document.getElementById('chat-icon-close').style.display = panelOpen ? ''      : 'none';

    if (panelOpen && !dataLoaded && !dataLoading) {
      loadData();
    }
    if (panelOpen) {
      setTimeout(() => elInput.focus(), 230);
    }
  }

  // ── DATA LOADING ──────────────────────────────────────────
  async function loadData() {
    if (dataLoading || dataLoaded) return;
    dataLoading = true;

    setStatus('loading-data', 'Loading…');
    elDataLoader.classList.add('visible');
    elSend.disabled = true;

    try {
      const [hRes, oRes, sRes, kRes] = await Promise.all([
        fetch(`${DATA_BASE}/export_hotspots.json`),
        fetch(`${DATA_BASE}/export_repeat_offenders.json`),
        fetch(`${DATA_BASE}/export_police_stations.json`),
        fetch(`${DATA_BASE}/export_key_findings.json`),
      ]);

      if (!hRes.ok || !oRes.ok || !sRes.ok || !kRes.ok) {
        throw new Error('One or more data files could not be fetched (check exports path).');
      }

      [hotspots, offenders, stations, keyFindings] = await Promise.all([
        hRes.json(), oRes.json(), sRes.json(), kRes.json(),
      ]);

      // Pre-sort hotspots by impact_score for fast fallback context
      hotspotsByScore = [...hotspots].sort((a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0));
      stationNames    = stations.map(s => (s.police_station ?? '').toLowerCase());

      // Expose to window for index.html (Hotspot Panel)
      window.gridlockData = { hotspots, offenders, stations, keyFindings };

      dataLoaded  = true;
      dataLoading = false;
      setStatus('ready', 'Ready');
      elDataLoader.classList.remove('visible');
      elSend.disabled = elInput.value.trim().length === 0;

    } catch (err) {
      console.error('[chat] Data load failed:', err.message);
      dataLoading = false;
      setStatus('', 'Error');
      elDataLoader.classList.remove('visible');
      pushMessage('assistant',
        '⚠️ Could not load analysis data. Make sure the `exports/` folder is available alongside the site. ' +
        'See the setup instructions in `site/chat.js`.'
      );
    }
  }

  // ── CONTEXT SELECTION (rule-based, no embeddings) ─────────
  /**
   * Decides what subset of data to include as LLM context for a given query.
   * Rules are checked in priority order; multiple contexts can be combined.
   *
   * @param {string} question - The raw user question (lowercased internally).
   * @returns {object} - Context object sent to the server.
   */
  function selectContext(question) {
    const q = question.toLowerCase();
    const ctx = {
      key_findings: keyFindings,   // Always included — small and high-value
    };

    // ── RULE 1: Hotspot name match ──────────────────────────
    // If query contains a substring matching any known hotspot label_name,
    // include that specific hotspot's full record.
    const matchedHotspots = hotspots.filter(h =>
      h.label_name && q.includes(h.label_name.toLowerCase().slice(0, 20))
    );
    if (matchedHotspots.length > 0) {
      ctx.matched_hotspots = matchedHotspots.slice(0, 5); // cap at 5 to keep prompt lean
    }

    // ── RULE 2: Repeat offender / vehicle query ─────────────
    // Trigger on offender/vehicle keywords or a FKN-prefixed vehicle number pattern.
    const offenderKeywords = ['repeat', 'offender', 'vehicle number', 'fkn', 'chronic', 'recidivist'];
    const vehiclePattern   = /fkn\d+/i;
    const isOffenderQuery  = offenderKeywords.some(kw => q.includes(kw)) || vehiclePattern.test(q);
    if (isOffenderQuery) {
      // Include top 40 by total_occurrences (already sorted in export)
      ctx.top_repeat_offenders = offenders.slice(0, 40);
    }

    // ── RULE 3: Police station query ────────────────────────
    // Trigger on station/jurisdiction keywords, or a known station name in the query.
    const stationKeywords  = ['station', 'jurisdiction', 'police', 'precinct', 'coverage'];
    const isStationQuery   = stationKeywords.some(kw => q.includes(kw)) ||
                             stationNames.some(name => name.length > 3 && q.includes(name));
    if (isStationQuery) {
      // Try to include matched station specifically; else include all (only 54 rows)
      const matchedStations = stations.filter(s =>
        s.police_station && q.includes(s.police_station.toLowerCase())
      );
      ctx.police_stations = matchedStations.length > 0 ? matchedStations : stations;
    }

    // ── RULE 4: General fallback ─────────────────────────────
    // If no specific match was found (only key_findings in ctx so far),
    // include the top 20 hotspots by impact_score as general context.
    const hasSpecificContext = ctx.matched_hotspots || ctx.top_repeat_offenders || ctx.police_stations;
    if (!hasSpecificContext) {
      ctx.top_hotspots_by_impact = hotspotsByScore.slice(0, 20);
    }

    return ctx;
  }

  // ── SUBMIT A QUERY ────────────────────────────────────────
  async function submitQuery(question) {
    if (!dataLoaded || awaitingReply || !question.trim()) return;

    // Hide welcome screen after first message
    if (elWelcome) {
      elWelcome.style.display = 'none';
    }

    elInput.value = '';
    elInput.style.height = 'auto';
    elSend.disabled = true;
    awaitingReply   = true;
    setStatus('thinking', 'Thinking…');

    pushMessage('user', question);
    const typingEl = showTypingIndicator();

    const context = selectContext(question);

    try {
      const res = await fetch(API_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question, context }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      removeTypingIndicator(typingEl);
      pushMessage('assistant', data.answer ?? 'No response received.');

    } catch (err) {
      removeTypingIndicator(typingEl);
      pushMessage('assistant',
        `Sorry, I couldn't process that right now — please try again.\n\n_(${err.message})_`
      );
    } finally {
      awaitingReply = false;
      setStatus('ready', 'Ready');
      elSend.disabled = elInput.value.trim().length === 0;
      elInput.focus();
    }
  }

  // ── MESSAGE RENDERING ─────────────────────────────────────
  function pushMessage(role, text) {
    const id  = ++msgIdCounter;
    const msg = { id, role, text };
    messages.push(msg);

    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    el.dataset.id = id;
    el.innerHTML = `
      <div class="chat-bubble">${escapeHtml(text)}</div>
      <span class="chat-time">${timeNow()}</span>
    `;
    elMsgList.appendChild(el);
    scrollToBottom();
    return el;
  }

  function showTypingIndicator() {
    const el = document.createElement('div');
    el.className = 'chat-msg assistant';
    el.id = 'typing-indicator';
    el.innerHTML = `<div class="chat-typing"><span></span><span></span><span></span></div>`;
    elMsgList.appendChild(el);
    scrollToBottom();
    return el;
  }

  function removeTypingIndicator(el) {
    el?.remove();
  }

  function scrollToBottom() {
    elMsgList.scrollTop = elMsgList.scrollHeight;
  }

  // ── STATUS DOT ────────────────────────────────────────────
  function setStatus(cls, label) {
    elStatusDot.className = cls;
    elStatusDot.textContent = label;
  }

  // ── HELPERS ───────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ── KICK OFF ──────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
