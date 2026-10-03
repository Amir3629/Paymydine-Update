(function () {
  'use strict';

  var MARK = 'PMD_DESKTOP_STANDALONE_PRINT_BRIDGE_V108';
  var COMPAT = 'PMD_DESKTOP_PRINT_DRIVER_COMPAT_V109';

  function desktopBridge() {
    return window.PayMyDineDesktop
      && window.PayMyDineDesktop.isDesktopApp
        ? window.PayMyDineDesktop
        : null;
  }

  function printableUrl() {
    try {
      return new URL(window.location.href, window.location.origin).toString();
    } catch (error) {
      return String(window.location.href || '');
    }
  }

  function buttonNode() {
    return document.querySelector('.print-btn');
  }

  function setButtonState(label, disabled) {
    var button = buttonNode();
    if (!button) return;
    if (!button.dataset.pmdOriginalPrintLabel) {
      button.dataset.pmdOriginalPrintLabel = button.textContent || 'Print / reprint receipt';
    }
    button.textContent = label || button.dataset.pmdOriginalPrintLabel;
    button.disabled = Boolean(disabled);
  }

  function desktopPrint(bridge, url) {
    // V1.0.9 knows how to select a verified compatibility path itself.
    if (
      bridge.printerCompatibilityV109 === true
      && typeof bridge.printReceiptUrl === 'function'
    ) {
      return bridge.printReceiptUrl(url);
    }

    // V1.0.7/V1.0.8 incorrectly assumed that a Windows queue named
    // "Generic / Text Only" proved ESC/POS raster support. It does not.
    // Prefer the OS driver path on those installed builds; this is the same
    // rendering layer that a successful Windows printer test exercises.
    if (typeof bridge.printUrl === 'function') {
      return bridge.printUrl(url);
    }

    if (typeof bridge.printReceiptUrl === 'function') {
      return bridge.printReceiptUrl(url);
    }

    return Promise.reject(new Error('PayMyDine Desktop print API is unavailable.'));
  }

  var originalPrint = typeof window.pmdPrintReceipt === 'function'
    ? window.pmdPrintReceipt
    : null;

  window.pmdPrintReceipt = function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    var bridge = desktopBridge();
    if (!bridge) {
      if (originalPrint) return originalPrint(event);
      window.print();
      return false;
    }

    setButtonState('Printing...', true);

    desktopPrint(bridge, printableUrl())
      .then(function () {
        setButtonState('Printed', true);
        window.setTimeout(function () {
          setButtonState('', false);
        }, 1200);
      })
      .catch(function (error) {
        console.error('[PMD] ' + COMPAT + ' direct print failed', error);
        setButtonState('Print failed - retry', false);
      });

    return false;
  };

  window.PMDDesktopStandalonePrintV108 = Object.freeze({
    mark: MARK,
    compatibility: COMPAT,
    available: function () { return Boolean(desktopBridge()); },
  });
})();
