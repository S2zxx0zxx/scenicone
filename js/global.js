/* =========================================================
   ScenicOne — Global JavaScript
   Navbar, WhatsApp, Scroll Reveal, Lazy Load, Mobile Menu
   ========================================================= */

(function () {
  'use strict';

  /* ── Navbar Scroll Effect ── */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const heroEl = document.getElementById('hero');
    function updateNavbar() {
      if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
        navbar.classList.remove('transparent');
      } else {
        if (heroEl) {
          navbar.classList.add('transparent');
          navbar.classList.remove('scrolled');
        } else {
          navbar.classList.add('scrolled');
        }
      }
    }
    updateNavbar();
    window.addEventListener('scroll', updateNavbar, { passive: true });

    // Active link
    const navLinks = navbar.querySelectorAll('.nav-links a');
    const current = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === current || (current === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  /* ── Mobile Menu ── */
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.nav-mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── WhatsApp Float Button ── */
  const waFloat = document.getElementById('wa-float');
  if (waFloat) {
    waFloat.addEventListener('click', () => {
      const phone = '917891030006';
      const msg = encodeURIComponent('Hi ScenicOne! I\'m interested in your furniture collection. Could you please share more details?');
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    });
  }

  /* ── Scroll Reveal ── */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  /* ── Lazy Load Images ── */
  const lazyImgs = document.querySelectorAll('img[data-src]');
  if (lazyImgs.length && 'IntersectionObserver' in window) {
    const imgObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
          img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
          imgObserver.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    lazyImgs.forEach(img => imgObserver.observe(img));
  } else {
    lazyImgs.forEach(img => {
      img.src = img.dataset.src;
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      img.classList.add('loaded');
    });
  }

})();
