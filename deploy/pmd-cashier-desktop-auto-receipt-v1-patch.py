#!/usr/bin/env python3
from pathlib import Path
import sys

MARK_PAYMENT = 'PMD_DESKTOP_AUTO_RECEIPT_R1'
MARK_ORDER = 'PMD_DESKTOP_DIRECT_PRINT_R1'
MARK_INVOICE = 'PMD_DESKTOP_INVOICE_REPRINT_R1'
MARK_DOWNLOAD = 'PMD_CASHIER_DESKTOP_DOWNLOADS_V103'
MARK_DRAWER = 'PMD_DESKTOP_HARDWARE_OWNER_R1'

if len(sys.argv) != 2:
    raise SystemExit('usage: pmd-cashier-desktop-auto-receipt-v1-patch.py <stage-root>')

root = Path(sys.argv[1])


def read(rel):
    path = root / rel
    if not path.is_file():
        raise SystemExit(f'missing staged file: {rel}')
    return path, path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# 1) Cashier payment UI: desktop-aware auto receipt + explicit hardware owner.
# ---------------------------------------------------------------------------
payment_rel = 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'
payment_path, payment = read(payment_rel)

if MARK_PAYMENT not in payment:
    anchor = '      // PMD_CASHIER_LOCAL_POS_IDENTITY_R1\n'
    helper = r'''      // PMD_DESKTOP_AUTO_RECEIPT_R1
      // Electron is the local hardware authority only when the trusted preload
      // bridge exists. Normal browser sessions keep their existing behavior.
      function desktopBridge() {
        return window.PayMyDineDesktop
          && window.PayMyDineDesktop.isDesktopApp
          ? window.PayMyDineDesktop
          : null;
      }

      function latestDesktopReceiptUrl() {
        var transactions = state.payment.summary
          && Array.isArray(state.payment.summary.transactions)
            ? state.payment.summary.transactions
            : [];
        var row = transactions.find(function (transaction) {
          return transaction && transaction.receipt_url;
        });
        return row ? String(row.receipt_url) : '';
      }

      function desktopPrintStoreKey() {
        return 'pmd_desktop_printed_payment_keys_v1';
      }

      function desktopPrintedKeys() {
        try {
          var parsed = JSON.parse(
            window.localStorage.getItem(desktopPrintStoreKey()) || '[]'
          );
          return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch (error) {
          return [];
        }
      }

      function desktopWasPrinted(key) {
        return desktopPrintedKeys().indexOf(String(key || '')) !== -1;
      }

      function desktopRememberPrinted(key) {
        key = String(key || '');
        if (!key) return;
        try {
          var keys = desktopPrintedKeys().filter(function (row) {
            return row !== key;
          });
          keys.push(key);
          window.localStorage.setItem(
            desktopPrintStoreKey(),
            JSON.stringify(keys.slice(-100))
          );
        } catch (error) {}
      }

      function desktopAbsoluteUrl(rawUrl) {
        return new URL(String(rawUrl || ''), window.location.origin).toString();
      }

      async function notifyDesktopPaymentSuccess(meta) {
        var bridge = desktopBridge();
        if (!bridge || !meta) return;

        var receiptUrl = String(meta.receiptUrl || '');
        var key = String(meta.key || receiptUrl || '');
        if (!receiptUrl || !key || desktopWasPrinted(key)) return;

        try {
          var config = await bridge.getConfig();
          if (config && config.autoPrintReceipt === false) return;

          await bridge.printReceiptUrl(
            desktopAbsoluteUrl(receiptUrl)
          );
          desktopRememberPrinted(key);
          toast('Receipt printed');
        } catch (error) {
          toast(
            'Payment recorded, but receipt could not print: '
              + ((error && error.message) || 'Unknown print error'),
            true
          );
        }
      }

'''
    payment = replace_once(payment, anchor, helper + anchor, 'payment helper anchor')

    old = """        var summary = state.payment.summary;\n        try {\n          var localPosIdentity = state.payment.method === 'cash'\n            ? await resolveLocalPosIdentity()\n            : null;\n"""
    new = """        var summary = state.payment.summary;\n        var paymentKey = state.payment.idempotencyKey;\n        try {\n          var localPosIdentity = state.payment.method === 'cash' && !desktopBridge()\n            ? await resolveLocalPosIdentity()\n            : null;\n"""
    payment = replace_once(payment, old, new, 'payment identity anchor')

    old = """              pos_device_code: localPosIdentity && localPosIdentity.device_code ? String(localPosIdentity.device_code) : null,\n"""
    new = """              pos_device_code: localPosIdentity && localPosIdentity.device_code ? String(localPosIdentity.device_code) : null,\n              desktop_hardware_managed: !!desktopBridge(),\n"""
    payment = replace_once(payment, old, new, 'payment desktop hardware flag')

    old = """          state.payment.summary = json.summary || state.payment.summary;\n          state.payment.idempotencyKey = uid('pay');\n"""
    new = """          state.payment.summary = json.summary || state.payment.summary;\n          void notifyDesktopPaymentSuccess({\n            key: paymentKey,\n            paymentMethod: state.payment.method,\n            receiptUrl: json.receipt_url,\n            settlementStatus: json.settlement_status,\n            orderId: state.activeOrderId\n          });\n          state.payment.idempotencyKey = uid('pay');\n"""
    payment = replace_once(payment, old, new, 'payment auto-print response anchor')

    old = """        if (status === 'paid') {\n          await loadPaymentSummary(true);\n          await refreshData(true);\n"""
    new = """        if (status === 'paid') {\n          await loadPaymentSummary(true);\n          var desktopReceiptUrl = latestDesktopReceiptUrl();\n          void notifyDesktopPaymentSuccess({\n            key: desktopReceiptUrl || ('terminal:' + state.activeOrderId + ':' + (state.payment.terminalAttemptId || 'paid')),\n            paymentMethod: 'direct_terminal',\n            receiptUrl: desktopReceiptUrl,\n            settlementStatus: 'paid',\n            orderId: state.activeOrderId\n          });\n          await refreshData(true);\n"""
    payment = replace_once(payment, old, new, 'terminal auto-print anchor')

