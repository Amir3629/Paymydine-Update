#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

APP = Path('/var/www/paymydine')
FE = APP / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815'
OVERLAYS = FE / 'src/runtime/components/RuntimeOverlays.tsx'
CSS = FE / 'src/runtime/components/RuntimeOverlays.module.css'
DASHBOARD = APP / 'app/admin/controllers/Dashboardlab.php'
MARKER = 'PMD_R65_ORDERS_SWITCH_PHYSICAL_FLOOR_AUTHORITY'

FILES = [OVERLAYS, CSS, DASHBOARD]
for path in FILES:
    if not path.is_file():
        raise SystemExit(f'STOP: missing {path}')

stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup = Path('/root') / f'paymydine-r65-orders-floor-{stamp}'
for path in FILES:
    dest = backup / path.relative_to(APP)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)
print('Backup:', backup)

overlays = OVERLAYS.read_text(encoding='utf-8')
css = CSS.read_text(encoding='utf-8')
dashboard = DASHBOARD.read_text(encoding='utf-8')

if MARKER in overlays and MARKER in css and MARKER in dashboard:
    print('R65 patch already present')
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
# Frontend: paid self-order history gets one compact two-way segmented control:
# Table orders | Continue ordering. No duplicate full-width Continue button.
# Staff/shared checkout keeps the existing 3-tab payment/split UI unchanged.
# ---------------------------------------------------------------------------
if MARKER not in overlays:
    if 'PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE' not in overlays:
        raise SystemExit('STOP: R64 checkout marker missing from RuntimeOverlays.tsx')

    old_tabs_open = '''          <div className={styles.tabs}>\n            {selfHistoryOnly ? ('''
    new_tabs_open = '''          <div className={`${styles.tabs} ${selfHistoryOnly ? styles.tabsTwo : ''}`}>\n            {selfHistoryOnly ? ('''
    overlays = once(overlays, old_tabs_open, new_tabs_open, 'two-column history tab shell')

    old_history_tab = '''            {selfHistoryOnly ? (\n              <button className={`${styles.tab} ${styles.tabActive}`} type="button" onClick={() => setTab('orders')}><Utensils /> {copy.tableOrders}</button>\n            ) : ('''
    new_history_tab = '''            {selfHistoryOnly ? (\n              <>\n                <button className={`${styles.tab} ${styles.tabActive}`} type="button" onClick={() => setTab('orders')}><Utensils /> {copy.tableOrders}</button>\n                <button className={styles.tab} type="button" onClick={continueOrdering}><Plus /> {labels.continueMenu}</button>\n              </>\n            ) : ('''
    overlays = once(overlays, old_history_tab, new_history_tab, 'history segmented actions')

    old_duplicate_continue = '''            {!currentDraft && <button className={styles.secondary} type="button" onClick={continueOrdering}>{labels.continueMenu}</button>}'''
    new_duplicate_continue = '''            {!selfHistoryOnly && !currentDraft && <button className={styles.secondary} type="button" onClick={continueOrdering}>{labels.continueMenu}</button>}'''
    overlays = once(overlays, old_duplicate_continue, new_duplicate_continue, 'remove duplicate history continue button')

    overlays = overlays.replace(
        '// PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE\n',
        '// PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE\n  // PMD_R65_ORDERS_SWITCH_PHYSICAL_FLOOR_AUTHORITY\n',
        1,
    )

if MARKER not in css:
    old_tabs_css = '.tabs { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: .35rem; border: 1px solid var(--pmd-line, rgba(0,0,0,.12)); border-radius: 999px; padding: .3rem; }\n'
    new_tabs_css = old_tabs_css + '.tabsTwo { grid-template-columns: repeat(2, minmax(0,1fr)); } /* PMD_R65_ORDERS_SWITCH_PHYSICAL_FLOOR_AUTHORITY */\n'
    css = once(css, old_tabs_css, new_tabs_css, 'tabsTwo CSS')

