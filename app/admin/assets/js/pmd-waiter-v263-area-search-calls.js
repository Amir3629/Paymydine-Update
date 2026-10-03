(function () {
  'use strict';

  if (window.PMDWaiterV263) return;
  window.PMDWaiterV263 = true;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var aliases = {
    'bar': 'INSIDE',
    'center': 'FLOOR 1',
    'family': 'FLOOR 2',
    'group': 'GARDEN',
    'high': 'ROOF',
    'outdoor': 'OUTDOOR',
    'vip': 'PRIVATE',
    'window': 'BALCONY',
    'main': 'INSIDE'
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function relabelAreas() {
    document.querySelectorAll('[data-v2-area]').forEach(function (button) {
      var value = clean(button.getAttribute('data-v2-area')).toLowerCase();
      if (!value || value === 'all') {
        button.textContent = 'ALL AREAS';
        return;
      }
      button.textContent = aliases[value] || clean(button.textContent).toUpperCase();
    });
  }

  function moveSearch() {
    var areas = root.querySelector('[data-v2-areas]');
    var search = root.querySelector('.pmd-v233-header-search');
    if (!areas || !search || areas.querySelector('.pmd-v263-area-search')) return;

    var clone = search.cloneNode(true);
    clone.classList.remove('pmd-v233-header-search');
    clone.classList.add('pmd-v263-area-search');

    var input = clone.querySelector('[data-v2-search]');
    var clear = clone.querySelector('[data-v2-clear-search]');
    var trigger = clone.querySelector('span');

    if (input) {
      input.placeholder = 'SEARCH TABLE OR AREA';
      input.addEventListener('focus', function () {
        clone.classList.add('is-open');
      });
      input.addEventListener('input', function () {
        var original = search.querySelector('[data-v2-search]');
        if (!original) return;
        original.value = input.value;
        original.dispatchEvent(new Event('input', {bubbles:true}));
        if (clear) clear.hidden = !input.value;
      });
    }

    if (trigger) {
      trigger.addEventListener('click', function () {
        clone.classList.add('is-open');
        if (input) input.focus();
      });
      trigger.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          clone.classList.add('is-open');
          if (input) input.focus();
        }
      });
    }

    if (clear) {
      clear.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (input) {
          input.value = '';
          input.dispatchEvent(new Event('input', {bubbles:true}));
          input.focus();
        }
        clear.hidden = true;
      });
    }

    areas.insertBefore(clone, areas.firstChild);
  }

  function normalizeNotificationCount() {
    var badge = document.querySelector('.v257-alert-count');
    if (!badge) return;
    badge.removeAttribute('style');
    badge.setAttribute('aria-label', clean(badge.textContent) + ' notifications');
  }

  function mount() {
    moveSearch();
    relabelAreas();
    normalizeNotificationCount();
  }

  mount();

  var areas = root.querySelector('[data-v2-areas]');
  if (areas && typeof MutationObserver === 'function') {
    new MutationObserver(function () {
      relabelAreas();
      moveSearch();
    }).observe(areas, {childList:true});
  }

  setInterval(function () {
    relabelAreas();
    normalizeNotificationCount();
  }, 2500);

  console.info('[PMD] Waiter V2.6.3 area search + waiter-call bridge active');
})();
