#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

APP = Path('/var/www/paymydine')
FE = APP / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815'
BACKEND = APP / 'app/main/routes/api-v1-guest-order-flow-r60t.php'
OVERLAYS = FE / 'src/runtime/components/RuntimeOverlays.tsx'
MARKER = 'PMD_R63_SINGLE_OPEN_SELF_ORDER'

for path in (BACKEND, OVERLAYS):
    if not path.is_file():
        raise SystemExit(f'STOP: missing {path}')

stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup = Path('/root') / f'paymydine-r63-self-order-{stamp}'
for path in (BACKEND, OVERLAYS):
    dest = backup / path.relative_to(APP)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)
print('Backup:', backup)

backend = BACKEND.read_text(encoding='utf-8')
overlays = OVERLAYS.read_text(encoding='utf-8')

if MARKER in backend and MARKER in overlays:
    print('R63 patch already present')
    raise SystemExit(0)


def payment_section_hash(text: str) -> str:
    start = text.find('function PaymentPanel(')
    end = text.find('\nfunction MultiOrderPaymentPanel', start)
    if start < 0 or end < 0:
        raise SystemExit('STOP: PaymentPanel boundaries not found')
    return hashlib.sha256(text[start:end].encode('utf-8')).hexdigest()

payment_hash_before = payment_section_hash(overlays)