write(payment_path, payment)


# ---------------------------------------------------------------------------
# 2) Server cash-drawer bridge: Desktop app is the only local hardware owner.
# ---------------------------------------------------------------------------
drawer_rel = 'app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php'
drawer_path, drawer = read(drawer_rel)

if MARK_DRAWER not in drawer:
    old = """        if (strtolower(trim($method)) !== 'cash') {\n            return self::skipped('not_cash');\n        }\n\n"""
    new = """        if (strtolower(trim($method)) !== 'cash') {\n            return self::skipped('not_cash');\n        }\n\n        // PMD_DESKTOP_HARDWARE_OWNER_R1\n        // The Electron Cashier owns the local printer/drawer when this flag is\n        // present. Never queue a second legacy Connector drawer command.\n        if (filter_var($payload['desktop_hardware_managed'] ?? false, FILTER_VALIDATE_BOOLEAN)) {\n            return self::skipped('desktop_hardware_managed');\n        }\n\n"""
    drawer = replace_once(drawer, old, new, 'drawer desktop owner anchor')

write(drawer_path, drawer)


# ---------------------------------------------------------------------------
# 3) Cashier Order Center: desktop direct Print/Reprint, browser fallback.
# ---------------------------------------------------------------------------
order_rel = 'app/admin/assets/js/pmd-cashier-lab-order-center.js'
order_path, order = read(order_rel)

if MARK_ORDER not in order:
    old = """    documentFrame: null,\n    voidDialog: null,\n"""
    new = """    documentFrame: null,\n    documentUrl: '',\n    documentKind: '',\n    voidDialog: null,\n"""
    order = replace_once(order, old, new, 'order state anchor')

    old = """    shell.classList.remove('is-document');\n    state.documentFrame = null;\n"""
    new = """    shell.classList.remove('is-document');\n    state.documentFrame = null;\n    state.documentUrl = '';\n    state.documentKind = '';\n"""
    order = replace_once(order, old, new, 'order reset document anchor')

    old = """    shell.classList.add('is-document');\n    state.documentFrame = null;\n"""
    new = """    shell.classList.add('is-document');\n    state.documentFrame = null;\n    state.documentUrl = url;\n    state.documentKind = kind;\n"""
    order = replace_once(order, old, new, 'order document URL anchor')

    old = """        'data-pmd-r37-action=\"document-print\" disabled>',\n        'Print',\n"""
    new = """        'data-pmd-r37-action=\"document-print\" disabled>',\n        'Print / reprint',\n"""
    order = replace_once(order, old, new, 'order print label anchor')

    old = r'''  function printDocument() {
    if (
      !state.documentFrame
      || !state.documentFrame.contentWindow
    ) {
      return;
    }

    try {
      state.documentFrame.contentWindow.focus();
      state.documentFrame.contentWindow.print();
    } catch (error) {
      console.error(
        '[PMD] Cashier document print failed',
        error
      );
    }
  }
'''
    new = r'''  // PMD_DESKTOP_DIRECT_PRINT_R1
  async function printDocument() {
    var printButton = state.shell
      ? state.shell.querySelector('[data-pmd-r37-action="document-print"]')
      : null;

    var desktop = window.PayMyDineDesktop
      && window.PayMyDineDesktop.isDesktopApp
        ? window.PayMyDineDesktop
        : null;

    if (desktop && state.documentUrl) {
      if (printButton) {
        printButton.disabled = true;
        printButton.textContent = 'Printing…';
      }

      try {
        var absoluteUrl = new URL(
          state.documentUrl,
          window.location.origin
        ).toString();
        var result = await desktop.printReceiptUrl(absoluteUrl);
        if (printButton) {
          printButton.textContent = 'Printed';
          window.setTimeout(function () {
            if (!printButton.isConnected) return;
            printButton.textContent = 'Print / reprint';
          }, 1200);
        }
        return result;
      } catch (error) {
        console.error('[PMD] Desktop direct print failed', error);
        if (printButton) {
          printButton.textContent = 'Print failed — retry';
        }
        return null;
      } finally {
        if (printButton && printButton.isConnected) {
          printButton.disabled = false;
        }
      }
    }

    if (
      !state.documentFrame
      || !state.documentFrame.contentWindow
    ) {
      return;
    }

    try {
      state.documentFrame.contentWindow.focus();
      state.documentFrame.contentWindow.print();
    } catch (error) {
      console.error(
        '[PMD] Cashier document print failed',
        error
      );
    }
  }
'''
    order = replace_once(order, old, new, 'order printDocument anchor')

    old = """    refresh: loadDetails,\n\n    inspect: function () {\n"""
    new = """    refresh: loadDetails,\n\n    printCurrentDocument: printDocument,\n\n    inspect: function () {\n"""
    order = replace_once(order, old, new, 'order public print API anchor')

