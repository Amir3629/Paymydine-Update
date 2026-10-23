/* PMD_INVENTORY_FOUR_TABS_V1
 * Preserve existing inventory settings and receipt reversal controls after
 * retiring the old Reports tab. Move DOM nodes rather than copying forms.
 * The original delegated operations handlers continue to own all writes.
 */
(function () {
  'use strict';
  function mount() {
    var root = document.querySelector('[data-pmd-inventory-root]');
    var workspace = root && root.querySelector('[data-pmd-inv-r19-workspace]');
    if (!workspace || workspace.hasAttribute('data-pmd-retained-controls-v1')) return;
    workspace.setAttribute('data-pmd-retained-controls-v1', '1');

    function moveCard(fieldSelector, paneName, heading, description) {
      var field = workspace.querySelector(fieldSelector);
      var pane = workspace.querySelector('[data-r19-pane="' + paneName + '"]');
      var card = field && field.closest('.pmd-inv-r24-card');
      if (!card || !pane) return;

      var details = document.createElement('details');
      details.className = 'pmd-inv-r19-activity pmd-inv-r24-retained-controls';
      var summary = document.createElement('summary');
      summary.textContent = heading;
      if (description) {
        var note = document.createElement('span');
        note.textContent = description;
        summary.appendChild(note);
      }
      details.appendChild(summary);
      details.appendChild(card);
      pane.appendChild(details);
    }

    moveCard('[data-r24-settings-form]', 'stock',
      'Inventory settings', 'Recipe consumption, valuation and stock alerts');
    moveCard('[data-r24-receipt-corrections]', 'purchases',
      'Recent receipts & reversals', 'Review purchases and reverse eligible receipts');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once: true});
  } else {
    mount();
  }
}());
