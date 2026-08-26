#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

APP = Path('/var/www/paymydine')
FE = APP / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815'
BACKEND = APP / 'app/main/routes/api-v1-guest-order-flow-r60t.php'
INVOICE = APP / 'routes/review-social.php'
OVERLAYS = FE / 'src/runtime/components/RuntimeOverlays.tsx'
WRAPPER = FE / 'src/runtime/components/OrderingRuntimeOverlaysR60T.tsx'
MARKER = 'PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE'

FILES = [BACKEND, INVOICE, OVERLAYS, WRAPPER]
for path in FILES:
    if not path.is_file():
        raise SystemExit(f'STOP: missing {path}')

stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup = Path('/root') / f'paymydine-r64-final-{stamp}'
for path in FILES:
    dest = backup / path.relative_to(APP)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)
print('Backup:', backup)

backend = BACKEND.read_text(encoding='utf-8')
invoice = INVOICE.read_text(encoding='utf-8')
overlays = OVERLAYS.read_text(encoding='utf-8')
wrapper = WRAPPER.read_text(encoding='utf-8')

if MARKER in backend and MARKER in invoice and MARKER in overlays and MARKER in wrapper:
    print('R64 patch already present')
    raise SystemExit(0)


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP {label}: expected 1 target, found {count}')
    return text.replace(old, new, 1)


def payment_section_hash(text: str) -> str:
    start = text.find('function PaymentPanel(')
    end = text.find('\nfunction MultiOrderPaymentPanel', start)
    if start < 0 or end < 0:
        raise SystemExit('STOP: PaymentPanel boundaries not found')
    return hashlib.sha256(text[start:end].encode('utf-8')).hexdigest()

payment_hash_before = payment_section_hash(overlays)

# ---------------------------------------------------------------------------
# 1) Physical table lifecycle hardening.
# A valid active visit with visible self/staff orders keeps the physical table
# occupied. An explicit Customer Left/FREE invalidates the R61 lease before this
# point, so an old guest page can never re-occupy a manually released table.
# Avoid rewriting operational_status_updated_at on every 3-second state poll.
# ---------------------------------------------------------------------------
if MARKER not in backend:
    old_mark = """        if (!$pk || $pkValue < 1) return;
        $updates = ['operational_status' => 'occupied'];
"""
    new_mark = """        if (!$pk || $pkValue < 1) return;
        $current = DB::table('tables')->where($pk, $pkValue)->first(['operational_status']);
        if ($current && strtolower(trim((string)($current->operational_status ?? ''))) === 'occupied') return;
        $updates = ['operational_status' => 'occupied'];
"""
    backend = once(backend, old_mark, new_mark, 'backend occupied idempotence')

    old_use = """    $pmdR60tOrderBelongsToGuest,
    $pmdR60tReleasePaidGuestOrder,
    $pmdR60tPayload"""
    new_use = """    $pmdR60tOrderBelongsToGuest,
    $pmdR60tReleasePaidGuestOrder,
    $pmdR60tMarkTableOccupied,
    $pmdR60tPayload"""
    backend = once(backend, old_use, new_use, 'backend state occupancy dependency')

    old_return = """    return response()->json([
        'success' => true,
        'selfOrders' => array_values($self),"""
    new_return = """    // PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE
    // Kitchen readiness/payment completion never releases the physical table.
    // Only the explicit staff visit-release boundary may make it available.
    if ($self || $shared) $pmdR60tMarkTableOccupied($context);

    return response()->json([
        'success' => true,
        'selfOrders' => array_values($self),"""
    backend = once(backend, old_return, new_return, 'backend state occupancy authority')

