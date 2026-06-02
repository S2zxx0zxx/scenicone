/* =========================================================
   ScenicOne — Home Page JavaScript
   Stats counter, hero load effect
   ========================================================= */

(function () {
  'use strict';

  /* ── Hero loaded class ── */
  const hero = document.getElementById('hero');
  if (hero) {
    window.addEventListener('load', () => hero.classList.add('loaded'));
  }

  /* ── Stats Counter Animation ── */
  function animateCounter(el, target, duration, suffix) {
    const startTime = performance.now();
    const startVal = 0;
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(startVal + (target - startVal) * eased);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  if (statNumbers.length && 'IntersectionObserver' in window) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target, 10);
          const suffix = el.dataset.suffix || '';
          animateCounter(el, target, 2000, suffix);
          statsObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    statNumbers.forEach(el => statsObserver.observe(el));
  }

})();
