#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
REF="origin/${BRANCH}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-platform-i18n-semantic-backups/$STAMP"
OUT="$HOME/pmd-platform-i18n-semantic-runs/$STAMP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

BOOT="app/admin/views/_partials/pmd_admin_i18n.blade.php"
SIDE="app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
COMPOSER="app/admin/assets/js/pmd-cashier-order-composer-r51.js"
PAYMENT="app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
POLICY="app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
POLICY_ALIAS="app/admin/assets/js/pmd-waiter-pos-payment-policy-r67g.js"

RUNTIME_FILES=(
  "app/admin/classes/PmdPlatformI18n.php"
  "app/admin/views/_partials/pmd_platform_messages.blade.php"
  "app/admin/assets/js/pmd-platform-messages.js"
)

cd "$ROOT"
mkdir -p "$BACKUP" "$OUT" "$TMP/candidate/app/admin/i18n/platform"

echo "============================================================"
echo " PMD PLATFORM I18N SEMANTIC RECOVERY V4"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"
echo "OUTPUT=$OUT"

echo "[1/8] Fetching branch read-only..."
git fetch origin "$BRANCH"

for path in "${RUNTIME_FILES[@]}"; do
  mkdir -p "$TMP/candidate/$(dirname "$path")"
  git show "$REF:$path" > "$TMP/candidate/$path"
done

git show "$REF:app/admin/i18n/platform/en.php" > "$TMP/candidate/app/admin/i18n/platform/en.php"
git show "$REF:app/admin/i18n/platform/de.php" > "$TMP/candidate/app/admin/i18n/platform/de.php"
git show "$REF:scripts/pmd-validate-platform-i18n.php" > "$TMP/validate.php"
git show "$REF:scripts/pmd-audit-platform-i18n-readonly.py" > "$TMP/audit.py"

for path in "$BOOT" "$SIDE" "$COMPOSER" "$PAYMENT" "$POLICY"; do
  [ -f "$path" ] || { echo "ERROR=Missing live target $path" >&2; exit 10; }
done

mkdir -p "$TMP/live" "$TMP/patched"
for path in "$BOOT" "$SIDE" "$COMPOSER" "$PAYMENT" "$POLICY"; do
  key="$(echo "$path" | tr '/' '_')"
  cp -a "$path" "$TMP/live/$key"
  cp -a "$path" "$BACKUP/$key.before"
  sha256sum "$path" >> "$BACKUP/hashes.before"
done
if [ -f "$POLICY_ALIAS" ]; then
  key="$(echo "$POLICY_ALIAS" | tr '/' '_')"
  cp -a "$POLICY_ALIAS" "$TMP/live/$key"
  cp -a "$POLICY_ALIAS" "$BACKUP/$key.before"
  sha256sum "$POLICY_ALIAS" >> "$BACKUP/hashes.before"
fi

for path in "${RUNTIME_FILES[@]}" app/admin/i18n/platform/en.php app/admin/i18n/platform/de.php; do
  if [ -e "$path" ]; then
    mkdir -p "$BACKUP/existing/$(dirname "$path")"
    cp -a "$path" "$BACKUP/existing/$path"
  fi
done

echo "[2/8] Extending the single EN/DE catalog with Cashier platform keys..."
python3 - "$TMP/candidate/app/admin/i18n/platform/en.php" "$TMP/candidate/app/admin/i18n/platform/de.php" <<'PY'
from pathlib import Path
import sys

