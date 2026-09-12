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
    button.style.setProperty('font-size', '12px', 'important');
    button.style.setProperty('font-weight', '900', 'important');
    button.style.setProperty('letter-spacing', '-0.02em', 'important');
    button.style.setProperty('text-decoration', 'none', 'important');

    button.innerHTML = '<span aria-hidden="true">AI</span>';

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
