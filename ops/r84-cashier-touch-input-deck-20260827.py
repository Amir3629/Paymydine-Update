#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import re
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
    'paymydine-r84-cashier-touch-input-' +
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
# 1. Cashier payment markup: balanced cash controls + reusable touch deck.
#    The canonical Payment V3 implementation remains untouched.
# ------------------------------------------------------------------
composer = COMPOSER.read_text(encoding='utf-8')

old_five = '<button type="button" data-cash-tender="5">€5</button>'
new_hundred = '<button type="button" data-cash-tender="100">€100</button>'
if new_hundred not in composer:
    if composer.count(old_five) != 1:
        raise SystemExit(
            'STOP €5 tender target count: ' + str(composer.count(old_five))
        )
    composer = composer.replace(old_five, new_hundred, 1)

old_cash_input = (
    "                    '<input type=\"text\" inputmode=\"decimal\" "
    "autocomplete=\"off\" class=\"pmd-pos-payment-input "
    "pmd-cashier-cash-input\" data-pos-cash-received>',"
)
new_cash_input = r'''                    '<div class="pmd-cashier-cash-input-wrap">',
                      '<input type="text" inputmode="decimal" autocomplete="off" class="pmd-pos-payment-input pmd-cashier-cash-input" data-pos-cash-received>',
                      '<button type="button" class="pmd-cashier-cash-clear" data-cash-action="clear" aria-label="Clear cash received">×</button>',
                    '</div>','''
if 'class="pmd-cashier-cash-input-wrap"' not in composer:
    if composer.count(old_cash_input) != 1:
        raise SystemExit(
            'STOP cash input target count: ' + str(composer.count(old_cash_input))
        )
    composer = composer.replace(old_cash_input, new_cash_input, 1)

alpha_marker = 'data-touch-alpha-keypad'
if alpha_marker not in composer:
    alpha_anchor = r'''                      '<button type="button" data-cash-action="backspace" aria-label="Backspace">⌫</button>',
                    '</div>',

                    '<div class="pmd-cashier-tenders">','''
    alpha_markup = r'''                      '<button type="button" data-cash-action="backspace" aria-label="Backspace">⌫</button>',
                    '</div>',

                    '<div class="pmd-cashier-alpha-keypad" data-touch-alpha-keypad hidden>',
                      '<button type="button" data-touch-key="1">1</button>',
                      '<button type="button" data-touch-key="2">2</button>',
                      '<button type="button" data-touch-key="3">3</button>',
                      '<button type="button" data-touch-key="4">4</button>',
                      '<button type="button" data-touch-key="5">5</button>',
                      '<button type="button" data-touch-key="6">6</button>',
                      '<button type="button" data-touch-key="7">7</button>',
                      '<button type="button" data-touch-key="8">8</button>',
                      '<button type="button" data-touch-key="9">9</button>',
                      '<button type="button" data-touch-key="0">0</button>',
                      '<button type="button" data-touch-key="Q">Q</button>',
                      '<button type="button" data-touch-key="W">W</button>',
                      '<button type="button" data-touch-key="E">E</button>',
                      '<button type="button" data-touch-key="R">R</button>',
                      '<button type="button" data-touch-key="T">T</button>',
                      '<button type="button" data-touch-key="Z">Z</button>',
                      '<button type="button" data-touch-key="U">U</button>',
                      '<button type="button" data-touch-key="I">I</button>',
                      '<button type="button" data-touch-key="O">O</button>',
                      '<button type="button" data-touch-key="P">P</button>',
                      '<button type="button" data-touch-key="A">A</button>',
                      '<button type="button" data-touch-key="S">S</button>',
                      '<button type="button" data-touch-key="D">D</button>',
                      '<button type="button" data-touch-key="F">F</button>',
                      '<button type="button" data-touch-key="G">G</button>',
                      '<button type="button" data-touch-key="H">H</button>',
                      '<button type="button" data-touch-key="J">J</button>',
                      '<button type="button" data-touch-key="K">K</button>',
                      '<button type="button" data-touch-key="L">L</button>',
                      '<button type="button" data-touch-action="backspace" aria-label="Backspace">⌫</button>',
                      '<button type="button" data-touch-key="Y">Y</button>',
                      '<button type="button" data-touch-key="X">X</button>',
                      '<button type="button" data-touch-key="C">C</button>',
                      '<button type="button" data-touch-key="V">V</button>',
                      '<button type="button" data-touch-key="B">B</button>',
                      '<button type="button" data-touch-key="N">N</button>',
                      '<button type="button" data-touch-key="M">M</button>',
                      '<button type="button" data-touch-key="-">-</button>',
                      '<button type="button" data-touch-key="_">_</button>',
                      '<button type="button" data-touch-key=".">.</button>',
                      '<button type="button" class="is-space" data-touch-action="space" aria-label="Space">␠</button>',
                      '<button type="button" class="is-clear" data-touch-action="clear" aria-label="Clear">C</button>',
                    '</div>',

                    '<div class="pmd-cashier-tenders">','''
    if composer.count(alpha_anchor) != 1:
        raise SystemExit(
            'STOP alpha keypad anchor count: ' + str(composer.count(alpha_anchor))
        )
    composer = composer.replace(alpha_anchor, alpha_markup, 1)