entries = {
    'en': {
        'nav.logout_confirm': 'Are you sure you want to log out?',
        'cashier.order_composer': 'CASHIER · ORDER COMPOSER',
        'cashier.new_order': 'New order',
        'cashier.select_table_add_items': 'Select a table and add items.',
        'cashier.delivery_no_table': 'Delivery / no table',
        'cashier.order_items': 'Order items',
        'cashier.new_items': 'New items',
        'cashier.sent_items': 'Sent items',
        'cashier.no_new_items': 'No new items',
        'cashier.choose_food_menu': 'Choose food from the menu.',
        'cashier.note': 'Note',
        'cashier.add_note': 'Add note…',
        'cashier.pending': 'Pending',
        'cashier.pending_total': 'Pending total',
        'cashier.current_bill': 'Current bill',
        'cashier.delivery_total': 'Delivery total',
        'cashier.cancel_order': 'Cancel order',
        'cashier.cannot_cancel_settlement': 'This order cannot be cancelled in its current settlement state.',
        'cashier.confirm': 'Confirm',
        'cashier.confirming': 'Confirming…',
        'cashier.invoice': 'Invoice',
    },
    'de': {
        'nav.logout_confirm': 'Möchten Sie sich wirklich abmelden?',
        'cashier.order_composer': 'KASSE · BESTELLUNG',
        'cashier.new_order': 'Neue Bestellung',
        'cashier.select_table_add_items': 'Tisch auswählen und Artikel hinzufügen.',
        'cashier.delivery_no_table': 'Lieferung / kein Tisch',
        'cashier.order_items': 'Bestellpositionen',
        'cashier.new_items': 'Neue Artikel',
        'cashier.sent_items': 'Gesendete Artikel',
        'cashier.no_new_items': 'Keine neuen Artikel',
        'cashier.choose_food_menu': 'Speisen aus dem Menü auswählen.',
        'cashier.note': 'Notiz',
        'cashier.add_note': 'Notiz hinzufügen…',
        'cashier.pending': 'Ausstehend',
        'cashier.pending_total': 'Ausstehender Gesamtbetrag',
        'cashier.current_bill': 'Aktuelle Rechnung',
        'cashier.delivery_total': 'Lieferbestellsumme',
        'cashier.cancel_order': 'Bestellung stornieren',
        'cashier.cannot_cancel_settlement': 'Diese Bestellung kann im aktuellen Zahlungsstatus nicht storniert werden.',
        'cashier.confirm': 'Bestätigen',
        'cashier.confirming': 'Wird bestätigt…',
        'cashier.invoice': 'Rechnung',
    },
}

for locale, path_s in [('en', sys.argv[1]), ('de', sys.argv[2])]:
    path = Path(path_s)
    text = path.read_text(encoding='utf-8')
    anchor = "    'waiter.dashboard.title'"
    if anchor not in text:
        raise SystemExit(f'ERROR={locale} catalog anchor missing')
    missing = [(k,v) for k,v in entries[locale].items() if f"'{k}' =>" not in text]
    if missing:
        block = ''.join("    %r => %r,\n" % (k, v) for k, v in missing) + '\n'
        text = text.replace(anchor, block + anchor, 1)
    path.write_text(text, encoding='utf-8')
    print(f'CATALOG_{locale.upper()}_CASHIER_KEYS_OK=1')
PY

php -l "$TMP/candidate/app/admin/classes/PmdPlatformI18n.php"
php -l "$TMP/candidate/app/admin/i18n/platform/en.php"
php -l "$TMP/candidate/app/admin/i18n/platform/de.php"
php -l "$TMP/validate.php"

mkdir -p "$TMP/mini/app/admin/i18n/platform" "$TMP/mini/scripts"
cp "$TMP/candidate/app/admin/i18n/platform/en.php" "$TMP/mini/app/admin/i18n/platform/en.php"
cp "$TMP/candidate/app/admin/i18n/platform/de.php" "$TMP/mini/app/admin/i18n/platform/de.php"
cp "$TMP/validate.php" "$TMP/mini/scripts/pmd-validate-platform-i18n.php"
php "$TMP/mini/scripts/pmd-validate-platform-i18n.php" "$TMP/mini" | tee "$OUT/catalog-validation.txt"

echo "[3/8] Building semantic candidates from the exact live files..."
python3 - "$ROOT" "$TMP" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
tmp = Path(sys.argv[2])

def live(rel): return (root / rel).read_text(encoding='utf-8')
def out(rel, text):
    p = tmp / 'patched' / rel.replace('/', '_')
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')
    return p

def replace_once(text, old, new, label, required=True):
    if new in text:
        return text
    count = text.count(old)
    if count == 0:
        if required:
            raise SystemExit(f'ERROR={label} anchor missing')
        return text
    return text.replace(old, new, 1)

