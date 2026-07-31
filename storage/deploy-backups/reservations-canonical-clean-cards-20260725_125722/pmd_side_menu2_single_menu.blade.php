{{-- PMD_SIDE_MENU2_SINGLE_MARKUP_V1 --}}
@php
    $pmdSingleMenuPath = trim(request()->path(), '/');
    $pmdActive = function ($paths) use ($pmdSingleMenuPath) {
        foreach ((array) $paths as $path) {
            if ($pmdSingleMenuPath === 'admin/'.$path || str_starts_with($pmdSingleMenuPath, 'admin/'.$path.'/')) return true;
        }
        return false;
    };
@endphp

<aside id="pmd-side-menu2" aria-label="Admin navigation">
    <div class="pmd-sm2__brand">
        <button type="button" class="pmd-sm2__brand-control" data-pmd-sm2-toggle aria-expanded="false" aria-label="Expand menu">
            <img class="pmd-sm2__brand-full" src="/app/admin/assets/images/pmd-brand-full.svg" alt="Pay My Dine">
            <img class="pmd-sm2__brand-mark" src="/app/admin/assets/images/pmd-brand-mark.svg" alt="">
            <svg class="pmd-sm2__brand-expand-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
            <svg class="pmd-sm2__brand-collapse-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
    </div>

    <nav class="pmd-sm2__nav">
        <a class="pmd-sm2__item {{ $pmdActive(['dashboard']) ? 'is-active' : '' }}" href="{{ admin_url('dashboard') }}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/></svg>
            <span class="pmd-sm2__label">Dashboard</span>
        </a>
        <a class="pmd-sm2__item {{ $pmdActive(['orders']) ? 'is-active' : '' }}" href="{{ admin_url('orders') }}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304"/><path d="M9 11v-5a3 3 0 0 1 6 0v5"/></svg>
            <span class="pmd-sm2__label">Orders</span>
        </a>
        <a class="pmd-sm2__item {{ $pmdActive(['reservations', 'reservations2']) ? 'is-active' : '' }}" href="{{ admin_url('reservations2') }}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/><path d="M16 3v4M8 3v4M4 11h16M8 15h2v2h-2z"/></svg>
            <span class="pmd-sm2__label">Reservations</span>
        </a>
        <a class="pmd-sm2__item {{ $pmdActive(['coupons']) ? 'is-active' : '' }}" href="{{ admin_url('coupons') }}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2"/></svg>
            <span class="pmd-sm2__label">Coupons &amp; Gifts</span>
        </a>

        <div class="pmd-sm2__dropdown" data-pmd-sm2-dropdown="restaurant">
            <button type="button" class="pmd-sm2__dropdown-toggle" data-pmd-sm2-dropdown-toggle aria-expanded="false">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 3v12h-5c-.023-3.681.184-7.406 5-12M19 15v6M8 4v17M5 4v3a3 3 0 1 0 6 0V4"/></svg>
                <span class="pmd-sm2__label">Restaurant</span>
            </button>
            <div class="pmd-sm2__submenu"><div class="pmd-sm2__submenu-inner">
                <a class="pmd-sm2__subitem" href="{{ admin_url('locations') }}">Locations</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('menus') }}">Menu Items</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('categories') }}">Categories</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('mealtimes') }}">Mealtimes</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('tables') }}">Tables</a>
            </div></div>
        </div>

        <a class="pmd-sm2__item {{ $pmdActive(['dashboardkitchen', 'kds']) ? 'is-active' : '' }}" href="{{ admin_url('dashboardkitchen') }}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM7 20h10M9 16v4M15 16v4"/></svg>
            <span class="pmd-sm2__label">Kitchen Display</span>
        </a>

        <div class="pmd-sm2__dropdown" data-pmd-sm2-dropdown="design">
            <button type="button" class="pmd-sm2__dropdown-toggle" data-pmd-sm2-dropdown-toggle aria-expanded="false">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 1 9-9c0 1.657-1.343 3-3 3h-3a2 2 0 0 0-1 3.732A1.5 1.5 0 0 1 12 21z"/><path d="M7.5 10.5h.01M11.5 7.5h.01M15.5 10.5h.01"/></svg>
                <span class="pmd-sm2__label">Design</span>
            </button>
            <div class="pmd-sm2__submenu"><div class="pmd-sm2__submenu-inner">
                <a class="pmd-sm2__subitem" href="{{ admin_url('themes') }}">Themes</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('mail_templates') }}">Mail Templates</a>
            </div></div>
        </div>

        <div class="pmd-sm2__dropdown" data-pmd-sm2-dropdown="system">
            <button type="button" class="pmd-sm2__dropdown-toggle" data-pmd-sm2-dropdown-toggle aria-expanded="false">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-3v-.08a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 7.2 15a1.65 1.65 0 0 0-1.51-1H5.6v-3h.09A1.65 1.65 0 0 0 7.2 10a1.65 1.65 0 0 0-.33-1.82l-.06-.06L8.93 6l.06.06A1.65 1.65 0 0 0 10.8 6.4a1.65 1.65 0 0 0 1-1.51V4.8h3v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.12 2.12-.06.06A1.65 1.65 0 0 0 19.4 10a1.65 1.65 0 0 0 1.51 1H21v3h-.09A1.65 1.65 0 0 0 19.4 15z"/></svg>
                <span class="pmd-sm2__label">System</span>
            </button>
            <div class="pmd-sm2__submenu"><div class="pmd-sm2__submenu-inner">
                <a class="pmd-sm2__subitem" href="{{ admin_url('settings') }}">Settings</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('staffs') }}">Staff</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('payments') }}">Payments</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('languages') }}">Languages</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('currencies') }}">Currencies</a>
            </div></div>
        </div>
    </nav>

