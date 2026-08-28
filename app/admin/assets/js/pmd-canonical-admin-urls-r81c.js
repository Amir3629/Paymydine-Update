/*
 * PMD_ADMIN_CANONICAL_BROWSER_URLS_R81C
 *
 * ONE browser address authority.
 *
 * Important:
 * - controller URLs are not renamed
 * - backend APIs are not renamed
 * - canonicalization occurs only after full page load
 * - History writes are canonicalized
 * - implicit forms retain their internal transport URL
 * - no polling
 * - no MutationObserver
 */
(function () {
  'use strict';

  if (
    window.PMDAdminCanonicalURLR81C
  ) return;

  var internalPath =
    String(
      window.location.pathname || ''
    ).replace(/\/+$/, '');

  var internalSearch =
    String(
      window.location.search || ''
    );

  var internalFormTarget =
    internalPath + internalSearch;

  var exact = {
    '/admin/dashboardlab':
      '/admin/ownerdashboard',

    '/admin/managerlab':
      '/admin/managerdashboard',

    '/admin/accountantlab':
      '/admin/accountantdashboard',

    '/admin/cashierlab':
      '/admin/orders',

    '/admin/reservationslab':
      '/admin/reservations',

    '/admin/pmdmenus':
      '/admin/menu',

    '/admin/pmdsettings':
      '/admin/settings',

    '/admin/pmdsettings/restaurant':
      '/admin/settings/restaurant',

    '/admin/pmdsettings/frontend':
      '/admin/settings/customer-menu',

    '/admin/pmdmenu':
      '/admin/settings/menu-checkout',

    '/admin/pmdcustomer':
      '/admin/settings/customers',

    '/admin/pmdteam':
      '/admin/settings/team',

    '/admin/pmddevices':
      '/admin/settings/devices',

    '/admin/pmdfinance':
      '/admin/settings/finance',

    '/admin/pmdbrand':
      '/admin/settings/brand',

    '/admin/pmdadvanced':
      '/admin/settings/advanced',

    '/admin/pmdsmartcategories':
      '/admin/smartcategories',

    '/admin/pmdreports':
      '/admin/reports',

    '/admin/pmdreporttips':
      '/admin/reports/tips',

    '/admin/pmdreportchannels':
      '/admin/reports/channels'
  };

  function cleanPath(pathname) {
    var path =
      String(
        pathname || ''
      ).replace(/\/+$/, '');

    if (exact[path]) {
      return exact[path];
    }

    if (
      path.indexOf(
        '/admin/pmdreports/'
      ) === 0
    ) {
      return (
        '/admin/reports/'
        + path.slice(
          '/admin/pmdreports/'.length
        )
      );
    }

    return path;
  }

  function cleanHistoryUrl(value) {
    if (
      value === null
      || typeof value === 'undefined'
    ) {
      return value;
    }

    try {
      var url =
        new URL(
          String(value),
          window.location.href
        );

      if (
        url.origin !==
        window.location.origin
      ) {
        return value;
      }

      var nextPath =
        cleanPath(
          url.pathname
        );

      if (
        nextPath ===
        String(
          url.pathname
        ).replace(/\/+$/, '')
      ) {
        return value;
      }

      return (
        nextPath
        + url.search
        + url.hash
      );
    } catch (error) {
      return value;
    }
  }

  function freezeImplicitForms() {
    Array.prototype.forEach.call(
      document.forms || [],
      function (form) {
        if (!form) return;

        var action =
          form.getAttribute(
            'action'
          );

        if (
          action === null
          || String(action).trim() === ''
        ) {
          form.setAttribute(
            'action',
            internalFormTarget
          );

          form.setAttribute(
            'data-pmd-internal-action-r81c',
            '1'
          );
        }
      }
    );
  }

  document.addEventListener(
    'submit',
    function (event) {
      var form =
        event.target;

      if (
        !form
        || String(
          form.tagName || ''
        ).toLowerCase() !== 'form'
      ) return;

      var action =
        form.getAttribute(
          'action'
        );

      if (
        action === null
        || String(action).trim() === ''
      ) {
        form.setAttribute(
          'action',
          internalFormTarget
        );
      }
    },
    true
  );

  var installed = false;

  function install() {
    if (installed) return;
    installed = true;

    freezeImplicitForms();

    var nativePush =
      window.history.pushState
        ? window.history.pushState.bind(
            window.history
          )
        : null;

    var nativeReplace =
      window.history.replaceState
        ? window.history.replaceState.bind(
            window.history
          )
        : null;

    var visiblePath =
      cleanPath(
        window.location.pathname
      );

    if (
      nativeReplace
      && visiblePath !==
        String(
          window.location.pathname
        ).replace(/\/+$/, '')
    ) {
      nativeReplace(
        window.history.state,
        '',
        visiblePath
          + window.location.search
          + window.location.hash
      );
    }

    if (nativePush) {
      window.history.pushState =
        function (
          state,
          title,
          url
        ) {
          return nativePush(
            state,
            title,
            cleanHistoryUrl(url)
          );
        };
    }

    if (nativeReplace) {
      window.history.replaceState =
        function (
          state,
          title,
          url
        ) {
          return nativeReplace(
            state,
            title,
            cleanHistoryUrl(url)
          );
        };
    }

    document.documentElement
      .setAttribute(
        'data-pmd-canonical-admin-url-r81c',
        '1'
      );
  }

  window.PMDAdminCanonicalURLR81C = {
    version: '1.0.0',

    internalPath:
      function () {
        return internalPath;
      },

    visiblePath:
      function () {
        return String(
          window.location.pathname || ''
        );
      },

    inspect:
      function () {
        return {
          version: '1.0.0',
          installed: installed,
          internalPath: internalPath,
          visiblePath:
            String(
              window.location.pathname || ''
            ),
          readyState:
            document.readyState
        };
      }
  };

  if (
    document.readyState === 'complete'
  ) {
    window.setTimeout(
      install,
      0
    );
  } else {
    window.addEventListener(
      'load',
      install,
      {
        once: true
      }
    );
  }
})();