# ----- Global platform payload mount: existing common Admin i18n owner -----
rel = 'app/admin/views/_partials/pmd_admin_i18n.blade.php'
text = live(rel)
if 'PMD_PLATFORM_MESSAGES_GLOBAL_V1' not in text:
    anchor = '@php\n'
    if anchor not in text:
        raise SystemExit('ERROR=global boot @php anchor missing')
    text = text.replace(anchor,
        "{{-- PMD_PLATFORM_MESSAGES_GLOBAL_V1 --}}\n@include('admin::_partials.pmd_platform_messages')\n" + anchor,
        1)
out(rel, text)
print('GLOBAL_PLATFORM_MESSAGES_CANDIDATE=1')

# ----- Side Menu: same live behavior, keyed copy only -----
rel = 'app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php'
text = live(rel)
if 'PMD_SIDE_MENU_PLATFORM_I18N_V1' not in text:
    anchor = "    $pmdSm2IsDe = $pmdSm2Locale === 'de';\n"
    helper = anchor + "    // PMD_SIDE_MENU_PLATFORM_I18N_V1\n    $pmdSm2T = static function (string $key, string $fallback = ''): string {\n        return \\Admin\\Classes\\PmdPlatformI18n::translate($key, [], null, $fallback);\n    };\n"
    text = replace_once(text, anchor, helper, 'side-menu helper')

pairs = {
    '<aside id="pmd-side-menu2" aria-label="Admin navigation">': '<aside id="pmd-side-menu2" aria-label="{{ $pmdSm2T(\'nav.admin_navigation\', \'Admin navigation\') }}">',
    'aria-label="Expand menu"': 'aria-label="{{ $pmdSm2T(\'nav.expand_menu\', \'Expand menu\') }}"',
    '<span class="pmd-sm2__label">Dashboard</span>': '<span class="pmd-sm2__label">{{ $pmdSm2T(\'nav.dashboard\', \'Dashboard\') }}</span>',
    '<span class="pmd-sm2__label">Manager</span>': '<span class="pmd-sm2__label">{{ $pmdSm2T(\'nav.manager\', \'Manager\') }}</span>',
    "{{ $pmdSm2IsDe ? 'Buchhaltung' : 'Accountant' }}": "{{ $pmdSm2T('nav.accountant', 'Accountant') }}",
    '<span class="pmd-sm2__label">Orders</span>': '<span class="pmd-sm2__label">{{ $pmdSm2T(\'nav.orders\', \'Orders\') }}</span>',
    '<span class="pmd-sm2__label">Reservations</span>': '<span class="pmd-sm2__label">{{ $pmdSm2T(\'nav.reservations\', \'Reservations\') }}</span>',
    '<span class="pmd-sm2__label">Coupons &amp; Gifts</span>': '<span class="pmd-sm2__label">{{ $pmdSm2T(\'nav.coupons_gifts\', \'Coupons & Gifts\') }}</span>',
    "{{ $pmdSm2IsDe ? 'Menü' : 'Menu' }}": "{{ $pmdSm2T('nav.menu', 'Menu') }}",
    "{{ $pmdSm2IsDe ? 'Einstellungen' : 'Settings' }}": "{{ $pmdSm2T('nav.settings', 'Settings') }}",
    'aria-label="Account actions"': 'aria-label="{{ $pmdSm2T(\'nav.account_actions\', \'Account actions\') }}"',
    'aria-label="Log out"': 'aria-label="{{ $pmdSm2T(\'nav.logout\', \'Logout\') }}"',
    'title="Logout"': 'title="{{ $pmdSm2T(\'nav.logout\', \'Logout\') }}"',
    '<span class="pmd-sm2__account-label">Logout</span>': '<span class="pmd-sm2__account-label">{{ $pmdSm2T(\'nav.logout\', \'Logout\') }}</span>',
    "open ? 'Close navigation' : 'Open navigation'": "open ? @json($pmdSm2T('nav.close_navigation', 'Close navigation')) : @json($pmdSm2T('nav.open_navigation', 'Open navigation'))",
    "window.confirm('Are you sure you want to log out?')": "window.confirm(@json($pmdSm2T('nav.logout_confirm', 'Are you sure you want to log out?')))"
}
for old,new in pairs.items():
    if old in text:
        text = text.replace(old,new)
out(rel, text)
print('SIDE_MENU_PLATFORM_I18N_CANDIDATE=1')

