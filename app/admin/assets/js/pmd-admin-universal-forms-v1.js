/* PMD Admin Forms Clean v1
 * One-shot frontend-only enhancer for selected PMD admin forms.
 * Does not change form actions, names, values, tokens, validation, or submit behavior.
 */
(function () {
  'use strict';
  if (window.PMDAdminFormsCleanV1) return;

  var path = window.location.pathname.replace(/\/+$/, '');
  var pages = [
    ['reservations', /^\/admin\/reservations\/(create|edit\/[^/]+)$/, 'Reservations', 'Reservation Form', 'Guest booking details', 'calendar'],
    ['coupons', /^\/admin\/coupons\/(create|edit\/[^/]+)$/, 'Coupons', 'Coupon Form', 'Promo setup', 'tag'],
    ['locations', /^\/admin\/locations\/(create|edit\/[^/]+)$/, 'Locations', 'Location Form', 'Location details', 'pin'],
    ['categories', /^\/admin\/categories\/(create|edit\/[^/]+)$/, 'Categories', 'Category Form', 'Menu structure', 'layers'],
    ['mealtimes', /^\/admin\/mealtimes\/(create|edit\/[^/]+)$/, 'Mealtimes', 'Mealtime Form', 'Serving windows', 'clock'],
    ['tables', /^\/admin\/tables\/(create|edit\/[^/]+)$/, 'Tables', 'Table Form', 'Floor setup', 'table'],
    ['theme', /^\/admin\/themes\/edit\/frontend-theme$/, 'Theme', 'Frontend Theme Settings', 'Design settings', 'palette'],
    ['mail_layouts', /^\/admin\/mail_layouts\/(create|edit\/[^/]+)$/, 'Mail Layouts', 'Mail Layout Form', 'Email design', 'mail']
  ];
  var page = pages.filter(function (p) { return p[1].test(path); })[0];
  if (!page) return;

  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function icon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="3"></rect><path d="M8 9h8M8 13h6"></path></svg>'; }
  function visible(el) { var s = window.getComputedStyle(el); var r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; }
  function score(form) {
    var n = form.querySelectorAll('input,select,textarea,button').length;
    if (form.method && form.method.toLowerCase() === 'post') n += 20;
    if (form.closest('.navbar,.sidebar,.modal,.dropdown-menu')) n -= 100;
    return n;
  }
  function mainForm() { return qsa('form').filter(visible).sort(function (a, b) { return score(b) - score(a); })[0]; }
  function fieldFor(control) {
    return control.closest('[data-field-name],.form-group,.control-group,.field,.field-row') || control.parentElement;
  }
  function enhance(form) {
    document.documentElement.classList.add('pmd-admin-form-clean-v1-html');
    document.body.classList.add('pmd-admin-form-clean-v1', 'pmd-admin-form-clean-v1-' + page[0]);
    form.classList.add('pmd-admin-form-clean-v1-form');
    if (!document.querySelector('.pmd-admin-form-clean-v1-hero')) {
      var hero = document.createElement('section');
      hero.className = 'pmd-admin-form-clean-v1-hero';
      hero.innerHTML = '<div class="pmd-admin-form-clean-v1-hero-main"><div class="pmd-admin-form-clean-v1-icon">' + icon() + '</div><div><p class="pmd-admin-form-clean-v1-eyebrow">' + page[2] + '</p><h2 class="pmd-admin-form-clean-v1-title">' + page[3] + '</h2><p class="pmd-admin-form-clean-v1-subtitle">Clean PMD admin form styling matched to KDS and menu forms.</p></div></div><div class="pmd-admin-form-clean-v1-pill">' + page[4] + '</div>';
      form.parentElement.insertBefore(hero, form);
    }
    qsa('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]),select,textarea,.select2-container,.selectize-control,.CodeMirror,.note-editor,.tox-tinymce,[data-control="mediafinder"]', form).forEach(function (control) {
      var field = fieldFor(control);
      if (!field || field === form || field.closest('.modal-footer,.navbar,.sidebar')) return;
      field.classList.add('pmd-admin-form-clean-v1-field');
    });
    qsa('input[type="radio"],input[type="checkbox"]', form).forEach(function (input) {
      var card = input.closest('label,.radio,.checkbox,.custom-control,.form-check') || input.parentElement;
      if (!card || card === form) return;
      card.classList.add('pmd-admin-form-clean-v1-choice');
      if (card.parentElement) card.parentElement.classList.add('pmd-admin-form-clean-v1-choice-group');
    });
    if (page[0] === 'coupons') fixCouponLabels(form);
  }
  function fixCouponLabels(form) {
    var labels = { type: ['Coupon', 'Gift Card', 'Voucher', 'Credit', 'Comp'], discount_type: ['Fixed Amount', 'Percentage'] };
    Object.keys(labels).forEach(function (name) {
      var field = form.querySelector('[data-field-name="' + name + '"]');
      if (!field) return;
      qsa('.btn,label,button', field).forEach(function (el, i) {
        var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt && labels[name][i]) el.appendChild(document.createTextNode(labels[name][i]));
        el.setAttribute('title', txt || labels[name][i] || name);
      });
    });
  }
  function boot() { var form = mainForm(); if (form) enhance(form); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
  window.PMDAdminFormsCleanV1 = { boot: boot, page: page[0] };
}());
