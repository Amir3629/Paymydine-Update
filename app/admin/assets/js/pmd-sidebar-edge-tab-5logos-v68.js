(function () {
  'use strict';

  var KEY = 'pmdAdminPlatformLogoCandidateV38';
  var OLD_KEYS = ['pmdAdminPlatformLogoCandidateV37', 'pmdAdminPlatformLogoCandidateV25'];
  var COUNT = 5;
  var CLOSED_LOGO = '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-2.png';
  var urls = [
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-1.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-2.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-3.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-4.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-5.png'
  ];

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function collapsed() {
    return !!(document.body && document.body.classList.contains('pmd-sidebar-icons-only'));
  }

  function idx() {
    var n = parseInt(localStorage.getItem(KEY), 10);
    if (isNaN(n)) {
      for (var i = 0; i < OLD_KEYS.length; i++) {
        var old = parseInt(localStorage.getItem(OLD_KEYS[i]), 10);
        if (!isNaN(old)) { n = old; break; }
      }
    }
    if (isNaN(n) || n < 0) n = 0;
    if (n >= COUNT) n = COUNT - 1; // old 6/6 becomes 5/5
    return n;
  }

  function setIdx(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 0) n = 0;
    if (n >= COUNT) n = COUNT - 1;
    localStorage.setItem(KEY, String(n));
    OLD_KEYS.forEach(function (key) { localStorage.setItem(key, String(n)); });
  }

  function menu() {
    return document.querySelector('#side-nav-menu') || document.querySelector('.side-nav-menu') || document.querySelector('.sidebar-menu') || document.querySelector('.nav-sidebar');
  }

  function navParent() {
    var m = menu();
    if (m && m.parentNode) return m.parentNode;
    return document.querySelector('#navSidebar') || document.querySelector('.sidebar') || document.body;
  }

  function ensureSlot() {
    var parent = navParent();
    var m = menu();
    var slot = parent.querySelector('.pmd-platform-logo-slot-v38') || document.querySelector('.pmd-platform-logo-slot-v38');

    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'pmd-platform-logo-slot-v38 pmd-platform-logo-slot-server-v65';
      slot.innerHTML = '<a class="pmd-platform-logo-link-v38 pmd-platform-logo-link-v65" href="/admin/dashboard" aria-label="PayMyDine dashboard"><img class="pmd-platform-logo-img-v38 pmd-platform-logo-img-v65" alt="PayMyDine"></a>';
      if (m && m.parentNode) m.parentNode.insertBefore(slot, m);
      else parent.insertBefore(slot, parent.firstChild);
    }

    if (m && slot.nextElementSibling !== m && m.parentNode === slot.parentNode) {
      m.parentNode.insertBefore(slot, m);
    }

    var link = slot.querySelector('.pmd-platform-logo-link-v38, .pmd-platform-logo-link-v65');
    if (!link) {
      link = document.createElement('a');
      link.className = 'pmd-platform-logo-link-v38 pmd-platform-logo-link-v65';
      link.href = '/admin/dashboard';
      link.setAttribute('aria-label', 'PayMyDine dashboard');
      while (slot.firstChild) link.appendChild(slot.firstChild);
      slot.appendChild(link);
    }

    var img = slot.querySelector('img.pmd-platform-logo-img-v38, img.pmd-platform-logo-img-v65, img');
    if (!img) {
      img = document.createElement('img');
      link.appendChild(img);
    }

    img.classList.add('pmd-platform-logo-img-v38', 'pmd-platform-logo-img-v65');
    img.alt = 'PayMyDine';
    img.setAttribute('decoding', 'async');
    img.setAttribute('fetchpriority', 'high');
    return img;
  }

  function setLogo(src, label) {
    var img = ensureSlot();
    if (!img) return;

    var current = (img.getAttribute('src') || '').split('?')[0];
    if (current !== src) img.src = src;

    img.alt = label || 'PayMyDine';
    img.style.transition = 'none';
    img.style.animation = 'none';
    img.style.transform = 'none';
    img.style.visibility = 'visible';
    img.style.opacity = '1';
  }

  function applyClass() {
    for (var i = 1; i <= 6; i++) {
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v38');
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v65');
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v68');
    }
    document.documentElement.classList.add('pmd-logo-candidate-' + (idx() + 1) + '-v38');
    document.documentElement.classList.add('pmd-logo-candidate-' + (idx() + 1) + '-v68');
  }

  function ensureButton() {
    var m = menu();
    if (!m) return;

    var item = m.querySelector('.pmd-logo-cycle-nav-item-v38');
    if (!item) {
      item = document.createElement('li');
      item.className = 'pmd-logo-cycle-nav-item-v38';
      item.innerHTML = '<button type="button" class="pmd-logo-cycle-btn-v38" aria-label="Cycle PayMyDine logo"><span>↔</span><small></small></button>';
      m.appendChild(item);
    }

    if (item.parentNode === m && item !== m.lastElementChild) m.appendChild(item);

    var btn = item.querySelector('.pmd-logo-cycle-btn-v38');
    var small = item.querySelector('small');
    if (small) small.textContent = (idx() + 1) + '/' + COUNT;

    if (collapsed()) {
      item.style.display = 'none';
      item.style.visibility = 'hidden';
      item.style.opacity = '0';
      item.style.pointerEvents = 'none';
      if (btn) btn.style.display = 'none';
    } else {
      item.style.display = 'flex';
      item.style.visibility = 'visible';
      item.style.opacity = '1';
      item.style.pointerEvents = 'auto';
      if (btn) btn.style.display = 'inline-flex';
    }

    if (btn && !btn.getAttribute('data-pmd-v68-bound')) {
      btn.setAttribute('data-pmd-v68-bound', '1');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIdx((idx() + 1) % COUNT);
        apply(true);
        return false;
      }, true);
    }
  }

  function syncToggle() {
    var btn = document.querySelector('.pmd-sidebar-icons-toggle');
    if (!btn) return;

    btn.style.left = 'auto';
    btn.style.right = '-1px';
    btn.style.width = '38px';
    btn.style.height = '54px';
    btn.style.minWidth = '38px';
    btn.style.minHeight = '54px';
    btn.style.maxWidth = '38px';
    btn.style.maxHeight = '54px';
    btn.style.borderRadius = '22px 0 0 22px';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '0';
    btn.style.zIndex = '2147483000';

    btn.setAttribute('title', collapsed() ? 'Open sidebar' : 'Close sidebar');
    btn.setAttribute('aria-expanded', collapsed() ? 'false' : 'true');

    var icon = btn.querySelector('i') || btn.querySelector('.fa');
    if (!icon) {
      icon = document.createElement('i');
      icon.setAttribute('aria-hidden', 'true');
      btn.appendChild(icon);
    }

    icon.className = 'fa ' + (collapsed() ? 'fa-angle-right' : 'fa-angle-left');
    icon.setAttribute('aria-hidden', 'true');
    icon.style.width = '18px';
    icon.style.height = '18px';
    icon.style.minWidth = '18px';
    icon.style.minHeight = '18px';
    icon.style.maxWidth = '18px';
    icon.style.maxHeight = '18px';
    icon.style.fontSize = '20px';
    icon.style.lineHeight = '18px';
    icon.style.margin = '0';
    icon.style.padding = '0';
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.transform = collapsed() ? 'translateX(-.5px) translateY(.5px)' : 'translateX(-1px) translateY(.5px)';
  }

  function apply(force) {
    setIdx(idx());
    applyClass();

    if (collapsed()) {
      setLogo(CLOSED_LOGO, 'PayMyDine compact logo');
    } else {
      setLogo(urls[idx()], 'PayMyDine logo candidate ' + (idx() + 1) + ' of ' + COUNT);
    }

    ensureButton();
    syncToggle();

    window.PMDLogoSwitcherV68 = {
      count: COUNT,
      index: idx,
      set: function (n) { setIdx(n); apply(true); },
      next: function () { setIdx((idx() + 1) % COUNT); apply(true); },
      apply: apply,
      urls: urls.slice(),
      closedLogo: CLOSED_LOGO
    };

    window.PMDLogoSwitcherV65 = window.PMDLogoSwitcherV68;
    window.PMDLogoSwitcherV38 = window.PMDLogoSwitcherV68;
  }

  ready(function () {
    apply(false);

    [80, 220, 500, 900, 1600].forEach(function (ms) {
      setTimeout(function () { apply(false); }, ms);
    });

    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('.pmd-sidebar-icons-toggle')) {
        setTimeout(function () { apply(false); }, 0);
        setTimeout(function () { apply(false); }, 90);
        setTimeout(function () { apply(false); }, 220);
      }
    }, true);

    try {
      var mo = new MutationObserver(function () { apply(false); });
      if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
  });
})();
