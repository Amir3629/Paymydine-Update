'use strict';
// PMD_STAFF_NATIVE_CLOCK_GPS_CONTRACT_V1_20261022
// Browser-only client contract. Does not send attendance data or request a real GPS fix.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname,
  '../../app/admin/assets/js/pmd-staff-time-clock-v1.js'), 'utf8');

function setup(userAgent, overrides) {
  const submitted = { count: 0 };
  const button = { disabled: false };
  const form = {
    children: [],
    listeners: {},
    appendChild(element) { this.children.push(element); },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    querySelector(selector) { return selector === 'button[type="submit"]' ? button : null; }
  };
  const card = {
    className: '', innerHTML: '',
    setAttribute() {},
    querySelector(selector) {
      return selector === '[data-pmd-clock-geo-form]' ? form : null;
    }
  };
  const schedule = {
    firstChild: null,
    querySelector() { return null; },
    insertBefore() {}
  };
  const state = Object.assign({
    ready: true, active: false, geo_required: true, geo_ready: true,
    clock_in_url: '/admin/mywork/clockin',
    clock_out_url: '/admin/mywork/clockout'
  }, overrides || {});
  let assigned = '';
  let webGpsCalls = 0;
  let browserError = null;
  const windowObject = {
    PMD_STAFF_TIME_CLOCK: state,
    isSecureContext: true,
    console: { warn() {} },
    location: { assign(url) { assigned = url; } },
    setTimeout() { return 123; },
    clearTimeout() {},
    // Active unscheduled shifts render an elapsed-time ticker in a real browser.
    // The fake browser only needs a no-op scheduler; no timer work runs in this test.
    setInterval() { return 456; }
  };
  windowObject.self = windowObject;
  windowObject.top = windowObject;
  const documentObject = {
    getElementById(id) { return id === 'schedule' ? schedule : null; },
    querySelector(selector) {
      return selector === 'meta[name="csrf-token"]'
        ? { getAttribute() { return 'not-a-real-token'; } } : null;
    },
    createElement(tag) {
      if (tag === 'section') return card;
      return {
        tag, attributes: {},
        setAttribute(key, value) { this.attributes[key] = value; },
        removeAttribute(key) { delete this.attributes[key]; },
        textContent: '', value: ''
      };
    }
  };
  const navigatorObject = {
    userAgent,
    geolocation: {
      getCurrentPosition(_success, onError) {
        webGpsCalls++;
        browserError = onError;
      }
    }
  };
  const HTMLFormElement = function HTMLFormElement() {};
  HTMLFormElement.prototype.submit = function submit() {
    assert.equal(this, form);
    submitted.count++;
  };
  vm.runInNewContext(source, {
    window: windowObject,
    document: documentObject,
    navigator: navigatorObject,
    HTMLFormElement,
    URL,
    console,
    Date,
    Math
  }, { filename: 'pmd-staff-time-clock-v1.js' });
  return {
    button, form, card, windowObject, submitted,
    submit() {
      const listener = form.listeners.submit;
      assert.equal(typeof listener, 'function');
      listener({ preventDefault() {} });
    },
    get assigned() { return assigned; },
    get webGpsCalls() { return webGpsCalls; },
    browserError() { return browserError; }
  };
}

const native = setup('Mozilla/5.0 (Linux; Android 15) AppleWebKit PMDStaffNativeGPS/1');
native.submit();
assert.match(native.assigned, /^pmdstaffgeo:\/\/clock\?request=/);
assert.equal(native.webGpsCalls, 0, 'native APK must not invoke WebView geolocation');
assert.equal(native.button.disabled, true);
const request = new URL(native.assigned).searchParams.get('request');
assert.match(request, /^[A-Za-z0-9_-]{12,80}$/);
native.windowObject.PMD_STAFF_NATIVE_GPS_RESULT({
  request: 'wrong-request-id', ok: true,
  latitude: 50.1, longitude: 8.6, accuracy_m: 12,
  captured_at_ms: Date.now()
});
assert.equal(native.submitted.count, 0, 'ignore unrelated callbacks');
native.windowObject.PMD_STAFF_NATIVE_GPS_RESULT({
  request, ok: true,
  latitude: 50.1, longitude: 8.6, accuracy_m: 12,
  captured_at_ms: Date.now()
});
assert.equal(native.submitted.count, 1);
assert.deepEqual(native.form.children.slice(1).map(n => n.name), [
  'geo_lat', 'geo_lng', 'geo_accuracy_m', 'geo_captured_at_ms'
]);

const deniedNative = setup('Mozilla/5.0 Android PMDStaffNativeGPS/1');
deniedNative.submit();
deniedNative.windowObject.PMD_STAFF_NATIVE_GPS_RESULT({
  request: new URL(deniedNative.assigned).searchParams.get('request'),
  ok: false, error: 'precise_denied'
});
assert.equal(deniedNative.button.disabled, false, 'allow retries after denial');
assert.equal(deniedNative.submitted.count, 0);
assert.match(deniedNative.form.children[0].textContent, /Android did not grant precise GPS/);

const oldApp = setup('Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UPB; wv)');
oldApp.submit();
assert.equal(oldApp.assigned, '', 'old APK must not use native custom scheme');
assert.equal(oldApp.webGpsCalls, 1);
oldApp.browserError()({code:1});
assert.equal(oldApp.button.disabled, false);
assert.match(oldApp.form.children[0].textContent, /PayMyDine Staff > Permissions/,
  'WebView UA diagnostic must match a real ; wv user agent');
assert.equal(oldApp.submitted.count, 0);
const unplanned = setup('Mozilla/5.0 Android PMDStaffNativeGPS/1', {
  active: true, unscheduled: true
});
assert.match(unplanned.card.innerHTML, /Unscheduled work recorded/,
  'active unscheduled employee must see actual work status');
unplanned.submit();
assert.match(unplanned.assigned, /^pmdstaffgeo:\/\/clock\?request=/,
  'Finish Shift must use native GPS even without any planned rota assignment');

console.log('Staff GPS contract: native success, stale callback rejection, precise denial, WebView fallback, unscheduled punch PASSED');
