(function () {
  'use strict';

  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }

  function sidebarMenu() {
    return document.querySelector('#side-nav-menu') || document.querySelector('.side-nav-menu') || document.querySelector('.sidebar-menu') || document.querySelector('.nav-sidebar');
  }

  function sidebarEl() {
    var m = sidebarMenu();
    return (m && (m.closest('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar') || m.parentElement))
      || document.querySelector('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar');
  }

  function nativeToggle() {
    return document.querySelector('.pmd-sidebar-icons-toggle:not(#pmd-sidebar-edge-toggle-v40)');
  }

  function isCollapsed() {
    var b = document.body;
    var h = document.documentElement;
    return b.classList.contains('pmd-sidebar-icons-only') ||
      b.classList.contains('pmd-sidebar-collapsed') ||
      h.classList.contains('pmd-sidebar-icons-only') ||
      h.classList.contains('pmd-sidebar-collapsed') ||
      b.classList.contains('sidebar-xs') ||
      b.classList.contains('sidebar-collapsed');
  }

  function ensureProxy() {
    var btn = document.getElementById('pmd-sidebar-edge-toggle-v40');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'pmd-sidebar-edge-toggle-v40';
      btn.setAttribute('aria-label', 'Toggle sidebar');
      btn.innerHTML = '<i class="fa fa-angle-left" aria-hidden="true"></i>';
      document.body.appendChild(btn);

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var real = nativeToggle();
        if (real) {
          real.click();
        } else {
          document.body.classList.toggle('pmd-sidebar-collapsed');
        }

        [30, 120, 280, 600].forEach(function (ms) { setTimeout(positionProxy, ms); });
        return false;
      }, true);
    }
    return btn;
  }

  function positionProxy() {
    var btn = ensureProxy();
    var side = sidebarEl();

    var left = 74;
    var top = 132;

    if (side) {
      side.style.overflow = 'visible';
      var rect = side.getBoundingClientRect();
      if (rect && rect.width > 20) {
        left = Math.round(rect.right - 17);
        top = Math.round(Math.max(rect.top + (isCollapsed() ? 94 : 132), 76));
      }
    }

    // Keep the button visible after collapse/open.
    left = Math.max(54, Math.min(left, window.innerWidth - 42));
    top = Math.max(68, Math.min(top, window.innerHeight - 70));

    btn.style.left = left + 'px';
    btn.style.top = top + 'px';

    var icon = btn.querySelector('i');
    if (icon) {
      icon.className = 'fa ' + (isCollapsed() ? 'fa-angle-right' : 'fa-angle-left');
    }

    btn.setAttribute('aria-expanded', isCollapsed() ? 'false' : 'true');
    btn.setAttribute('title', isCollapsed() ? 'Open sidebar' : 'Close sidebar');

    var real = nativeToggle();
    if (real) {
      real.setAttribute('tabindex', '-1');
      real.setAttribute('aria-hidden', 'true');
    }
  }

  /* Manager dashboard renderer with inline SVG, but no sidebar moving */
  function svg(name) {
    var icons = {
      arrow:'<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
      money:'<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/>',
      card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
      table:'<rect x="4" y="5" width="16" height="12" rx="2"/><path d="M8 17v3"/><path d="M16 17v3"/>',
      calendar:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="m9 15 2 2 4-4"/>',
      alert:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
      plusUser:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
      bag:'<path d="M6 8h12l-1 13H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
      split:'<path d="M4 6h7v12H4z"/><path d="M13 6h7v12h-7z"/>',
      message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
      map:'<path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      chart:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-7"/>',
      users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      bulb:'<path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a6 6 0 1 1 8 0c-.9.8-1 1.6-1 3H9c0-1.4-.1-2.2-1-3Z"/>',
      fire:'<path d="M12 22c4 0 7-3 7-7 0-3-2-5-4-7 .2 2-1 3-2 4 0-4-2-7-5-9 1 5-4 6-4 12 0 4 3 7 8 7Z"/>',
      check:'<path d="m20 6-11 11-5-5"/>',
      search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
      magic:'<path d="m15 4 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/><path d="M5 15l4 4"/><path d="m9 15-4 4"/><path d="M19 15l-4 4"/><path d="m15 15 4 4"/>'
    };
    return '<svg class="pmd-svg-v40" viewBox="0 0 24 24" aria-hidden="true">' + (icons[name] || icons.alert) + '</svg>';
  }
  function clean(v){ return String(v||'').replace(/\s+/g,' ').trim(); }
  function dashRoot(){ return document.querySelector('.pmd-dashboard-modern'); }
  function panel(){ return document.querySelector('.pmd-role-panel'); }
  function findHref(needles, fallback){
    var links=[].slice.call(document.querySelectorAll('#side-nav-menu a[href], .nav-sidebar a[href]'));
    for(var i=0;i<links.length;i++){
      var href=links[i].getAttribute('href'); if(!href||href==='#') continue;
      var hay=clean((links[i].innerText||'')+' '+href).toLowerCase();
      for(var j=0;j<needles.length;j++) if(hay.indexOf(String(needles[j]).toLowerCase())!==-1) return href;
    }
    return fallback||'#';
  }
  function routes(){ return {
    orders:findHref(['orders'],'/admin/orders'), orderCreate:'/admin/orders/create',
    reservations:findHref(['reservations'],'/admin/reservations'), reservationCreate:'/admin/reservations/create',
    tables:findHref(['tables'],'/admin/tables'), payments:findHref(['payments'],'/admin/payments'),
    reports:findHref(['reports'],'/admin/reports'), messaging:findHref(['customers','messages'],'/admin/customers')
  }; }
  function liveValue(sel, fb){ var el=document.querySelector(sel); var v=clean(el?el.textContent:''); return v&&v!=='—'&&v!=='-'?v:fb; }
  function kpi(l,v,s,i,h,t){ return '<div class="pmd-role-kpi '+(t||'')+'" data-pmd-role-href="'+h+'"><div class="pmd-role-kpi-label">'+l+'</div><div class="pmd-role-kpi-value">'+v+'</div><div class="pmd-role-kpi-sub">'+svg('arrow')+s+'</div><div class="pmd-role-kpi-icon">'+svg(i)+'</div></div>'; }
  function action(l,i,h){ return '<a class="pmd-manager-action-v29" href="'+h+'"><i class="pmd-inline-icon-v40">'+svg(i)+'</i><span>'+l+'</span></a>'; }
  function card(c,i,t,title,sub,body,pill){ return '<section class="pmd-manager-card-v29 '+c+'"><div class="pmd-manager-card-head-v29"><div class="pmd-manager-title-v29"><div class="pmd-manager-title-icon-v29 '+(t||'')+'">'+svg(i)+'</div><div><div class="pmd-manager-card-title-v29">'+title+'</div>'+(sub?'<div class="pmd-manager-card-sub-v29">'+sub+'</div>':'')+'</div></div>'+(pill?'<div class="pmd-manager-live-pill-v29">'+svg('arrow')+pill+'</div>':'')+'</div>'+body+'</section>'; }
  function finance(l,v,n){ return '<div class="pmd-manager-finance-item-v29"><div class="pmd-manager-finance-label-v29">'+l+'</div><div class="pmd-manager-finance-value-v29">'+v+'</div>'+(n?'<div class="pmd-manager-finance-note-v29">'+n+'</div>':'')+'</div>'; }
  function tableTile(n,s,g,l){ return '<div class="pmd-manager-table-v29 '+s+'"><span>'+n+'</span><small>'+g+' · '+l+'</small></div>'; }
  function alertItem(i,t,d,b){ return '<div class="pmd-manager-alert-v29"><i class="pmd-inline-icon-v40">'+svg(i)+'</i><div><strong>'+t+'</strong><span>'+d+'</span></div><em class="pmd-manager-badge-v29">'+b+'</em></div>'; }
  function eventItem(i,t,d,tm){ return '<div class="pmd-manager-event-v29"><i class="pmd-inline-icon-v40">'+svg(i)+'</i><div><strong>'+t+'</strong><span>'+d+'</span></div><time>'+tm+'</time></div>'; }
  function row(l,v,n){ return '<div class="pmd-manager-row-v29"><div>'+l+(n?'<span> · '+n+'</span>':'')+'</div><strong>'+v+'</strong></div>'; }
  function insight(i,t,d,b){ return '<div class="pmd-manager-insight-v29"><i class="pmd-inline-icon-v40">'+svg(i)+'</i><div><strong>'+t+'</strong><span>'+d+'</span></div><em class="pmd-manager-badge-v29">'+b+'</em></div>'; }

  function managerHtml(){
    var r=routes(), revenue=liveValue('[data-pmd-kpi="revenue"]','$242.93'), reservations=liveValue('[data-pmd-card="reservations"], [data-pmd-kpi="reservations"]','2'), avg=liveValue('[data-pmd-kpi="avg"], [data-pmd-mini="avg"]','€48.59');
    return '<div class="pmd-manager-ops-v29 pmd-manager-ops-v40" data-pmd-manager-ops="v40">'+
      '<div class="pmd-role-kpi-bar pmd-manager-hero-v29">'+
        kpi('Revenue Today',revenue,'18.6% vs yesterday','money',r.reports,'tone-money')+
        kpi('Open Checks','8','waiting payment','card',r.payments,'')+
        kpi('Active Tables','17','live floor load','table',r.tables,'tone-green')+
        kpi('Reservations Today',reservations,'today schedule','calendar',r.reservations,'tone-gold')+
        kpi('AI Alerts','4','needs attention','alert',r.reports,'tone-red')+
      '</div>'+
      '<div class="pmd-manager-quick-actions-v29">'+action('Walk-in','plusUser',r.reservationCreate)+action('New Order','bag',r.orderCreate)+action('Split Bill','split',r.payments)+action('Customer Messaging','message',r.messaging)+'</div>'+
      '<div class="pmd-manager-grid-v29">'+
        card('full','money','green','Revenue & Financial KPIs','Money, open checks, table usage and reservations in one strip.','<div class="pmd-manager-finance-v29">'+finance('Revenue Today',revenue,'+18.6% vs yesterday')+finance('Open Checks','8','€640.00 pending')+finance('Active Tables','17','8 dining · 2 reserved')+finance('Reservations Today',reservations,'€1,840 forecast')+'</div>','Live')+
        card('wide','map','green','Live Restaurant Floor','Live status of every table: available, reserved, dining, waiting payment and delayed.','<div class="pmd-manager-floor-grid-v29">'+tableTile('T1','available','2','Available')+tableTile('T2','dining','4','Dining')+tableTile('T3','delayed','4','Delayed')+tableTile('T4','available','2','Available')+tableTile('T5','payment','2','Payment')+tableTile('T6','dining','6','Dining')+tableTile('T7','available','2','Available')+tableTile('T8','reserved','4','Reserved')+tableTile('T9','available','2','Available')+tableTile('T10','payment','2','Payment')+tableTile('T11','reserved','4','Reserved')+tableTile('T12','delayed','6','Delayed')+tableTile('T13','available','2','Available')+tableTile('T14','dining','2','Dining')+tableTile('T15','available','4','Available')+'</div><div class="pmd-manager-legend-v29"><span><i class="pmd-manager-dot-v29 available"></i>Available</span><span><i class="pmd-manager-dot-v29 reserved"></i>Reserved</span><span><i class="pmd-manager-dot-v29 dining"></i>Dining</span><span><i class="pmd-manager-dot-v29 payment"></i>Waiting Payment</span><span><i class="pmd-manager-dot-v29 delayed"></i>Delayed</span></div>','Live')+
        card('side','alert','red','AI Alerts','Immediate operational risks that need manager attention.','<div class="pmd-manager-alert-list-v29">'+alertItem('fire','Kitchen delay','Table 3 has waited 18 min for mains.','High')+alertItem('card','Waiting payment','2 tables are done but not paid yet.','Money')+alertItem('calendar','Upcoming reservation','VIP party in 18 min, table not ready.','Soon')+alertItem('users','Staff workload','Waiter 1 is overloaded vs section average.','AI')+'</div>','4 alerts')+
        card('half','clock','purple','Live Timeline','Real-time stream: new orders, payments, reservations, check-ins and service actions.','<div class="pmd-manager-timeline-v29">'+eventItem('bag','New order created','Table 3 · 4 items · Kitchen notified','2m')+eventItem('card','Payment received','Table 6 · €85.00 · Card','5m')+eventItem('calendar','Reservation check-in','Table 12 · 4 guests seated','9m')+eventItem('plusUser','Walk-in added','2 guests · waiting 6 min','12m')+eventItem('check','Order completed','Table 1 · €120.00 closed','20m')+'</div>','Live')+
        card('half','chart','gold','Performance Analytics','Revenue by hour, payment breakdown, average guest spend and lost revenue.','<div class="pmd-manager-analytics-grid-v29"><div><div class="pmd-manager-card-sub-v29">Revenue by Hour</div><div class="pmd-manager-chart-bars-v29"><i style="height:34%"></i><i style="height:48%"></i><i style="height:42%"></i><i style="height:62%"></i><i style="height:78%"></i><i style="height:58%"></i><i style="height:88%"></i><i style="height:72%"></i></div></div><div class="pmd-manager-metric-list-v29"><div class="pmd-manager-mini-metric-v29"><span>Payment Breakdown</span><strong>58% card</strong><div class="pmd-manager-payment-bar-v29"><i></i><i></i><i></i></div></div><div class="pmd-manager-mini-metric-v29"><span>Average Guest Spend</span><strong>'+avg+'</strong></div><div class="pmd-manager-mini-metric-v29"><span>Lost Revenue</span><strong>€120.00</strong></div></div></div>','Today')+
        card('third','users','green','Team Performance','Waiter output, kitchen performance and order preparation time.','<div class="pmd-manager-list-v29">'+row('Waiter 1','28 orders','€2,850')+row('Waiter 2','24 orders','€2,440')+row('Kitchen','14m avg','prep time')+row('Late tickets','2','needs check')+row('Service load','82%','busy but safe')+'</div>','Team')+
        card('third','calendar','purple','Reservation Management','Upcoming reservations, reservation revenue forecast and no-show tracking.','<div class="pmd-manager-list-v29">'+row('Upcoming today','5','next: 18 min')+row('Forecast revenue','€1,840','booked covers')+row('No-show tracking','1','watch list')+row('VIP / notes','2','prepare table')+row('Waitlist','3','walk-in demand')+'</div>','Booking')+
        card('third','bulb','gold','AI Insights','Smart actions to increase revenue and find weak operational points.','<div>'+insight('magic','Upsell opportunity','Recommend dessert to Tables 2, 6 and 14.','+€68')+insight('chart','Increase revenue','Push early-bird offer before 18:30.','+9%')+insight('search','Weak point found','Payment wait is causing table turnover loss.','Fix')+insight('fire','Kitchen bottleneck','Main station slows after 20:00.','Watch')+'</div>','AI')+
      '</div></div>';
  }
  var renders=0;
  function applyManager(force){
    var r=dashRoot(), p=panel();
    if(!r || !p || r.getAttribute('data-pmd-role')!=='manager') return;
    if(!force && p.getAttribute('data-pmd-manager-ops-v40')==='1') return;
    if(++renders>12) return;
    p.innerHTML=managerHtml();
    p.setAttribute('data-pmd-manager-ops-v40','1');
  }
  function bindRoleButtons(){
    document.querySelectorAll('[data-pmd-role-btn="manager"]').forEach(function(btn){
      if(btn.getAttribute('data-pmd-manager-v40-bound')) return;
      btn.setAttribute('data-pmd-manager-v40-bound','1');
      btn.addEventListener('click',function(){ renders=0; setTimeout(function(){applyManager(true); positionProxy();},180); },true);
    });
  }

  function init(){
    ensureProxy();
    positionProxy();
    bindRoleButtons();
    applyManager(false);

    [100,300,700,1200,2200,3600].forEach(function(ms){
      setTimeout(function(){ positionProxy(); bindRoleButtons(); applyManager(false); },ms);
    });
    window.addEventListener('resize', positionProxy, {passive:true});
    window.addEventListener('scroll', positionProxy, {passive:true});
    document.addEventListener('click', function(){ setTimeout(positionProxy,120); }, true);

    window.PMDSidebarStabilityV40 = { position: positionProxy, refreshManager: function(){ renders=0; applyManager(true); } };
  }

  ready(init);
})();
