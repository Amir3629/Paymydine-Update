#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil

APP = Path('/var/www/paymydine')
FE = APP / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815'
FILES = {
    'table_state': APP / 'app/admin/controllers/PmdWaiterTableStateV154.php',
    'r60t_backend': APP / 'app/main/routes/api-v1-guest-order-flow-r60t.php',
    'guest_actions': APP / 'app/main/routes/api-v1-guest-actions.php',
    'r60t_client': FE / 'src/lib/guest-order-flow-r60t.ts',
    'smart_runtime': FE / 'src/runtime/SmartMenuRuntimeContext.tsx',
}
MARKER = 'PMD_R60T_TABLE_LIFECYCLE_R61'

for name, path in FILES.items():
    if not path.exists():
        raise SystemExit(f'STOP: missing {name}: {path}')

backup = Path('/root') / f'paymydine-r61-table-session-{datetime.now().strftime("%Y%m%d_%H%M%S")}'
backup.mkdir(parents=True, exist_ok=True)
for name, path in FILES.items():
    target = backup / path.relative_to(APP)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, target)
print(f'Backup: {backup}')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP {label}: expected 1 target, found {count}')
    return text.replace(old, new, 1)


def replace_after(text: str, anchor: str, old: str, new: str, label: str) -> str:
    start = text.find(anchor)
    if start < 0:
        raise SystemExit(f'STOP {label}: anchor not found')
    pos = text.find(old, start)
    if pos < 0:
        raise SystemExit(f'STOP {label}: target not found after anchor')
    return text[:pos] + new + text[pos + len(old):]

# ---------------------------------------------------------------------------
# 1) Physical table authority: bump a tenant-scoped lifecycle epoch when the
#    guest leaves (cleaning) or the table becomes available.
# ---------------------------------------------------------------------------
p = FILES['table_state']
text = p.read_text(encoding='utf-8')
if MARKER not in text:
    text = replace_once(
        text,
        "use Illuminate\\Support\\Facades\\DB;\nuse Illuminate\\Support\\Facades\\Schema;",
        "use Illuminate\\Support\\Facades\\DB;\nuse Illuminate\\Support\\Facades\\Schema;\nuse Illuminate\\Support\\Facades\\Cache;\nuse App\\Helpers\\TenantHelper;",
        'table-state imports',
    )
    old = """                $this->writeHistory($tableId, $effectiveOld, $next, $reason, null, [
                    'source' => 'waiter_floor_v154',
                    'stored_old_status' => $storedOld,
                    'derived_occupied' => $derivedOccupied,
                    'skip_cleaning' => $skipCleaning,
                ]);

                return [
"""
    new = """                $this->writeHistory($tableId, $effectiveOld, $next, $reason, null, [
                    'source' => 'waiter_floor_v154',
                    'stored_old_status' => $storedOld,
                    'derived_occupied' => $derivedOccupied,
                    'skip_cleaning' => $skipCleaning,
                ]);

                // PMD_R60T_TABLE_LIFECYCLE_R61
                // Customer Left / Available revokes every previously scanned guest device.
                // Occupied transitions intentionally do not rotate this epoch.
                if (in_array($next, ['cleaning', 'available'], true)) {
                    try {
                        Cache::forever(
                            TenantHelper::scopedCacheKey('pmd:r60t:table-epoch:'.$tableId),
                            [
                                'id' => bin2hex(random_bytes(16)),
                                'released_at' => now()->toIso8601String(),
                                'status' => $next,
                                'reason' => $reason,
                            ]
                        );
                    } catch (\\Throwable $ignored) {
                    }
                }

                return [
"""
    text = replace_once(text, old, new, 'table-state lifecycle epoch')
    p.write_text(text, encoding='utf-8')
    print('Patched physical table lifecycle authority')
else:
    print('Physical table lifecycle authority already patched')

