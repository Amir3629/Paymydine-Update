(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(function () {
    if (!document.body || !document.body.classList.contains('pmd-admin-theme-v1')) return;

    var mainMenu = document.querySelector('#menu-mainmenu');
    if (!mainMenu) return;

    var item = document.querySelector('#pmd-header-toolbar-actions-item');
    if (!item) {
      item = document.createElement('li');
      item.id = 'pmd-header-toolbar-actions-item';
      item.className = 'nav-item pmd-header-toolbar-actions-item';
      item.innerHTML = '<div class="pmd-header-toolbar-actions" aria-label="Page actions"></div>';
      mainMenu.insertBefore(item, mainMenu.firstChild);
    }

    var bar = item.querySelector('.pmd-header-toolbar-actions');
    if (!bar) return;

    var counter = 0;
    function uid(el) {
      if (!el.dataset.pmdHeaderActionId) {
        counter += 1;
        el.dataset.pmdHeaderActionId = 'pmd-action-' + Date.now() + '-' + counter;
      }
      return el.dataset.pmdHeaderActionId;
    }

    function textOf(el) {
      return (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function iconFor(el, label) {
      var i = el.querySelector('i.fa, i.fas, i.far, i.fab');
      if (i) return i.className;

      var t = (label || '').toLowerCase();

      if (t.includes('back') || t.includes('return')) return 'fa fa-arrow-left';
      if (t.includes('new') || t.includes('add') || t.includes('create')) return 'fa fa-plus';
      if (t.includes('save')) return 'fa fa-check';
      if (t.includes('edit')) return 'fa fa-edit';
      if (t.includes('delete') || t.includes('remove')) return 'fa fa-trash';
      if (t.includes('filter')) return 'fa fa-filter';
      if (t.includes('search')) return 'fa fa-search';
      if (t.includes('export') || t.includes('download')) return 'fa fa-download';
      if (t.includes('import') || t.includes('upload')) return 'fa fa-upload';
      if (t.includes('print')) return 'fa fa-print';
      if (t.includes('refresh') || t.includes('reload')) return 'fa fa-rotate-right';
      if (t.includes('calendar') || t.includes('date')) return 'fa fa-calendar';

      return 'fa fa-circle';
    }

    function isRealAction(el) {
      if (!el || el.closest('.navbar-top, .modal, .dropdown-menu, .pmd-header-toolbar-actions')) return false;
      if (el.disabled || el.classList.contains('disabled')) return false;

      var label = textOf(el);
      var icon = el.querySelector('i.fa, i.fas, i.far, i.fab');

      if (!label && !icon) return false;
      if (label.length > 80) return false;

      return true;
    }

    function findActions() {
      var roots = document.querySelectorAll(
        '.toolbar-action, .progress-indicator-container, .pmd-admin-top-actions, .form-buttons, .control-toolbar, .page-actions'
      );

      var found = [];

      roots.forEach(function (root) {
        if (root.closest('.navbar-top, .modal, .dropdown-menu')) return;

        root.querySelectorAll('a.btn, button.btn, input[type="submit"].btn, input[type="button"].btn').forEach(function (el) {
          if (isRealAction(el)) found.push(el);
        });
      });

      return found.slice(0, 8);
    }

    function clickOriginal(original) {
      if (!original) return;

      if (typeof original.click === 'function') {
        original.click();
        return;
      }

      var ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      original.dispatchEvent(ev);
    }

    function addBackButton() {
      var old = bar.querySelector('[data-pmd-header-back]');
      if (old) old.remove();

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pmd-header-action-btn pmd-header-back-btn';
      btn.setAttribute('aria-label', 'Back');
      btn.setAttribute('title', 'Back');
      btn.setAttribute('data-pmd-header-back', '1');
      btn.innerHTML = '<i class="fa fa-arrow-left" aria-hidden="true"></i>';

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.history.length > 1) window.history.back();
        else window.location.href = '/admin';
      });

      bar.appendChild(btn);
    }

    function render() {
      bar.innerHTML = '';
      addBackButton();

      var actions = findActions();

      actions.forEach(function (original) {
        var id = uid(original);
        var label = textOf(original) || 'Action';

        var proxy = document.createElement('button');
        proxy.type = 'button';
        proxy.className = 'pmd-header-action-btn';
        proxy.setAttribute('aria-label', label);
        proxy.setAttribute('title', label);
        proxy.setAttribute('data-pmd-proxy-for', id);

        if (original.classList.contains('btn-danger') || original.classList.contains('text-danger')) {
          proxy.classList.add('is-danger');
        }

        if (
          original.classList.contains('btn-primary') ||
          original.classList.contains('btn-success') ||
          original.classList.contains('pmd-toolbar-primary-action')
        ) {
          proxy.classList.add('is-primary');
        }

        proxy.innerHTML = '<i class="' + iconFor(original, label) + '" aria-hidden="true"></i>';

        proxy.addEventListener('click', function (e) {
          e.preventDefault();
          clickOriginal(original);
        });

        bar.appendChild(proxy);
      });

      document.body.classList.toggle('pmd-has-header-actions', actions.length > 0);
    }

    var scheduled = false;
    function scheduleRender() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        render();
      });
    }

    render();

    var obs = new MutationObserver(scheduleRender);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'disabled'] });

    window.PMDHeaderActions = {
      refresh: render,
      actions: findActions
    };
  });
})();