# ----- Cashier composer: semantic keys, no behavior changes -----
rel = 'app/admin/assets/js/pmd-cashier-order-composer-r51.js'
text = live(rel)
if 'PMD_CASHIER_PLATFORM_I18N_V4' not in text:
    anchor = "  var PMD_MENU_FALLBACK_IMAGE = '/brand/paymydine-logo.svg';\n"
    helper = anchor + "\n  // PMD_CASHIER_PLATFORM_I18N_V4\n  function pmdT(key, fallback, replacements) {\n    var runtime = window.PMDPlatformMessages;\n    if (runtime && typeof runtime.t === 'function') {\n      return runtime.t(key, replacements || {}, fallback || key);\n    }\n    return fallback || key;\n  }\n"
    text = replace_once(text, anchor, helper, 'cashier helper')

# Exact HTML/string owners visible in the current Cashier surface.
repls = [
    ("'<option value=\"\">Delivery / no table</option>'", "'<option value=\"\">' + esc(pmdT('cashier.delivery_no_table', 'Delivery / no table')) + '</option>'"),
    ('aria-label="Order items"', "aria-label=\"' + esc(pmdT('cashier.order_items', 'Order items')) + '\""),
    ("'<span>New items</span>'", "'<span>' + esc(pmdT('cashier.new_items', 'New items')) + '</span>'"),
    ("'<span>Sent items</span>'", "'<span>' + esc(pmdT('cashier.sent_items', 'Sent items')) + '</span>'"),
    ("'<strong>No new items</strong>'", "'<strong>' + esc(pmdT('cashier.no_new_items', 'No new items')) + '</strong>'"),
    ("'<span>Choose food from the menu.</span>'", "'<span>' + esc(pmdT('cashier.choose_food_menu', 'Choose food from the menu.')) + '</span>'"),
    ("'<span>Note</span>'", "'<span>' + esc(pmdT('cashier.note', 'Note')) + '</span>'"),
    ('placeholder="Add note…"', "placeholder=\"' + esc(pmdT('cashier.add_note', 'Add note…')) + '\""),
    ('placeholder="Add note..."', "placeholder=\"' + esc(pmdT('cashier.add_note', 'Add note…')) + '\""),
    ("'<span class=\"pmd-pos-payment-eyebrow\">PAYMENT CENTER</span>'", "'<span class=\"pmd-pos-payment-eyebrow\">' + esc(pmdT('waiter.payment.center', 'PAYMENT CENTER')) + '</span>'"),
    ("'<h2 id=\"pmd-coc-payment-title\">Pay</h2>'", "'<h2 id=\"pmd-coc-payment-title\">' + esc(pmdT('payment.title', 'Pay')) + '</h2>'"),
    ('aria-label="Close payment"', "aria-label=\"' + esc(pmdT('waiter.pos.close_payment', 'Close payment')) + '\""),
    ("<b>Split / part payment</b><span>Choose what this payer pays now</span>", "<b>' + esc(pmdT('payment.split_part', 'Split / part payment')) + '</b><span>' + esc(pmdT('payment.choose_payer_now', 'Choose what this payer pays now')) + '</span>"),
    ('>Full</button>', ">' + esc(pmdT('payment.full', 'Full')) + '</button>"),
    ('>Equal</button>', ">' + esc(pmdT('payment.equal', 'Equal')) + '</button>"),
    ('>By items</button>', ">' + esc(pmdT('waiter.payment.by_items', 'By items')) + '</button>"),
    ('>Custom amount</button>', ">' + esc(pmdT('payment.custom_amount', 'Custom amount')) + '</button>"),
    ('<b>Payment method</b>', "<b>' + esc(pmdT('shared.payment_method', 'Payment method')) + '</b>"),
    ('<b>Tip</b>', "<b>' + esc(pmdT('shared.tip', 'Tip')) + '</b>"),
    ('>No tip</button>', ">' + esc(pmdT('waiter.payment.no_tip', 'No tip')) + '</button>"),
    ('>Custom</button>', ">' + esc(pmdT('shared.custom', 'Custom')) + '</button>"),
    ('placeholder="Custom tip"', "placeholder=\"' + esc(pmdT('waiter.payment.custom_tip', 'Custom tip')) + '\""),
    ('<b>Coupon</b>', "<b>' + esc(pmdT('shared.coupon', 'Coupon')) + '</b>"),
    ('placeholder="Coupon code"', "placeholder=\"' + esc(pmdT('waiter.payment.coupon_code', 'Coupon code')) + '\""),
    ('>Apply</button>', ">' + esc(pmdT('shared.apply', 'Apply')) + '</button>"),
    ('<div class="pmd-cashier-cash-title">Cash received</div>', "<div class=\"pmd-cashier-cash-title\">' + esc(pmdT('waiter.payment.cash_received', 'Cash received')) + '</div>"),
    ('aria-label="Backspace"', "aria-label=\"' + esc(pmdT('payment.backspace', 'Backspace')) + '\""),
    ('>Exact</button>', ">' + esc(pmdT('payment.exact', 'Exact')) + '</button>"),
    ('<h3>Payment summary</h3>', "<h3>' + esc(pmdT('shared.payment_summary', 'Payment summary')) + '</h3>"),
    ('data-pos-pay-button>Pay</button>', "data-pos-pay-button>' + esc(pmdT('payment.pay', 'Pay')) + '</button>"),
    ('data-pos-copy-link>Copy customer payment link</button>', "data-pos-copy-link>' + esc(pmdT('waiter.payment.copy_link', 'Copy customer payment link')) + '</button>"),
    ('data-pos-refresh-payment>Refresh payment status</button>', "data-pos-refresh-payment>' + esc(pmdT('waiter.payment.refresh_status', 'Refresh payment status')) + '</button>"),
    ('<b>Payment history</b>', "<b>' + esc(pmdT('shared.payment_history', 'Payment history')) + '</b>"),
]
for old,new in repls:
    if old in text:
        text = text.replace(old,new)

