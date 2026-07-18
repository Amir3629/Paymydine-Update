(function () {
  'use strict';

  var path =
    String(
      window.location &&
      window.location.pathname ||
      ''
    );

  var excluded =
    path === '/admin/login' ||
    path.indexOf('/admin/dashboardwaiter') === 0 ||
    path.indexOf('/admin/dashboardkitchen') === 0 ||
    path.indexOf('/admin/kds') === 0 ||
    path.indexOf('/admin/quick-mode') === 0 ||
    path.indexOf('/admin/reservations2') === 0;

  if (excluded) return;

  var menu =
    document.querySelector('#pmd-side-menu2');

  if (!menu) return;

  if (window.PMDAdminExactLayoutV4) {
    window.PMDAdminExactLayoutV4.apply();
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

  function elements() {
    return {
      wrapper:
        document.querySelector(
          '.page-wrapper'
        ),

      content:
        document.querySelector(
          '.page-content'
        ),

      topbar:
        document.querySelector(
          '.navbar-top, .navbar-fixed-top'
        )
    };
  }

  function normalizeContentChildren(
    content
  ) {
    if (!content) return;

    Array.from(content.children)
      .forEach(function (child) {
        setImportant(
          child,
          'box-sizing',
          'border-box'
        );

        setImportant(
          child,
          'min-width',
          '0px'
        );

        setImportant(
          child,
          'max-width',
          '100%'
        );
      });
  }

  function apply() {
    var page = elements();

    if (
      !page.wrapper ||
      !page.content
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

    var wrapperWidth =
      Math.max(
        0,
        window.innerWidth -
        menuRight
      );

    /*
     * Critical architectural correction:
     *
     * The entire page-wrapper begins after Side Menu 2.
     * Children that use absolute positioning, grids,
     * percentages or 100% widths therefore remain inside
     * the visible content area.
     */
    setImportant(
      document.body,
      'margin-left',
      '0px'
    );

    setImportant(
      document.body,
      'padding-left',
      '0px'
    );

    setImportant(
      document.body,
      'overflow-x',
      'hidden'
    );

    setImportant(
      page.wrapper,
      'position',
      'absolute'
    );

    setImportant(
      page.wrapper,
      'left',
      menuRight + 'px'
    );

    setImportant(
      page.wrapper,
      'right',
      'auto'
    );

    setImportant(
      page.wrapper,
      'margin-left',
      '0px'
    );

    setImportant(
      page.wrapper,
      'margin-right',
      '0px'
    );

    setImportant(
      page.wrapper,
      'padding-left',
      '0px'
    );

    setImportant(
      page.wrapper,
      'padding-right',
      '0px'
    );

    setImportant(
      page.wrapper,
      'width',
      wrapperWidth + 'px'
    );

    setImportant(
      page.wrapper,
      'max-width',
      'none'
    );

    setImportant(
      page.wrapper,
      'min-width',
      '0px'
    );

    setImportant(
      page.wrapper,
      'box-sizing',
      'border-box'
    );

    setImportant(
      page.wrapper,
      'overflow-x',
      'hidden'
    );

    setImportant(
      page.wrapper,
      'z-index',
      '1'
    );

    setImportant(
      page.wrapper,
      'transform',
      'none'
    );

    setImportant(
      page.wrapper,
      'transition',
      [
        'left 220ms cubic-bezier(.22,.75,.24,1)',
        'width 220ms cubic-bezier(.22,.75,.24,1)'
      ].join(', ')
    );

    /*
     * page-content is now local to the correctly positioned
     * wrapper. It receives only the shared 14px inset.
     */
    setImportant(
      page.content,
      'position',
      'relative'
    );

    setImportant(
      page.content,
      'left',
      '0px'
    );

    setImportant(
      page.content,
      'right',
      'auto'
    );

    setImportant(
      page.content,
      'margin-left',
      '0px'
    );

    setImportant(
      page.content,
      'margin-right',
      '0px'
    );

    setImportant(
      page.content,
      'padding-left',
      gap + 'px'
    );

    setImportant(
      page.content,
      'padding-right',
      gap + 'px'
    );

    setImportant(
      page.content,
      'width',
      '100%'
    );

    setImportant(
      page.content,
      'max-width',
      'none'
    );

    setImportant(
      page.content,
      'min-width',
      '0px'
    );

    setImportant(
      page.content,
      'box-sizing',
      'border-box'
    );

    setImportant(
      page.content,
      'overflow-x',
      'hidden'
    );

    setImportant(
      page.content,
      'transform',
      'none'
    );

    normalizeContentChildren(
      page.content
    );

    if (page.topbar) {
      setImportant(
        page.topbar,
        'left',
        menuRight + 'px'
      );

      setImportant(
        page.topbar,
        'right',
        '0px'
      );

      setImportant(
        page.topbar,
        'margin-left',
        '0px'
      );

      setImportant(
        page.topbar,
        'width',
        wrapperWidth + 'px'
      );

      setImportant(
        page.topbar,
        'max-width',
        'none'
      );

      setImportant(
        page.topbar,
        'box-sizing',
        'border-box'
      );

      setImportant(
        page.topbar,
        'transition',
        [
          'left 220ms cubic-bezier(.22,.75,.24,1)',
          'width 220ms cubic-bezier(.22,.75,.24,1)'
        ].join(', ')
      );
    }

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

      wrapperLeft:
        Math.round(
          page.wrapper
            .getBoundingClientRect()
            .left
        ),

      contentLeft:
        Math.round(
          page.content
            .getBoundingClientRect()
            .left
        ),

      visibleContentLeft:
        Math.round(
          page.content
            .getBoundingClientRect()
            .left +
          parseFloat(
            getComputedStyle(
              page.content
            ).paddingLeft
          )
        ),

      rightGap:
        Math.round(
          window.innerWidth -
          (
            page.content
              .getBoundingClientRect()
              .right -
            parseFloat(
              getComputedStyle(
                page.content
              ).paddingRight
            )
          )
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

  function handleResize() {
    clearTimeout(resizeTimer);

    resizeTimer =
      setTimeout(apply, 60);
  }

  function init() {
    apply();

    [
      0,
      40,
      100,
      220,
      500,
      900
    ].forEach(function (delay) {
      setTimeout(apply, delay);
    });

    window.addEventListener(
      'pmd:side-menu2-state',
      function () {
        animate(340);
      }
    );

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
      'resize',
      handleResize,
      { passive: true }
    );

    window.addEventListener(
      'load',
      function () {
        apply();
        setTimeout(apply, 100);
        setTimeout(apply, 400);
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

  window.PMDAdminExactLayoutV4 = {
    version: '4.0.0',
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
    '[PMD Admin Exact Layout V4] Ready',
    window.PMDAdminExactLayoutV4
  );
})();
