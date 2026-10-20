/* PMD_RESERVATION_SEARCH_R1 — on-demand authenticated global date search.
 * Does not filter the selected date or interfere with Floor / Calendar / cards.
 * Reservation edit links reuse the canonical Composer delegated click handler.
 */
(function () {
  'use strict';
  if (window.PMDReservationSearchR1) return;
  var root, trigger, panel, field, results, feedback;
  var active = false, seq = 0, wait = null, pending = null;
  function lang() {
    var cookie = (document.cookie.match(/(?:^|;\s*)pmd_admin_locale=(de|tr|en)(?:;|$)/i) || [])[1];
    var code = String(cookie || document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    return code === 'de' || code === 'tr' ? code : 'en';
  }
  function words() {
    var code = lang();
    if (code === 'de') return {
      button:'Reservierungen suchen', placeholder:'Name, Buchungsnummer, Telefon, E-Mail, Datum oder Tisch…',
      hint:'Mindestens 2 Zeichen eingeben.', searching:'Reservierungen werden gesucht…',
      no:'Keine passenden Reservierungen gefunden.', error:'Suche fehlgeschlagen. Bitte erneut versuchen.',
      count:'Treffer', open:'Reservierung öffnen', table:'Tisch', guests:'Gäste',
      close:'Suche schließen', limit:'Die ersten 60 Treffer werden angezeigt.'
    };
    if (code === 'tr') return {
      button:'Rezervasyon ara',placeholder:'Ad, rezervasyon no., telefon, e-posta, tarih veya masa…',
      hint:'En az 2 karakter yazın.',searching:'Rezervasyonlar aranıyor…',
      no:'Eşleşen rezervasyon bulunamadı.',error:'Arama başarısız. Tekrar deneyin.',
      count:'sonuç',open:'Rezervasyonu aç',table:'Masa',guests:'Kişi',close:'Aramayı kapat',
      limit:'İlk 60 sonuç gösteriliyor.'
    };
    return {
      button:'Search reservations',placeholder:'Name, booking ID, phone, email, date or table…',
      hint:'Enter at least 2 characters.',searching:'Searching reservations…',
      no:'No matching reservations found.',error:'Search failed. Please try again.',
      count:'results',open:'Open reservation',table:'Table',guests:'Guests',close:'Close search',
      limit:'Showing the first 60 results.'
    };
  }
  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = String(text);
    return el;
  }
  function clearSearch() {
    if (wait !== null) { window.clearTimeout(wait); wait = null; }
    if (pending) { pending.abort(); pending = null; }
    seq++;
  }
  function setFeedback(message) {
    if (feedback) feedback.textContent = String(message || '');
  }
  function setOpen(open) {
    active = Boolean(open);
    if (!panel || !trigger) return;
    panel.hidden = !active;
    trigger.setAttribute('aria-expanded', String(active));
    if (active) {
      field.focus();
      if (field.value.trim().length >= 2) queueSearch();
    } else {
      clearSearch();
    }
  }
  function display(rows, current) {
    results.replaceChildren();
    if (!Array.isArray(rows) || !rows.length) {
      setFeedback(current.no);
      return;
    }
    setFeedback(rows.length + ' ' + current.count + (rows.length === 60 ? ' · ' + current.limit : ''));
    rows.forEach(function (item) {
      var id = Number(item.id);
      if (!Number.isSafeInteger(id) || id < 1) return;
      var date = String(item.date || '').slice(0, 10);
      var time = String(item.time || '').slice(0, 5);
      var link = node('a', 'pmd-rsearch__result');
      // Existing Reservations Composer owns data-pmd-reservations-card-edit.
      link.href = '/admin/reservations/edit/' + encodeURIComponent(String(id));
      link.setAttribute('data-pmd-reservations-card-edit', String(id));
      link.setAttribute('data-pmd-reservations-card-date', date);
      link.setAttribute('data-pmd-reservations-card-time', time);
      link.setAttribute('aria-label', current.open + ' #' + id);
      var top = node('span', 'pmd-rsearch__result-top');
      top.appendChild(node('strong', '', String(item.name || '').trim() || ('#' + id)));
      top.appendChild(node('b', '', '#' + id));
      var line = [
        date, time,
        current.guests + ': ' + Math.max(0, Number(item.guests) || 0),
        item.tables ? current.table + ': ' + String(item.tables) : '',
        String(item.status || '').trim()
      ].filter(Boolean).join(' · ');
      link.appendChild(top);
      link.appendChild(node('span', 'pmd-rsearch__result-meta', line));
      link.addEventListener('click', function () { setOpen(false); });
      results.appendChild(link);
    });
  }
  function search() {
    if (!active || !field) return;
    var q = field.value.trim();
    var current = words();
    clearSearch();
    results.replaceChildren();
    if (q.length < 2) { setFeedback(current.hint); return; }
    var token = seq;
    setFeedback(current.searching);
    pending = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var csrf = document.querySelector('meta[name="csrf-token"]');
    var headers = {
      'Accept':'application/json',
      'Content-Type':'application/json',
      'X-Requested-With':'XMLHttpRequest',
      'X-IGNITER-REQUEST-HANDLER':'onPmdSearchReservationsR1',
      'X-CSRF-TOKEN':csrf ? (csrf.getAttribute('content') || '') : ''
    };
    var options = {
      method:'POST', credentials:'same-origin', headers:headers,
      body:JSON.stringify({term:q})
    };
    if (pending) options.signal = pending.signal;
    fetch('/admin/reservations', options).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (data) {
      if (!active || seq !== token || field.value.trim() !== q) return;
      if (!data || data.success !== true || !Array.isArray(data.results)) {
        throw new Error('Invalid search response');
      }
      display(data.results, current);
    }).catch(function (error) {
      if (!active || seq !== token || error && error.name === 'AbortError') return;
      results.replaceChildren();
      setFeedback(current.error);
      if (window.console && console.warn) console.warn('[PMD Reservation Search]', error);
    });
  }
  function queueSearch() {
    clearSearch();
    if (field.value.trim().length < 2) {
      results.replaceChildren();
      setFeedback(words().hint);
      return;
    }
    wait = window.setTimeout(function () { wait = null; search(); }, 260);
  }
  function mount() {
    if (!/^\/admin\/reservations\/?$/.test(location.pathname)) return;
    root = document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-actions');
    if (!root || root.querySelector('[data-pmd-reservation-search-trigger]')) return;
    var t = words();
    trigger = node('button','pmd-dashboard-lab__header-action pmd-rsearch__trigger');
    trigger.type = 'button';
    trigger.title = t.button;
    trigger.setAttribute('aria-label', t.button);
    trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-controls','pmd-reservation-search-panel-r1');
    trigger.setAttribute('data-pmd-reservation-search-trigger','1');
    trigger.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg>';
    panel = node('section','pmd-rsearch__panel');
    panel.id = 'pmd-reservation-search-panel-r1';
    panel.hidden = true;
    panel.setAttribute('role','search');
    panel.setAttribute('aria-label',t.button);
    var head = node('div','pmd-rsearch__head');
    head.appendChild(node('strong','',t.button));
    var close = node('button','pmd-rsearch__close','×');
    close.type = 'button';
    close.setAttribute('aria-label',t.close);
    head.appendChild(close);
    panel.appendChild(head);
    field = node('input','pmd-rsearch__input');
    field.type = 'search';
    field.maxLength = 100;
    field.autocomplete = 'off';
    field.placeholder = t.placeholder;
    field.setAttribute('aria-label', t.button);
    panel.appendChild(field);
    feedback = node('div','pmd-rsearch__feedback',t.hint);
    feedback.setAttribute('role','status');
    feedback.setAttribute('aria-live','polite');
    panel.appendChild(feedback);
    results = node('div','pmd-rsearch__results');
    panel.appendChild(results);
    root.insertBefore(trigger,root.firstChild);
    // Keep overlay anchored to header actions (without affecting card geometry).
    root.appendChild(panel);
    trigger.addEventListener('click',function () { setOpen(!active); });
    close.addEventListener('click',function () { setOpen(false); trigger.focus(); });
    field.addEventListener('input',queueSearch);
    field.addEventListener('keydown',function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        trigger.focus();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        clearSearch();
        search();
      }
    });
    document.addEventListener('pointerdown',function (event) {
      if (active && !root.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown',function (event) {
      if (active && event.key === 'Escape') { setOpen(false); trigger.focus(); }
    });
    window.PMDReservationSearchR1 = { version:'1.0.0', open:function(){setOpen(true);}, close:function(){setOpen(false);} };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
