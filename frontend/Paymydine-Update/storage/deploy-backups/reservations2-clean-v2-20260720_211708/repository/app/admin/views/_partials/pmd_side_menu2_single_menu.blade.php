{{-- 
PMD_SINGLE_SIDE_MENU_MARKUP_V5

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
    <span
        class="pmd-sm2__brand-full-render"
        aria-hidden="true"
    ></span>

    <span
        class="pmd-sm2__brand-mark-render"
        aria-hidden="true"
    ></span>

    <button
        type="button"
        class="pmd-sm2__brand-toggle"
        aria-label="Collapse side menu"
        title="Collapse side menu"
    >
        <span
            class="pmd-sm2__brand-toggle-icon"
            aria-hidden="true"
        ></span>
    </button>
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

<script id="pmd-r2-header-controls-v3">
(function () {
  'use strict';

  if (location.pathname.replace(/\/+$/, '') !== '/admin/reservations2') return;
  if (window.PMDR2HeaderControlsV3) return;

  function createButton(className, label, svg) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.innerHTML = svg;
    return button;
  }

  function installCss() {
    if (document.getElementById('pmd-r2-mobile-drawer-v2')) return;
    var style = document.createElement('style');
    style.id = 'pmd-r2-mobile-drawer-v2';
    style.textContent = [
      '@media(max-width:820px){',
      'html,body,.page-wrapper,.page-content,.content-wrapper{top:0!important;margin-top:0!important;padding-top:0!important;}',
      '.page-wrapper{position:absolute!important;inset:0 auto auto 0!important;width:100vw!important;}',
      '#pmd-reservations2{top:0!important;margin-top:0!important;padding-top:10px!important;transform:none!important;}',
      '#pmd-r2-clean-header{height:40px!important;min-height:40px!important;margin-top:0!important;}',
      '#pmd-r2-clean-header .pmd-r2-clean-title{display:none!important;}',
      '#pmd-r2-clean-header .pmd-r2-clean-leading{flex:1 1 auto!important;gap:6px!important;}',
      '#pmd-r2-clean-header .pmd-r2-clean-actions{gap:6px!important;}',
      '#pmd-r2-clean-header .pmd-r2-mobile-menu{display:inline-flex!important;}',
      '#pmd-r2-clean-header .pmd-r2-header-back,#pmd-r2-clean-header .pmd-r2-mobile-menu,#pmd-r2-clean-header .pmd-r2-clean-create,#pmd-r2-clean-header #notif-root,#pmd-r2-clean-header #notif-root>.media-toolbar-tooltip-wrap,#pmd-r2-clean-header #notifDropdown{width:40px!important;height:40px!important;min-width:40px!important;}',
      '#pmd-r2-clean-header #bell-icon{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;margin:0!important;}',
      '#pmd-r2-clean-header #notification-count{top:-5px!important;right:-6px!important;}',
      '#pmd-r2-mobile-nav{display:none!important;}',
      'body>#pmd-side-menu2{display:flex!important;position:fixed!important;left:10px!important;top:10px!important;bottom:10px!important;width:80vw!important;max-width:360px!important;height:auto!important;min-height:0!important;z-index:2147483646!important;transform:translateX(calc(-100% - 28px))!important;opacity:1!important;visibility:visible!important;pointer-events:none!important;border-radius:0 24px 24px 0!important;overflow:hidden!important;transition:transform 280ms cubic-bezier(.22,.75,.24,1)!important;box-shadow:0 24px 70px rgba(0,0,0,.28)!important;}',
      'html.pmd-r2-drawer-open body>#pmd-side-menu2{display:flex!important;transform:translateX(0)!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;}',
      'body>#pmd-side-menu2 .pmd-sm2__footer{display:none!important;}',
      'body>#pmd-side-menu2 .pmd-sm2__brand{height:104px!important;min-height:104px!important;}',
      'body>#pmd-side-menu2 .pmd-sm2__label{display:block!important;}',
      'body>#pmd-side-menu2 .pmd-sm2__item,body>#pmd-side-menu2 .pmd-sm2__dropdown-toggle{justify-content:flex-start!important;}',
      'body.pmd-r2-drawer-locked{overflow:hidden!important;}',
      '#pmd-r2-drawer-backdrop{position:fixed;inset:0;z-index:2147483645;background:rgba(8,18,16,.30);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity 280ms ease,visibility 280ms ease;}',
      'html.pmd-r2-drawer-open #pmd-r2-drawer-backdrop{opacity:1;visibility:visible;pointer-events:auto;}',
      '}',
      '@media(max-width:420px){body>#pmd-side-menu2{width:82vw!important;max-width:340px!important;left:8px!important;top:8px!important;bottom:8px!important;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function install() {
    var header = document.getElementById('pmd-r2-clean-header');
    var side = document.getElementById('pmd-side-menu2');
    if (!header || !side) return false;

    var title = header.querySelector('.pmd-r2-clean-title');
    var actions = header.querySelector('.pmd-r2-clean-actions');
    if (!title || !actions) return false;

    installCss();

    if (side.parentElement !== document.body) document.body.appendChild(side);

    var leading = header.querySelector('.pmd-r2-clean-leading');
    var back = header.querySelector('.pmd-r2-header-back');
    if (!leading) {
      leading = document.createElement('div');
      leading.className = 'pmd-r2-clean-leading';
      header.insertBefore(leading, title);
      leading.appendChild(title);
    }

    if (!back) {
      back = createButton('pmd-r2-header-back','Back','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6l6 6"/></svg>');
      back.addEventListener('click', function () {
        if (history.length > 1) history.back();
        else location.href = '/admin/dashboard';
      });
      leading.insertBefore(back, leading.firstChild);
    }

    var mobile = header.querySelector('.pmd-r2-mobile-menu');
    if (!mobile) {
      mobile = createButton('pmd-r2-mobile-menu','Open navigation','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>');
      mobile.setAttribute('aria-expanded', 'false');
    }

    if (mobile.parentElement !== leading || mobile.previousElementSibling !== back) {
      leading.insertBefore(mobile, back.nextSibling);
    }

    var oldPanel = document.getElementById('pmd-r2-mobile-nav');
    if (oldPanel) oldPanel.remove();

    var backdrop = document.getElementById('pmd-r2-drawer-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'pmd-r2-drawer-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }

    function setOpen(open) {
      document.documentElement.classList.toggle('pmd-r2-drawer-open', open);
      document.documentElement.classList.remove('pmd-sm2-mobile-open');
      document.body.classList.toggle('pmd-r2-drawer-locked', open);
      mobile.setAttribute('aria-expanded', String(open));
      mobile.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      backdrop.setAttribute('aria-hidden', String(!open));
    }

    if (!mobile.dataset.pmdR2DrawerV3Bound) {
      mobile.dataset.pmdR2DrawerV3Bound = '1';
      mobile.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(!document.documentElement.classList.contains('pmd-r2-drawer-open'));
      });
    }

    if (!backdrop.dataset.pmdR2DrawerV3Bound) {
      backdrop.dataset.pmdR2DrawerV3Bound = '1';
      backdrop.addEventListener('click', function () { setOpen(false); });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });

    document.querySelectorAll('#pmd-side-menu2 a').forEach(function (link) {
      if (link.dataset.pmdR2DrawerV3Bound) return;
      link.dataset.pmdR2DrawerV3Bound = '1';
      link.addEventListener('click', function () { setOpen(false); });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) setOpen(false);
    }, { passive: true });

    window.PMDR2HeaderControlsV3 = {
      version: '3.0.0',
      mobileMode: 'body-level-drawer-80-percent',
      side: side,
      back: back,
      trigger: mobile,
      backdrop: backdrop,
      open: function () { setOpen(true); },
      close: function () { setOpen(false); }
    };

    return true;
  }

  if (install()) return;

  var observer = new MutationObserver(function () {
    if (install()) observer.disconnect();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(function () { install(); observer.disconnect(); }, 2500);
})();
</script>

