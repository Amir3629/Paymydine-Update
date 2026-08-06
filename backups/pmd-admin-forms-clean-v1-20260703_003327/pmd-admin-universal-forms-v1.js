/* PMD Universal Admin Forms v1
 * Additive visual enhancer for PMD admin create/edit forms.
 * No backend/database/business logic changes.
 */
(function () {
  'use strict';

  if (window.PMDUniversalAdminFormsV1Started) return;
  window.PMDUniversalAdminFormsV1Started = true;

  const path = window.location.pathname.replace(/\/+$/, '');

  const pages = [
    {
      key: 'reservation',
      test: /^\/admin\/reservations\/(create|edit\/[^/]+)\/?$/,
      title: 'Reservation Form',
      eyebrow: 'RESERVATIONS',
      subtitle: 'Create and manage guest bookings with a clean PMD form layout.',
      pill: 'Booking details',
      icon: 'calendar'
    },
    {
      key: 'coupon',
      test: /^\/admin\/coupons\/(create|edit\/[^/]+)\/?$/,
      title: 'Coupon Form',
      eyebrow: 'COUPONS',
      subtitle: 'Configure discount rules, code details, limits, dates and status.',
      pill: 'Promo setup',
      icon: 'tag'
    },
    {
      key: 'location',
      test: /^\/admin\/locations\/(create|edit\/[^/]+)\/?$/,
      title: 'Location Form',
      eyebrow: 'LOCATIONS',
      subtitle: 'Set restaurant location information in the same premium PMD style.',
      pill: 'Location details',
      icon: 'pin'
    },
    {
      key: 'category',
      test: /^\/admin\/categories\/(create|edit\/[^/]+)\/?$/,
      title: 'Category Form',
      eyebrow: 'CATEGORIES',
      subtitle: 'Organize menu categories with clean fields and readable controls.',
      pill: 'Menu structure',
      icon: 'layers'
    },
    {
      key: 'mealtime',
      test: /^\/admin\/mealtimes\/(create|edit\/[^/]+)\/?$/,
      title: 'Mealtime Form',
      eyebrow: 'MEALTIMES',
      subtitle: 'Manage serving windows, availability and timing settings.',
      pill: 'Time rules',
      icon: 'clock'
    },
    {
      key: 'table',
      test: /^\/admin\/tables\/(create|edit\/[^/]+)\/?$/,
      title: 'Table Form',
      eyebrow: 'TABLES',
      subtitle: 'Configure restaurant tables, capacity, location and QR-related details.',
      pill: 'Floor setup',
      icon: 'table'
    },
    {
      key: 'theme',
      test: /^\/admin\/themes\/edit\/frontend-theme\/?$/,
      title: 'Frontend Theme Settings',
      eyebrow: 'THEME',
      subtitle: 'Edit visual theme options inside a cleaner PMD admin form frame.',
      pill: 'Design settings',
      icon: 'palette'
    },
    {
      key: 'mail-layout',
      test: /^\/admin\/mail_layouts\/(create|edit\/[^/]+)\/?$/,
      title: 'Mail Layout Form',
      eyebrow: 'MAIL LAYOUTS',
      subtitle: 'Build email layouts with clearer fields, editor frames and action buttons.',
      pill: 'Email design',
      icon: 'mail'
    }
  ];

  const page = pages.find(p => p.test.test(path));
  if (!page) return;

  function iconSvg(name) {
    const common = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    const icons = {
      calendar: `<svg viewBox="0 0 24 24" ${common}><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="M8 14h3M13 14h3M8 18h3"/></svg>`,
      tag: `<svg viewBox="0 0 24 24" ${common}><path d="M20.5 13.5 13.5 20.5a2.1 2.1 0 0 1-3 0L3 13V4h9l8.5 8.5a2.1 2.1 0 0 1 0 3Z"/><path d="M7.5 7.5h.01"/></svg>`,
      pin: `<svg viewBox="0 0 24 24" ${common}><path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
      layers: `<svg viewBox="0 0 24 24" ${common}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>`,
      clock: `<svg viewBox="0 0 24 24" ${common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
      table: `<svg viewBox="0 0 24 24" ${common}><path d="M4 8h16M6 8v12M18 8v12M4 8l2-4h12l2 4"/></svg>`,
      palette: `<svg viewBox="0 0 24 24" ${common}><path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 1.3-3.5 1.8 1.8 0 0 1 1.2-3.2H18a3 3 0 0 0 3-3A8.3 8.3 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r=".7"/><circle cx="10" cy="7.5" r=".7"/><circle cx="14" cy="7.5" r=".7"/><circle cx="16.5" cy="10" r=".7"/></svg>`,
      mail: `<svg viewBox="0 0 24 24" ${common}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>`
    };
    return icons[name] || icons.layers;
  }

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  }

  function scoreForm(form) {
    let score = 0;
    const controls = form.querySelectorAll('input, select, textarea, button').length;
    score += controls;
    if (form.querySelector('button[type="submit"], input[type="submit"], .btn-primary, .btn-success')) score += 20;
    if (form.closest('.navbar, .main-header, .sidebar, .modal')) score -= 80;
    if (form.method && form.method.toLowerCase() === 'post') score += 15;
    if (form.action && form.action.includes('/admin/')) score += 10;
    return score;
  }

  function findMainForm() {
    const forms = [...document.querySelectorAll('form')]
      .filter(form => !form.dataset.pmdSkipFormsV1)
      .filter(form => visible(form))
      .sort((a, b) => scoreForm(b) - scoreForm(a));

    return forms[0] || null;
  }

  function pageMount(form) {
    return (
      form.closest('.page-content') ||
      form.closest('.content') ||
      form.closest('main') ||
      form.parentElement ||
      document.body
    );
  }

  function insertHero(form) {
    if (document.querySelector('.pmd-admin-form-v1-hero')) return;

    const hero = document.createElement('section');
    hero.className = 'pmd-admin-form-v1-hero';
    hero.innerHTML = `
      <div class="pmd-admin-form-v1-hero-main">
        <div class="pmd-admin-form-v1-hero-icon">${iconSvg(page.icon)}</div>
        <div>
          <p class="pmd-admin-form-v1-hero-eyebrow">${page.eyebrow}</p>
          <h2 class="pmd-admin-form-v1-hero-title">${page.title}</h2>
          <p class="pmd-admin-form-v1-hero-subtitle">${page.subtitle}</p>
        </div>
      </div>
      <div class="pmd-admin-form-v1-hero-pill">${page.pill}</div>
    `;

    const shell =
      form.closest('.card, .panel, .form-widget, .box') ||
      form;

    shell.parentElement.insertBefore(hero, shell);
  }

  function fieldContainer(control) {
    if (!control) return null;

    if (control.closest('.CodeMirror, .note-editor, .fr-box, .tox-tinymce')) {
      return control.closest('.form-group, .control-group, .field, .field-row');
    }

    return (
      control.closest('.form-group') ||
      control.closest('.control-group') ||
      control.closest('.field') ||
      control.closest('.field-row') ||
      control.closest('.input-group') ||
      control.parentElement
    );
  }

  function enhanceFields(form) {
    const controls = form.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea, .selectize-control, .select2-container, .chosen-container, .CodeMirror, .note-editor, .fr-box, .tox-tinymce'
    );

    controls.forEach(control => {
      const field = fieldContainer(control);
      if (!field || field === form || field.closest('.pmd-admin-form-v1-hero')) return;
      if (field.closest('.navbar, .main-header, .sidebar, .modal-footer')) return;

      field.classList.add('pmd-form-field-v1');
    });
  }

  function enhanceChoices(form) {
    const choices = [...form.querySelectorAll('input[type="checkbox"], input[type="radio"]')]
      .filter(input => !input.closest('.navbar, .main-header, .sidebar, .modal-footer'));

    choices.forEach(input => {
      let card =
        input.closest('.custom-control') ||
        input.closest('.form-check') ||
        input.closest('.checkbox') ||
        input.closest('.radio') ||
        input.closest('label');

      if (!card && input.id) {
        const label = form.querySelector(`label[for="${input.id.replace(/"/g, '\\"')}"]`);
        card = label || input.parentElement;
      }

      if (!card) card = input.parentElement;
      if (!card || card === form) return;

      card.classList.add('pmd-form-choice-card-v1');

      const parent = card.parentElement;
      if (parent && parent !== form) {
        const count = parent.querySelectorAll('input[type="checkbox"], input[type="radio"]').length;
        if (count >= 2) parent.classList.add('pmd-form-choice-grid-v1');
      }
    });
  }

  function enhancePanels(form) {
    form.classList.add('pmd-admin-form-v1-form');

    const panels = form.querySelectorAll('.card, .panel, .box, .form-widget, .field-section, fieldset');
    panels.forEach(panel => {
      if (panel.closest('.modal, .sidebar, .navbar')) return;
      panel.classList.add('pmd-form-panel-v1');
    });

    const directPanel = form.closest('.card, .panel, .box, .form-widget');
    if (directPanel) directPanel.classList.add('pmd-form-panel-v1');
  }

  function enhanceButtons(form) {
    form.querySelectorAll('.form-buttons, .form-actions, .buttons, .page-actions').forEach(el => {
      el.classList.add('pmd-form-actions-v1');
    });
  }

  function enhance() {
    const form = findMainForm();
    if (!form) return false;

    document.documentElement.classList.add('pmd-admin-form-v1');
    document.body.classList.add('pmd-admin-form-v1');
    document.body.setAttribute('data-pmd-admin-form-page', page.key);

    const mount = pageMount(form);
    if (mount) mount.classList.add('pmd-admin-form-v1-mount');

    enhancePanels(form);
    insertHero(form);
    enhanceFields(form);
    enhanceChoices(form);
    enhanceButtons(form);

    return true;
  }

  function boot() {
    let runs = 0;

    const run = () => {
      runs += 1;
      enhance();
      if (runs < 30) setTimeout(run, 180);
    };

    run();

    const mo = new MutationObserver(() => enhance());
    mo.observe(document.body, { childList: true, subtree: true });
    window.PMDUniversalAdminFormsV1Observer = mo;
  }

  window.PMDUniversalAdminFormsV1 = {
    report() {
      const form = findMainForm();

      return {
        page: path,
        key: page.key,
        active: document.body.classList.contains('pmd-admin-form-v1'),
        hero: !!document.querySelector('.pmd-admin-form-v1-hero'),
        formFound: !!form,
        fields: document.querySelectorAll('.pmd-form-field-v1').length,
        choiceCards: document.querySelectorAll('.pmd-form-choice-card-v1').length,
        panels: document.querySelectorAll('.pmd-form-panel-v1').length,
        controls: form ? form.querySelectorAll('input, select, textarea, button').length : 0
      };
    },

    rerun() {
      enhance();
      return this.report();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* PMD Admin Forms v5 — Safe one-shot repairs
 * No MutationObserver. No permanent loop.
 * Restores missing option text, tags form sections, and improves field detection.
 */
(function () {
  'use strict';

  if (window.PMDAdminFormsV5Started) return;
  window.PMDAdminFormsV5Started = true;

  const path = window.location.pathname.replace(/\/+$/, '');

  const supported = [
    /^\/admin\/reservations\/(create|edit\/[^/]+)\/?$/,
    /^\/admin\/coupons\/(create|edit\/[^/]+)\/?$/,
    /^\/admin\/locations\/(create|edit\/[^/]+)\/?$/,
    /^\/admin\/categories\/(create|edit\/[^/]+)\/?$/,
    /^\/admin\/mealtimes\/(create|edit\/[^/]+)\/?$/,
    /^\/admin\/tables\/(create|edit\/[^/]+)\/?$/,
    /^\/admin\/themes\/edit\/frontend-theme\/?$/,
    /^\/admin\/mail_layouts\/(create|edit\/[^/]+)\/?$/
  ];

  if (!supported.some(rx => rx.test(path))) return;

  const LABELS = {
    coupon: 'Coupon',
    gift_card: 'Gift Card',
    giftcard: 'Gift Card',
    voucher: 'Voucher',
    credit: 'Credit',
    comp: 'Comp',
    fixed: 'Fixed Amount',
    fixed_amount: 'Fixed Amount',
    percentage: 'Percentage',
    percent: 'Percentage'
  };

  const state = {
    runs: 0,
    repairedText: 0,
    taggedFields: 0,
    taggedSegments: 0,
    sectionIcons: 0
  };

  function clean(str) {
    return String(str || '').replace(/\s+/g, ' ').trim();
  }

  function titleize(str) {
    const raw = clean(str).replace(/[_-]+/g, ' ').toLowerCase();
    if (!raw) return '';
    return LABELS[raw] || raw.replace(/\b\w/g, c => c.toUpperCase());
  }

  function mainForm() {
    const forms = [...document.querySelectorAll('form')];

    return forms
      .map(form => {
        let score = form.querySelectorAll('input, select, textarea, button').length;
        if (form.method && form.method.toLowerCase() === 'post') score += 20;
        if (form.querySelector('button[type="submit"], input[type="submit"], .btn-success, .btn-primary')) score += 15;
        if (form.closest('.navbar, .sidebar, .main-header, .modal')) score -= 100;
        return { form, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.form || null;
  }

  function labelFromOption(el) {
    const ownText = clean(el.textContent);
    if (ownText) return ownText;

    const input =
      el.querySelector('input[type="radio"], input[type="checkbox"]') ||
      (el.previousElementSibling && el.previousElementSibling.matches('input[type="radio"], input[type="checkbox"], .btn-check') ? el.previousElementSibling : null);

    if (input) {
      return titleize(
        input.getAttribute('data-label') ||
        input.getAttribute('aria-label') ||
        input.getAttribute('title') ||
        input.value ||
        input.name
      );
    }

    return titleize(el.getAttribute('data-value') || el.getAttribute('value') || el.getAttribute('title'));
  }

  function repairOptionText(form) {
    const options = [
      ...form.querySelectorAll('label.btn, .btn-group .btn, .btn-group-toggle .btn, [data-toggle="buttons"] .btn, .pmd-form-choice-card-v1')
    ];

    options.forEach(el => {
      if (el.closest('.page-actions, .form-actions, .buttons')) return;

      const existing = clean(el.textContent);
      const label = labelFromOption(el);

      el.classList.add('pmd-v5-option-button');

      if (label) {
        el.setAttribute('data-pmd-v5-label', label);
      }

      if (!existing && label && !el.querySelector('.pmd-v5-option-text')) {
        const span = document.createElement('span');
        span.className = 'pmd-v5-option-text';
        span.textContent = label;
        el.appendChild(span);
        state.repairedText += 1;
      }
    });
  }

  function tagFieldContainers(form) {
    const controls = [
      ...form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea, .form-control, .selectize-control, .select2-container, .chosen-container')
    ];

    controls.forEach(control => {
      if (control.closest('.page-actions, .form-actions, .buttons, .navbar, .sidebar, .main-header')) return;

      const field =
        control.closest('.pmd-form-field-v1') ||
        control.closest('.form-group') ||
        control.closest('.control-group') ||
        control.closest('.field') ||
        control.closest('.field-row') ||
        control.closest('.input-group') ||
        control.parentElement;

      if (!field || field === form || field.closest('.page-actions, .form-actions, .buttons')) return;

      if (!field.classList.contains('pmd-form-field-v1')) {
        field.classList.add('pmd-form-field-v1', 'pmd-v5-field-repaired');
        state.taggedFields += 1;
      }
    });
  }

  function tagSegments(form) {
    const groups = [
      ...form.querySelectorAll('.btn-group, .btn-group-toggle, [data-toggle="buttons"]')
    ];

    groups.forEach(group => {
      if (group.closest('.page-actions, .form-actions, .buttons')) return;
      const btns = group.querySelectorAll('.btn, label');
      if (btns.length < 2) return;

      group.classList.add('pmd-v5-segment-grid');
      state.taggedSegments += 1;
    });
  }

  function tagSections(form) {
    const panels = [
      ...form.querySelectorAll('.pmd-form-panel-v1, .card, .panel, .box, fieldset, .form-widget')
    ];

    panels.forEach(panel => {
      if (panel.closest('.modal, .sidebar, .navbar')) return;

      const heading = panel.querySelector('h1,h2,h3,h4,legend,.card-title,.panel-title');
      if (!heading) return;

      panel.classList.add('pmd-v5-section-card');

      if (!heading.querySelector('.pmd-v5-section-icon')) {
        const icon = document.createElement('span');
        icon.className = 'pmd-v5-section-icon';
        icon.textContent = sectionEmoji(heading.textContent);
        heading.prepend(icon);
        state.sectionIcons += 1;
      }
    });
  }

  function sectionEmoji(t) {
    const s = clean(t).toLowerCase();
    if (s.includes('basic')) return '🖥️';
    if (s.includes('routing') || s.includes('categor')) return '🧭';
    if (s.includes('coupon') || s.includes('discount') || s.includes('gift')) return '🏷️';
    if (s.includes('reservation')) return '📅';
    if (s.includes('location')) return '📍';
    if (s.includes('table')) return '🪑';
    if (s.includes('theme') || s.includes('design')) return '🎨';
    if (s.includes('mail') || s.includes('email')) return '✉️';
    return '✨';
  }

  function run() {
    state.runs += 1;

    document.body.classList.add('pmd-admin-forms-v5');
    document.documentElement.classList.add('pmd-admin-forms-v5');

    const form = mainForm();
    if (!form) return;

    form.classList.add('pmd-admin-forms-v5-form');

    tagFieldContainers(form);
    repairOptionText(form);
    tagSegments(form);
    tagSections(form);
  }

  function boot() {
    run();
    setTimeout(run, 180);
    setTimeout(run, 600);
    setTimeout(run, 1200);
    setTimeout(run, 2200);
  }

  window.PMDAdminFormsV5 = {
    report() {
      const form = mainForm();
      return {
        path,
        ready: document.body.classList.contains('pmd-admin-forms-v5'),
        runs: state.runs,
        repairedText: state.repairedText,
        taggedFields: state.taggedFields,
        taggedSegments: state.taggedSegments,
        sectionIcons: state.sectionIcons,
        formFound: !!form,
        fields: document.querySelectorAll('.pmd-form-field-v1').length,
        optionButtons: document.querySelectorAll('.pmd-v5-option-button').length,
        blankOptionButtons: [...document.querySelectorAll('.pmd-v5-option-button')].filter(el => !clean(el.textContent) && !el.getAttribute('data-pmd-v5-label')).length,
        segments: document.querySelectorAll('.pmd-v5-segment-grid').length,
        badV2Gone: typeof window.PMDUniversalAdminFormsV2 === 'undefined'
      };
    },
    rerun() {
      run();
      return this.report();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

/* PMD Admin Forms v6 — Coupon option text repair
 * One-shot only. No MutationObserver. No loop.
 */
(function () {
  'use strict';

  if (window.PMDAdminFormsV6Started) return;
  window.PMDAdminFormsV6Started = true;

  const path = window.location.pathname.replace(/\/+$/, '');
  if (!/^\/admin\/coupons\/(create|edit\/[^/]+)\/?$/.test(path)) return;

  const state = {
    runs: 0,
    repaired: 0
  };

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function mainForm() {
    return [...document.querySelectorAll('form')]
      .map(form => {
        let score = form.querySelectorAll('input, select, textarea, button, label.btn, .btn').length;
        if (form.method && form.method.toLowerCase() === 'post') score += 20;
        if (form.closest('.navbar, .sidebar, .main-header, .modal')) score -= 100;
        return { form, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.form || null;
  }

  function nearestLabelText(group) {
    let node = group;
    for (let i = 0; i < 4 && node; i += 1) {
      const label = node.querySelector?.('.control-label, label, h3, h4, legend');
      const t = clean(label && label.textContent);
      if (t) return t.toLowerCase();
      node = node.parentElement;
    }
    return '';
  }

  function setButtonText(btn, label) {
    if (!btn || !label) return;

    btn.classList.add('pmd-v6-coupon-option');
    btn.setAttribute('data-pmd-v6-label', label);

    const visible = clean(btn.textContent);

    if (!visible || visible.length < 2) {
      btn.textContent = '';
      const span = document.createElement('span');
      span.className = 'pmd-v6-coupon-option-text';
      span.textContent = label;
      btn.appendChild(span);
      state.repaired += 1;
    }
  }

  function repair() {
    state.runs += 1;

    document.body.classList.add('pmd-admin-forms-v6');

    const form = mainForm();
    if (!form) return;

    const groups = [...form.querySelectorAll('.btn-group, .btn-group-toggle, [data-toggle="buttons"]')]
      .filter(group => !group.closest('.page-actions, .form-actions, .buttons'));

    groups.forEach(group => {
      const buttons = [...group.querySelectorAll('label.btn, .btn')]
        .filter(btn => !btn.closest('.page-actions, .form-actions, .buttons'));

      if (buttons.length < 2) return;

      const label = nearestLabelText(group);
      const isDiscount = label.includes('discount type');
      const isCard = label.includes('card type') || buttons.length >= 5;

      if (isCard) {
        ['Coupon', 'Gift Card', 'Voucher', 'Credit', 'Comp'].forEach((txt, i) => {
          if (buttons[i]) setButtonText(buttons[i], txt);
        });
        group.classList.add('pmd-v6-coupon-card-type');
      }

      if (isDiscount) {
        ['Fixed Amount', 'Percentage'].forEach((txt, i) => {
          if (buttons[i]) setButtonText(buttons[i], txt);
        });
        group.classList.add('pmd-v6-coupon-discount-type');
      }
    });
  }

  function boot() {
    repair();
    setTimeout(repair, 150);
    setTimeout(repair, 500);
    setTimeout(repair, 1100);
  }

  window.PMDAdminFormsV6 = {
    report() {
      return {
        path,
        ready: document.body.classList.contains('pmd-admin-forms-v6'),
        runs: state.runs,
        repaired: state.repaired,
        couponOptionButtons: document.querySelectorAll('.pmd-v6-coupon-option').length,
        blankCouponOptions: [...document.querySelectorAll('.pmd-v6-coupon-option')].filter(el => !clean(el.textContent)).length,
        labels: [...document.querySelectorAll('.pmd-v6-coupon-option')].map(el => clean(el.textContent)),
        badV2Gone: typeof window.PMDUniversalAdminFormsV2 === 'undefined'
      };
    },
    rerun() {
      repair();
      return this.report();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

/* PMD Admin Forms v7 — Coupon discount button repair
 * One-shot only. No MutationObserver. No loop.
 */
(function () {
  'use strict';

  if (window.PMDAdminFormsV7Started) return;
  window.PMDAdminFormsV7Started = true;

  const path = window.location.pathname.replace(/\/+$/, '');
  if (!/^\/admin\/coupons\/(create|edit\/[^/]+)\/?$/.test(path)) return;

  const state = {
    runs: 0,
    repaired: 0,
    cardButtons: 0,
    discountButtons: 0
  };

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function mainForm() {
    return [...document.querySelectorAll('form')]
      .map(form => {
        let score = form.querySelectorAll('input, select, textarea, button, label.btn, .btn').length;
        if (form.method && form.method.toLowerCase() === 'post') score += 20;
        if (form.closest('.navbar, .sidebar, .main-header, .modal')) score -= 100;
        return { form, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.form || null;
  }

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 5 && r.height > 5;
  }

  function buttonsIn(group) {
    return [...group.querySelectorAll('label.btn, .btn')]
      .filter(btn => visible(btn))
      .filter(btn => !btn.closest('.page-actions, .form-actions, .buttons, .navbar, .sidebar, .main-header'));
  }

  function setText(btn, label, type) {
    if (!btn || !label) return;

    btn.classList.add('pmd-v7-coupon-option', `pmd-v7-${type}-option`);
    btn.setAttribute('data-pmd-v7-label', label);

    if (!clean(btn.textContent) || clean(btn.textContent).length < 2) {
      btn.textContent = '';
      const span = document.createElement('span');
      span.className = 'pmd-v7-option-text';
      span.textContent = label;
      btn.appendChild(span);
      state.repaired += 1;
    }
  }

  function repair() {
    state.runs += 1;
    document.body.classList.add('pmd-admin-forms-v7');

    const form = mainForm();
    if (!form) return;

    const groups = [...form.querySelectorAll('.btn-group, .btn-group-toggle, [data-toggle="buttons"]')]
      .filter(group => visible(group))
      .filter(group => !group.closest('.page-actions, .form-actions, .buttons, .navbar, .sidebar, .main-header'))
      .map(group => ({
        group,
        buttons: buttonsIn(group),
        top: group.getBoundingClientRect().top,
        text: clean(group.closest('.pmd-form-field-v1, .form-group, .field, .control-group')?.textContent || '')
      }))
      .filter(x => x.buttons.length >= 2)
      .sort((a, b) => a.top - b.top);

    const cardGroup =
      groups.find(x => x.buttons.length >= 5) ||
      groups[0];

    const discountGroup =
      groups.find(x => x !== cardGroup && x.buttons.length === 2 && /discount/i.test(x.text)) ||
      groups.find(x => x !== cardGroup && x.buttons.length === 2) ||
      groups[1];

    if (cardGroup) {
      cardGroup.group.classList.add('pmd-v7-card-type-grid');
      ['Coupon', 'Gift Card', 'Voucher', 'Credit', 'Comp'].forEach((label, i) => {
        if (cardGroup.buttons[i]) setText(cardGroup.buttons[i], label, 'card');
      });
      state.cardButtons = cardGroup.buttons.length;
    }

    if (discountGroup) {
      discountGroup.group.classList.add('pmd-v7-discount-type-grid');
      ['Fixed Amount', 'Percentage'].forEach((label, i) => {
        if (discountGroup.buttons[i]) setText(discountGroup.buttons[i], label, 'discount');
      });
      state.discountButtons = discountGroup.buttons.length;
    }
  }

  function boot() {
    repair();
    setTimeout(repair, 180);
    setTimeout(repair, 600);
    setTimeout(repair, 1200);
  }

  window.PMDAdminFormsV7 = {
    report() {
      return {
        path,
        ready: document.body.classList.contains('pmd-admin-forms-v7'),
        runs: state.runs,
        repaired: state.repaired,
        cardButtons: state.cardButtons,
        discountButtons: state.discountButtons,
        totalOptions: document.querySelectorAll('.pmd-v7-coupon-option').length,
        blankOptions: [...document.querySelectorAll('.pmd-v7-coupon-option')].filter(el => !clean(el.textContent)).length,
        labels: [...document.querySelectorAll('.pmd-v7-coupon-option')].map(el => clean(el.textContent)),
        badV2Gone: typeof window.PMDUniversalAdminFormsV2 === 'undefined'
      };
    },
    rerun() {
      repair();
      return this.report();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

/* PMD Admin Forms v8 — Coupon force option labels
 * One-shot. No MutationObserver. No loop.
 */
(function () {
  'use strict';

  if (window.PMDAdminFormsV8Started) return;
  window.PMDAdminFormsV8Started = true;

  const path = window.location.pathname.replace(/\/+$/, '');
  if (!/^\/admin\/coupons\/(create|edit\/[^/]+)\/?$/.test(path)) return;

  const state = { runs: 0, labeled: 0 };

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 60 && r.height > 25;
  }

  function mainForm() {
    return [...document.querySelectorAll('form')]
      .map(form => {
        let score = form.querySelectorAll('input, select, textarea, button, label.btn, .btn').length;
        if (form.method && form.method.toLowerCase() === 'post') score += 20;
        if (form.closest('.navbar, .sidebar, .main-header, .modal')) score -= 100;
        return { form, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.form || null;
  }

  function setLabel(el, label, type) {
    if (!el || !label) return;

    el.classList.add('pmd-v8-coupon-option', `pmd-v8-${type}-option`);
    el.setAttribute('data-pmd-v8-label', label);

    const current = clean(el.textContent);
    if (!current || current.length < 2 || current !== label) {
      el.textContent = '';
      const span = document.createElement('span');
      span.className = 'pmd-v8-option-text';
      span.textContent = label;
      el.appendChild(span);
      state.labeled += 1;
    }
  }

  function candidateButtons(form) {
    return [...form.querySelectorAll('label.btn, .btn-group .btn, .btn-group-toggle .btn, [data-toggle="buttons"] .btn, .pmd-v5-option-button, .pmd-v6-coupon-option, .pmd-v7-coupon-option')]
      .filter(visible)
      .filter(el => !el.closest('.page-actions, .form-actions, .buttons, .navbar, .sidebar, .main-header'))
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        if (Math.abs(ar.top - br.top) > 12) return ar.top - br.top;
        return ar.left - br.left;
      });
  }

  function repair() {
    state.runs += 1;
    document.body.classList.add('pmd-admin-forms-v8');

    const form = mainForm();
    if (!form) return;

    const buttons = candidateButtons(form);

    const cardLabels = ['Coupon', 'Gift Card', 'Voucher', 'Credit', 'Comp'];
    const discountLabels = ['Fixed Amount', 'Percentage'];

    cardLabels.forEach((label, i) => setLabel(buttons[i], label, 'card'));
    discountLabels.forEach((label, i) => setLabel(buttons[i + 5], label, 'discount'));

    const cardGroup = buttons[0]?.closest('.btn-group, .btn-group-toggle, [data-toggle="buttons"], .pmd-v5-segment-grid, .pmd-v6-coupon-card-type, .pmd-v7-card-type-grid');
    const discountGroup = buttons[5]?.closest('.btn-group, .btn-group-toggle, [data-toggle="buttons"], .pmd-v5-segment-grid, .pmd-v6-coupon-discount-type, .pmd-v7-discount-type-grid');

    if (cardGroup) cardGroup.classList.add('pmd-v8-card-type-grid');
    if (discountGroup) discountGroup.classList.add('pmd-v8-discount-type-grid');
  }

  function boot() {
    repair();
    setTimeout(repair, 180);
    setTimeout(repair, 700);
    setTimeout(repair, 1400);
  }

  window.PMDAdminFormsV8 = {
    report() {
      return {
        path,
        ready: document.body.classList.contains('pmd-admin-forms-v8'),
        runs: state.runs,
        labeled: state.labeled,
        totalOptions: document.querySelectorAll('.pmd-v8-coupon-option').length,
        blankOptions: [...document.querySelectorAll('.pmd-v8-coupon-option')].filter(el => !clean(el.textContent)).length,
        labels: [...document.querySelectorAll('.pmd-v8-coupon-option')].map(el => clean(el.textContent)),
        badV2Gone: typeof window.PMDUniversalAdminFormsV2 === 'undefined'
      };
    },
    rerun() {
      repair();
      return this.report();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
