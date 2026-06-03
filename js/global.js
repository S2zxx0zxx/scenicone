/* ScenicOne — global.js */
(function () {
  'use strict';

  // ── Navbar scroll effect ──
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
        navbar.classList.remove('transparent');
      } else {
        navbar.classList.remove('scrolled');
        navbar.classList.add('transparent');
      }
    }, { passive: true });
  }

  // ── Hamburger menu ──
  var hamburger = document.querySelector('.nav-hamburger');
  var mobileMenu = document.querySelector('.nav-mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });
    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!navbar.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Reveal on scroll ──
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  // ── WhatsApp float link ──
  var waFloat = document.getElementById('wa-float');
  if (waFloat) {
    waFloat.addEventListener('click', function () {
      window.open('https://wa.me/917891030006?text=Hi%20ScenicOne!%20I%27m%20interested%20in%20your%20furniture.%20Please%20share%20details.', '_blank', 'noopener');
    });
    waFloat.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') waFloat.click();
    });
  }

})();