# ---------------------------------------------------------------------------
# Backend: while a private QR self-order is still completely unpaid and held
# from kitchen, further cart confirmations append into the newest open order.
# Older unpaid self-orders from the same guest session are consolidated into
# that newest order if none of them has any active payment transaction.
# Paid/part-paid/released orders are never merged.
# ---------------------------------------------------------------------------
if MARKER not in backend:
    old_self_branch = """        if ($pmdR60tIsGuestSelfOrder($order)) {
            if (!$pmdR60tOrderBelongsToGuest($order, $guestSessionId)) continue;
"""
    new_self_branch = """        if ($pmdR60tIsGuestSelfOrder($order)) {
            // PMD_R63_SINGLE_OPEN_SELF_ORDER
            // A superseded unpaid fragment is retained only as an audit row.
            if (str_contains((string)($order->comment ?? ''), '[merged_into:')) continue;
            if (!$pmdR60tOrderBelongsToGuest($order, $guestSessionId)) continue;
"""
    if backend.count(old_self_branch) != 1:
        raise SystemExit(f'STOP backend self-state target: found {backend.count(old_self_branch)}')
    backend = backend.replace(old_self_branch, new_self_branch, 1)

    old_prepare = """    $confirmationMarker = '[guest_confirm:'.$confirmationId.']';
    $existing = DB::table('orders')
        ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
        ->where('orders.comment', 'like', '%'.$confirmationMarker.'%')
        ->where('orders.comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
        ->first(['orders.*', 'statuses.status_name']);
    if ($existing) return response()->json($pmdR60tPayload($existing, $context, 'guest_self', $guestSessionId));

"""
    new_prepare = r"""    $confirmationMarker = '[guest_confirm:'.$confirmationId.']';
    $existing = DB::table('orders')
        ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
        ->where('orders.comment', 'like', '%'.$confirmationMarker.'%')
        ->where('orders.comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
        ->first(['orders.*', 'statuses.status_name']);
    if ($existing) {
        if (preg_match('/\[merged_into:(\d+)\]/', (string)($existing->comment ?? ''), $mergedMatch)) {
            $mergedTarget = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', (int)$mergedMatch[1])
                ->first(['orders.*', 'statuses.status_name']);
            if ($mergedTarget) return response()->json($pmdR60tPayload($mergedTarget, $context, 'guest_self', $guestSessionId));
        }
        return response()->json($pmdR60tPayload($existing, $context, 'guest_self', $guestSessionId));
    }

    // PMD_R63_SINGLE_OPEN_SELF_ORDER
    // One private guest visit owns at most one completely-unpaid payment-held
    // order. Continue-ordering appends to it; a settled/released order starts a
    // new card on the next confirmation.
    $orderType = (string)(($context['table_id'] ?? '') ?: ($context['table_no'] ?? 'table'));

    $hasActivePayment = static function (int $orderId): bool {
        if ($orderId < 1) return false;
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')) return false;
            $columns = \Illuminate\Support\Facades\Schema::getColumnListing('order_payment_transactions');
            if (!in_array('order_id', $columns, true)) return false;
            $query = DB::table('order_payment_transactions')->where('order_id', $orderId);
            if (in_array('settlement_status', $columns, true)) {
                $query->whereNotIn('settlement_status', [
                    'failed', 'cancelled', 'canceled', 'refunded', 'refund', 'void', 'voided'
                ]);
            }
            return $query->exists();
        } catch (\Throwable $ignored) {
            return true;
        }
    };

    $recalculateOpenOrder = static function (int $orderId, ?string $comment = null): void {
        $menuRows = DB::table('order_menus')->where('order_id', $orderId)->get();
        $allItems = [];
        foreach ($menuRows as $row) {
            $quantity = max(1, (int)($row->quantity ?? 1));
            $price = (float)($row->price ?? 0);
            $allItems[] = [
                'menu_id' => (int)($row->menu_id ?? 0),
                'name' => (string)($row->name ?? 'Item'),
                'quantity' => $quantity,
                'price' => $price,
                'subtotal' => (float)($row->subtotal ?? ($price * $quantity)),
            ];
        }
        $resolved = pmd_table_order_calculate_totals($allItems);
        $updates = [
            'order_total' => round((float)$resolved['total'], 4),
            'total_items' => array_sum(array_map(static fn($i) => (int)($i['quantity'] ?? 1), $allItems)),
            'updated_at' => now(),
        ];
        if ($comment !== null) $updates['comment'] = $comment;
        DB::table('orders')->where('order_id', $orderId)->update($updates);
        DB::table('order_totals')->where('order_id', $orderId)->delete();
        $totalRows = array_map(static fn($row) => array_merge(['order_id' => $orderId], $row), $resolved['rows']);
        if ($totalRows) DB::table('order_totals')->insert($totalRows);
    };

    $openQuery = DB::table('orders')
        ->where('order_type', $orderType)
        ->where('comment', 'like', '%[pmd_origin:guest_self]%')
        ->where('comment', 'like', '%[payment_hold]%')
        ->where('comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
        ->where('processed', 0);
    if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settlement_status')) {
        $openQuery->whereNotIn('settlement_status', [
            'paid', 'settled', 'partial', 'part_paid', 'part-paid',
            'cancelled', 'canceled', 'failed', 'refunded', 'void', 'voided'
        ]);
    }
    if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settled_amount')) {
        $openQuery->where('settled_amount', '<=', 0.0001);
    }

    $openRows = $openQuery->orderByDesc('order_id')->limit(20)->get();
    $mergeable = [];
    foreach ($openRows as $row) {
        $candidateId = (int)($row->order_id ?? 0);
        if ($candidateId > 0 && !$hasActivePayment($candidateId)) $mergeable[] = $row;
    }

    // Cleanly fold fragments produced by the earlier R60T iterations into the
    // newest still-unpaid order. This is intentionally limited to zero-settled,
    // unprocessed orders with no payment transaction.
    if (count($mergeable) > 1) {
        $primaryId = (int)$mergeable[0]->order_id;
        $secondaryIds = array_values(array_filter(array_map(
            static fn($row) => (int)($row->order_id ?? 0),
            array_slice($mergeable, 1)
        ), static fn($id) => $id > 0));

        DB::transaction(function () use ($primaryId, $secondaryIds, $recalculateOpenOrder) {
            $locked = DB::table('orders')->whereIn('order_id', array_merge([$primaryId], $secondaryIds))
                ->orderByDesc('order_id')->lockForUpdate()->get()->keyBy('order_id');
            $primary = $locked->get($primaryId);
            if (!$primary || (int)($primary->processed ?? 0) !== 0) return;

            foreach ($secondaryIds as $secondaryId) {
                $secondary = $locked->get($secondaryId);
                if (!$secondary || (int)($secondary->processed ?? 0) !== 0) continue;
                $settled = max(0, (float)($secondary->settled_amount ?? 0));
                $settlement = strtolower(trim((string)($secondary->settlement_status ?? '')));
                if ($settled > 0.0001 || in_array($settlement, ['paid', 'settled', 'partial', 'part_paid', 'part-paid'], true)) continue;

                DB::table('order_menus')->where('order_id', $secondaryId)->update(['order_id' => $primaryId]);
                DB::table('order_totals')->where('order_id', $secondaryId)->delete();
                $secondaryComment = (string)($secondary->comment ?? '');
                if (!str_contains($secondaryComment, '[merged_into:')) {
                    $secondaryComment = trim($secondaryComment.' | [merged_into:'.$primaryId.']', ' |');
                }
                $secondaryUpdate = [
                    'order_total' => 0,
                    'total_items' => 0,
                    'comment' => $secondaryComment,
                    'updated_at' => now(),
                ];
                if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settlement_status')) {
                    $secondaryUpdate['settlement_status'] = 'cancelled';
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settled_amount')) {
                    $secondaryUpdate['settled_amount'] = 0;
                }
                DB::table('orders')->where('order_id', $secondaryId)->update($secondaryUpdate);
            }

            $recalculateOpenOrder($primaryId);
        });
    }

    $openOrder = DB::table('orders')
        ->where('order_type', $orderType)
        ->where('comment', 'like', '%[pmd_origin:guest_self]%')
        ->where('comment', 'like', '%[payment_hold]%')
        ->where('comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
        ->where('processed', 0)
        ->orderByDesc('order_id')
        ->first();

    if ($openOrder && !$hasActivePayment((int)$openOrder->order_id)) {
        $mergedOrderId = DB::transaction(function () use (
            $openOrder,
            $guestSessionId,
            $confirmationMarker,
            $items,
            $recalculateOpenOrder
        ) {
            $orderId = (int)$openOrder->order_id;
            $locked = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
            if (!$locked || (int)($locked->processed ?? 0) !== 0) return 0;
            $settled = max(0, (float)($locked->settled_amount ?? 0));
            $settlement = strtolower(trim((string)($locked->settlement_status ?? '')));
            if ($settled > 0.0001 || in_array($settlement, ['paid', 'settled', 'partial', 'part_paid', 'part-paid'], true)) return 0;

            foreach ($items as $item) {
                DB::table('order_menus')->insert([
                    'order_id' => $orderId,
                    'menu_id' => (int)($item['menu_id'] ?? 0),
                    'name' => (string)($item['name'] ?? 'Item'),
                    'quantity' => max(1, (int)($item['quantity'] ?? 1)),
                    'price' => (float)($item['price'] ?? 0),
                    'subtotal' => (float)($item['subtotal'] ?? 0),
                    'comment' => trim(((string)($item['note'] ?? '') !== '' ? (string)$item['note'].' | ' : '').'[guest_session:'.$guestSessionId.']', ' |'),
                    'option_values' => !empty($item['options']) ? json_encode($item['options'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) : null,
                ]);
            }

            $comment = (string)($locked->comment ?? '');
            if (!str_contains($comment, $confirmationMarker)) {
                $comment = trim($comment.' | '.$confirmationMarker, ' |');
            }
            $recalculateOpenOrder($orderId, $comment);
            return $orderId;
        });

        if ($mergedOrderId > 0) {
            $mergedOrder = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $mergedOrderId)
                ->first(['orders.*', 'statuses.status_name']);
            return response()->json($pmdR60tPayload($mergedOrder, $context, 'guest_self', $guestSessionId));
        }
    }

"""
    if backend.count(old_prepare) != 1:
        raise SystemExit(f'STOP backend prepare target: found {backend.count(old_prepare)}')
    backend = backend.replace(old_prepare, new_prepare, 1)