# ---------------------------------------------------------------------------
# 2) R60T backend: QR activation issues an HttpOnly table lease. Order state
#    and prepare require a lease from the current table lifecycle epoch.
# ---------------------------------------------------------------------------
p = FILES['r60t_backend']
text = p.read_text(encoding='utf-8')
if MARKER not in text:
    anchor = "Route::get('/guest-orders/state'"
    helper = r'''
// PMD_R60T_TABLE_LIFECYCLE_R61
// A printed table QR is the physical proof used to activate one browser visit.
// Staff Customer Left / Available rotates the table epoch, instantly invalidating
// every older lease without touching payment/provider state.
$pmdR60tActualTableId = static function (array $context): int {
    $table = $context['table'] ?? null;
    $id = (int)($table->table_id ?? $table->id ?? 0);
    return $id > 0 ? $id : 0;
};

$pmdR60tEpoch = static function (int $tableId): array {
    $default = ['id' => 'legacy', 'released_at' => null, 'status' => null, 'reason' => null];
    if ($tableId < 1) return $default;
    try {
        $value = \Illuminate\Support\Facades\Cache::get(
            \App\Helpers\TenantHelper::scopedCacheKey('pmd:r60t:table-epoch:'.$tableId),
            $default
        );
        if (is_array($value) && !empty($value['id'])) return array_merge($default, $value);
        if (is_string($value) && trim($value) !== '') return array_merge($default, ['id' => trim($value)]);
    } catch (\Throwable $ignored) {
    }
    return $default;
};

$pmdR60tLeaseCookieName = static fn (int $tableId): string => 'pmd_r60t_lease_'.$tableId;
$pmdR60tLeaseKey = static function (int $tableId, string $token): string {
    return \App\Helpers\TenantHelper::scopedCacheKey(
        'pmd:r60t:lease:'.$tableId.':'.hash('sha256', $token)
    );
};

$pmdR60tExpiredResponse = static function () {
    return response()->json([
        'success' => false,
        'code' => 'TABLE_SESSION_EXPIRED',
        'error' => 'This table session has ended. Scan the table QR again to continue.',
    ], 410)->cookie('pmd_r60t_guard', '1', 720, '/', null, request()->isSecure(), true, false, 'Lax');
};

$pmdR60tValidateLease = static function (array $context, string $guestSessionId = '') use (
    $pmdR60tActualTableId,
    $pmdR60tEpoch,
    $pmdR60tLeaseCookieName,
    $pmdR60tLeaseKey
): bool {
    $tableId = $pmdR60tActualTableId($context);
    if ($tableId < 1) return false;
    $token = trim((string)request()->cookie($pmdR60tLeaseCookieName($tableId), ''));
    if ($token === '') return false;
    try {
        $lease = \Illuminate\Support\Facades\Cache::get($pmdR60tLeaseKey($tableId, $token));
    } catch (\Throwable $ignored) {
        return false;
    }
    if (!is_array($lease)) return false;
    $epoch = $pmdR60tEpoch($tableId);
    if (!hash_equals((string)$epoch['id'], (string)($lease['epoch_id'] ?? ''))) return false;
    if ($guestSessionId !== '' && !hash_equals($guestSessionId, (string)($lease['guest_session_id'] ?? ''))) return false;
    return true;
};

Route::post('/guest-orders/activate', function (\Illuminate\Http\Request $request) use (
    $resolveTableDraftContext,
    $pmdR60tActualTableId,
    $pmdR60tEpoch,
    $pmdR60tLeaseCookieName,
    $pmdR60tLeaseKey
) {
    $request->validate([
        'guest_session_id' => 'required|string|max:191',
        'qr' => 'required|string|max:255',
    ]);
    $context = $resolveTableDraftContext($request);
    if (!$context['table']) return response()->json(['success' => false, 'error' => 'A valid table is required'], 422);

    $tableId = $pmdR60tActualTableId($context);
    if ($tableId < 1) return response()->json(['success' => false, 'error' => 'A valid physical table is required'], 422);

    $providedQr = trim((string)$request->input('qr', ''));
    $storedQr = trim((string)($context['table']->qr_code ?? ''));
    if ($providedQr === '' || $storedQr === '' || !hash_equals($storedQr, $providedQr)) {
        return response()->json(['success' => false, 'code' => 'INVALID_TABLE_QR', 'error' => 'Invalid table QR'], 403);
    }

    $guestSessionId = trim((string)$request->input('guest_session_id'));
    $epoch = $pmdR60tEpoch($tableId);
    $cookieName = $pmdR60tLeaseCookieName($tableId);
    $existingToken = trim((string)$request->cookie($cookieName, ''));
    $existingLease = null;
    if ($existingToken !== '') {
        try { $existingLease = \Illuminate\Support\Facades\Cache::get($pmdR60tLeaseKey($tableId, $existingToken)); } catch (\Throwable $ignored) {}
    }
    $existingCurrent = is_array($existingLease)
        && hash_equals((string)$epoch['id'], (string)($existingLease['epoch_id'] ?? ''))
        && hash_equals($guestSessionId, (string)($existingLease['guest_session_id'] ?? ''));

    // After the first explicit table release, an old guest id that already owns
    // self-orders must rotate before a new physical scan can start another visit.
    // The legacy epoch preserves active diners during rollout before the first release.
    if (!$existingCurrent && (string)$epoch['id'] !== 'legacy') {
        $hasPreviousSelfOrder = DB::table('orders')
            ->where('comment', 'like', '%[pmd_origin:guest_self]%')
            ->where('comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
            ->exists();
        if ($hasPreviousSelfOrder) {
            return response()->json([
                'success' => false,
                'code' => 'SESSION_ROTATION_REQUIRED',
                'error' => 'Start a new guest session for this QR scan.',
            ], 409)->cookie('pmd_r60t_guard', '1', 720, '/', null, request()->isSecure(), true, false, 'Lax');
        }
    }

    $token = bin2hex(random_bytes(32));
    \Illuminate\Support\Facades\Cache::put(
        $pmdR60tLeaseKey($tableId, $token),
        [
            'table_id' => $tableId,
            'epoch_id' => (string)$epoch['id'],
            'guest_session_id' => $guestSessionId,
            'activated_at' => now()->toIso8601String(),
        ],
        now()->addHours(12)
    );

    return response()->json([
        'success' => true,
        'tableId' => $tableId,
        'guestSessionId' => $guestSessionId,
        'expiresInSeconds' => 43200,
    ])->cookie($cookieName, $token, 720, '/', null, request()->isSecure(), true, false, 'Lax')
      ->cookie('pmd_r60t_guard', '1', 720, '/', null, request()->isSecure(), true, false, 'Lax');
});

'''
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit('STOP r60t backend: state route anchor missing')
    text = text[:idx] + helper + text[idx:]

    text = replace_after(
        text,
        "Route::get('/guest-orders/state'",
        "    $pmdR60tPayload\n) {",
        "    $pmdR60tPayload,\n    $pmdR60tValidateLease,\n    $pmdR60tExpiredResponse\n) {",
        'r60t state use list',
    )
    text = replace_after(
        text,
        "Route::get('/guest-orders/state'",
        "    if ($guestSessionId === '') return response()->json(['success' => false, 'error' => 'guest_session_id is required'], 422);\n",
        "    if ($guestSessionId === '') return response()->json(['success' => false, 'error' => 'guest_session_id is required'], 422);\n    if (!$pmdR60tValidateLease($context, $guestSessionId)) return $pmdR60tExpiredResponse();\n",
        'r60t state lease guard',
    )
    text = replace_after(
        text,
        "Route::post('/guest-orders/prepare'",
        "    $pmdR60tPayload\n) {",
        "    $pmdR60tPayload,\n    $pmdR60tValidateLease,\n    $pmdR60tExpiredResponse\n) {",
        'r60t prepare use list',
    )
    text = replace_after(
        text,
        "Route::post('/guest-orders/prepare'",
        "    $guestSessionId = trim((string)$request->input('guest_session_id'));\n",
        "    $guestSessionId = trim((string)$request->input('guest_session_id'));\n    if (!$pmdR60tValidateLease($context, $guestSessionId)) return $pmdR60tExpiredResponse();\n",
        'r60t prepare lease guard',
    )
    p.write_text(text, encoding='utf-8')
    print('Patched R60T QR activation + table lease guards')