# ---------------------------------------------------------------------------
# 2) Paid invoice token resolver.
# One order may legitimately have multiple submitted history/pointer rows. The
# token already cryptographically identifies the correct session_key, so resolve
# the row by matching the existing HMAC instead of blindly picking newest row.
# Security formula and canonical invoice renderer remain unchanged.
# ---------------------------------------------------------------------------
if MARKER not in invoice:
    old_invoice = """        $submittedDraft = \\Illuminate\\Support\\Facades\\DB::table('pmd_table_order_drafts')
            ->where('status', 'submitted')
            ->where('order_id', $orderId)
            ->orderByDesc('id')
            ->first();
        $sessionKey = trim((string)($submittedDraft->session_key ?? ''));
        if (!$submittedDraft || $sessionKey === '') return response('Invoice session not found', 404);

        $expectedToken = hash_hmac(
            'sha256',
            $request->getHost().'|'.$orderId.'|'.$sessionKey,
            (string)config('app.key')
        );
        if (!hash_equals($expectedToken, $token)) return response('Invalid invoice token', 403);
"""
    new_invoice = """        // PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE
        // Multiple submitted pointers can exist for one canonical order (for
        // example a private QR invoice pointer plus older compatibility rows).
        // The existing HMAC token itself identifies the correct session key.
        $submittedDrafts = \\Illuminate\\Support\\Facades\\DB::table('pmd_table_order_drafts')
            ->where('status', 'submitted')
            ->where('order_id', $orderId)
            ->orderByDesc('id')
            ->limit(80)
            ->get();
        if ($submittedDrafts->isEmpty()) return response('Invoice session not found', 404);

        $submittedDraft = null;
        $sessionKey = '';
        foreach ($submittedDrafts as $candidate) {
            $candidateKey = trim((string)($candidate->session_key ?? ''));
            if ($candidateKey === '') continue;
            $candidateToken = hash_hmac(
                'sha256',
                $request->getHost().'|'.$orderId.'|'.$candidateKey,
                (string)config('app.key')
            );
            if (hash_equals($candidateToken, $token)) {
                $submittedDraft = $candidate;
                $sessionKey = $candidateKey;
                break;
            }
        }
        if (!$submittedDraft || $sessionKey === '') return response('Invalid invoice token', 403);
"""
    invoice = once(invoice, old_invoice, new_invoice, 'invoice token resolver')

