(function () {
  'use strict';

  var input = document.querySelector('[data-pmd-menu-prep-time]');
  var field = document.querySelector('[data-pmd-prep-field]');

  if (input && field) {
    var presets = Array.prototype.slice.call(field.querySelectorAll('[data-pmd-prep-preset]'));
    var custom = field.querySelector('[data-pmd-prep-custom]');
    var customWrap = field.querySelector('[data-pmd-prep-custom-wrap]');

    function active(button) {
      presets.forEach(function (item) {
        item.classList.toggle('is-active', item === button);
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      if (custom) {
        custom.classList.toggle('is-active', button === null);
        custom.setAttribute('aria-pressed', button === null ? 'true' : 'false');
      }
      if (customWrap) customWrap.hidden = button !== null;
    }

    function sync() {
      var value = Number(input.value || 0);
      var match = null;
      presets.some(function (button) {
        var stored = Number(button.getAttribute('data-store') || 0);
        if (value === stored) {
          match = button;
          return true;
        }
        return false;
      });
      active(match);
    }

    presets.forEach(function (button) {
      button.addEventListener('click', function () {
        input.value = String(Math.max(1, Number(button.getAttribute('data-store') || 15)));
        active(button);
        input.dispatchEvent(new Event('change', {bubbles: true}));
      });
    });

    if (custom) {
      custom.addEventListener('click', function () {
        active(null);
        input.focus();
      });
    }

    input.addEventListener('input', function () {
      if (!customWrap || !customWrap.hidden) active(null);
    });

    // The canonical Menu Manager fills/resets the number input before opening
    // the modal. Sync after those handlers without owning any food save logic.
    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-pmd-menu-edit], [data-pmd-menu-create], [data-pmd-menu-primary-create]')) {
        window.setTimeout(sync, 0);
      }
    });

    sync();
  }

  window.PMDPrepTimeLabel = function (minutes) {
    var value = Number(minutes || 0);
    if (value === 10) return '5–10 min';
    if (value === 20) return '10–20 min';
    if (value === 30) return '20–30 min';
    if (value === 45) return '30–45 min';
    return value > 0 ? ('~' + Math.round(value) + ' min') : '';
  };

  // PMD_MENU_KITCHEN_TIMING_MODAL_V1
  // Keep this tiny settings surface in Menu, beside Notifications. Authorization
  // remains server-side: the trigger is mounted only when the Owner/Manager
  // settings endpoint answers successfully.
  var headerActions = document.querySelector('[data-pmd-menu-header-actions]');
  if (!headerActions || document.querySelector('[data-pmd-kitchen-settings-trigger]')) return;

  var pathParts = window.location.pathname.split('/').filter(Boolean);
  var adminBase = '/' + (pathParts[0] || 'admin');
  var settingsUrl = adminBase + '/kitchensettings/settingsjson';
  var saveUrl = adminBase + '/kitchensettings/save';
  var modal = null;
  var trigger = null;
  var lastSettings = null;

  function csrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    var hidden = document.querySelector('input[name="_token"]');
    return hidden ? hidden.value : '';
  }

  function loadSettings() {
    return fetch(settingsUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }).then(function (response) {
      if (!response.ok) throw new Error('Kitchen timing settings unavailable');
      return response.json();
    }).then(function (data) {
      if (!data || data.ok !== true) throw new Error('Kitchen timing settings unavailable');
      lastSettings = data;
      return data;
    });
  }

  function buildTrigger() {
    if (trigger) return trigger;
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'pmd-dashboard-lab__header-action pmd-menu-header-action pmd-menu-kitchen-settings-trigger';
    trigger.setAttribute('data-pmd-kitchen-settings-trigger', '');
    trigger.setAttribute('aria-label', 'Kitchen timing');
    trigger.setAttribute('title', 'Kitchen timing');
    trigger.innerHTML = ''
      + '<svg viewBox="0 0 24 24" aria-hidden="true">'
      + '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6"></path>'
      + '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-3v-.08a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 7.2 15a1.65 1.65 0 0 0-1.51-1H5.6v-3h.09A1.65 1.65 0 0 0 7.2 10a1.65 1.65 0 0 0-.33-1.82l-.06-.06L8.93 6l.06.06A1.65 1.65 0 0 0 10.8 6.4a1.65 1.65 0 0 0 1-1.51V4.8h3v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.12 2.12-.06.06A1.65 1.65 0 0 0 19.4 10a1.65 1.65 0 0 0 1.51 1H21v3h-.09A1.65 1.65 0 0 0 19.4 15z"></path>'
      + '</svg>';

    var notificationGap = headerActions.querySelector('[data-pmd-main-header-notification-gap-r67]');
    if (notificationGap) headerActions.insertBefore(trigger, notificationGap);
    else headerActions.appendChild(trigger);

    trigger.addEventListener('click', function () {
      openSettings();
    });
    return trigger;
  }

  function buildModal() {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'pmd-menu-modal pmd-menu-kitchen-settings-modal';
    modal.setAttribute('data-pmd-kitchen-settings-modal', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'pmd-kitchen-settings-title');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;

    var token = csrfToken();
    modal.innerHTML = ''
      + '<div class="pmd-menu-modal__backdrop" data-pmd-kitchen-settings-close></div>'
      + '<section class="pmd-menu-modal__card pmd-menu-kitchen-settings-card" role="document">'
      + '  <header class="pmd-menu-modal__header">'
      + '    <div><span class="pmd-menu-modal__eyebrow">Kitchen</span><h2 id="pmd-kitchen-settings-title">Preparation & ETA</h2></div>'
      + '    <button type="button" class="pmd-menu-modal__close" data-pmd-kitchen-settings-close aria-label="Close">'
      + '      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>'
      + '    </button>'
      + '  </header>'
      + '  <form class="pmd-menu-kitchen-settings-form" method="post" action="' + saveUrl + '">'
      + '    <input type="hidden" name="_token" value="' + token.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">'
      + '    <div class="pmd-menu-modal__body">'
      + '      <section class="pmd-menu-form__section">'
      + '        <div class="pmd-menu-form__section-head"><h3>Guest preparation estimates</h3><p>Show food preparation ranges before ordering and the live ETA after the order reaches Kitchen.</p></div>'
      + '        <label class="pmd-menu-form__setting-row pmd-menu-kitchen-setting-row">'
      + '          <span><strong>Show preparation estimates</strong><small>Turn this off if the restaurant does not want to show timing to guests.</small></span>'
      + '          <span class="pmd-menu-switch"><input type="checkbox" name="show_customer_eta" value="1" data-pmd-kitchen-show-eta><span></span></span>'
      + '        </label>'
      + '      </section>'
      + '      <section class="pmd-menu-form__section">'
      + '        <div class="pmd-menu-form__section-head"><h3>If an order needs more time</h3><p>Near the promised time, if the Kitchen has not marked the order Ready, PMD can extend the guest ETA once more.</p></div>'
      + '        <div class="pmd-menu-kitchen-eta-presets" data-pmd-kitchen-eta-presets>'
      + '          <label><input type="radio" name="extension_minutes" value="5"><span>+5 min</span></label>'
      + '          <label><input type="radio" name="extension_minutes" value="10"><span>+10 min</span></label>'
      + '          <label><input type="radio" name="extension_minutes" value="15"><span>+15 min</span></label>'
      + '          <label><input type="radio" name="extension_minutes" value="20"><span>+20 min</span></label>'
      + '          <label><input type="radio" name="extension_minutes" value="0" data-pmd-kitchen-custom-radio><span>Custom</span></label>'
      + '        </div>'
      + '        <label class="pmd-menu-field pmd-menu-kitchen-custom-field"><span>Custom minutes</span><input type="number" name="custom_extension_minutes" min="1" max="120" step="1" inputmode="numeric" data-pmd-kitchen-custom-minutes></label>'
      + '        <p class="pmd-menu-kitchen-settings-hint">PMD checks close to the deadline. Repeated misses stop moving the promise and show “Taking longer than expected” instead.</p>'
      + '      </section>'
      + '    </div>'
      + '    <footer class="pmd-menu-modal__footer">'
      + '      <span class="pmd-menu-modal__status">Kitchen timing stays automatic behind the scenes.</span>'
      + '      <div class="pmd-menu-modal__buttons">'
      + '        <button type="button" class="pmd-menu-modal__cancel" data-pmd-kitchen-settings-close>Cancel</button>'
      + '        <button type="submit" class="pmd-menu-modal__save">Save settings</button>'
      + '      </div>'
      + '    </footer>'
      + '  </form>'
      + '</section>';

    document.body.appendChild(modal);

    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-pmd-kitchen-settings-close]')) closeSettings();
    });

    var customMinutes = modal.querySelector('[data-pmd-kitchen-custom-minutes]');
    var customRadio = modal.querySelector('[data-pmd-kitchen-custom-radio]');
    if (customMinutes && customRadio) {
      customMinutes.addEventListener('focus', function () {
        customRadio.checked = true;
        syncCustomState();
      });
    }

    modal.querySelectorAll('input[name="extension_minutes"]').forEach(function (radio) {
      radio.addEventListener('change', syncCustomState);
    });

    return modal;
  }

  function syncCustomState() {
    if (!modal) return;
    var customMinutes = modal.querySelector('[data-pmd-kitchen-custom-minutes]');
    var selected = modal.querySelector('input[name="extension_minutes"]:checked');
    if (customMinutes) customMinutes.disabled = !selected || selected.value !== '0';
  }

  function applySettings(data) {
    buildModal();
    var showEta = modal.querySelector('[data-pmd-kitchen-show-eta]');
    var customMinutes = modal.querySelector('[data-pmd-kitchen-custom-minutes]');
    var extension = Math.max(1, Number(data && data.extension_minutes || 10));
    var standard = [5, 10, 15, 20].indexOf(extension) !== -1;
    var radio = modal.querySelector('input[name="extension_minutes"][value="' + (standard ? extension : 0) + '"]');

    if (showEta) showEta.checked = Boolean(data && data.show_customer_eta);
    if (radio) radio.checked = true;
    if (customMinutes) customMinutes.value = String(Math.round(extension));
    syncCustomState();
  }

  function openSettings() {
    buildModal();
    if (lastSettings) applySettings(lastSettings);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('pmd-menu-kitchen-settings-open');

    loadSettings().then(function (data) {
      applySettings(data);
    }).catch(function () {
      // Authorization/runtime failures remain server authority. If access was
      // revoked after initial mount, simply close the interaction.
      closeSettings();
    });
  }

  function closeSettings() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('pmd-menu-kitchen-settings-open');
    if (trigger) trigger.focus();
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal && !modal.hidden) closeSettings();
  });

  loadSettings().then(function (data) {
    buildTrigger();
    buildModal();
    applySettings(data);
  }).catch(function () {
    // Do not expose the Owner/Manager-only control when the endpoint refuses.
  });
})();
