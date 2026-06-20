(function () {
  'use strict';

  var KEY = 'pmdSidebarCollapsedV49';
  var OLD = [
    'pmdSidebarCollapsedV48','pmdSidebarCollapsedV47','pmdSidebarCollapsedV46',
    'pmdSidebarCollapsedV45','pmdSidebarCollapsedV44','pmdSidebarCollapsedV43',
    'pmdSidebarCollapsedV42','pmdSidebarCollapsedV41'
  ];

  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }

  function wantedCollapsed() {
    if (localStorage.getItem(KEY) === '1') return true;
    for (var i=0;i<OLD.length;i++) if (localStorage.getItem(OLD[i]) === '1') return true;
    return false;
  }

  function setWanted(v) {
    localStorage.setItem(KEY, v ? '1' : '0');
    OLD.forEach(function(k){ localStorage.setItem(k, '0'); });
    document.documentElement.classList.toggle('pmd-sidebar-persist-collapsed-v49', !!v);
    document.documentElement.classList.remove(
      'pmd-sidebar-persist-collapsed-v48','pmd-sidebar-persist-collapsed-v47',
      'pmd-sidebar-persist-collapsed-v46','pmd-sidebar-persist-collapsed-v45',
      'pmd-sidebar-persist-collapsed-v44','pmd-sidebar-persist-collapsed-v43',
      'pmd-sidebar-persist-collapsed-v42','pmd-sidebar-persist-collapsed-v41'
    );
  }

  function isCollapsed() {
    var b = document.body, h = document.documentElement;
    return b.classList.contains('pmd-sidebar-icons-only') ||
      b.classList.contains('pmd-sidebar-collapsed') ||
      b.classList.contains('sidebar-collapsed') ||
      b.classList.contains('sidebar-xs') ||
      h.classList.contains('pmd-sidebar-persist-collapsed-v49');
  }

  function side() {
    return document.querySelector('.sidebar.pmd-sidebar-profile-collapse-target') ||
      document.querySelector('#sidebar') ||
      document.querySelector('.pmd-admin-sidebar') ||
      document.querySelector('.pmd-sidebar') ||
      document.querySelector('.sidebar') ||
      document.querySelector('aside');
  }

  function menu() {
    var s = side();
    if (!s) return document.querySelector('#side-nav-menu') || document.querySelector('.side-nav-menu') || document.querySelector('.sidebar-menu') || document.querySelector('.nav-sidebar');
    return s.querySelector('#side-nav-menu, .side-nav-menu, .sidebar-menu, .nav-sidebar, .pmd-sidebar-menu, .sidebar-nav, ul.nav, nav ul');
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

  function txt(el){ return String((el && el.textContent) || '').replace(/\s+/g,' ').trim().toLowerCase(); }

  function hrefFor(name, fallback) {
    var m = menu();
    if (!m) return fallback;
    var links = Array.prototype.slice.call(m.querySelectorAll('a[href]'));
    for (var i=0;i<links.length;i++) {
      var hay = txt(links[i]) + ' ' + String(links[i].getAttribute('href') || '').toLowerCase();
      if (hay.indexOf(name) !== -1) return links[i].getAttribute('href');
    }
    return fallback;
  }

  function currentKey() {
    var p = location.pathname.toLowerCase();
    if (p.indexOf('orders') !== -1) return 'orders';
    if (p.indexOf('reservations') !== -1) return 'reservations';
    if (p.indexOf('restaurant') !== -1 || p.indexOf('tables') !== -1 || p.indexOf('menus') !== -1) return 'restaurant';
    if (p.indexOf('design') !== -1) return 'design';
    if (p.indexOf('system') !== -1 || p.indexOf('settings') !== -1) return 'system';
    return 'dashboard';
  }

  function logoIndex() {
    var keys = ['pmdAdminPlatformLogoCandidateV38','pmdAdminPlatformLogoCandidateV37','pmdAdminPlatformLogoCandidateV25'];
    for (var i=0;i<keys.length;i++) {
      var n = parseInt(localStorage.getItem(keys[i]), 10);
      if (!isNaN(n) && n >= 0 && n < 6) return n;
    }
    return 0;
  }

  function logoUrl() {
    return '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-' + (logoIndex() + 1) + '.png?v=' + Date.now();
  }

  function findLogoutHref() {
    var s = side() || document;
    var links = Array.prototype.slice.call(s.querySelectorAll('a[href]'));
    for (var i=0;i<links.length;i++) {
      var hay = txt(links[i]) + ' ' + String(links[i].getAttribute('href') || '').toLowerCase() + ' ' + String(links[i].className || '').toLowerCase();
      if (hay.indexOf('logout') !== -1 || hay.indexOf('signout') !== -1 || links[i].querySelector('.fa-power-off')) return links[i].getAttribute('href');
    }
    return '#';
  }

  function cleanupOld() {
    document.querySelectorAll(
      '.pmd-collapsed-rail-v45,.pmd-collapsed-rail-v46,.pmd-collapsed-rail-v47,' +
      '.pmd-collapsed-logo-v47,.pmd-collapsed-power-v45,.pmd-collapsed-power-v46,.pmd-collapsed-power-v47,' +
      '#pmd-sidebar-edge-toggle-v40,#pmd-sidebar-edge-toggle-v41,#pmd-sidebar-edge-toggle-v42,#pmd-sidebar-edge-toggle-v43,#pmd-sidebar-edge-toggle-v44,#pmd-sidebar-edge-toggle-v45,#pmd-sidebar-edge-toggle-v46,#pmd-sidebar-edge-toggle-v47,#pmd-sidebar-edge-toggle-v48'
    ).forEach(function(el){ el.remove(); });

    document.querySelectorAll('.pmd-v48-power-only,.pmd-v48-hide-profile,.pmd-v48-power-control,.pmd-v47-hide-native,.pmd-v46-hidden-native').forEach(function(el){
      el.classList.remove('pmd-v48-power-only','pmd-v48-hide-profile','pmd-v48-power-control','pmd-v47-hide-native','pmd-v46-hidden-native');
      el.style.display = '';
      el.style.visibility = '';
      el.style.pointerEvents = '';
    });
  }

  function ensureCollapsedUI() {
    var s = side();
    if (!s) return;
    s.classList.add('pmd-v49-sidebar');
    s.style.position = 'relative';
    s.style.overflow = 'visible';

    var logo = s.querySelector('.pmd-collapsed-logo-v49');
    if (!logo) {
      logo = document.createElement('a');
      logo.className = 'pmd-collapsed-logo-v49';
      logo.href = '/admin/dashboard';
      logo.innerHTML = '<img alt="PayMyDine">';
      s.appendChild(logo);
    }
    var img = logo.querySelector('img');
    if (img) img.src = logoUrl();

    var rail = s.querySelector('.pmd-collapsed-rail-v49');
    if (!rail) {
      rail = document.createElement('nav');
      rail.className = 'pmd-collapsed-rail-v49';
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

    var power = s.querySelector('.pmd-collapsed-power-v49');
    if (!power) {
      power = document.createElement('a');
      power.className = 'pmd-collapsed-power-v49';
      power.href = findLogoutHref();
      power.title = 'Logout';
      power.innerHTML = iconSvg('power');
      s.appendChild(power);
    }
  }

  function applyCollapsed() {
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v49');
    if (document.body) document.body.classList.add('pmd-sidebar-collapsed','pmd-sidebar-icons-only');
  }

  function removeCollapsed() {
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v49');
    if (document.body) document.body.classList.remove('pmd-sidebar-collapsed','pmd-sidebar-icons-only');
  }

  function ensureButton() {
    var btn = document.getElementById('pmd-sidebar-edge-toggle-v49');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'pmd-sidebar-edge-toggle-v49';
      btn.setAttribute('aria-label','Toggle sidebar');
      btn.innerHTML = chevronSvg();
      document.body.appendChild(btn);

      btn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();

        var next = !isCollapsed();
        setWanted(next);
        if (next) applyCollapsed();
        else removeCollapsed();

        [30,100,220].forEach(function(ms){ setTimeout(applyAll, ms); });
        return false;
      }, true);
    }
    btn.innerHTML = chevronSvg();
    return btn;
  }

  function firstItem() {
    var rail = document.querySelector('.pmd-collapsed-rail-v49 a');
    if (isCollapsed() && rail) return rail;
    var m = menu();
    if (!m) return null;
    var items = Array.prototype.slice.call(m.children || []);
    for (var i=0;i<items.length;i++) {
      var it = items[i];
      if (it.classList.contains('pmd-logo-cycle-nav-item-v38')) continue;
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
      var r = s.getBoundingClientRect();
      if (r && r.width > 20) left = Math.round(r.right - 16);
    }

    var item = firstItem();
    if (item) {
      var ir = item.getBoundingClientRect();
      if (ir && ir.top > 20) top = Math.round(ir.top - 46);
    }

    left = Math.max(50, Math.min(left, window.innerWidth - 42));
    top = Math.max(86, Math.min(top, window.innerHeight - 72));

    document.documentElement.style.setProperty('--pmd-sidebar-edge-left-v49', left + 'px');
    document.documentElement.style.setProperty('--pmd-sidebar-edge-top-v49', top + 'px');

    btn.innerHTML = chevronSvg();
    btn.setAttribute('aria-expanded', isCollapsed() ? 'false' : 'true');
    btn.setAttribute('title', isCollapsed() ? 'Open sidebar' : 'Close sidebar');
  }

  function persistLinks() {
    document.querySelectorAll('#side-nav-menu a[href], .side-nav-menu a[href], .sidebar-menu a[href], .nav-sidebar a[href], .pmd-collapsed-rail-v49 a[href]').forEach(function(a){
      if (a.getAttribute('data-pmd-sidebar-persist-v49')) return;
      a.setAttribute('data-pmd-sidebar-persist-v49','1');
      a.addEventListener('click', function(){ setWanted(isCollapsed()); }, true);
    });
  }

  function applyAll() {
    cleanupOld();
    ensureCollapsedUI();
    if (wantedCollapsed()) applyCollapsed();
    ensureButton();
    persistLinks();
    positionButton();
  }

  if (wantedCollapsed()) {
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v49');
  }

  ready(function(){
    OLD.forEach(function(k){ localStorage.setItem(k, '0'); });
    applyAll();
    [80,220,500,900,1600,2600].forEach(function(ms){ setTimeout(applyAll, ms); });
    window.addEventListener('resize', positionButton, {passive:true});
    document.addEventListener('click', function(){ setTimeout(applyAll,120); }, true);

    window.PMDSidebarCollapsedNativeV49 = {
      apply: applyAll,
      position: positionButton,
      setCollapsed: function(v){ setWanted(!!v); if(v) applyCollapsed(); else removeCollapsed(); applyAll(); },
      isCollapsed: isCollapsed
    };
  });
})();
