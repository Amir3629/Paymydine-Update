{{-- 
PMD_SINGLE_SIDE_MENU_MARKUP_V3

Canonical Side Menu markup.
All supported Admin pages include this exact file.
Icons use the Tabler Icons outline set.
--}}

@php
    $pmdSingleMenuPath = trim(request()->path(), '/');

    $pmdActive = function ($paths) use ($pmdSingleMenuPath) {
        foreach ((array) $paths as $path) {
            if (
                $pmdSingleMenuPath === 'admin/'.$path ||
                str_starts_with(
                    $pmdSingleMenuPath,
                    'admin/'.$path.'/'
                )
            ) {
                return true;
            }
        }

        return false;
    };
@endphp

<aside id="pmd-side-menu2" aria-label="Admin navigation">
    <div class="pmd-sm2__brand" aria-label="PayMyDine">
        <span id="pmd-side-menu2-logo" class="pmd-sm2__mark" aria-hidden="true"></span>
    </div>

    <nav class="pmd-sm2__nav">
        <a class="pmd-sm2__item {{ $pmdActive(['dashboard']) ? 'is-active' : '' }}" href="{{ admin_url('dashboard') }}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/></svg>
            <span class="pmd-sm2__label">Dashboard</span>
        </a>

        <a class="pmd-sm2__item {{ $pmdActive(['orders']) ? 'is-active' : '' }}" href="{{ admin_url('orders') }}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304"/><path d="M9 11v-5a3 3 0 0 1 6 0v5"/></svg>
            <span class="pmd-sm2__label">Orders</span>
        </a>

        <a class="pmd-sm2__item {{ $pmdActive(['reservations', 'reservations2']) ? 'is-active' : '' }}" href="{{ admin_url('reservations2') }}" aria-current="page">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12"/><path d="M16 3l0 4"/><path d="M8 3l0 4"/><path d="M4 11l16 0"/><path d="M8 15h2v2h-2l0 -2"/></svg>
            <span class="pmd-sm2__label">Reservations</span>
        </a>

        <a class="pmd-sm2__item {{ $pmdActive(['coupons']) ? 'is-active' : '' }}" href="{{ admin_url('coupons') }}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l0 2"/><path d="M15 11l0 2"/><path d="M15 17l0 2"/><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2"/></svg>
            <span class="pmd-sm2__label">Coupons & Gifts</span>
        </a>

        <div class="pmd-sm2__dropdown" data-pmd-sm2-dropdown="restaurant">
            <button type="button" class="pmd-sm2__dropdown-toggle" data-pmd-sm2-dropdown-toggle aria-expanded="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12m0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3"/></svg>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10"/><path d="M7 20h10"/><path d="M9 16v4"/><path d="M15 16v4"/></svg>
            <span class="pmd-sm2__label">Kitchen Display</span>
        </a>

        <div class="pmd-sm2__dropdown" data-pmd-sm2-dropdown="design">
            <button type="button" class="pmd-sm2__dropdown-toggle" data-pmd-sm2-dropdown-toggle aria-expanded="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25"/><path d="M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/></svg>
                <span class="pmd-sm2__label">Design</span>
            </button>
            <div class="pmd-sm2__submenu"><div class="pmd-sm2__submenu-inner">
                <a class="pmd-sm2__subitem" href="{{ admin_url('themes') }}">Themes</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('mail_templates') }}">Mail Templates</a>
            </div></div>
        </div>

        <div class="pmd-sm2__dropdown" data-pmd-sm2-dropdown="system">
            <button type="button" class="pmd-sm2__dropdown-toggle" data-pmd-sm2-dropdown-toggle aria-expanded="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/></svg>
                <span class="pmd-sm2__label">System</span>
            </button>
            <div class="pmd-sm2__submenu"><div class="pmd-sm2__submenu-inner">
                <a class="pmd-sm2__subitem" href="{{ admin_url('settings') }}">Settings</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('staffs') }}">Staff</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('system_logs') }}">System Logs</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('pos_configs') }}">POS Sync Settings</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('terminal_devices') }}">Terminal Devices</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('statuses') }}">Statuses</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('payments') }}">Payments</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('tips') }}">Tips</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('languages') }}">Languages</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('currencies') }}">Currencies</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('countries') }}">Countries</a>
            </div></div>
        </div>

        <div class="pmd-sm2__dropdown" data-pmd-sm2-dropdown="tools">
            <button type="button" class="pmd-sm2__dropdown-toggle" data-pmd-sm2-dropdown-toggle aria-expanded="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5"/></svg>
                <span class="pmd-sm2__label">Tools</span>
            </button>
            <div class="pmd-sm2__submenu"><div class="pmd-sm2__submenu-inner">
                <a class="pmd-sm2__subitem" href="{{ admin_url('kds_stations') }}">Manage KDS Stations</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('media_manager') }}">Media Manager</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('dashboardkitchen') }}">Main Kitchen</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('dashboardkitchen') }}?station=bar">Bar / Drinks</a>
                <a class="pmd-sm2__subitem" href="{{ admin_url('reviews') }}">Customer Reviews</a>
                <a class="pmd-sm2__subitem" href="/admin/quick-mode?preview=pmdquick2026">Quick Mode</a>
            </div></div>
        </div>
    </nav>

    <div class="pmd-sm2__footer">
        <button type="button" class="pmd-sm2__toggle" data-pmd-sm2-toggle aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6"/></svg>
            <span>Collapse menu</span>
        </button>
    </div>
