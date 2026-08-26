#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import shutil
import subprocess

APP = Path('/var/www/paymydine')
FE = APP / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815'
FILES = {
    'backend': APP / 'app/main/routes/api-v1-guest-order-flow-r60t.php',
    'actions': APP / 'app/main/routes/api-v1-guest-actions.php',
    'client': FE / 'src/lib/guest-order-flow-r60t.ts',
    'runtime': FE / 'src/runtime/SmartMenuRuntimeContext.tsx',
}
MARKER = 'PMD_R61_TABLE_VISIT_LEASE'
CUTOVER_TS = int(datetime.now(timezone.utc).timestamp())

for name, path in FILES.items():
    if not path.is_file():
        raise SystemExit(f'STOP: missing {name}: {path}')

backup = Path('/root') / f'paymydine-r61-visit-lease-{datetime.now().strftime("%Y%m%d_%H%M%S")}'
backup.mkdir(parents=True, exist_ok=True)
for path in FILES.values():
    dest = backup / path.relative_to(APP)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)
print(f'Backup: {backup}')

texts = {name: path.read_text(encoding='utf-8') for name, path in FILES.items()}


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP {label}: expected 1 target, found {count}')
    return text.replace(old, new, 1)


def after(text, anchor, old, new, label):
    start = text.find(anchor)
    if start < 0:
        raise SystemExit(f'STOP {label}: anchor missing')
    pos = text.find(old, start)
    if pos < 0:
        raise SystemExit(f'STOP {label}: target missing after anchor')
    return text[:pos] + new + text[pos + len(old):]

