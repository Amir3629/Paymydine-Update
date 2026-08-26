#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
COMPOSER = ROOT / 'app/admin/assets/js/pmd-cashier-order-composer-r51.js'
CSS = ROOT / 'app/admin/assets/css/pmd-cashier-lab-order-center.css'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'
SUMMARY = ROOT / 'app/admin/controllers/concerns/PmdWaiterPosPaymentSummaryConcern.php'
SETTLE = ROOT / 'app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php'
ROUTES = ROOT / 'routes/pos-receipts.php'
SPLIT_VIEW = ROOT / 'app/admin/views/orders/split_receipt.blade.php'
CUSTOMER_INVOICE = ROOT / 'app/admin/views/orders/customer_invoice.blade.php'
PAYMENT_V3 = ROOT / 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'

for path in (
    COMPOSER, CSS, CASHIER, SUMMARY, SETTLE, ROUTES,
    SPLIT_VIEW, CUSTOMER_INVOICE, PAYMENT_V3,
):
    if not path.is_file():
        raise SystemExit(f'STOP missing: {path}')

backup = Path('/root') / (
    'paymydine-r71-germany-invoice-only-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)
for path in (
    COMPOSER, CSS, CASHIER, SUMMARY, SETTLE,
    ROUTES, SPLIT_VIEW, CUSTOMER_INVOICE,
):
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

payment_hash_before = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP {label}: expected 1 target, found {count}')
    return text.replace(old, new, 1)


def bump_asset(text, filename, version):
    pos = text.find(filename)
    if pos < 0:
        raise SystemExit(f'STOP asset not found: {filename}')
    qpos = text.find('?v=', pos)
    if qpos < 0 or qpos > pos + 320:
        raise SystemExit(f'STOP asset cache key not found: {filename}')
    end = text.find("'", qpos)
    if end < 0:
        raise SystemExit(f'STOP asset cache terminator not found: {filename}')
    return text[:qpos] + '?v=' + version + text[end:]


# ---------------------------------------------------------------------------
# 1) Cashier presentation: Invoice-only customer UX.
#    Transaction/receipt evidence remains internal for audit and German
#    Belegausgabepflicht; the visible Cashier surface uses only “Invoice”.
# ---------------------------------------------------------------------------
s = COMPOSER.read_text(encoding='utf-8')
if 'PMD_R70_CASHIER_COMPACT_SETTLEMENT_SWITCHER' not in s:
    raise SystemExit('STOP R70 compact settlement switcher is not installed')

r71_marker = 'PMD_R71_GERMANY_INVOICE_ONLY'
if r71_marker not in s:
    # Visible tab label only. Internal data-mode can remain "receipts" so we do
    # not disturb the proven R70 state machine.
    old = '>Receipts</button>'
    new = '>Invoices</button>'
    if old not in s:
        raise SystemExit('STOP R70 Receipts switch label not found')
    s = s.replace(old, new, 1)

    # Rework the existing link helper without changing the settlement engine.
    fn_start = s.find('  function pmdR69ReceiptLinks(snapshot) {')
    fn_end = s.find('  function renderSettlementReview() {', fn_start)
    if fn_start < 0 or fn_end < 0:
        raise SystemExit('STOP R69 invoice-link helper boundaries not found')

    new_helper = r'''  // PMD_R71_GERMANY_INVOICE_ONLY
  // Customer/Cashier presentation says Invoice. The underlying receipt_url is
  // retained as an internal compatibility/audit pointer; split-invoice is the
  // visible document route.
  function pmdR69ReceiptLinks(snapshot) {
    return snapshot.transactions
      .filter(function (tx) {
        return !!(tx && (tx.invoice_url || tx.receipt_url));
      })
      .slice(0, 6)
      .map(function (tx, index) {
        var amount = num(tx.amount, 0);
        var method = String(
          tx.payment_method || tx.method || 'Payment'
        ).replace(/_/g, ' ');
        var invoiceUrl = String(tx.invoice_url || tx.receipt_url || '');
        if (invoiceUrl.indexOf('/admin/orders/split-receipt/') >= 0) {
          invoiceUrl = invoiceUrl.replace(
            '/admin/orders/split-receipt/',
            '/admin/orders/split-invoice/'
          );
        }
        var label =
          'Invoice ' + (index + 1) +
          (amount > 0 ? ' · ' + money(amount) : '');

        return [
          '<a class="pmd-coc__settlement-receipt" ',
            'href="', esc(invoiceUrl), '" ',
            'target="_blank" rel="noopener noreferrer">',
            '<span>', esc(method), '</span>',
            '<b>', esc(label), '</b>',
          '</a>'
        ].join('');
      })
      .join('');
  }

'''
    s = s[:fn_start] + new_helper + s[fn_end:]

COMPOSER.write_text(s, encoding='utf-8')


# ---------------------------------------------------------------------------
# 2) Canonical payment summary/settlement responses expose invoice_url while
#    preserving receipt_url internally for compatibility/audit.
# ---------------------------------------------------------------------------
php = SUMMARY.read_text(encoding='utf-8')
old = "'receipt_url' => '/admin/orders/split-receipt/'.(int)($r['id'] ?? 0),"
new = """'receipt_url' => '/admin/orders/split-receipt/'.(int)($r['id'] ?? 0),
                'invoice_url' => '/admin/orders/split-invoice/'.(int)($r['id'] ?? 0),"""
if "'invoice_url' => '/admin/orders/split-invoice/'" not in php:
    php = replace_once(php, old, new, 'payment summary invoice_url')
SUMMARY.write_text(php, encoding='utf-8')

php = SETTLE.read_text(encoding='utf-8')
# Duplicate/idempotent response.
old = "'receipt_url' => '/admin/orders/split-receipt/'.(int)$existing->id,"
new = """'receipt_url' => '/admin/orders/split-receipt/'.(int)$existing->id,
                    'invoice_url' => '/admin/orders/split-invoice/'.(int)$existing->id,"""
if "'invoice_url' => '/admin/orders/split-invoice/'.(int)$existing->id" not in php:
    php = replace_once(php, old, new, 'duplicate settlement invoice_url')

# New-payment response.
old = "'receipt_url' => '/admin/orders/split-receipt/'.$result['transaction_id'],"
new = """'receipt_url' => '/admin/orders/split-receipt/'.$result['transaction_id'],
                'invoice_url' => '/admin/orders/split-invoice/'.$result['transaction_id'],"""
if "'invoice_url' => '/admin/orders/split-invoice/'.$result['transaction_id']" not in php:
    php = replace_once(php, old, new, 'settlement invoice_url')
SETTLE.write_text(php, encoding='utf-8')


# ---------------------------------------------------------------------------
# 3) Add a true /split-invoice route by cloning the proven transaction loader.
#    The legacy split-receipt route remains available internally.
# ---------------------------------------------------------------------------
php = ROUTES.read_text(encoding='utf-8')
invoice_marker = '// PMD_SPLIT_INVOICE_GERMANY_R71'
if invoice_marker not in php:
    start_marker = '// PMD_SPLIT_RECEIPT_TENANT_SAFE_R37C'
    end_marker = '// PMD_CASHIER_INLINE_CANONICAL_INVOICE_R37C'
    start = php.find(start_marker)
    end = php.find(end_marker, start)
    if start < 0 or end < 0:
        raise SystemExit('STOP split receipt route boundaries not found')

    receipt_block = php[start:end]
    clone = receipt_block
    clone = clone.replace(
        start_marker,
        invoice_marker + '\n// Germany customer-facing invoice transport over the canonical payment transaction.'
    )
    clone = clone.replace(
        "Route::get('admin/orders/split-receipt/{transactionId}'",
        "Route::get('admin/orders/split-invoice/{transactionId}'",
        1
    )
    clone = clone.replace('Split receipt is not available', 'Split invoice is not available')
    clone = clone.replace('Receipt allocation transaction column is unavailable', 'Invoice allocation transaction column is unavailable')
    view_anchor = "return view('admin::orders.split_receipt', ["
    if view_anchor not in clone:
        raise SystemExit('STOP split invoice view anchor not found')
    clone = clone.replace(
        view_anchor,
        view_anchor + "\n        'invoiceMode' => true,",
        1
    )
    php = php[:end] + clone + '\n' + php[end:]
ROUTES.write_text(php, encoding='utf-8')


# ---------------------------------------------------------------------------
# 4) Split transaction document: Invoice presentation with tenant logo and a
#    unique split-invoice number. Internal receipt route still renders Receipt.
# ---------------------------------------------------------------------------
blade = SPLIT_VIEW.read_text(encoding='utf-8')
if 'PMD_R71_SPLIT_INVOICE_PRESENTATION' not in blade:
    prelude = r'''@php
    // PMD_R71_SPLIT_INVOICE_PRESENTATION
    $invoiceMode = (bool)($invoiceMode ?? false);

    $pmdInvoiceSetting = function ($key, $default = null) {
        try {
            $row = \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', $key)
                ->orderByDesc('setting_id')
                ->first();
            if ($row && $row->value !== null && $row->value !== '') {
                $value = $row->value;
                if ((int)($row->serialized ?? 0) === 1 && is_string($value)) {
                    $decoded = @unserialize($value);
                    if ($decoded !== false || $value === 'b:0;') $value = $decoded;
                }
                return $value;
            }
        } catch (\Throwable $e) {}
        try { return setting($key, $default); } catch (\Throwable $e) { return $default; }
    };

    $resolveLogoPathR71 = function ($val) {
        if (is_string($val)) return trim($val);
        if (is_array($val)) return trim((string)($val['path'] ?? $val['publicUrl'] ?? $val['url'] ?? ''));
        if (is_object($val)) return trim((string)($val->path ?? $val->publicUrl ?? $val->url ?? ''));
        return '';
    };

    $logoPathR71 = $resolveLogoPathR71($pmdInvoiceSetting('invoice_logo'));
    if ($logoPathR71 === '') $logoPathR71 = $resolveLogoPathR71($pmdInvoiceSetting('site_logo'));
    if ($logoPathR71 === '') $logoPathR71 = $resolveLogoPathR71($pmdInvoiceSetting('dashboard_logo'));

    $embedTenantMediaR71 = function ($path) {
        $path = trim((string)$path);
        if ($path === '' || preg_match('#^https?://#i', $path)) return '';
        $clean = preg_replace('#[?#].*$#', '', $path);
        $relative = $clean;
        if (strpos($relative, '/api/media/') === 0) $relative = substr($relative, strlen('/api/media/'));
        $relative = ltrim($relative, '/');
        $base = base_path('assets/media/attachments/public');
        $candidate = $base.'/'.$relative;
        if (!is_file($candidate)) {
            $name = basename($relative);
            if ($name !== '' && is_dir($base)) {
                try {
                    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, RecursiveDirectoryIterator::SKIP_DOTS));
                    foreach ($it as $file) {
                        if ($file->isFile() && $file->getFilename() === $name) {
                            $candidate = $file->getPathname();
                            break;
                        }
                    }
                } catch (\Throwable $e) {}
            }
        }
        if (!is_file($candidate) || !is_readable($candidate)) return '';
        $mime = @mime_content_type($candidate) ?: 'image/png';
        $bytes = @file_get_contents($candidate);
        if ($bytes === false || $bytes === '') return '';
        return 'data:'.$mime.';base64,'.base64_encode($bytes);
    };

    $logoDataR71 = $embedTenantMediaR71($logoPathR71);
    $logoUrlR71 = $logoDataR71 !== ''
        ? $logoDataR71
        : ($logoPathR71 !== ''
            ? (preg_match('#^https?://#i', $logoPathR71) ? $logoPathR71 : uploads_url($logoPathR71))
            : '');

    $siteNameR71 = trim((string)$pmdInvoiceSetting('site_name', ''));
    $invoicePrefixR71 = trim((string)$pmdInvoiceSetting('invoice_prefix', 'INV-'));
    if ($invoicePrefixR71 === '' || $invoicePrefixR71 === 'custom') $invoicePrefixR71 = 'INV-';
    $splitInvoiceNoR71 = $invoicePrefixR71.'S'.(int)($transaction->id ?? 0);
    $taxRateR71 = max(0, (float)$pmdInvoiceSetting('tax_percentage', 0));
    $grossPaidR71 = max(0, (float)($transaction->amount ?? 0));
    $netPaidR71 = $taxRateR71 > 0 ? round($grossPaidR71 / (1 + ($taxRateR71 / 100)), 2) : $grossPaidR71;
    $vatPaidR71 = max(0, round($grossPaidR71 - $netPaidR71, 2));
@endphp

'''
    blade = prelude + blade

    blade = blade.replace(
        '<title>Split Payment Receipt #{{ (int)$transaction->id }}</title>',
        '<title>{{ $invoiceMode ? (\'Invoice \' . $splitInvoiceNoR71) : (\'Split Payment Receipt #\' . (int)$transaction->id) }}</title>',
        1
    )

    old_header = '''    <div class="header">\n        <h2 style="margin:0;">Split Payment Receipt</h2>\n        <div class="muted">Transaction #{{ (int)$transaction->id }}</div>'''
    new_header = '''    <div class="header">\n        @if($invoiceMode && $logoUrlR71 !== '')\n            <div style="text-align:center;margin-bottom:10px;"><img src="{{ $logoUrlR71 }}" alt="logo" style="max-height:52px;max-width:220px;object-fit:contain;"></div>\n        @endif\n        @if($invoiceMode && $siteNameR71 !== '')\n            <div style="text-align:center;font-weight:800;font-size:16px;margin-bottom:4px;">{{ $siteNameR71 }}</div>\n        @endif\n        <h2 style="margin:0;">{{ $invoiceMode ? 'Invoice' : 'Split Payment Receipt' }}</h2>\n        @if($invoiceMode)\n            <div class="muted">Invoice #{{ $splitInvoiceNoR71 }}</div>\n        @endif\n        <div class="muted">Transaction #{{ (int)$transaction->id }}</div>'''
    if old_header not in blade:
        raise SystemExit('STOP split document header target not found')
    blade = blade.replace(old_header, new_header, 1)

    # Invoice-only tax summary, based on the tenant's current canonical VAT
    # setting. Existing allocation/item lines remain the source for what was paid.
    summary_anchor = '''        <div class="summary-row">\n            <span>Amount paid</span>\n            <strong>{{ currency_format((float)$transaction->amount) }}</strong>\n        </div>'''
    invoice_summary = summary_anchor + '''\n        @if($invoiceMode && $taxRateR71 > 0)\n            <div class="summary-row"><span>Net</span><span>{{ currency_format($netPaidR71) }}</span></div>\n            <div class="summary-row"><span>VAT {{ rtrim(rtrim(number_format($taxRateR71, 2, '.', ''), '0'), '.') }}%</span><span>{{ currency_format($vatPaidR71) }}</span></div>\n        @endif'''
    if summary_anchor not in blade:
        raise SystemExit('STOP split document amount summary target not found')
    blade = blade.replace(summary_anchor, invoice_summary, 1)

SPLIT_VIEW.write_text(blade, encoding='utf-8')


# ---------------------------------------------------------------------------
# 5) Final customer invoice logo: embed tenant /api/media image bytes so print
#    rendering never depends on a second HTTP image request.
# ---------------------------------------------------------------------------
blade = CUSTOMER_INVOICE.read_text(encoding='utf-8')
if 'PMD_R71_EMBEDDED_INVOICE_LOGO' not in blade:
    old_logo = r'''        $logoUrl = '';
        if ($logoPath !== '') {
            $logoUrl = preg_match('#^https?://#i', $logoPath) ? $logoPath : uploads_url($logoPath);
        }'''
    new_logo = r'''        // PMD_R71_EMBEDDED_INVOICE_LOGO
        // /api/media logos are tenant-owned local media. Embed the bytes in the
        // invoice HTML so browser/print timing, cookies or route rewriting can
        // never make the logo disappear.
        $embedInvoiceLogo = function ($path) {
            $path = trim((string)$path);
            if ($path === '' || preg_match('#^https?://#i', $path)) return '';
            $clean = preg_replace('#[?#].*$#', '', $path);
            $relative = $clean;
            if (strpos($relative, '/api/media/') === 0) {
                $relative = substr($relative, strlen('/api/media/'));
            }
            $relative = ltrim($relative, '/');
            $base = base_path('assets/media/attachments/public');
            $candidate = $base.'/'.$relative;
            if (!is_file($candidate)) {
                $name = basename($relative);
                if ($name !== '' && is_dir($base)) {
                    try {
                        $it = new RecursiveIteratorIterator(
                            new RecursiveDirectoryIterator($base, RecursiveDirectoryIterator::SKIP_DOTS)
                        );
                        foreach ($it as $file) {
                            if ($file->isFile() && $file->getFilename() === $name) {
                                $candidate = $file->getPathname();
                                break;
                            }
                        }
                    } catch (\Throwable $e) {}
                }
            }
            if (!is_file($candidate) || !is_readable($candidate)) return '';
            $mime = @mime_content_type($candidate) ?: 'image/png';
            $bytes = @file_get_contents($candidate);
            if ($bytes === false || $bytes === '') return '';
            return 'data:'.$mime.';base64,'.base64_encode($bytes);
        };

        $logoUrl = '';
        if ($logoPath !== '') {
            $embeddedLogo = $embedInvoiceLogo($logoPath);
            $logoUrl = $embeddedLogo !== ''
                ? $embeddedLogo
                : (preg_match('#^https?://#i', $logoPath) ? $logoPath : uploads_url($logoPath));
        }'''
    if old_logo not in blade:
        raise SystemExit('STOP customer invoice logo target not found')
    blade = blade.replace(old_logo, new_logo, 1)

    blade = blade.replace(
        '>Print / reprint receipt</button>',
        '>Print invoice</button>',
        1
    )

CUSTOMER_INVOICE.write_text(blade, encoding='utf-8')


# ---------------------------------------------------------------------------
# 6) Cache-bust real Cashier assets.
# ---------------------------------------------------------------------------
php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260826-r71-germany-invoice-only'
)
php = bump_asset(
    php,
    'pmd-cashier-lab-order-center.css',
    '20260826-r71-germany-invoice-only'
)
CASHIER.write_text(php, encoding='utf-8')