else:
    print('R60T backend already lifecycle-patched')

# ---------------------------------------------------------------------------
# 3) Existing guest service endpoints: when the R60T guard cookie exists,
#    Waiter Call / Note / Valet require the current table lease. Legacy clients
#    that never entered R60T remain unchanged.
# ---------------------------------------------------------------------------
p = FILES['guest_actions']
text = p.read_text(encoding='utf-8')
if MARKER not in text:
    anchor = "                // Single source of truth for menu:"
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit('STOP guest-actions: insertion anchor missing')
    helpers = r'''                // PMD_R60T_TABLE_LIFECYCLE_R61
                // Only R60T-scanned browsers carry pmd_r60t_guard. For those browsers,
                // service requests require a lease from the current physical table epoch.
                $pmdR60tGuestActionTableId = static function ($tableRef): int {
                    $value = trim((string)$tableRef);
                    if ($value === '') return 0;
                    try {
                        $row = DB::table('tables')->where('table_id', $value)->first();
                        if (!$row && \Illuminate\Support\Facades\Schema::hasColumn('tables', 'table_no')) {
                            $row = DB::table('tables')->where('table_no', $value)->first();
                        }
                        return (int)($row->table_id ?? $row->id ?? 0);
                    } catch (\Throwable $ignored) {
                        return 0;
                    }
                };

                $pmdR60tGuestActionLeaseValid = static function ($tableRef) use ($pmdR60tGuestActionTableId): bool {
                    if ((string)request()->cookie('pmd_r60t_guard', '') !== '1') return true;
                    $tableId = $pmdR60tGuestActionTableId($tableRef);
                    if ($tableId < 1) return false;
                    $cookieName = 'pmd_r60t_lease_'.$tableId;
                    $token = trim((string)request()->cookie($cookieName, ''));
                    if ($token === '') return false;
                    $epochDefault = ['id' => 'legacy'];
                    try {
                        $epoch = \Illuminate\Support\Facades\Cache::get(
                            \App\Helpers\TenantHelper::scopedCacheKey('pmd:r60t:table-epoch:'.$tableId),
                            $epochDefault
                        );
                        $epochId = is_array($epoch) ? (string)($epoch['id'] ?? 'legacy') : (string)$epoch;
                        $lease = \Illuminate\Support\Facades\Cache::get(
                            \App\Helpers\TenantHelper::scopedCacheKey('pmd:r60t:lease:'.$tableId.':'.hash('sha256', $token))
                        );
                    } catch (\Throwable $ignored) {
                        return false;
                    }
                    return is_array($lease) && hash_equals($epochId, (string)($lease['epoch_id'] ?? ''));
                };

                $pmdR60tGuestActionExpired = static function () {
                    return response()->json([
                        'success' => false,
                        'ok' => false,
                        'code' => 'TABLE_SESSION_EXPIRED',
                        'error' => 'This table session has ended. Scan the table QR again to continue.',
                    ], 410);
                };

'''
    text = text[:idx] + helpers + text[idx:]

    text = replace_once(
        text,
        "Route::post('/valet-request', function (\\Illuminate\\Http\\Request $request) {",
        "Route::post('/valet-request', function (\\Illuminate\\Http\\Request $request) use ($pmdR60tGuestActionLeaseValid, $pmdR60tGuestActionExpired) {",
        'valet closure guard deps',
    )
    text = replace_after(
        text,
        "Route::post('/valet-request'",
        "                    // Get table info from database to get correct table_name\n",
        "                    if (!$pmdR60tGuestActionLeaseValid($data['table_id'])) return $pmdR60tGuestActionExpired();\n\n                    // Get table info from database to get correct table_name\n",
        'valet lease guard',
    )

    text = replace_once(
        text,
        "Route::post('/waiter-call', function (\\Illuminate\\Http\\Request $request) {",
        "Route::post('/waiter-call', function (\\Illuminate\\Http\\Request $request) use ($pmdR60tGuestActionLeaseValid, $pmdR60tGuestActionExpired) {",
        'waiter closure guard deps',
    )
    text = replace_after(
        text,
        "Route::post('/waiter-call'",
        "                    // Get table info from database to get correct table_name\n",
        "                    if (!$pmdR60tGuestActionLeaseValid($table)) return $pmdR60tGuestActionExpired();\n\n                    // Get table info from database to get correct table_name\n",
        'waiter lease guard',
    )

    text = replace_once(
        text,
        "Route::post('/table-notes', function (\\Illuminate\\Http\\Request $request) {",
        "Route::post('/table-notes', function (\\Illuminate\\Http\\Request $request) use ($pmdR60tGuestActionLeaseValid, $pmdR60tGuestActionExpired) {",
        'note closure guard deps',
    )
    text = replace_after(
        text,
        "Route::post('/table-notes'",
        "                    $id = DB::table('notifications')->insertGetId([\n",
        "                    if (!$pmdR60tGuestActionLeaseValid($table)) return $pmdR60tGuestActionExpired();\n\n                    $id = DB::table('notifications')->insertGetId([\n",
        'note lease guard',
    )
    p.write_text(text, encoding='utf-8')
    print('Patched Waiter/Note/Valet server-side table lease guards')
