/* PMD_QPOS_ANDROID_SAFE_RUNTIME_V107
 * Runs after the bundled Quick POS runtime in Android 0.3.28.
 * It does not replace the application runtime. It only corrects the device
 * class that old bundled code derives from CSS-pixel width.
 */
(function () {
  'use strict';

  var frame = null;
  var timers = [];

  function clearTimers() {
    while (timers.length) {
      window.clearTimeout(timers.pop());
    }
  }

  function applyTabletIdentity() {
    var root = document.getElementById('pmd-quick-pos');
    if (!root) return;

    var width = Math.max(
      Number(window.innerWidth || 0),
      Number(document.documentElement.clientWidth || 0)
    );
    var height = Math.max(
      Number(window.innerHeight || 0),
      Number(document.documentElement.clientHeight || 0)
    );
    if (!width || !height) return;

    var portrait = height > width;

    root.classList.remove(
      'is-handheld-portrait-v96',
      'is-phone-portrait-v102',
      'is-phone-landscape-v102'
    );
    root.classList.toggle('is-portrait-v86', portrait);
    root.classList.toggle('is-landscape-v86', !portrait);
    root.classList.toggle('is-tablet-portrait-v102', portrait);
    root.classList.toggle('is-tablet-landscape-v102', !portrait);
    root.dataset.qposViewportClass = portrait ? 'tablet-portrait' : 'tablet-landscape';

    if (document.body) {
      document.body.classList.remove(
        'pmd-qpos-handheld-portrait-v96',
        'pmd-qpos-phone-portrait-v102',
        'pmd-qpos-phone-landscape-v102'
      );
      document.body.classList.toggle('pmd-qpos-portrait-v86', portrait);
      document.body.classList.toggle('pmd-qpos-landscape-v86', !portrait);
      document.body.classList.toggle('pmd-qpos-tablet-portrait-v102', portrait);
      document.body.classList.toggle('pmd-qpos-tablet-landscape-v102', !portrait);
      document.body.classList.add('pmd-qpos-android-pos-v107');
    }

    document.documentElement.classList.add('pmd-qpos-android-pos-v107');
  }

  function schedule() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(function () {
      frame = null;
      applyTabletIdentity();
    });

    clearTimers();
    timers.push(window.setTimeout(applyTabletIdentity, 40));
    timers.push(window.setTimeout(applyTabletIdentity, 120));
    timers.push(window.setTimeout(applyTabletIdentity, 360));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  window.addEventListener('orientationchange', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule, { passive: true });
  }
})();