# ---------------------------------------------------------------------------
# Backend R60T: consume a real QR scan into an HttpOnly per-table visit lease.
# The durable release authority is the existing pmd_table_status_history row
# written by Customer Left / manual FREE. No payment/provider code is involved.
# ---------------------------------------------------------------------------
text = texts['backend']
if MARKER not in text:
    anchor = "Route::get('/guest-orders/state'"
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit('STOP backend: guest-orders/state anchor missing')

    helpers = rf'''
// PMD_R61_TABLE_VISIT_LEASE
// A printed QR scan activates one physical table visit. Existing table-release
// history is the lifecycle authority; payment state remains completely separate.
$pmdR61CutoverTs = {CUTOVER_TS};

$pmdR61ActualTableId = static function (array $context): int {{
    $table = $context['table'] ?? null;
    return max(0, (int)($table->table_id ?? $table->id ?? 0));
}};

$pmdR61LatestReleaseTs = static function (int $tableId): int {{
    if ($tableId < 1) return 0;
    try {{
        if (\Illuminate\Support\Facades\Schema::hasTable('pmd_table_status_history')) {{
            $columns = \Illuminate\Support\Facades\Schema::getColumnListing('pmd_table_status_history');
            if (in_array('table_id', $columns, true)) {{
                $timeColumn = in_array('created_at', $columns, true)
                    ? 'created_at'
                    : (in_array('updated_at', $columns, true) ? 'updated_at' : null);
                if ($timeColumn) {{
                    $query = DB::table('pmd_table_status_history')->where('table_id', $tableId);
                    $query->where(function ($q) use ($columns) {{
                        $added = false;
                        if (in_array('reason', $columns, true)) {{
                            $q->whereIn('reason', [
                                'customer_left',
                                'customer_left_skip_cleaning',
                                'cashier_manual_free',
                                'cleaning_complete',
                            ]);
                            $added = true;
                        }}
                        if (in_array('new_status', $columns, true)) {{
                            if ($added) $q->orWhereIn('new_status', ['cleaning', 'available']);
                            else $q->whereIn('new_status', ['cleaning', 'available']);
                            $added = true;
                        }}
                        if (!$added) $q->whereRaw('1 = 0');
                    }});
                    $value = $query->orderByDesc($timeColumn)->value($timeColumn);
                    $ts = $value ? (strtotime((string)$value) ?: 0) : 0;
                    if ($ts > 0) return $ts;
                }}
            }}
        }}
    }} catch (\Throwable $ignored) {{
    }}
    return 0;
}};

$pmdR61LeaseCookieName = static fn (int $tableId): string => 'pmd_r61_visit_'.$tableId;
$pmdR61LeaseCacheKey = static function (int $tableId, string $token): string {{
    return \App\Helpers\TenantHelper::scopedCacheKey(
        'pmd:r61:visit:'.$tableId.':'.hash('sha256', $token)
    );
}};

$pmdR61ReadLease = static function (int $tableId) use ($pmdR61LeaseCookieName, $pmdR61LeaseCacheKey) {{
    if ($tableId < 1) return null;
    $token = trim((string)request()->cookie($pmdR61LeaseCookieName($tableId), ''));
    if ($token === '') return null;
    try {{
        $lease = \Illuminate\Support\Facades\Cache::get($pmdR61LeaseCacheKey($tableId, $token));
        return is_array($lease) ? $lease : null;
    }} catch (\Throwable $ignored) {{
        return null;
    }}
}};

$pmdR61LeaseValid = static function (array $context, string $guestSessionId = '') use (
    $pmdR61ActualTableId,
    $pmdR61LatestReleaseTs,
    $pmdR61ReadLease,
    $pmdR61CutoverTs
): bool {{
    $tableId = $pmdR61ActualTableId($context);
    if ($tableId < 1) return false;
    $latestRelease = $pmdR61LatestReleaseTs($tableId);
    $lease = $pmdR61ReadLease($tableId);

    if (!$lease) {{
        // Rollout compatibility: pages already open before R61 keep working until
        // the first explicit Customer Left / FREE that happens after this deploy.
        return $latestRelease <= $pmdR61CutoverTs;
    }}

    $activatedAt = (int)($lease['activated_at'] ?? 0);
    if ($activatedAt < 1 || $latestRelease > $activatedAt) return false;
    if ($guestSessionId !== '' && !hash_equals($guestSessionId, (string)($lease['guest_session_id'] ?? ''))) return false;
    return true;
}};

$pmdR61ExpiredState = static function () {{
    // HTTP 200 intentionally clears orders even in a tab still running the older
    // R60T bundle. The new bundle additionally reads sessionExpired and locks UI.
    return response()->json([
        'success' => true,
        'sessionExpired' => true,
        'code' => 'TABLE_SESSION_EXPIRED',
        'selfOrders' => [],
        'sharedStaffOrders' => [],
        'orders' => [],
        'updatedAt' => now()->toIso8601String(),
    ]);
}};

$pmdR61ExpiredAction = static function () {{
    return response()->json([
        'success' => false,
        'ok' => false,
        'code' => 'TABLE_SESSION_EXPIRED',
        'error' => 'This table visit has ended. Scan the table QR again to continue.',
    ], 410);
}};

$pmdR61GuestActionLeaseValid = static function ($tableRef) use (
    $pmdR61LatestReleaseTs,
    $pmdR61ReadLease,
    $pmdR61CutoverTs
): bool {{
    $ref = trim((string)$tableRef);
    if ($ref === '') return false;
    try {{
        $table = DB::table('tables')->where('table_id', $ref)->first();
        if (!$table && \Illuminate\Support\Facades\Schema::hasColumn('tables', 'table_no')) {{
            $table = DB::table('tables')->where('table_no', $ref)->first();
        }}
    }} catch (\Throwable $ignored) {{
        return false;
    }}
    $tableId = max(0, (int)($table->table_id ?? $table->id ?? 0));
    if ($tableId < 1) return false;
    $latestRelease = $pmdR61LatestReleaseTs($tableId);
    $lease = $pmdR61ReadLease($tableId);
    if (!$lease) return $latestRelease <= $pmdR61CutoverTs;
    return (int)($lease['activated_at'] ?? 0) >= $latestRelease;
}};

Route::post('/guest-orders/activate', function (\Illuminate\Http\Request $request) use (
    $resolveTableDraftContext,
    $pmdR61ActualTableId,
    $pmdR61LatestReleaseTs,
    $pmdR61ReadLease,
    $pmdR61LeaseCookieName,
    $pmdR61LeaseCacheKey,
    $pmdR61CutoverTs
) {{
    $request->validate([
        'guest_session_id' => 'required|string|max:191',
        'qr' => 'required|string|max:255',
    ]);
    $context = $resolveTableDraftContext($request);
    if (!$context['table']) return response()->json(['success' => false, 'error' => 'A valid table is required'], 422);

    $tableId = $pmdR61ActualTableId($context);
    if ($tableId < 1) return response()->json(['success' => false, 'error' => 'A valid physical table is required'], 422);

    $providedQr = trim((string)$request->input('qr', ''));
    $storedQr = trim((string)($context['table']->qr_code ?? ''));
    if ($providedQr === '' || $storedQr === '' || !hash_equals($storedQr, $providedQr)) {{
        return response()->json(['success' => false, 'code' => 'INVALID_TABLE_QR', 'error' => 'Invalid table QR'], 403);
    }}

    $guestSessionId = trim((string)$request->input('guest_session_id'));
    $latestRelease = $pmdR61LatestReleaseTs($tableId);
    $currentLease = $pmdR61ReadLease($tableId);
    $currentLeaseValid = is_array($currentLease)
        && (int)($currentLease['activated_at'] ?? 0) >= $latestRelease
        && hash_equals($guestSessionId, (string)($currentLease['guest_session_id'] ?? ''));

    if (!$currentLeaseValid && $latestRelease > $pmdR61CutoverTs) {{
        $oldIdentity = DB::table('orders')
            ->where('comment', 'like', '%[pmd_origin:guest_self]%')
            ->where('comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
            ->exists();
        if ($oldIdentity) {{
            return response()->json([
                'success' => false,
                'code' => 'SESSION_ROTATION_REQUIRED',
                'error' => 'Start a new guest identity for this table visit.',
            ], 409);
        }}
    }}

    $token = bin2hex(random_bytes(32));
    \Illuminate\Support\Facades\Cache::put(
        $pmdR61LeaseCacheKey($tableId, $token),
        [
            'table_id' => $tableId,
            'guest_session_id' => $guestSessionId,
            'activated_at' => time(),
        ],
        now()->addHours(12)
    );

    return response()->json([
        'success' => true,
        'tableId' => $tableId,
        'guestSessionId' => $guestSessionId,
    ])->cookie(
        $pmdR61LeaseCookieName($tableId),
        $token,
        720,
        '/',
        null,
        request()->isSecure(),
        true,
        false,
        'Lax'
    );
}});

'''
    text = text[:idx] + helpers + text[idx:]

    text = after(
        text,
        "Route::get('/guest-orders/state'",
        "    $pmdR60tPayload\n) {",
        "    $pmdR60tPayload,\n    $pmdR61LeaseValid,\n    $pmdR61ExpiredState\n) {",
        'backend state dependencies',
    )
    text = after(
        text,
        "Route::get('/guest-orders/state'",
        "    if ($guestSessionId === '') return response()->json(['success' => false, 'error' => 'guest_session_id is required'], 422);\n",
        "    if ($guestSessionId === '') return response()->json(['success' => false, 'error' => 'guest_session_id is required'], 422);\n    if (!$pmdR61LeaseValid($context, $guestSessionId)) return $pmdR61ExpiredState();\n",
        'backend state lease guard',
    )
    text = after(
        text,
        "Route::post('/guest-orders/prepare'",
        "    $pmdR60tPayload\n) {",
        "    $pmdR60tPayload,\n    $pmdR61LeaseValid,\n    $pmdR61ExpiredAction\n) {",
        'backend prepare dependencies',
    )
    text = after(
        text,
        "Route::post('/guest-orders/prepare'",
        "    $guestSessionId = trim((string)$request->input('guest_session_id'));\n",
        "    $guestSessionId = trim((string)$request->input('guest_session_id'));\n    if (!$pmdR61LeaseValid($context, $guestSessionId)) return $pmdR61ExpiredAction();\n",
        'backend prepare lease guard',
    )
