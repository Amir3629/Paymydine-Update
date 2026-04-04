(function () {
  const STYLE_ID = 'pmd-table-grid-debug-fix-v1';
  const BOX_ID = 'pmd-table-layout-debug-box';

  function q(sel, root = document) {
    return root.querySelector(sel);
  }

  function qa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function field(name) {
    return q('[data-field-name="' + name + '"]');
  }

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = `
      .form-widget .form-fields.pmd-exact-grid-debug {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        column-gap: 28px !important;
        row-gap: 26px !important;
        align-items: start !important;
      }

      .form-widget .form-fields.pmd-exact-grid-debug > .form-group {
        float: none !important;
        clear: none !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
      }

      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-hide {
        display: none !important;
      }

      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-r1c1 { grid-row: 1 !important; grid-column: 1 !important; }
      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-r1c2 { grid-row: 1 !important; grid-column: 2 !important; }
      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-r2c1 { grid-row: 2 !important; grid-column: 1 !important; }
      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-r2c2 { grid-row: 2 !important; grid-column: 2 !important; }
      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-r3c1 { grid-row: 3 !important; grid-column: 1 !important; }
      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-r3c2 { grid-row: 3 !important; grid-column: 2 !important; }
      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-r4c1 { grid-row: 4 !important; grid-column: 1 !important; }
      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-r4c2 { grid-row: 4 !important; grid-column: 2 !important; }
      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-r5c1 { grid-row: 5 !important; grid-column: 1 !important; }
      .form-widget .form-fields.pmd-exact-grid-debug > .pmd-r5c2 { grid-row: 5 !important; grid-column: 2 !important; }

      .form-widget .form-fields.pmd-exact-grid-debug input,
      .form-widget .form-fields.pmd-exact-grid-debug textarea,
      .form-widget .form-fields.pmd-exact-grid-debug select,
      .form-widget .form-fields.pmd-exact-grid-debug .ss-main,
      .form-widget .form-fields.pmd-exact-grid-debug .select2,
      .form-widget .form-fields.pmd-exact-grid-debug .select2-container {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      #${BOX_ID} {
        position: fixed !important;
        top: 12px !important;
        right: 12px !important;
        z-index: 999999 !important;
        width: 420px !important;
        max-width: calc(100vw - 24px) !important;
        background: #111827 !important;
        color: #f9fafb !important;
        border: 1px solid #374151 !important;
        border-radius: 10px !important;
        padding: 12px !important;
        box-shadow: 0 10px 30px rgba(0,0,0,.35) !important;
        font: 12px/1.45 monospace !important;
        white-space: pre-wrap !important;
      }

      #${BOX_ID} .ok { color: #86efac !important; }
      #${BOX_ID} .warn { color: #fca5a5 !important; }
    `;
  }

  function cleanPlacement(el) {
    if (!el) return;
    el.classList.remove(
      'span-left', 'span-right', 'span-full',
      'pmd-hide',
      'pmd-r1c1','pmd-r1c2',
      'pmd-r2c1','pmd-r2c2',
      'pmd-r3c1','pmd-r3c2',
      'pmd-r4c1','pmd-r4c2',
      'pmd-r5c1','pmd-r5c2'
    );
    el.style.display = '';
  }

  function place(el, rc) {
    if (!el) return;
    cleanPlacement(el);
    el.classList.add(rc);
  }

  function hide(el) {
    if (!el) return;
    cleanPlacement(el);
    el.classList.add('pmd-hide');
  }

  function hasValueControl(el) {
    if (!el) return false;
    const input = el.querySelector('input, textarea, select');
    const special = el.querySelector('.ss-main, .field-custom-container, .select2-container');
    if (input && String(input.value || '').trim() !== '') return true;
    if (special) return true;
    if (input && (input.disabled || input.readOnly)) return true;
    return false;
  }

  function showBox(lines) {
    let box = document.getElementById(BOX_ID);
    if (!box) {
      box = document.createElement('div');
      box.id = BOX_ID;
      document.body.appendChild(box);
    }
    box.innerHTML = lines.join('\n');
  }

  function classOf(name) {
    const el = field(name);
    return el ? el.className : 'MISSING';
  }

  function fixLabels() {
    const map = {
      'table_no': 'Table Number',
      'priority': 'Priority',
      'min_capacity': 'Minimum Capacity',
      'max_capacity': 'Maximum Capacity',
      'table_status': 'Status',
      'is_joinable': 'Is Joinable',
      'locations': 'Location(s)',
      'extra_capacity': 'Extra Capacity',
      'pos_table_label': 'POS / Custom Table Name'
    };

    Object.entries(map).forEach(([name, label]) => {
      const lbl = q('[data-field-name="' + name + '"] .form-label');
      if (lbl) lbl.textContent = label;
    });
  }

  function removePosText() {
    qa('.help-block').forEach((el) => {
      const txt = (el.textContent || '').trim();
      if (
        txt.includes('POS-synced tables show the external POS label here') ||
        txt.includes('Internal numeric table_no remains unchanged') ||
        txt.includes('Exact external POS/custom table label')
      ) {
        el.remove();
      }
    });
  }

  function applyLayout() {
    const container = q('.form-widget .form-fields');
    if (!container) {
      console.log('PMD DEBUG: form-fields not found');
      return;
    }

    ensureStyle();
    container.classList.add('pmd-exact-grid-debug');

    const tableNo   = field('table_no');
    const pos       = field('pos_table_label');
    const priority  = field('priority');
    const minCap    = field('min_capacity');
    const maxCap    = field('max_capacity');
    const status    = field('table_status');
    const joinable  = field('is_joinable');
    const locations = field('locations');
    const extra     = field('extra_capacity');
    const qr        = field('qr_code');

    const isPos = !!pos && pos.offsetParent !== null && hasValueControl(pos);

    if (isPos) {
      place(tableNo,   'pmd-r1c1');
      place(pos,       'pmd-r1c2');

      place(priority,  'pmd-r2c1');
      place(locations, 'pmd-r2c2');

      place(minCap,    'pmd-r3c1');
      place(maxCap,    'pmd-r3c2');

      place(status,    'pmd-r4c1');
      place(joinable,  'pmd-r4c2');

      place(extra,     'pmd-r5c1');
      if (qr) hide(qr);
    } else {
      hide(pos);

      place(tableNo,   'pmd-r1c1');
      place(priority,  'pmd-r1c2');

      place(minCap,    'pmd-r2c1');
      place(maxCap,    'pmd-r2c2');

      place(status,    'pmd-r3c1');
      place(joinable,  'pmd-r3c2');

      place(locations, 'pmd-r4c1');
      place(extra,     'pmd-r4c2');

      if (qr) hide(qr);
    }

    fixLabels();
    removePosText();

    const lines = [
      '<b>PMD TABLE LAYOUT DEBUG</b>',
      'isPos = ' + isPos,
      'table_no      = ' + classOf('table_no'),
      'pos_table_label = ' + classOf('pos_table_label'),
      'priority      = ' + classOf('priority'),
      'locations     = ' + classOf('locations'),
      'min_capacity  = ' + classOf('min_capacity'),
      'max_capacity  = ' + classOf('max_capacity'),
      'table_status  = ' + classOf('table_status'),
      'is_joinable   = ' + classOf('is_joinable'),
      'extra_capacity= ' + classOf('extra_capacity')
    ];

    showBox(lines);
    console.log('✅ PMD DEBUG layout applied', { isPos, lines });
  }

  function boot() {
    applyLayout();
    setTimeout(applyLayout, 150);
    setTimeout(applyLayout, 500);
    setTimeout(applyLayout, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
