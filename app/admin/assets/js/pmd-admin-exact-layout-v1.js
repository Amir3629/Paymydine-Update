(function () {
  'use strict';

  var path = String(
    window.location && window.location.pathname || ''
  );

  var excluded =
    path === '/admin/login' ||
    path.indexOf('/admin/dashboardwaiter') === 0 ||
    path.indexOf('/admin/dashboardkitchen') === 0 ||
    path.indexOf('/admin/kds') === 0 ||
    path.indexOf('/admin/quick-mode') === 0 ||
    path.indexOf('/admin/reservations2') === 0;

  if (excluded) return;

  var menu = document.querySelector('#pmd-side-menu2');
  if (!menu) return;

  if (window.PMDAdminExactLayoutV4) {
    window.PMDAdminExactLayoutV4.apply();
    return;
  }

  var DESKTOP_GAP = 14;
  var MOBILE_GAP = 10;
  var SHELL_TRANSITION = [
    'left 220ms cubic-bezier(.22,.75,.24,1)',
    'width 220ms cubic-bezier(.22,.75,.24,1)'
  ].join(', ');

  var frameId = 0;
  var animationUntil = 0;
  var resizeTimer = 0;
  var lastSideMenuState = null;

  function isSettingsSuite() {
    return Boolean(
      document.body &&
      document.body.classList.contains('pmd-settings-suite')
    );
  }

  function isDashboard2() {
    return path.replace(/\/+$/, '') === '/admin/dashboard2';
  }

  function isStaticBootRoute() {
    return isSettingsSuite() || isDashboard2();
  }

  function runtimeTransitionsReady() {
    return document.documentElement.classList.contains(
      'pmd-sm2-runtime-ready'
    );
  }

  function sideMenuState() {
    return document.documentElement.classList.contains(
      'pmd-sm2-expanded'
    ) ? 'expanded' : 'collapsed';
  }

  function setImportant(element, property, value) {
    if (!element) return;

    element.style.setProperty(
      property,
      value,
      'important'
    );
  }

  function elements() {
    return {
      wrapper: document.querySelector('.page-wrapper'),
      content: document.querySelector('.page-content'),
      topbar: document.querySelector('.navbar-top, .navbar-fixed-top')
    };
  }

  function normalizeContentChildren(content) {
    if (!content) return;

    Array.from(content.children).forEach(function (child) {
      setImportant(child, 'box-sizing', 'border-box');
      setImportant(child, 'min-width', '0px');
      setImportant(child, 'max-width', '100%');
    });
  }

  /*
   * PMD_STATIC_SHELL_BOOT_V2
   *
   * Settings and Dashboard2 must paint at their FINAL shell geometry.
   * The old runtime runner applied wrapper left/width after DOMContentLoaded
   * and animated those changes for 220ms, making every card visibly move.
   *
   * Settings keep their own 16px internal rail, so their outer gap is 0.
   * Dashboard2 keeps the existing 14px global rail; only the boot movement
   * is removed. Real user-triggered side-menu expand/collapse still animates.
   */
  function apply(options) {
    options = options || {};

    var page = elements();
    if (!page.wrapper || !page.content) return null;

    var settingsSuite = isSettingsSuite();
    var dashboard2 = isDashboard2();
    var staticBootRoute = settingsSuite || dashboard2;
    var animateShell = Boolean(options.animate);

    var gap = settingsSuite
      ? 0
      : (window.innerWidth <= 767 ? MOBILE_GAP : DESKTOP_GAP);

    var shellTransition =
      staticBootRoute && !animateShell
        ? 'none'
        : SHELL_TRANSITION;

    var menuRect = menu.getBoundingClientRect();
    var menuRight = Math.round(menuRect.right);
    var wrapperWidth = Math.max(0, window.innerWidth - menuRight);

    setImportant(document.body, 'margin-left', '0px');
    setImportant(document.body, 'padding-left', '0px');
    setImportant(document.body, 'overflow-x', 'hidden');

    setImportant(page.wrapper, 'position', 'absolute');
    setImportant(page.wrapper, 'left', menuRight + 'px');
    setImportant(page.wrapper, 'right', 'auto');
    setImportant(page.wrapper, 'margin-left', '0px');
    setImportant(page.wrapper, 'margin-right', '0px');
    setImportant(page.wrapper, 'padding-left', '0px');
    setImportant(page.wrapper, 'padding-right', '0px');
    setImportant(page.wrapper, 'width', wrapperWidth + 'px');
    setImportant(page.wrapper, 'max-width', 'none');
    setImportant(page.wrapper, 'min-width', '0px');
    setImportant(page.wrapper, 'box-sizing', 'border-box');
    setImportant(page.wrapper, 'overflow-x', 'hidden');
    setImportant(page.wrapper, 'z-index', '1');
    setImportant(page.wrapper, 'transform', 'none');
    setImportant(page.wrapper, 'transition', shellTransition);

    setImportant(page.content, 'position', 'relative');
    setImportant(page.content, 'left', '0px');
    setImportant(page.content, 'right', 'auto');
    setImportant(page.content, 'margin-left', '0px');
    setImportant(page.content, 'margin-right', '0px');
    setImportant(page.content, 'padding-left', gap + 'px');
    setImportant(page.content, 'padding-right', gap + 'px');
    setImportant(page.content, 'width', '100%');
    setImportant(page.content, 'max-width', 'none');
    setImportant(page.content, 'min-width', '0px');
    setImportant(page.content, 'box-sizing', 'border-box');
    setImportant(page.content, 'overflow-x', 'hidden');
    setImportant(page.content, 'transform', 'none');
    setImportant(page.content, 'transition', 'none');

    normalizeContentChildren(page.content);

    if (page.topbar) {
      setImportant(page.topbar, 'left', menuRight + 'px');
      setImportant(page.topbar, 'right', '0px');
      setImportant(page.topbar, 'margin-left', '0px');
      setImportant(page.topbar, 'width', wrapperWidth + 'px');
      setImportant(page.topbar, 'max-width', 'none');
      setImportant(page.topbar, 'box-sizing', 'border-box');
      setImportant(page.topbar, 'transition', shellTransition);
    }

    setImportant(menu, 'z-index', '12000');
    setImportant(menu, 'pointer-events', 'auto');

    document.documentElement.style.setProperty(
      '--pmd-admin-gap',
      gap + 'px'
    );

    document.documentElement.style.setProperty(
      '--pmd-admin-menu-right',
      menuRight + 'px'
    );

    return {
      gap: gap,
      menuRight: menuRight,
      settingsSuite: settingsSuite,
      dashboard2: dashboard2,
      staticBootRoute: staticBootRoute,
      animated: animateShell,
      wrapperLeft: Math.round(page.wrapper.getBoundingClientRect().left),
      contentLeft: Math.round(page.content.getBoundingClientRect().left),
      visibleContentLeft: Math.round(
        page.content.getBoundingClientRect().left +
        parseFloat(getComputedStyle(page.content).paddingLeft)
      ),
      rightGap: Math.round(
        window.innerWidth -
        (
          page.content.getBoundingClientRect().right -
          parseFloat(getComputedStyle(page.content).paddingRight)
        )
      )
    };
  }

  function applyStable() {
    return apply({
      animate: performance.now() < animationUntil
    });
  }

  function animate(duration) {
    animationUntil = performance.now() + (duration || 320);
    cancelAnimationFrame(frameId);

    function frame(now) {
      apply({ animate: true });

      if (now < animationUntil) {
        frameId = requestAnimationFrame(frame);
      } else {
        apply({ animate: false });
      }
    }

    frameId = requestAnimationFrame(frame);
  }

  function settleWithoutAnimation() {
    animationUntil = 0;
    cancelAnimationFrame(frameId);
    apply({ animate: false });
  }

  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyStable, 60);
  }

  function handleSideMenuState() {
    var nextState = sideMenuState();
    var changed = lastSideMenuState !== null && nextState !== lastSideMenuState;

    lastSideMenuState = nextState;

    if (
      isStaticBootRoute() &&
      (!runtimeTransitionsReady() || !changed)
    ) {
      settleWithoutAnimation();
      return;
    }

    animate(340);
  }

  function init() {
    lastSideMenuState = sideMenuState();
    settleWithoutAnimation();

    [0, 40, 100, 220, 500, 900].forEach(function (delay) {
      setTimeout(function () {
        if (isStaticBootRoute()) {
          if (performance.now() < animationUntil) {
            apply({ animate: true });
          } else {
            settleWithoutAnimation();
          }
        } else {
          applyStable();
        }
      }, delay);
    });

    window.addEventListener(
      'pmd:side-menu2-state',
      handleSideMenuState
    );

    menu.addEventListener('transitionstart', function () {
      if (isStaticBootRoute() && !runtimeTransitionsReady()) {
        settleWithoutAnimation();
        return;
      }

      animate(340);
    });

    menu.addEventListener('transitionend', function () {
      if (performance.now() < animationUntil) {
        apply({ animate: true });
        return;
      }

      settleWithoutAnimation();
      setTimeout(settleWithoutAnimation, 40);
    });

    window.addEventListener(
      'resize',
      handleResize,
      { passive: true }
    );

    window.addEventListener(
      'load',
      function () {
        if (isStaticBootRoute()) {
          if (performance.now() < animationUntil) {
            apply({ animate: true });
          } else {
            settleWithoutAnimation();
          }

          setTimeout(function () {
            if (performance.now() < animationUntil) {
              apply({ animate: true });
            } else {
              settleWithoutAnimation();
            }
          }, 100);

          setTimeout(function () {
            if (performance.now() < animationUntil) {
              apply({ animate: true });
            } else {
              settleWithoutAnimation();
            }
          }, 400);
        } else {
          applyStable();
          setTimeout(applyStable, 100);
          setTimeout(applyStable, 400);
        }
      },
      { once: true }
    );
  }

  var observer = new MutationObserver(function (mutations) {
    var relevant = mutations.some(function (mutation) {
      return (
        mutation.target === document.documentElement ||
        mutation.target === menu
      );
    });

    if (!relevant) return;

    if (isStaticBootRoute()) {
      /*
       * A real user sidebar transition is already owned by animate().
       * Class/style MutationObserver noise must not cancel that animation.
       */
      if (performance.now() < animationUntil) {
        apply({ animate: true });
        return;
      }

      var nextState = sideMenuState();
      var changed = lastSideMenuState !== null && nextState !== lastSideMenuState;

      if (changed) {
        lastSideMenuState = nextState;
      }

      if (!runtimeTransitionsReady() || !changed) {
        settleWithoutAnimation();
        return;
      }
    }

    animate(320);
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  observer.observe(menu, {
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  window.PMDAdminExactLayoutV4 = {
    version: '6.1.0-dashboard2-static-shell',
    apply: applyStable,
    animate: animate,
    observer: observer,
    isSettingsSuite: isSettingsSuite,
    isDashboard2: isDashboard2,
    isStaticBootRoute: isStaticBootRoute
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

  console.info(
    '[PMD Admin Exact Layout V6.1] Ready',
    window.PMDAdminExactLayoutV4
  );
})();