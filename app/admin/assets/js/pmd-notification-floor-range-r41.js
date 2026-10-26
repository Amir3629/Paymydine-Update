/* PMD_NOTIFICATION_FLOOR_RANGE_R41
 * Move the EXISTING Bootstrap Staff Note modal to document.body so the
 * sidebar/header stacking context cannot clip it. Preserve the exact node,
 * original event handlers, suggestion fetching and POST saving logic.
 * No duplicate modal or notification API call.
 */
(function () {
  'use strict';
  function init() {
    var modal = document.getElementById('addGeneralStaffNoteModal');
    if (modal && modal.getAttribute('data-pmd-general-staff-note-r41') === '1' &&
        modal.parentElement !== document.body) {
      document.body.appendChild(modal);
      modal.setAttribute('data-pmd-note-portaled-r41', '1');
    }
  }

  function geometry(el) {
    if (!el) return null;
    var rect = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    return {
      width:Math.round(rect.width),height:Math.round(rect.height),
      borderRadius:style.borderRadius,background:style.backgroundImage,
      display:style.display
    };
  }

  function audit() {
    var modal = document.getElementById('addGeneralStaffNoteModal');
    var root = document.getElementById('pmd-r2-shared-floor-canvas-v310');
    var rail = document.querySelector('[data-pmd-lab-range-control="salesOverTime"]');
    var hour = document.querySelector('[data-pmd-lab-range-control="salesByHour"]');
    var stage = root && root.querySelector('[data-floor-stage]');
    function rangeInfo(node) {
      if (!node) return null;
      var track = node.querySelector('[data-pmd-lab-range-track]');
      var value = node.querySelector('[data-pmd-lab-range-value]');
      return {
        shown:value && value.textContent.trim(),
        unit:node.getAttribute('data-pmd-lab-range-unit'),
        track:geometry(track),
        rail:geometry(node),
        ariaValueText:track && track.getAttribute('aria-valuetext')
      };
    }
    return {
      version:'41.0.0',
      noteModalIsOriginalBodyNode:!!(modal && modal.parentElement===document.body),
      noteCloseHasAccessibleSVG:!!(modal && modal.querySelector('.pmd-note-close-r41[aria-label="Close"] svg')),
      noteDialog:geometry(modal&&modal.querySelector('.modal-content')),
      noteButton:geometry(document.getElementById('notif-note-btn')),
      historyButton:geometry(document.getElementById('notif-history-link')),
      floorFrame:geometry(root),
      floorStage:geometry(stage),
      floorMode:root && root.classList.contains('is-strip-mode')?'row':'full',
      floorTransitionOnlyOnUserToggle:!!(root && root.hasAttribute('data-pmd-floor-user-view-transition')),
      dayRange:rangeInfo(rail),
      hourRange:rangeInfo(hour)
    };
  }
  window.PMDNotificationFloorRangeR41={version:'41.0.0',audit:audit};
  if(document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded',init,{once:true});
  } else {
    init();
  }
})();
