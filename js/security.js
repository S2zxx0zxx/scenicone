(function () {
  'use strict';

  const LOG_PREFIX = '[ScenicOne Security]';
  const allowedDomains = new Set([
    'wa.me',
    'google.com',
    'instagram.com',
    'facebook.com',
    'fonts.googleapis.com'
  ]);
  const submitTimestamps = new WeakMap();
  const fillSignals = new WeakMap();
  let devtoolsLogged = false;

  function log() {
    console.warn(LOG_PREFIX, ...arguments);
  }

  function domainAllowed(hostname) {
    for (const domain of allowedDomains) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) return true;
    }
    return false;
  }

  function blockScriptNode(node, reason) {
    if (!node || !node.parentNode) return;
    log('Blocked script insertion:', reason);
    node.parentNode.removeChild(node);
  }

  function isSuspiciousScript(node) {
    if (!node || node.nodeType !== 1 || node.tagName !== 'SCRIPT') return false;
    const src = (node.getAttribute('src') || '').trim();
    const type = (node.getAttribute('type') || '').trim().toLowerCase();
    if (!src) return true;
    if (src.startsWith('javascript:') || src.startsWith('data:')) return true;
    if (type && !['text/javascript', 'module', 'application/javascript', ''].includes(type)) return false;
    return false;
  }

  function scanInlineHandlers(node) {
    if (!node || node.nodeType !== 1 || !node.attributes) return;
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || '').toLowerCase();
      if (name.startsWith('on') || value.includes('javascript:')) {
        log('Suspicious inline attribute detected:', name);
      }
    });
  }

  function showFormMessage(form, text) {
    let msg = form.querySelector('.scenic-security-msg');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'scenic-security-msg';
      msg.style.cssText = 'color:#b00020;font-size:0.9rem;margin-top:8px;';
      form.appendChild(msg);
    }
    msg.textContent = text;
  }

  function protectForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach((form) => {
      if (!form.querySelector('input[name="website"]')) {
        const honeypot = document.createElement('input');
        honeypot.type = 'text';
        honeypot.name = 'website';
        honeypot.autocomplete = 'off';
        honeypot.tabIndex = -1;
        honeypot.setAttribute('aria-hidden', 'true');
        honeypot.style.cssText = 'position:absolute;left:-9999px;opacity:0;pointer-events:none;';
        form.appendChild(honeypot);
      }

      fillSignals.set(form, []);
      form.querySelectorAll('input, textarea, select').forEach((field) => {
        field.addEventListener('input', () => {
          const signals = fillSignals.get(form) || [];
          signals.push(Date.now());
          fillSignals.set(form, signals.slice(-20));
        });
      });

      form.addEventListener('submit', (event) => {
        const now = Date.now();
        const hp = form.querySelector('input[name="website"]');
        if (hp && hp.value.trim()) {
          event.preventDefault();
          showFormMessage(form, 'Too many attempts');
          log('Blocked submit via honeypot on form:', form.id || '(no-id)');
          return;
        }

        const history = (submitTimestamps.get(form) || []).filter((ts) => now - ts <= 60000);
        history.push(now);
        submitTimestamps.set(form, history);
        if (history.length >= 3) {
          event.preventDefault();
          showFormMessage(form, 'Too many attempts');
          log('Rate limit triggered on form:', form.id || '(no-id)');
          return;
        }

        const signals = fillSignals.get(form) || [];
        if (signals.length >= 3 && (signals[signals.length - 1] - signals[0]) < 700) {
          event.preventDefault();
          showFormMessage(form, 'Too many attempts');
          log('Rapid programmatic fill detected on form:', form.id || '(no-id)');
        }
      });
    });
  }

  function protectLinks() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (!/^https?:\/\//i.test(href)) return;
      try {
        const url = new URL(href);
        if (!domainAllowed(url.hostname)) {
          log('Unexpected external navigation attempt:', href);
        }
      } catch (_) {
        log('Invalid link URL detected:', href);
      }
    }, true);
  }

  function monitorMutations() {
    try {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (isSuspiciousScript(node)) {
              blockScriptNode(node, 'Suspicious script tag');
            }
            scanInlineHandlers(node);
            if (node.querySelectorAll) {
              node.querySelectorAll('script').forEach((script) => {
                if (isSuspiciousScript(script)) {
                  blockScriptNode(script, 'Nested suspicious script tag');
                }
              });
              node.querySelectorAll('*').forEach(scanInlineHandlers);
            }
          });
        });
      });
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (_) {
      // no-op
    }
  }

  function detectDevtoolsSoftly() {
    setInterval(() => {
      const isOpen = Math.abs(window.outerWidth - window.innerWidth) > 160 || Math.abs(window.outerHeight - window.innerHeight) > 160;
      if (isOpen && localStorage.getItem('devmode') !== 'true' && !devtoolsLogged) {
        console.log("👋 Developer? Enable devmode: localStorage.setItem('devmode','true')");
        devtoolsLogged = true;
      }
      if (!isOpen) devtoolsLogged = false;
    }, 2000);
  }

  function protectAgainstClickjacking() {
    if (window.self === window.top) return;

    const blocker = document.createElement('div');
    blocker.textContent = 'This site cannot be embedded';
    blocker.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:99999',
      'background:#111',
      'color:#fff',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'font:600 20px system-ui'
    ].join(';');
    document.documentElement.appendChild(blocker);

    try {
      window.top.location = window.self.location;
    } catch (_) {
      log('Unable to break out of iframe due to cross-origin restrictions.');
    }
  }

  protectAgainstClickjacking();
  protectLinks();
  detectDevtoolsSoftly();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      protectForms();
      monitorMutations();
    });
  } else {
    protectForms();
    monitorMutations();
  }
})();
