#!/usr/bin/env python3
"""R17: fail-closed QR table entry for either current or older V2 release.

Makes only narrow staged source changes. Never touches running .next,
menu/checkout/payments, tenant databases, env configuration, or PM2 itself.
"""
from pathlib import Path
import sys

MARKER = 'PMD_V2_QR_DISABLED_TABLE_FAIL_CLOSED_R17'
NORMALIZER = 'src/server/normalize.ts'
MODEL = 'src/domain/model.ts'
TABLE = 'app/table/[tableId]/page.tsx'
HOME = 'app/page.tsx'
CUSTOMER_ROUTE = 'app/CustomerMenuRoute.tsx'
FALLBACK = 'src/runtime/components/PmdGuestTableInactiveR17.tsx'

TABLE_COMPONENT = """import type { CSSProperties } from 'react'

type Props = { tableLabel?: string | number | null }

export function PmdGuestTableInactiveR17({ tableLabel }: Props) {
  const table = String(tableLabel ?? '').trim()
  const page: CSSProperties = {
    minHeight: '100dvh', display: 'grid', placeItems: 'center',
    padding: '24px', background: '#f8fbf9', color: '#16312a',
    fontFamily: 'Arial, Helvetica, sans-serif',
  }
  const card: CSSProperties = {
    width: 'min(460px,100%)', padding: '32px 28px',
    border: '1px solid #d7e6df', borderRadius: 24,
    background: '#fff', boxShadow: '0 24px 64px rgba(24,57,47,.10)',
    textAlign: 'center',
  }
  return <main style={page} data-pmd-customer-fallback="table-inactive">
    <section style={card} role="status">
      <img src="/brand/paymydine-logo.svg" alt="PayMyDine" width={74} height={74}
           style={{ display: 'block', margin: '0 auto 20px', objectFit: 'contain' }} />
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1.25 }}>
        This table is not active
      </h1>
      <p style={{ margin: '14px auto 0', maxWidth: 320, color: '#65756f', lineHeight: 1.65 }}>
        Please ask a staff member to guide you with ordering.
      </p>
      {table ? <div style={{
        display: 'inline-flex', minHeight: 40, alignItems: 'center',
        marginTop: 20, padding: '0 16px', borderRadius: 999,
        border: '1px solid #cce3d9', color: '#075f4b',
        background: '#eff8f4', fontWeight: 800
      }}>Table {table}</div> : null}
    </section>
  </main>
}
"""

REPLACE_OLD = """  const valid = root.success !== false && Boolean(resolvedId || resolvedNumber || resolvedQr)"""
REPLACE_NEW = """  const disabled =
    root.table_disabled === true ||
    str(root.code).toLowerCase() === 'table_disabled' ||
    root.disabled === true
  const valid = !disabled && root.success !== false && Boolean(resolvedId || resolvedNumber || resolvedQr)"""
INSERT_AFTER_QR = """  const resolvedQr = str(first(root, ['qr_code','qr'])) || null"""
BLOCK = """  // PMD_V2_QR_DISABLED_TABLE_FAIL_CLOSED_R17
  // Both success:false/data.status:false and success:true/status:0 are inactive.
  // Physical occupied/busy states are NOT synonymous with disabled.
  const explicitlyOff = (value: unknown): boolean =>
    value !== undefined && value !== null && str(value) !== '' && !yes(value, true)
  const disabled =
    yes(root.table_disabled, false) ||
    yes(root.disabled, false) ||
    str(root.code).toLowerCase() === 'table_disabled' ||
    explicitlyOff(root.table_status) ||
    explicitlyOff(root.status) ||
    explicitlyOff(root.enabled)
  const requestedNumber = str(query.tableNo)
  const matchesNumber = !requestedNumber || !resolvedNumber ||
    (/^\\d+$/.test(requestedNumber) && /^\\d+$/.test(resolvedNumber)
      ? Number(requestedNumber) === Number(resolvedNumber)
      : requestedNumber === resolvedNumber)
  const valid = !disabled && root.success !== false && matchesNumber &&
    Boolean(resolvedId || resolvedNumber || resolvedQr)"""

IMPORT = "import { PmdGuestTableInactiveR17 } from '@/src/runtime/components/PmdGuestTableInactiveR17'\n"
ROUTE_GUARD = """  // PMD_V2_TABLE_ROUTE_FAIL_CLOSED_R17
  if (bootstrap.table.disabled || !bootstrap.table.valid) {
    const tableLabel = bootstrap.table.number || bootstrap.table.id ||
      context.tableNo || context.tableId || tableId
    return <PmdGuestTableInactiveR17 tableLabel={tableLabel} />
  }

"""
HOME_GUARD = """  // PMD_V2_HOME_QR_FAIL_CLOSED_R17
  if ((context.tableId || context.tableNo || context.qr) &&
      (bootstrap.table.disabled || !bootstrap.table.valid)) {
    return <PmdGuestTableInactiveR17 tableLabel={
      bootstrap.table.number || bootstrap.table.id || context.tableNo || context.tableId
    } />
  }

"""