# ---------------------------------------------------------------------------
# Checkout presentation: private self-only flow bypasses the legacy multi-order
# selection state entirely. Staff/shared mode keeps the existing CheckoutSheet.
# PaymentPanel itself is intentionally not modified.
# ---------------------------------------------------------------------------
if MARKER not in overlays:
    start = overlays.find('function CheckoutSheet() {')
    end = overlays.find('\nfunction Toast() {', start)
    if start < 0 or end < 0:
        raise SystemExit('STOP: CheckoutSheet boundaries not found')

    checkout = r'''function CheckoutSheet() {
  const {
    labels, currentDraft, tableOrders, selectedOrder, selectedOrderId, selectOrder, guestSessionId,
    cart, cartSubtotal, formatCurrency, confirmPersonalItems, submitTableOrder, continueOrdering,
    orderLoading, refreshOrder, bootstrap, tableDisplay, locale,
  } = useMenuRuntime()
  const copy = r27FlowCopy(locale)
  const multiCopy = r32MultiOrderCopy(locale)
  const directCopy = r33DirectOrderCopy(locale)

  // PMD_R63_SINGLE_OPEN_SELF_ORDER
  // Self-only QR checkout is not a table-bill selector. It owns one canonical
  // private order directly. The legacy table/multi-order UI remains available
  // only when a real Staff/Cashier/Waiter shared bill exists.
  const hasSharedStaffOrders = useMemo(() => tableOrders.some((order) =>
    String((order as any)?.orderOrigin || '') === 'staff_shared'
  ), [tableOrders])
  const directSelfOrder = useMemo(() => {
    if (hasSharedStaffOrders) return null
    if (selectedOrder && String((selectedOrder as any)?.orderOrigin || '') === 'guest_self') return selectedOrder
    return tableOrders.find((order) =>
      String((order as any)?.orderOrigin || '') === 'guest_self' && order.totals.remainingAmount > 0
    ) || tableOrders.find((order) => String((order as any)?.orderOrigin || '') === 'guest_self') || null
  }, [hasSharedStaffOrders, selectedOrder, tableOrders])

  const [tab, setTab] = useState<'orders' | 'payment' | 'split'>(() => directSelfOrder ? 'payment' : 'orders')
  const [selectedPaymentOrderIds, setSelectedPaymentOrderIds] = useState<number[]>(() =>
    selectedOrder?.orderId && selectedOrder.totals.remainingAmount > 0 ? [selectedOrder.orderId] : [],
  )
  const selectedPaymentOrders = useMemo(() => tableOrders.filter((order) =>
    Boolean(order.orderId) && order.totals.remainingAmount > 0 && selectedPaymentOrderIds.includes(order.orderId!),
  ), [selectedPaymentOrderIds, tableOrders])
  const selectedPaymentTotal = selectedPaymentOrders.reduce((sum, order) => sum + Math.max(0, order.totals.remainingAmount), 0)
  const orderingGuestIds = useMemo(() => Array.from(new Set([
    ...tableOrders.flatMap((order) => order.items.map((item) => item.guestSessionId || '').filter(Boolean)),
    ...(currentDraft?.items || []).map((item) => item.guestSessionId || '').filter(Boolean),
  ])), [currentDraft, tableOrders])
  const orderingGuestCount = orderingGuestIds.length
  const myOpenOrder = useMemo(() => tableOrders.find((order) =>
    Boolean(order.orderId)
    && order.totals.remainingAmount > 0
    && order.items.some((item) => item.guestSessionId === guestSessionId && item.unpaidQuantity > 0),
  ) || null, [guestSessionId, tableOrders])

  useEffect(() => {
    if (directSelfOrder) setTab('payment')
  }, [directSelfOrder?.orderId])

  const title = directSelfOrder ? labels.payment : tab === 'orders' ? copy.tableOrders : tab === 'payment' ? labels.payment : labels.splitBill
  const canPaySelected = Boolean(selectedOrder?.orderId && selectedOrder.totals.remainingAmount > 0)

  const chooseForPayment = (order: TableOrderState, target: 'payment' | 'split' = 'payment') => {
    if (!order.orderId) return
    selectOrder(order.orderId)
    if (target === 'payment' && order.totals.remainingAmount > 0) setSelectedPaymentOrderIds([order.orderId])
    setTab(target)
  }

  const togglePaymentOrder = (order: TableOrderState) => {
    if (!order.orderId) return
    if (order.totals.remainingAmount <= 0) {
      setSelectedPaymentOrderIds([])
      selectOrder(order.orderId)
      return
    }
    if (!selectedPaymentOrderIds.includes(order.orderId)) {
      setSelectedPaymentOrderIds([...selectedPaymentOrderIds, order.orderId])
      selectOrder(order.orderId)
      return
    }
    if (selectedPaymentOrderIds.length <= 1) return
    const next = selectedPaymentOrderIds.filter((id) => id !== order.orderId)
    setSelectedPaymentOrderIds(next)
    selectOrder(next[next.length - 1] || null)
  }

  const renderedOrder = directSelfOrder || selectedOrder

  return (
    <PanelShell title={title} subtitle={renderedOrder?.orderNumber ? `#${renderedOrder.orderNumber}` : (tableDisplay || labels.tableOrder)}>
      <div className={styles.stack} data-pmd-table-round-flow="r27">
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'orders' ? styles.tabActive : ''}`} type="button" onClick={() => setTab('orders')}><Utensils /> {copy.tableOrders}</button>
          <button className={`${styles.tab} ${tab === 'payment' ? styles.tabActive : ''}`} type="button" onClick={() => setTab('payment')}><CreditCard /> {labels.payment}</button>
          <button className={`${styles.tab} ${tab === 'split' ? styles.tabActive : ''}`} type="button" onClick={() => setTab('split')}><Split /> {labels.splitBill}</button>
        </div>

        {!directSelfOrder && tab === 'orders' && (
          <>
            {cart.length > 0 && (
              <div className={styles.orderCard}>
                <div className={styles.summaryRow}><h3>{labels.cart}</h3><strong>{formatCurrency(cartSubtotal)}</strong></div>
                <button className={styles.primary} type="button" onClick={() => void confirmPersonalItems()} disabled={orderLoading} data-pmd-direct-kitchen-send="r33b"><Send aria-hidden="true" /> {orderLoading ? directCopy.sending : directCopy.sendOrder}</button>
              </div>
            )}

            {currentDraft && (
              <section className={styles.orderCard} data-pmd-shared-draft={currentDraft.draftId || ''} data-pmd-direct-send-recovery="r33b">
                <div className={styles.orderHeading}>
                  <div><h3>{directCopy.pendingTitle}</h3><small>{directCopy.pendingHint}</small></div>
                  <button className={styles.close} type="button" onClick={() => void refreshOrder()} aria-label="Refresh"><RefreshCw /></button>
                </div>
                {currentDraft.groups.map((group, groupIndex) => (
                  <div className={styles.guestGroup} key={group.guestSessionId || `group-${groupIndex}`}>
                    <strong>{group.guestSessionId && group.guestSessionId === guestSessionId ? copy.myItems : `${labels.tableOrder} ${groupIndex + 1}`}</strong>
                    {group.items.map((item, index) => <div className={styles.orderLine} key={`${item.menuId}-${index}`}><span>{item.quantity} × {item.name}{item.note ? <small className={styles.orderItemNote}><Receipt aria-hidden="true" />{item.note}</small> : null}</span><strong>{formatCurrency(item.subtotal)}</strong></div>)}
                  </div>
                ))}
                <div className={styles.summary}><div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(currentDraft.totals.orderTotal)}</strong></div></div>
                <div className={styles.invoiceActions}>
                  <button className={styles.secondary} type="button" onClick={continueOrdering}>{labels.continueMenu}</button>
                  <button className={styles.primary} type="button" onClick={() => void submitTableOrder()} disabled={orderLoading || !currentDraft.items.length}>
                    {orderLoading ? <LoaderCircle /> : <Send />} {orderLoading ? directCopy.sending : directCopy.finishSend}
                  </button>
                </div>
              </section>
            )}

            {!currentDraft && <button className={styles.secondary} type="button" onClick={continueOrdering}>{labels.continueMenu}</button>}

            {orderingGuestCount > 1 && tableOrders.some((order) => order.totals.remainingAmount > 0) && (
              <section className={styles.orderCard} data-pmd-multi-guest-payment-hint="r33b">
                <div className={styles.orderHeading}>
                  <div><h3>{directCopy.multiGuestTitle}</h3><small>{directCopy.multiGuestHint}</small></div>
                  <Users aria-hidden="true" />
                </div>
                <div className={styles.invoiceActions}>
                  {myOpenOrder?.orderId ? (
                    <button className={styles.secondary} type="button" onClick={() => { selectOrder(myOpenOrder.orderId); setTab('split') }}>
                      <Users aria-hidden="true" /> {directCopy.payMine}
                    </button>
                  ) : null}
                  <button className={styles.primary} type="button" onClick={() => setTab('payment')}>
                    <CreditCard aria-hidden="true" /> {directCopy.payTable}
                  </button>
                </div>
              </section>
            )}

            <div className={styles.sectionHead}>
              <strong>{copy.submittedOrders}</strong>
              <button className={styles.close} type="button" onClick={() => void refreshOrder()} aria-label="Refresh"><RefreshCw /></button>
            </div>
            {!tableOrders.length ? <div className={styles.emptyCompact}>{copy.noSubmittedOrders}</div> : (
              <div className={styles.invoiceList}>
                {tableOrders.map((order) => (
                  <SubmittedOrderCard
                    key={order.orderId || order.orderNumber || order.updatedAt || 'order'}
                    order={order}
                    selected={selectedOrderId === order.orderId}
                    onSelect={() => { selectOrder(order.orderId); }}
                    onPay={() => chooseForPayment(order, 'payment')}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'payment' && (
          directSelfOrder ? (
            <>
              <OrderTimeline order={directSelfOrder} />
              {directSelfOrder.totals.remainingAmount > 0 ? (
                <PaymentPanel key={`${directSelfOrder.orderId}-direct-self-payment`} order={directSelfOrder} mode="payment" guestSessionId={guestSessionId} />
              ) : (
                <>
                  <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>
                    #{directSelfOrder.orderNumber || directSelfOrder.orderId} · {copy.paymentComplete} · {operationalStatusLabel(directSelfOrder, labels, copy)}
                  </div>
                  <InvoiceDownloadButton order={directSelfOrder} />
                  <PaidOrderReviewCard key={directSelfOrder.orderId || directSelfOrder.orderNumber || 'paid-self-order'} order={directSelfOrder} />
                </>
              )}
            </>
          ) : (
            <>
              {tableOrders.length > 1 && (
                <>
                  <div className={styles.invoicePicker} data-pmd-multi-order-picker="r32" aria-label={multiCopy.selectOrders}>
                    {tableOrders.map((order) => {
                      const payable = Boolean(order.orderId && order.totals.remainingAmount > 0)
                      const active = payable
                        ? selectedPaymentOrderIds.includes(order.orderId!)
                        : selectedPaymentOrderIds.length === 0 && selectedOrderId === order.orderId
                      return (
                        <button
                          key={order.orderId || order.orderNumber || 'order'}
                          type="button"
                          className={active ? styles.selected : ''}
                          aria-pressed={active}
                          onClick={() => togglePaymentOrder(order)}
                        >
                          #{order.orderNumber || order.orderId} · {formatCurrency(order.totals.remainingAmount)}
                        </button>
                      )
                    })}
                  </div>
                  {selectedPaymentOrders.length > 0 && (
                    <div className={styles.multiOrderSelectionSummary} data-pmd-multi-order-selection="r32">
                      <span>{selectedPaymentOrders.length} {multiCopy.ordersSelected}</span>
                      <strong>{multiCopy.combined}: {formatCurrency(selectedPaymentTotal)}</strong>
                    </div>
                  )}
                </>
              )}

              {selectedPaymentOrders.length > 1 ? (
                <MultiOrderPaymentPanel orders={selectedPaymentOrders} guestSessionId={guestSessionId} />
              ) : selectedPaymentOrders.length === 1 ? (
                <>
                  <OrderTimeline order={selectedPaymentOrders[0]} />
                  <PaymentPanel key={`${selectedPaymentOrders[0].orderId}-payment`} order={selectedPaymentOrders[0]} mode="payment" guestSessionId={guestSessionId} />
                </>
              ) : !selectedOrder ? (
                <div className={styles.empty}>{multiCopy.selectOrders}</div>
              ) : selectedOrder.totals.remainingAmount > 0 ? (
                <div className={styles.empty}>{multiCopy.selectOrders}</div>
              ) : (
                <>
                  <OrderTimeline order={selectedOrder} />
                  <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>
                    #{selectedOrder.orderNumber || selectedOrder.orderId} · {copy.paymentComplete} · {operationalStatusLabel(selectedOrder, labels, copy)}
                  </div>
                  <InvoiceDownloadButton order={selectedOrder} />
                  <PaidOrderReviewCard key={selectedOrder.orderId || selectedOrder.orderNumber || 'paid-order'} order={selectedOrder} />
                </>
              )}
            </>
          )
        )}

        {!directSelfOrder && tab === 'split' && (
          <>
            {tableOrders.length > 1 && (
              <div className={styles.invoicePicker}>
                {tableOrders.map((order) => (
                  <button key={order.orderId || order.orderNumber || 'order'} type="button" className={selectedOrderId === order.orderId ? styles.selected : ''} onClick={() => selectOrder(order.orderId)}>
                    #{order.orderNumber || order.orderId} · {formatCurrency(order.totals.remainingAmount)}
                  </button>
                ))}
              </div>
            )}
            {!selectedOrder ? (
              <div className={styles.empty}>{copy.selectOrderToPay}</div>
            ) : !canPaySelected ? (
              <>
                <OrderTimeline order={selectedOrder} />
                <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>
                  #{selectedOrder.orderNumber || selectedOrder.orderId} · {copy.paymentComplete} · {operationalStatusLabel(selectedOrder, labels, copy)}
                </div>
                <InvoiceDownloadButton order={selectedOrder} />
                <PaidOrderReviewCard key={selectedOrder.orderId || selectedOrder.orderNumber || 'paid-order'} order={selectedOrder} />
              </>
            ) : (
              <>
                <OrderTimeline order={selectedOrder} />
                <PaymentPanel key={`${selectedOrder.orderId}-split`} order={selectedOrder} mode="split" guestSessionId={guestSessionId} />
              </>
            )}
          </>
        )}
      </div>
    </PanelShell>
  )
}
'''

    overlays = overlays[:start] + checkout + overlays[end:]

