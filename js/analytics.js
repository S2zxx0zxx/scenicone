(function () {
  'use strict';

  const STORAGE_KEY = 'scenicone_analytics';
  const MAX_ENTRIES = 200;
  const SESSION_KEY = 'scenicone_session';
  const isDevMode = localStorage.getItem('devmode') === 'true';

  const analytics = {
    pageViews: [],
    engagement: {
      scrollMilestones: [],
      timeOnPageSeconds: 0,
      clicks: []
    },
    funnel: [],
    dropOffs: []
  };

  window.__scenicAnalytics = analytics;

  function uuidv4() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function readStored() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeStored(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    } catch (_) {
      // no-op
    }
  }

  function addEntry(type, data) {
    const entry = {
      type,
      ...data,
      timestamp: new Date().toISOString()
    };

    const stored = readStored();
    stored.push(entry);
    writeStored(stored);

    if (type === 'page_view') analytics.pageViews.push(entry);
    if (type === 'click' || type === 'scroll' || type === 'time') {
      if (type === 'click') analytics.engagement.clicks.push(entry);
      if (type === 'scroll') analytics.engagement.scrollMilestones.push(entry.depth);
      if (type === 'time') analytics.engagement.timeOnPageSeconds = entry.seconds;
    }
    if (type.startsWith('funnel_')) analytics.funnel.push(entry);

    renderPanel();
  }

  function getSession() {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    } catch (_) {
      session = null;
    }

    if (!session || !session.sessionId) {
      session = {
        sessionId: uuidv4(),
        start: Date.now(),
        pagesVisited: [],
        totalTimeSeconds: 0
      };
    }

    if (!session.pagesVisited.includes(location.pathname)) {
      session.pagesVisited.push(location.pathname);
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  const session = getSession();

  addEntry('page_view', {
    page: location.pathname,
    referrer: document.referrer || '(direct)',
    screenWidth: window.screen.width,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sessionId: session.sessionId
  });

  const trackedMilestones = new Set();
  const milestoneSteps = [25, 50, 75, 100];
  function onScroll() {
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    const depth = maxScroll <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / maxScroll) * 100));

    milestoneSteps.forEach((step) => {
      if (depth >= step && !trackedMilestones.has(step)) {
        trackedMilestones.add(step);
        addEntry('scroll', { depth: step, sessionId: session.sessionId });
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  let elapsedSeconds = 0;
  const timer = setInterval(() => {
    elapsedSeconds += 5;
    addEntry('time', { seconds: elapsedSeconds, sessionId: session.sessionId });

    const currentSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    currentSession.totalTimeSeconds = elapsedSeconds;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
  }, 5000);

  function classifyClick(el) {
    if (!el) return null;
    if (el.closest('.product-card')) return 'product_card';
    if (el.matches('a[href*="enquiry"], .btn[href*="enquiry"], button[data-enquiry], #wa-followup')) return 'enquiry_button';
    if (el.matches('a[href*="wa.me"], #wa-float, .wa-big-btn')) return 'whatsapp_button';
    if (el.closest('nav a')) return 'nav_link';
    return null;
  }

  document.addEventListener('click', function (event) {
    const target = event.target.closest('a,button,.product-card,#wa-float');
    const kind = classifyClick(target);
    if (!kind) return;

    addEntry('click', {
      kind,
      text: (target.textContent || '').trim().slice(0, 80),
      sessionId: session.sessionId
    });

    if (kind === 'product_card') trackFunnel('product_viewed');
    if (kind === 'enquiry_button') trackFunnel('enquiry_clicked');
  }, true);

  const funnelOrder = ['product_viewed', 'enquiry_clicked', 'form_started', 'form_submitted'];
  let reached = new Set();

  function trackFunnel(stage) {
    reached.add(stage);
    addEntry(`funnel_${stage}`, { stage, sessionId: session.sessionId });
  }

  const form = document.querySelector('form');
  if (form) {
    let started = false;
    form.addEventListener('input', function () {
      if (!started) {
        started = true;
        trackFunnel('form_started');
      }
    });
    form.addEventListener('submit', function () {
      trackFunnel('form_submitted');
    });
  }

  function computeDropOffs() {
    const firstMissingIndex = funnelOrder.findIndex((stage) => !reached.has(stage));
    analytics.dropOffs = firstMissingIndex === -1 ? [] : funnelOrder.slice(firstMissingIndex);
  }

  window.addEventListener('beforeunload', function () {
    clearInterval(timer);
    computeDropOffs();
    const summary = {
      sessionId: session.sessionId,
      dropOffs: analytics.dropOffs,
      pagesVisited: JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}').pagesVisited || []
    };
    addEntry('funnel_summary', summary);
  });

  window.scenicReport = function () {
    const stored = readStored();
    const sessionData = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    console.group('[ScenicOne Analytics Report]');
    console.log('Session:', sessionData);
    console.log('Total entries:', stored.length);
    console.table(stored.slice(-20));
    console.log('Funnel drop-offs:', analytics.dropOffs);
    console.groupEnd();
    return { session: sessionData, totalEntries: stored.length, dropOffs: analytics.dropOffs };
  };

  function renderPanel() {
    if (!isDevMode) return;
    let panel = document.getElementById('scenic-analytics-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'scenic-analytics-panel';
      panel.style.cssText = [
        'position:fixed',
        'right:12px',
        'bottom:12px',
        'z-index:99999',
        'background:#0e1a22',
        'color:#d8f5ff',
        'border:1px solid #1c89b8',
        'border-radius:8px',
        'padding:10px',
        'font:12px/1.4 monospace',
        'min-width:220px'
      ].join(';');
      document.body.appendChild(panel);
    }

    computeDropOffs();
    panel.innerHTML = [
      `<strong>Analytics</strong>`,
      `Session: ${session.sessionId.slice(0, 8)}…`,
      `Views: ${analytics.pageViews.length}`,
      `Time: ${analytics.engagement.timeOnPageSeconds}s`,
      `Scroll: ${[...trackedMilestones].join(', ') || 'none'}`,
      `Drop-off: ${analytics.dropOffs[0] || 'none'}`
    ].join('<br/>');
  }

  renderPanel();
})();
