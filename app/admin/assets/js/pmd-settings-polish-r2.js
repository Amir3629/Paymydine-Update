/* PMD_SETTINGS_POLISH_R2 */
(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
  if (path !== '/admin/pmdsettings/restaurant') return;

  function removeDeveloperCopy(root) {
    Array.prototype.slice.call(
      root.querySelectorAll('.pmd-profile-logo-authority-r21, .pmd-profile-logo-source-r20')
    ).forEach(function (node) {
      node.remove();
    });
  }

  function bindLogoRemoval(root) {
    removeDeveloperCopy(root);

    var container = root.querySelector('.pmd-profile-logo-input-r19') || root;
    var inputs = Array.prototype.slice.call(
      container.querySelectorAll('input[name="profile[remove_logo]"]')
    );

    if (!inputs.length) return;

    var checkbox = inputs[0];
    var label = checkbox.closest('.pmd-profile-logo-remove-r20') || checkbox.closest('label');

    inputs.slice(1).forEach(function (input) {
      var duplicateLabel = input.closest('.pmd-profile-logo-remove-r20') || input.closest('label');
      if (duplicateLabel && duplicateLabel !== label) duplicateLabel.remove();
      else input.remove();
    });

    if (!label) return;

    label.classList.add('pmd-profile-logo-remove-r20');
    checkbox.disabled = false;
    checkbox.removeAttribute('disabled');

    var copy = label.querySelector('span');
    if (copy) copy.textContent = 'Remove logo';

    var preview = root.querySelector('#pmd-restaurant-logo-preview-r19');
    if (preview && typeof preview.__pmdOriginalLogoR2 === 'undefined') {
      preview.__pmdOriginalLogoR2 = preview.innerHTML;
    }

    function setRemovedPreview() {
      label.classList.add('is-pmd-remove-selected-r2');
      if (!preview) return;

      preview.setAttribute('data-pmd-logo-remove-pending-r2', '1');
      preview.removeAttribute('data-pmd-logo-remove-pending-r1');
      preview.innerHTML = '<span>No restaurant logo selected</span>';
    }

    function restorePreview() {
      label.classList.remove('is-pmd-remove-selected-r2');
      if (!preview) return;

      preview.removeAttribute('data-pmd-logo-remove-pending-r2');
      preview.removeAttribute('data-pmd-logo-remove-pending-r1');
      preview.innerHTML = preview.__pmdOriginalLogoR2 || '<span>No restaurant logo selected</span>';
    }

    function syncRemovalState() {
      if (checkbox.checked) setRemovedPreview();
      else restorePreview();
    }

    if (!checkbox.__pmdPolishR2Bound) {
      checkbox.__pmdPolishR2Bound = true;
      checkbox.addEventListener('change', syncRemovalState, false);
    }

    var fileInput = root.querySelector('input[type="file"][name="profile[logo]"]');
    if (fileInput && !fileInput.__pmdPolishR2Bound) {
      fileInput.__pmdPolishR2Bound = true;
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

        if (!file) {
          syncRemovalState();
          return;
        }

        checkbox.checked = false;
        label.classList.remove('is-pmd-remove-selected-r2');

        if (!preview || !window.URL || typeof window.URL.createObjectURL !== 'function') {
          return;
        }

        var objectUrl = window.URL.createObjectURL(file);
        preview.removeAttribute('data-pmd-logo-remove-pending-r2');
        preview.removeAttribute('data-pmd-logo-remove-pending-r1');
        preview.innerHTML = '';

        var image = document.createElement('img');
        image.src = objectUrl;
        image.alt = 'Selected restaurant logo preview';
        image.addEventListener('load', function () {
          try { window.URL.revokeObjectURL(objectUrl); } catch (error) {}
        }, {once: true});
        preview.appendChild(image);
      }, false);
    }

    syncRemovalState();
  }

  function boot() {
    var root = document.getElementById('pmd-restaurant-profile');
    if (!root) return;

    bindLogoRemoval(root);

    if (window.MutationObserver && !root.__pmdPolishR2Observer) {
      var queued = false;
      var observer = new MutationObserver(function () {
        if (queued) return;
        queued = true;

        Promise.resolve().then(function () {
          queued = false;
          bindLogoRemoval(root);
        });
      });

      observer.observe(root, {childList: true, subtree: true});
      root.__pmdPolishR2Observer = observer;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }

  document.addEventListener('pageContentLoaded', boot, false);
})();