<!-- PMD_SIDE_MENU_CHATGPT_V1_START -->
<style id="pmd-side-menu-chatgpt-v1">
  /*
   * Stable brand geometry.
   * No background-position cropping and no oversized background image.
   */
  #pmd-side-menu2 .pmd-sm2__brand {
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    width: 100% !important;
    height: 76px !important;
    min-height: 76px !important;
    padding: 14px 14px 10px !important;
    overflow: visible !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand-assets {
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    height: 44px !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand-full,
  #pmd-side-menu2 .pmd-sm2__brand-mark {
    object-fit: contain !important;
    object-position: left center !important;
    background: none !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
    visibility: visible !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand-full {
    display: block !important;
    width: min(156px, 100%) !important;
    max-width: 156px !important;
    height: 42px !important;
    opacity: 1 !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand-mark {
    display: none !important;
    width: 42px !important;
    height: 42px !important;
    opacity: 1 !important;
  }

  #pmd-side-menu2-logo {
    display: none !important;
    background: none !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand-toggle {
    box-sizing: border-box !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 10px !important;
    background: transparent !important;
    color: rgba(255, 255, 255, .88) !important;
    box-shadow: none !important;
    cursor: pointer !important;
    opacity: .82 !important;
    transition:
      background-color 160ms ease,
      opacity 160ms ease !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand-toggle:hover {
    opacity: 1 !important;
    background: rgba(255, 255, 255, .10) !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand-toggle svg {
    display: block !important;
    width: 20px !important;
    height: 20px !important;
    fill: none !important;
    stroke: currentColor !important;
  }

  /* The old bottom collapse control is no longer the visible control. */
  #pmd-side-menu2 .pmd-sm2__footer {
    display: none !important;
  }

  /*
   * Collapsed state:
   * show only LOGO.svg.
   * Hovering its brand area reveals an expand button, like ChatGPT.
   */
  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand {
    position: relative !important;
    justify-content: center !important;
    height: 76px !important;
    min-height: 76px !important;
    padding: 14px 8px 10px !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-assets {
    flex: 0 0 42px !important;
    width: 42px !important;
    height: 42px !important;
    justify-content: center !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-full {
    display: none !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-mark {
    display: block !important;
    object-position: center !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-toggle {
    position: absolute !important;
    inset: 14px auto auto 50% !important;
    transform: translateX(-50%) !important;
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    opacity: 0 !important;
    pointer-events: none !important;
    background: rgba(255, 255, 255, .10) !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-toggle svg {
    transform: rotate(180deg) !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand:hover
  .pmd-sm2__brand-mark {
    opacity: 0 !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand:hover
  .pmd-sm2__brand-toggle {
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  @media (max-width: 820px) {
    /*
     * The drawer uses the full PMD logo.
     * No desktop collapse/expand control inside mobile drawer.
     */
    body > #pmd-side-menu2 .pmd-sm2__brand {
      height: 82px !important;
      min-height: 82px !important;
      padding: 16px 16px 10px !important;
    }

    body > #pmd-side-menu2 .pmd-sm2__brand-full {
      display: block !important;
      width: min(170px, 100%) !important;
      max-width: 170px !important;
      height: 46px !important;
    }

    body > #pmd-side-menu2 .pmd-sm2__brand-mark,
    body > #pmd-side-menu2 .pmd-sm2__brand-toggle {
      display: none !important;
    }
  }
</style>

<script id="pmd-r2-header-controls-v4">
(function () {
  'use strict';

  if (
    location.pathname.replace(/\/+$/, '') !==
    '/admin/reservations2'
  ) {
    return;
  }

  if (window.PMDR2HeaderControlsV4) return;

  function install() {
    var header =
      document.getElementById('pmd-r2-clean-header');

    var side =
      document.getElementById('pmd-side-menu2');

    if (!header || !side) return false;

    var oldTrigger =
      header.querySelector('.pmd-r2-mobile-menu');

    if (!oldTrigger) return false;

    /*
     * Critical fix:
     * cloning removes every obsolete V2/V3 click listener,
     * including the capture listener that called
     * stopImmediatePropagation().
     */
    var trigger = oldTrigger.cloneNode(true);

    oldTrigger.replaceWith(trigger);

    trigger.removeAttribute(
      'data-pmd-r2-drawer-v3-bound'
    );

    trigger.removeAttribute(
      'data-pmd-r2-drawer-bound'
    );

    trigger.setAttribute(
      'aria-expanded',
      'false'
    );

    trigger.setAttribute(
      'aria-label',
      'Open navigation'
    );

    var backdrop =
      document.getElementById(
        'pmd-r2-drawer-backdrop'
      );

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'pmd-r2-drawer-backdrop';
      backdrop.setAttribute(
        'aria-hidden',
        'true'
      );
      document.body.appendChild(backdrop);
    }

    if (side.parentElement !== document.body) {
      document.body.appendChild(side);
    }

    var scrollY = 0;

    function setOpen(open) {
      if (open) {
        scrollY =
          window.scrollY ||
          document.documentElement.scrollTop ||
          0;

        document.documentElement
          .classList
          .add('pmd-r2-drawer-open');

        document.documentElement
          .classList
          .remove('pmd-sm2-mobile-open');

        document.body
          .classList
          .add('pmd-r2-drawer-locked');

        /*
         * Freeze the page in its exact visual position.
         * The background must not move left, right, up or down.
         */
        document.body.style.setProperty(
          'position',
          'fixed',
          'important'
        );

        document.body.style.setProperty(
          'top',
          (-scrollY) + 'px',
          'important'
        );

        document.body.style.setProperty(
          'left',
          '0',
          'important'
        );

        document.body.style.setProperty(
          'right',
          '0',
          'important'
        );

        document.body.style.setProperty(
          'width',
          '100%',
          'important'
        );
      } else {
        document.documentElement
          .classList
          .remove('pmd-r2-drawer-open');

        document.body
          .classList
          .remove('pmd-r2-drawer-locked');

        document.body.style.removeProperty(
          'position'
        );

        document.body.style.removeProperty(
          'top'
        );

        document.body.style.removeProperty(
          'left'
        );

        document.body.style.removeProperty(
          'right'
        );

        document.body.style.removeProperty(
          'width'
        );

        window.scrollTo(0, scrollY);
      }

      trigger.setAttribute(
        'aria-expanded',
        String(open)
      );

      trigger.setAttribute(
        'aria-label',
        open
          ? 'Close navigation'
          : 'Open navigation'
      );

      backdrop.setAttribute(
        'aria-hidden',
        String(!open)
      );
    }

    /*
     * Capture mode now belongs only to V4.
     * No obsolete listener remains because the node was cloned.
     */
    trigger.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopPropagation();

        setOpen(
          !document.documentElement
            .classList
            .contains('pmd-r2-drawer-open')
        );
      },
      true
    );

    backdrop.onclick = function () {
      setOpen(false);
    };

    document.addEventListener(
      'keydown',
      function (event) {
        if (event.key === 'Escape') {
          setOpen(false);
        }
      }
    );

    side.querySelectorAll('a').forEach(
      function (link) {
        link.addEventListener(
          'click',
          function () {
            setOpen(false);
          }
        );
      }
    );

    var brandToggle =
      side.querySelector(
        '.pmd-sm2__brand-toggle'
      );

    var footerToggle =
      side.querySelector(
        '[data-pmd-sm2-toggle]'
      );

    if (brandToggle && footerToggle) {
      brandToggle.addEventListener(
        'click',
        function (event) {
          event.preventDefault();
          event.stopPropagation();
          footerToggle.click();
        }
      );
    }

    window.addEventListener(
      'resize',
      function () {
        if (window.innerWidth > 820) {
          setOpen(false);
        }
      },
      { passive: true }
    );

    window.PMDR2HeaderControlsV4 = {
      version: '4.0.0',
      mobileMode:
        'body-drawer-clean-listener',
      trigger: trigger,
      side: side,
      backdrop: backdrop,
      open: function () {
        setOpen(true);
      },
      close: function () {
        setOpen(false);
      }
    };

    console.info(
      '[PMD R2 Header Controls V4] Ready',
      window.PMDR2HeaderControlsV4
    );

    return true;
  }

  if (install()) return;

  var observer = new MutationObserver(
    function () {
      if (install()) {
        observer.disconnect();
      }
    }
  );

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  window.setTimeout(
    function () {
      install();
      observer.disconnect();
    },
    3000
  );
})();
</script>
<!-- PMD_SIDE_MENU_CHATGPT_V1_END -->

<!-- PMD_BRAND_SINGLE_AUTHORITY_V7_START -->
<style id="pmd-brand-single-authority-v7">
  /* ---------- Brand row ---------- */

  #pmd-side-menu2 .pmd-sm2__brand {
    box-sizing: border-box !important;
    position: relative !important;

    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;

    flex: 0 0 64px !important;
    width: 100% !important;
    height: 64px !important;
    min-height: 64px !important;
    max-height: 64px !important;

    margin: 0 !important;
    padding: 10px 12px !important;
    gap: 8px !important;

    overflow: visible !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  /* ---------- Full PMD logo ---------- */

  #pmd-side-menu2 .pmd-sm2__brand-full-render {
    display: block !important;
    flex: 1 1 auto !important;

    width: 116px !important;
    max-width: 128px !important;
    height: 36px !important;

    margin: 0 !important;
    padding: 0 !important;

    background-image:
      url("/app/admin/assets/images/pmd-brand-full.svg?v=single-v7")
      !important;

    background-repeat: no-repeat !important;
    background-position: left center !important;
    background-size: contain !important;

    visibility: visible !important;
    opacity: 1 !important;
  }

  /* ---------- Small PMD mark ---------- */

  #pmd-side-menu2 .pmd-sm2__brand-mark-render {
    display: none !important;

    width: 40px !important;
    height: 40px !important;

    background-image:
      url("/app/admin/assets/images/pmd-brand-mark.svg?v=single-v7")
      !important;

    background-repeat: no-repeat !important;
    background-position: center !important;
    background-size: contain !important;

    visibility: visible !important;
    opacity: 1 !important;
  }

  /* ---------- ChatGPT-style sidebar button ---------- */

  #pmd-side-menu2 .pmd-sm2__brand-toggle {
    box-sizing: border-box !important;
    position: relative !important;

    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    flex: 0 0 36px !important;
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    max-width: 36px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 0 !important;
    border-radius: 10px !important;

    background: rgba(255,255,255,.09) !important;
    color: #f3fbf8 !important;

    box-shadow: none !important;
    cursor: pointer !important;

    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;

    transition:
      background-color 150ms ease,
      opacity 150ms ease !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand-toggle:hover {
    background: rgba(255,255,255,.17) !important;
  }

  /*
   * The icon is a CSS mask on a real child element.
   * It does not depend on SVG path rendering.
   */
  #pmd-side-menu2 .pmd-sm2__brand-toggle-icon {
    display: block !important;

    width: 21px !important;
    height: 21px !important;

    background-color: #f3fbf8 !important;

    -webkit-mask-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='3' y='4' width='18' height='16' rx='2.5' fill='none' stroke='%23000' stroke-width='2'/%3E%3Cpath d='M9 4v16M15 9l3 3-3 3' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
      !important;

    -webkit-mask-repeat: no-repeat !important;
    -webkit-mask-position: center !important;
    -webkit-mask-size: contain !important;

    mask-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='3' y='4' width='18' height='16' rx='2.5' fill='none' stroke='%23000' stroke-width='2'/%3E%3Cpath d='M9 4v16M15 9l3 3-3 3' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
      !important;

    mask-repeat: no-repeat !important;
    mask-position: center !important;
    mask-size: contain !important;

    opacity: 1 !important;
    visibility: visible !important;
  }

  /* ---------- Compact navigation ---------- */

  #pmd-side-menu2 .pmd-sm2__nav {
    box-sizing: border-box !important;

    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    justify-content: flex-start !important;

    flex: 1 1 auto !important;
    width: 100% !important;

    margin: 0 !important;
    padding: 2px 10px 14px !important;
    gap: 4px !important;

    overflow-y: auto !important;
    overflow-x: hidden !important;
  }

  #pmd-side-menu2 .pmd-sm2__item,
  #pmd-side-menu2 .pmd-sm2__dropdown-toggle {
    min-height: 44px !important;
    height: 44px !important;

    margin: 0 !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }

  #pmd-side-menu2 .pmd-sm2__footer {
    display: none !important;
  }

  /* ---------- Collapsed desktop ---------- */

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand {
    justify-content: center !important;
    padding: 10px 7px !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-full-render {
    display: none !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-mark-render {
    display: block !important;
    flex: 0 0 40px !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-toggle {
    position: absolute !important;

    top: 10px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand:hover
  .pmd-sm2__brand-mark-render {
    opacity: 0 !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand:hover
  .pmd-sm2__brand-toggle {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
  }

  /* Reverse the internal direction in expand state. */
  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-toggle-icon {
    transform: scaleX(-1) !important;
  }

  /* ---------- Mobile drawer ---------- */

  @media (max-width: 820px) {
    html.pmd-r2-drawer-open
    body > #pmd-side-menu2 .pmd-sm2__brand {
      height: 68px !important;
      min-height: 68px !important;
      max-height: 68px !important;

      justify-content: flex-start !important;
      padding: 10px 15px !important;
    }

    html.pmd-r2-drawer-open
    body > #pmd-side-menu2
    .pmd-sm2__brand-full-render {
      display: block !important;
      flex: 0 0 140px !important;

      width: 140px !important;
      max-width: 140px !important;
      height: 40px !important;
    }

    html.pmd-r2-drawer-open
    body > #pmd-side-menu2
    .pmd-sm2__brand-mark-render,
    html.pmd-r2-drawer-open
    body > #pmd-side-menu2
    .pmd-sm2__brand-toggle {
      display: none !important;
    }

    html.pmd-r2-drawer-open
    body > #pmd-side-menu2 .pmd-sm2__label {
      display: block !important;
      position: static !important;

      flex: 1 1 auto !important;
      width: auto !important;
      max-width: none !important;
      height: auto !important;

      margin: 0 !important;
      padding: 0 !important;

      opacity: 1 !important;
      visibility: visible !important;

      transform: none !important;
      clip: auto !important;
      clip-path: none !important;

      color: inherit !important;
      font-size: 15px !important;
      line-height: 1.25 !important;
      font-weight: 700 !important;
      white-space: normal !important;
    }

    html.pmd-r2-drawer-open
    body > #pmd-side-menu2 .pmd-sm2__item,
    html.pmd-r2-drawer-open
    body > #pmd-side-menu2
    .pmd-sm2__dropdown-toggle {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;

      width: 100% !important;
      min-height: 48px !important;
      height: auto !important;

      gap: 14px !important;
      padding: 9px 13px !important;
    }
  }
</style>

<script id="pmd-brand-single-authority-v7-script">
(function () {
  'use strict';

  function install() {
    var side =
      document.getElementById('pmd-side-menu2');

    if (!side) return false;

    var toggle =
      side.querySelector('.pmd-sm2__brand-toggle');

    var footerToggle =
      side.querySelector('[data-pmd-sm2-toggle]');

    if (!toggle) return false;

    if (!toggle.dataset.pmdSingleV7Bound) {
      toggle.dataset.pmdSingleV7Bound = '1';

      toggle.addEventListener(
        'click',
        function (event) {
          event.preventDefault();
          event.stopPropagation();

          if (footerToggle) {
            footerToggle.click();
          } else {
            document.documentElement.classList.toggle(
              'pmd-sm2-collapsed'
            );
          }
        }
      );
    }

    function update() {
      var collapsed =
        document.documentElement.classList.contains(
          'pmd-sm2-collapsed'
        );

      toggle.setAttribute(
        'aria-label',
        collapsed
          ? 'Expand side menu'
          : 'Collapse side menu'
      );

      toggle.setAttribute(
        'title',
        collapsed
          ? 'Expand side menu'
          : 'Collapse side menu'
      );
    }

    update();

    var observer = new MutationObserver(update);

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: ['class']
      }
    );

    window.PMDBrandSingleAuthorityV7 = {
      version: '7.0.0',
      toggle: toggle,
      observer: observer,

      inspect: function () {
        var icon =
          toggle.querySelector(
            '.pmd-sm2__brand-toggle-icon'
          );

        var iconCss =
          icon && getComputedStyle(icon);

        return {
          collapsed:
            document.documentElement.classList.contains(
              'pmd-sm2-collapsed'
            ),

          fullLogo:
            getComputedStyle(
              side.querySelector(
                '.pmd-sm2__brand-full-render'
              )
            ).display,

          markLogo:
            getComputedStyle(
              side.querySelector(
                '.pmd-sm2__brand-mark-render'
              )
            ).display,

          buttonDisplay:
            getComputedStyle(toggle).display,

          buttonVisibility:
            getComputedStyle(toggle).visibility,

          icon: icon
            ? {
                display: iconCss.display,
                visibility: iconCss.visibility,
                background:
                  iconCss.backgroundColor,

                webkitMask:
                  iconCss.webkitMaskImage ||
                  iconCss.webkitMask
              }
            : null
        };
      }
    };

    console.info(
      '[PMD Brand Single Authority V7] Ready',
      window.PMDBrandSingleAuthorityV7.inspect()
    );

    return true;
  }

  if (install()) return;

  var observer = new MutationObserver(function () {
    if (install()) {
      observer.disconnect();
    }
  });

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );
})();
</script>
<!-- PMD_BRAND_SINGLE_AUTHORITY_V7_END -->