# ------------------------------------------------------------------
# 2. Replace the Cash keypad binder with one touch-input owner.
#    Numeric keypad targets cash, custom tip, custom split amount and
#    by-item quantities. Coupon/reference text fields get QWERTZ + numbers.
# ------------------------------------------------------------------
new_bind = r'''  function bindCashKeypad(root) {
    var pad = root.querySelector('[data-cash-keypad]');
    var alpha = root.querySelector('[data-touch-alpha-keypad]');
    var cash = root.querySelector('[data-pos-cash-received]');

    if (
      !pad ||
      !cash ||
      pad.dataset.pmdR84Bound === '1'
    ) {
      return;
    }

    pad.dataset.pmdR84Bound = '1';

    var activeInput = cash;
    var activeKind = 'number';
    var paymentSession = '';
    var tenderStarted = false;

    function sessionReady() {
      var current = String(
        state.payment.idempotencyKey || ''
      );

      if (paymentSession !== current) {
        paymentSession = current;
        tenderStarted = false;
        pad.dataset.pmdEdited = '0';
        cash.dataset.pmdTouchEdited = '0';
        setTarget(cash);
      }
    }

    function targetKind(input) {
      if (
        !input ||
        !root.contains(input) ||
        input.disabled
      ) {
        return '';
      }

      if (
        input.matches(
          '[data-pos-coupon-code], ' +
          '[data-pos-payment-reference], ' +
          '[data-pos-payer-label]'
        )
      ) {
        return 'alpha';
      }

      if (
        input.matches(
          '[data-pos-cash-received], ' +
          '[data-pos-custom-tip], ' +
          '[data-custom-payment], ' +
          '[data-pay-item]'
        )
      ) {
        return 'number';
      }

      return '';
    }

    function setTarget(input) {
      var kind = targetKind(input);
      if (!kind) return;

      if (activeInput && activeInput !== input) {
        activeInput.classList.remove(
          'is-pmd-touch-target'
        );
      }

      if (activeInput !== input) {
        input.dataset.pmdTouchEdited = '0';
      }

      activeInput = input;
      activeKind = kind;
      activeInput.classList.add(
        'is-pmd-touch-target'
      );
      activeInput.setAttribute(
        'inputmode',
        'none'
      );

      pad.hidden = kind !== 'number';
      if (alpha) {
        alpha.hidden = kind !== 'alpha';
      }
    }

    function write(input, value) {
      if (!input) return;

      input.value = String(
        value == null ? '' : value
      );

      input.dispatchEvent(
        new Event('input', {
          bubbles: true
        })
      );
    }

    function focusTarget() {
      if (!activeInput) return;
      try {
        activeInput.focus({
          preventScroll: true
        });
      } catch (_) {
        try { activeInput.focus(); } catch (_) {}
      }
    }

    function numericBase(input) {
      if (!input) return '';

      if (
        input.dataset.pmdTouchEdited !== '1'
      ) {
        input.dataset.pmdTouchEdited = '1';
        return '';
      }

      return String(input.value || '');
    }

    function numericStepAllowsDecimal(input) {
      return String(
        input.getAttribute('step') || ''
      ) !== '1';
    }

    function writeNumericKey(input, key) {
      var text = numericBase(input);

      if (key === '.') {
        if (!numericStepAllowsDecimal(input)) {
          return;
        }

        if (text.indexOf('.') === -1) {
          text = text ? text + '.' : '0.';
        }
      } else {
        text += String(key || '');
      }

      if (text.length > 14) return;

      var maxAttr = input.getAttribute('max');
      if (
        maxAttr !== null &&
        maxAttr !== '' &&
        text !== '' &&
        text.slice(-1) !== '.'
      ) {
        var maxValue = Number(maxAttr);
        var numericValue = Number(text);
        if (
          Number.isFinite(maxValue) &&
          Number.isFinite(numericValue) &&
          numericValue > maxValue
        ) {
          text = String(maxValue);
        }
      }

      write(input, text);
    }

    function backspace(input) {
      if (!input) return;
      input.dataset.pmdTouchEdited = '1';
      write(
        input,
        String(input.value || '').slice(0, -1)
      );
    }

    function clearInput(input) {
      if (!input) return;
      input.dataset.pmdTouchEdited = '1';
      write(input, '');
    }

    root.addEventListener(
      'focusin',
      function (event) {
        var kind = targetKind(event.target);
        if (kind) {
          sessionReady();
          setTarget(event.target);
        }
      }
    );

    root.addEventListener(
      'input',
      function (event) {
        if (!targetKind(event.target)) return;
        event.target.dataset.pmdTouchEdited = '1';

        if (event.target === cash) {
          tenderStarted = true;
          pad.dataset.pmdEdited = '1';
        }
      }
    );

    root.addEventListener(
      'click',
      function (event) {
        sessionReady();

        var customTipButton =
          event.target.closest &&
          event.target.closest(
            '[data-tip-percent="custom"]'
          );

        if (customTipButton) {
          var customTip = root.querySelector(
            '[data-pos-custom-tip]'
          );
          if (customTip && !customTip.hidden) {
            setTarget(customTip);
            focusTarget();
          }
          return;
        }

        var customSplitButton =
          event.target.closest &&
          event.target.closest(
            '[data-split-mode="custom"]'
          );

        if (customSplitButton) {
          var customAmount = root.querySelector(
            '[data-custom-payment]'
          );
          if (customAmount) {
            setTarget(customAmount);
            focusTarget();
          }
          return;
        }

        if (
          event.target.closest &&
          event.target.closest(
            '[data-pos-coupon-apply]'
          )
        ) {
          setTarget(cash);
          return;
        }

        var button =
          event.target.closest &&
          event.target.closest(
            '[data-cash-key], ' +
            '[data-cash-action], ' +
            '[data-cash-tender], ' +
            '[data-touch-key], ' +
            '[data-touch-action]'
          );

        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        if (
          button.hasAttribute(
            'data-cash-tender'
          )
        ) {
          setTarget(cash);

          var step = Math.max(
            1,
            num(
              button.getAttribute(
                'data-cash-tender'
              ),
              1
            )
          );

          var base = tenderStarted
            ? Math.max(0, num(cash.value, 0))
            : 0;

          tenderStarted = true;
          pad.dataset.pmdEdited = '1';
          cash.dataset.pmdTouchEdited = '1';

          write(
            cash,
            roundMoney(base + step).toFixed(2)
          );
          focusTarget();
          return;
        }

        var action = button.getAttribute(
          'data-cash-action'
        );

        if (action) {
          setTarget(cash);

          if (action === 'exact') {
            tenderStarted = true;
            pad.dataset.pmdEdited = '1';
            cash.dataset.pmdTouchEdited = '1';
            write(
              cash,
              cashierCashPayable().toFixed(2)
            );
          } else if (action === 'clear') {
            tenderStarted = true;
            pad.dataset.pmdEdited = '1';
            clearInput(cash);
          } else if (action === 'backspace') {
            tenderStarted = true;
            pad.dataset.pmdEdited = '1';
            backspace(cash);
          } else if (action === 'decimal') {
            tenderStarted = true;
            pad.dataset.pmdEdited = '1';
            writeNumericKey(cash, '.');
          }

          focusTarget();
          return;
        }

        if (
          button.hasAttribute(
            'data-cash-key'
          )
        ) {
          if (activeKind !== 'number') {
            setTarget(cash);
          }

          if (activeInput === cash) {
            tenderStarted = true;
            pad.dataset.pmdEdited = '1';
          }

          writeNumericKey(
            activeInput,
            button.getAttribute(
              'data-cash-key'
            )
          );
          focusTarget();
          return;
        }

        if (
          button.hasAttribute(
            'data-touch-key'
          )
        ) {
          if (activeKind !== 'alpha') return;
          activeInput.dataset.pmdTouchEdited = '1';
          write(
            activeInput,
            String(activeInput.value || '') +
            String(
              button.getAttribute(
                'data-touch-key'
              ) || ''
            )
          );
          focusTarget();
          return;
        }

        var touchAction = button.getAttribute(
          'data-touch-action'
        );

        if (touchAction && activeKind === 'alpha') {
          if (touchAction === 'backspace') {
            backspace(activeInput);
          } else if (touchAction === 'clear') {
            clearInput(activeInput);
          } else if (touchAction === 'space') {
            activeInput.dataset.pmdTouchEdited = '1';
            write(
              activeInput,
              String(activeInput.value || '') + ' '
            );
          }
          focusTarget();
        }
      }
    );

    sessionReady();
    setTarget(cash);
  }
'''

