(function () {
  'use strict';

  var MARK = 'PMD_DESKTOP_STANDALONE_PRINT_BRIDGE_V108';

  function desktopBridge() {
    return window.PayMyDineDesktop
      && window.PayMyDineDesktop.isDesktopApp
      && typeof window.PayMyDineDesktop.printReceiptUrl === 'function'
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

    bridge.printReceiptUrl(printableUrl())
      .then(function () {
        setButtonState('Printed', true);
        window.setTimeout(function () {
          setButtonState('', false);
        }, 1200);
      })
      .catch(function (error) {
        console.error('[PMD] ' + MARK + ' direct print failed', error);
        setButtonState('Print failed - retry', false);
      });

    return false;
  };

  window.PMDDesktopStandalonePrintV108 = Object.freeze({
    mark: MARK,
    available: function () { return Boolean(desktopBridge()); },
  });
})();
