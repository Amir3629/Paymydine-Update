/* PMD_STAFF_PORTAL_TIME_CLOCK_CLIENT_V1 */
/* PMD_STAFF_GEOFENCE_ONDEMAND_V1_20261021 */
/* PMD_STAFF_CLOCK_GPS_PERMISSION_GUIDANCE_V2_20261021 */
/* PMD_STAFF_NATIVE_CLOCK_GPS_V1_20261022 */
/* PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022 */
/* PMD_STAFF_CLOCK_STICKY_ERRORS_V2_20261022 */
(function () {
  'use strict';

  var state = window.PMD_STAFF_TIME_CLOCK || null;
  if (!state) return;

  var schedule = document.getElementById('schedule');
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
      (state.unscheduled ? ' · Unscheduled work recorded' : '');
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
    form +
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

  var monthNav = schedule.querySelector('.pmd-staff-month-nav');
  if (monthNav) schedule.insertBefore(card, monthNav);
  else schedule.insertBefore(card, schedule.firstChild);


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

      if (nativeStaffClock) {
        var request = String(Date.now()) + '_' + String(++nativeCounter) + '_' +
          Math.random().toString(36).slice(2, 14);
        window.PMD_STAFF_NATIVE_GPS_RESULT = function (data) {
          if (!data || data.request !== request) return;
          if (nativeTimeout !== null) window.clearTimeout(nativeTimeout);
          nativeTimeout = null;
          window.PMD_STAFF_NATIVE_GPS_RESULT = null;

          if (!data.ok) {
            resetClockButton(nativeGpsError(data.error), 'native');
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
          nativeTimeout = null;
          resetClockButton('No response from the Staff app GPS bridge. Update the Staff APK and retry.', 'native');
        }, 25000);
        try {
          window.location.assign('pmdstaffgeo://clock?request=' + encodeURIComponent(request));
        } catch (error) {
          window.clearTimeout(nativeTimeout);
          nativeTimeout = null;
          window.PMD_STAFF_NATIVE_GPS_RESULT = null;
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
