(function () {
  'use strict';

  if (
    String(window.location.pathname || '') !==
    '/admin/reservations2'
  ) {
    return;
  }

  if (window.PMDReservations2ExactLayoutV1) {
    window.PMDReservations2ExactLayoutV1.apply();
    return;
  }

  var DESKTOP_GAP = 14;
  var MOBILE_GAP = 10;
  var animationFrame = 0;
  var resizeTimer = 0;
  var animationUntil = 0;

  function setImportant(element, property, value) {
    if (!element) return;

    element.style.setProperty(
      property,
      value,
      'important'
    );
  }

  function getElements() {
    return {
      menu:
        document.querySelector('#pmd-side-menu2'),

      root:
        document.querySelector('#pmd-reservations2'),

      wrapper:
        document.querySelector('.page-wrapper'),

      content:
        document.querySelector('.page-content'),

      topbar:
        document.querySelector(
          '.navbar-top, .navbar-fixed-top'
        ),

      hero:
        document.querySelector(
          '#pmd-reservations2 .pmd-r2__hero'
        ),

      kpis:
        document.querySelector(
          '#pmd-reservations2 .pmd-r2__kpis'
        ),

      workspace:
        document.querySelector(
          '#pmd-reservations2 .pmd-r2__workspace'
        )
    };
  }

  function apply() {
    var elements = getElements();

    var menu = elements.menu;
    var root = elements.root;
    var wrapper = elements.wrapper;
    var content = elements.content;
    var topbar = elements.topbar;
    var hero = elements.hero;
    var kpis = elements.kpis;
    var workspace = elements.workspace;

    if (!menu || !root || !wrapper || !content) {
      return null;
    }

    var gap =
      window.innerWidth <= 767
        ? MOBILE_GAP
        : DESKTOP_GAP;

    var menuRect =
      menu.getBoundingClientRect();

    var rootLeft =
      Math.round(menuRect.right);

    var topbarLeft =
      rootLeft + gap;

    [
      document.body,
      wrapper,
      content
    ].forEach(function (element) {
      setImportant(
        element,
        'margin-left',
        '0px'
      );

      setImportant(
        element,
        'margin-right',
        '0px'
      );

      setImportant(
        element,
        'padding-left',
        '0px'
      );

      setImportant(
        element,
        'padding-right',
        '0px'
      );

      setImportant(
        element,
        'max-width',
        'none'
      );

      setImportant(
        element,
        'transform',
        'none'
      );

      setImportant(
        element,
        'box-sizing',
        'border-box'
      );
    });

    setImportant(
      wrapper,
      'position',
      'absolute'
    );

    setImportant(
      wrapper,
      'left',
      '0px'
    );

    setImportant(
      wrapper,
      'right',
      'auto'
    );

    setImportant(
      wrapper,
      'width',
      '100vw'
    );

    setImportant(
      wrapper,
      'min-width',
      '0px'
    );

    setImportant(
      wrapper,
      'overflow-x',
      'hidden'
    );

    setImportant(
      content,
      'position',
      'relative'
    );

    setImportant(
      content,
      'left',
      '0px'
    );

    setImportant(
      content,
      'right',
      'auto'
    );

    setImportant(
      content,
      'width',
      '100vw'
    );

    setImportant(
      content,
      'min-width',
      '0px'
    );

    setImportant(
      content,
      'overflow-x',
      'hidden'
    );

    setImportant(
      root,
      'position',
      'relative'
    );

    setImportant(
      root,
      'left',
      '0px'
    );

    setImportant(
      root,
      'right',
      'auto'
    );

    setImportant(
      root,
      'margin-left',
      rootLeft + 'px'
    );

    setImportant(
      root,
      'margin-right',
      '0px'
    );

    setImportant(
      root,
      'margin-top',
      '0px'
    );

    setImportant(
      root,
      'padding-left',
      gap + 'px'
    );

    setImportant(
      root,
      'padding-right',
      gap + 'px'
    );

    setImportant(
      root,
      'width',
      'calc(100vw - ' + rootLeft + 'px)'
    );

    setImportant(
      root,
      'max-width',
      'none'
    );

    setImportant(
      root,
      'min-width',
      '0px'
    );

    setImportant(
      root,
      'box-sizing',
      'border-box'
    );

    setImportant(
      root,
      'transition',
      [
        'margin-left 220ms cubic-bezier(.22,.75,.24,1)',
        'width 220ms cubic-bezier(.22,.75,.24,1)'
      ].join(', ')
    );

    if (hero) {
      setImportant(
        hero,
        'margin-bottom',
        gap + 'px'
      );
    }

    if (kpis) {
      setImportant(
        kpis,
        'gap',
        gap + 'px'
      );

      setImportant(
        kpis,
        'margin-bottom',
        gap + 'px'
      );
    }

    if (workspace) {
      setImportant(
        workspace,
        'gap',
        gap + 'px'
      );
    }

    if (topbar) {
      setImportant(
        topbar,
        'left',
        topbarLeft + 'px'
      );

      setImportant(
        topbar,
        'right',
        '0px'
      );

      setImportant(
        topbar,
        'margin-left',
        '0px'
      );

      setImportant(
        topbar,
        'width',
        'calc(100vw - ' +
          topbarLeft +
          'px)'
      );

      setImportant(
        topbar,
        'max-width',
        'none'
      );

      setImportant(
        topbar,
        'transition',
        [
          'left 220ms cubic-bezier(.22,.75,.24,1)',
          'width 220ms cubic-bezier(.22,.75,.24,1)'
        ].join(', ')
      );
    }

    return {
      gap: gap,
      menuRight: rootLeft,
      state:
        document.documentElement
          .classList
          .contains('pmd-sm2-expanded')
          ? 'expanded'
          : 'collapsed'
    };
  }

  function animateLayout(duration) {
    animationUntil =
      performance.now() + (duration || 280);

    cancelAnimationFrame(animationFrame);

    function frame(now) {
      apply();

      if (now < animationUntil) {
        animationFrame =
          requestAnimationFrame(frame);
      }
    }

    animationFrame =
      requestAnimationFrame(frame);
  }

  function scheduleApply(delay) {
    window.setTimeout(
      apply,
      delay || 0
    );
  }

  function handleResize() {
    clearTimeout(resizeTimer);

    resizeTimer = window.setTimeout(
      function () {
        apply();
      },
      60
    );
  }

  function initialize() {
    var elements = getElements();
    var menu = elements.menu;

    apply();

    scheduleApply(0);
    scheduleApply(50);
    scheduleApply(150);
    scheduleApply(350);
    scheduleApply(700);

    if (menu) {
      menu.addEventListener(
        'transitionrun',
        function () {
          animateLayout(320);
        }
      );

      menu.addEventListener(
        'transitionstart',
        function () {
          animateLayout(320);
        }
      );

      menu.addEventListener(
        'transitionend',
        function () {
          apply();
          scheduleApply(30);
        }
      );
    }

    window.addEventListener(
      'resize',
      handleResize,
      { passive: true }
    );

    window.addEventListener(
      'load',
      function () {
        apply();
        scheduleApply(100);
        scheduleApply(400);
      },
      { once: true }
    );
  }

  var observer =
    new MutationObserver(function (mutations) {
      var relevant =
        mutations.some(function (mutation) {
          return (
            mutation.type === 'attributes' &&
            mutation.target ===
              document.documentElement
          );
        });

      if (relevant) {
        animateLayout(300);
      }
    });

  observer.observe(
    document.documentElement,
    {
      attributes: true,
      attributeFilter: ['class']
    }
  );

  window.PMDReservations2ExactLayoutV1 = {
    version: '1.0.0',
    gap: DESKTOP_GAP,
    mobileGap: MOBILE_GAP,
    apply: apply,
    animate: animateLayout,
    observer: observer
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

  console.info(
    '[PMD Reservations2 Exact Layout V1] Ready',
    window.PMDReservations2ExactLayoutV1
  );
})();