texts['backend'] = text

# ---------------------------------------------------------------------------
# Existing guest services reuse the R61 helpers because api-health-media loads
# R60T immediately before api-v1-guest-actions.php in the same route scope.
# ---------------------------------------------------------------------------
text = texts['actions']
if MARKER not in text:
    text = once(
        text,
        "Route::post('/valet-request', function (\\Illuminate\\Http\\Request $request) {",
        "Route::post('/valet-request', function (\\Illuminate\\Http\\Request $request) use ($pmdR61GuestActionLeaseValid, $pmdR61ExpiredAction) {",
        'valet closure',
    )
    text = after(
        text,
        "Route::post('/valet-request'",
        "                    // Get table info from database to get correct table_name\n",
        "                    if (!$pmdR61GuestActionLeaseValid($data['table_id'])) return $pmdR61ExpiredAction();\n\n                    // Get table info from database to get correct table_name\n",
        'valet guard',
    )

    text = once(
        text,
        "Route::post('/waiter-call', function (\\Illuminate\\Http\\Request $request) {",
        "Route::post('/waiter-call', function (\\Illuminate\\Http\\Request $request) use ($pmdR61GuestActionLeaseValid, $pmdR61ExpiredAction) {",
        'waiter closure',
    )
    text = after(
        text,
        "Route::post('/waiter-call'",
        "                    // Get table info from database to get correct table_name\n",
        "                    if (!$pmdR61GuestActionLeaseValid($table)) return $pmdR61ExpiredAction();\n\n                    // Get table info from database to get correct table_name\n",
        'waiter guard',
    )

    text = once(
        text,
        "Route::post('/table-notes', function (\\Illuminate\\Http\\Request $request) {",
        "Route::post('/table-notes', function (\\Illuminate\\Http\\Request $request) use ($pmdR61GuestActionLeaseValid, $pmdR61ExpiredAction) {",
        'note closure',
    )
    text = after(
        text,
        "Route::post('/table-notes'",
        "                    $id = DB::table('notifications')->insertGetId([\n",
        "                    if (!$pmdR61GuestActionLeaseValid($table)) return $pmdR61ExpiredAction();\n\n                    $id = DB::table('notifications')->insertGetId([\n",
        'note guard',
    )
    text = text.replace('<?php\n', '<?php\n\n// PMD_R61_TABLE_VISIT_LEASE\n', 1)
