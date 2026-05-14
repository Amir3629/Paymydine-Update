<div class="sidebar" role="navigation">
    <div id="navSidebar" class="nav-sidebar">
        <div class="sidebar-mobile-brand d-md-none">
            <a class="logo" href="<?php echo e(admin_url('dashboard')); ?>" aria-label="Dashboard">
                <i class="logo-svg"></i>
            </a>
        </div>
        <?php echo $this->makePartial('side_nav_items', [
            'navItems' => $navItems,
            'navAttributes' => [
                'id' => 'side-nav-menu',
                'class' => 'nav',
            ],
        ]); ?>

    <!-- HEADER_RUNTIME_HOTFIX_V4_START -->
<script>
(function () {
  function setImp(el, prop, value) {
    if (!el) return;
    el.style.setProperty(prop, value, 'important');
  }

  function rem(el, prop) {
    if (!el) return;
    el.style.removeProperty(prop);
  }

  function applyHeaderHotfix() {
    const vw = window.innerWidth;
    const header = document.querySelector('.navbar-top');
    if (!header) return;

    const sidebar = document.querySelector('.sidebar');
    const navSidebar = document.querySelector('#navSidebar');
    const sideNavMenu = document.querySelector('#side-nav-menu');
    const toggler = header.querySelector('.navbar-toggler');

    if (!sidebar || !navSidebar) return;

    const content =
      document.querySelector('.content') ||
      document.querySelector('.main-content') ||
      document.querySelector('.page-content') ||
      document.querySelector('.content-wrapper') ||
      document.querySelector('#page-wrapper');

    // ---------- TABLET ----------
    if (vw >= 768 && vw < 1200) {
      [sidebar, navSidebar, sideNavMenu].forEach(el => {
        if (!el) return;

        // فقط چیزهایی که باعث مخفی/جابجا شدن می‌شوند
        rem(el, 'background');
        rem(el, 'background-color');
        rem(el, 'background-image');
        rem(el, 'border-right');
        rem(el, 'box-shadow');
        rem(el, 'color');
        rem(el, 'border-top-right-radius');
        rem(el, 'border-bottom-right-radius');
        rem(el, 'border-radius');

        setImp(el, 'display', 'block');
        setImp(el, 'visibility', 'visible');
        setImp(el, 'opacity', '1');
        setImp(el, 'transform', 'none');
        setImp(el, 'left', '0');
        setImp(el, 'right', 'auto');
      });

      setImp(sidebar, 'position', 'fixed');
      setImp(sidebar, 'top', '64px');
      setImp(sidebar, 'height', 'calc(100vh - 64px)');
      setImp(sidebar, 'overflow-y', 'auto');
      setImp(sidebar, 'overflow-x', 'hidden');
      setImp(sidebar, 'z-index', '1020');
      setImp(sidebar, 'border-top-right-radius', '0');
      setImp(sidebar, 'border-bottom-right-radius', '0');
      setImp(sidebar, 'border-radius', '0');

      setImp(navSidebar, 'position', 'relative');
      setImp(navSidebar, 'top', '0');
      setImp(navSidebar, 'height', '100%');
      setImp(navSidebar, 'overflow', 'visible');
      setImp(navSidebar, 'border-top-right-radius', '0');
      setImp(navSidebar, 'border-bottom-right-radius', '0');
      setImp(navSidebar, 'border-radius', '0');

      navSidebar.classList.add('show');
      navSidebar.classList.remove('collapse');

      document.body.classList.add('sidebar-expanded');
      document.body.classList.remove('sidebar-collapsed');

      const sidebarWidth =
        sidebar.getBoundingClientRect().width ||
        parseFloat(getComputedStyle(sidebar).width) ||
        230;

      if (content && sidebarWidth > 0) {
        setImp(content, 'margin-left', Math.round(sidebarWidth) + 'px');
      }

      if (toggler) {
        setImp(toggler, 'display', 'none');
      }
    }

    // ---------- MOBILE ----------
    if (vw < 768) {
      if (toggler) {
        setImp(toggler, 'display', 'block');
      }

      if (content) {
        rem(content, 'margin-left');
      }

      sidebar.style.removeProperty('position');
      sidebar.style.removeProperty('top');
      sidebar.style.removeProperty('height');
      sidebar.style.removeProperty('overflow-y');
      sidebar.style.removeProperty('overflow-x');
      sidebar.style.removeProperty('z-index');
      sidebar.style.removeProperty('border-top-right-radius');
      sidebar.style.removeProperty('border-bottom-right-radius');
      sidebar.style.removeProperty('border-radius');

      navSidebar.style.removeProperty('position');
      navSidebar.style.removeProperty('top');
      navSidebar.style.removeProperty('height');
      navSidebar.style.removeProperty('overflow');
      navSidebar.style.removeProperty('border-top-right-radius');
      navSidebar.style.removeProperty('border-bottom-right-radius');
      navSidebar.style.removeProperty('border-radius');
    }

    // ---------- DESKTOP ----------
    if (vw >= 1200) {
      if (toggler) {
        toggler.style.removeProperty('display');
      }

      if (content) {
        rem(content, 'margin-left');
      }

      sidebar.style.removeProperty('border-top-right-radius');
      sidebar.style.removeProperty('border-bottom-right-radius');
      sidebar.style.removeProperty('border-radius');

      navSidebar.style.removeProperty('border-top-right-radius');
      navSidebar.style.removeProperty('border-bottom-right-radius');
      navSidebar.style.removeProperty('border-radius');
    }
  }

  function run() {
    try {
      applyHeaderHotfix();
    } catch (e) {
      console.error('HEADER_RUNTIME_HOTFIX_V4', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  window.addEventListener('load', run);
  window.addEventListener('resize', run);

  setTimeout(run, 100);
  setTimeout(run, 400);
  setTimeout(run, 900);
})();
</script>
<!-- HEADER_RUNTIME_HOTFIX_V4_END -->
</div>
</div>







<!-- TOOLBAR_BUTTONS_RUNTIME_FIX_V1_START -->
<!-- Disabled: toolbar button layout is now CSS-owned by pmd-admin/components/toolbar-buttons.css. -->
<!-- TOOLBAR_BUTTONS_RUNTIME_FIX_V1_END -->

<!-- TOOLBAR_BUTTONS_RUNTIME_FIX_V2_START -->
<!-- Disabled: toolbar button layout is now CSS-owned by pmd-admin/components/toolbar-buttons.css. -->
<!-- TOOLBAR_BUTTONS_RUNTIME_FIX_V2_END -->


<!-- ORDER_HEADER_RUNTIME_FIX_V3_START -->
<script>
(function () {

  function set(el, prop, value) {
    if (!el) return;
    el.style.setProperty(prop, value, 'important');
  }

  function fix() {
    var root = document.querySelector('.order-info-header');
    if (!root) return;

    set(root, 'margin-top', '16px');
    set(root, 'align-items', 'stretch');

    var status = root.querySelector('.header-status-clickable');
    if (status) {
      set(status, 'display', 'inline-flex');
      set(status, 'align-items', 'center');
      set(status, 'justify-content', 'center');
      set(status, 'gap', '8px');
      set(status, 'height', '40px');
      set(status, 'min-height', '40px');
      set(status, 'padding', '0 14px');
      set(status, 'line-height', '1');
    }

    var assignee = root.querySelector('.header-assignee-clickable');
    if (assignee) {
      set(assignee, 'display', 'inline-flex');
      set(assignee, 'align-items', 'center');
      set(assignee, 'justify-content', 'center');
      set(assignee, 'min-height', '40px');
      set(assignee, 'padding', '0 14px');
      set(assignee, 'line-height', '1');
    }

    root.querySelectorAll('.invoice-icon-btn, .send-invoice-icon-btn, .note-icon-btn').forEach(function(btn){
      set(btn, 'display', 'inline-flex');
      set(btn, 'align-items', 'center');
      set(btn, 'justify-content', 'center');
      set(btn, 'width', '40px');
      set(btn, 'height', '40px');
      set(btn, 'min-width', '40px');
      set(btn, 'min-height', '40px');
      set(btn, 'padding', '0');
      set(btn, 'line-height', '1');
    });

    root.querySelectorAll('.header-status-clickable i, .invoice-icon-btn i, .send-invoice-icon-btn i, .note-icon-btn i').forEach(function(icon){
      set(icon, 'display', 'inline-flex');
      set(icon, 'align-items', 'center');
      set(icon, 'justify-content', 'center');
      set(icon, 'width', '1em');
      set(icon, 'height', '1em');
      set(icon, 'line-height', '1');
      set(icon, 'margin', '0');
      set(icon, 'padding', '0');
    });
  }

  function run() {
    try { fix(); } catch(e) { console.error('ORDER_HEADER_FIX_V3', e); }
  }

  // اجرا چند مرحله‌ای (خیلی مهم)
  window.addEventListener('load', function(){
    setTimeout(run, 200);
    setTimeout(run, 800);
    setTimeout(run, 1500);
    setTimeout(run, 3000);
  });

  // اگر JS های دیگر خراب کردند، دوباره اصلاح کن
  var observer = new MutationObserver(function(){
    run();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
</script>
<!-- ORDER_HEADER_RUNTIME_FIX_V3_END -->


<!-- ICON_BUTTON_FIX_V1_START -->
<!-- Disabled: toolbar button layout is now CSS-owned by pmd-admin/components/toolbar-buttons.css. -->
<!-- ICON_BUTTON_FIX_V1_END -->


<!-- TOOLBAR_STABILIZER_V1_START -->
<!-- Disabled: toolbar button layout is now CSS-owned by pmd-admin/components/toolbar-buttons.css. -->
<!-- TOOLBAR_STABILIZER_V1_END -->


<!-- TOOLBAR_STABILIZER_V2_START -->
<!-- Disabled: toolbar button layout is now CSS-owned by pmd-admin/components/toolbar-buttons.css. -->
<!-- TOOLBAR_STABILIZER_V2_END -->

<?php /**PATH /var/www/paymydine/app/admin/views/_partials/side_nav.blade.php ENDPATH**/ ?>