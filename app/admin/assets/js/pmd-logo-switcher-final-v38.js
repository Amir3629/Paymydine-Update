(function () {
  'use strict';
  var KEY = 'pmdAdminPlatformLogoCandidateV38';
  var OLD_KEYS = ['pmdAdminPlatformLogoCandidateV37', 'pmdAdminPlatformLogoCandidateV25'];
  var COUNT = 6;
  var urls = [
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-1.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-2.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-3.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-4.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-5.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-6.png'
  ];
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function idx() {
    var n = parseInt(localStorage.getItem(KEY), 10);
    if (isNaN(n)) {
      for (var i = 0; i < OLD_KEYS.length; i++) {
        var old = parseInt(localStorage.getItem(OLD_KEYS[i]), 10);
        if (!isNaN(old) && old >= 0 && old < COUNT) { n = old; break; }
      }
    }
    if (isNaN(n) || n < 0 || n >= COUNT) n = 0;
    return n;
  }
  function setIdx(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 0 || n >= COUNT) n = 0;
    localStorage.setItem(KEY, String(n));
    OLD_KEYS.forEach(function (key) { localStorage.setItem(key, String(n)); });
  }
  function menu() {
    return document.querySelector('#side-nav-menu') || document.querySelector('.side-nav-menu') || document.querySelector('.sidebar-menu') || document.querySelector('.nav-sidebar');
  }
  function findLogoParent() {
    var m = menu();
    if (m && m.parentNode) return m.parentNode;
    return document.querySelector('#sidebar') || document.querySelector('.sidebar') || document.querySelector('aside') || document.body;
  }
  function ensureSlot() {
    var parent = findLogoParent();
    var m = menu();
    var oldSlot = document.querySelector('.pmd-platform-logo-slot-v37') || document.querySelector('.pmd-platform-logo-slot-v26') || document.querySelector('.pmd-platform-logo-slot-v38');
    var slot = document.querySelector('.pmd-platform-logo-slot-v38') || oldSlot;
    if (!slot) {
      slot = document.createElement('div');
      if (m && m.parentNode) m.parentNode.insertBefore(slot, m);
      else parent.insertBefore(slot, parent.firstChild);
    }
    slot.className = 'pmd-platform-logo-slot-v38';
    if (m && slot.nextElementSibling !== m && m.parentNode === slot.parentNode) m.parentNode.insertBefore(slot, m);
    slot.innerHTML = '<a class="pmd-platform-logo-link-v38" href="/admin/dashboard"><img class="pmd-platform-logo-img-v38" alt="PayMyDine"></a>';
    return slot.querySelector('img.pmd-platform-logo-img-v38');
  }
  function removeOldThings() {
    document.querySelectorAll('img').forEach(function (img) {
      if (img.classList.contains('pmd-platform-logo-img-v38')) return;
      var src = (img.getAttribute('src') || '').toLowerCase();
      var cls = (img.className || '').toString().toLowerCase();
      if (src.indexOf('/pmd-logo-candidates/') !== -1 || src.indexOf('gemini_generated_image') !== -1 || src.indexOf('kzcmghkzcmghkzcm') !== -1 || cls.indexOf('pmd-platform-logo-img') !== -1 || cls.indexOf('pmd-dashboard-logo-img') !== -1) img.remove();
    });
    document.querySelectorAll('.pmd-logo-cycle-nav-item-v25, .pmd-logo-cycle-nav-item-v26, .pmd-logo-cycle-nav-item-v36, .pmd-logo-cycle-nav-item-v37').forEach(function (el) { el.remove(); });
  }
  function applyClass() {
    for (var i = 1; i <= 6; i++) {
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v27');
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v36');
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v37');
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v38');
    }
    document.documentElement.classList.add('pmd-logo-candidate-' + (idx() + 1) + '-v38');
  }
  function ensureButton() {
    var m = menu();
    if (!m) return;
    var item = m.querySelector('.pmd-logo-cycle-nav-item-v38');
    if (!item) {
      item = document.createElement('li');
      item.className = 'pmd-logo-cycle-nav-item-v38';
      item.innerHTML = '<button type="button" class="pmd-logo-cycle-btn-v38" aria-label="Cycle PayMyDine logo"><span>LOGO</span><small></small></button>';
      m.insertBefore(item, m.firstChild);
    }
    var small = item.querySelector('small');
    if (small) small.textContent = (idx() + 1) + '/' + COUNT;
    var btn = item.querySelector('.pmd-logo-cycle-btn-v38');
    if (btn && !btn.getAttribute('data-pmd-v38-bound')) {
      btn.setAttribute('data-pmd-v38-bound', '1');
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        setIdx((idx() + 1) % COUNT); apply(); return false;
      }, true);
    }
  }
  function apply() {
    applyClass(); removeOldThings();
    var img = ensureSlot();
    if (img) {
      img.setAttribute('data-logo-index', String(idx()));
      img.src = urls[idx()] + '?v=' + Date.now();
      img.alt = 'PayMyDine logo candidate ' + (idx() + 1) + ' of ' + COUNT;
    }
    ensureButton();
  }
  ready(function () {
    apply();
    [80, 220, 500, 900, 1600, 2600].forEach(function (ms) { setTimeout(apply, ms); });
    window.PMDLogoSwitcherV38 = { count: COUNT, index: idx, set: function (n) { setIdx(n); apply(); }, next: function () { setIdx((idx() + 1) % COUNT); apply(); }, apply: apply, urls: urls.slice() };
  });
})();