</aside>

<script id="pmd-r2-header-controls-v1">
(function () {
  'use strict';

  if (location.pathname.replace(/\/+$/, '') !== '/admin/reservations2') return;
  if (window.PMDR2HeaderControlsV1) return;

  function createButton(className, label, svg) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.innerHTML = svg;
    return button;
  }

  function install() {
    var header = document.getElementById('pmd-r2-clean-header');
    if (!header) return false;

    var title = header.querySelector('.pmd-r2-clean-title');
    var actions = header.querySelector('.pmd-r2-clean-actions');
    if (!title || !actions) return false;

    var leading = header.querySelector('.pmd-r2-clean-leading');
    if (!leading) {
      leading = document.createElement('div');
      leading.className = 'pmd-r2-clean-leading';

      var back = createButton(
        'pmd-r2-header-back',
        'Back',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6l6 6"/></svg>'
      );

      back.addEventListener('click', function () {
        if (history.length > 1) history.back();
        else location.href = '/admin/dashboard';
      });

      header.insertBefore(leading, title);
      leading.appendChild(back);
      leading.appendChild(title);
    }

    var mobile = header.querySelector('.pmd-r2-mobile-menu');
    if (!mobile) {
      mobile = createButton(
        'pmd-r2-mobile-menu',
        'Open navigation',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
      );

      mobile.setAttribute('aria-expanded', 'false');
      mobile.addEventListener('click', function () {
        var open = document.documentElement.classList.toggle('pmd-sm2-mobile-open');
        mobile.setAttribute('aria-expanded', String(open));
        mobile.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      });

      actions.insertBefore(mobile, actions.firstChild);
    }

    document.addEventListener('click', function (event) {
      if (!document.documentElement.classList.contains('pmd-sm2-mobile-open')) return;
      if (event.target.closest('#pmd-side-menu2, .pmd-r2-mobile-menu')) return;
      document.documentElement.classList.remove('pmd-sm2-mobile-open');
      mobile.setAttribute('aria-expanded', 'false');
      mobile.setAttribute('aria-label', 'Open navigation');
    });

    window.PMDR2HeaderControlsV1 = {
      version: '1.0.0',
      back: true,
      mobileMenu: true
    };

    return true;
  }

  if (install()) return;

  var observer = new MutationObserver(function () {
    if (install()) observer.disconnect();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.setTimeout(function () {
    install();
    observer.disconnect();
  }, 2000);
})();
</script>