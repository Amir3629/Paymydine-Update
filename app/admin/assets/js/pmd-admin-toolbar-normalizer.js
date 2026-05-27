(function () {
  'use strict';

  var CONTAINER_SELECTORS = [
    '#toolbar.toolbar.btn-toolbar > .toolbar-action > .progress-indicator-container',
    '.toolbar.btn-toolbar > .toolbar-action > .progress-indicator-container',
    '.toolbar-action > .progress-indicator-container',
    '.form-toolbar .progress-indicator-container',
    '.page-title-section > .pull-right',
    '.page-actions',
    '.control-toolbar',
    '.pmd-toolbar-main'
  ].join(',');

  var EXCLUDED_ANCESTORS = [
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    '.fixed-table-container', '.list-container', '.list-setup', '.bulk-actions',
    '.dropdown-menu', '.modal', '.modal-content', '.media-manager', '.media-toolbar',
    '.select2-container', '#notification-panel'
  ].join(',');

  function isExcludedNode(node) {
    return !!(node && (node.matches(EXCLUDED_ANCESTORS) || node.closest(EXCLUDED_ANCESTORS)));
  }

  function isToolbarButton(btn) {
    if (!btn || !btn.classList.contains('btn')) return false;
    if (isExcludedNode(btn)) return false;
    if (btn.classList.contains('btn-edit') || btn.classList.contains('sort-col')) return false;
    return true;
  }

  function buttonText(btn) {
    return (btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function isDanger(btn) {
    var txt = buttonText(btn);
    return btn.classList.contains('btn-danger') || btn.classList.contains('btn-outline-danger') ||
      /\b(delete|remove|trash|destroy)\b/.test(txt);
  }

  function isPrimary(btn) {
    var txt = buttonText(btn);
    var request = (btn.getAttribute('data-request') || '').toLowerCase();
    var hasPlus = !!btn.querySelector('.fa-plus');

    return btn.classList.contains('btn-primary') ||
      btn.classList.contains('btn-success') ||
      request === 'onsave' ||
      (hasPlus && /\b(new|create|add|add item)\b/.test(txt)) ||
      /\b(save|create|add|new|enable|stock in)\b/.test(txt);
  }

  function ensureRightGroup(container) {
    var group = container.querySelector(':scope > .pmd-toolbar-right-buttons');
    if (!group) {
      group = document.createElement('div');
      group.className = 'right-buttons pmd-toolbar-right-buttons';
      group.setAttribute('aria-label', 'Secondary toolbar actions');
      container.appendChild(group);
    }
    return group;
  }


  function getToolbarButtons(container) {
    var selectors = [
      ':scope > .btn',
      ':scope > .btn-group > .btn',
      ':scope > .pmd-toolbar-right-buttons > .btn',
      ':scope > .pmd-toolbar-right-buttons > .btn-group > .btn'
    ];

    var seen = new Set();
    var buttons = [];

    selectors.forEach(function (sel) {
      Array.prototype.forEach.call(container.querySelectorAll(sel), function (btn) {
        if (!isToolbarButton(btn)) return;
        if (seen.has(btn)) return;
        seen.add(btn);
        buttons.push(btn);
      });
    });

    return buttons;
  }

  function classifyAndGroup(container) {
    var buttons = getToolbarButtons(container);
    if (!buttons.length) return;

    var primary = null;
    var secondary = [];

    buttons.forEach(function (btn) {
      btn.classList.remove('pmd-toolbar-primary-action', 'pmd-toolbar-secondary-action', 'pmd-toolbar-danger-action');

      if (isDanger(btn)) {
        btn.classList.add('pmd-toolbar-danger-action');
        secondary.push(btn);
        return;
      }

      if (!primary && isPrimary(btn)) {
        primary = btn;
        btn.classList.add('pmd-toolbar-primary-action');
      } else {
        secondary.push(btn);
        btn.classList.add('pmd-toolbar-secondary-action');
      }
    });

    var existingRight = container.querySelector(':scope > .pmd-toolbar-right-buttons');
    var rightHasButtons = !!(existingRight && existingRight.querySelector('.btn'));

    if (primary && (secondary.length > 0 || rightHasButtons)) {
      container.classList.add('pmd-toolbar-split');
      var right = ensureRightGroup(container);
      secondary.forEach(function (btn) {
        if (btn.parentElement !== right) right.appendChild(btn);
      });
      if (primary.parentElement !== container) {
        container.insertBefore(primary, container.firstChild);
      }
    } else if (!rightHasButtons) {
      container.classList.remove('pmd-toolbar-split');
    }
  }

  function normalizeContainer(container) {
    if (!container || isExcludedNode(container)) return;
    container.classList.add('pmd-toolbar-normalized');
    classifyAndGroup(container);
  }

  function normalizeAll() {
    var roots = document.querySelectorAll(CONTAINER_SELECTORS);
    roots.forEach(normalizeContainer);
  }

  var timer = null;
  function scheduleNormalize() {
    clearTimeout(timer);
    timer = setTimeout(normalizeAll, 60);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', normalizeAll, { once: true });
  } else {
    normalizeAll();
  }

  window.addEventListener('load', normalizeAll, { once: true });
  setTimeout(normalizeAll, 300);

  var pageContent = document.querySelector('.page-content') || document.body;
  var observer = new MutationObserver(scheduleNormalize);
  observer.observe(pageContent, { childList: true, subtree: true });
})();
