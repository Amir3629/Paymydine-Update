(function () {
  'use strict';

  var boot = window.PMD_YEAR_CALENDAR_BOOT || {};
  var root = document.getElementById('pmd-year-calendar');
  if (!root) return;

  var monthsRoot = root.querySelector('[data-pmd-yc-months]');
  var drawer = document.querySelector('[data-pmd-yc-drawer]');
  var drawerBody = drawer && drawer.querySelector('[data-pmd-yc-drawer-body]');
  var drawerTitle = drawer && drawer.querySelector('[data-pmd-yc-drawer-title]');
  var drawerKicker = drawer && drawer.querySelector('[data-pmd-yc-drawer-kicker]');
  var year = Number(boot.year) || new Date().getFullYear();
  var filter = 'all';
  var todayKey = String(boot.today || '');
  var reservations = Array.isArray(boot.reservations) ? boot.reservations : [];
  var events = Array.isArray(boot.events) ? boot.events : [];
  var reports = Array.isArray(boot.reports) ? boot.reports : [];

  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var weekNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function pad(value) { return String(value).padStart(2, '0'); }
  function dateKey(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
  function parseKey(key) {
    var parts = String(key || '').slice(0, 10).split('-').map(Number);
    return parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
  }
  function reservationDate(item) { return String(item.reserve_date || item.reservation_date || item.date || '').slice(0, 10); }
  function reservationTime(item) { return String(item.reserve_time || item.reservation_time || item.time || '').slice(0, 5); }
  function reservationName(item) { return item.customer_name || [item.first_name,item.last_name].filter(Boolean).join(' ') || item.guest_name || 'Guest'; }
  function reservationId(item) { return item.reservation_id || item.id || ''; }
  function reservationGuests(item) { return Number(item.guest_num || item.guests || item.party_size || item.covers || 0) || 0; }
  function eventDate(item) { return String(item.date || item.start_date || item.starts_at || '').slice(0, 10); }
  function reportDate(item) { return String(item.date || item.report_date || '').slice(0, 10); }

  function groupByDate(items, getter) {
    return items.reduce(function (map, item) {
      var key = getter(item);
      if (!key) return map;
      (map[key] || (map[key] = [])).push(item);
      return map;
    }, {});
  }

  var reservationsByDate = groupByDate(reservations, reservationDate);
  var eventsByDate = groupByDate(events, eventDate);
  var reportsByDate = groupByDate(reports, reportDate);

  function germanyEventsForYear(targetYear) {
    var list = [
      {date:targetYear+'-01-01',title:'New Year’s Day',type:'event',icon:'★'},
      {date:targetYear+'-05-01',title:'Labour Day',type:'event',icon:'★'},
      {date:targetYear+'-10-03',title:'German Unity Day',type:'event',icon:'★'},
      {date:targetYear+'-12-25',title:'Christmas Day',type:'event',icon:'★'},
      {date:targetYear+'-12-26',title:'Second Christmas Day',type:'event',icon:'★'}
    ];
    list.forEach(function (item) { (eventsByDate[item.date] || (eventsByDate[item.date] = [])).push(item); });
  }

  germanyEventsForYear(year);

  function visibleFrames(dayReservations, dayEvents, dayReports) {
    var frames = [];
    if ((filter === 'all' || filter === 'reservations') && dayReservations.length) {
      frames.push('<span class="pmd-yc-frame is-reservation" title="'+dayReservations.length+' reservations">R '+dayReservations.length+'</span>');
    }
    if (filter === 'all' || filter === 'events') {
      dayEvents.slice(0, 2).forEach(function (item) {
        var football = String(item.type || '').toLowerCase() === 'football';
        frames.push('<span class="pmd-yc-frame '+(football?'is-football':'is-event')+'" title="'+esc(item.title || 'Event')+'">'+(football?'⚽':'★')+'</span>');
      });
    }
    if ((filter === 'all' || filter === 'reports') && dayReports.length) {
      frames.push('<span class="pmd-yc-frame is-report" title="Day report">€</span>');
    }
    return frames;
  }

  function monthMarkup(monthIndex) {
    var first = new Date(year, monthIndex, 1);
    var last = new Date(year, monthIndex + 1, 0);
    var mondayOffset = (first.getDay() + 6) % 7;
    var cells = [];
    var start = new Date(year, monthIndex, 1 - mondayOffset);
    var now = new Date(); now.setHours(0,0,0,0);
    var busy = 0;

    for (var i = 0; i < 42; i += 1) {
      var date = new Date(start); date.setDate(start.getDate() + i);
      var key = dateKey(date);
      var dayReservations = reservationsByDate[key] || [];
      var dayEvents = eventsByDate[key] || [];
      var dayReports = reportsByDate[key] || [];
      if (date.getMonth() === monthIndex && dayReservations.length) busy += 1;
      var frames = visibleFrames(dayReservations, dayEvents, dayReports);
      var classes = ['pmd-yc-day'];
      if (date.getMonth() !== monthIndex) classes.push('is-outside');
      if (date < now) classes.push('is-past');
      if (key === todayKey) classes.push('is-today');
      var totalMarkers = dayReservations.length + dayEvents.length + dayReports.length;
      cells.push('<button type="button" class="'+classes.join(' ')+'" data-pmd-yc-date="'+key+'" aria-label="Open '+key+'"><span class="pmd-yc-day__number">'+date.getDate()+'</span><span class="pmd-yc-day__frames">'+frames.join('')+'</span>'+(totalMarkers>frames.length?'<span class="pmd-yc-day__more">+'+(totalMarkers-frames.length)+' more</span>':'')+'</button>');
    }

    return '<section class="pmd-yc-month"><div class="pmd-yc-month__head"><h2>'+monthNames[monthIndex]+'</h2><span>'+busy+' busy days</span></div><div class="pmd-yc-weekdays">'+weekNames.map(function (name) { return '<span>'+name+'</span>'; }).join('')+'</div><div class="pmd-yc-days">'+cells.join('')+'</div></section>';
  }

  function render() {
    root.querySelector('[data-pmd-yc-year]').textContent = year;
    monthsRoot.innerHTML = monthNames.map(function (_, index) { return monthMarkup(index); }).join('');
    var yearReservations = reservations.filter(function (item) { return reservationDate(item).slice(0,4) === String(year); });
    var busyMap = {};
    yearReservations.forEach(function (item) { busyMap[reservationDate(item)] = true; });
    var yearEvents = Object.keys(eventsByDate).reduce(function (total, key) { return key.slice(0,4) === String(year) ? total + eventsByDate[key].length : total; }, 0);
    root.querySelector('[data-pmd-yc-reservation-total]').textContent = yearReservations.length;
    root.querySelector('[data-pmd-yc-busy-days]').textContent = Object.keys(busyMap).length;
    root.querySelector('[data-pmd-yc-event-total]').textContent = yearEvents;
    root.querySelector('[data-pmd-yc-today-label]').textContent = todayKey ? new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(parseKey(todayKey)) : '—';
    root.setAttribute('aria-busy','false');
  }

  function money(value) {
    var number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat(undefined,{style:'currency',currency:'EUR'}).format(number) : 'Not available';
  }

  function detailSection(title, content) {
    return '<section class="pmd-yc-detail-section"><h3>'+esc(title)+'</h3>'+content+'</section>';
  }

  function openDay(key) {
    if (!drawer) return;
    var date = parseKey(key);
    var dayReservations = reservationsByDate[key] || [];
    var dayEvents = eventsByDate[key] || [];
    var report = (reportsByDate[key] || [])[0] || null;
    var isPast = date && date < new Date(new Date().setHours(0,0,0,0));
    drawerTitle.textContent = date ? new Intl.DateTimeFormat(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date) : key;
    drawerKicker.textContent = isPast ? 'Daily report' : 'Day overview';

    var reportMarkup = '<div class="pmd-yc-report-grid">' +
      '<article><span>Sales</span><strong>'+money(report && (report.sales || report.total_sales))+'</strong></article>' +
      '<article><span>Tips</span><strong>'+money(report && (report.tips || report.total_tips))+'</strong></article>' +
      '<article><span>Orders</span><strong>'+(report && (report.orders || report.order_count) != null ? esc(report.orders || report.order_count) : 'Not available')+'</strong></article>' +
    '</div>';

    var reservationMarkup = dayReservations.length ? dayReservations.map(function (item) {
      var id = reservationId(item);
      return '<div class="pmd-yc-detail-item"><span class="pmd-yc-detail-icon is-reservation">R</span><div class="pmd-yc-detail-copy"><strong>'+esc(reservationTime(item) || 'Time not set')+' · '+esc(reservationName(item))+'</strong><small>'+(reservationGuests(item)?reservationGuests(item)+' guests · ':'')+'Reservation #'+esc(id)+'</small></div></div>';
    }).join('') : '<p class="pmd-yc-detail-empty">No reservations on this day.</p>';

    var eventMarkup = dayEvents.length ? dayEvents.map(function (item) {
      return '<div class="pmd-yc-detail-item"><span class="pmd-yc-detail-icon is-event">'+(String(item.type).toLowerCase()==='football'?'⚽':'★')+'</span><div class="pmd-yc-detail-copy"><strong>'+esc(item.title || 'Event')+'</strong><small>'+esc(item.time || item.location || 'Germany event')+'</small></div></div>';
    }).join('') : '<p class="pmd-yc-detail-empty">No listed events on this day.</p>';

    var createUrl = String(boot.reservationCreateUrl || '/admin/reservations/create');
    drawerBody.innerHTML = (isPast ? reportMarkup : '') + detailSection('Reservations', reservationMarkup) + detailSection('Events', eventMarkup) + '<div class="pmd-yc-detail-actions"><a href="'+esc(createUrl)+'?reserve_date='+esc(key)+'">＋ Add reservation</a>'+(dayReservations.length?'<a class="is-secondary" href="/admin/reservations2">Open reservations</a>':'')+'</div>';
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  root.addEventListener('click', function (event) {
    var day = event.target.closest('[data-pmd-yc-date]');
    if (day) openDay(day.getAttribute('data-pmd-yc-date'));
    var filterButton = event.target.closest('[data-pmd-yc-filter]');
    if (filterButton) {
      filter = filterButton.getAttribute('data-pmd-yc-filter');
      root.querySelectorAll('[data-pmd-yc-filter]').forEach(function (button) { button.classList.toggle('is-active', button === filterButton); });
      render();
    }
  });

  root.querySelector('[data-pmd-yc-prev]').addEventListener('click', function () { window.location.href = '/admin/calender?year=' + (year - 1); });
  root.querySelector('[data-pmd-yc-next]').addEventListener('click', function () { window.location.href = '/admin/calender?year=' + (year + 1); });
  root.querySelector('[data-pmd-yc-today]').addEventListener('click', function () {
    var targetYear = Number(todayKey.slice(0,4));
    if (targetYear && targetYear !== year) { window.location.href = '/admin/calender?year=' + targetYear; return; }
    var today = root.querySelector('[data-pmd-yc-date="'+todayKey+'"]');
    if (today) { today.scrollIntoView({behavior:'smooth',block:'center'}); window.setTimeout(function () { openDay(todayKey); }, 350); }
  });

  if (drawer) {
    drawer.addEventListener('click', function (event) { if (event.target.closest('[data-pmd-yc-close]')) closeDrawer(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeDrawer(); });
  }

  render();
  window.PMDYearCalendarV1 = {version:'1.0.0',render:render,openDay:openDay,close:closeDrawer,audit:function(){return{year:year,reservations:reservations.length,events:Object.keys(eventsByDate).reduce(function(t,k){return t+eventsByDate[k].length;},0),months:root.querySelectorAll('.pmd-yc-month').length,drawer:Boolean(drawer)}}};
  console.info('[PMD Year Calendar V1] Ready', window.PMDYearCalendarV1.audit());
})();