CUSTOMER_ROUTE_GUARD = """  // PMD_V2_CUSTOMER_ROUTE_FAIL_CLOSED_R17C
  // QR/table customers need a verified physical table before any menu.
  // Kiosk and regular non-table menus must retain their existing behavior.
  const requestedTable = Boolean(context.tableId || context.tableNo || context.qr)
  if (!isKiosk && requestedTable &&
      (bootstrap.table.disabled || !bootstrap.table.valid)) {
    const tableLabel = bootstrap.table.number || bootstrap.table.id ||
      context.tableNo || context.tableId
    return <PmdGuestTableInactiveR17 tableLabel={tableLabel} />
  }

"""


def change_normalizer(text: str) -> str:
    begin = 'export function normalizeTable(payload: unknown, query:'
    end_token = '\n}\n\nfunction orderLines('
    if text.count(begin) != 1:
        raise RuntimeError('STOP: expected exactly one V2 normalizeTable definition')
    start = text.index(begin)
    end = text.find(end_token, start)
    if end < 0:
        raise RuntimeError('STOP: could not isolate V2 normalizeTable')
    end += 2
    block = text[start:end]
    if MARKER in block:
        if block.count(MARKER) != 1 or 'explicitlyOff(root.table_status)' not in block or 'matchesNumber' not in block:
            raise RuntimeError('STOP: R17 V2 marker incomplete')
        return text

    if block.count(INSERT_AFTER_QR) != 1:
        raise RuntimeError('STOP: V2 table number/QR normalizer differs')
    if REPLACE_NEW in block:
        block = block.replace(REPLACE_NEW, '', 1)
    elif REPLACE_OLD in block:
        block = block.replace(REPLACE_OLD, '', 1)
    else:
        raise RuntimeError('STOP: V2 table status calculation differs; do not overwrite')
    block = block.replace(INSERT_AFTER_QR, INSERT_AFTER_QR + '\n' + BLOCK, 1)
    if block.count('    disabled,') == 0:
        token = '  return {\n    valid,'
        if block.count(token) != 1:
            raise RuntimeError('STOP: V2 TableContext return block changed')
        block = block.replace(token, '  return {\n    valid,\n    disabled,', 1)
    if block.count('const disabled =') != 1 or block.count('const valid =') != 1:
        raise RuntimeError('STOP: duplicate table status calculations')
    return text[:start] + block + text[end:]


def change_model(text: str) -> str:
    anchor = 'export type TableContext = {\n  valid: boolean\n'
    if text.count(anchor) != 1:
        raise RuntimeError('STOP: V2 TableContext type differs')
    prefix = text[text.index(anchor):text.index(anchor)+165]
    if 'disabled:' in prefix or 'disabled?:' in prefix:
        return text
    return text.replace(anchor, anchor + '  disabled?: boolean\n', 1)


def change_table_route(text: str) -> tuple[str, bool]:
    # Modern R43 already protects this route with CustomerTableFallback.
    if 'if (bootstrap.table.disabled || !bootstrap.table.valid)' in text:
        return text, False
    anchor = '  const bootstrap = await loadCustomerBootstrap(context)\n\n'
    if text.count(anchor) != 1 or 'return (' not in text:
        raise RuntimeError('STOP: V2 /table route does not match supported shape')
    if 'PmdGuestTableInactiveR17' not in text:
        text = IMPORT + text
    return text.replace(anchor, anchor + ROUTE_GUARD, 1), True


def change_home(text: str) -> tuple[str, bool]:
    # Delegated Home is validated independently by change_customer_route().
    if "import { CustomerMenuRoute }" in text:
        return text, False
    if 'PMD_V2_HOME_QR_FAIL_CLOSED_R17' in text:
        return text, False
    anchor = '  const bootstrap = await loadCustomerBootstrap(context)\n\n'
    if text.count(anchor) != 1:
        raise RuntimeError('STOP: V2 home page does not match supported shape')
    if 'PmdGuestTableInactiveR17' not in text:
        text = IMPORT + text
    return text.replace(anchor, anchor + HOME_GUARD, 1), True


