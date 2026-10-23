/* PMD_STAFF_PIN_OWNER_DIAGNOSTICS_V1_20261023
 * Owner-only Restaurant Settings. Read saved coordinates directly from inputs,
 * not text addresses or an unverified Google geocode.
 * No background GPS, network call, or automatic save.
 */
(function () {
    'use strict';
    var box = document.querySelector('[data-pmd-staff-pin-audit]');
    if (!box) return;
    var compare = box.querySelector('[data-pmd-pin-compare]');
    var use = box.querySelector('[data-pmd-pin-use-device]');
    var result = box.querySelector('[data-pmd-pin-result]');
    var lat = document.getElementById('pmd-staff-clock-lat-v1');
    var lng = document.getElementById('pmd-staff-clock-lng-v1');
    if (!compare || !result || !lat || !lng) return;
    var recent = null;

    function validCoords(a, b) {
        return Number.isFinite(a) && Number.isFinite(b) &&
            Math.abs(a) <= 90 && Math.abs(b) <= 180 && !(a === 0 && b === 0);
    }

    function distanceMeters(a, b, c, d) {
        var rad = Math.PI / 180;
        var dLat = (c - a) * rad, dLng = (d - b) * rad;
        var h = Math.pow(Math.sin(dLat / 2), 2) +
            Math.cos(a * rad) * Math.cos(c * rad) * Math.pow(Math.sin(dLng / 2), 2);
        return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(Math.max(0, h))));
    }

    compare.addEventListener('click', function () {
        recent = null;
        use.hidden = true;
        if (!window.isSecureContext || !navigator.geolocation) {
            result.textContent = 'Device location is unavailable in this browser. Use HTTPS and enable location permission.';
            return;
        }
        compare.disabled = true;
        result.textContent = 'Checking this device location once. Nothing is saved.';
        navigator.geolocation.getCurrentPosition(function (fix) {
            compare.disabled = false;
            var coords = fix && fix.coords;
            var a = Number(coords && coords.latitude);
            var b = Number(coords && coords.longitude);
            var accuracy = Number(coords && coords.accuracy);
            var ageMs = Date.now() - Number(fix && fix.timestamp);
            if (!validCoords(a, b) || !Number.isFinite(accuracy) ||
                accuracy <= 0 || ageMs < -5000 || ageMs > 30000) {
                result.textContent = 'A recent, valid device position was not returned. Try again near the entrance.';
                return;
            }
            var pinLat = Number(lat.value), pinLng = Number(lng.value);
            var hasPin = lat.value.trim() !== '' && lng.value.trim() !== '' &&
                validCoords(pinLat, pinLng);
            var message = 'Device accuracy: about ' + Math.round(accuracy) + ' m.';
            if (hasPin) {
                var metres = Math.round(distanceMeters(pinLat, pinLng, a, b));
                message += ' Distance to saved Staff entrance pin: ' + metres +
                    ' m. Server limit: 175 m, GPS accuracy max: 90 m. ' +
                    (metres > 175 ? 'This saved pin/device pair will be rejected.' :
                        'Distance is within the configured area.');
            } else {
                message += ' No valid entrance pin has been entered in this form.';
            }
            result.textContent = message;
            if (accuracy <= 30) {
                recent = {lat: a, lng: b, captured: Date.now()};
                use.hidden = false;
            } else {
                result.textContent += ' Device accuracy must be 30 m or better to suggest a new pin.';
            }
        }, function (error) {
            compare.disabled = false;
            result.textContent = error && error.code === 1
                ? 'Location permission denied. Allow location for this admin page to compare the pin.'
                : 'No recent device position. Check device Location services and try again.';
        }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 0});
    });

    use.addEventListener('click', function () {
        if (!recent || Date.now() - recent.captured > 30000) {
            use.hidden = true;
            result.textContent = 'Device position expired. Check the distance again.';
            return;
        }
        if (!window.confirm('Only do this while PHYSICALLY STANDING AT THE RESTAURANT ENTRANCE on a REAL GPS device. Do not use an Android emulator or a remote computer location as the staff pin. Continue?')) {
            return;
        }
        lat.value = recent.lat.toFixed(6);
        lng.value = recent.lng.toFixed(6);
        lat.dispatchEvent(new Event('input', {bubbles: true}));
        lng.dispatchEvent(new Event('input', {bubbles: true}));
        use.hidden = true;
        result.textContent = 'Entrance fields updated locally, NOT saved. Review them on the map, then use Save Changes above. This does not change the public booking address.';
    });
})();