# Dynamic text assignments/state labels.
dyn = {
    "'Current bill'": "pmdT('cashier.current_bill', 'Current bill')",
    "'Delivery total'": "pmdT('cashier.delivery_total', 'Delivery total')",
    "'Pending total'": "pmdT('cashier.pending_total', 'Pending total')",
    "primary.textContent = 'Pay';": "primary.textContent = pmdT('payment.pay', 'Pay');",
    "primary.textContent = 'Invoice';": "primary.textContent = pmdT('cashier.invoice', 'Invoice');",
    "primary.textContent = 'Confirming…';": "primary.textContent = pmdT('cashier.confirming', 'Confirming…');",
    "primary.textContent = 'Confirm';": "primary.textContent = pmdT('cashier.confirm', 'Confirm');",
    "secondary.textContent = 'Cancel order';": "secondary.textContent = pmdT('cashier.cancel_order', 'Cancel order');",
    "secondary.title = 'Cancel order';": "secondary.title = pmdT('cashier.cancel_order', 'Cancel order');",
    "secondary.textContent = 'Close';": "secondary.textContent = pmdT('shared.close', 'Close');",
}
for old,new in dyn.items():
    text = text.replace(old,new)

# Header/static copy where present.
static_pairs = {
    'CASHIER · ORDER COMPOSER': "' + esc(pmdT('cashier.order_composer', 'CASHIER · ORDER COMPOSER')) + '",
    '>New order<': ">' + esc(pmdT('cashier.new_order', 'New order')) + '<",
    '>Select a table and add items.<': ">' + esc(pmdT('cashier.select_table_add_items', 'Select a table and add items.')) + '<",
}
# Do not do broad header substitutions if already converted through concatenation.

text = text.replace('cashier-payment-v3-r67h-20260826', 'cashier-payment-v3-platform-i18n-v4-20260827')
text = text.replace('cashier-payment-policy-r67h-20260826', 'cashier-payment-policy-platform-i18n-v4-20260827')
out(rel, text)
print('CASHIER_PLATFORM_I18N_CANDIDATE=1')

# ----- Payment V3 renderer: patch only copy production, preserve payment logic -----
rel = 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'
text = live(rel)
if 'PMD_PAYMENT_PLATFORM_I18N_V4' not in text:
    anchor = "      var state = ctx.state;\n"
    helper = anchor + "\n      // PMD_PAYMENT_PLATFORM_I18N_V4\n      function pmdT(key, fallback, replacements) {\n        var runtime = window.PMDPlatformMessages;\n        if (runtime && typeof runtime.t === 'function') {\n          return runtime.t(key, replacements || {}, fallback || key);\n        }\n        return fallback || key;\n      }\n"
    text = replace_once(text, anchor, helper, 'payment-v3 helper')