# ---------------------------------------------------------------------------
# 3) Checkout semantics.
# Unpaid self order: direct PaymentPanel, no Table Orders selector.
# Paid self history: orders list with invoice actions; never the legacy unpaid
# selector/review confirmation branch. Staff shared bills keep legacy tabs/split.
# PaymentPanel implementation remains byte-for-byte unchanged.
# ---------------------------------------------------------------------------
if MARKER not in overlays:
    start = overlays.find('function CheckoutSheet() {')
    end = overlays.find('\nfunction Toast() {', start)
    if start < 0 or end < 0:
        raise SystemExit('STOP: CheckoutSheet boundaries not found')
    checkout = overlays[start:end]

    old_direct = """  const directSelfOrder = useMemo(() => {
    if (hasSharedStaffOrders) return null
    if (selectedOrder && String((selectedOrder as any)?.orderOrigin || '') === 'guest_self') return selectedOrder
    return tableOrders.find((order) =>
      String((order as any)?.orderOrigin || '') === 'guest_self' && order.totals.remainingAmount > 0
    ) || tableOrders.find((order) => String((order as any)?.orderOrigin || '') === 'guest_self') || null
  }, [hasSharedStaffOrders, selectedOrder, tableOrders])
"""
    new_direct = """  // PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE
  const selfOrders = useMemo(() => tableOrders.filter((order) =>
    String((order as any)?.orderOrigin || '') === 'guest_self'
  ), [tableOrders])
  const directSelfOrder = useMemo(() => {
    if (hasSharedStaffOrders) return null
    if (
      selectedOrder
      && String((selectedOrder as any)?.orderOrigin || '') === 'guest_self'
      && selectedOrder.totals.remainingAmount > 0
    ) return selectedOrder
    return selfOrders.find((order) => order.totals.remainingAmount > 0) || null
  }, [hasSharedStaffOrders, selectedOrder, selfOrders])
  const selfHistoryOnly = !hasSharedStaffOrders && !directSelfOrder && selfOrders.length > 0
"""
    checkout = once(checkout, old_direct, new_direct, 'checkout direct self definition')

    old_effect = """  useEffect(() => {
    if (directSelfOrder) setTab('payment')
  }, [directSelfOrder?.orderId])

  const title = directSelfOrder ? labels.payment : tab === 'orders' ? copy.tableOrders : tab === 'payment' ? labels.payment : labels.splitBill
"""
    new_effect = """  useEffect(() => {
    if (directSelfOrder) setTab('payment')
    else if (selfHistoryOnly) setTab('orders')
  }, [directSelfOrder?.orderId, selfHistoryOnly])

  const title = directSelfOrder
    ? labels.payment
    : selfHistoryOnly
      ? copy.tableOrders
      : tab === 'orders' ? copy.tableOrders : tab === 'payment' ? labels.payment : labels.splitBill
"""
    checkout = once(checkout, old_effect, new_effect, 'checkout paid history switch')

    checkout = once(
        checkout,
        "  const renderedOrder = directSelfOrder || selectedOrder\n",
        "  const renderedOrder = directSelfOrder || (selfHistoryOnly ? null : selectedOrder)\n",
        'checkout history subtitle',
    )

    old_tabs = """        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'orders' ? styles.tabActive : ''}`} type=\"button\" onClick={() => setTab('orders')}><Utensils /> {copy.tableOrders}</button>
          <button className={`${styles.tab} ${tab === 'payment' ? styles.tabActive : ''}`} type=\"button\" onClick={() => setTab('payment')}><CreditCard /> {labels.payment}</button>
          <button className={`${styles.tab} ${tab === 'split' ? styles.tabActive : ''}`} type=\"button\" onClick={() => setTab('split')}><Split /> {labels.splitBill}</button>
        </div>
"""
    new_tabs = """        {!directSelfOrder && (
          <div className={styles.tabs}>
            {selfHistoryOnly ? (
              <button className={`${styles.tab} ${styles.tabActive}`} type=\"button\" onClick={() => setTab('orders')}><Utensils /> {copy.tableOrders}</button>
            ) : (
              <>
                <button className={`${styles.tab} ${tab === 'orders' ? styles.tabActive : ''}`} type=\"button\" onClick={() => setTab('orders')}><Utensils /> {copy.tableOrders}</button>
                <button className={`${styles.tab} ${tab === 'payment' ? styles.tabActive : ''}`} type=\"button\" onClick={() => setTab('payment')}><CreditCard /> {labels.payment}</button>
                <button className={`${styles.tab} ${tab === 'split' ? styles.tabActive : ''}`} type=\"button\" onClick={() => setTab('split')}><Split /> {labels.splitBill}</button>
              </>
            )}
          </div>
        )}
"""
    checkout = once(checkout, old_tabs, new_tabs, 'checkout tabs')

    checkout = once(
        checkout,
        "        {!directSelfOrder && tab === 'orders' && (\n",
        "        {!directSelfOrder && (selfHistoryOnly || tab === 'orders') && (\n",
        'checkout history orders rendering',
    )
    checkout = once(
        checkout,
        "        {tab === 'payment' && (\n",
        "        {!selfHistoryOnly && tab === 'payment' && (\n",
        'checkout prevent paid selector flash',
    )
    checkout = once(
        checkout,
        "        {!directSelfOrder && tab === 'split' && (\n",
        "        {!selfHistoryOnly && !directSelfOrder && tab === 'split' && (\n",
        'checkout history split suppression',
    )

    overlays = overlays[:start] + checkout + overlays[end:]

