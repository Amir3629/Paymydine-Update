/* PMD_FLOOR_NOTE_RANGE_R42: read-only browser verification.
 * No renderer, observer, timer, mutation, requests or UI action.
 */
(function () {
  'use strict';
  function rectangle(node) {
    if (!node) return null;
    var r = node.getBoundingClientRect();
    return {left:Math.round(r.left),top:Math.round(r.top),
      width:Math.round(r.width),height:Math.round(r.height)};
  }
  function computed(node) {
    if (!node) return null;
    var c = window.getComputedStyle(node);
    return {background:c.backgroundColor,border:c.border,
      borderRadius:c.borderRadius,display:c.display,visibility:c.visibility};
  }
  function railInfo(key) {
    var rail = document.querySelector('[data-pmd-lab-range-control="'+key+'"]');
    if (!rail) return null;
    var label = rail.querySelector('[data-pmd-lab-range-value]');
    var caption = rail.querySelector('.pmd-r41-range-label small');
    var track = rail.querySelector('[data-pmd-lab-range-track]');
    return {
      count:label ? label.textContent.trim() : null,
      unit:rail.getAttribute('data-pmd-lab-range-unit'),
      frame:computed(rail),
      captionHidden:caption ? window.getComputedStyle(caption).display==='none' : null,
      railHeight:rectangle(rail),
      trackHeight:rectangle(track),
      ariaValueText:track ? track.getAttribute('aria-valuetext') : null
    };
  }
  window.PMDFloorNoteRangeR42 = {
    version:'42.0.0',
    audit:function () {
      var floor = document.getElementById('pmd-r2-shared-floor-canvas-v310');
      var note = document.getElementById('addGeneralStaffNoteModal');
      var close = note && note.querySelector('.pmd-note-close-r42');
      var pseudo = floor && window.getComputedStyle(floor,'::after');
      var buttons = [
        document.getElementById('notif-note-btn'),
        document.getElementById('notif-history-link')
      ];
      return {
        blueFloorPseudoElementDisabled:Boolean(pseudo &&
          pseudo.content==='none' && pseudo.display==='none'),
        floorFrame:computed(floor),
        mapMode:floor && floor.classList.contains('is-strip-mode')?'row':'full',
        flightActive:Boolean(floor && floor.classList.contains('pmd-r42-floor-flight-active')),
        flightCopies:document.querySelectorAll('.pmd-r42-floor-flight .pmd-r42-floor-ghost').length,
        realTables:floor?floor.querySelectorAll('[data-floor-canvas] > [data-floor-table]').length:0,
        closeText:close?close.textContent.trim():null,
        closeAppearance:computed(close),
        saveNote:computed(document.getElementById('generalStaffNoteSubmitBtn')),
        notificationButtonSizes:buttons.map(rectangle),
        days:railInfo('salesOverTime'),
        hours:railInfo('salesByHour')
      };
    }
  };
})();
