/* PMD_STAFF_ADDRESS_GEO_PREVIEW_V1_20261023
 * Owner enters the public restaurant address once; PayMyDine resolves the
 * map position server-side and the owner approves it for staff attendance.
 * The phone never needs the restaurant address, only foreground GPS.
 * No silent geocode writes, no background employee tracking.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-pmd-staff-address-setup]');
  var form = document.getElementById('pmd-restaurant-profile-form');
  if (!root || !form) return;

  var find = root.querySelector('[data-pmd-staff-find-address]');
  var preview = root.querySelector('[data-pmd-staff-address-preview]');
  var found = root.querySelector('[data-pmd-staff-found-address]');
  var map = root.querySelector('[data-pmd-staff-found-map]');
  var accepted = root.querySelector('[data-pmd-staff-confirm-entrance]');
  var apply = root.querySelector('[data-pmd-staff-use-address]');
  var status = root.querySelector('[data-pmd-staff-address-status]');
  var latInput = document.getElementById('pmd-staff-clock-lat-v1');
  var lngInput = document.getElementById('pmd-staff-clock-lng-v1');
  var previousPin = {lat: latInput ? latInput.value : '', lng: lngInput ? lngInput.value : ''};
  var pending = null;
  var applied = false;
  var trackedKeys = ['address_1', 'address_2', 'city', 'state', 'postcode'];
  var fields = trackedKeys.map(function (key) {
    return form.querySelector('[name="profile[' + key + ']"]');
  });
  if (!find || !preview || !found || !map || !accepted || !apply ||
      !status || !latInput || !lngInput || fields.some(function (x) { return !x; })) return;

  function validPosition(lat, lng) {
    return Number.isFinite(lat) && Number.isFinite(lng) &&
      Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  }
  function setStatus(message) { status.textContent = String(message || ''); }
  function onAddressChanged() {
    pending = null;
    preview.hidden = true;
    accepted.checked = false;
    apply.disabled = true;
    if (applied) {
      // A pin from the OLD address must never be kept when the owner edits
      // street/city/postcode before clicking the existing Save button.
      latInput.value = previousPin.lat;
      lngInput.value = previousPin.lng;
      applied = false;
      setStatus('Address changed. Find the new location again before saving the check-in point.');
    }
  }
  fields.forEach(function (field) { field.addEventListener('input', onAddressChanged); });

  find.addEventListener('click', function () {
    if (find.disabled) return;
    var street = fields[0].value.trim();
    var city = fields[2].value.trim();
    var post = fields[4].value.trim();
    if (street.length < 3 || city.length < 2 || post.length < 3) {
      setStatus('Enter a street, city and postcode first.');
      return;
    }
    onAddressChanged();
    setStatus('Finding your restaurant address…');
    find.disabled = true;
    var data = new FormData();
    var csrf = form.querySelector('input[name="_token"]');
    if (csrf) data.set('_token', csrf.value);
    trackedKeys.forEach(function (key, index) {
      data.set('profile[' + key + ']', fields[index].value.trim());
    });
    fetch(form.getAttribute('action') || window.location.href, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-IGNITER-REQUEST-HANDLER': 'onPreviewStaffClockAddress',
        'Accept': 'application/json'
      },
      body: data
    }).then(function (response) {
      return response.text().then(function (raw) {
        var json = null;
        try { json = JSON.parse(raw); } catch (ignore) {}
        if (!response.ok || response.redirected || !json || typeof json !== 'object') {
          throw new Error((json && (json.X_IGNITER_ERROR_MESSAGE || json.message)) ||
            'Could not find the address. Check postcode and city and try again.');
        }
        return json;
      });
    }).then(function (data) {
      var result = data.pmd_staff_address_lookup;
      var lat = Number(result && result.latitude);
      var lng = Number(result && result.longitude);
      if (!result || !validPosition(lat, lng) ||
          Number(result.location_id) !== Number(root.getAttribute('data-pmd-location-id'))) {
        throw new Error('The map service did not return a valid position for this restaurant.');
      }
      pending = {lat: lat, lng: lng};
      found.textContent = String(result.address || '');
      map.href = 'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(lat.toFixed(6) + ',' + lng.toFixed(6));
      accepted.checked = false;
      apply.disabled = true;
      preview.hidden = false;
      setStatus('Check the map link. The check-in point is not saved yet.');
    }).catch(function (error) {
      pending = null;
      preview.hidden = true;
      setStatus(error && error.message ? error.message :
        'Map lookup is unavailable. Check the restaurant address and map service settings.');
    }).finally(function () { find.disabled = false; });
  });

  accepted.addEventListener('change', function () {
    apply.disabled = !accepted.checked || !pending;
  });

  apply.addEventListener('click', function () {
    if (!pending || !accepted.checked || !validPosition(pending.lat, pending.lng)) return;
    previousPin = {lat: latInput.value, lng: lngInput.value};
    latInput.value = pending.lat.toFixed(6);
    lngInput.value = pending.lng.toFixed(6);
    latInput.dispatchEvent(new Event('input', {bubbles: true}));
    lngInput.dispatchEvent(new Event('input', {bubbles: true}));
    var clear = form.querySelector('input[name="profile[staff_clock_clear]"]');
    if (clear && clear.type === 'checkbox') clear.checked = false;
    applied = true;
    pending = null;
    apply.disabled = true;
    var details = document.getElementById('pmd-staff-attendance-config');
    if (details) {
      var label = details.querySelector('.pmd-profile-staff-gps-fold__status');
      if (label) label.textContent = 'New location ready to save';
    }
    setStatus('Check-in location selected. Click Save changes to activate it for your staff.');
  });
})();
