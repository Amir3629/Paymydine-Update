(function () {
  'use strict';

  if (String(window.location.pathname || '') !== '/admin/reservations2') return;

  var DESKTOP_GAP = 14;
  var MOBILE_GAP = 10;
  var MOBILE_BREAKPOINT = 820;
  var resizeTimer = 0;

  function setImportant(element, property, value) {
    if (!element) return;
    element.style.setProperty(property, value, 'important');
  }

  function all(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function getElements() {
    return {
      menu: document.querySelector('#pmd-side-menu2'),
      root: document.querySelector('#pmd-reservations2'),
      wrapper: document.querySelector('.page-wrapper'),
      content: document.querySelector('.page-content'),
      topbar: document.querySelector('.navbar-top, .navbar-fixed-top'),
      kpis: document.querySelector('#pmd-reservations2 .pmd-r2__kpis'),
      workspace: document.querySelector('#pmd-reservations2 .pmd-r2__workspace')
    };
  }

  function resetOuterTopOffsets() {
    all([
      '.app-container',
      '.layout',
      '.layout-wrapper',
      '.main-content',
      '.page-wrapper',
      '.page-content',
      '.content-wrapper',
      '.container',
      '.container-fluid'
    ].join(',')).forEach(function (element) {
      setImportant(element, 'top', '0px');
      setImportant(element, 'margin-top', '0px');
      setImportant(element, 'padding-top', '0px');
      setImportant(element, 'transform', 'none');
      setImportant(element, 'box-sizing', 'border-box');
    });
  }

  function applyMobile(elements) {
    var root = elements.root;
    var wrapper = elements.wrapper;
    var content = elements.content;

    resetOuterTopOffsets();

    setImportant(document.documentElement, 'scrollbar-gutter', 'stable');
    setImportant(document.body, 'margin', '0px');
    setImportant(document.body, 'padding', '0px');
    setImportant(document.body, 'width', '100%');
    setImportant(document.body, 'max-width', '100%');
    setImportant(document.body, 'overflow-x', 'hidden');

    [wrapper, content].forEach(function (element) {
      setImportant(element, 'position', 'relative');
      setImportant(element, 'inset', 'auto');
      setImportant(element, 'left', '0px');
      setImportant(element, 'right', 'auto');
      setImportant(element, 'width', '100%');
      setImportant(element, 'max-width', '100%');
      setImportant(element, 'min-width', '0px');
      setImportant(element, 'margin', '0px');
      setImportant(element, 'padding', '0px');
      setImportant(element, 'overflow-x', 'hidden');
      setImportant(element, 'transform', 'none');
    });

    setImportant(root, 'position', 'relative');
    setImportant(root, 'top', '0px');
    setImportant(root, 'left', '0px');
    setImportant(root, 'right', 'auto');
    setImportant(root, 'width', '100%');
    setImportant(root, 'max-width', '100%');
    setImportant(root, 'min-width', '0px');
    setImportant(root, 'margin', '0px');
    setImportant(root, 'padding-top', MOBILE_GAP + 'px');
    setImportant(root, 'padding-right', MOBILE_GAP + 'px');
    setImportant(root, 'padding-bottom', MOBILE_GAP + 'px');
    setImportant(root, 'padding-left', MOBILE_GAP + 'px');
    setImportant(root, 'box-sizing', 'border-box');
    setImportant(root, 'transform', 'none');
    setImportant(root, 'transition', 'none');
    setImportant(root, 'overflow-x', 'hidden');

    if (elements.kpis) {
      setImportant(elements.kpis, 'gap', MOBILE_GAP + 'px');
      setImportant(elements.kpis, 'margin-bottom', MOBILE_GAP + 'px');
    }

    if (elements.workspace) {
      setImportant(elements.workspace, 'gap', MOBILE_GAP + 'px');
    }

    if (elements.topbar) {
      setImportant(elements.topbar, 'display', 'none');
      setImportant(elements.topbar, 'height', '0px');
    }

    return {
      mode: 'mobile',
      gap: MOBILE_GAP,
      menuRight: 0,
      rootLeft: Math.round(root.getBoundingClientRect().left),
      rootTop: Math.round(root.getBoundingClientRect().top)
    };
  }

  function applyDesktop(elements) {
    var menu = elements.menu;
    var root = elements.root;
    var wrapper = elements.wrapper;
    var content = elements.content;
    var menuRect = menu.getBoundingClientRect();
    var rootLeft = Math.max(0, Math.round(menuRect.right));
    var topbarLeft = rootLeft + DESKTOP_GAP;

    [document.body, wrapper, content].forEach(function (element) {
      setImportant(element, 'margin-left', '0px');
      setImportant(element, 'margin-right', '0px');
      setImportant(element, 'padding-left', '0px');
      setImportant(element, 'padding-right', '0px');
      setImportant(element, 'max-width', 'none');
      setImportant(element, 'transform', 'none');
      setImportant(element, 'box-sizing', 'border-box');
    });

    setImportant(wrapper, 'position', 'absolute');
    setImportant(wrapper, 'top', '0px');
    setImportant(wrapper, 'left', '0px');
    setImportant(wrapper, 'right', 'auto');
    setImportant(wrapper, 'width', '100vw');
    setImportant(wrapper, 'min-width', '0px');
    setImportant(wrapper, 'overflow-x', 'hidden');

    setImportant(content, 'position', 'relative');
    setImportant(content, 'top', '0px');
    setImportant(content, 'left', '0px');
    setImportant(content, 'right', 'auto');
    setImportant(content, 'width', '100vw');
    setImportant(content, 'min-width', '0px');
    setImportant(content, 'overflow-x', 'hidden');

    setImportant(root, 'position', 'relative');
    setImportant(root, 'top', '0px');
    setImportant(root, 'left', '0px');
    setImportant(root, 'right', 'auto');
    setImportant(root, 'margin-left', rootLeft + 'px');
    setImportant(root, 'margin-right', '0px');
    setImportant(root, 'margin-top', '0px');
    setImportant(root, 'padding-left', DESKTOP_GAP + 'px');
    setImportant(root, 'padding-right', DESKTOP_GAP + 'px');
    setImportant(root, 'width', 'calc(100vw - ' + rootLeft + 'px)');
    setImportant(root, 'max-width', 'none');
    setImportant(root, 'min-width', '0px');
    setImportant(root, 'box-sizing', 'border-box');
    setImportant(root, 'transition', 'margin-left 220ms cubic-bezier(.22,.75,.24,1), width 220ms cubic-bezier(.22,.75,.24,1)');

    if (elements.kpis) {
      setImportant(elements.kpis, 'gap', DESKTOP_GAP + 'px');
      setImportant(elements.kpis, 'margin-bottom', DESKTOP_GAP + 'px');
    }

    if (elements.workspace) {
      setImportant(elements.workspace, 'gap', DESKTOP_GAP + 'px');
    }

    if (elements.topbar) {
      setImportant(elements.topbar, 'left', topbarLeft + 'px');
      setImportant(elements.topbar, 'right', '0px');
      setImportant(elements.topbar, 'margin-left', '0px');
      setImportant(elements.topbar, 'width', 'calc(100vw - ' + topbarLeft + 'px)');
      setImportant(elements.topbar, 'max-width', 'none');
    }

    return {
      mode: 'desktop',
      gap: DESKTOP_GAP,
      menuRight: rootLeft,
      rootTop: Math.round(root.getBoundingClientRect().top)
    };
  }

  function apply() {
    var elements = getElements();
    if (!elements.menu || !elements.root || !elements.wrapper || !elements.content) return null;

    if (window.innerWidth <= MOBILE_BREAKPOINT) return applyMobile(elements);
    return applyDesktop(elements);
  }

  function scheduleApply(delay) {
    window.setTimeout(apply, delay || 0);
  }

  function initialize() {
    apply();
    scheduleApply(0);
    scheduleApply(50);
    scheduleApply(150);
    scheduleApply(350);
    scheduleApply(700);

    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(apply, 50);
    }, { passive: true });

    window.addEventListener('load', function () {
      apply();
      scheduleApply(100);
      scheduleApply(400);
    }, { once: true });
  }

  var observer = new MutationObserver(function (mutations) {
    var relevant = mutations.some(function (mutation) {
      return mutation.type === 'attributes' && mutation.target === document.documentElement;
    });
    if (relevant) apply();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  window.PMDReservations2ExactLayoutV2 = {
    version: '2.0.0',
    desktopGap: DESKTOP_GAP,
    mobileGap: MOBILE_GAP,
    mobileBreakpoint: MOBILE_BREAKPOINT,
    apply: apply,
    observer: observer
  };

  window.PMDReservations2ExactLayoutV1 = window.PMDReservations2ExactLayoutV2;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  console.info('[PMD Reservations2 Exact Layout V2] Ready', window.PMDReservations2ExactLayoutV2);
})();