simple = {
    "toast('Receipt printed');": "toast(pmdT('payment.receipt_printed', 'Receipt printed'));",
    "return toast('Save the order before taking payment.', true);": "return toast(pmdT('payment.save_order_first', 'Save the order before taking payment.'), true);",
    "return toast('Save new items before taking payment.', true);": "return toast(pmdT('payment.save_items_first', 'Save new items before taking payment.'), true);",
    "toast('Payment status updated');": "toast(pmdT('payment.status_updated', 'Payment status updated'));",
    "toast(error.message || 'Could not load payment details.', true);": "toast(error.message || pmdT('payment.load_error', 'Could not load payment details.'), true);",
    "var methods = [{key: 'cash', name: 'Cash', note: 'Cash payment'}];": "var methods = [{key: 'cash', name: pmdT('payment.cash', 'Cash'), note: pmdT('payment.cash_payment', 'Cash payment')}];",
    "methods.push({key: 'direct_terminal', name: 'Terminal', note: 'Pay on a connected terminal'});": "methods.push({key: 'direct_terminal', name: pmdT('payment.terminal', 'Terminal'), note: pmdT('payment.pay_connected_terminal', 'Pay on a connected terminal')});",
    "payButton.textContent = 'Pay';": "payButton.textContent = pmdT('payment.pay', 'Pay');",
    "payButton.textContent = 'Checking terminal…';": "payButton.textContent = pmdT('payment.checking_terminal', 'Checking terminal…');",
    "payButton.textContent = 'No terminal online';": "payButton.textContent = pmdT('payment.no_terminal_online', 'No terminal online');",
    "payButton.textContent = 'Record cash';": "payButton.textContent = pmdT('payment.record_cash', 'Record cash');",
}
for old,new in simple.items():
    text = text.replace(old,new)

# Common generated HTML fragments.
text = text.replace('<span>Total</span>', "<span>' + esc(pmdT('payment.total', 'Total')) + '</span>")
text = text.replace('<span>Amount due</span>', "<span>' + esc(pmdT('payment.amount_due', 'Amount due')) + '</span>")
text = text.replace('<strong>Full balance</strong><small>Pay everything remaining on this order.</small>', "<strong>' + esc(pmdT('payment.full_balance', 'Full balance')) + '</strong><small>' + esc(pmdT('payment.pay_remaining', 'Pay everything remaining on this order.')) + '</small>")
text = text.replace("'<b>Amount</b><span>Max ' + money(remaining) + '</span>'", "'<b>' + esc(pmdT('payment.amount', 'Amount')) + '</b><span>' + esc(pmdT('payment.max_amount', 'Max :amount', {amount: money(remaining)})) + '</span>'")
text = text.replace("'Change: ' + money(change)", "pmdT('payment.change', 'Change: :amount', {amount: money(change)})")
text = text.replace("providers.length > 1 ? 'Choose where the customer pays' : 'Ready'", "providers.length > 1 ? pmdT('payment.choose_where_customer_pays', 'Choose where the customer pays') : pmdT('payment.ready', 'Ready')")
text = text.replace(": 'No terminal online';", ": pmdT('payment.no_terminal_online', 'No terminal online');")
text = text.replace("providers.length > 1 ? 'Choose terminal' : 'Terminal'", "providers.length > 1 ? pmdT('payment.choose_terminal', 'Choose terminal') : pmdT('payment.terminal', 'Terminal')")
text = text.replace("esc(isOnline ? 'Online' : status)", "esc(isOnline ? pmdT('payment.online', 'Online') : status)")
out(rel, text)
print('PAYMENT_V3_PLATFORM_I18N_CANDIDATE=1')

