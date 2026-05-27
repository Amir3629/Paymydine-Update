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

  function classifyAndGroup(container) {
    var directButtons = Array.prototype.filter.call(container.children, function (el) {
      return isToolbarButton(el) && el.matches('.btn');
    });

    var directButtonGroupButtons = [];
    Array.prototype.forEach.call(container.querySelectorAll(':scope > .btn-group > .btn'), function (btn) {
      if (isToolbarButton(btn)) directButtonGroupButtons.push(btn);
    });

    var buttons = directButtons.concat(directButtonGroupButtons);
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

    if (primary && secondary.length > 0) {
      container.classList.add('pmd-toolbar-split');
      var right = ensureRightGroup(container);
      secondary.forEach(function (btn) {
        if (btn.parentElement !== right) right.appendChild(btn);
      });
      if (primary.parentElement !== container) {
        container.insertBefore(primary, container.firstChild);
      }
    } else {
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
