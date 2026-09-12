(function () {
  'use strict';

  // PMD_MENU_AI_IMPORT_HEADER_V2
  // Dedicated cache-busted header entry point. This file owns navigation only;
  // Pmdmenuaiimport remains the authenticated upload/analyse/review authority.
  function mount() {
    var actions = document.querySelector('[data-pmd-menu-header-actions]');
    if (!actions) return false;

    if (document.querySelector('[data-pmd-menu-ai-import-trigger]')) {
      return true;
    }

    var pathParts = window.location.pathname.split('/').filter(Boolean);
    var adminBase = '/' + (pathParts[0] || 'admin');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-dashboard-lab__header-action pmd-menu-header-action pmd-menu-ai-import-trigger';
    button.setAttribute('data-pmd-menu-ai-import-trigger', '');
    button.setAttribute('aria-label', 'Import menu with AI');
    button.setAttribute('title', 'Import menu with AI');

    // Make the migration action visually distinct from Kitchen/Notifications.
    button.style.setProperty('background', '#075f4f', 'important');
    button.style.setProperty('border-color', '#075f4f', 'important');
    button.style.setProperty('color', '#ffffff', 'important');

    button.innerHTML = ''
      + '<svg viewBox="0 0 24 24" aria-hidden="true">'
      + '<path d="M12 15V5"></path>'
      + '<path d="m8 9 4-4 4 4"></path>'
      + '<path d="M5 19h14"></path>'
      + '<path d="M18.5 3.5v5"></path>'
      + '<path d="M16 6h5"></path>'
      + '</svg>';

    button.addEventListener('click', function () {
      window.location.assign(adminBase + '/pmdmenuaiimport');
    });

    var notificationGap = actions.querySelector('[data-pmd-main-header-notification-gap-r67]');
    var notificationSlot = actions.querySelector('[data-pmd-menu-notif-slot]');
    var notificationRoot = actions.querySelector('#notif-root');
    var anchor = notificationGap || notificationSlot || notificationRoot;

    if (anchor) actions.insertBefore(button, anchor);
    else actions.appendChild(button);

    return true;
  }

  if (!mount() && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once: true});
  }
})();
