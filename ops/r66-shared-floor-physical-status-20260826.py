#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil
import subprocess

APP = Path('/var/www/paymydine')
BASE = APP / 'app/admin/classes/PmdCleanWorkspaceControllerV1.php'
CASHIER = APP / 'app/admin/controllers/Cashierlab.php'
MARKER = 'PMD_R66_SHARED_FLOOR_PHYSICAL_STATUS_AUTHORITY'

FILES = [BASE, CASHIER]
for path in FILES:
    if not path.is_file():
        raise SystemExit(f'STOP: missing {path}')

stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup = Path('/root') / f'paymydine-r66-shared-floor-{stamp}'
for path in FILES:
    dest = backup / path.relative_to(APP)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)
print('Backup:', backup)

base = BASE.read_text(encoding='utf-8')
cashier = CASHIER.read_text(encoding='utf-8')

if MARKER in base and MARKER in cashier:
    print('R66 patch already present')
    raise SystemExit(0)


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP {label}: expected 1 target, found {count}')
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# Shared Cashier/Manager/Reservations Floor authority.
# floorBootstrap historically derives display status from order/open-order data.
# After a bill is fully settled, open_orders can become zero while the guests are
# still physically seated. Overlay the canonical tables.operational_status onto
# BOTH server first-paint rows and live-refresh rows before any shared workspace
# renders them. Display table number is never treated as a DB id: canonical id
# matching is attempted first; table_no/pos_table_label are only exact label maps.
# ---------------------------------------------------------------------------
if MARKER not in base:
    anchor = '''        $pmdSharedFloorLocationId = $this->pmdUsesFloor()\n            ? $this->pmdFloorTableManagerLocationId()\n            : 0;\n'''
    replacement = '''        // PMD_R66_SHARED_FLOOR_PHYSICAL_STATUS_AUTHORITY\n        // Payment/KDS state is not physical occupancy. Re-apply the canonical\n        // tables.operational_status after all Floor view-preference transforms\n        // so first paint and pmd_live snapshots share the same physical owner.\n        if ($this->pmdUsesFloor()) {\n            $floorBootstrap =\n                $this->pmdApplyPhysicalOperationalStatusAuthority(\n                    $floorBootstrap\n                );\n        }\n\n''' + anchor
    base = once(base, anchor, replacement, 'shared floor bootstrap authority hook')

    method_anchor = '''    protected function pmdWorkspaceTitle(string $locale): string\n    {\n'''
    method = r'''    /**
     * PMD_R66_SHARED_FLOOR_PHYSICAL_STATUS_AUTHORITY
     *
     * One physical table-status owner for every clean shared Floor.
     * Financial settlement and KDS readiness may remove an order from the open
     * order feed, but they may never make the physical table available.
     * `available` is trusted only when the canonical tables row says so after an
     * explicit staff lifecycle transition.
     */
    protected function pmdApplyPhysicalOperationalStatusAuthority(
        array $bootstrap
    ): array {
        try {
            if (
                !\Illuminate\Support\Facades\Schema::hasTable('tables')
                || !\Illuminate\Support\Facades\Schema::hasColumn(
                    'tables',
                    'operational_status'
                )
            ) {
                return $bootstrap;
            }

            $columns =
                \Illuminate\Support\Facades\Schema::getColumnListing(
                    'tables'
                );

            $pk = in_array('table_id', $columns, true)
                ? 'table_id'
                : (in_array('id', $columns, true) ? 'id' : null);

            if (!$pk) return $bootstrap;

            $select = [$pk, 'operational_status'];
            foreach (['table_no', 'pos_table_label'] as $column) {
                if (in_array($column, $columns, true)) {
                    $select[] = $column;
                }
            }

            $byId = [];
            $byLabel = [];

            foreach (
                \Illuminate\Support\Facades\DB::table('tables')
                    ->get(array_values(array_unique($select)))
                as $table
            ) {
                $status = strtolower(trim((string)(
                    $table->operational_status ?? ''
                )));
                if ($status === 'free') $status = 'available';

                if (!in_array(
                    $status,
                    ['available', 'occupied', 'cleaning', 'reserved'],
                    true
                )) {
                    continue;
                }

                $id = (int)($table->{$pk} ?? 0);
                if ($id > 0) $byId[$id] = $status;

                foreach (['table_no', 'pos_table_label'] as $column) {
                    if (!in_array($column, $columns, true)) continue;
                    $label = strtolower(trim((string)(
                        $table->{$column} ?? ''
                    )));
                    if ($label !== '') $byLabel[$label] = $status;
                }
            }

            if (!$byId && !$byLabel) return $bootstrap;

            $priority = [
                'available' => 1,
                'occupied' => 2,
                'reserved' => 3,
                'cleaning' => 4,
            ];

            $resolve = static function (array $row) use (
                $byId,
                $byLabel,
                $priority
            ): ?string {
                // Merged Floor cards inherit the strongest physical state from
                // their canonical member table ids.
                $memberStatuses = [];
                foreach ((array)($row['member_ids'] ?? []) as $memberId) {
                    $memberId = (int)$memberId;
                    if ($memberId > 0 && isset($byId[$memberId])) {
                        $memberStatuses[] = $byId[$memberId];
                    }
                }
                if ($memberStatuses) {
                    usort(
                        $memberStatuses,
                        static fn ($left, $right) =>
                            ($priority[$right] ?? 0)
                            <=> ($priority[$left] ?? 0)
                    );
                    return $memberStatuses[0];
                }

                // Explicit canonical DB identities first.
                foreach (
                    ['dbTableId', 'db_table_id', 'table_id']
                    as $key
                ) {
                    $id = (int)($row[$key] ?? 0);
                    if ($id > 0 && isset($byId[$id])) {
                        return $byId[$id];
                    }
                }

                // `id` is accepted only if it actually exists in the canonical
                // DB-id map. We never infer that a displayed table number is an id.
                $rowId = (int)($row['id'] ?? 0);
                if ($rowId > 0 && isset($byId[$rowId])) {
                    return $byId[$rowId];
                }

                // Exact display-label matching is a separate label lookup, not
                // a DB-id conversion.
                foreach (
                    [
                        'table_no',
                        'table_number',
                        'number',
                        'pos_table_label',
                    ] as $key
                ) {
                    $label = strtolower(trim((string)(
                        $row[$key] ?? ''
                    )));
                    if ($label !== '' && isset($byLabel[$label])) {
                        return $byLabel[$label];
                    }
                }

                return null;
            };

            $applyRows = static function ($rows) use ($resolve): array {
                if (!is_array($rows)) return [];

                foreach ($rows as &$row) {
                    if (!is_array($row)) continue;
                    $physical = $resolve($row);
                    if ($physical === null) continue;

                    $row['operational_status'] = $physical;
                    $row['table_operational_status'] = $physical;
                    $row['physical_status'] = $physical;

                    $current = strtolower(trim((string)(
                        $row['status'] ?? ''
                    )));
                    $hasAttention = in_array(
                        $current,
                        ['attention', 'waiter-call'],
                        true
                    )
                        || !empty($row['waiter_call'])
                        || trim((string)($row['note'] ?? '')) !== '';

                    // Attention can decorate an occupied table. Otherwise the
                    // canonical physical state owns the Floor colour outright.
                    if (!$hasAttention) {
                        $row['status'] = $physical;
                    }
                }
                unset($row);

                return array_values($rows);
            };

            if (array_key_exists('display_tables', $bootstrap)) {
                $bootstrap['display_tables'] = $applyRows(
                    $bootstrap['display_tables']
                );
            }

            if (is_array($bootstrap['data'] ?? null)) {
                if (is_array($bootstrap['data']['tables'] ?? null)) {
                    $bootstrap['data']['tables'] = $applyRows(
                        $bootstrap['data']['tables']
                    );
                }

                if (is_array(
                    $bootstrap['data']['sections']['floor_plan']['tables']
                    ?? null
                )) {
                    $bootstrap['data']['sections']['floor_plan']['tables'] =
                        $applyRows(
                            $bootstrap['data']['sections']['floor_plan']['tables']
                        );
                }
            }

            return $bootstrap;
        } catch (\Throwable $error) {
            logger()->warning(
                'Shared Floor physical status authority overlay failed',
                [
                    'workspace' => $this->pmdWorkspaceKey(),
                    'message' => $error->getMessage(),
                ]
            );
            return $bootstrap;
        }
    }

'''
    base = once(base, method_anchor, method + method_anchor, 'shared physical authority method')

