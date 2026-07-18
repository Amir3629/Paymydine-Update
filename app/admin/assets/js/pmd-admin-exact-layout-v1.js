(function () {
  'use strict';

  var path = String(location.pathname || '');

  var excluded =
    path === '/admin/login' ||
    path.indexOf('/admin/dashboardwaiter') === 0 ||
    path.indexOf('/admin/kds') === 0 ||
    path.indexOf('/admin/dashboardkitchen') === 0 ||
    path.indexOf('/admin/quick-mode') === 0 ||
    path.indexOf('/admin/reservations2') === 0;

  if (excluded) return;

  if (window.PMDAdminExactLayoutV1) {
    window.PMDAdminExactLayoutV1.apply();
    return;
  }

  var DESKTOP_GAP = 14;
  var MOBILE_GAP = 10;
  var frameId = 0;
  var animationUntil = 0;

  function setImportant(element, property, value) {
    if (!element) return;

    element.style.setProperty(
      property,
      value,
      'important'
    );
  }

  function findElements() {
    return {
      menu:
        document.querySelector('#pmd-side-menu2'),

      wrapper:
        document.querySelector('.page-wrapper'),

      content:
        document.querySelector('.page-content'),

      topbar:
        document.querySelector(
          '.navbar-top, .navbar-fixed-top'
        )
    };
  }

  function apply() {
    var elements = findElements();

    if (
      !elements.menu ||
      !elements.wrapper ||
      !elements.content
    ) {
      return null;
    }

    var gap =
      window.innerWidth <= 767
        ? MOBILE_GAP
        : DESKTOP_GAP;

    var menuRight =
      Math.round(
        elements.menu
          .getBoundingClientRect()
          .right
      );

    [
      document.body,
      elements.wrapper,
      elements.content
    ].forEach(function (element) {
      setImportant(element, 'margin-left', '0px');
      setImportant(element, 'margin-right', '0px');
      setImportant(element, 'padding-left', '0px');
      setImportant(element, 'padding-right', '0px');
      setImportant(element, 'max-width', 'none');
      setImportant(element, 'transform', 'none');
      setImportant(element, 'box-sizing', 'border-box');
    });

    setImportant(elements.wrapper, 'left', '0px');
    setImportant(elements.wrapper, 'right', 'auto');
    setImportant(elements.wrapper, 'width', '100vw');
    setImportant(elements.wrapper, 'min-width', '0px');
    setImportant(elements.wrapper, 'overflow-x', 'hidden');

    setImportant(elements.content, 'left', '0px');
    setImportant(elements.content, 'right', 'auto');

    setImportant(
      elements.content,
      'margin-left',
      menuRight + 'px'
    );

    setImportant(
      elements.content,
      'width',
      'calc(100vw - ' + menuRight + 'px)'
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
      'transition',
      [
        'margin-left 220ms cubic-bezier(.22,.75,.24,1)',
        'width 220ms cubic-bezier(.22,.75,.24,1)'
      ].join(', ')
    );

    if (elements.topbar) {
      var topbarLeft = menuRight + gap;

      setImportant(
        elements.topbar,
        'left',
        topbarLeft + 'px'
      );

      setImportant(elements.topbar, 'right', '0px');

      setImportant(
        elements.topbar,
        'width',
        'calc(100vw - ' + topbarLeft + 'px)'
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

    document.documentElement.style.setProperty(
      '--pmd-admin-gap',
      gap + 'px'
    );

    return {
      gap: gap,
      menuRight: menuRight
    };
  }

  function animate(duration) {
    animationUntil =
      performance.now() + (duration || 300);

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

  function init() {
    var menu =
      document.querySelector('#pmd-side-menu2');

    apply();

    [0, 50, 150, 350, 700].forEach(
      function (delay) {
        setTimeout(apply, delay);
      }
    );

    if (menu) {
      menu.addEventListener(
        'transitionstart',
        function () {
          animate(320);
        }
      );

      menu.addEventListener(
        'transitionend',
        function () {
          apply();
        }
      );
    }

    window.addEventListener(
      'resize',
      function () {
        clearTimeout(
          window.PMDAdminExactLayoutResizeTimer
        );

        window.PMDAdminExactLayoutResizeTimer =
          setTimeout(apply, 60);
      },
      { passive: true }
    );
  }

  var observer =
    new MutationObserver(function () {
      animate(300);
    });

  observer.observe(
    document.documentElement,
    {
      attributes: true,
      attributeFilter: ['class']
    }
  );

  window.PMDAdminExactLayoutV1 = {
    version: '1.0.0',
    apply: apply,
    animate: animate,
    observer: observer
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
    '[PMD Admin Exact Layout V1] Ready',
    window.PMDAdminExactLayoutV1
  );
})();
