'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = path => fs.readFileSync(path, 'utf8');
const script = read('app/admin/assets/js/pmd-device-platform-v1.js');
const view = read('app/admin/views/pmddevices/index.blade.php');
const controller = read('app/admin/controllers/Pmddevices.php');
const diagnostic = read('app/admin/assets/js/debug-redirects.js');
const ajax = read('app/admin/assets/src/js/request.js');

function makeHarness(confirmValue = true) {
  const listeners = new Map();
  const form = {
    matches(selector) {
      return selector === 'form[data-pmd-device-command-form-v144]';
    },
    querySelector(selector) {
      if (selector === 'input[name="pmd_device_command"]') return field;
      if (selector === 'button[name="action"][value="SET_BRIGHTNESS"]') {
        return buttons.SET_BRIGHTNESS;
      }
      return null;
    }
  };
  const field = {name: 'pmd_device_command', value: ''};
  const buttons = {};
  const ctx = {
    window: {
      __PMD_DEVICE_PLATFORM_V1__: false,
      confirm() { return confirmValue; }
    },
    document: {
      addEventListener(name, fn, capture) {
        assert.equal(capture, true);
        listeners.set(name, fn);
      }
    },
    console: {warn() {}}
  };

  for (const cmd of [
    'WAKE', 'SLEEP', 'SET_BRIGHTNESS', 'IDENTIFY', 'REBOOT',
    'OPEN_RESTAURANT', 'CLOSE_RESTAURANT', 'USE_SCHEDULE', 'RELOAD_APP'
  ]) {
    const button = {
      name: 'action', value: cmd, disabled: false,
      getAttribute(key) {
        return key === 'data-pmd-device-confirm' && cmd === 'REBOOT'
          ? 'reboot' : null;
      },
      closest(selector) {
        if (selector === 'button[name="action"]') return this;
        if (selector === 'form[data-pmd-device-command-form-v144]') return form;
        return null;
      },
      click() { emitClick(this); }
    };
    buttons[cmd] = button;
  }

  function nativeEvent(target, extras = {}) {
    return Object.assign({
      target,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; }
    }, extras);
  }
  function emitClick(button) {
    const evt = nativeEvent(button);
    listeners.get('click')(evt);
    return evt;
  }
  function emitSubmit(submitter) {
    const evt = nativeEvent(form, {submitter});
    listeners.get('submit')(evt);
    return evt;
  }

  vm.runInNewContext(script, ctx);
  return {listeners, form, buttons, field, emitClick, emitSubmit, nativeEvent};
}

test('root cause: current AJAX serializer excludes submit buttons', () => {
  assert.match(ajax, /requestData = \[\$form\.serialize\(\), \$\.param\(data\)\]/);
  assert.equal((view.match(/data-pmd-device-command-form-v144/g) || []).length, 2);
  assert.equal((view.match(/name="pmd_device_command"/g) || []).length, 2);
});

test('one owner form and every device row have an explicit serialized action', () => {
  assert.match(view, /value="OPEN_RESTAURANT"/);
  assert.match(view, /value="WAKE"/);
  for (const cmd of [
    'WAKE', 'SLEEP', 'SET_BRIGHTNESS', 'RELOAD_APP',
    'IDENTIFY', 'OPEN_RESTAURANT', 'CLOSE_RESTAURANT', 'USE_SCHEDULE'
  ]) {
    const h = makeHarness();
    h.emitClick(h.buttons[cmd]);
    assert.equal(h.field.value, cmd);
    assert.equal(h.emitSubmit(h.buttons[cmd]).defaultPrevented, false);
  }
});

test('no command selected is blocked; keyboard Enter Brightness picks SET_BRIGHTNESS', () => {
  const h = makeHarness();
  assert.equal(h.emitSubmit().defaultPrevented, true);
  const brightness = {
    name: 'brightness',
    closest(selector) {
      return selector === 'form[data-pmd-device-command-form-v144]'
        ? h.form : null;
    }
  };
  const event = h.nativeEvent(brightness, {key: 'Enter'});
  h.listeners.get('keydown')(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.field.value, 'SET_BRIGHTNESS');
});

test('cancelled Reboot never queues the command', () => {
  const h = makeHarness(false);
  const event = h.emitClick(h.buttons.REBOOT);
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.field.value, '');
});

test('server validates the command and retains existing owner/manager guard', () => {
  assert.match(controller, /PMD_DEVICE_COMMAND_SERIALIZED_SUBMITTER_V144/);
  assert.match(controller, /post\('pmd_device_command', ''\)/);
  assert.match(controller, /\$fieldAction !== \$buttonAction/);
  assert.match(controller, /PmdDevicePlatformService::COMMANDS/);
  assert.match(controller, /\$this->assertDevicePlatformManager\(\);/);
  assert.match(controller, /PMD_DEVICE_COMMAND_QUEUED_NOT_EXECUTED_V144/);
});

test('debug script no longer calls dashboard HEAD every 30 seconds by default', () => {
  assert.match(diagnostic, /PMD_ADMIN_DEBUG_NO_BACKGROUND_AUTH_PROBE_V144/);
  assert.match(diagnostic, /window\.PMD_ENABLE_ADMIN_SESSION_POLL === true/);
  assert.match(diagnostic, /Admin request forbidden/);
  assert.doesNotMatch(diagnostic, /CAUSE: CSRF token expired \(403 Forbidden\)/);
  assert.match(controller, /PMD_DEVICE_COMMAND_SCRIPT_FRESHNESS_V144/);
});