bind_pattern = re.compile(
    r"  function bindCashKeypad\(root\) \{.*?\n  \}\n\n(?=  function )",
    re.S,
)

matches = list(bind_pattern.finditer(composer))
if len(matches) != 1:
    raise SystemExit(
        'STOP bindCashKeypad target count: ' + str(len(matches))
    )
composer = bind_pattern.sub(new_bind + '\n', composer, count=1)

# Fresh Cashier-only visual asset key.
composer = bump_asset(
    composer,
    'pmd-cashier-payment-clean-v1.css',
    '20260827-r84-touch-input-deck',
)
COMPOSER.write_text(composer, encoding='utf-8')


# ------------------------------------------------------------------
# 3. Update the single R83 final CSS owner in place.
# ------------------------------------------------------------------
css = PAYMENT_CSS.read_text(encoding='utf-8')
marker_r83 = '/* PMD_R83_CASHIER_PAYMENT_TALLER_TOUCH_TARGETS */'
marker_r84 = '/* PMD_R84_CASHIER_TOUCH_INPUT_DECK */'

if marker_r84 not in css:
    if css.count(marker_r83) != 1:
        raise SystemExit(
            'STOP R83 final owner count: ' + str(css.count(marker_r83))
        )
    css = css.replace(marker_r83, marker_r84, 1)

    compact_marker = '/* Compact height profile for common laptop/embedded frames. */'
    compact_pos = css.find(compact_marker)
    if compact_pos < 0:
        raise SystemExit('STOP compact profile marker not found')

    before = css[:compact_pos]
    after = css[compact_pos:]

    old_tender_grid = (
        'grid-template-columns: repeat(5, minmax(0, 1fr)) !important;'
    )
    tender_count = before.count(old_tender_grid)
    if tender_count != 1:
        raise SystemExit(
            'STOP tender grid target count: ' + str(tender_count)
        )
    before = before.replace(
        old_tender_grid,
        'grid-template-columns: repeat(4, minmax(0, 1fr)) !important;',
        1,
    )

    additions = r'''

/* R84 touch-first Cashier input deck. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-cash-input-wrap {
  grid-area: cash-input !important;
  position: relative !important;
  display: block !important;
  min-width: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-cash-input-wrap [data-pos-cash-received] {
  grid-area: auto !important;
  padding-right: 52px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-cash-clear {
  position: absolute !important;
  top: 50% !important;
  right: 6px !important;
  width: 38px !important;
  min-width: 38px !important;
  height: 38px !important;
  min-height: 38px !important;
  margin: 0 !important;
  padding: 0 !important;
  transform: translateY(-50%) !important;
  border-radius: 9px !important;
  display: grid !important;
  place-items: center !important;
  font-size: 20px !important;
  line-height: 1 !important;
}

/* Two useful tender rows instead of one row plus dead space. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-tenders [data-cash-action="exact"] {
  grid-column: span 2 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-tenders [data-cash-tender="50"],
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-tenders [data-cash-tender="100"] {
  grid-column: span 2 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-tenders > button {
  min-height: 46px !important;
  height: 46px !important;
}

/* One keyboard footprint: numeric for money/quantity, QWERTZ for codes. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-alpha-keypad {
  grid-area: cash-keypad !important;
  display: grid !important;
  grid-template-columns: repeat(10, minmax(0, 1fr)) !important;
  align-self: stretch !important;
  gap: 5px !important;
  width: 100% !important;
  min-width: 0 !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-alpha-keypad[hidden],
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-keypad[hidden] {
  display: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-alpha-keypad > button {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 42px !important;
  height: 42px !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 8px !important;
  display: grid !important;
  place-items: center !important;
  font-size: 13px !important;
  line-height: 1 !important;
  font-weight: 850 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-alpha-keypad > .is-space {
  grid-column: span 8 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-cashier-alpha-keypad > .is-clear {
  grid-column: span 2 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-input.is-pmd-touch-target {
  outline: 2px solid rgba(0, 121, 96, 0.18) !important;
  outline-offset: 1px !important;
}

/* Native spinner chrome is redundant when the touch keypad owns input. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pos-custom-tip],
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-custom-payment],
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pay-item] {
  -moz-appearance: textfield !important;
  appearance: textfield !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pos-custom-tip]::-webkit-outer-spin-button,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pos-custom-tip]::-webkit-inner-spin-button,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-custom-payment]::-webkit-outer-spin-button,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-custom-payment]::-webkit-inner-spin-button,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pay-item]::-webkit-outer-spin-button,
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
[data-pay-item]::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

/* Full mode is self-explanatory: do not repeat amount + helper copy. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-block:has(
  .pmd-pos-split-tabs > [data-split-mode="full"].is-active
) .pmd-pos-split-panel {
  display: none !important;
}

/* Equal split keeps the useful share label/amount, not cashier training text. */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-split-equal small {
  display: none !important;
}
'''

    css = before.rstrip() + additions + '\n\n' + after
    PAYMENT_CSS.write_text(css, encoding='utf-8')


# ------------------------------------------------------------------
# 4. Fresh Cashier composer key; no backend/provider/payment-engine change.
# ------------------------------------------------------------------
php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260827-r84-touch-input-deck',
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
print('R84 CASHIER TOUCH INPUT DECK APPLIED')
print('Backup:', backup)
print('- €5 quick tender replaced by €100')
print('- first denomination tap selects that note; repeated taps accumulate')
print('- Exact still sets the exact payable amount')
print('- Cash received has an inline clear button')
print('- numeric keypad targets Cash, Custom tip, Custom split, and By items quantity')
print('- Coupon/reference text fields use an on-screen QWERTZ + number keyboard')
print('- quick tenders use two rows to remove the dead Cash-column gap')
print('- Full split no longer repeats the amount/helper sentence')
print('- equal split keeps useful data but hides training copy')
print('- Payment V3 implementation hash unchanged:', payment_hash_after)
print('- settlement / split / coupon / tip / terminal / invoice backend changed: 0')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
