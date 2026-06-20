(function () {
  'use strict';

  var LOGO_KEY = 'pmdAdminPlatformLogoCandidateV25';
  var LAYOUT_KEY = 'pmdOwnerDashboardLayoutV25';

  var logoUrls = [
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-1.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-2.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-3.png'
  ];

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function clampLogoIndex(value) {
    var n = parseInt(value, 10);
    if (isNaN(n) || n < 0 || n > 2) n = 0;
    return n;
  }

  function selectedLogoIndex() {
    return clampLogoIndex(localStorage.getItem(LOGO_KEY));
  }

  function logoUrl() {
    return logoUrls[selectedLogoIndex()] + '?v=' + selectedLogoIndex();
  }

  function ensureLogoImage(anchor, place) {
    if (!anchor) return null;

    var img = anchor.querySelector('img.pmd-platform-logo-img-v25');
    if (!img) {
      img = document.createElement('img');
      img.className = 'pmd-platform-logo-img-v25';
      img.alt = 'PayMyDine';
      img.setAttribute('data-pmd-platform-logo', '1');

      if (place === 'before') anchor.insertBefore(img, anchor.firstChild);
      else anchor.appendChild(img);
    }

    img.src = logoUrl();
    return img;
  }

  function applyPlatformLogo() {
    document.documentElement.classList.add('pmd-admin-logo-v25-ready');

    var anchors = [
      document.querySelector('.pmd-sidebar-brand a.logo'),
      document.querySelector('.navbar-brand a.logo'),
      document.querySelector('.sidebar-mobile-brand a.logo')
    ];

    anchors.forEach(function (a) {
      ensureLogoImage(a, 'before');
    });

    // Any tenant dashboard logo still visible in top-left should become PMD logo, not restaurant logo.
    document.querySelectorAll('.navbar-brand img.pmd-dashboard-logo-img, .navbar-top a.logo img:not(.pmd-platform-logo-img-v25)').forEach(function (img) {
      img.style.setProperty('display', 'none', 'important');
    });

    updateLogoButtonLabel();
  }

  function updateLogoButtonLabel() {
    var small = document.querySelector('.pmd-logo-cycle-btn-v25 small');
    if (small) small.textContent = String(selectedLogoIndex() + 1) + '/3';
  }

  function cycleLogo() {
    var next = (selectedLogoIndex() + 1) % 3;
    localStorage.setItem(LOGO_KEY, String(next));
    applyPlatformLogo();

    if (window.pushNotif && typeof window.pushNotif.showFlash === 'function') {
      window.pushNotif.showFlash('PayMyDine logo candidate ' + (next + 1) + ' selected.', 'success');
    }
  }

  function installLogoButton() {
    var nav = document.querySelector('#side-nav-menu');
    if (!nav || document.querySelector('.pmd-logo-cycle-nav-item-v25')) return;

    var li = document.createElement('li');
    li.className = 'pmd-logo-cycle-nav-item-v25';
    li.innerHTML = '<button type="button" class="pmd-logo-cycle-btn-v25" title="Switch PayMyDine logo"><i class="fa fa-picture-o"></i><span>Logo</span><small></small></button>';

    var first = nav.firstElementChild;
    if (first) nav.insertBefore(li, first);
    else nav.appendChild(li);

    li.querySelector('button').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      cycleLogo();
    });

    updateLogoButtonLabel();
  }

  function ownerRoot() {
    return document.querySelector('.pmd-dashboard-modern.pmd-owner-match-v13');
  }

  function defaultLayoutState() {
    return { cards: 'normal', floor: 'normal', footer: 'normal' };
  }

  function getLayoutState() {
    try {
      var parsed = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
      var state = defaultLayoutState();
      ['cards', 'floor', 'footer'].forEach(function (key) {
        if (['compact', 'normal', 'large'].indexOf(parsed[key]) !== -1) state[key] = parsed[key];
      });
      return state;
    } catch (e) {
      return defaultLayoutState();
    }
  }

  function saveLayoutState(state) {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(state));
  }

  function applyLayoutState() {
    var root = ownerRoot();
    if (!root) return;

    var state = getLayoutState();

    [
      'pmd-owner-cards-compact-v25', 'pmd-owner-cards-large-v25',
      'pmd-owner-floor-compact-v25', 'pmd-owner-floor-large-v25',
      'pmd-owner-footer-compact-v25', 'pmd-owner-footer-large-v25'
    ].forEach(function (cls) { root.classList.remove(cls); });

    if (state.cards !== 'normal') root.classList.add('pmd-owner-cards-' + state.cards + '-v25');
    if (state.floor !== 'normal') root.classList.add('pmd-owner-floor-' + state.floor + '-v25');
    if (state.footer !== 'normal') root.classList.add('pmd-owner-footer-' + state.footer + '-v25');

    syncPanelButtons();
  }

  function setLayoutPart(part, value) {
    var state = getLayoutState();
    state[part] = value;
    saveLayoutState(state);
    applyLayoutState();
  }

  function resetLayout() {
    saveLayoutState(defaultLayoutState());
    applyLayoutState();
  }

  function createLayoutPanel() {
    if (document.querySelector('.pmd-owner-layout-panel-v25')) return;

    var panel = document.createElement('div');
    panel.className = 'pmd-owner-layout-panel-v25';
    panel.innerHTML =
      '<div class="pmd-owner-layout-panel-v25__head">' +
        '<strong>Owner Dashboard Layout</strong>' +
        '<button type="button" data-action="close" aria-label="Close" style="border:0;background:transparent;font-size:18px;line-height:1;cursor:pointer;color:#64748b;">×</button>' +
      '</div>' +
      '<div class="pmd-owner-layout-panel-v25__body">' +
        '<div class="pmd-owner-layout-row-v25" data-part="cards">' +
          '<label>Metric Cards</label>' +
          '<div class="pmd-owner-layout-segment-v25">' +
            '<button type="button" data-value="compact">Small</button>' +
            '<button type="button" data-value="normal">Normal</button>' +
            '<button type="button" data-value="large">Large</button>' +
          '</div>' +
        '</div>' +
        '<div class="pmd-owner-layout-row-v25" data-part="floor">' +
          '<label>Floor Plan</label>' +
          '<div class="pmd-owner-layout-segment-v25">' +
            '<button type="button" data-value="compact">Small</button>' +
            '<button type="button" data-value="normal">Normal</button>' +
            '<button type="button" data-value="large">Large</button>' +
          '</div>' +
        '</div>' +
        '<div class="pmd-owner-layout-row-v25" data-part="footer">' +
          '<label>Bottom Row</label>' +
          '<div class="pmd-owner-layout-segment-v25">' +
            '<button type="button" data-value="compact">Small</button>' +
            '<button type="button" data-value="normal">Normal</button>' +
            '<button type="button" data-value="large">Large</button>' +
          '</div>' +
        '</div>' +
        '<div class="pmd-owner-layout-actions-v25">' +
          '<button type="button" data-action="reset">Reset</button>' +
          '<button type="button" data-action="close">Done</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;

      var action = btn.getAttribute('data-action');
      if (action === 'close') {
        setEditMode(false);
        return;
      }

      if (action === 'reset') {
        resetLayout();
        return;
      }

      var row = btn.closest('[data-part]');
      var value = btn.getAttribute('data-value');
      if (row && value) setLayoutPart(row.getAttribute('data-part'), value);
    });
  }

  function syncPanelButtons() {
    var state = getLayoutState();
    document.querySelectorAll('.pmd-owner-layout-row-v25').forEach(function (row) {
      var part = row.getAttribute('data-part');
      row.querySelectorAll('button[data-value]').forEach(function (btn) {
        btn.classList.toggle('is-selected', btn.getAttribute('data-value') === state[part]);
      });
    });
  }

  function setEditMode(on) {
    var body = document.body;
    var btn = document.querySelector('.pmd-owner-layout-trigger-v25, #edit-layout-toggle');

    body.classList.toggle('pmd-owner-layout-editing-v25', !!on);

    if (btn) {
      btn.classList.toggle('is-active', !!on);
      var txt = btn.querySelector('#edit-layout-text') || btn.querySelector('span');
      if (txt) txt.textContent = on ? 'Done Layout' : 'Edit Layout';
    }

    syncPanelButtons();
  }

  function toggleOwnerLayoutEditor() {
    createLayoutPanel();
    var on = !document.body.classList.contains('pmd-owner-layout-editing-v25');
    setEditMode(on);
  }

  function installLayoutEditorButton() {
    if (!ownerRoot()) return;

    createLayoutPanel();
    applyLayoutState();

    // First try the native/old dashboard Edit Layout button and hijack it for the new owner dashboard.
    var nativeBtn = document.getElementById('edit-layout-toggle');
    if (nativeBtn) {
      nativeBtn.classList.add('pmd-owner-layout-trigger-v25');
      nativeBtn.removeAttribute('onclick');
      nativeBtn.onclick = null;

      var icon = nativeBtn.querySelector('i') || document.createElement('i');
      icon.className = 'fa fa-edit';
      if (!icon.parentNode) nativeBtn.insertBefore(icon, nativeBtn.firstChild);

      var span = nativeBtn.querySelector('#edit-layout-text') || nativeBtn.querySelector('span') || document.createElement('span');
      span.id = 'edit-layout-text';
      span.textContent = 'Edit Layout';
      if (!span.parentNode) nativeBtn.appendChild(span);

      if (!nativeBtn.getAttribute('data-pmd-owner-layout-bound')) {
        nativeBtn.setAttribute('data-pmd-owner-layout-bound', '1');
        nativeBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          toggleOwnerLayoutEditor();
          return false;
        }, true);
      }
      return;
    }

    // Fallback: if the native button is not rendered, add a clean button to the admin header.
    if (document.querySelector('.pmd-owner-layout-trigger-v25')) return;

    var right = document.querySelector('.navbar.navbar-right') || document.querySelector('.navbar-right');
    if (!right) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmd-owner-layout-trigger-v25';
    btn.innerHTML = '<i class="fa fa-edit"></i><span>Edit Layout</span>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      toggleOwnerLayoutEditor();
    });

    right.insertBefore(btn, right.firstChild);
  }

  function init() {
    applyPlatformLogo();
    installLogoButton();
    installLayoutEditorButton();

    // Re-apply after dashboard renderer / sidebar scripts finish.
    setTimeout(function () {
      applyPlatformLogo();
      installLogoButton();
      installLayoutEditorButton();
      applyLayoutState();
    }, 250);

    setTimeout(function () {
      applyPlatformLogo();
      installLogoButton();
      installLayoutEditorButton();
      applyLayoutState();
    }, 900);
  }

  ready(init);
})();
