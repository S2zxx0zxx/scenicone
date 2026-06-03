/* =========================================================
   ScenicOne — Products Page JavaScript
   Filter, Modal, WhatsApp enquiry
   ========================================================= */

(function () {
  'use strict';

  /* ── Filter Logic ── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card[data-category]');
  const countEl = document.getElementById('products-count-num');

  function filterProducts(category) {
    let visible = 0;
    productCards.forEach(card => {
      const match = category === 'all' || card.dataset.category === category;
      card.classList.toggle('hidden', !match);
      if (match) visible++;
    });
    if (countEl) countEl.textContent = visible;
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterProducts(btn.dataset.filter);
    });
  });

  // Check URL param on load
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  if (catParam) {
    const matchBtn = document.querySelector(`.filter-btn[data-filter="${catParam}"]`);
    if (matchBtn) {
      filterBtns.forEach(b => b.classList.remove('active'));
      matchBtn.classList.add('active');
      filterProducts(catParam);
    }
  }

  /* ── Product Modal ── */
  const modal = document.getElementById('product-modal');
  const modalOverlay = modal ? modal.querySelector('.modal-overlay') : null;
  const modalClose = modal ? modal.querySelector('.modal-close') : null;
  const modalImage = modal ? modal.querySelector('.modal-image img') : null;
  const modalCategory = modal ? modal.querySelector('.modal-category') : null;
  const modalTitle = modal ? modal.querySelector('.modal-title') : null;
  const modalDesc = modal ? modal.querySelector('.modal-desc') : null;
  const modalWaBtn = modal ? modal.querySelector('.modal-wa-btn') : null;
  const modalEnquiryBtn = modal ? modal.querySelector('.modal-enquiry-btn') : null;

  function openModal(data) {
    if (!modal) return;
    if (modalImage) { modalImage.src = data.image; modalImage.alt = data.name; }
    if (modalCategory) modalCategory.textContent = data.category;
    if (modalTitle) modalTitle.textContent = data.name;
    if (modalDesc) modalDesc.textContent = data.description;

    // Specs
    const specsEl = modal.querySelector('.modal-specs');
    if (specsEl && data.specs) {
      specsEl.innerHTML = data.specs.map(s =>
        `<div class="modal-spec-row">
          <span class="spec-label">${s.label}</span>
          <span class="spec-val">${s.value}</span>
        </div>`
      ).join('');
    }

    // WhatsApp link
    if (modalWaBtn) {
      const msg = encodeURIComponent(`Hi ScenicOne! I'm interested in the *${data.name}*. Could you please share pricing and availability?`);
      modalWaBtn.href = `https://wa.me/917891030006?text=${msg}`;
    }
    if (modalEnquiryBtn) {
      const cat = data.category.toLowerCase().replace(/\s+/g, '-');
      modalEnquiryBtn.href = `enquiry.html?product=${encodeURIComponent(data.name)}&category=${cat}`;
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Attach click handlers to product cards
  productCards.forEach(card => {
    card.addEventListener('click', () => {
      const data = {
        name: card.dataset.name || card.querySelector('.product-card-name')?.textContent || '',
        category: card.dataset.category || '',
        description: card.dataset.description || 'Handcrafted with premium materials and traditional Jodhpur craftsmanship. Available in custom sizes and finishes. Contact us for detailed specifications.',
        image: card.querySelector('img')?.src || '',
        specs: [
          { label: 'Material', value: card.dataset.material || 'Solid Wood / Premium Hardwood' },
          { label: 'Finish', value: card.dataset.finish || 'Natural Polish / Custom Available' },
          { label: 'Origin', value: 'Jodhpur, Rajasthan, India' },
          { label: 'Lead Time', value: '3–6 Weeks' },
          { label: 'Export Ready', value: 'Yes' },
        ]
      };
      openModal(data);
    });
  });

})();