else:
    print('Guest actions already lifecycle-patched')

# ---------------------------------------------------------------------------
# 4) R60T client: explicit QR activation and typed lifecycle errors.
# ---------------------------------------------------------------------------
p = FILES['r60t_client']
text = p.read_text(encoding='utf-8')
if MARKER not in text:
    marker_block = """
// PMD_R60T_TABLE_LIFECYCLE_R61
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
    insert_after = """export type GuestOrdersState = {
  success: boolean
  selfOrders: GuestOrderState[]
  sharedStaffOrders: GuestOrderState[]
  orders: GuestOrderState[]
  updatedAt: string | null
}
"""
    text = replace_once(text, insert_after, insert_after + marker_block, 'r60t client error class')

    old_request = """  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) throw new Error(String(data?.error || data?.message || `HTTP ${response.status}`))
  return data as T
"""
    new_request = """  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    const code = String(data?.code || '')
    const message = String(data?.error || data?.message || `HTTP ${response.status}`)
    if (response.status === 410 || response.status === 409 || code === 'TABLE_SESSION_EXPIRED' || code === 'SESSION_ROTATION_REQUIRED') {
      throw new GuestTableSessionError(message, code || `HTTP_${response.status}`, response.status)
    }
    throw new Error(message)
  }
  return data as T
