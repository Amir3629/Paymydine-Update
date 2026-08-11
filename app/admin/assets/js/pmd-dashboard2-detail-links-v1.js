(function () {
  'use strict';

  var path = String(window.location.pathname || '').replace(/\/+$/, '');
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

  var expected = Object.keys(map).length;
  var observer = null;

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

  function directInteractiveChildren(node) {
    if (!node) return [];
    return Array.from(node.children || []).filter(function (child) {
      return child.matches &&
        child.matches('button, a, [role="button"]') &&
        !child.classList.contains('pmd-dashboard2-detail-link');
    });
  }

  function normalizedText(node) {
    return String(node && node.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function toolbarHost(header) {
    if (!header) return null;

    var knownLabels = {
      line: true,
      bar: true,
      day: true,
      today: true,
      week: true,
      month: true,
      '30 days': true,
      'last 30 days': true
    };

    var candidates = Array.from(
      header.querySelectorAll('div, nav, span, section')
    ).map(function (node) {
      var controls = directInteractiveChildren(node);
      if (controls.length < 2 || controls.length > 7) return null;

      var known = controls.filter(function (control) {
        return !!knownLabels[normalizedText(control)];
      }).length;

      /*
       * Dashboard2's compact chart/period toolbars are the only header groups
       * with two or more direct button-like children. Known labels make the
       * detection deterministic while the direct-child rule avoids wrappers.
       */
      if (known < 2) return null;

      return {
        node: node,
        controls: controls,
        known: known
      };
    }).filter(Boolean);

    candidates.sort(function (a, b) {
      if (b.known !== a.known) return b.known - a.known;
      return a.controls.length - b.controls.length;
    });

    return candidates.length ? candidates[0].node : null;
  }

  function clearIntegratedInlineStyle(link) {
    if (!link) return;
    [
      'position', 'top', 'right', 'bottom', 'left', 'z-index',
      'width', 'min-width', 'max-width',
      'height', 'min-height', 'max-height',
      'margin', 'padding', 'border', 'border-radius',
      'background', 'box-shadow', 'transform', 'align-self', 'justify-self'
    ].forEach(function (name) {
      link.style.removeProperty(name);
    });
  }

  function styleAsToolbarMember(link, toolbar) {
    if (!link || !toolbar) return;

    link.dataset.pmdDetailLinkHost = 'toolbar';

    var peer = directInteractiveChildren(toolbar)[0] || null;
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
    important('width', 'auto');
    important('min-width', '0');
    important('max-width', 'none');
    important('height', peerStyle && peerStyle.height !== 'auto' ? peerStyle.height : '30px');
    important('min-height', peerStyle && peerStyle.minHeight !== '0px' ? peerStyle.minHeight : '30px');
    important('max-height', peerStyle && peerStyle.height !== 'auto' ? peerStyle.height : '30px');
    important('margin', '0');
    important('padding', peerStyle ? peerStyle.padding : '0 10px');
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
  }

  function styleAsStandalone(link) {
    if (!link) return;
    delete link.dataset.pmdDetailLinkHost;
    clearIntegratedInlineStyle(link);
  }

  /*
   * PMD_DASHBOARD2_DETAIL_TOOLBAR_MEMBER_V1
   *
   * If a card already owns a compact Line/Bar or Day/Week/Month toolbar,
   * Details becomes the final member of that same toolbar. This prevents the
   * report link from sitting below/behind existing controls and preserves one
   * visual control authority per card.
   *
   * Cards without an existing toolbar keep the small standalone Details link
   * in the stable card header.
   */
  function installOne(root, widget) {
    var card = root.querySelector('[data-pmd-analytics-widget="' + widget + '"]');
    if (!card) return false;

    var header = detailHost(card);
    if (!header) return false;

    var toolbar = toolbarHost(header);
    var host = toolbar || header;
    var existing = card.querySelector('.pmd-dashboard2-detail-link[data-pmd-report-widget="' + widget + '"]');
    var link = existing || makeLink(widget);

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

    return root.querySelectorAll('.pmd-dashboard2-detail-link').length;
  }

  function schedule() {
    [0, 50, 150, 350, 700, 1200, 2000, 3200, 4500].forEach(function (delay) {
      window.setTimeout(install, delay);
    });
  }

  install();
  schedule();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, {once: true});
  }

  window.addEventListener('load', schedule, {once: true});

  /*
   * Do not disconnect merely because all 12 links exist: Dashboard2 hydrates
   * some compact toolbars after first paint. Keeping the observer for the
   * bounded 6-second settling window lets existing links migrate into the
   * real toolbar when that toolbar appears.
   */
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
  }, 6000);

  window.PMDDashboard2DetailLinksV1 = {
    version: '1.3.0-toolbar-member',
    install: install,
    routes: map,
    audit: function () {
      var root = document.getElementById('pmd-dashboard2-analytics-v1');
      var links = root ? Array.from(root.querySelectorAll('.pmd-dashboard2-detail-link')) : [];
      var badDirectChildren = links.filter(function (link) {
        return !!(link.parentElement && link.parentElement.matches('[data-pmd-analytics-widget]'));
      }).length;

      var toolbarCards = 0;
      var toolbarIntegrated = 0;
      var standaloneHeaderHosted = 0;

      Object.keys(map).forEach(function (widget) {
        if (!root) return;
        var card = root.querySelector('[data-pmd-analytics-widget="' + widget + '"]');
        if (!card) return;
        var header = detailHost(card);
        var toolbar = toolbarHost(header);
        var link = card.querySelector('.pmd-dashboard2-detail-link[data-pmd-report-widget="' + widget + '"]');

        if (toolbar) {
          toolbarCards++;
          if (link && link.parentElement === toolbar) toolbarIntegrated++;
        } else if (link && link.parentElement === header) {
          standaloneHeaderHosted++;
        }
      });

      return {
        version: '1.3.0-toolbar-member',
        path: path,
        root: !!root,
        expected: expected,
        found: links.length,
        toolbarCards: toolbarCards,
        toolbarIntegrated: toolbarIntegrated,
        standaloneHeaderHosted: standaloneHeaderHosted,
        badDirectChildren: badDirectChildren,
        ok: links.length === expected &&
          badDirectChildren === 0 &&
          toolbarIntegrated === toolbarCards &&
          (toolbarIntegrated + standaloneHeaderHosted) === expected
      };
    }
  };

  console.info('[PMD Dashboard2 Detail Links V1.3] active', window.PMDDashboard2DetailLinksV1.audit());
})();
