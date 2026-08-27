#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
PAYMENT_CSS = ROOT / 'app/admin/assets/css/pmd-cashier-payment-clean-v1.css'
PAYMENT_JS = ROOT / 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'
COMPOSER = ROOT / 'app/admin/assets/js/pmd-cashier-order-composer-r51.js'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'

for path in (PAYMENT_CSS, PAYMENT_JS, COMPOSER, CASHIER):
    if not path.is_file():
        raise SystemExit('STOP missing: ' + str(path))

backup = Path('/root') / (
    'paymydine-r82-cashier-payment-flat-layout-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)
for path in (PAYMENT_CSS, COMPOSER, CASHIER):
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

payment_hash_before = hashlib.sha256(PAYMENT_JS.read_bytes()).hexdigest()


def bump_asset(text, filename, version):
    pos = text.find(filename)
    if pos < 0:
        raise SystemExit('STOP asset not found: ' + filename)
    qpos = text.find('?v=', pos)
    if qpos < 0 or qpos > pos + 420:
        raise SystemExit('STOP asset cache key not found: ' + filename)
    end = text.find("'", qpos)
    if end < 0:
        raise SystemExit('STOP asset cache terminator not found: ' + filename)
    return text[:qpos] + '?v=' + version + text[end:]


# ------------------------------------------------------------------
# 1. Cash workspace markup: make the left controls one real column.
#    All canonical data selectors stay unchanged.
# ------------------------------------------------------------------
composer = COMPOSER.read_text(encoding='utf-8')

if 'class="pmd-cashier-cash-left"' not in composer:
    start_marker = "              '<div class=\"pmd-cashier-cash-field\" data-pos-cash-field>',"
    end_marker = "                '<label class=\"pmd-pos-confirm-row\" data-pos-external-confirm-row hidden>"

    start = composer.find(start_marker)
    end = composer.find(end_marker, start)
    if start < 0 or end < 0:
        raise SystemExit('STOP Cashier cash workspace markup not found')

    new_markup = r'''              '<div class="pmd-cashier-cash-field" data-pos-cash-field>',
                '<div class="pmd-cashier-cash-left">',
                  '<div class="pmd-cashier-cash-title">Cash received</div>',
                  '<input type="text" inputmode="decimal" autocomplete="off" class="pmd-pos-payment-input pmd-cashier-cash-input" data-pos-cash-received>',
                  '<div class="pmd-cashier-tenders">',
                    '<button type="button" data-cash-action="exact">Exact</button>',
                    '<button type="button" data-cash-tender="5">€5</button>',
                    '<button type="button" data-cash-tender="10">€10</button>',
                    '<button type="button" data-cash-tender="20">€20</button>',
                    '<button type="button" data-cash-tender="50">€50</button>',
                  '</div>',
                '</div>',
                '<div class="pmd-cashier-keypad" data-cash-keypad>',
                  '<button type="button" data-cash-key="1">1</button>',
                  '<button type="button" data-cash-key="2">2</button>',
                  '<button type="button" data-cash-key="3">3</button>',
                  '<button type="button" data-cash-key="4">4</button>',
                  '<button type="button" data-cash-key="5">5</button>',
                  '<button type="button" data-cash-key="6">6</button>',
                  '<button type="button" data-cash-key="7">7</button>',
                  '<button type="button" data-cash-key="8">8</button>',
                  '<button type="button" data-cash-key="9">9</button>',
                  '<button type="button" data-cash-action="decimal">.</button>',
                  '<button type="button" data-cash-key="0">0</button>',
                  '<button type="button" data-cash-action="backspace" aria-label="Backspace">⌫</button>',
                '</div>',
              '</div>',
'''

    composer = composer[:start] + new_markup + composer[end:]


# ------------------------------------------------------------------
# 2. Replace the entire R81B final geometry tail with one compact owner.
#    This removes the previous nested-frame geometry instead of stacking R82.
# ------------------------------------------------------------------
css = PAYMENT_CSS.read_text(encoding='utf-8')

if '/* PMD_R82_CASHIER_PAYMENT_FLAT_RESPONSIVE_LAYOUT */' not in css:
    markers = (
        '/* PMD_R81B_CASHIER_PAYMENT_REAL_WIDE_OWNER */',
        '/* PMD_R81_CASHIER_PAYMENT_REAL_WIDE_OWNER */',
        '/* PMD_R80_CASHIER_PAYMENT_WORKSPACE_FIT */',
    )
    marker = -1
    for candidate in markers:
        marker = css.find(candidate)
        if marker >= 0:
            break
    if marker < 0:
        raise SystemExit('STOP R80/R81B final payment layout owner not found')

    css = css[:marker].rstrip() + r'''

/* PMD_R82_CASHIER_PAYMENT_FLAT_RESPONSIVE_LAYOUT */
/*
 * One final Cashier Payment geometry owner.
 * Goal: fewer nested visual frames, compact desktop height, and a true
 * two-column cash workspace. Payment/settlement logic is not owned here.
 */

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-dialog {
  box-sizing: border-box !important;
  width: min(1100px, calc(100vw - 32px)) !important;
  max-width: min(1100px, calc(100vw - 32px)) !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: calc(100dvh - 24px) !important;
  overflow: hidden !important;
  border-radius: 18px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-head {
  min-height: 54px !important;
  padding: 8px 14px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-head h2 {
  margin: 0 !important;
  font-size: 20px !important;
  line-height: 1.1 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-head p,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-eyebrow {
  display: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-close {
  width: 40px !important;
  height: 40px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-body {
  display: block !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  padding: 8px 12px 10px !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  scrollbar-gutter: stable !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-main {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 0 !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: visible !important;
}

/* Balance is the only tinted summary surface. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-balance {
  margin: 0 0 6px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-balance-card,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-balance-hero {
  box-sizing: border-box !important;
  min-height: 50px !important;
  padding: 9px 12px !important;
  border: 0 !important;
  border-radius: 11px !important;
  box-shadow: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-balance-hero b {
  font-size: 25px !important;
}

/* Flatten section wrappers: one separator, not a card inside a card. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-main > .pmd-pos-payment-block,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-main > .pmd-pos-adjustments:not([hidden]),
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-main > [data-pos-collection-fields] {
  position: static !important;
  inset: auto !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 8px 2px !important;
  border: 0 !important;
  border-top: 1px solid #dbe7ec !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
  transform: none !important;
  flex: 0 0 auto !important;
  flex-shrink: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-block-title {
  min-height: 18px !important;
  margin: 0 0 6px !important;
  padding: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-block-title b {
  font-size: 13px !important;
  line-height: 1.2 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-block-title span {
  display: none !important;
}

/* Split: compact segmented control plus one flat information strip. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-split-tabs {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 6px !important;
  width: 100% !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-split-tabs > button {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 38px !important;
  height: 38px !important;
  padding: 0 9px !important;
  border-radius: 9px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-split-panel {
  display: block !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-height: 0 !important;
  margin: 6px 0 0 !important;
  padding: 8px 10px !important;
  border: 0 !important;
  border-radius: 9px !important;
  background: #f4f8fa !important;
  box-shadow: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-split-equal {
  min-height: 34px !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Payment method row. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-method-grid {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 7px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-method {
  min-height: 52px !important;
  height: 52px !important;
  padding: 7px 10px !important;
  border-radius: 10px !important;
}

/* Tip + Coupon share one flat row. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-main > .pmd-pos-adjustments:not([hidden]) {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  align-items: start !important;
  gap: 14px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-main > .pmd-pos-adjustments:not([hidden]) > div {
  position: static !important;
  display: grid !important;
  grid-template-rows: auto auto auto !important;
  align-content: start !important;
  gap: 5px !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-adjustments .pmd-pos-payment-block-title {
  margin: 0 0 3px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-tip-buttons {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 6px !important;
  width: 100% !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-tip-buttons > button,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pos-custom-tip]:not([hidden]) {
  width: 100% !important;
  min-width: 0 !important;
  height: 38px !important;
  min-height: 38px !important;
  margin: 0 !important;
  padding: 0 7px !important;
  border-radius: 9px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-coupon-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 104px !important;
  align-items: stretch !important;
  gap: 7px !important;
  width: 100% !important;
  min-width: 0 !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-coupon-row [data-pos-coupon-code],
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-coupon-row [data-pos-coupon-apply] {
  width: 100% !important;
  min-width: 0 !important;
  height: 38px !important;
  min-height: 38px !important;
  margin: 0 !important;
  border-radius: 9px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-coupon-result {
  min-height: 0 !important;
  margin: 0 !important;
}

/* Real two-column cash workspace: left stack + independent keypad. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pos-collection-fields] .pmd-pos-payment-fields {
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pos-cash-field] {
  display: grid !important;
  grid-template-columns: minmax(0, .88fr) minmax(390px, 1.12fr) !important;
  align-items: start !important;
  align-content: start !important;
  gap: 14px !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-cash-left {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  gap: 8px !important;
  width: 100% !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 2px 0 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-cash-title {
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  color: #557487 !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
  font-weight: 850 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pos-cash-received] {
  -moz-appearance: textfield !important;
  appearance: textfield !important;
  width: 100% !important;
  max-width: none !important;
  height: 48px !important;
  min-height: 48px !important;
  margin: 0 !important;
  padding: 0 12px !important;
  text-align: center !important;
  font-size: 19px !important;
  font-weight: 900 !important;
  line-height: 48px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pos-cash-received]::-webkit-outer-spin-button,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pos-cash-received]::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-tenders {
  display: grid !important;
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  gap: 6px !important;
  width: 100% !important;
  min-width: 0 !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-tenders > button {
  width: 100% !important;
  min-width: 0 !important;
  height: 36px !important;
  min-height: 36px !important;
  margin: 0 !important;
  padding: 0 4px !important;
  border-radius: 8px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-keypad {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  grid-auto-rows: 42px !important;
  align-self: start !important;
  gap: 6px !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-keypad > button {
  width: 100% !important;
  min-width: 0 !important;
  height: 42px !important;
  min-height: 42px !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 9px !important;
  font-size: 16px !important;
  line-height: 1 !important;
}

/* Footer is a clean action row, not another framed card. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-summary {
  position: static !important;
  inset: auto !important;
  z-index: auto !important;
  box-sizing: border-box !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(300px, .72fr) !important;
  align-items: stretch !important;
  gap: 8px !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 8px 2px 0 !important;
  border: 0 !important;
  border-top: 1px solid #dbe7ec !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
  transform: none !important;
  flex: 0 0 auto !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-summary > [data-pos-payment-totals] {
  grid-column: 1 / -1 !important;
  min-width: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-summary > .pmd-pos-change-box,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-summary > [data-pos-change-box] {
  position: static !important;
  grid-column: 1 !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 44px !important;
  margin: 0 !important;
  padding: 8px 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 9px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-summary > .pmd-pos-pay-button,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-summary > [data-pos-pay-button] {
  position: static !important;
  grid-column: 2 !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 44px !important;
  height: 44px !important;
  margin: 0 !important;
  border-radius: 9px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-summary > .pmd-pos-payment-secondary,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-summary > .pmd-pos-payment-history-wrap,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-summary > .pmd-pos-payment-safety {
  grid-column: 1 / -1 !important;
  position: static !important;
}

/* Compact height profile for common laptop/embedded frames. */
@media (min-width: 901px) and (max-height: 780px) {
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-head {
    min-height: 48px !important;
    padding: 6px 12px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-body {
    padding-top: 6px !important;
    padding-bottom: 7px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-balance-card,
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-balance-hero {
    min-height: 44px !important;
    padding: 7px 10px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-main > .pmd-pos-payment-block,
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-main > .pmd-pos-adjustments:not([hidden]),
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-main > [data-pos-collection-fields] {
    padding-top: 6px !important;
    padding-bottom: 6px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-split-tabs > button {
    min-height: 34px !important;
    height: 34px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-split-panel {
    padding-top: 6px !important;
    padding-bottom: 6px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-method {
    min-height: 46px !important;
    height: 46px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-tip-buttons > button,
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  [data-pos-custom-tip]:not([hidden]),
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-coupon-row [data-pos-coupon-code],
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-coupon-row [data-pos-coupon-apply] {
    min-height: 34px !important;
    height: 34px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  [data-pos-cash-received] {
    min-height: 42px !important;
    height: 42px !important;
    line-height: 42px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-cashier-keypad {
    grid-auto-rows: 36px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-cashier-keypad > button {
    min-height: 36px !important;
    height: 36px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-cashier-tenders > button {
    min-height: 32px !important;
    height: 32px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-summary > .pmd-pos-change-box,
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-summary > [data-pos-change-box],
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-summary > .pmd-pos-pay-button,
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-summary > [data-pos-pay-button] {
    min-height: 40px !important;
    height: 40px !important;
  }
}

/* Tablet/mobile: natural vertical flow and safe scrolling. */
@media (max-width: 900px) {
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-dialog {
    width: calc(100vw - 12px) !important;
    max-width: calc(100vw - 12px) !important;
    max-height: calc(100dvh - 12px) !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-main > .pmd-pos-adjustments:not([hidden]) {
    grid-template-columns: 1fr !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  [data-pos-cash-field] {
    grid-template-columns: 1fr !important;
    gap: 9px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-summary {
    grid-template-columns: 1fr !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-summary > .pmd-pos-change-box,
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-summary > [data-pos-change-box],
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-summary > .pmd-pos-pay-button,
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-summary > [data-pos-pay-button] {
    grid-column: 1 !important;
  }
}

@media (max-width: 620px) {
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-split-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-method-grid {
    grid-template-columns: 1fr 1fr !important;
  }
}
'''

PAYMENT_CSS.write_text(css, encoding='utf-8')

# Fresh CSS cache in the Cashier Composer.
composer = bump_asset(
    composer,
    'pmd-cashier-payment-clean-v1.css',
    '20260827-r82-flat-responsive-layout',
)
COMPOSER.write_text(composer, encoding='utf-8')

# Fresh Composer cache in Cashierlab.
php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260827-r82-payment-flat-responsive',
)
CASHIER.write_text(php, encoding='utf-8')

print('+ node --check', COMPOSER)
subprocess.run(['node', '--check', str(COMPOSER)], cwd=ROOT, check=True)

print('+ php -l', CASHIER)
subprocess.run(['php', '-l', str(CASHIER)], cwd=ROOT, check=True)

payment_hash_after = hashlib.sha256(PAYMENT_JS.read_bytes()).hexdigest()
if payment_hash_after != payment_hash_before:
    raise SystemExit('STOP: Payment V3 changed unexpectedly')

print('')
print('R82 CASHIER PAYMENT FLAT RESPONSIVE LAYOUT APPLIED')
print('Backup:', backup)
print('- R81B final layout tail replaced; R82 is not stacked on top')
print('- modal remains 1100px desktop width')
print('- nested section cards flattened into simple separators')
print('- cash amount/tenders are one left column; keypad is one right column')
print('- artificial empty Cash workspace gaps removed')
print('- common short desktop frames use a compact height profile')
print('- tablet/mobile stays vertical and scroll-safe')
print('- Payment V3 implementation hash unchanged:', payment_hash_after)
print('- settlement / split / coupon / tip / terminal / invoice backend changed: 0')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