def change_customer_route(text: str) -> tuple[str, bool]:
    """Inspect the actual app/CustomerMenuRoute, not merely its import.

    The batch-20260912 release used CustomerMenuRoute without the newer
    CustomerTableFallback check. R17 incorrectly assumed its presence.
    """
    canonical = 'bootstrap.table.disabled || (hasTableLookup && !bootstrap.table.valid)'
    if canonical in text:
        if "if (!isKiosk)" not in text or 'return <CustomerTableFallback' not in text:
            raise RuntimeError('STOP: incomplete existing V2 CustomerTableFallback')
        return text, False

    marker = 'PMD_V2_CUSTOMER_ROUTE_FAIL_CLOSED_R17C'
    if marker in text:
        if (text.count(marker) != 1 or
            'if (!isKiosk && requestedTable &&' not in text or
            'return <PmdGuestTableInactiveR17' not in text):
            raise RuntimeError('STOP: R17C CustomerMenuRoute guard incomplete')
        return text, False

    anchor = '  const setup = bootstrap.setup\n'
    # Our patch must be applied after the kiosk/customer split but before
    # the tenant setup splash and any ThemeRenderer path.
    if (text.count(anchor) != 1 or
        "const isKiosk = kioskEnabled(rawSearch, forceKiosk)" not in text or
        "<ThemeRenderer themeId={bootstrap.theme.id} />" not in text or
        'bootstrap.table.disabled' in text):
        raise RuntimeError('STOP: unexpected V2 CustomerMenuRoute; no auto rewrite')
    if 'PmdGuestTableInactiveR17' in text:
        raise RuntimeError('STOP: existing R17 fallback partially wired')
    return (IMPORT + text).replace(
        anchor, CUSTOMER_ROUTE_GUARD + anchor, 1
    ), True


def proposed(root: Path) -> dict[str, str]:
    targets = [NORMALIZER, MODEL, TABLE, HOME]
    original = {}
    for rel in targets:
        file = root / rel
        if not file.is_file() or file.is_symlink():
            raise RuntimeError('STOP: V2 source absent or symlinked: ' + rel)
        original[rel] = file.read_text(encoding='utf-8')

    # Resolve the real Home handler. An import alone is not a security check.
    uses_customer_route = "import { CustomerMenuRoute }" in original[HOME]
    if uses_customer_route:
        file = root / CUSTOMER_ROUTE
        if not file.is_file() or file.is_symlink():
            raise RuntimeError('STOP: CustomerMenuRoute implementation missing')
        original[CUSTOMER_ROUTE] = file.read_text(encoding='utf-8')

    changed = dict(original)
    changed[NORMALIZER] = change_normalizer(original[NORMALIZER])
    changed[MODEL] = change_model(original[MODEL])
    changed[TABLE], old_table = change_table_route(original[TABLE])
    changed[HOME], old_home = change_home(original[HOME])
    old_customer_route = False
    if uses_customer_route:
        changed[CUSTOMER_ROUTE], old_customer_route = change_customer_route(
            original[CUSTOMER_ROUTE]
        )

    if old_table or old_home or old_customer_route:
        component = root / FALLBACK
        if component.exists() and (component.is_symlink() or
                                   component.read_text(encoding='utf-8') != TABLE_COMPONENT):
            raise RuntimeError('STOP: custom R17 fallback component is different')
        changed[FALLBACK] = TABLE_COMPONENT

    direct_guarded = (
        'if (bootstrap.table.disabled || !bootstrap.table.valid)' in changed[TABLE]
    )
    home_guarded = (
        'PMD_V2_HOME_QR_FAIL_CLOSED_R17' in changed[HOME]
        or (
            uses_customer_route
            and (
                'PMD_V2_CUSTOMER_ROUTE_FAIL_CLOSED_R17C' in changed[CUSTOMER_ROUTE]
                or (
                    'if (!isKiosk)' in changed[CUSTOMER_ROUTE]
                    and 'bootstrap.table.disabled || (hasTableLookup && !bootstrap.table.valid)' in changed[CUSTOMER_ROUTE]
                    and 'return <CustomerTableFallback' in changed[CUSTOMER_ROUTE]
                )
            )
        )
    )
    if not direct_guarded or not home_guarded:
        raise RuntimeError('STOP: actual direct or Home QR route remains unguarded')
    if 'PmdGuestTableInactiveR17' in changed.get(CUSTOMER_ROUTE, ''):
        component = root / FALLBACK
        if (FALLBACK not in changed
            and (not component.is_file() or component.is_symlink())):
            raise RuntimeError('STOP: R17 QR fallback imported but missing')
    return {rel: new for rel, new in changed.items()
            if not (root / rel).exists() or (root / rel).read_text(encoding='utf-8') != new}


def main():
    if len(sys.argv) not in (3, 4) or sys.argv[1] not in ('--check', '--stage'):
        raise SystemExit('Usage: pmd-r17-guard-frontend-v2.py --check DIR | --stage DIR MANIFEST')
    mode = sys.argv[1]
    root = Path(sys.argv[2]).resolve()
    if not root.is_dir() or not (root / 'package.json').is_file():
        raise RuntimeError('STOP: V2 root or package.json missing')
    changed = proposed(root)
    for rel in changed:
        print('R17 V2 SOURCE PATCH:', rel)
    if mode == '--check':
        print('PASS R17 V2: compatible layout; no writes')
        return
    if len(sys.argv) != 4:
        raise RuntimeError('STOP: --stage requires manifest path')
    manifest = Path(sys.argv[3])
    for rel, data in changed.items():
        file = root / rel
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(data, encoding='utf-8')
    manifest.write_text(''.join(rel + '\n' for rel in changed), encoding='utf-8')
    print('PASS R17 V2: patched staged code; active PM2 source unchanged')


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(3)
