(function () {
  'use strict';
  var root = document.querySelector('[data-pmd-frontend-settings]');
  if (!root) return;

  function syncThemeCards() {
    root.querySelectorAll('[data-pmd-theme-option]').forEach(function (card) {
      var radio = card.querySelector('input[type="radio"]');
      card.classList.toggle('is-selected', !!(radio && radio.checked));
    });
  }

  root.addEventListener('change', function (event) {
    if (event.target && event.target.matches('input[name="frontend[theme_configuration]"]')) {
      syncThemeCards();
    }
    var status = document.getElementById('pmd-frontend-save-status');
    if (status) status.innerHTML = '<span class="pmd-frontend-save-status">Unsaved changes</span>';
  });

  root.addEventListener('ajaxDone', function () {
    syncThemeCards();
  });

  syncThemeCards();
})();
