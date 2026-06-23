(function () {
  'use strict';

  var ctx = window.PMD_ROLE_DASHBOARD_CONTEXT_V72 || window.PMD_ROLE_DASHBOARD_CONTEXT_V73 || {};
  var username = String(ctx.username || '').toLowerCase();
  var roleCode = String(ctx.role_code || '').toLowerCase();
  var roleName = String(ctx.role_name || '').toLowerCase();
  var isKds = username === 'kds' || roleCode === 'kds' || roleName === 'kds' || roleName.indexOf('kitchen') !== -1;
  var path = (window.location.pathname || '').replace(/\/+$/, '') || '/';
  var isDashboard = path === '/admin' || path === '/admin/dashboard';
  var isActive = isKds && isDashboard;

  function addClasses() {
    if (!isActive) return;
    document.documentElement.classList.add('pmd-kds-server-fast-v82', 'pmd-no-sidebar-role-v73', 'pmd-kds-only-role-v73');
    document.documentElement.classList.remove('pmd-kds-stable-fast-v81', 'pmd-kds-fast-boot-v79', 'pmd-kds-dashboard-is-embedded-v75');
    if (document.body) {
      document.body.classList.add('pmd-kds-server-fast-v82', 'pmd-no-sidebar-role-v73', 'pmd-kds-only-role-v73');
      document.body.classList.remove('pmd-kds-stable-fast-v81', 'pmd-kds-fast-boot-v79', 'pmd-kds-dashboard-is-embedded-v75');
    }
  }

  function removeOldHosts() {
    if (!isActive) return;
    document.querySelectorAll('.pmd-kds-stable-host-v81,.pmd-kds-dashboard-host-v76,.pmd-kds-dashboard-host-v75').forEach(function (el) {
      if (!el.classList.contains('pmd-kds-server-host-v82')) {
        try { el.remove(); } catch (e) { el.style.display = 'none'; }
      }
    });
  }

  function markLoaded() {
    document.documentElement.classList.add('pmd-kds-server-loaded-v82');
    if (document.body) document.body.classList.add('pmd-kds-server-loaded-v82');
  }

  function bindFrame() {
    if (!isActive) return;
    addClasses();
    removeOldHosts();
    var frame = document.querySelector('.pmd-kds-server-iframe-v82');
    if (frame && !frame.__pmdKdsV82Bound) {
      frame.__pmdKdsV82Bound = true;
      frame.addEventListener('load', function () {
        markLoaded();
        try {
          var doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
          if (doc && !doc.getElementById('pmd-kds-inner-v82-style')) {
            var st = doc.createElement('style');
            st.id = 'pmd-kds-inner-v82-style';
            st.textContent = 'html,body{margin:0!important;background:#fff!important}.kds-container{padding:18px!important}.kds-header{margin-top:0!important}';
            (doc.head || doc.documentElement).appendChild(st);
          }
        } catch (e) {}
      });
    }
  }

  // If a leftover dashboard script still asks for widgets/API, return a tiny no-op response.
  function fakeThenable(response) {
    var api = {
      done: function (fn) { if (typeof fn === 'function') setTimeout(function () { fn(response, 'success', api); }, 0); return api; },
      fail: function () { return api; },
      always: function (fn) { if (typeof fn === 'function') setTimeout(function () { fn(response, 'success', api); }, 0); return api; },
      abort: function () { return api; },
      status: 204,
      statusText: 'PMD KDS v82 skipped'
    };
    return api;
  }

  function patchJQuery($) {
    if (!isActive || !$ || $.__pmdKdsServerFastV82) return;
    $.__pmdKdsServerFastV82 = true;
    if (typeof $.request === 'function') {
      var originalRequest = $.request;
      $.request = function (handler, options) {
        var s = String(handler || '') + ' ' + String((options && options.handler) || '') + ' ' + String((options && options.url) || '');
        if (/dashboardContainer::onRenderWidgets|onRenderWidgets|dashboardcontainer/i.test(s)) {
          var response = {'#dashboardcontainer-container': '<div data-pmd-kds-dashboard-skipped-v82="1"></div>'};
          console.log('⏭️ PMD KDS v82: blocked leftover DashboardContainer widget request');
          if (options && typeof options.success === 'function') setTimeout(function () { options.success(response, 'success', fakeThenable(response)); }, 0);
          if (options && typeof options.complete === 'function') setTimeout(function () { options.complete(fakeThenable(response), 'success'); }, 0);
          return fakeThenable(response);
        }
        return originalRequest.apply(this, arguments);
      };
    }
  }

  function patchFetch() {
    if (!isActive || !window.fetch || window.__pmdKdsServerFastV82Fetch) return;
    window.__pmdKdsServerFastV82Fetch = true;
    var originalFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (/\/admin\/pmd-dashboard-data-v3(?:\?|$)/.test(url)) {
          console.log('⏭️ PMD KDS v82: blocked leftover normal dashboard real API request');
          return Promise.resolve(new Response(JSON.stringify({ok:false, skipped:'kds-v82'}), {status: 200, headers: {'Content-Type':'application/json'}}));
        }
      } catch (e) {}
      return originalFetch.apply(this, arguments);
    };
  }

  window.PMDKdsServerFastV82 = {
    active: isActive,
    context: ctx,
    mounted: function () { return !!document.querySelector('.pmd-kds-server-iframe-v82'); },
    loaded: function () { return document.documentElement.classList.contains('pmd-kds-server-loaded-v82'); }
  };

  if (!isActive) return;
  window.PMD_KDS_DASHBOARD_BYPASS_V82 = true;
  addClasses();
  patchFetch();

  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    addClasses();
    bindFrame();
    patchJQuery(window.jQuery || window.$);
    if (tries > 80 || (document.querySelector('.pmd-kds-server-iframe-v82') && (window.jQuery || window.$))) clearInterval(timer);
  }, 25);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindFrame, {once: true});
  } else {
    bindFrame();
  }
})();
