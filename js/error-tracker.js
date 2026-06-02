(function () {
  'use strict';

  const STORAGE_KEY = 'scenicone_errors';
  const MAX_ERRORS = 50;
  const isDevMode = localStorage.getItem('devmode') === 'true';
  const fingerprints = new Set();

  window.__scenicErrors = [];

  function hash(input) {
    let h = 5381;
    const str = String(input || '');
    for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h) + str.charCodeAt(i);
    return (h >>> 0).toString(16).slice(0, 8);
  }

  function readStored() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeStored(errors) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(-MAX_ERRORS)));
    } catch (_) {
      // no-op
    }
  }

  function createEntry(type, message, stack) {
    const timestamp = new Date().toISOString();
    const url = window.location.href;
    const userAgent = navigator.userAgent;
    const fingerprint = hash([type, message, stack, url].join('|'));
    return { type, message, stack, url, timestamp, userAgent, fingerprint };
  }

  function capture(type, message, stack) {
    const entry = createEntry(type, message, stack);
    if (fingerprints.has(entry.fingerprint)) return;
    fingerprints.add(entry.fingerprint);

    window.__scenicErrors.push(entry);

    const stored = readStored();
    stored.push(entry);
    writeStored(stored);

    if (isDevMode) renderOverlay(entry);
  }

  function renderOverlay(lastEntry) {
    let panel = document.getElementById('scenic-error-overlay');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'scenic-error-overlay';
      panel.style.cssText = [
        'position:fixed',
        'left:12px',
        'bottom:12px',
        'z-index:99999',
        'max-width:420px',
        'background:#111',
        'color:#f5f5f5',
        'border:1px solid #ff4d4f',
        'border-radius:8px',
        'font:12px/1.4 monospace',
        'padding:10px',
        'box-shadow:0 8px 20px rgba(0,0,0,.35)'
      ].join(';');
      panel.innerHTML = '' +
        '<div id="scenic-error-head" style="cursor:pointer;display:flex;justify-content:space-between;gap:8px;align-items:center">' +
        '<strong style="color:#ff4d4f">Errors: <span id="scenic-error-count">0</span></strong>' +
        '<button id="scenic-error-clear" type="button" style="background:#ff4d4f;color:#fff;border:0;padding:4px 8px;border-radius:4px;cursor:pointer">Clear</button>' +
        '</div>' +
        '<div id="scenic-error-last" style="margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>' +
        '<pre id="scenic-error-stack" style="display:none;margin-top:8px;max-height:180px;overflow:auto;white-space:pre-wrap"></pre>';
      document.body.appendChild(panel);

      panel.querySelector('#scenic-error-head').addEventListener('click', function (e) {
        if (e.target && e.target.id === 'scenic-error-clear') return;
        const stack = panel.querySelector('#scenic-error-stack');
        stack.style.display = stack.style.display === 'none' ? 'block' : 'none';
      });

      panel.querySelector('#scenic-error-clear').addEventListener('click', function () {
        window.__scenicErrors = [];
        fingerprints.clear();
        writeStored([]);
        panel.querySelector('#scenic-error-count').textContent = '0';
        panel.querySelector('#scenic-error-last').textContent = 'No errors';
        panel.querySelector('#scenic-error-stack').textContent = '';
      });
    }

    panel.querySelector('#scenic-error-count').textContent = String(window.__scenicErrors.length);
    panel.querySelector('#scenic-error-last').textContent = lastEntry.message || '(empty message)';
    panel.querySelector('#scenic-error-stack').textContent = lastEntry.stack || '(no stack trace)';
  }

  window.onerror = function (message, source, lineno, colno, error) {
    const stack = error && error.stack ? error.stack : `${source || 'unknown'}:${lineno || 0}:${colno || 0}`;
    capture('window.onerror', String(message || 'Unknown error'), stack);
    return false;
  };

  window.onunhandledrejection = function (event) {
    const reason = event && event.reason;
    const message = reason && reason.message ? reason.message : String(reason || 'Unhandled rejection');
    const stack = reason && reason.stack ? reason.stack : '';
    capture('unhandledrejection', message, stack);
  };

  if (typeof window.fetch === 'function' && !window.__scenicFetchWrapped) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = function () {
      return originalFetch.apply(window, arguments)
        .then(function (response) {
          if (!response.ok) {
            capture('fetch', `HTTP ${response.status} ${response.url}`, 'Non-OK response');
          }
          return response;
        })
        .catch(function (err) {
          capture('fetch', err && err.message ? err.message : 'Fetch failed', err && err.stack ? err.stack : '');
          throw err;
        });
    };
    window.__scenicFetchWrapped = true;
  }

  if (!console.__scenicErrorWrapped) {
    const originalConsoleError = console.error.bind(console);
    console.error = function () {
      const message = Array.from(arguments).map(String).join(' ');
      capture('console.error', message, 'console.error called');
      originalConsoleError.apply(console, arguments);
    };
    console.__scenicErrorWrapped = true;
  }

  const existing = readStored();
  existing.forEach((entry) => {
    if (entry && entry.fingerprint) fingerprints.add(entry.fingerprint);
  });
  window.__scenicErrors = existing.slice(-MAX_ERRORS);
  if (isDevMode && window.__scenicErrors.length) {
    renderOverlay(window.__scenicErrors[window.__scenicErrors.length - 1]);
  }
})();