# Optional tiny CSS wording/spacing owner; no extra visual card is created.
css = CSS.read_text(encoding='utf-8')
marker = 'PMD_R71_GERMANY_INVOICE_ONLY_UI'
if marker not in css:
    css += r'''

/* PMD_R71_GERMANY_INVOICE_ONLY_UI */
.pmd-coc__settlement-receipts .pmd-coc__settlement-receipt {
  text-decoration: none;
}
.pmd-coc__settlement-receipts .pmd-coc__settlement-receipt b {
  color: #08745a;
}
'''
CSS.write_text(css, encoding='utf-8')


# ---------------------------------------------------------------------------
# Validation. Payment V3 must remain byte-for-byte unchanged.
# ---------------------------------------------------------------------------
def run(cmd):
    print('+', ' '.join(cmd))
    subprocess.run(cmd, cwd=ROOT, check=True)

run(['node', '--check', str(COMPOSER)])
run(['php', '-l', str(CASHIER)])
run(['php', '-l', str(SUMMARY)])
run(['php', '-l', str(SETTLE)])
run(['php', '-l', str(ROUTES)])

payment_hash_after = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()
if payment_hash_after != payment_hash_before:
    raise SystemExit('STOP Payment V3 changed unexpectedly')

print('')
print('R71 GERMANY INVOICE-ONLY FLOW APPLIED')
print('Backup:', backup)
print('- Cashier UI says Invoices, not Receipts')
print('- one split invoice link per recorded partial payment')
print('- internal receipt/transaction evidence preserved for audit compatibility')
print('- full invoice remains available after full settlement')
print('- split/final invoice logos embed tenant media bytes when local')
print('- Print / reprint receipt renamed to Print invoice on customer invoice')
print('- Payment V3 implementation hash unchanged:', payment_hash_after)
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
