<div class="sidebar" role="navigation">
    <div id="navSidebar" class="nav-sidebar">
        <div class="sidebar-mobile-brand d-md-none">
            <a class="logo" href="{{ admin_url('dashboard') }}" aria-label="Dashboard">
                <i class="logo-svg"></i>
            </a>
        </div>
        {!! $this->makePartial('side_nav_items', [
            'navItems' => $navItems,
            'navAttributes' => [
                'id' => 'side-nav-menu',
                'class' => 'nav',
            ],
        ]) !!}
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
<script>
(function () {
  function setImp(el, prop, value) {
    if (!el) return;
    el.style.setProperty(prop, value, 'important');
  }

  function fixToolbarButtons() {
    const buttons = Array.from(document.querySelectorAll(`
      .toolbar-action a.btn,
      .toolbar-action button.btn,
      .progress-indicator-container a.btn,
      .progress-indicator-container button.btn,
      .list-toolbar a.btn,
      .list-toolbar button.btn,
      .form-toolbar a.btn,
      .form-toolbar button.btn,
      .btn-toolbar a.btn,
      .btn-toolbar button.btn
    `)).filter(el => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0' && r.width > 0 && r.height > 0;
    });

    buttons.forEach((btn) => {
      setImp(btn, 'display', 'inline-flex');
      setImp(btn, 'align-items', 'center');
      setImp(btn, 'justify-content', 'center');
      setImp(btn, 'text-align', 'center');
      setImp(btn, 'vertical-align', 'middle');
      setImp(btn, 'gap', '10px');
      setImp(btn, 'height', '40px');
      setImp(btn, 'min-height', '40px');
      setImp(btn, 'width', 'auto');
      setImp(btn, 'min-width', '110px');
      setImp(btn, 'padding', '0 20px');
      setImp(btn, 'line-height', '1');
      setImp(btn, 'white-space', 'nowrap');
      setImp(btn, 'box-sizing', 'border-box');

      btn.querySelectorAll('i, svg').forEach((icon) => {
        setImp(icon, 'display', 'inline-flex');
        setImp(icon, 'align-items', 'center');
        setImp(icon, 'justify-content', 'center');
        setImp(icon, 'width', '16px');
        setImp(icon, 'height', '16px');
        setImp(icon, 'min-width', '16px');
        setImp(icon, 'min-height', '16px');
        setImp(icon, 'line-height', '1');
        setImp(icon, 'flex', '0 0 16px');
        setImp(icon, 'margin', '0');
        setImp(icon, 'padding', '0');
        setImp(icon, 'transform', 'none');
      });

      btn.querySelectorAll('span').forEach((span) => {
        setImp(span, 'display', 'inline-block');
        setImp(span, 'line-height', '1.1');
        setImp(span, 'margin', '0');
        setImp(span, 'padding', '0');
        setImp(span, 'vertical-align', 'middle');
      });

      btn.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = node.textContent.replace(/\u00a0+/g, ' ');
        }
      });
    });

    document.querySelectorAll('.progress-indicator-container').forEach((row) => {
      setImp(row, 'display', 'flex');
      setImp(row, 'flex-direction', 'row');
      setImp(row, 'align-items', 'center');
      setImp(row, 'justify-content', 'space-between');
      setImp(row, 'gap', '12px');
      setImp(row, 'width', '100%');
    });
  }

  function runFix() {
    try {
      fixToolbarButtons();
    } catch (e) {
      console.error('TOOLBAR_BUTTONS_RUNTIME_FIX_V1', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFix);
  } else {
    runFix();
  }

  window.addEventListener('load', runFix);
  setTimeout(runFix, 150);
  setTimeout(runFix, 500);
  setTimeout(runFix, 1200);

  const observer = new MutationObserver(() => {
    runFix();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
</script>
<!-- TOOLBAR_BUTTONS_RUNTIME_FIX_V1_END -->

<!-- TOOLBAR_BUTTONS_RUNTIME_FIX_V2_START -->
<script>
(function () {
  function setImp(el, prop, value) {
    if (!el) return;
    el.style.setProperty(prop, value, 'important');
  }

  function isSafeToolbarButton(el) {
    if (!el) return false;

    // ❌ exclude order header + special UI
    if (
      el.closest('.order-info-header') ||
      el.closest('.invoice-buttons-container') ||
      el.closest('.note-button-container')
    ) return false;

    return true;
  }

  function fixToolbarButtons() {
    const buttons = Array.from(document.querySelectorAll(`
      .toolbar-action a.btn,
      .toolbar-action button.btn,
      .list-toolbar a.btn,
      .list-toolbar button.btn,
      .form-toolbar a.btn,
      .form-toolbar button.btn,
      .btn-toolbar a.btn,
      .btn-toolbar button.btn
    `)).filter(el => isSafeToolbarButton(el));

    buttons.forEach((btn) => {
      setImp(btn, 'display', 'inline-flex');
      setImp(btn, 'align-items', 'center');
      setImp(btn, 'justify-content', 'center');
      setImp(btn, 'gap', '8px');
      setImp(btn, 'height', '40px');
      setImp(btn, 'padding', '0 18px');
      setImp(btn, 'line-height', '1');

      // 🔹 ONLY fix icons INSIDE NORMAL BUTTONS
      btn.querySelectorAll('i, svg').forEach((icon) => {
        setImp(icon, 'width', '16px');
        setImp(icon, 'height', '16px');
        setImp(icon, 'font-size', '16px');
        setImp(icon, 'line-height', '1');
        setImp(icon, 'margin', '0');
      });
    });

    // fix toolbar row only (safe)
    document.querySelectorAll('.progress-indicator-container').forEach((row) => {
      if (row.closest('.order-info-header')) return;

      setImp(row, 'display', 'flex');
      setImp(row, 'align-items', 'center');
      setImp(row, 'justify-content', 'space-between');
      setImp(row, 'gap', '12px');
    });
  }

  function runFix() {
    try { fixToolbarButtons(); }
    catch (e) { console.error('TOOLBAR_BUTTONS_RUNTIME_FIX_V2', e); }
  }

  document.addEventListener('DOMContentLoaded', runFix);
  window.addEventListener('load', runFix);
  setTimeout(runFix, 200);
  setTimeout(runFix, 800);

})();
</script>
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
<script>
(function () {

  function set(el,p,v){
    if(!el) return;
    el.style.setProperty(p,v,'important');
  }

  function fix(){
    var buttons = document.querySelectorAll('a.btn, button.btn');

    buttons.forEach(function(btn){
      var icon = btn.querySelector('i');
      if(!icon) return;

      var r = btn.getBoundingClientRect();

      // فقط دکمه‌های مربعی (icon buttons)
      if(r.width <= 60 && r.height <= 60){
        set(btn,'display','inline-flex');
        set(btn,'align-items','center');
        set(btn,'justify-content','center');
        set(btn,'padding','0');
        set(btn,'line-height','1');

        set(icon,'margin','0');
        set(icon,'display','inline-flex');
        set(icon,'align-items','center');
        set(icon,'justify-content','center');
      }
    });
  }

  function run(){
    try{ fix(); }catch(e){ console.error('ICON_BUTTON_FIX_V1',e); }
  }

  window.addEventListener('load', function(){
    setTimeout(run,200);
    setTimeout(run,800);
    setTimeout(run,1500);
  });

  var observer = new MutationObserver(run);
  observer.observe(document.body,{childList:true,subtree:true});

})();
</script>
<!-- ICON_BUTTON_FIX_V1_END -->


<!-- TOOLBAR_STABILIZER_V1_START -->
<script>
(function(){

  function set(el,p,v){
    if(!el) return;
    el.style.setProperty(p,v,'important');
  }

  function hideToolbars(){
    document.querySelectorAll('.toolbar, .btn-toolbar, .toolbar-action').forEach(function(el){
      set(el,'opacity','0');
    });
  }

  function showToolbars(){
    document.querySelectorAll('.toolbar, .btn-toolbar, .toolbar-action').forEach(function(el){
      set(el,'opacity','1');
    });
  }

  function fix(){
    document.querySelectorAll('a.btn, button.btn').forEach(function(btn){
      set(btn,'display','inline-flex');
      set(btn,'align-items','center');
      set(btn,'justify-content','center');
      set(btn,'height','40px');
      set(btn,'min-height','40px');
      set(btn,'line-height','1');
    });
  }

  function run(){
    try{
      hideToolbars();

      setTimeout(function(){
        fix();
        showToolbars();
      }, 250);

    }catch(e){
      console.error('TOOLBAR_STABILIZER_V1',e);
    }
  }

  window.addEventListener('load', run);

})();
</script>
<!-- TOOLBAR_STABILIZER_V1_END -->


<!-- TOOLBAR_STABILIZER_V2_START -->
<script>
(function(){

  function set(el,p,v){
    if(!el) return;
    el.style.setProperty(p,v,'important');
  }

  function fixButtons(){
    document.querySelectorAll('a.btn, button.btn').forEach(function(btn){

      // تثبیت کامل layout (جلوگیری از لرزش متن)
      set(btn,'display','inline-flex');
      set(btn,'align-items','center');
      set(btn,'justify-content','center');
      set(btn,'gap','8px');
      set(btn,'height','40px');
      set(btn,'min-height','40px');
      set(btn,'padding','0 20px');
      set(btn,'line-height','1');
      set(btn,'white-space','nowrap');

      // 🔥 مهم‌ترین قسمت ضد لرزش
      set(btn,'transition','none');
      set(btn,'transform','none');
      set(btn,'letter-spacing','normal');
    });

    // آیکن‌ها هم تثبیت
    document.querySelectorAll('a.btn i, button.btn i').forEach(function(icon){
      set(icon,'margin','0');
      set(icon,'transform','none');
      set(icon,'transition','none');
      set(icon,'flex','0 0 auto');
    });
  }

  function run(){
    try{ fixButtons(); }
    catch(e){ console.error('TOOLBAR_STABILIZER_V2',e); }
  }

  // اجرای فوری (بدون delay)
  run();

  // بعد از load هم دوباره برای اطمینان
  window.addEventListener('load', run);

  // جلوگیری از override شدن توسط اسکریپت‌های دیگر
  var observer = new MutationObserver(run);
  observer.observe(document.body,{childList:true,subtree:true});

})();
</script>
<!-- TOOLBAR_STABILIZER_V2_END -->