texts['actions'] = text

# ---------------------------------------------------------------------------
# Small R60T client adapter: activation + typed expiry. Payment client untouched.
# ---------------------------------------------------------------------------
text = texts['client']
if MARKER not in text:
    state_type = """export type GuestOrdersState = {
  success: boolean
  selfOrders: GuestOrderState[]
  sharedStaffOrders: GuestOrderState[]
  orders: GuestOrderState[]
  updatedAt: string | null
}
"""
    extra = """
// PMD_R61_TABLE_VISIT_LEASE
export class GuestTableSessionError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'GuestTableSessionError'
    this.code = code
    this.status = status
  }
}
"""
    text = once(text, state_type, state_type + extra, 'client error class')

    old_request = """  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) throw new Error(String(data?.error || data?.message || `HTTP ${response.status}`))
  return data as T
"""
    new_request = """  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    const code = String(data?.code || '')
    const message = String(data?.error || data?.message || `HTTP ${response.status}`)
    if (response.status === 409 || response.status === 410 || code === 'TABLE_SESSION_EXPIRED' || code === 'SESSION_ROTATION_REQUIRED') {
      throw new GuestTableSessionError(message, code || `HTTP_${response.status}`, response.status)
    }
    throw new Error(message)
  }
  return data as T
"""
    text = once(text, old_request, new_request, 'client request errors')

    activate = """
export async function activateGuestTableSession(table: TableContext, guestSessionId: string, scanQr: string): Promise<void> {
  await request('/api/v1/guest-orders/activate', {
    method: 'POST',
    body: JSON.stringify({
      ...Object.fromEntries(paramsForTable(table)),
      guest_session_id: guestSessionId,
      qr: scanQr,
    }),
  })
}

"""
    text = once(
        text,
        "export async function fetchGuestOrdersState(table: TableContext, guestSessionId: string): Promise<GuestOrdersState> {",
        activate + "export async function fetchGuestOrdersState(table: TableContext, guestSessionId: string): Promise<GuestOrdersState> {",
        'client activation function',
    )
    text = once(
        text,
        "  const payload = await request<any>(`/api/v1/guest-orders/state?${params.toString()}`)\n",
        "  const payload = await request<any>(`/api/v1/guest-orders/state?${params.toString()}`)\n  if (payload?.sessionExpired) throw new GuestTableSessionError('This table visit has ended. Scan the table QR again.', 'TABLE_SESSION_EXPIRED', 410)\n",
        'client expired state',
    )
texts['client'] = text