"""
    text = replace_once(text, old_request, new_request, 'r60t client request errors')

    activate = """
export async function activateGuestTableSession(table: TableContext, guestSessionId: string, scanQr: string): Promise<void> {
  const payload = {
    ...Object.fromEntries(paramsForTable(table)),
    guest_session_id: guestSessionId,
    qr: scanQr,
  }
  await request('/api/v1/guest-orders/activate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

"""
    text = replace_once(
        text,
        "export async function fetchGuestOrdersState(table: TableContext, guestSessionId: string): Promise<GuestOrdersState> {",
        activate + "export async function fetchGuestOrdersState(table: TableContext, guestSessionId: string): Promise<GuestOrdersState> {",
        'r60t client activate function',
    )
    p.write_text(text, encoding='utf-8')
    print('Patched R60T client QR activation')
else:
    print('R60T client already lifecycle-patched')

# ---------------------------------------------------------------------------
# 5) Smart runtime: consume ?qr once, preserve active rollout sessions, rotate
#    after release, clear old order/cart UI when the table lease expires.
# ---------------------------------------------------------------------------
p = FILES['smart_runtime']
text = p.read_text(encoding='utf-8')
if MARKER not in text:
    text = replace_once(
        text,
        "import { fetchGuestOrdersState, prepareGuestOrder } from '@/src/lib/guest-order-flow-r60t'",
        "import { activateGuestTableSession, fetchGuestOrdersState, GuestTableSessionError, prepareGuestOrder } from '@/src/lib/guest-order-flow-r60t'",
        'smart runtime imports',
    )

    helper_anchor = """function matchesSearch(item: MenuItem, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true

  return [item.name, item.description, item.categoryName, item.allergens.join(' ')]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}
"""
    helper_add = """

// PMD_R60T_TABLE_LIFECYCLE_R61
function createFreshGuestSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function consumeQrCredentialFromUrl(): void {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('qr')) return
    url.searchParams.delete('qr')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  } catch {}
}
"""
    text = replace_once(text, helper_anchor, helper_anchor + helper_add, 'smart runtime lifecycle helpers')

    old_effect = """  useEffect(() => {
    if (!isR60tActive) return
    try {
      setFlowGuestSessionId((current) => current || getGuestSessionId(base.bootstrap.tenant.id, base.bootstrap.table))
    } catch {}
  }, [base.bootstrap.table, base.bootstrap.tenant.id, isR60tActive])