<!-- PMD_BRAND_HOVER_AUTHORITY_V9_START -->
<style id="pmd-brand-hover-authority-v9">
  /*
   * Expanded state:
   * small transparent control beside the full logo.
   */
  #pmd-side-menu2 .pmd-sm2__brand-toggle {
    box-sizing: border-box !important;
    position: relative !important;

    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    flex: 0 0 36px !important;
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 0 !important;
    border-radius: 9px !important;

    background: transparent !important;
    box-shadow: none !important;

    visibility: visible !important;
    opacity: .82 !important;
    pointer-events: auto !important;

    cursor: pointer !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand-toggle:hover {
    background: rgba(255,255,255,.10) !important;
    opacity: 1 !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand-toggle-icon {
    display: block !important;
    width: 22px !important;
    height: 22px !important;

    background-color: #f3fbf8 !important;

    -webkit-mask:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='3' y='4' width='18' height='16' rx='2.5' fill='none' stroke='%23000' stroke-width='2'/%3E%3Cpath d='M9 4v16M15 9l3 3-3 3' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
      center / contain no-repeat !important;

    mask:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='3' y='4' width='18' height='16' rx='2.5' fill='none' stroke='%23000' stroke-width='2'/%3E%3Cpath d='M9 4v16M15 9l3 3-3 3' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
      center / contain no-repeat !important;

    visibility: visible !important;
    opacity: 1 !important;
  }

  /*
   * Collapsed state:
   * the logo and expand control occupy the exact same box.
   */
  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand {
    position: relative !important;
    justify-content: center !important;
    padding: 10px 7px !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-mark-render {
    display: block !important;
    flex: 0 0 40px !important;

    width: 40px !important;
    height: 40px !important;

    visibility: visible !important;
    opacity: 1 !important;

    transition: opacity 120ms ease !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-toggle {
    position: absolute !important;

    top: 10px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;

    display: none !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 0 !important;
    border-radius: 0 !important;

    background: transparent !important;
    box-shadow: none !important;

    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-toggle:hover {
    background: transparent !important;
  }

  html.pmd-sm2-collapsed
  #pmd-side-menu2 .pmd-sm2__brand-toggle-icon {
    width: 25px !important;
    height: 25px !important;

    transform: scaleX(-1) !important;
  }

  /*
   * Mobile drawer has no desktop collapse control.
   */
  @media (max-width: 820px) {
    html.pmd-r2-drawer-open
    body > #pmd-side-menu2 .pmd-sm2__brand-toggle {
      display: none !important;
    }
  }
</style>

<script id="pmd-brand-hover-authority-v9-script">
(function () {
  'use strict';

  if (window.PMDBrandHoverAuthorityV9) return;

  function important(element, property, value) {
    if (!element) return;

    element.style.setProperty(
      property,
      value,
      'important'
    );
  }

  function install() {
    var side =
      document.getElementById('pmd-side-menu2');

    if (!side) return false;

    var brand =
      side.querySelector('.pmd-sm2__brand');

    var fullLogo =
      side.querySelector(
        '.pmd-sm2__brand-full-render'
      );

    var markLogo =
      side.querySelector(
        '.pmd-sm2__brand-mark-render'
      );

    var toggle =
      side.querySelector(
        '.pmd-sm2__brand-toggle'
      );

    var icon =
      side.querySelector(
        '.pmd-sm2__brand-toggle-icon'
      );

    if (
      !brand ||
      !fullLogo ||
      !markLogo ||
      !toggle ||
      !icon
    ) {
      return false;
    }

    /*
     * Remove Bootstrap/native tooltip authority.
     */
    toggle.removeAttribute('title');
    toggle.removeAttribute(
      'data-bs-original-title'
    );
    toggle.removeAttribute(
      'data-original-title'
    );

    toggle.setAttribute(
      'data-no-tooltip',
      '1'
    );

    function api() {
      return window.PMDSideMenu2GlobalV3;
    }

    function collapsed() {
      return (
        api()
          ? api().getState() === 'collapsed'
          : document.documentElement
              .classList
              .contains('pmd-sm2-collapsed')
      );
    }

    function mobileDrawer() {
      return (
        window.innerWidth <= 820 &&
        document.documentElement
          .classList
          .contains('pmd-r2-drawer-open')
      );
    }

    function showMark() {
      if (!collapsed() || mobileDrawer()) {
        return;
      }

      important(markLogo, 'display', 'block');
      important(markLogo, 'visibility', 'visible');
      important(markLogo, 'opacity', '1');

      important(toggle, 'display', 'none');
      important(toggle, 'visibility', 'hidden');
      important(toggle, 'opacity', '0');
      important(toggle, 'pointer-events', 'none');
    }

    function showExpandIcon() {
      if (!collapsed() || mobileDrawer()) {
        return;
      }

      important(markLogo, 'opacity', '0');

      important(toggle, 'display', 'inline-flex');
      important(toggle, 'align-items', 'center');
      important(toggle, 'justify-content', 'center');
      important(toggle, 'visibility', 'visible');
      important(toggle, 'opacity', '1');
      important(toggle, 'pointer-events', 'auto');
      important(toggle, 'background', 'transparent');
      important(toggle, 'border-radius', '0');
      important(toggle, 'box-shadow', 'none');
    }

    function applyState() {
      if (mobileDrawer()) {
        important(fullLogo, 'display', 'block');
        important(markLogo, 'display', 'none');
        important(toggle, 'display', 'none');
        return;
      }

      if (collapsed()) {
        showMark();
        return;
      }

      important(fullLogo, 'display', 'block');
      important(fullLogo, 'visibility', 'visible');
      important(fullLogo, 'opacity', '1');

      important(markLogo, 'display', 'none');

      important(toggle, 'display', 'inline-flex');
      important(toggle, 'visibility', 'visible');
      important(toggle, 'opacity', '.82');
      important(toggle, 'pointer-events', 'auto');
      important(toggle, 'background', 'transparent');
      important(toggle, 'border-radius', '9px');

      important(icon, 'transform', 'none');
    }

    /*
     * Replace earlier V7/V8 click handlers by cloning
     * the button once.
     */
    var cleanToggle =
      toggle.cloneNode(true);

    toggle.replaceWith(cleanToggle);
    toggle = cleanToggle;

    icon =
      toggle.querySelector(
        '.pmd-sm2__brand-toggle-icon'
      );

    toggle.removeAttribute('title');
    toggle.removeAttribute(
      'data-bs-original-title'
    );
    toggle.removeAttribute(
      'data-original-title'
    );

    toggle.setAttribute(
      'data-no-tooltip',
      '1'
    );

    brand.onmouseenter = showExpandIcon;
    brand.onmouseleave = showMark;

    toggle.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        var menuApi = api();

        if (!menuApi) {
          console.error(
            '[PMD Brand Hover V9] Side Menu API missing'
          );
          return;
        }

        var next =
          menuApi.getState() === 'expanded'
            ? 'collapsed'
            : 'expanded';

        menuApi.applyState(next);

        requestAnimationFrame(applyState);
      },
      true
    );

    window.addEventListener(
      'pmd:side-menu2-state',
      applyState
    );

    window.addEventListener(
      'resize',
      applyState,
      { passive: true }
    );

    applyState();

    window.PMDBrandHoverAuthorityV9 = {
      version: '9.0.0',
      brand: brand,
      markLogo: markLogo,
      toggle: toggle,

      apply: applyState,

      inspect: function () {
        return {
          state:
            api()?.getState() || null,

          mark: {
            display:
              getComputedStyle(markLogo).display,
            opacity:
              getComputedStyle(markLogo).opacity
          },

          toggle: {
            display:
              getComputedStyle(toggle).display,
            visibility:
              getComputedStyle(toggle).visibility,
            opacity:
              getComputedStyle(toggle).opacity,
            background:
              getComputedStyle(toggle)
                .backgroundColor,
            title:
              toggle.getAttribute('title'),
            bootstrapTitle:
              toggle.getAttribute(
                'data-bs-original-title'
              )
          }
        };
      }
    };

    console.info(
      '[PMD Brand Hover Authority V9] Ready',
      window.PMDBrandHoverAuthorityV9.inspect()
    );

    return true;
  }

  if (install()) return;

  var observer =
    new MutationObserver(function () {
      if (install()) {
        observer.disconnect();
      }
    });

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );
})();
</script>
<!-- PMD_BRAND_HOVER_AUTHORITY_V9_END -->
