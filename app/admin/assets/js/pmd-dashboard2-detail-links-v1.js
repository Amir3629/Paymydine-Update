(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
  if (path !== '/admin/dashboard2') return;

  var map = {
    salesOverTime: '/admin/pmdreports/sales',
    salesByHour: '/admin/pmdreports/hourly',
    categorySales: '/admin/pmdreports/categories',
    paymentMethods: '/admin/pmdreports/payments',
    recentTransactions: '/admin/pmdreports/transactions',
    alerts: '/admin/pmdreports/alerts',
    liveOperations: '/admin/pmdreports/liveorders',
    channelSplit: '/admin/pmdreportchannels',
    topItems: '/admin/pmdreports/topitems',
    tips: '/admin/pmdreporttips',
    reviews: '/admin/pmdreports/reviews',
    calendarEvents: '/admin/pmdreports/reservations'
  };

  var exactToolbarSelectors = {
    salesOverTime: '.pmd-dashboard2-chart-toggle',
    categorySales: ':scope > .pmd-dashboard2-donut-period-v1395',
    paymentMethods: ':scope > .pmd-dashboard2-donut-period-v1395',
    channelSplit: '.pmd-bestellkanaele-clean-v2__periods',
    topItems: ':scope > .pmd-dashboard2-donut-period-v1395[data-pmd-top-items-period-v1]'
  };

  var expectedToolbarWidgets = Object.keys(exactToolbarSelectors);
  var expected = Object.keys(map).length;
  var observer = null;
  var startedAt = Date.now();
  var settleMs = 6500;

  function makeLink(widget) {
    var link = document.createElement('a');
    link.className = 'pmd-dashboard2-detail-link';
    link.href = map[widget];
    link.dataset.pmdReportWidget = widget;
    link.setAttribute('aria-label', 'Open detailed ' + widget + ' report');
    link.title = 'Open detailed report';
    link.innerHTML = '<span>Details</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"></path><path d="M8 7h9v9"></path></svg>';
    return link;
  }

  function detailHost(card) {
    if (!card) return null;
    return card.querySelector(':scope > header') || card.querySelector('header');
  }

  function interactiveChildren(node) {
    if (!node) return [];
    return Array.from(node.children || []).filter(function (child) {
      return child.matches &&
        child.matches('button, a, [role="button"]') &&
        !child.classList.contains('pmd-dashboard2-detail-link');
    });
  }

  function interactiveDescendants(node) {
    if (!node) return [];
    return Array.from(node.querySelectorAll('button, a, [role="button"]')).filter(function (child) {
      return !child.classList.contains('pmd-dashboard2-detail-link');
    });
  }

  function exactToolbar(card, header, widget) {
    var selector = exactToolbarSelectors[widget];
    if (!selector || !card) return null;

    var scope = selector.indexOf(':scope') === 0 ? card : (header || card);
    try {
      var found = scope.querySelector(selector);
      if (found && interactiveDescendants(found).length >= 2) return found;
    } catch (error) {}

    return null;
  }

  function genericToolbar(card, header) {
    if (!card || !header) return null;

    var candidates = [];
    [
      header,
      card
    ].forEach(function (scope) {
      Array.from(scope.querySelectorAll('[role="group"], [role="toolbar"], div, nav')).forEach(function (node) {
        if (node.classList.contains('pmd-dashboard2-detail-link')) return;
        var controls = interactiveChildren(node);
        if (controls.length < 2 || controls.length > 6) return;

        var signals = controls.filter(function (control) {
          return control.matches(
            '[data-pmd-chart-mode], ' +
            '[data-pmd-donut-period], ' +
            '[data-pmd-bestell-period], ' +
            '[data-pmd-top-items-period]'
          );
        }).length;

        if (signals < 2) return;

        candidates.push({
          node: node,
          signals: signals,
          controls: controls.length,
          depth: node.closest('header') ? 0 : 1
        });
      });
    });

    candidates.sort(function (a, b) {
      if (a.depth !== b.depth) return a.depth - b.depth;
      if (b.signals !== a.signals) return b.signals - a.signals;
      return a.controls - b.controls;
    });

    return candidates.length ? candidates[0].node : null;
  }

  function toolbarHost(card, header, widget) {
    return exactToolbar(card, header, widget) || genericToolbar(card, header);
  }

  function clearIntegratedInlineStyle(link) {
    if (!link) return;
    [
      'position', 'top', 'right', 'bottom', 'left', 'z-index',
      'width', 'min-width', 'max-width',
      'height', 'min-height', 'max-height',
      'margin', 'padding', 'border', 'border-radius',
      'background', 'box-shadow', 'transform', 'align-self', 'justify-self',
      'grid-column', 'grid-row'
    ].forEach(function (name) {
      link.style.removeProperty(name);
    });
  }

  function styleAsToolbarMember(link, toolbar) {
    if (!link || !toolbar) return;

    link.dataset.pmdDetailLinkHost = 'toolbar';
    toolbar.dataset.pmdDetailToolbar = '1';

    var peer = interactiveChildren(toolbar)[0] || null;
    var peerStyle = peer ? window.getComputedStyle(peer) : null;

    function important(name, value) {
      link.style.setProperty(name, value, 'important');
    }

    important('position', 'static');
    important('top', 'auto');
    important('right', 'auto');
    important('bottom', 'auto');
    important('left', 'auto');
    important('z-index', 'auto');
    important('flex', '0 0 auto');
    important('grid-column', 'auto');
    important('grid-row', 'auto');
    important('width', 'auto');
    important('min-width', '0');
    important('max-width', 'none');
    important('height', peerStyle && peerStyle.height !== 'auto' ? peerStyle.height : '30px');
    important('min-height', peerStyle && peerStyle.minHeight !== '0px' ? peerStyle.minHeight : '30px');
    important('max-height', peerStyle && peerStyle.height !== 'auto' ? peerStyle.height : '30px');
    important('margin', '0');
    important('padding', peerStyle ? peerStyle.padding : '0 9px');
    important('border', '0');
    important('border-radius', peerStyle ? peerStyle.borderRadius : '7px');
    important('background', 'transparent');
    important('box-shadow', 'none');
    important('color', '#0a6b56');
    important('font-size', peerStyle ? peerStyle.fontSize : '10px');
    important('font-weight', peerStyle ? peerStyle.fontWeight : '800');
    important('line-height', peerStyle ? peerStyle.lineHeight : '1');
    important('transform', 'none');
    important('align-self', 'stretch');
    important('justify-self', 'auto');

    toolbar.style.setProperty('overflow', 'visible', 'important');
    toolbar.style.setProperty('white-space', 'nowrap', 'important');

    if (toolbar.classList.contains('pmd-dashboard2-chart-toggle')) {
      toolbar.style.setProperty('grid-template-columns', 'repeat(3, max-content)', 'important');
      toolbar.style.setProperty('grid-auto-flow', 'column', 'important');
      toolbar.style.setProperty('grid-auto-columns', 'max-content', 'important');
    }
  }

  function styleAsStandalone(link) {
    if (!link) return;
    link.dataset.pmdDetailLinkHost = 'header';
    clearIntegratedInlineStyle(link);
  }

  /*
   * PMD_DASHBOARD2_DETAIL_TOOLBAR_OWNER_V2
   *
   * Dashboard2 has five cards with real compact control groups:
   * - Sales over time: server-rendered Line / Bar toolbar
   * - Sales by category: late-mounted Day / Week / Month control
   * - Payment methods: late-mounted Day / Week / Month control
   * - Order channels: server-rendered period control
   * - Top-selling items: late-mounted period control
   *
   * Details must become the final member of those exact controls. The other
   * seven cards keep one small standalone Details control in their header.
   */
  function installOne(root, widget) {
    var card = root.querySelector('[data-pmd-analytics-widget="' + widget + '"]');
    if (!card) return false;

    var header = detailHost(card);
    if (!header) return false;

    var toolbar = toolbarHost(card, header, widget);
    var expectsToolbar = expectedToolbarWidgets.indexOf(widget) !== -1;
    var existing = card.querySelector('.pmd-dashboard2-detail-link[data-pmd-report-widget="' + widget + '"]');

    /*
     * Do not create a temporary standalone link on cards whose real toolbar is
     * known to hydrate a little later. This removes the visible overlap/jump.
     */
    if (expectsToolbar && !toolbar && (Date.now() - startedAt) < settleMs) {
      if (existing) existing.hidden = true;
      return false;
    }

    var host = toolbar || header;
    var link = existing || makeLink(widget);
    link.hidden = false;
    link.href = map[widget];

    if (link.parentElement !== host) {
      host.appendChild(link);
    }

    if (toolbar) {
      header.dataset.pmdDetailLinkHost = 'toolbar';
      styleAsToolbarMember(link, toolbar);
    } else {
      header.dataset.pmdDetailLinkHost = 'header';
      styleAsStandalone(link);
    }

    return true;
  }

  function install() {
    var root = document.getElementById('pmd-dashboard2-analytics-v1');
    if (!root) return 0;

    Object.keys(map).forEach(function (widget) {
      installOne(root, widget);
    });

    return root.querySelectorAll('.pmd-dashboard2-detail-link:not([hidden])').length;
  }

  function schedule() {
    [0, 50, 150, 350, 700, 1200, 2000, 3200, 4500, 6500].forEach(function (delay) {
      window.setTimeout(install, delay);
    });
  }

  install();
  schedule();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, {once: true});
  }

  window.addEventListener('load', schedule, {once: true});

  observer = new MutationObserver(function () {
    install();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.setTimeout(function () {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    install();
  }, settleMs + 250);

  window.PMDDashboard2DetailLinksV1 = {
    version: '1.4.0-exact-toolbar-owner',
    install: install,
    routes: map,
    audit: function () {
      var root = document.getElementById('pmd-dashboard2-analytics-v1');
      var links = root ? Array.from(root.querySelectorAll('.pmd-dashboard2-detail-link:not([hidden])')) : [];
      var badDirectChildren = links.filter(function (link) {
        return !!(link.parentElement && link.parentElement.matches('[data-pmd-analytics-widget]'));
      }).length;

      var toolbarCards = 0;
      var toolbarIntegrated = 0;
      var standaloneHeaderHosted = 0;
      var missingExpectedToolbars = [];

      Object.keys(map).forEach(function (widget) {
        if (!root) return;
        var card = root.querySelector('[data-pmd-analytics-widget="' + widget + '"]');
        if (!card) return;
        var header = detailHost(card);
        var toolbar = toolbarHost(card, header, widget);
        var link = card.querySelector('.pmd-dashboard2-detail-link[data-pmd-report-widget="' + widget + '"]:not([hidden])');
        var expectsToolbar = expectedToolbarWidgets.indexOf(widget) !== -1;

        if (expectsToolbar && !toolbar) missingExpectedToolbars.push(widget);

        if (toolbar) {
          toolbarCards++;
          if (link && link.parentElement === toolbar) toolbarIntegrated++;
        } else if (link && link.parentElement === header) {
          standaloneHeaderHosted++;
        }
      });

      return {
        version: '1.4.0-exact-toolbar-owner',
        path: path,
        root: !!root,
        expected: expected,
        found: links.length,
        expectedToolbarCards: expectedToolbarWidgets.length,
        toolbarCards: toolbarCards,
        toolbarIntegrated: toolbarIntegrated,
        standaloneHeaderHosted: standaloneHeaderHosted,
        missingExpectedToolbars: missingExpectedToolbars,
        badDirectChildren: badDirectChildren,
        ok: links.length === expected &&
          badDirectChildren === 0 &&
          missingExpectedToolbars.length === 0 &&
          toolbarCards === expectedToolbarWidgets.length &&
          toolbarIntegrated === expectedToolbarWidgets.length &&
          standaloneHeaderHosted === expected - expectedToolbarWidgets.length
      };
    }
  };

  console.info('[PMD Dashboard2 Detail Links V1.4] active', window.PMDDashboard2DetailLinksV1.audit());
})();