write(order_path, order)


# ---------------------------------------------------------------------------
# 4) Canonical Invoice button: ask parent Cashier to print directly in Desktop.
#    Standalone browser keeps window.print().
# ---------------------------------------------------------------------------
invoice_rel = 'app/admin/views/orders/customer_invoice.blade.php'
invoice_path, invoice = read(invoice_rel)

if MARK_INVOICE not in invoice:
    old = '<button class="print-btn" onclick="window.print()">Print receipt</button>\n'
    new = r'''<!-- PMD_DESKTOP_INVOICE_REPRINT_R1 -->
<button class="print-btn" onclick="return window.pmdPrintReceipt(event)">Print / reprint receipt</button>
<script>
window.pmdPrintReceipt = function (event) {
    if (event) event.preventDefault();
    try {
        if (
            window.parent && window.parent !== window &&
            window.parent.PMDCashierOrderCenter &&
            typeof window.parent.PMDCashierOrderCenter.printCurrentDocument === 'function'
        ) {
            window.parent.PMDCashierOrderCenter.printCurrentDocument();
            return false;
        }
    } catch (error) {}
    window.print();
    return false;
};
</script>
'''
    invoice = replace_once(invoice, old, new, 'invoice print button anchor')

write(invoice_path, invoice)


# ---------------------------------------------------------------------------
# 5) Settings download card -> V1.0.3 stable preview assets.
# ---------------------------------------------------------------------------
download_rel = 'app/admin/views/pmddevices/index.blade.php'
download_path, download = read(download_rel)

if MARK_DOWNLOAD not in download:
    replacements = [
        ('{-- PMD_CASHIER_DESKTOP_DOWNLOADS_R1 --}', '{-- PMD_CASHIER_DESKTOP_DOWNLOADS_R1 --}\n    {{-- PMD_CASHIER_DESKTOP_DOWNLOADS_V103 --}}'),
        ('V1.0.1 Preview', 'V1.0.3 Preview'),
        ('PayMyDine-Cashier-Setup-1.0.1.exe', 'PayMyDine-Cashier-Setup-1.0.3.exe'),
        ('PayMyDine-Cashier-1.0.1-mac-arm64.dmg', 'PayMyDine-Cashier-1.0.3-mac-arm64.dmg'),
        ('PayMyDine-Cashier-1.0.1-mac-x64.dmg', 'PayMyDine-Cashier-1.0.3-mac-x64.dmg'),
    ]
    for old, new in replacements:
        if old not in download:
            raise SystemExit(f'download card anchor missing: {old}')
        download = download.replace(old, new, 1)

write(download_path, download)


# Final contracts.
contracts = [
    (payment_rel, payment, MARK_PAYMENT),
    (payment_rel, payment, 'desktop_hardware_managed: !!desktopBridge()'),
    (payment_rel, payment, 'notifyDesktopPaymentSuccess'),
    (drawer_rel, drawer, MARK_DRAWER),
    (drawer_rel, drawer, "self::skipped('desktop_hardware_managed')"),
    (order_rel, order, MARK_ORDER),
    (order_rel, order, 'printCurrentDocument: printDocument'),
    (invoice_rel, invoice, MARK_INVOICE),
    (invoice_rel, invoice, 'window.print();'),
    (download_rel, download, MARK_DOWNLOAD),
    (download_rel, download, 'PayMyDine-Cashier-Setup-1.0.3.exe'),
]
for rel, text, needle in contracts:
    if needle not in text:
        raise SystemExit(f'contract missing in {rel}: {needle}')

print('PMD_CASHIER_DESKTOP_AUTO_RECEIPT_V1_PATCH_OK')
