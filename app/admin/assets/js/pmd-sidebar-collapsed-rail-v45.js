(function () {
  'use strict';

  var KEY = 'pmdSidebarCollapsedV45';
  var OLD = ['pmdSidebarCollapsedV44','pmdSidebarCollapsedV43','pmdSidebarCollapsedV42','pmdSidebarCollapsedV41'];

  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }

  function wantedCollapsed() {
    if (localStorage.getItem(KEY) === '1') return true;
    for (var i = 0; i < OLD.length; i++) if (localStorage.getItem(OLD[i]) === '1') return true;
    return false;
  }

  function setWanted(v) {
    localStorage.setItem(KEY, v ? '1' : '0');
    OLD.forEach(function(k){ localStorage.setItem(k, v ? '1':'0'); });
    document.documentElement.classList.toggle('pmd-sidebar-persist-collapsed-v45', !!v);
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v44','pmd-sidebar-persist-collapsed-v43','pmd-sidebar-persist-collapsed-v42','pmd-sidebar-persist-collapsed-v41');
  }

  function isCollapsed() {
    var b = document.body, h = document.documentElement;
    return b.classList.contains('pmd-sidebar-icons-only') ||
      b.classList.contains('pmd-sidebar-collapsed') ||
      b.classList.contains('sidebar-collapsed') ||
      b.classList.contains('sidebar-xs') ||
      h.classList.contains('pmd-sidebar-icons-only') ||
      h.classList.contains('pmd-sidebar-collapsed') ||
      h.classList.contains('pmd-sidebar-persist-collapsed-v45');
  }

  function applyCollapsedClass() {
    if (!wantedCollapsed()) return;
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v45');
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v44','pmd-sidebar-persist-collapsed-v43','pmd-sidebar-persist-collapsed-v42','pmd-sidebar-persist-collapsed-v41');
    if (document.body) document.body.classList.add('pmd-sidebar-collapsed','pmd-sidebar-icons-only');
  }

  function menu() {
    return document.querySelector('#side-nav-menu') || document.querySelector('.side-nav-menu') || document.querySelector('.sidebar-menu') || document.querySelector('.nav-sidebar');
  }

  function side() {
    var m = menu();
    return (m && (m.closest('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar') || m.parentElement))
      || document.querySelector('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar');
  }

  function realToggle() {
    return document.querySelector('.pmd-sidebar-icons-toggle:not(#pmd-sidebar-edge-toggle-v40):not(#pmd-sidebar-edge-toggle-v41):not(#pmd-sidebar-edge-toggle-v42):not(#pmd-sidebar-edge-toggle-v43):not(#pmd-sidebar-edge-toggle-v44):not(#pmd-sidebar-edge-toggle-v45)');
  }

  function chevronSvg() {
    return isCollapsed()
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  }

  function iconSvg(name) {
    var map = {
      dashboard:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
      orders:'<path d="M6 8h12l-1 13H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
      reservations:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="M8 15h.01"/><path d="M12 15h.01"/><path d="M16 15h.01"/>',
      restaurant:'<path d="M7 2v20"/><path d="M4 2v8a3 3 0 0 0 6 0V2"/><path d="M17 2c-2 2-3 5-3 8 0 2 1 4 3 4v8"/><path d="M17 2v12"/>',
      design:'<path d="M14 4l6 6-10 10H4v-6L14 4Z"/><path d="M13 5l6 6"/>',
      system:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/>',
      power:'<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (map[name] || map.dashboard) + '</svg>';
  }

  function text(el){ return String((el && el.textContent) || '').replace(/\s+/g,' ').trim().toLowerCase(); }

  function hrefFor(name, fallback) {
    var m = menu();
    if (!m) return fallback;
    var links = Array.prototype.slice.call(m.querySelectorAll('a[href]'));
    for (var i=0;i<links.length;i++) {
      var hay = text(links[i]) + ' ' + String(links[i].getAttribute('href') || '').toLowerCase();
      if (hay.indexOf(name) !== -1) return links[i].getAttribute('href');
    }
    return fallback;
  }

  function currentKey() {
    var path = location.pathname.toLowerCase();
    if (path.indexOf('orders') !== -1) return 'orders';
    if (path.indexOf('reservations') !== -1) return 'reservations';
    if (path.indexOf('restaurant') !== -1 || path.indexOf('tables') !== -1 || path.indexOf('menus') !== -1) return 'restaurant';
    if (path.indexOf('design') !== -1) return 'design';
    if (path.indexOf('system') !== -1 || path.indexOf('settings') !== -1) return 'system';
    return 'dashboard';
  }

  function ensureRail() {
    var s = side();
    if (!s) return;
    s.style.position = 'relative';
    s.style.overflow = 'visible';

    var rail = s.querySelector('.pmd-collapsed-rail-v45');
    if (!rail) {
      rail = document.createElement('nav');
      rail.className = 'pmd-collapsed-rail-v45';
      rail.setAttribute('aria-label', 'Collapsed sidebar navigation');
      s.appendChild(rail);
    }

    var items = [
      ['dashboard','dashboard', hrefFor('dashboard','/admin/dashboard')],
      ['orders','orders', hrefFor('orders','/admin/orders')],
      ['reservations','reservations', hrefFor('reservations','/admin/reservations')],
      ['restaurant','restaurant', hrefFor('restaurant','/admin/restaurant')],
      ['design','design', hrefFor('design','/admin/design')],
      ['system','system', hrefFor('system','/admin/system/settings')]
    ];

    var active = currentKey();
    rail.innerHTML = items.map(function(it){
      return '<a href="'+it[2]+'" class="'+(active===it[0]?'is-active':'')+'" title="'+it[0]+'">'+iconSvg(it[1])+'</a>';
    }).join('');

    var power = s.querySelector('.pmd-collapsed-power-v45');
    if (!power) {
      power = document.createElement('a');
      power.className = 'pmd-collapsed-power-v45';
      power.href = findLogoutHref() || '#';
      power.title = 'Logout';
      power.innerHTML = iconSvg('power');
      s.appendChild(power);
    }
  }

  function findLogoutHref() {
    var s = side() || document;
    var links = Array.prototype.slice.call(s.querySelectorAll('a[href]'));
    for (var i=0;i<links.length;i++) {
      var hay = text(links[i]) + ' ' + String(links[i].getAttribute('href') || '').toLowerCase() + ' ' + String(links[i].className || '').toLowerCase();
      if (hay.indexOf('logout') !== -1 || hay.indexOf('signout') !== -1 || links[i].querySelector('.fa-power-off')) return links[i].getAttribute('href');
    }
    return null;
  }

  function ensureButton() {
    document.querySelectorAll('#pmd-sidebar-edge-toggle-v40, #pmd-sidebar-edge-toggle-v41, #pmd-sidebar-edge-toggle-v42, #pmd-sidebar-edge-toggle-v43, #pmd-sidebar-edge-toggle-v44').forEach(function(old){
      old.style.display='none'; old.style.visibility='hidden'; old.style.pointerEvents='none';
    });

    var btn = document.getElementById('pmd-sidebar-edge-toggle-v45');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'pmd-sidebar-edge-toggle-v45';
      btn.setAttribute('aria-label','Toggle sidebar');
      btn.innerHTML = chevronSvg();
      document.body.appendChild(btn);

      btn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        var before = isCollapsed();
        var rt = realToggle();

        if (rt) rt.click();
        else document.body.classList.toggle('pmd-sidebar-collapsed'), document.body.classList.toggle('pmd-sidebar-icons-only');

        setWanted(!before);
        [40,140,300].forEach(function(ms){ setTimeout(applyAll, ms); });
        return false;
      }, true);
    }
    btn.innerHTML = chevronSvg();
    return btn;
  }

  function firstRailItem() {
    var s = side();
    return s ? s.querySelector('.pmd-collapsed-rail-v45 a') : null;
  }

  function firstNativeNavItem() {
    var m = menu();
    if (!m) return null;
    var items = Array.prototype.slice.call(m.children || []);
    for (var i=0;i<items.length;i++) {
      var it = items[i];
      if (it.classList.contains('pmd-logo-cycle-nav-item-v38')) continue;
      if ((it.className || '').toString().indexOf('toggle') !== -1) continue;
      if (it.querySelector && it.querySelector('a,button')) return it;
    }
    return null;
  }

  function positionButton() {
    var btn = ensureButton();
    var s = side();
    var left = isCollapsed() ? 72 : 246;
    var top = isCollapsed() ? 170 : 240;

    if (s) {
      s.style.overflow = 'visible';
      var sr = s.getBoundingClientRect();
      if (sr && sr.width > 20) left = Math.round(sr.right - 16);
    }

    var item = isCollapsed() ? firstRailItem() : firstNativeNavItem();
    if (item) {
      var ir = item.getBoundingClientRect();
      if (ir && ir.top > 20) top = Math.round(ir.top - 46);
    }

    left = Math.max(50, Math.min(left, window.innerWidth - 42));
    top = Math.max(86, Math.min(top, window.innerHeight - 72));

    document.documentElement.style.setProperty('--pmd-sidebar-edge-left-v45', left + 'px');
    document.documentElement.style.setProperty('--pmd-sidebar-edge-top-v45', top + 'px');

    btn.innerHTML = chevronSvg();
    btn.setAttribute('aria-expanded', isCollapsed() ? 'false' : 'true');
    btn.setAttribute('title', isCollapsed() ? 'Open sidebar' : 'Close sidebar');

    var rt = realToggle();
    if (rt) { rt.setAttribute('tabindex','-1'); rt.setAttribute('aria-hidden','true'); }
  }

  function persistLinks() {
    document.querySelectorAll('#side-nav-menu a[href], .side-nav-menu a[href], .sidebar-menu a[href], .nav-sidebar a[href], .pmd-collapsed-rail-v45 a[href]').forEach(function(a){
      if (a.getAttribute('data-pmd-sidebar-persist-v45')) return;
      a.setAttribute('data-pmd-sidebar-persist-v45','1');
      a.addEventListener('click', function(){ setWanted(isCollapsed()); }, true);
    });
  }

  function applyAll() {
    if (wantedCollapsed()) applyCollapsedClass();
    ensureRail();
    ensureButton();
    persistLinks();
    positionButton();
  }

  if (wantedCollapsed()) {
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v45');
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v44','pmd-sidebar-persist-collapsed-v43','pmd-sidebar-persist-collapsed-v42','pmd-sidebar-persist-collapsed-v41');
  }

  ready(function(){
    applyAll();
    [80,220,500,900,1600,2600].forEach(function(ms){ setTimeout(applyAll, ms); });
    window.addEventListener('resize', positionButton, {passive:true});
    document.addEventListener('click', function(){ setTimeout(positionButton,120); }, true);

    window.PMDSidebarCollapsedRailV45 = {
      apply: applyAll,
      position: positionButton,
      setCollapsed: function(v){ setWanted(!!v); applyAll(); },
      isCollapsed: isCollapsed
    };
  });
})();
