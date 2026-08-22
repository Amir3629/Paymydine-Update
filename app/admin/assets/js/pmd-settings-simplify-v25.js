(function () {
  'use strict';

  if (window.PMDSettingsSimplifyV25) return;

  function path() {
    return String(window.location.pathname || '').replace(/\/+$/, '');
  }

  function removeMenuLandingButton() {
    if (path() !== '/admin/pmdsettings') return;

    Array.prototype.slice.call(document.querySelectorAll('#pmd-settings-center a[href]')).forEach(function (link) {
      var pathname = '';
      try { pathname = new URL(link.href, window.location.origin).pathname.replace(/\/+$/, ''); }
      catch (error) { return; }
      if (pathname !== '/admin/pmdmenu') return;

      var card = link.closest('.pmd-settings-card');
      if (card) card.remove();
      else link.remove();
    });
  }

  function normalizeRestaurantLogoRemove() {
    if (path() !== '/admin/pmdsettings/restaurant') return;

    var field = document.querySelector('.pmd-profile-logo-field-r19');
    if (!field) return;

    var inputs = Array.prototype.slice.call(
      field.querySelectorAll('input[name="profile[remove_logo]"]')
    );

    var keep = inputs.shift() || null;
    if (!keep) {
      var inputHost = field.querySelector('.pmd-profile-logo-input-r19') || field;
      var label = document.createElement('label');
      label.className = 'pmd-profile-logo-remove-r20';
      label.innerHTML = '<input type="checkbox" name="profile[remove_logo]" value="1"><span>Remove the current restaurant logo</span>';
      inputHost.appendChild(label);
      keep = label.querySelector('input');
    }

    var keepLabel = keep.closest('.pmd-profile-logo-remove-r20');
    if (!keepLabel) {
      keepLabel = document.createElement('label');
      keepLabel.className = 'pmd-profile-logo-remove-r20';
      keep.parentNode.insertBefore(keepLabel, keep);
      keepLabel.appendChild(keep);
      var keepText = document.createElement('span');
      keepText.textContent = 'Remove the current restaurant logo';
      keepLabel.appendChild(keepText);
    }

    inputs.forEach(function (input) {
      var duplicateLabel = input.closest('.pmd-profile-logo-remove-r20');
      if (duplicateLabel && duplicateLabel !== keepLabel) {
        duplicateLabel.remove();
      } else {
        var next = input.nextElementSibling;
        input.remove();
        if (next && next.tagName === 'SPAN' && /remove the current restaurant logo/i.test(next.textContent || '')) {
          next.remove();
        }
      }
    });

    Array.prototype.slice.call(field.querySelectorAll('.pmd-profile-logo-remove-r20')).forEach(function (label) {
      if (label !== keepLabel) label.remove();
    });

    /* Remove orphan duplicate text fragments created by older logo authority. */
    Array.prototype.slice.call(field.querySelectorAll('.pmd-profile-logo-input-r19 > span')).forEach(function (span) {
      if (/^remove the current restaurant logo$/i.test(String(span.textContent || '').trim())) {
        span.remove();
      }
    });

    keep.id = 'pmd-restaurant-remove-logo-v25';
    keepLabel.setAttribute('for', keep.id);
    keepLabel.classList.toggle('is-remove-selected', !!keep.checked);

    if (!keep.__pmdRemoveLogoBound) {
      keep.addEventListener('change', function () {
        keepLabel.classList.toggle('is-remove-selected', !!keep.checked);

        if (!keep.checked) return;

        var file = field.querySelector('input[type="file"][name="pmd_restaurant_logo"]');
        if (file) file.value = '';

        var preview = document.getElementById('pmd-restaurant-logo-preview-r19');
        if (preview) {
          preview.innerHTML = '<span class="pmd-profile-logo-empty-r19">Logo will be removed when you save</span>';
        }
      });
      keep.__pmdRemoveLogoBound = true;
    }
  }

  function normalizeFrontendThemeOnly() {
    if (path() !== '/admin/pmdsettings/frontend') return;

    var root = document.getElementById('pmd-frontend-settings');
    if (!root) return;

    var title = root.querySelector('.pmd-frontend-header h1');
    if (title) title.textContent = 'Customer menu theme';

    var firstCardTitle = root.querySelector('.pmd-frontend-section .pmd-frontend-card__header h2');
    if (firstCardTitle) firstCardTitle.textContent = 'Theme';

    var bottom = root.querySelector('.pmd-frontend-bottom-save button span');
    if (bottom) bottom.textContent = 'Save theme';
  }

  function run() {
    removeMenuLandingButton();
    normalizeRestaurantLogoRemove();
    normalizeFrontendThemeOnly();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, {once: true});
  } else {
    run();
  }

  var logoObserver = null;
  if (typeof MutationObserver === 'function') {
    document.addEventListener('DOMContentLoaded', function () {
      if (path() !== '/admin/pmdsettings/restaurant') return;
      var field = document.querySelector('.pmd-profile-logo-field-r19');
      if (!field) return;

      var queued = false;
      logoObserver = new MutationObserver(function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          normalizeRestaurantLogoRemove();
        });
      });
      logoObserver.observe(field, {childList: true, subtree: true});
    }, {once: true});
  }

  window.addEventListener('pagehide', function () {
    if (logoObserver) logoObserver.disconnect();
  }, {once: true});

  window.PMDSettingsSimplifyV25 = {
    version: '2.5.0',
    run: run,
    restaurantLogoRemoveSingleAuthority: true,
    frontendThemeOnly: true,
    pmdMenuLandingButtonRemovedOnly: true
  };

  console.info('[PMD] Settings simplify V2.5 active');
})();
