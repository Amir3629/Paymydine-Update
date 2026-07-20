/* PMD Reservation KDS Create UI v2
 * One-shot enhancer. No MutationObserver. No form value/name/action changes.
 */
(function () {
  'use strict';

  if (window.PMDReservationKDSCreateV2Started) return;
  window.PMDReservationKDSCreateV2Started = true;

  var path = location.pathname.replace(/\/+$/, '');
  if (!/^\/admin\/reservations\/(create|edit\/[^/]+)$/.test(path)) return;

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  var map = [
    [/table name|table/, 'table', '🪑'],
    [/guest number|guest/, 'guest', '👥'],
    [/duration|stay time/, 'duration', '⏱️'],
    [/reservation date|date/, 'date', '📅'],
    [/reservation time|time/, 'time', '🕒'],
    [/first name/, 'first', '👤'],
    [/last name/, 'last', '👤'],
    [/email/, 'email', '✉️'],
    [/telephone|phone/, 'phone', '☎️'],
    [/restaurant|location/, 'restaurant', '🏪'],
    [/send reservation confirmation|confirmation|notify/, 'notify', '✅'],
    [/comment|note/, 'comment', '📝']
  ];

  function labelText(field) {
    var label = field.querySelector(':scope > label, :scope > .control-label, label, .control-label');
    return clean(label && label.textContent).toLowerCase();
  }

  function iconFor(key) {
    for (var i = 0; i < map.length; i++) if (map[i][1] === key) return map[i][2];
    return '•';
  }

  function tagFields(form) {
    var fields = Array.from(form.querySelectorAll('.form-group, [class*="field-"], .pmd-form-field-v1'));
    var tagged = [];

    fields.forEach(function (field) {
      var txt = labelText(field);
      if (!txt) return;

      map.forEach(function (row) {
        if (row[0].test(txt)) {
          field.setAttribute('data-pmd-res-field', row[1]);
          field.classList.add('pmd-res-kds-field-v2');

          var label = field.querySelector(':scope > label, :scope > .control-label, label, .control-label');
          if (label && !label.querySelector('.pmd-res-kds-mini-icon-v2')) {
            var original = clean(label.textContent);
            label.textContent = '';
            var wrap = document.createElement('span');
            wrap.className = 'pmd-res-kds-label-line-v2';
            wrap.innerHTML = '<span class="pmd-res-kds-mini-icon-v2">' + row[2] + '</span><span>' + original + '</span>';
            label.appendChild(wrap);
          }

          tagged.push(row[1]);
        }
      });
    });

    return tagged;
  }

  function commonParent(nodes) {
    if (!nodes.length) return null;
    var parent = nodes[0].parentElement;
    while (parent) {
      if (nodes.every(function (n) { return parent.contains(n); })) return parent;
      parent = parent.parentElement;
    }
    return null;
  }

  function addHero(form) {
    document.querySelectorAll('.pmd-res-kds-hero-v2').forEach(function (x) { x.remove(); });
  }

  function addFlow(form) {
    document.querySelectorAll('.pmd-res-kds-flow-v2').forEach(function (x) { x.remove(); });
  }

  function addGuide(grid) {
    if (grid.querySelector('.pmd-res-kds-guide-v2')) return;

    var guide = document.createElement('div');
    guide.className = 'pmd-res-kds-guide-v2';
    guide.innerHTML =
      '<strong>Counter rule</strong>' +
      '<ul>' +
        '<li>For food pre-order by phone, write it in Comment for now.</li>' +
        '<li>For delay/cancellation/no-show, write a clear reason in Comment.</li>' +
        '<li>Later PMD should connect Reservation → Pre-order Draft → Real Order.</li>' +
      '</ul>';

    var comment = grid.querySelector('[data-pmd-res-field="comment"]');
    if (comment && comment.parentNode === grid) {
      grid.insertBefore(guide, comment);
    } else {
      grid.appendChild(guide);
    }
  }


  function findBestGridContainer(form) {
    var fields = Array.from(form.querySelectorAll('[data-pmd-res-field]'));
    if (!fields.length) return null;

    var candidates = Array.from(form.querySelectorAll('.tab-pane.active, .tab-pane, .form-fields, .form-widget, .card-body, .panel-body, fieldset, .form-horizontal, form'));

    candidates = candidates.filter(function (el) {
      var count = fields.filter(function (f) { return el.contains(f); }).length;
      el.__pmdResFieldCount = count;
      return count >= 6;
    });

    candidates.sort(function (a, b) {
      var ac = a.__pmdResFieldCount || 0;
      var bc = b.__pmdResFieldCount || 0;
      if (bc !== ac) return bc - ac;
      return a.querySelectorAll('*').length - b.querySelectorAll('*').length;
    });

    return candidates[0] || commonParent(fields) || form;
  }



  function removeSingleTabHeader(form) {
    var tabs = form.querySelector('#form-primary-tabs, [data-control="form-tabs"], .primary-tabs');
    if (!tabs) return;

    var heading = tabs.querySelector('.tab-heading, .form-nav.nav-tabs, .nav-tabs');
    if (heading) heading.style.display = 'none';

    tabs.classList.add('pmd-res-kds-no-tabs-v6');

    form.querySelectorAll('.tab-pane').forEach(function (pane) {
      pane.classList.add('active', 'show');
      pane.style.display = 'block';
    });
  }

  function boot() {
    document.documentElement.classList.add('pmd-res-kds-v2');
    document.body.classList.add('pmd-res-kds-v2');

    var form = document.getElementById('edit-form') || document.querySelector('form');
    if (!form) return;

    addHero(form);
    addFlow(form);

    tagFields(form);
    var grid = findBestGridContainer(form);
    if (grid && !grid.classList.contains('nav-tabs')) {
      grid.classList.add('pmd-res-kds-grid-v2');
      addGuide(grid);
    }

    removeSingleTabHeader(form);
    form.classList.add('pmd-res-kds-form-v2');
  }

  window.PMDReservationKDSCreateV2 = {
    report: function () {
      return {
        ready: document.body.classList.contains('pmd-res-kds-v2'),
        path: location.pathname,
        hero: !!document.querySelector('.pmd-res-kds-hero-v2'),
        flowCards: document.querySelectorAll('.pmd-res-kds-flow-card-v2').length,
        fields: Array.from(document.querySelectorAll('[data-pmd-res-field]')).map(function (x) {
          return x.getAttribute('data-pmd-res-field');
        }),
        grid: !!document.querySelector('.pmd-res-kds-grid-v2')
      };
    },
    rerun: boot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  setTimeout(boot, 180);
  setTimeout(boot, 700);
})();