# ---------------------------------------------------------------------------
# 4) Remove the old wrapper remount/tab-click workaround.
# Core CheckoutSheet now owns the scenario declaratively. Removing remount/click
# stops PaymentPanel flicker while retaining display-only R60T styling.
# ---------------------------------------------------------------------------
if MARKER not in wrapper:
    wrapper = once(
        wrapper,
        "import { useEffect, useRef } from 'react'",
        "import { useEffect } from 'react'",
        'wrapper hook import',
    )

    old_state = """  const autoOpenedPaymentFor = useRef<number | null>(null)
  const selected = runtime.selectedOrder as any
  const selectedSelfOrderId = runtime.overlay === 'checkout' && selected?.orderOrigin === 'guest_self'
    ? Number(selected?.orderId || 0)
    : 0
  // Checkout owns a local selectedPaymentOrderIds state that is initialized only
  // when it mounts. Remounting the base overlay exactly once when a self-order id
  // becomes authoritative ensures that state starts with the actual QR order.
  const overlayKey = selectedSelfOrderId > 0 ? `r60t-self-${selectedSelfOrderId}` : 'r60t-base'

"""
    wrapper = once(wrapper, old_state, "", 'wrapper remount state')

    old_tabs_logic = """    const tabBar = root.firstElementChild as HTMLElement | null
    const tabButtons = tabBar ? Array.from(tabBar.querySelectorAll<HTMLButtonElement>(':scope > button')) : []
    const paymentTab = tabButtons[1]
    const splitTab = tabButtons[2]

    if (splitTab) {
      splitTab.toggleAttribute('aria-hidden', isSelfOrder)
      splitTab.toggleAttribute('disabled', isSelfOrder)
    }

    if (
      isSelfOrder
      && Number(currentSelected?.orderId || 0) > 0
      && runtime.overlay === 'checkout'
      && autoOpenedPaymentFor.current !== Number(currentSelected.orderId)
      && paymentTab
    ) {
      autoOpenedPaymentFor.current = Number(currentSelected.orderId)
      paymentTab.click()
    }

    if (!isSelfOrder) autoOpenedPaymentFor.current = null
"""
    wrapper = once(wrapper, old_tabs_logic, "", 'wrapper click workaround')

    wrapper = once(
        wrapper,
        "  }, [overlayKey, runtime.locale, runtime.orderLoading, runtime.overlay, runtime.selectedOrder, runtime.tableOrders])",
        "  }, [runtime.locale, runtime.orderLoading, runtime.overlay, runtime.selectedOrder, runtime.tableOrders])",
        'wrapper effect dependencies',
    )

    old_tab_css = """        [data-pmd-ordering-flow=\"r60t\"][data-pmd-r60t-self-order=\"true\"] > :first-child {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.5rem;
        }
        [data-pmd-ordering-flow=\"r60t\"][data-pmd-r60t-self-order=\"true\"] > :first-child > button {
          min-height: 3rem;
          font-size: 0.82rem;
        }
        [data-pmd-ordering-flow=\"r60t\"][data-pmd-r60t-self-order=\"true\"] > :first-child > button:nth-child(3) {
          display: none;
        }
        [data-pmd-ordering-flow=\"r60t\"][data-pmd-r60t-has-staff-shared=\"false\"] > :first-child {
          display: none;
        }
"""
    wrapper = once(wrapper, old_tab_css, "", 'wrapper obsolete tab css')

    wrapper = once(
        wrapper,
        "      <BaseRuntimeOverlays key={overlayKey} />",
        "      <BaseRuntimeOverlays />",
        'wrapper overlay remount',
    )

    wrapper = wrapper.replace(
        "// React-owned child nodes are never rewritten here.\n",
        "// React-owned child nodes are never rewritten here.\n// PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE\n",
        1,
    )

payment_hash_after = payment_section_hash(overlays)
if payment_hash_before != payment_hash_after:
    raise SystemExit('STOP: PaymentPanel implementation changed unexpectedly')

BACKEND.write_text(backend, encoding='utf-8')
INVOICE.write_text(invoice, encoding='utf-8')
OVERLAYS.write_text(overlays, encoding='utf-8')
WRAPPER.write_text(wrapper, encoding='utf-8')

for php in (BACKEND, INVOICE):
    subprocess.run(['php', '-l', str(php)], check=True)

print('R64 FINAL FLOW PATCH APPLIED')
print('- direct unpaid self-order stays on PaymentPanel with no selector/remount blink')
print('- paid self-orders switch to Table Orders history with invoice buttons')
print('- invoice token resolves the matching submitted pointer instead of newest-only')
print('- active visit keeps physical table occupied until explicit staff release')
print('- R61 release still expires old device orders/actions after Customer Left/FREE')
print('- PaymentPanel implementation hash unchanged:', payment_hash_after)
print('Next: npm run verify, then restart Frontend V2 and reload PHP-FPM.')