payment_hash_after = payment_section_hash(overlays)
if payment_hash_after != payment_hash_before:
    raise SystemExit('STOP: PaymentPanel implementation changed unexpectedly')

if MARKER not in backend or MARKER not in overlays:
    raise SystemExit('STOP: R63 marker missing after transformation')

BACKEND.write_text(backend, encoding='utf-8')
OVERLAYS.write_text(overlays, encoding='utf-8')

# PHP must pass immediately. Restore both files if it does not.
result = subprocess.run(['php', '-l', str(BACKEND)], text=True, capture_output=True)
print((result.stdout or result.stderr).strip())
if result.returncode != 0:
    shutil.copy2(backup / BACKEND.relative_to(APP), BACKEND)
    shutil.copy2(backup / OVERLAYS.relative_to(APP), OVERLAYS)
    raise SystemExit('STOP: PHP lint failed; both files restored')

print('R63 SELF-ORDER FLOW PATCH APPLIED')
print('- one completely-unpaid self-order per guest visit')
print('- continue-ordering appends into the same open order')
print('- paid orders remain separate history cards')
print('- self-only checkout bypasses Table Orders/multi-order selection')
print('- paid self-order renders status/invoice instead of unpaid selector')
print('- PaymentPanel implementation hash unchanged:', payment_hash_after)
print('Next: run npm run verify before restarting Frontend V2.')
