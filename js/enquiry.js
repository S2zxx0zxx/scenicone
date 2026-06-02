/* =========================================================
   ScenicOne — Enquiry Page JavaScript
   Form validation, success state, WhatsApp prefill, URL param
   ========================================================= */

(function () {
  'use strict';

  const form = document.getElementById('enquiry-form');
  const formBox = document.querySelector('.enquiry-form-fields');
  const successBox = document.querySelector('.form-success');
  const productSelect = document.getElementById('product-interest');

  /* ── Pre-fill from URL params ── */
  const params = new URLSearchParams(window.location.search);
  const productParam = params.get('product');
  const categoryParam = params.get('category');
  if (productParam && productSelect) {
    // Try to find matching option
    const options = productSelect.querySelectorAll('option');
    options.forEach(opt => {
      if (opt.value.toLowerCase() === categoryParam) opt.selected = true;
    });
    const customMsg = document.getElementById('custom-message');
    if (customMsg) {
      customMsg.value = `I'm interested in: ${decodeURIComponent(productParam)}\n\nPlease share pricing and availability.`;
    }
  }

  /* ── Form Validation ── */
  function validateForm(formEl) {
    let valid = true;
    const required = formEl.querySelectorAll('[required]');
    required.forEach(field => {
      field.style.borderColor = '';
      if (!field.value.trim()) {
        field.style.borderColor = '#E24B4A';
        valid = false;
      }
    });
    // Phone validation (Indian 10 digit)
    const phone = formEl.querySelector('#phone');
    if (phone && phone.value) {
      const cleaned = phone.value.replace(/\D/g, '');
      if (cleaned.length < 10) {
        phone.style.borderColor = '#E24B4A';
        valid = false;
      }
    }
    return valid;
  }

  /* ── Submit Handler ── */
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm(form)) return;

      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      // Simulate submission (replace with Formspree or EmailJS in production)
      setTimeout(() => {
        if (formBox) formBox.style.display = 'none';
        if (successBox) {
          successBox.classList.add('show');
          successBox.style.display = 'block';
        }

        // Also prepare WhatsApp follow-up
        const name = form.querySelector('#full-name')?.value || '';
        const phone = form.querySelector('#phone')?.value || '';
        const product = form.querySelector('#product-interest')?.value || 'General Enquiry';
        const msg = encodeURIComponent(
          `Hi ScenicOne! My name is ${name}. I've submitted an enquiry for *${product}*. My contact number is ${phone}. Please get in touch at your earliest.`
        );
        const waFollowUp = document.getElementById('wa-followup');
        if (waFollowUp) {
          waFollowUp.href = `https://wa.me/917891030006?text=${msg}`;
        }
      }, 1200);
    });
  }

  /* ── Real-time border reset on input ── */
  document.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => { field.style.borderColor = ''; });
  });

})();
