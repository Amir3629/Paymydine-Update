/* PMD_INVENTORY_SUBCATEGORY_SCROLLBAR_R31
 * 3px visible scrubber for macOS's auto-hidden native scrollbars. The R19
 * category strip remains the SOURCE OF TRUTH and stays independently
 * wheel/touch/keyboard scrollable. No filter buttons, handlers, selections,
 * server data or barcode/camera events are replaced.
 */
(function () {
  'use strict';
  if (window.PMDInventoryScrollbarR31) return;

  function boot() {
    if (window.PMDInventoryScrollbarR31) return;
    var root = document.querySelector('#pmd-inventory-v1[data-pmd-inventory-root]');
    if (!root) return;
    var strips = root.querySelectorAll(
      '.pmd-inv-r19-subcategories[data-r19-purchase-sub]'
    );
    if (!strips.length) return;

    var items = [];
    function install(list) {
      if (!list || list.hasAttribute('data-pmd-inv-r31-scrollbar-attached')) return;
      list.setAttribute('data-pmd-inv-r31-scrollbar-attached', '1');
      var rail = document.createElement('div');
      rail.className = 'pmd-inv-r31-scrollbar';
      rail.setAttribute('aria-hidden', 'true');
      rail.hidden = true;
      var thumb = document.createElement('span');
      thumb.className = 'pmd-inv-r31-scrollbar__thumb';
      rail.appendChild(thumb);
      list.parentNode.insertBefore(rail, list.nextSibling);

      // The native horizontal list is accessible independently of the tiny
      // cosmetic pointer track: children remain real keyboard-focusable buttons.
      var scheduled = false;
      var width = 0;
      var total = 0;
      var available = 0;
      var thumbWidth = 0;
      function update() {
        scheduled = false;
        width = list.clientWidth || 0;
        total = list.scrollWidth || 0;
        available = Math.max(0, total - width);
        var visible = !list.hidden && list.getClientRects().length > 0;
        if (!visible || width < 1 || available < 3) {
          rail.hidden = true;
          return;
        }
        rail.hidden = false;
        var railWidth = rail.clientWidth || width;
        thumbWidth = Math.min(railWidth,
          Math.max(28, Math.round(railWidth * width / total)));
        thumb.style.width = thumbWidth + 'px';
        var travel = Math.max(0, railWidth - thumbWidth);
        var ratio = Math.min(1, Math.max(0, list.scrollLeft / available));
        thumb.style.transform = 'translateX(' + Math.round(travel * ratio) + 'px)';
      }
      function schedule() {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(update);
      }

      list.addEventListener('scroll', schedule, {passive:true});
      if (window.ResizeObserver) {
        new ResizeObserver(schedule).observe(list);
        new ResizeObserver(schedule).observe(rail);
      }
      var changes = new MutationObserver(schedule);
      changes.observe(list, {childList:true,attributes:true,attributeFilter:['hidden']});

      var pointerId = null;
      var grab = 0;
      function seek(clientX) {
        var rect = rail.getBoundingClientRect();
        var travel = rect.width - thumbWidth;
        if (travel <= 0 || available <= 0) return;
        var x = Math.max(0, Math.min(travel, clientX - rect.left - grab));
        list.scrollLeft = Math.round(x / travel * available);
        schedule();
      }
      rail.addEventListener('pointerdown', function (event) {
        if (rail.hidden || event.button !== 0) return;
        pointerId = event.pointerId;
        var rect = thumb.getBoundingClientRect();
        grab = event.clientX >= rect.left && event.clientX <= rect.right
          ? event.clientX - rect.left
          : thumbWidth / 2;
        if (rail.setPointerCapture) rail.setPointerCapture(pointerId);
        seek(event.clientX);
        event.preventDefault();
      });
      rail.addEventListener('pointermove', function (event) {
        if (pointerId !== event.pointerId) return;
        seek(event.clientX);
      });
      function release(event) {
        if (event.pointerId !== pointerId) return;
        pointerId = null;
        if (rail.releasePointerCapture && rail.hasPointerCapture &&
            rail.hasPointerCapture(event.pointerId)) {
          rail.releasePointerCapture(event.pointerId);
        }
      }
      rail.addEventListener('pointerup', release);
      rail.addEventListener('pointercancel', release);
      window.addEventListener('resize', schedule, {passive:true});
      items.push({list:list,rail:rail,update:schedule});
      schedule();
    }

    Array.prototype.forEach.call(strips, install);
    // The mode switch changes the list's visible size, and R19 may fill
    // categories after the panel first renders.
    root.addEventListener('click', function (event) {
      if (event.target.closest('[data-r19-mode]')) {
        items.forEach(function (item) { item.update(); });
      }
    });
    window.PMDInventoryScrollbarR31 = {
      version:'1.0.0',
      count:function () { return items.length; },
      refresh:function () { items.forEach(function (item) { item.update(); }); }
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  } else boot();
}());
