(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* Stop noisy third-party/date-picker split error from breaking boot scripts.
     The actual datepicker noop fallback is added below if the native plugin is missing. */
  window.addEventListener('error', function (event) {
    try {
      var file = String(event.filename || '');
      var msg = String(event.message || '');
      if (file.indexOf('tempusdominus-bootstrap-4') !== -1 && msg.indexOf("reading 'split'") !== -1) {
        event.preventDefault();
        return true;
      }
    } catch (e) {}
  }, true);

  function installNoopPickers() {
    try {
      if (!window.jQuery) return;
      var $ = window.jQuery;
      if ($.fn && !$.fn.datetimepicker) {
        $.fn.datetimepicker = function () { return this; };
      }
      if ($.fn && !$.fn.clockpicker) {
        $.fn.clockpicker = function () { return this; };
      }
      if ($.fn && !$.fn.inputmask) {
        $.fn.inputmask = function () { return this; };
      }
    } catch (e) {}
  }

  function stabilizeOldMissingImages() {
    document.querySelectorAll('img[src*="Gemini_Generated_Image_kzcmghkzcmghkzcm-removebg-preview"]').forEach(function (img) {
      img.width = 1;
      img.height = 1;
      img.style.opacity = '0';
      img.style.pointerEvents = 'none';
      img.setAttribute('aria-hidden', 'true');
    });
  }

  function reserveKpiLoadedWidths() {
    document.querySelectorAll('.pmd-dashboard-kpi-value, [class*="kpi-value"], [class*="metric-value"]').forEach(function (el) {
      if (!el.style.minWidth) el.style.minWidth = '122px';
    });
    document.querySelectorAll('.pmd-dashboard-kpi-sub, [class*="kpi-sub"], [class*="metric-sub"]').forEach(function (el) {
      if (!el.style.minWidth) el.style.minWidth = '190px';
    });
  }

  function cleanupPreboot() {
    document.documentElement.classList.remove('pmd-ui-jank-preboot-v57');
  }

  ready(function () {
    installNoopPickers();
    stabilizeOldMissingImages();
    reserveKpiLoadedWidths();

    [150, 400, 900, 1600, 2600, 4200].forEach(function (ms) {
      setTimeout(function () {
        installNoopPickers();
        stabilizeOldMissingImages();
        reserveKpiLoadedWidths();
      }, ms);
    });

    /* remove only after main late booting classes have finished */
    setTimeout(cleanupPreboot, 1900);

    window.PMDUIJankStabilityV57 = {
      installNoopPickers: installNoopPickers,
      stabilizeOldMissingImages: stabilizeOldMissingImages,
      reserveKpiLoadedWidths: reserveKpiLoadedWidths,
      cleanupPreboot: cleanupPreboot
    };
  });
})();
