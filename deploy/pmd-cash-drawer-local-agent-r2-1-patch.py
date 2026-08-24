#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.')


def read(rel):
    p = ROOT / rel
    if not p.is_file():
        raise SystemExit(f'missing R2.2 patch target: {rel}')
    return p, p.read_text()


def write(p, text):
    p.write_text(text)


def replace_once(text, old, new, label):
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)


def patch_cash_drawers():
    p, s = read('app/admin/controllers/CashDrawers.php')
    s = s.replace(
        "/api/pmd-pos-agent/agent.js",
        "/api/v1/pmd-pos-agent/agent.js",
    )
    if 'PMD_CASH_DRAWER_AGENT_V1_NGINX_AUTHORITY_R21' not in s:
        marker = "    // PMD_CASH_DRAWER_AGENT_V1_NGINX_AUTHORITY_R21\n"
        anchors = [
            "class CashDrawers extends AdminController\n{\n",
            "class CashDrawers extends Controller\n{\n",
        ]
        for anchor in anchors:
            if anchor in s:
                s = s.replace(anchor, anchor + marker, 1)
                break
        else:
            raise SystemExit('CashDrawers class anchor missing: neither AdminController nor Controller signature found')
    write(p, s)


def patch_receipt_route():
    p, s = read('routes/pos-receipts.php')
    marker = 'PMD_CASHIER_RECEIPT_TENANT_AUTHORITY_R21'
    if marker not in s:
        old = "Route::get('admin/orders/split-receipt/{transactionId}', function ($transactionId) {\n"
        new = "Route::middleware(['tenant.database'])->get('admin/orders/split-receipt/{transactionId}', function ($transactionId) {\n    // PMD_CASHIER_RECEIPT_TENANT_AUTHORITY_R21\n    $user = AdminAuth::getUser();\n    if (!$user || !$user->hasPermission('Admin.Orders')) {\n        abort(403, 'Order permission required.');\n    }\n"
        s = replace_once(s, old, new, 'split receipt tenant authority')
    write(p, s)


def patch_cashier_composer():
    p, s = read('app/admin/assets/js/pmd-cashier-order-composer-v1.js')
    if 'PMD_CASHIER_TABLE_HINT_R21' not in s:
        anchor = "  function currentOrderCenterId() {\n"
        helper = r'''  // PMD_CASHIER_TABLE_HINT_R21
  // Order Center actions can originate outside an order card. Resolve the
  // canonical table hint from the matching Cashier card when it exists and
  // let openEdit() fall back to its server-side resolver when it does not.
  function tableHintForOrderId(orderId) {
    orderId = Number(orderId || 0);
    if (!orderId) return null;

    var card = document.querySelector(
      '[data-pmd-cashier-order="' + String(orderId) + '"]'
    );

    if (!card) return null;

    try {
      return tableFromOrderCard(card);
    } catch (error) {
      return null;
    }
  }

'''
        s = replace_once(s, anchor, helper + anchor, 'cashier table hint helper')
    write(p, s)


patch_cash_drawers()
patch_receipt_route()
patch_cashier_composer()
print('PMD_CASH_DRAWER_R2_2_PATCH_OK')
