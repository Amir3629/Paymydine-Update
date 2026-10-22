/* PMD_STAFF_PORTAL_TIME_CLOCK_CLIENT_V1 */
/* PMD_STAFF_GEOFENCE_ONDEMAND_V1_20261021 */
/* PMD_STAFF_CLOCK_GPS_PERMISSION_GUIDANCE_V2_20261021 */
/* PMD_STAFF_NATIVE_CLOCK_GPS_V1_20261022 */
/* PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022 */
/* PMD_STAFF_CLOCK_STICKY_ERRORS_V2_20261022 */
/* PMD_STAFF_TIME_AND_BREAK_V1_20261022 */
/* PMD_STAFF_FAST_PRECISE_GPS_V2_20261022 */
/* PMD_STAFF_FUSED_LOCATION_V3_20261022 */
/* PMD_STAFF_LOCATION_SETTINGS_PREFLIGHT_V4_20261022 */
(function () {
  'use strict';

  var state = window.PMD_STAFF_TIME_CLOCK || null;
  if (!state) return;

  var schedule = document.getElementById('schedule');
  var clockTarget = document.querySelector('[data-pmd-staff-clock-target]');
  if (!schedule || schedule.querySelector('[data-pmd-staff-time-clock]')) return;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character];
    });
  }

  function csrf() {
    var node = document.querySelector('meta[name="csrf-token"]');
    return node ? String(node.getAttribute('content') || '') : '';
  }

  function duration(seconds) {
    seconds = Math.max(0, Math.floor(Number(seconds || 0)));
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = seconds % 60;
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  var ready = !!state.ready && (!state.geo_required || !!state.geo_ready);
  var active = ready && !!state.active;
  var title = active ? 'Working now' : (ready ? 'Ready to start' : 'Time clock unavailable');
  var meta = '';
  if (active) {
    meta = 'Started ' + escapeHtml(state.check_in_label || '') + ' · <b data-pmd-clock-elapsed>' + duration(state.elapsed_seconds) + '</b>' +
      (state.unscheduled ? ' · Unscheduled work recorded' : '') +
      (state.break_active ? ' · Break in progress' : '');
  } else if (ready && state.scheduled_label) {
    meta = escapeHtml(state.scheduled_label);
  } else if (ready && state.last_check_out_label) {
    meta = 'Last shift ended ' + escapeHtml(state.last_check_out_label) + (state.last_hours != null ? ' · ' + Number(state.last_hours).toFixed(2) + 'h' : '');
  } else if (ready) {
    meta = 'No rota shift assigned? You can still start onsite. Your real work time will be recorded for the manager.';
  } else {
    meta = state.geo_required && !state.geo_ready ? 'The restaurant location is missing. Ask the owner to set it in Restaurant Profile.' : 'Attendance storage is not ready for this restaurant.';
  }

  var clockError = String(state.flash_error || '');
  function tr(value) {
    return window.PMD_STAFF_TRANSLATE ? window.PMD_STAFF_TRANSLATE(value) : value;
  }
  var action = active ? state.clock_out_url : state.clock_in_url;
  var button = active ? 'Check out' : 'Start shift';
  var form = ready && action ? '' +
    '<form method="post" data-pmd-clock-geo-form action="' + escapeHtml(action) + '">' +
      '<input type="hidden" name="_token" value="' + escapeHtml(csrf()) + '">' +
      '<button type="submit" class="pmd-staff-time-clock__button">' + button + '</button>' +
    '</form>' : '';

  var breaksActive = !!state.break_active;
  var hasTrackedBreaks = Number(state.break_count || 0) > 0;
  var breakForm = active && state.clock_break_url ? '' +
    '<form method="post" class="pmd-staff-break-actions" action="' +
      escapeHtml(state.clock_break_url) + '" data-pmd-clock-break-form>' +
    '<input type="hidden" name="_token" value="' + escapeHtml(csrf()) + '">' +
    '<input type="hidden" name="break_action" value="' + (breaksActive ? 'end' : 'start') + '">' +
    '<button type="submit">' + (breaksActive ? 'End break' : 'Start break') + '</button></form>' : '';
  var breakQuestion = active && !hasTrackedBreaks ? '' +
    '<div class="pmd-staff-break-question" role="dialog" aria-modal="true" aria-label="Break time" data-pmd-break-question hidden>' +
      '<strong>Before you finish</strong><p>Did you take a break?</p>' +
      '<div class="pmd-staff-break-choices">' +
        '<button type="button" data-pmd-break-no>No break</button>' +
        '<button type="button" data-pmd-break-yes>Yes, enter minutes</button>' +
      '</div>' +
      '<label data-pmd-break-minutes hidden>Break minutes <input type="number" min="1" max="240" step="1" value="30" inputmode="numeric"></label>' +
      '<div class="pmd-staff-break-choices">' +
        '<button type="button" data-pmd-break-cancel>Cancel</button>' +
        '<button type="button" data-pmd-break-confirm hidden>Continue to finish</button>' +
      '</div>' +
    '</div>' : '';
  var card = document.createElement('section');
  card.className = 'pmd-staff-time-clock' + (active ? ' is-active' : '');
  card.setAttribute('data-pmd-staff-time-clock', '');
  card.innerHTML = '' +
    '<span class="pmd-staff-time-clock__icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2M9 2h6M12 2v3"></path></svg>' +
    '</span>' +
    '<span class="pmd-staff-time-clock__copy">' +
      '<small>Time clock</small>' +
      '<strong>' + title + '</strong>' +
      '<span>' + meta + '</span>' +
    '</span>' +
    form + breakForm + breakQuestion +
    (clockError ? '<div class="pmd-staff-time-clock__server-error" role="alert" data-pmd-clock-server-error>' +
        '<strong>Shift not recorded</strong><span>' + escapeHtml(clockError) + '</span>' +
        '<button type="button" data-pmd-clock-dismiss aria-label="Dismiss error">Dismiss</button>' +
      '</div>' : '');

  var dismissError = card.querySelector('[data-pmd-clock-dismiss]');
  if (dismissError) {
    dismissError.addEventListener('click', function () {
      var notice = card.querySelector('[data-pmd-clock-server-error]');
      if (notice) notice.hidden = true;
    });
  }

  if (clockTarget) {
    clockTarget.appendChild(card);
  } else {
    // Old Portal/Web clients still render this card inside My Shifts.
    var monthNav = schedule.querySelector('.pmd-staff-month-nav');
    if (monthNav) schedule.insertBefore(card, monthNav);
    else schedule.insertBefore(card, schedule.firstChild);
  }
  if (active) {
    var timeNav = document.querySelector('[data-pmd-time-tab]');
    if (timeNav) timeNav.setAttribute('data-pmd-clock-working', 'true');
  }

  // Breaks are captured by the authenticated server, with no location request.
  // The actual gross/net hours are calculated server-side at clock-out.
  var breakQuestionNode = card.querySelector('[data-pmd-break-question]');
  var breakConfirmed = false;
  function setBreakValue(form, name, value) {
    var existing = form.querySelector('input[name="' + name + '"]');
    if (!existing) {
      existing = document.createElement('input');
      existing.type = 'hidden';
      existing.name = name;
      form.appendChild(existing);
    }
    existing.value = String(value);
  }
  if (breakQuestionNode) {
    var no = breakQuestionNode.querySelector('[data-pmd-break-no]');
    var yes = breakQuestionNode.querySelector('[data-pmd-break-yes]');
    var cancel = breakQuestionNode.querySelector('[data-pmd-break-cancel]');
    var confirm = breakQuestionNode.querySelector('[data-pmd-break-confirm]');
    var minutesLabel = breakQuestionNode.querySelector('[data-pmd-break-minutes]');
    var minutesInput = minutesLabel && minutesLabel.querySelector('input');
    var finishForm = card.querySelector('[data-pmd-clock-geo-form]');
    function resumeClockOut(choice, minutes) {
      if (!finishForm) return;
      setBreakValue(finishForm, 'break_report', choice);
      setBreakValue(finishForm, 'break_minutes', minutes);
      breakConfirmed = true;
      breakQuestionNode.hidden = true;
      if (typeof finishForm.requestSubmit === 'function') {
        finishForm.requestSubmit();
      } else {
        finishForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }
    no.addEventListener('click', function () { resumeClockOut('none', 0); });
    yes.addEventListener('click', function () {
      minutesLabel.hidden = false;
      confirm.hidden = false;
      no.hidden = true;
      yes.hidden = true;
      if (minutesInput) minutesInput.focus();
    });
    cancel.addEventListener('click', function () {
      breakQuestionNode.hidden = true;
      if (finishForm) {
        var button = finishForm.querySelector('button[type="submit"]');
        if (button) button.focus();
      }
    });
    confirm.addEventListener('click', function () {
      var minutes = Number(minutesInput ? minutesInput.value : '');
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
        if (minutesInput) { minutesInput.setCustomValidity('Enter 1–240 minutes.'); minutesInput.reportValidity(); }
        return;
      }
      if (minutesInput) minutesInput.setCustomValidity('');
      resumeClockOut('manual', minutes);
    });
  }


  // Geolocation consent happens ONLY after tapping the shift button.
  // No background watcher or raw GPS persistence.
  var punchForm = card.querySelector('[data-pmd-clock-geo-form]');
  if (punchForm) {
    var checking = false;
    var status = document.createElement('span');
    status.className = 'pmd-staff-time-clock__geo-feedback';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    punchForm.appendChild(status);
    // A geolocation PERMISSION_DENIED happens in this browser/WebView before
    // any attendance POST. This advice never relaxes the server geofence.
    function explainGeoPermissionDenied() {
      var policy = document.permissionsPolicy || document.featurePolicy;
      if (policy && typeof policy.allowsFeature === 'function') {
        try {
          if (!policy.allowsFeature('geolocation')) {
            return 'GPS is blocked by this page\'s permissions policy. Open Staff Portal directly in the restaurant website.';
          }
        } catch (ignored) {}
      }
      var agent = String(navigator.userAgent || '');
      if (/Android/i.test(agent) && /;\s*wv\b/i.test(agent)) {
        return 'Android GPS permission denied. Open Settings > Apps > PayMyDine Staff > Permissions > Location; allow while using the app and turn on Precise location. Then retry.';
      }
      if (/Android/i.test(agent)) {
        return 'GPS permission denied. Enable phone Location and allow precise Location for this restaurant in browser site settings, then retry.';
      }
      return 'GPS permission denied. Allow Location for this restaurant in browser site permissions and enable device Location, then retry.';
    }

    // A separate Staff Android APK can collect ONE fresh foreground fix directly
    // from Android LocationManager. Old APKs and browsers use normal Web GPS.
    // This avoids a second WebView site-permission layer, never bypasses Android
    // runtime permission, and still submits to the original server geofence.
    var nativeStaffClock = /PMDStaffNativeGPS\/1(?:\b|$)/.test(String(navigator.userAgent || ''));
    var nativeHelp = /PMDStaffGPSHelp\/1(?:\b|$)/.test(String(navigator.userAgent || ''));
    var locationButton = null;
    function locationRecoveryButton(reason) {
      if (!nativeHelp) return;
      if (!locationButton) {
        locationButton = document.createElement('button');
        locationButton.type = 'button';
        locationButton.className = 'pmd-staff-time-clock__location-help';
        locationButton.addEventListener('click', function () {
          var destination = locationButton.getAttribute('data-pmd-gps-settings');
          window.location.assign(destination === 'app' ?
            'pmdstaff://apppermissions' : 'pmdstaff://locationsettings');
        });
        punchForm.appendChild(locationButton);
      }
      locationButton.hidden = !reason;
      if (reason) {
        locationButton.textContent = reason === 'denied' ? 'Open Staff app permission' : 'Open phone location settings';
        locationButton.setAttribute('data-pmd-gps-settings', reason === 'denied' ? 'app' : 'phone');
      }
    }
    var nativeCounter = 0;
    var nativeTimeout = null;

    function resetClockButton(message, reason) {
      checking = false;
      var submit = punchForm.querySelector('button[type="submit"]');
      if (submit) submit.disabled = false;
      if (reason) {
        status.setAttribute('data-pmd-gps-error', reason);
        status.setAttribute('role', 'alert');
      }
      status.textContent = tr(message);
      locationRecoveryButton(reason);
    }

    function savePosition(position) {
      var c = position.coords || {};
      var ts = Number(position.timestamp);
      if (!Number.isFinite(c.latitude) || Math.abs(c.latitude) > 90 ||
          !Number.isFinite(c.longitude) || Math.abs(c.longitude) > 180 ||
          !Number.isFinite(c.accuracy) || c.accuracy <= 0 || c.accuracy > 90 ||
          !Number.isFinite(ts) || Math.abs(Date.now() - ts) > 90000) {
        resetClockButton('No recent precise GPS fix. Try near a window or outdoors.', 'accuracy');
        return;
      }

      var fields = {
        geo_lat: c.latitude, geo_lng: c.longitude,
        geo_accuracy_m: c.accuracy, geo_captured_at_ms: ts
      };
      Object.keys(fields).forEach(function (key) {
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = key;
        hidden.value = String(fields[key]);
        punchForm.appendChild(hidden);
      });
      status.textContent = tr('GPS checked. Saving the shift…');
      HTMLFormElement.prototype.submit.call(punchForm);
    }

    function nativeGpsError(reason) {
      if (/^inaccurate:[0-9]{1,4}$/.test(reason || '')) {
        var accuracy = Number(reason.split(':')[1]);
        return 'Current GPS accuracy is about ' + accuracy +
          ' m. Clock-in requires 90 m or better. Try outdoors or enable Precise location, then retry.';
      }
      if (reason === 'location_accuracy_off') {
        return 'Location Accuracy is off. Accept the Android location prompt, or open Settings > Location > Location services > Location Accuracy and enable Improve Location Accuracy.';
      }
      if (reason === 'no_fix' || reason === 'no_fix_fused') {
        return 'Phone GPS and Google location services returned no position. Open Google Maps and check the blue location dot; enable Location Accuracy and Wi-Fi scanning, then retry.';
      }
      if (reason === 'no_fix_no_google') {
        return 'Google location services are unavailable on this device; Android GPS also returned no position. Turn on precise Location and try outdoors.';
      }
      if (reason === 'no_fix_gps_only') {
        return 'Only satellite GPS is available and no fresh fix was received. Enable network location or Wi-Fi scanning, or try outdoors.';
      }
      if (reason === 'no_fix_network_off') {
        return 'Network location is disabled and GPS could not find a position. Enable Location Accuracy or network location and retry.';
      }
      if (reason === 'precise_denied') {
        return 'Android did not grant precise GPS to PayMyDine Staff. Check Staff app permission (Precise), not the browser.';
      }
      if (reason === 'location_off') {
        return 'Device Location is switched off. Turn on Location on your phone and retry.';
      }
      if (reason === 'timeout') {
        return 'Android GPS did not find an accurate fresh position. Move near a window or outdoors and retry.';
      }
      if (reason === 'provider_unavailable') {
        return 'Android location providers are unavailable. Check device Location services and retry.';
      }
      return 'Android could not obtain a fresh position. Retry onsite.';
    }

    punchForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (checking) return;
      if (active && breakQuestionNode && !breakConfirmed) {
        breakQuestionNode.hidden = false;
        if (no) no.focus();
        return;
      }
      if (!window.isSecureContext || (!nativeStaffClock && !navigator.geolocation)) {
        status.textContent = 'Location requires HTTPS and an available GPS provider.';
        return;
      }
      checking = true;
      var submit = punchForm.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      status.removeAttribute('data-pmd-gps-error');
      status.setAttribute('role', 'status');
      status.textContent = tr('Checking your location near the restaurant…');
      locationRecoveryButton(null);

      if (nativeStaffClock) {
        var request = String(Date.now()) + '_' + String(++nativeCounter) + '_' +
          Math.random().toString(36).slice(2, 14);
        status.textContent = tr('Requesting a fresh location from Android and Google location services…');
        window.PMD_STAFF_NATIVE_GPS_PROGRESS = function (data) {
          if (!data || data.request !== request) return;
          var estimate = Number(data.accuracy_m);
          if (Number.isFinite(estimate) && estimate > 90 && estimate < 9999) {
            status.textContent = tr('GPS is locating you: approximately ' +
              Math.round(estimate) + ' m accuracy. Need 90 m or better.');
          }
        };
        window.PMD_STAFF_NATIVE_GPS_RESULT = function (data) {
          if (!data || data.request !== request) return;
          if (nativeTimeout !== null) window.clearTimeout(nativeTimeout);
          nativeTimeout = null;
          window.PMD_STAFF_NATIVE_GPS_RESULT = null;
          window.PMD_STAFF_NATIVE_GPS_PROGRESS = null;

          if (!data.ok) {
            resetClockButton(nativeGpsError(data.error),
              data.error === 'precise_denied' ? 'denied' : 'native');
            return;
          }

          savePosition({
            coords: {
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              accuracy: Number(data.accuracy_m)
            },
            timestamp: Number(data.captured_at_ms)
          });
        };

        // Do not put coordinates, tokens, or login details in the bridge URL.
        nativeTimeout = window.setTimeout(function () {
          window.PMD_STAFF_NATIVE_GPS_RESULT = null;
          window.PMD_STAFF_NATIVE_GPS_PROGRESS = null;
          nativeTimeout = null;
          resetClockButton('No reply from Android location service. Reopen the Staff app and retry.', 'native');
        }, 35000);
        try {
          window.location.assign('pmdstaffgeo://clock?request=' + encodeURIComponent(request));
        } catch (error) {
          window.clearTimeout(nativeTimeout);
          nativeTimeout = null;
          window.PMD_STAFF_NATIVE_GPS_RESULT = null;
          window.PMD_STAFF_NATIVE_GPS_PROGRESS = null;
          resetClockButton('Could not start Android GPS. Reopen the Staff app and retry.', 'native');
        }
        return;
      }

      navigator.geolocation.getCurrentPosition(savePosition, function (error) {
        if (error && error.code === 1) {
          resetClockButton(explainGeoPermissionDenied(), 'denied');
          if (window.console && typeof window.console.warn === 'function') {
            // No personal data, raw GPS or tokens are emitted.
            window.console.warn('[PMD Staff Clock] Web geolocation denied before attendance POST', {
              secureContext: !!window.isSecureContext,
              embedded: window.self !== window.top
            });
          }
        } else {
          resetClockButton(error && error.code === 3
            ? 'GPS timed out. Move near a window and retry onsite.'
            : 'No fresh GPS fix found. Retry onsite.', 'unavailable');
        }
      }, {enableHighAccuracy:true, maximumAge:0, timeout:15000});
    });
  }

  if (active) {
    var elapsed = card.querySelector('[data-pmd-clock-elapsed]');
    var base = Math.max(0, Number(state.elapsed_seconds || 0));
    var startedAt = Date.now();
    window.setInterval(function () {
      if (!elapsed) return;
      elapsed.textContent = duration(base + Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  }
})();
