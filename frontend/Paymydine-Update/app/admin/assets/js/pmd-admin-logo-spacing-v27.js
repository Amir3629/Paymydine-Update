(function () {
  'use strict';

  var LOGO_KEY = 'pmdAdminPlatformLogoCandidateV25';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function selectedIndex() {
    var n = parseInt(localStorage.getItem(LOGO_KEY), 10);
    if (isNaN(n) || n < 0 || n > 2) n = 0;
    return n;
  }

  function applyCandidateClass() {
    var html = document.documentElement;
    html.classList.remove('pmd-logo-candidate-1-v27', 'pmd-logo-candidate-2-v27', 'pmd-logo-candidate-3-v27');
    html.classList.add('pmd-logo-candidate-' + (selectedIndex() + 1) + '-v27');

    document.querySelectorAll('img.pmd-platform-logo-img-v26').forEach(function (img) {
      img.setAttribute('data-logo-index', String(selectedIndex()));
    });

    var label = document.querySelector('.pmd-logo-cycle-btn-v25 small');
    if (label) label.textContent = String(selectedIndex() + 1) + '/3';
  }

  function bindLogoButton() {
    var btn = document.querySelector('.pmd-logo-cycle-btn-v25');
    if (!btn || btn.getAttribute('data-pmd-v27-bound')) return;

    btn.setAttribute('data-pmd-v27-bound', '1');
    btn.addEventListener('click', function () {
      setTimeout(applyCandidateClass, 20);
      setTimeout(applyCandidateClass, 180);
    }, true);
  }

  ready(function () {
    applyCandidateClass();
    bindLogoButton();

    setTimeout(function () {
      applyCandidateClass();
      bindLogoButton();
    }, 250);

    setTimeout(function () {
      applyCandidateClass();
      bindLogoButton();
    }, 1000);
  });
})();