# ---------------------------------------------------------------------------
# Smart R60T runtime: consume ?qr once, rotate identity after a released visit,
# clear old orders/cart on expiry, and block Waiter/Note/Valet until rescan.
# ---------------------------------------------------------------------------
text = texts['runtime']
if MARKER not in text:
    text = once(
        text,
        "import { fetchGuestOrdersState, prepareGuestOrder } from '@/src/lib/guest-order-flow-r60t'",
        "import { activateGuestTableSession, fetchGuestOrdersState, GuestTableSessionError, prepareGuestOrder } from '@/src/lib/guest-order-flow-r60t'",
        'runtime import',
    )

    search_helper = """function matchesSearch(item: MenuItem, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true

  return [item.name, item.description, item.categoryName, item.allergens.join(' ')]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}
"""
    lifecycle_helpers = """

// PMD_R61_TABLE_VISIT_LEASE
function freshGuestSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function consumeQrFromAddressBar(): void {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('qr')) return
    url.searchParams.delete('qr')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  } catch {}
}
"""
    text = once(text, search_helper, search_helper + lifecycle_helpers, 'runtime lifecycle helpers')

    old_init = """  useEffect(() => {
    if (!isR60tActive) return
    try {
      setFlowGuestSessionId((current) => current || getGuestSessionId(base.bootstrap.tenant.id, base.bootstrap.table))
    } catch {}
  }, [base.bootstrap.table, base.bootstrap.tenant.id, isR60tActive])
"""
    new_init = """  const flowTableKey = base.bootstrap.table.id || base.bootstrap.table.number || base.bootstrap.table.qr || 'table'
  const flowExpiredKey = `pmd-v2:r61-expired:${base.bootstrap.tenant.id}:${flowTableKey}`
  const flowGuestStorageKey = `pmd-v2:guest:${base.bootstrap.tenant.id}:${base.bootstrap.table.id || base.bootstrap.table.number || 'delivery'}`

  useEffect(() => {
    if (!isR60tActive) return
    let cancelled = false

    const initializeVisit = async () => {
      try {
        let guestSessionId = getGuestSessionId(base.bootstrap.tenant.id, base.bootstrap.table)
        const scanQr = String(new URLSearchParams(window.location.search).get('qr') || '').trim()
        const expired = window.localStorage.getItem(flowExpiredKey) === '1'

        if (expired && !scanQr) {
          if (!cancelled) {
            setFlowGuestSessionId('')
            setFlowOrders([])
            setFlowSelectedOrderId(null)
            base.clearCart()
            base.closeOverlay()
          }
          return
        }

        if (scanQr) {
          if (expired) {
            guestSessionId = freshGuestSessionId()
            window.localStorage.setItem(flowGuestStorageKey, guestSessionId)
          }

          try {
            await activateGuestTableSession(base.bootstrap.table, guestSessionId, scanQr)
          } catch (error) {
            if (error instanceof GuestTableSessionError && error.code === 'SESSION_ROTATION_REQUIRED') {
              guestSessionId = freshGuestSessionId()
              window.localStorage.setItem(flowGuestStorageKey, guestSessionId)
              await activateGuestTableSession(base.bootstrap.table, guestSessionId, scanQr)
            } else {
              throw error
            }
          }

          window.localStorage.removeItem(flowExpiredKey)
          consumeQrFromAddressBar()
        }

        if (!cancelled) setFlowGuestSessionId(guestSessionId)
      } catch (error) {
        if (cancelled) return
        if (error instanceof GuestTableSessionError) {
          try { window.localStorage.setItem(flowExpiredKey, '1') } catch {}
          setFlowGuestSessionId('')
          setFlowOrders([])
          setFlowSelectedOrderId(null)
          base.clearCart()
          base.closeOverlay()
          return
        }
        if (process.env.NODE_ENV !== 'production') console.debug('[PMD R61] visit activation failed', error)
      }
    }

    void initializeVisit()
    return () => { cancelled = true }
  }, [base.bootstrap.table, base.bootstrap.tenant.id, base.clearCart, base.closeOverlay, flowExpiredKey, flowGuestStorageKey, isR60tActive])
"""
    text = once(text, old_init, new_init, 'runtime initialization')

    old_refresh_catch = """    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.debug('[PMD R60T] guest order state refresh failed', error)
    }
"""
    new_refresh_catch = """    } catch (error) {
      if (error instanceof GuestTableSessionError && error.code === 'TABLE_SESSION_EXPIRED') {
        try { window.localStorage.setItem(flowExpiredKey, '1') } catch {}
        setFlowGuestSessionId('')
        setFlowOrders([])
        setFlowSelectedOrderId(null)
        base.clearCart()
        base.closeOverlay()
        return
      }
      if (process.env.NODE_ENV !== 'production') console.debug('[PMD R60T] guest order state refresh failed', error)
    }
"""
    text = once(text, old_refresh_catch, new_refresh_catch, 'runtime refresh expiry')
    text = once(
        text,
        "  }, [base.bootstrap.table, flowGuestSessionId, isR60tActive])\n",
        "  }, [base.bootstrap.table, base.clearCart, base.closeOverlay, flowExpiredKey, flowGuestSessionId, isR60tActive])\n",
        'runtime refresh deps',
    )

    old_prepare_catch = """    } catch (error) {
      base.notify('error', error instanceof Error ? error.message : base.labels.error)
    } finally {
"""
    new_prepare_catch = """    } catch (error) {
      if (error instanceof GuestTableSessionError && error.code === 'TABLE_SESSION_EXPIRED') {
        try { window.localStorage.setItem(flowExpiredKey, '1') } catch {}
        setFlowGuestSessionId('')
        setFlowOrders([])
        setFlowSelectedOrderId(null)
        base.clearCart()
        base.closeOverlay()
      }
      base.notify('error', error instanceof Error ? error.message : base.labels.error)
    } finally {
"""
    text = once(text, old_prepare_catch, new_prepare_catch, 'runtime prepare expiry')
    text = once(
        text,
        "  }, [base, flowGuestSessionId, isR60tActive, refreshFlow])\n",
        "  }, [base, flowExpiredKey, flowGuestSessionId, isR60tActive, refreshFlow])\n",
        'runtime prepare deps',
    )

    service_anchor = """  const selectFlowOrder = useCallback((orderId: number | null) => {
    if (!isR60tActive) return base.selectOrder(orderId)
    setFlowSelectedOrderId(orderId)
  }, [base, isR60tActive])
"""
    service_wrappers = """

  const requireActiveVisit = useCallback(() => {
    if (isR60tActive && !flowGuestSessionId) throw new Error(base.labels.scanTableQr)
  }, [base.labels.scanTableQr, flowGuestSessionId, isR60tActive])

  const callFlowWaiter = useCallback(async () => {
    requireActiveVisit()
    await base.callWaiter()
  }, [base, requireActiveVisit])

  const requestFlowValet = useCallback(async (values: { name: string; licensePlate: string; carMake: string }) => {
    requireActiveVisit()
    await base.requestValet(values)
  }, [base, requireActiveVisit])

  const sendFlowTableNote = useCallback(async (note: string) => {
    requireActiveVisit()
    await base.sendTableNote(note)
  }, [base, requireActiveVisit])
"""
    text = once(text, service_anchor, service_anchor + service_wrappers, 'runtime service wrappers')

    text = once(
        text,
        "      markOrderPaid: markFlowOrderPaid,\n",
        "      markOrderPaid: markFlowOrderPaid,\n      callWaiter: callFlowWaiter,\n      requestValet: requestFlowValet,\n      sendTableNote: sendFlowTableNote,\n",
        'runtime service overrides',
    )
    text = once(
        text,
        "    markFlowOrderPaid,\n    refreshFlow,\n",
        "    markFlowOrderPaid,\n    callFlowWaiter,\n    requestFlowValet,\n    sendFlowTableNote,\n    refreshFlow,\n",
        'runtime memo deps',
    )
texts['runtime'] = text

# Validate all patch targets before touching production.
for name, text in texts.items():
    if MARKER not in text:
        raise SystemExit(f'STOP: marker missing after patch for {name}')

# Write all four files only after every transformation succeeded.
for name, path in FILES.items():
    path.write_text(texts[name], encoding='utf-8')

# PHP syntax must pass immediately; otherwise restore every file.
php_files = [FILES['backend'], FILES['actions']]
failed = False
for path in php_files:
    result = subprocess.run(['php', '-l', str(path)], text=True, capture_output=True)
    print((result.stdout or result.stderr).strip())
    if result.returncode != 0:
        failed = True

if failed:
    print('PHP validation failed; restoring backup...')
    for path in FILES.values():
        src = backup / path.relative_to(APP)
        shutil.copy2(src, path)
    raise SystemExit('STOP: PHP validation failed; production files restored')

print('R61 TABLE VISIT LEASE PATCH APPLIED')
print('Cutover timestamp:', CUTOVER_TS)
print('Payment/provider files touched: 0')
print('Next: run npm run verify in Frontend V2 before restarting PM2.')