# Cashier mobile Quick Mode bypasses parent::index() and reads floorBootstrap()
# directly. Apply the same shared authority there as well.
if MARKER not in cashier:
    quick = '''            $quickFloorBootstrap =\n                $quickShared->floorBootstrap();\n'''
    quick_new = '''            $quickFloorBootstrap =\n                $quickShared->floorBootstrap();\n\n            // PMD_R66_SHARED_FLOOR_PHYSICAL_STATUS_AUTHORITY\n            $quickFloorBootstrap =\n                $this->pmdApplyPhysicalOperationalStatusAuthority(\n                    $quickFloorBootstrap\n                );\n'''
    cashier = once(cashier, quick, quick_new, 'cashier quick physical authority hook')

BASE.write_text(base, encoding='utf-8')
CASHIER.write_text(cashier, encoding='utf-8')

for php in FILES:
    subprocess.run(['php', '-l', str(php)], check=True)

print('R66 SHARED FLOOR PHYSICAL STATUS AUTHORITY APPLIED')
print('- Cashier / Manager / Reservations shared Floor reads canonical operational_status')
print('- Cashier Quick Mode uses the same physical authority')
print('- paid/ready/open_orders=0 cannot turn an occupied table green')
print('- only canonical operational_status=available can render the table available')
print('- no payment/provider implementation file touched')
print('Next: reload PHP-FPM; frontend rebuild is not required for this R66 patch.')