/* PMD_OWNER_HOUR_TEAM_NOTES_CLIENT_R11
 * Additive Owner-only integration with the established Reservations Calendar
 * renderer. The native Reservations/Manager JS and local personal notes remain
 * unchanged; published team notes use the server and per-recipient receipts.
 */
(function () {
  'use strict';
  if (window.PMDOwnerHourTeamNotesR11) return;
  var host = document.getElementById('pmd-dashboard-lab');
  var endpoint = host && host.getAttribute('data-pmd-owner-hour-notes-api');
  if (!host || !endpoint) return;

  var rootSelector = '#pmd-r2-calendar-surface-v160';
  var notes = [], roles = [], members = [], loadedYear = 0, loadingYear = 0;
  var error = '', actionBusy = false, currentDate = '', chosenTime = '12:00';
  var chosenRoles = ['all'], modal = null, noteList = null, modalRoles = null;
  var modalError = null, roleReady = false, scheduled = false, revision = 0;
  var retryAfter = 0, pendingRequest = false, setupRequired = false;
  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  // PMD_OWNER_STAFF_NOTES_CSRF_R11_FIX: the canonical Dashboardlab
  // layout has no CSRF meta tag. Read the token securely from the
  // authenticated Owner dashboard Blade instead of posting an empty token.
  var csrfToken = host.getAttribute('data-pmd-owner-hour-notes-csrf')
    || (csrfMeta ? String(csrfMeta.content || '') : '');

  function e(tag, className, parent, value) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = String(value);
    if (parent) parent.appendChild(element);
    return element;
  }
  function root() { return document.querySelector(rootSelector); }
  function audit() {
    try { return window.PMDReservationsScheduleV1 && window.PMDReservationsScheduleV1.audit(); }
    catch (_) { return null; }
  }
  function active() {
    var info = audit();
    return !!(info && info.ownerCalendarEnabled && info.calendarMode);
  }
  function selectedDay() {
    var info = audit();
    return info ? String(info.selectedDate || '') : '';
  }
  function currentYear() {
    var day = selectedDay();
    if (/^20\d{2}-\d{2}-\d{2}$/.test(day)) return Number(day.slice(0, 4));
    var label = root() && root().querySelector('[data-r2-yc-label]');
    var match = label && String(label.textContent || '').match(/\b(20\d{2})\b/);
    return match ? Number(match[1]) : new Date().getFullYear();
  }
  function byDay(day) { return notes.filter(function (n) { return n.date === day; }); }
  function bySlot(day, time) { return notes.filter(function (n) { return n.date === day && n.time === time; }); }
  function roleNames(codes) {
    if (!Array.isArray(codes)) return '';
    return codes.map(function (code) {
      var match = roles.concat(members).find(function (role) { return role.code === code; });
      return match ? match.name : code;
    }).join(', ');
  }
  function notifyError(message) {
    error = String(message || 'Staff notes are unavailable.');
    if (modalError && modal && !modal.hidden) {
      modalError.textContent = error;
      modalError.hidden = false;
    }
  }
  function request(url, method, data) {
    var headers = {'Accept':'application/json', 'X-Requested-With':'XMLHttpRequest'};
    if (method !== 'GET') {
      headers['X-CSRF-TOKEN'] = csrfToken;
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, {
      method:method, credentials:'same-origin', cache:'no-store', headers:headers,
      body:data ? JSON.stringify(data) : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || !payload || payload.ok !== true) {
          var message = payload && (payload.message || payload.error);
          if (payload && payload.errors) {
            message = Object.keys(payload.errors).map(function (key) {
              return payload.errors[key].join(' ');
            }).join(' ');
          }
          throw new Error(message || 'Could not save team note (HTTP ' + response.status + ').');
        }
        return payload;
      });
    });
  }
  function refreshYear(targetYear, force) {
    if (!active() || !endpoint || !window.fetch) return;
    var year = Number(targetYear);
    if (year < 2000 || year > 2100) return;
    if (pendingRequest || Date.now() < retryAfter) return;
    if (!force && (year === loadedYear || year === loadingYear)) return;
    var seq = ++revision;
    loadingYear = year;
    pendingRequest = true;
    var url = endpoint + (endpoint.indexOf('?') >= 0 ? '&' : '?') + 'year=' + year;
    request(url, 'GET').then(function (data) {
      if (seq !== revision || currentYear() !== year) return;
      notes = Array.isArray(data.notes) ? data.notes : [];
      roles = Array.isArray(data.roles) ? data.roles : [];
      members = Array.isArray(data.members) ? data.members : [];
      setupRequired = !!data.setup_required;
      roleReady = !setupRequired;
      error = setupRequired ? (data.message || 'Team notes need setup for this restaurant.') : '';
      retryAfter = 0;
      loadedYear = year;
      if (modal && !modal.hidden) paintRoles();
      repaint();
    }).catch(function (problem) {
      if (seq !== revision) return;
      notifyError(problem.message);
      // A failed GET must not trigger another GET on every DOM mutation.
      retryAfter = Date.now() + 60000;
    }).finally(function () {
      pendingRequest = false;
      if (seq === revision) loadingYear = 0;
    });
  }
  function ensureModal() {
    if (modal) return;
    modal = e('div','pmd-owner-hour-note-modal',host);
    modal.setAttribute('data-pmd-owner-hour-note-modal','');
    modal.hidden = true;
    modal.innerHTML = '' +
      '<button type="button" class="pmd-owner-hour-note-modal__backdrop" data-pmd-owner-hour-note-close aria-label="Close"></button>' +
      '<section class="pmd-owner-hour-note-card" role="dialog" aria-modal="true" aria-labelledby="pmd-hour-note-heading">' +
        '<header><div><small>Team communication</small><h2 id="pmd-hour-note-heading">New staff note</h2></div>' +
        '<button type="button" data-pmd-owner-hour-note-close aria-label="Close note">×</button></header>' +
        '<div class="pmd-owner-hour-note-time"><span id="pmd-hour-note-time-label">Time for this note</span>' +
          '<div class="pmd-owner-hour-time-picker" data-pmd-owner-hour-time-picker>' +
            '<button type="button" class="pmd-owner-hour-time-trigger" data-pmd-owner-hour-time-trigger aria-haspopup="listbox" aria-expanded="false" aria-labelledby="pmd-hour-note-time-label pmd-hour-note-time-value">' +
              '<span id="pmd-hour-note-time-value" data-pmd-owner-hour-time-value>12:00</span>' +
              '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<div class="pmd-owner-hour-time-list" id="pmd-hour-note-time-options" role="listbox" aria-label="Time for this note" data-pmd-owner-hour-time-list hidden></div>' +
          '</div></div>' +
        '<label class="pmd-owner-hour-note-text"><span>Message</span><textarea rows="4" maxlength="1500" data-pmd-owner-hour-note-message placeholder="Write a clear instruction for the selected team…" required></textarea></label>' +
        '<div class="pmd-owner-hour-note-audience"><strong>Who should receive this?</strong><p>Choose all staff, work roles, or individual team members.</p>' +
          '<div class="pmd-owner-hour-note-roles" role="group" aria-label="Work roles" data-pmd-owner-hour-note-roles></div>' +
          '<div class="pmd-owner-hour-member-label" data-pmd-owner-hour-member-label hidden>Team members</div>' +
          '<div class="pmd-owner-hour-note-members" role="group" aria-label="Team members" data-pmd-owner-hour-note-members></div></div>' +
        '<p class="pmd-owner-hour-note-error" role="alert" data-pmd-owner-hour-note-error hidden></p>' +
        '<footer><button type="button" data-pmd-owner-hour-note-close>Cancel</button>' +
          '<button type="button" class="is-primary" data-pmd-owner-hour-note-send>Send to staff</button></footer>' +
      '</section>';
    noteList = modal.querySelector('[data-pmd-owner-hour-note-message]');
    modalRoles = modal.querySelector('[data-pmd-owner-hour-note-roles]');
    modalError = modal.querySelector('[data-pmd-owner-hour-note-error]');
    var timeList = modal.querySelector('[data-pmd-owner-hour-time-list]');
    for (var h = 0; h < 24; h++) {
      for (var m = 0; m < 60; m += 30) {
        var time = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
        var opt = e('button','pmd-owner-hour-time-option',timeList,time);
        opt.type = 'button';
        opt.setAttribute('data-pmd-owner-hour-time-option',time);
        opt.setAttribute('role','option');
        opt.setAttribute('aria-selected','false');
        opt.tabIndex = -1;
      }
    }
    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-pmd-owner-hour-note-close]')) { closeModal(); return; }
      var timeTrigger = event.target.closest('[data-pmd-owner-hour-time-trigger]');
      if (timeTrigger) { event.preventDefault(); toggleTimeList(); return; }
      var timeOption = event.target.closest('[data-pmd-owner-hour-time-option]');
      if (timeOption) {
        event.preventDefault();
        setChosenTime(timeOption.getAttribute('data-pmd-owner-hour-time-option'));
        closeTimeList(true);
        return;
      }
      var roleButton = event.target.closest('[data-pmd-owner-hour-role]');
      if (roleButton) {
        event.preventDefault();
        event.stopPropagation();
        var code = roleButton.getAttribute('data-pmd-owner-hour-role');
        if (code === 'all') chosenRoles = ['all'];
        else {
          var next = chosenRoles.filter(function (value) { return value !== 'all'; });
          if (next.indexOf(code) >= 0) next = next.filter(function (value) { return value !== code; });
          else next.push(code);
          // Never leave the form silently with zero recipients.
          chosenRoles = next.length ? next : ['all'];
        }
        if (modalError && !setupRequired) modalError.hidden = true;
        paintRoles();
        return;
      }
      if (event.target.closest('[data-pmd-owner-hour-note-send]')) sendNote();
    });
    modal.addEventListener('keydown', function (event) {
      var trigger = event.target.closest('[data-pmd-owner-hour-time-trigger]');
      var option = event.target.closest('[data-pmd-owner-hour-time-option]');
      if (!trigger && !option) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeTimeList(true); return; }
      if (trigger && ['ArrowDown','ArrowUp','Enter',' '].indexOf(event.key) !== -1) {
        event.preventDefault();
        openTimeList(event.key === 'ArrowUp' ? -1 : 1);
        return;
      }
      if (!option) return;
      var buttons = Array.from(modal.querySelectorAll('[data-pmd-owner-hour-time-option]'));
      var index = buttons.indexOf(option);
      var target = index;
      if (event.key === 'ArrowDown') target += 3;
      else if (event.key === 'ArrowUp') target -= 3;
      else if (event.key === 'ArrowRight') target += 1;
      else if (event.key === 'ArrowLeft') target -= 1;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = buttons.length - 1;
      else if (event.key === 'Tab') { closeTimeList(false); return; }
      else return;
      event.preventDefault();
      buttons[Math.max(0,Math.min(buttons.length-1,target))].focus();
    });
    document.addEventListener('pointerdown', function (event) {
      if (modal && !modal.hidden
          && !event.target.closest('[data-pmd-owner-hour-time-picker]')) closeTimeList(false);
    }, true);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal && !modal.hidden) {
        if (!modal.querySelector('[data-pmd-owner-hour-time-list]').hidden) closeTimeList(true);
        else closeModal();
      }
    });
  }
  function setChosenTime(time) {
    if (!/^([01][0-9]|2[0-3]):(00|30)$/.test(time || '')) return;
    chosenTime = time;
    if (!modal) return;
    var value = modal.querySelector('[data-pmd-owner-hour-time-value]');
    if (value) value.textContent = time;
    modal.querySelectorAll('[data-pmd-owner-hour-time-option]').forEach(function (option) {
      var selected = option.getAttribute('data-pmd-owner-hour-time-option') === time;
      option.classList.toggle('is-selected',selected);
      option.setAttribute('aria-selected',selected ? 'true' : 'false');
    });
  }
  function closeTimeList(focusTrigger) {
    if (!modal) return;
    var list = modal.querySelector('[data-pmd-owner-hour-time-list]');
    var trigger = modal.querySelector('[data-pmd-owner-hour-time-trigger]');
    if (!list || list.hidden) return;
    list.hidden = true;
    trigger.setAttribute('aria-expanded','false');
    if (focusTrigger) trigger.focus();
  }
  function openTimeList(direction) {
    if (!modal) return;
    var list = modal.querySelector('[data-pmd-owner-hour-time-list]');
    var trigger = modal.querySelector('[data-pmd-owner-hour-time-trigger]');
    list.hidden = false;
    trigger.setAttribute('aria-expanded','true');
    var options = Array.from(list.querySelectorAll('[data-pmd-owner-hour-time-option]'));
    var index = options.findIndex(function (o) {
      return o.getAttribute('data-pmd-owner-hour-time-option') === chosenTime;
    });
    index = Math.max(0,index);
    var row = Math.floor(index / 3);
    list.scrollTop = Math.max(0,row * 40 - 82);
    if (options.length) options[Math.max(0,Math.min(options.length-1,index + (direction === -1 ? -1 : 0)))].focus();
  }
  function toggleTimeList() {
    if (!modal) return;
    var list = modal.querySelector('[data-pmd-owner-hour-time-list]');
    if (list.hidden) openTimeList(0);
    else closeTimeList(true);
  }
  function updateSendButton() {
    if (!modal) return;
    var button = modal.querySelector('[data-pmd-owner-hour-note-send]');
    if (!button) return;
    var canSend = roleReady && !setupRequired && !actionBusy
      && roles.some(function (role) {return role.code === 'all' && Number(role.count) > 0;});
    button.disabled = !canSend;
    button.setAttribute('aria-disabled', canSend ? 'false' : 'true');
  }
  function paintRoles() {
    if (!modalRoles || !modal) return;
    var memberList = modal.querySelector('[data-pmd-owner-hour-note-members]');
    var memberLabel = modal.querySelector('[data-pmd-owner-hour-member-label]');
    var available = roles.concat(members).map(function (item) {return item.code;});
    chosenRoles = chosenRoles.filter(function (code) {return available.indexOf(code) >= 0;});
    if (!chosenRoles.length) chosenRoles = ['all'];
    var roleSignature = JSON.stringify(roles);
    if (modalRoles.dataset.signature !== roleSignature) {
      modalRoles.textContent = '';
      roles.forEach(function (role) {
        var btn = e('button','pmd-owner-hour-role',modalRoles,role.name + ' · ' + role.count);
        btn.type = 'button';
        btn.setAttribute('data-pmd-owner-hour-role',role.code);
      });
      modalRoles.dataset.signature = roleSignature;
    }
    var memberSignature = JSON.stringify(members);
    if (memberList.dataset.signature !== memberSignature) {
      memberList.textContent = '';
      members.forEach(function (member) {
        var label = member.name + (member.role ? ' · ' + member.role : '');
        var btn = e('button','pmd-owner-hour-role pmd-owner-hour-member',memberList,label);
        btn.type = 'button';
        btn.setAttribute('data-pmd-owner-hour-role',member.code);
      });
      memberList.dataset.signature = memberSignature;
    }
    memberLabel.hidden = !members.length;
    memberList.hidden = !members.length;
    modal.querySelectorAll('[data-pmd-owner-hour-role]').forEach(function (button) {
      var active = chosenRoles.indexOf(button.getAttribute('data-pmd-owner-hour-role')) >= 0;
      button.classList.toggle('is-selected',active);
      button.setAttribute('aria-pressed',active ? 'true' : 'false');
    });
    updateSendButton();
  }
  function openModal(day,time) {
    if (!active()) return;
    ensureModal();
    currentDate = day || selectedDay();
    chosenTime = /^\d{2}:(00|30)$/.test(time || '') ? time : '12:00';
    chosenRoles = ['all'];
    if (!roleReady && !setupRequired && currentYear()) refreshYear(currentYear(), false);
    setChosenTime(chosenTime);
    closeTimeList(false);
    noteList.value = '';
    modal.querySelector('#pmd-hour-note-heading').textContent = 'Note · ' + currentDate;
    modalError.hidden = true;
    paintRoles();
    modal.hidden = false;
    if (setupRequired) notifyError(error || 'Team notes need setup for this restaurant.');
    else if (roleReady && (!roles.length || (roles[0].code === 'all' && Number(roles[0].count) === 0))) {
      notifyError('No active staff accounts yet. Add or activate team members in Shifts before sending.');
    } else if (error) notifyError(error);
    document.documentElement.classList.add('pmd-owner-note-modal-open');
    noteList.focus();
  }
  function closeModal() {
    if (!modal || actionBusy) return;
    closeTimeList(false);
    modal.hidden = true;
    document.documentElement.classList.remove('pmd-owner-note-modal-open');
  }
  function sendNote() {
    if (actionBusy) return;
    var message = String(noteList.value || '').trim();
    if (message.length < 2 || message.length > 1500) { notifyError('Write a message (2–1500 characters).'); return; }
    if (!chosenRoles.length) { notifyError('Choose at least one staff role.'); return; }
    if (!roleReady) { notifyError(error || 'Team notes are not ready yet.'); return; }
    if (!roles.length || (roles[0].code === 'all' && Number(roles[0].count) === 0)) { notifyError('Add or activate staff accounts in Shifts before sending.'); return; }
    actionBusy = true;
    var button = modal.querySelector('[data-pmd-owner-hour-note-send]');
    button.disabled = true;
    request(endpoint,'POST',{date:currentDate,time:chosenTime,message:message,roles:chosenRoles}).then(function () {
      modal.hidden = true;
      document.documentElement.classList.remove('pmd-owner-note-modal-open');
      refreshYear(currentYear(),true);
    }).catch(function (ex) { notifyError(ex.message); }).finally(function () {
      actionBusy = false; updateSendButton();
    });
  }
  function deleteNote(id) {
    if (actionBusy || !window.confirm('Remove this message for all recipients?')) return;
    actionBusy = true;
    request(endpoint + '/' + encodeURIComponent(id) + '/remove','POST').then(function () {
      refreshYear(currentYear(),true);
    }).catch(function (ex) { notifyError(ex.message); window.alert(ex.message); })
      .finally(function () { actionBusy = false; });
  }
  function patchHours(calendarRoot) {
    calendarRoot.querySelectorAll('[data-pmd-reservations-slot-date][data-pmd-reservations-slot-time]').forEach(function (slot) {
      var date = slot.getAttribute('data-pmd-reservations-slot-date');
      var time = slot.getAttribute('data-pmd-reservations-slot-time');
      var content = slot.querySelector('.pmd-r2-timeslot__content');
      if (!content) return;
      var button = content.querySelector('[data-pmd-owner-hour-note-add]');
      if (!button) {
        button = e('button','pmd-owner-hour-note-plus',content,'+');
        button.type = 'button';
        button.setAttribute('data-pmd-owner-hour-note-add','');
        button.setAttribute('aria-label','Add team note at ' + time);
      }
      var itemNotes = bySlot(date,time);
      var existingList = content.querySelector('[data-pmd-owner-hour-slot-notes]');
      var signature = itemNotes.map(function (x) { return x.id+':'+x.confirmed; }).join(',');
      slot.classList.toggle('pmd-owner-hour-has-notes',itemNotes.length>0);
      if (!itemNotes.length) {
        if (existingList) existingList.remove();
        return;
      }
      if (existingList && existingList.dataset.noteSignature === signature) return;
      if (existingList) existingList.remove();
      var list = e('div','pmd-owner-hour-slot-notes',content);
      list.setAttribute('data-pmd-owner-hour-slot-notes','');
      list.dataset.noteSignature = signature;
      itemNotes.forEach(function (item) {
        var article = e('article','pmd-owner-hour-note-item',list);
        var main = e('div','pmd-owner-hour-note-item__main',article);
        e('p','',main,item.message);
        e('small','',main,roleNames(item.roles) + ' · ' + item.confirmed + '/' + item.recipients + ' confirmed');
        var remove = e('button','pmd-owner-hour-note-item__remove',article,'×');
        remove.type = 'button';
        remove.setAttribute('data-pmd-owner-hour-note-remove',String(item.id));
        remove.setAttribute('aria-label','Remove this staff note');
      });
      content.appendChild(button);
    });
  }
  function patchMonth(calendarRoot) {
    var filter = calendarRoot.querySelector('[data-r2-yc-filter].is-active');
    var show = !filter || filter.getAttribute('data-r2-yc-filter') === 'all';
    calendarRoot.querySelectorAll('[data-r2-yc-date]').forEach(function (day) {
      var dayKey = day.getAttribute('data-r2-yc-date');
      var ops = day.querySelector('.pmd-yc-day__operations');
      if (!ops) return;
      var count = show ? byDay(dayKey).length : 0;
      var existing = ops.querySelector('[data-pmd-owner-day-note-count]');
      if (!count) { if (existing) existing.remove(); return; }
      var isDots = ops.classList.contains('is-dot-mode');
      if (existing && existing.dataset.noteCount === String(count)) return;
      if (existing) existing.remove();
      var badge = e(isDots ? 'i':'span', isDots ? 'pmd-r2-yc-dot is-note' : 'pmd-r2-yc-entry is-note pmd-owner-day-note-count',ops,
        isDots ? undefined : count + (count===1?' team note':' team notes'));
      badge.dataset.pmdOwnerDayNoteCount = '';
      badge.dataset.noteCount = String(count);
    });
  }
  function repaint() {
    var view = root(); if (!active() || !view) return;
    var date = selectedDay();
    if (date) patchHours(view);
    else patchMonth(view);
  }
  function check() {
    scheduled = false;
    if (!active()) return;
    var targetYear = currentYear();
    if (targetYear && loadedYear !== targetYear && !pendingRequest && Date.now() >= retryAfter) refreshYear(targetYear,false);
    repaint();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || function (f) { window.setTimeout(f,16); })(check);
  }
  document.addEventListener('click', function (event) {
    if (!active()) return;
    var btn = event.target.closest('[data-pmd-owner-hour-note-add]');
    var heading = event.target.closest('.pmd-owner-hour-note-btn[data-r2-yc-note]');
    var remove = event.target.closest('[data-pmd-owner-hour-note-remove]');
    var withinNotes = event.target.closest('[data-pmd-owner-hour-slot-notes]');
    if (!(btn || heading || remove || withinNotes)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (remove) { deleteNote(remove.getAttribute('data-pmd-owner-hour-note-remove')); return; }
    if (btn) {
      var slot = btn.closest('[data-pmd-reservations-slot-date][data-pmd-reservations-slot-time]');
      if (slot) openModal(slot.getAttribute('data-pmd-reservations-slot-date'),slot.getAttribute('data-pmd-reservations-slot-time'));
    } else if (heading) {
      openModal(selectedDay(), '12:00');
    }
  },true);

  if (window.MutationObserver) {
    var observer = new MutationObserver(function (records) {
      var relevant = records.some(function (record) {
        var node = record.target;
        // Ignore the modal; it is not part of the calendar rendering.
        return node && node.nodeType === 1 && !node.closest('[data-pmd-owner-hour-note-modal]');
      });
      if (relevant) schedule();
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }
  window.setInterval(function () {
    if (active() && document.visibilityState !== 'hidden') refreshYear(currentYear(),true);
  },90000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { refreshYear(currentYear(),true); schedule(); }
  });
  window.PMDOwnerHourTeamNotesR11 = {
    refresh:function () {retryAfter = 0; refreshYear(currentYear(),true)},
    audit:function () {return {ready:roleReady,year:loadedYear,notes:notes.length,roles:roles.length,members:members.length,error:error,setupRequired:setupRequired,pending:pendingRequest,retryAfter:retryAfter};}
  };
  schedule();
})();