# ----- Payment policies: semantic patch from EACH live version independently -----
def patch_policy(rel):
    text = live(rel)
    if 'PMD_PAYMENT_POLICY_PLATFORM_I18N_V4' not in text:
        anchor = "    var state = ctx.state;\n"
        helper = anchor + "\n    // PMD_PAYMENT_POLICY_PLATFORM_I18N_V4\n    function pmdT(key, fallback, replacements) {\n      var runtime = window.PMDPlatformMessages;\n      if (runtime && typeof runtime.t === 'function') {\n        return runtime.t(key, replacements || {}, fallback || key);\n      }\n      return fallback || key;\n    }\n"
        text = replace_once(text, anchor, helper, f'{rel} helper')
    replacements = {
        "? 'Payment method'\n            : 'How will they pay?'": "? pmdT('shared.payment_method', 'Payment method')\n            : pmdT('payment.method_question', 'How will they pay?')",
        "title.textContent = 'Cash';": "title.textContent = pmdT('payment.cash', 'Cash');",
        "note.textContent = 'Cash payment';": "note.textContent = pmdT('payment.cash_payment', 'Cash payment');",
        "title.textContent = 'Terminal';": "title.textContent = pmdT('payment.terminal', 'Terminal');",
        "note.textContent = 'Pay on a connected terminal';": "note.textContent = pmdT('payment.pay_connected_terminal', 'Pay on a connected terminal');",
        "label.textContent =\n            'Total';": "label.textContent =\n            pmdT('payment.total', 'Total');",
        "payButton.textContent =\n            'Pay';": "payButton.textContent =\n            pmdT('payment.pay', 'Pay');",
        "buttons.length > 1 ? 'Choose terminal' : 'Terminal'": "buttons.length > 1 ? pmdT('payment.choose_terminal', 'Choose terminal') : pmdT('payment.terminal', 'Terminal')",
        "subtitle.textContent === 'Ready'": "subtitle.textContent === pmdT('payment.ready', 'Ready')",
        "payButton.textContent = 'Terminal offline';": "payButton.textContent = pmdT('payment.terminal_offline', 'Terminal offline');",
        "status.textContent = 'This terminal is offline. Turn it on or choose another terminal.';": "status.textContent = pmdT('payment.terminal_offline_help', 'This terminal is offline. Turn it on or choose another terminal.');",
    }
    for old,new in replacements.items():
        text = text.replace(old,new)
    # Dynamic Cashier title.
    text = text.replace("'Order #' +\n                order.order_id", "pmdT('payment.order_number', 'Order #:id', {id: order.order_id})")
    text = text.replace(": 'Pay';", ": pmdT('payment.pay', 'Pay');")
    return text

for rel in ['app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js', 'app/admin/assets/js/pmd-waiter-pos-payment-policy-r67g.js']:
    if (root / rel).is_file():
        out(rel, patch_policy(rel))
        print('PAYMENT_POLICY_PLATFORM_I18N_CANDIDATE=' + rel)
PY

echo "[4/8] Syntax and semantic assertions before ANY write..."
for path in "$COMPOSER" "$PAYMENT" "$POLICY"; do
  cand="$TMP/patched/$(echo "$path" | tr '/' '_')"
  [ -f "$cand" ] || { echo "ERROR=Candidate missing $path" >&2; exit 20; }
  if command -v node >/dev/null 2>&1; then node --check "$cand"; fi
done
if [ -f "$POLICY_ALIAS" ]; then
  cand="$TMP/patched/$(echo "$POLICY_ALIAS" | tr '/' '_')"
  if command -v node >/dev/null 2>&1; then node --check "$cand"; fi
fi

BOOT_CAND="$TMP/patched/$(echo "$BOOT" | tr '/' '_')"
SIDE_CAND="$TMP/patched/$(echo "$SIDE" | tr '/' '_')"
COMPOSER_CAND="$TMP/patched/$(echo "$COMPOSER" | tr '/' '_')"
PAYMENT_CAND="$TMP/patched/$(echo "$PAYMENT" | tr '/' '_')"
POLICY_CAND="$TMP/patched/$(echo "$POLICY" | tr '/' '_')"

