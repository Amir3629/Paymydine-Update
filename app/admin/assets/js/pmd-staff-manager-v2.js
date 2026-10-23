/* PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023
   Staff portal already owns navigation when a manager has a Team profile.
   For a manager without a personal Team link, this runs the identical
   bottom tab system; all management writes use existing server role checks.
*/
(function () {
  'use strict';

  var fallback = document.querySelector('[data-pmd-owner-app]');
  var modes = ['team', 'schedule', 'chat', 'requests', 'activity'];

  if (fallback) {
    function screenFromHash() {
      var candidate = window.location.hash.replace(/^#/, '');
      return modes.indexOf(candidate) >= 0 ? candidate : 'team';
    }
    function setScreen(screen, updateUrl) {
      if (modes.indexOf(screen) < 0) screen = 'team';
      fallback.setAttribute('data-pmd-mobile-active', screen);
      fallback.querySelectorAll('[data-pmd-mobile-target]').forEach(function (button) {
        var selected = button.getAttribute('data-pmd-mobile-target') === screen;
        button.classList.toggle('is-active', selected);
        if (selected) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      if (updateUrl && window.location.hash !== '#' + screen && history.replaceState) {
        history.replaceState(null, '', '#' + screen);
      }
    }
    fallback.querySelectorAll('[data-pmd-mobile-target]').forEach(function (button) {
      button.addEventListener('click', function () {
        setScreen(button.getAttribute('data-pmd-mobile-target'), true);
      });
    });
    setScreen(screenFromHash(), false);
    window.addEventListener('hashchange', function () { setScreen(screenFromHash(), false); });

    var picker = fallback.querySelector('[data-pmd-owner-language]');
    if (picker) {
      var toggle = picker.querySelector('[data-pmd-owner-language-toggle]');
      var list = picker.querySelector('[data-pmd-owner-language-menu]');
      function showLanguages(open) {
        if (!toggle || !list) return;
        list.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
      }
      if (toggle) toggle.addEventListener('click', function () { showLanguages(list.hidden); });
      picker.querySelectorAll('[data-pmd-owner-return-screen]').forEach(function (input) {
        var form = input.closest('form');
        if (form) form.addEventListener('submit', function () {
          input.value = fallback.getAttribute('data-pmd-mobile-active') || 'team';
        });
      });
      document.addEventListener('click', function (event) {
        if (!picker.contains(event.target)) showLanguages(false);
      });
    }

    var profile = fallback.querySelector('[data-pmd-owner-profile-dialog]');
    var profileOpen = fallback.querySelector('[data-pmd-owner-profile-open]');
    var profileClose = fallback.querySelector('[data-pmd-owner-profile-close]');
    var oldFocus = null;
    function setProfile(open) {
      if (!profile) return;
      if (open && profile.hidden) oldFocus = document.activeElement;
      profile.hidden = !open;
      document.body.classList.toggle('pmd-staff-modal-open', open);
      if (open && profileClose) profileClose.focus({preventScroll:true});
      else if (!open && oldFocus && oldFocus.focus) {
        oldFocus.focus({preventScroll:true});
        oldFocus = null;
      }
    }
    if (profileOpen) profileOpen.addEventListener('click', function () { setProfile(true); });
    if (profileClose) profileClose.addEventListener('click', function () { setProfile(false); });
    if (profile) profile.addEventListener('click', function (event) {
      if (event.target === profile) setProfile(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (profile && !profile.hidden) { event.preventDefault();setProfile(false); }
        else if (picker) {
          var menu = picker.querySelector('[data-pmd-owner-language-menu]');
          if (menu && !menu.hidden) { menu.hidden=true; picker.querySelector('[data-pmd-owner-language-toggle]').setAttribute('aria-expanded','false'); }
        }
      }
      if (event.key === 'Tab' && profile && !profile.hidden) {
        var links = Array.prototype.slice.call(profile.querySelectorAll('a[href],button:not([disabled])'));
        if (links.length === 0) return;
        if (event.shiftKey && document.activeElement === links[0]) {
          event.preventDefault();links[links.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === links[links.length - 1]) {
          event.preventDefault();links[0].focus();
        }
      }
    });

    var refresh = fallback.querySelector('[data-pmd-owner-refresh]');
    if (refresh) refresh.addEventListener('click', function () { window.location.reload(); });
  }

  // Shared Owner Team forms for linked and unlinked owners. No request
  // reaches another tenant or overrides CSRF/role authorization.
  var busy = false;
  document.addEventListener('submit', async function (event) {
    var form = event.target;
    if (!form || !form.matches || !form.matches('form[data-pmd-owner-async]')) return;
    var action;
    try { action = new URL(form.action, window.location.href); }
    catch (error) { return; }
    if (action.origin !== window.location.origin ||
      !/\/shifts\/(?:reviewactual|handlerequest|sendteammessage)\/?$/.test(action.pathname)) return;
    event.preventDefault();
    if (busy) return;
    busy = true;
    var buttons = Array.prototype.slice.call(form.querySelectorAll('button[type="submit"]'));
    buttons.forEach(function (button) { button.disabled = true; });
    var feedback = document.createElement('p');
    feedback.className = 'pmd-owner-team__feedback';
    feedback.setAttribute('role', 'status');
    feedback.textContent = 'Saving…';
    form.appendChild(feedback);
    try {
      var response = await fetch(action.href, {
        method:'POST',credentials:'same-origin',
        body:new FormData(form),
        headers:{'X-Requested-With':'XMLHttpRequest','Accept':'text/html'},
        redirect:'follow',cache:'no-store'
      });
      var end = new URL(response.url);
      if (!response.ok || !response.redirected ||
          end.origin !== location.origin || !/\/shifts\/?$/.test(end.pathname)) {
        throw new Error('Server did not confirm the action');
      }
      // Refresh the SAME Staff shell rather than dumping Owner into Admin.
      window.location.reload();
    } catch (error) {
      feedback.setAttribute('role','alert');
      feedback.textContent = 'Could not save. Check your session and try again.';
      buttons.forEach(function (button) { button.disabled = false; });
    } finally {
      busy = false;
    }
  });
})();