<!-- PMD_SM2_ACCOUNT_FOOTER_V11_START -->
<div class="pmd-sm2__account-footer" aria-label="Account actions">

    

    <button
        type="button"
        class="pmd-sm2__account-action pmd-sm2__logout-action"
        data-pmd-sm2-logout
        aria-label="Log out"
        title="Logout"
    >
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 8l4 4l-4 4"/>
            <path d="M18 12h-10"/>
            <path d="M8 5v-1a1 1 0 0 0 -1 -1h-3a1 1 0 0 0 -1 1v16a1 1 0 0 0 1 1h3a1 1 0 0 0 1 -1v-1"/>
        </svg>
        <span class="pmd-sm2__account-label">Logout</span>
    </button>

</div>
<!-- PMD_SM2_ACCOUNT_FOOTER_V11_END -->

</aside>
<div id="pmd-side-menu2-backdrop" aria-hidden="true"></div>

<script id="pmd-side-menu2-mobile-drawer-v1">
(function () {
  'use strict';
  if (window.PMDSideMenu2MobileDrawer) return;

  var html = document.documentElement;
  var body = document.body;
  var side = document.getElementById('pmd-side-menu2');
  var backdrop = document.getElementById('pmd-side-menu2-backdrop');
  if (!side || !backdrop) return;

  function trigger() {
    return document.querySelector('.pmd-r2-mobile-menu,[data-pmd-r2-mobile-menu]');
  }

  function setOpen(open) {
    html.classList.toggle('pmd-sm2-mobile-open', open);
    body.classList.toggle('pmd-sm2-scroll-locked', open);
    backdrop.setAttribute('aria-hidden', String(!open));
    var button = trigger();
    if (button) {
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    }
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('.pmd-r2-mobile-menu,[data-pmd-r2-mobile-menu]');
    if (button) {
      event.preventDefault();
      setOpen(!html.classList.contains('pmd-sm2-mobile-open'));
      return;
    }
    if (event.target === backdrop) setOpen(false);
    if (event.target.closest('#pmd-side-menu2 a')) setOpen(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 820) setOpen(false);
  }, { passive: true });

  window.PMDSideMenu2MobileDrawer = {
    version: '1.0.0',
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    isOpen: function () { return html.classList.contains('pmd-sm2-mobile-open'); }
  };
})();
</script>


<!-- PMD_SM2_ACCOUNT_RUNTIME_V11_START -->
<script id="pmd-side-menu2-account-runtime-v11">
(function () {
  'use strict';

  if (window.PMDSideMenu2AccountRuntimeV11) {
    return;
  }

  function findNativeProfileControl() {
    var selectors = [
      'a[href*="/profile"]',
      'a[href*="/account"]',
      'a[href*="profile"]',
      '[data-profile-url]',
      '[data-action="profile"]'
    ];

    for (var index = 0; index < selectors.length; index += 1) {
      var controls = document.querySelectorAll(selectors[index]);

      for (var item = 0; item < controls.length; item += 1) {
        var control = controls[item];

        if (
          !control.closest('.pmd-sm2__account-footer') &&
          control.getAttribute('href') !== '#'
        ) {
          return control;
        }
      }
    }

    return null;
  }

  function findNativeLogoutControl() {
    var selectors = [
      'a[href*="logout"]',
      'button[data-action*="logout"]',
      '[data-logout]',
      'form[action*="logout"] button',
      'form[action*="logout"] input[type="submit"]'
    ];

    for (var index = 0; index < selectors.length; index += 1) {
      var controls = document.querySelectorAll(selectors[index]);

      for (var item = 0; item < controls.length; item += 1) {
        var control = controls[item];

        if (!control.closest('.pmd-sm2__account-footer')) {
          return control;
        }
      }
    }

    return null;
  }

  function openProfile() {
    var nativeControl = findNativeProfileControl();

    if (nativeControl) {
      var href = nativeControl.getAttribute('href');

      if (href && href !== '#') {
        window.location.href = nativeControl.href;
        return;
      }

      nativeControl.click();
      return;
    }

    window.location.href = '/admin/account';
  }

  function logout() {
    var nativeControl = findNativeLogoutControl();

    if (nativeControl) {
      var form = nativeControl.closest('form');

      if (form) {
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit(nativeControl);
        } else {
          form.submit();
        }

        return;
      }

      var href = nativeControl.getAttribute('href');

      if (href && href !== '#') {
        window.location.href = nativeControl.href;
        return;
      }

      nativeControl.click();
      return;
    }

    window.location.href = '/admin/logout';
  }

  document.addEventListener('click', function (event) {
    var profile = event.target.closest('[data-pmd-sm2-profile]');

    if (profile) {
      event.preventDefault();
      openProfile();
      return;
    }

    var logoutButton = event.target.closest('[data-pmd-sm2-logout]');

    if (logoutButton) {
      event.preventDefault();

      if (window.confirm('Are you sure you want to log out?')) {
        logout();
      }
    }
  });

  window.PMDSideMenu2AccountRuntimeV11 = {
    version: '11.0.0',
    openProfile: openProfile,
    logout: logout
  };
})();
</script>
<!-- PMD_SM2_ACCOUNT_RUNTIME_V11_END -->