"""
    new_effect = """  const flowTableKey = base.bootstrap.table.id || base.bootstrap.table.number || base.bootstrap.table.qr || 'table'
  const flowExpiredKey = `pmd-v2:r60t-expired:${base.bootstrap.tenant.id}:${flowTableKey}`
  const flowGuestStorageKey = `pmd-v2:guest:${base.bootstrap.tenant.id}:${base.bootstrap.table.id || base.bootstrap.table.number || 'delivery'}`

  useEffect(() => {
    if (!isR60tActive) return
    let cancelled = false

    const initialize = async () => {
      try {
        let guestSessionId = getGuestSessionId(base.bootstrap.tenant.id, base.bootstrap.table)
        const query = new URLSearchParams(window.location.search)
        const scanQr = String(query.get('qr') || '').trim()
        const previouslyExpired = window.localStorage.getItem(flowExpiredKey) === '1'

        if (scanQr) {
          if (previouslyExpired) {
            guestSessionId = createFreshGuestSessionId()
            window.localStorage.setItem(flowGuestStorageKey, guestSessionId)
          }

          try {
            await activateGuestTableSession(base.bootstrap.table, guestSessionId, scanQr)
          } catch (error) {
            if (error instanceof GuestTableSessionError && error.code === 'SESSION_ROTATION_REQUIRED') {
              guestSessionId = createFreshGuestSessionId()
              window.localStorage.setItem(flowGuestStorageKey, guestSessionId)
              await activateGuestTableSession(base.bootstrap.table, guestSessionId, scanQr)
            } else {
              throw error
            }
          }

          window.localStorage.removeItem(flowExpiredKey)
          consumeQrCredentialFromUrl()
        }

        if (!cancelled) setFlowGuestSessionId(guestSessionId)
      } catch (error) {
        if (cancelled) return
        if (error instanceof GuestTableSessionError) {
          try { window.localStorage.setItem(flowExpiredKey, '1') } catch {}
          setFlowOrders([])
          setFlowSelectedOrderId(null)
          setFlowGuestSessionId('')
          base.clearCart()
          base.closeOverlay()
          return
        }
        if (process.env.NODE_ENV !== 'production') console.debug('[PMD R60T] table session initialization failed', error)
      }
    }

    void initialize()
    return () => { cancelled = true }
  }, [base.bootstrap.table, base.bootstrap.tenant.id, base.clearCart, base.closeOverlay, flowExpiredKey, flowGuestStorageKey, isR60tActive])
"""
    text = replace_once(text, old_effect, new_effect, 'smart runtime initialization')

    old_catch = """    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.debug('[PMD R60T] guest order state refresh failed', error)
    }
"""
    new_catch = """    } catch (error) {
      if (error instanceof GuestTableSessionError && error.code === 'TABLE_SESSION_EXPIRED') {
        try { window.localStorage.setItem(flowExpiredKey, '1') } catch {}
        setFlowOrders([])
        setFlowSelectedOrderId(null)
        setFlowGuestSessionId('')
        base.clearCart()
        base.closeOverlay()
        return
      }
      if (process.env.NODE_ENV !== 'production') console.debug('[PMD R60T] guest order state refresh failed', error)
    }
"""
    text = replace_once(text, old_catch, new_catch, 'smart runtime expired state handling')

    old_deps = """  }, [base.bootstrap.table, flowGuestSessionId, isR60tActive])
"""
    new_deps = """  }, [base.bootstrap.table, base.clearCart, base.closeOverlay, flowExpiredKey, flowGuestSessionId, isR60tActive])
"""
    text = replace_once(text, old_deps, new_deps, 'smart runtime refresh deps')

    old_confirm_catch = """    } catch (error) {
      base.notify('error', error instanceof Error ? error.message : base.labels.error)
    } finally {
"""
    new_confirm_catch = """    } catch (error) {
      if (error instanceof GuestTableSessionError && error.code === 'TABLE_SESSION_EXPIRED') {
        try { window.localStorage.setItem(flowExpiredKey, '1') } catch {}
        setFlowOrders([])
        setFlowSelectedOrderId(null)
        setFlowGuestSessionId('')
        base.clearCart()
        base.closeOverlay()
      }
      base.notify('error', error instanceof Error ? error.message : base.labels.error)
    } finally {
"""
    text = replace_once(text, old_confirm_catch, new_confirm_catch, 'smart runtime prepare expired handling')

    old_confirm_deps = """  }, [base, flowGuestSessionId, isR60tActive, refreshFlow])
"""
    new_confirm_deps = """  }, [base, flowExpiredKey, flowGuestSessionId, isR60tActive, refreshFlow])
"""
    text = replace_once(text, old_confirm_deps, new_confirm_deps, 'smart runtime confirm deps')

    p.write_text(text, encoding='utf-8')
    print('Patched Smart runtime table-session expiry + rescan rotation')
else:
    print('Smart runtime already lifecycle-patched')

print('R61 table lifecycle patch applied successfully')
print('Changed files:')
for path in FILES.values():
    print('-', path)
print('Backup:', backup)