# ---------------------------------------------------------------------------
# Dashboard Floor: physical tables.operational_status is the authority whenever
# it is present. Order/payment readiness may decorate a table, but must never
# turn occupied -> available. Only explicit staff lifecycle writes available.
# This fixes both server first paint and pmd_live floor_tables snapshots.
# ---------------------------------------------------------------------------
if MARKER not in dashboard:
    old_status_block = '''            $rawStatus = strtolower(trim((string)(\n                $custom['status']\n                ?? $raw['status']\n                ?? $raw['latest_order_status']\n                ?? ''\n            )));\n\n            $waiterCall = $rawStatus === 'waiter-call'\n                || $this->floorBool($raw['waiter_call'] ?? false)\n                || $this->floorBool($raw['needs_waiter'] ?? false)\n                || $this->floorBool($raw['call_waiter'] ?? false);\n\n            $cleaning = $rawStatus === 'cleaning'\n                || $this->floorBool($raw['cleaning_required'] ?? false)\n                || $this->floorBool($raw['needs_cleaning'] ?? false);\n\n            $reserved = $rawStatus === 'reserved'\n                || $this->floorBool($raw['reserved'] ?? false)\n                || $this->floorBool($raw['is_reserved'] ?? false);\n\n            $occupied = $rawStatus === 'occupied'\n                || count($linkedOrders) > 0\n                || (int)($raw['open_orders'] ?? 0) > 0;\n'''

    new_status_block = '''            $rawStatus = strtolower(trim((string)(\n                $custom['status']\n                ?? $raw['status']\n                ?? $raw['latest_order_status']\n                ?? ''\n            )));\n\n            // PMD_R65_ORDERS_SWITCH_PHYSICAL_FLOOR_AUTHORITY\n            // Physical table occupancy is independent from kitchen/payment state.\n            // If the canonical table row provides operational_status, it owns the\n            // available/occupied/cleaning/reserved decision. Order-derived status\n            // is compatibility fallback only for legacy rows without that field.\n            $operationalStatus = strtolower(trim((string)(\n                $raw['operational_status']\n                ?? $raw['table_operational_status']\n                ?? ''\n            )));\n            if ($operationalStatus === 'free') $operationalStatus = 'available';\n            $hasOperationalAuthority = in_array(\n                $operationalStatus,\n                ['available', 'occupied', 'cleaning', 'reserved'],\n                true\n            );\n\n            $waiterCall = $rawStatus === 'waiter-call'\n                || $this->floorBool($raw['waiter_call'] ?? false)\n                || $this->floorBool($raw['needs_waiter'] ?? false)\n                || $this->floorBool($raw['call_waiter'] ?? false);\n\n            $cleaning = $hasOperationalAuthority\n                ? $operationalStatus === 'cleaning'\n                : ($rawStatus === 'cleaning'\n                    || $this->floorBool($raw['cleaning_required'] ?? false)\n                    || $this->floorBool($raw['needs_cleaning'] ?? false));\n\n            $reserved = $hasOperationalAuthority\n                ? $operationalStatus === 'reserved'\n                : ($rawStatus === 'reserved'\n                    || $this->floorBool($raw['reserved'] ?? false)\n                    || $this->floorBool($raw['is_reserved'] ?? false));\n\n            $occupied = $hasOperationalAuthority\n                ? $operationalStatus === 'occupied'\n                : ($rawStatus === 'occupied'\n                    || count($linkedOrders) > 0\n                    || (int)($raw['open_orders'] ?? 0) > 0);\n'''
    dashboard = once(dashboard, old_status_block, new_status_block, 'Dashboardlab physical status authority')

payment_hash_after = payment_section_hash(overlays)
if payment_hash_before != payment_hash_after:
    raise SystemExit('STOP: PaymentPanel implementation changed unexpectedly')

OVERLAYS.write_text(overlays, encoding='utf-8')
CSS.write_text(css, encoding='utf-8')
DASHBOARD.write_text(dashboard, encoding='utf-8')

subprocess.run(['php', '-l', str(DASHBOARD)], check=True)

print('R65 ORDERS SWITCH + FLOOR AUTHORITY APPLIED')
print('- Table orders and Continue ordering are one two-way segmented control')
print('- duplicate Continue ordering button removed from paid self history')
print('- Dashboard Floor now obeys tables.operational_status as physical authority')
print('- paid/ready orders cannot make an occupied table available')
print('- only explicit staff lifecycle can write available/free')
print('- PaymentPanel implementation hash unchanged:', payment_hash_after)
print('Next: npm run verify, then restart Frontend V2 and reload PHP-FPM.')