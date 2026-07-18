(function () {
  'use strict';

  var path =
    String(location.pathname || '');

  var excluded =
    path === '/admin/login' ||
    path.indexOf('/admin/dashboardwaiter') === 0 ||
    path.indexOf('/admin/kds') === 0 ||
    path.indexOf('/admin/dashboardkitchen') === 0 ||
    path.indexOf('/admin/quick-mode') === 0 ||
    path.indexOf('/admin/reservations2') === 0;

  if (excluded) return;

  var menu =
    document.querySelector('#pmd-side-menu2');

  if (!menu) return;

  if (window.PMDAdminExactLayoutV2) {
    window.PMDAdminExactLayoutV2.apply();
    return;
  }

  var DESKTOP_GAP = 14;
  var MOBILE_GAP = 10;

  var frameId = 0;
  var animationUntil = 0;
  var resizeTimer = 0;

  function setImportant(
    element,
    property,
    value
  ) {
    if (!element) return;

    element.style.setProperty(
      property,
      value,
      'important'
    );
  }

  function removeLegacyGeometry(element) {
    if (!element) return;

    [
      'margin-left',
      'margin-right',
      'padding-left',
      'padding-right',
      'left',
      'right',
      'transform',
      'max-width'
    ].forEach(function (property) {
      element.style.removeProperty(
        property
      );
    });
  }

  function findPageElements() {
    var wrapper =
      document.querySelector(
        '.page-wrapper'
      );

    var content =
      document.querySelector(
        '.page-content'
      );

    return {
      wrapper: wrapper,
      content: content,

      topbar:
        document.querySelector(
          '.navbar-top, .navbar-fixed-top'
        ),

      inner:
        content
          ? content.firstElementChild
          : null
    };
  }

  function normalizeDirectChildren(
    content
  ) {
    if (!content) return;

    Array.from(content.children)
      .forEach(function (child) {
        if (
          child.id === 'pmd-side-menu2'
        ) {
          return;
        }

        setImportant(
          child,
          'box-sizing',
          'border-box'
        );

        setImportant(
          child,
          'max-width',
          '100%'
        );

        setImportant(
          child,
          'min-width',
          '0px'
        );
      });
  }

  function apply() {
    var elements =
      findPageElements();

    if (
      !elements.wrapper ||
      !elements.content
    ) {
      return null;
    }

    var gap =
      window.innerWidth <= 767
        ? MOBILE_GAP
        : DESKTOP_GAP;

    var menuRect =
      menu.getBoundingClientRect();

    var menuRight =
      Math.round(menuRect.right);

    var contentWidth =
      Math.max(
        0,
        window.innerWidth -
        menuRight
      );

    document.documentElement.style.setProperty(
      '--pmd-admin-gap',
      gap + 'px'
    );

    document.documentElement.style.setProperty(
      '--pmd-admin-menu-right',
      menuRight + 'px'
    );

    /*
     * Remove native 212px sidebar geometry.
     */
    [
      document.body,
      elements.wrapper,
      elements.content
    ].forEach(function (element) {
      removeLegacyGeometry(element);

      setImportant(
        element,
        'box-sizing',
        'border-box'
      );

      setImportant(
        element,
        'max-width',
        'none'
      );
    });

    setImportant(
      elements.wrapper,
      'position',
      'absolute'
    );

    setImportant(
      elements.wrapper,
      'left',
      '0px'
    );

    setImportant(
      elements.wrapper,
      'right',
      'auto'
    );

    setImportant(
      elements.wrapper,
      'margin-left',
      '0px'
    );

    setImportant(
      elements.wrapper,
      'width',
      '100vw'
    );

    setImportant(
      elements.wrapper,
      'min-width',
      '0px'
    );

    setImportant(
      elements.wrapper,
      'overflow-x',
      'hidden'
    );

    setImportant(
      elements.wrapper,
      'z-index',
      '1'
    );

    setImportant(
      elements.content,
      'position',
      'relative'
    );

    setImportant(
      elements.content,
      'left',
      menuRight + 'px'
    );

    setImportant(
      elements.content,
      'right',
      'auto'
    );

    setImportant(
      elements.content,
      'margin-left',
      '0px'
    );

    setImportant(
      elements.content,
      'margin-right',
      '0px'
    );

    setImportant(
      elements.content,
      'width',
      contentWidth + 'px'
    );

    setImportant(
      elements.content,
      'min-width',
      '0px'
    );

    setImportant(
      elements.content,
      'padding-left',
      gap + 'px'
    );

    setImportant(
      elements.content,
      'padding-right',
      gap + 'px'
    );

    setImportant(
      elements.content,
      'overflow-x',
      'hidden'
    );

    setImportant(
      elements.content,
      'z-index',
      '1'
    );

    setImportant(
      elements.content,
      'transition',
      [
        'left 220ms cubic-bezier(.22,.75,.24,1)',
        'width 220ms cubic-bezier(.22,.75,.24,1)'
      ].join(', ')
    );

    normalizeDirectChildren(
      elements.content
    );

    if (elements.topbar) {
      var topbarLeft =
        menuRight + gap;

      setImportant(
        elements.topbar,
        'left',
        topbarLeft + 'px'
      );

      setImportant(
        elements.topbar,
        'right',
        '0px'
      );

      setImportant(
        elements.topbar,
        'margin-left',
        '0px'
      );

      setImportant(
        elements.topbar,
        'width',
        'calc(100vw - ' +
          topbarLeft +
          'px)'
      );

      setImportant(
        elements.topbar,
        'max-width',
        'none'
      );

      setImportant(
        elements.topbar,
        'z-index',
        '1030'
      );

      setImportant(
        elements.topbar,
        'transition',
        [
          'left 220ms cubic-bezier(.22,.75,.24,1)',
          'width 220ms cubic-bezier(.22,.75,.24,1)'
        ].join(', ')
      );
    }

    /*
     * The menu must always remain above page content
     * and must receive pointer events.
     */
    setImportant(
      menu,
      'z-index',
      '12000'
    );

    setImportant(
      menu,
      'pointer-events',
      'auto'
    );

    setImportant(
      menu,
      'visibility',
      'visible'
    );

    setImportant(
      menu,
      'opacity',
      '1'
    );

    menu
      .querySelectorAll(
        'a, button, [role="button"]'
      )
      .forEach(function (element) {
        setImportant(
          element,
          'pointer-events',
          'auto'
        );
      });

    return {
      gap: gap,
      menuLeft:
        Math.round(menuRect.left),

      menuRight: menuRight,
      contentLeft:
        Math.round(
          elements.content
            .getBoundingClientRect()
            .left
        ),

      contentWidth:
        Math.round(
          elements.content
            .getBoundingClientRect()
            .width
        )
    };
  }

  function animate(duration) {
    animationUntil =
      performance.now() +
      (duration || 320);

    cancelAnimationFrame(frameId);

    function frame(now) {
      apply();

      if (now < animationUntil) {
        frameId =
          requestAnimationFrame(frame);
      }
    }

    frameId =
      requestAnimationFrame(frame);
  }

  function schedule() {
    clearTimeout(resizeTimer);

    resizeTimer =
      setTimeout(apply, 60);
  }

  function init() {
    apply();

    [0, 40, 120, 300, 700, 1200]
      .forEach(function (delay) {
        setTimeout(apply, delay);
      });

    menu.addEventListener(
      'transitionstart',
      function () {
        animate(340);
      }
    );

    menu.addEventListener(
      'transitionend',
      function () {
        apply();
        setTimeout(apply, 40);
      }
    );

    window.addEventListener(
      'pmd:side-menu2-state',
      function () {
        animate(340);
      }
    );

    window.addEventListener(
      'resize',
      schedule,
      { passive: true }
    );

    window.addEventListener(
      'load',
      function () {
        apply();
        setTimeout(apply, 200);
      },
      { once: true }
    );
  }

  var observer =
    new MutationObserver(function (
      mutations
    ) {
      var relevant =
        mutations.some(function (
          mutation
        ) {
          return (
            mutation.target ===
              document.documentElement ||
            mutation.target === menu
          );
        });

      if (relevant) {
        animate(320);
      }
    });

  observer.observe(
    document.documentElement,
    {
      attributes: true,
      attributeFilter: ['class']
    }
  );

  observer.observe(
    menu,
    {
      attributes: true,
      attributeFilter: [
        'class',
        'style'
      ]
    }
  );

  window.PMDAdminExactLayoutV2 = {
    version: '2.0.0',
    apply: apply,
    animate: animate,
    observer: observer
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

  console.info(
    '[PMD Admin Exact Layout V2] Ready',
    window.PMDAdminExactLayoutV2
  );
})();