grep -q 'PMD_PLATFORM_MESSAGES_GLOBAL_V1' "$BOOT_CAND"
grep -q 'pmd_platform_messages' "$BOOT_CAND"
grep -q 'PMD_SIDE_MENU_PLATFORM_I18N_V1' "$SIDE_CAND"
grep -q 'PMD_CASHIER_PLATFORM_I18N_V4' "$COMPOSER_CAND"
grep -q "cashier.delivery_no_table" "$COMPOSER_CAND"
grep -q "cashier.no_new_items" "$COMPOSER_CAND"
grep -q "cashier.add_note" "$COMPOSER_CAND"
grep -q 'PMD_PAYMENT_PLATFORM_I18N_V4' "$PAYMENT_CAND"
grep -q 'PMD_PAYMENT_POLICY_PLATFORM_I18N_V4' "$POLICY_CAND"

echo "ALL_CANDIDATES_VALID=1"

echo "[5/8] Installing canonical runtime/catalog and semantic candidates..."
for path in "${RUNTIME_FILES[@]}"; do
  sudo install -D -m 0644 "$TMP/candidate/$path" "$ROOT/$path"
done
sudo install -D -m 0644 "$TMP/candidate/app/admin/i18n/platform/en.php" "$ROOT/app/admin/i18n/platform/en.php"
sudo install -D -m 0644 "$TMP/candidate/app/admin/i18n/platform/de.php" "$ROOT/app/admin/i18n/platform/de.php"

for path in "$BOOT" "$SIDE" "$COMPOSER" "$PAYMENT" "$POLICY"; do
  cand="$TMP/patched/$(echo "$path" | tr '/' '_')"
  sudo tee "$ROOT/$path" < "$cand" >/dev/null
done
if [ -f "$POLICY_ALIAS" ]; then
  cand="$TMP/patched/$(echo "$POLICY_ALIAS" | tr '/' '_')"
  sudo tee "$ROOT/$POLICY_ALIAS" < "$cand" >/dev/null
fi

echo "[6/8] Post-install validation + cache activation..."
php -l app/admin/classes/PmdPlatformI18n.php
php -l app/admin/i18n/platform/en.php
php -l app/admin/i18n/platform/de.php
php "$TMP/validate.php" "$ROOT" | tee "$OUT/catalog-validation-after.txt"

for path in "$COMPOSER" "$PAYMENT" "$POLICY"; do
  if command -v node >/dev/null 2>&1; then node --check "$path"; fi
done
if [ -f "$POLICY_ALIAS" ] && command -v node >/dev/null 2>&1; then node --check "$POLICY_ALIAS"; fi

php artisan view:clear >/dev/null 2>&1 || true
FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[7/8] Verifying installed markers..."
grep -q 'PMD_PLATFORM_MESSAGES_GLOBAL_V1' "$BOOT"
grep -q 'PMD_SIDE_MENU_PLATFORM_I18N_V1' "$SIDE"
grep -q 'PMD_CASHIER_PLATFORM_I18N_V4' "$COMPOSER"
grep -q 'PMD_PAYMENT_PLATFORM_I18N_V4' "$PAYMENT"
grep -q 'PMD_PAYMENT_POLICY_PLATFORM_I18N_V4' "$POLICY"

echo "GLOBAL_PLATFORM_MESSAGES_OK=1"
echo "SIDE_MENU_PLATFORM_I18N_OK=1"
echo "CASHIER_PLATFORM_I18N_OK=1"
echo "PAYMENT_PLATFORM_I18N_OK=1"
echo "CATALOG_VALIDATION_OK=1"

echo "[8/8] Re-running full live platform audit (read-only)..."
python3 "$TMP/audit.py" "$ROOT" \
  --json-out "$OUT/platform-i18n-audit-after.json" \
  --tsv-out "$OUT/platform-i18n-candidates-after.tsv" \
  | tee "$OUT/platform-i18n-audit-after.txt"

for path in "$BOOT" "$SIDE" "$COMPOSER" "$PAYMENT" "$POLICY"; do
  sha256sum "$path" >> "$BACKUP/hashes.after"
done
if [ -f "$POLICY_ALIAS" ]; then sha256sum "$POLICY_ALIAS" >> "$BACKUP/hashes.after"; fi

echo "============================================================"
echo " SEMANTIC RECOVERY COMPLETE"
echo "============================================================"
echo "SEMANTIC_RECOVERY_OK=1"
echo "BACKUP=$BACKUP"
echo "OUTPUT=$OUT"
echo "NEXT=Hard refresh CashierLab in German, verify the order card, then open Payment and verify it too."
