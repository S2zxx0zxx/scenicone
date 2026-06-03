/* ScenicOne — home.js */
(function () {
  'use strict';

  // ── Stat counter animation ──
  function animateCounter(el) {
    var target = parseInt(el.dataset.target, 10);
    var suffix = el.dataset.suffix || '';
    var duration = 1800;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(ease * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll('.stat-number[data-target]');
  if (counters.length && 'IntersectionObserver' in window) {
    var counterObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { counterObs.observe(el); });
  }

  // ── Lazy load product images ──
  var lazyImgs = document.querySelectorAll('img[data-src]');
  if (lazyImgs.length && 'IntersectionObserver' in window) {
    var imgObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          img.style.opacity = '0';
          img.addEventListener('load', function () {
            img.style.transition = 'opacity 0.4s ease';
            img.style.opacity = '1';
          });
          imgObs.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    lazyImgs.forEach(function (img) { imgObs.observe(img); });
  }

  // ── Product card enquire button ──
  var productCards = document.querySelectorAll('.product-card');
  productCards.forEach(function (card) {
    var enquireBtn = card.querySelector('.btn-enquire');
    if (enquireBtn) {
      enquireBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var name = card.dataset.name || 'this product';
        var msg = 'Hi ScenicOne! I\'m interested in the ' + name + '. Please share pricing and details.';
        window.open('https://wa.me/917891030006?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      });
    }
  });

})();
