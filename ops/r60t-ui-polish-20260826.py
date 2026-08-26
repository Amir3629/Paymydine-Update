#!/usr/bin/env python3
from pathlib import Path

path = Path('/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/RuntimeOverlays.tsx')
text = path.read_text(encoding='utf-8')
original = text

# KDS/fulfilment presentation: the operational status named "Delivery" is the
# ready-for-table stage in this three-step customer timeline.
status_replacements = [
    (
        "const stage = /ready|complete|on.?way|delivered/.test(statusText) ? 2 : /prepar|cook|kitchen/.test(statusText) ? 1 : 0",
        "const stage = /ready|complete|on.?way|delivered|delivery/.test(statusText) ? 2 : /prepar|cook|kitchen/.test(statusText) ? 1 : 0",
    ),
    (
        "if (/ready|complete|completed|delivered/.test(normalized)) return labels.ready",
        "if (/ready|complete|completed|delivered|delivery/.test(normalized)) return labels.ready",
    ),
]
for old, new in status_replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: expected one KDS status target, found {count}')
    text = text.replace(old, new, 1)

# Only the normal single-order PaymentPanel is used by the R60T private guest
# flow. Keep the hidden legacy MultiOrderPaymentPanel untouched.
marker = "\nfunction MultiOrderPaymentPanel"
if text.count(marker) != 1:
    raise SystemExit('STOP: MultiOrderPaymentPanel boundary not found exactly once')
head, tail = text.split(marker, 1)

old_state = "  const [tipPercent, setTipPercent] = useState(0)\n  const [couponCode, setCouponCode] = useState('')"
new_state = "  const [tipPercent, setTipPercent] = useState(0)\n  const [customTipPercent, setCustomTipPercent] = useState(15)\n  const [customTipActive, setCustomTipActive] = useState(false)\n  const [couponCode, setCouponCode] = useState('')"
if head.count(old_state) != 1:
    raise SystemExit(f'STOP: expected one single-order tip state target, found {head.count(old_state)}')
head = head.replace(old_state, new_state, 1)

old_tips = """      {bootstrap.features.tips && (
        <div className={styles.segmented}>
          {(bootstrap.tips.presets.length ? bootstrap.tips.presets : [0, 5, 10]).slice(0, 4).map((value) => (
            <button key={value} type=\"button\" className={tipPercent === value ? styles.selected : ''} onClick={() => setTipPercent(value)}>{value}% {labels.tip}</button>
          ))}
        </div>
      )}
      {paymentChoices.length > 0 ? ("""
new_tips = """      {bootstrap.features.tips && (
        <div className={styles.stack}>
          <div className={styles.segmented}>
            {(bootstrap.tips.presets.length ? bootstrap.tips.presets : [0, 5, 10]).slice(0, 3).map((value) => (
              <button key={value} type=\"button\" className={!customTipActive && tipPercent === value ? styles.selected : ''} onClick={() => { setCustomTipActive(false); setTipPercent(value) }}>{value}% {labels.tip}</button>
            ))}
            <button type=\"button\" className={customTipActive ? styles.selected : ''} onClick={() => { setCustomTipActive(true); setTipPercent(customTipPercent) }}>Custom</button>
          </div>
          {customTipActive && (
            <label className={styles.label}>Custom tip %
              <input
                className={styles.input}
                type=\"number\"
                min={0}
                max={100}
                step={1}
                inputMode=\"decimal\"
                value={customTipPercent}
                onChange={(event) => {
                  const next = Math.min(100, Math.max(0, Number(event.target.value) || 0))
                  setCustomTipPercent(next)
                  setTipPercent(next)
                }}
              />
            </label>
          )}
        </div>
      )}
      {paymentChoices.length > 0 ? ("""
if head.count(old_tips) != 1:
    raise SystemExit(f'STOP: expected one single-order tip UI target, found {head.count(old_tips)}')
head = head.replace(old_tips, new_tips, 1)
text = head + marker + tail

# Display-only rename. The method code remains cash/cod, so request/settlement
# behavior is unchanged. Apply consistently to both renderers.
old_cash = "{entry.code === 'cash' || entry.code === 'cod' ? <Receipt /> : <CreditCard />} {entry.name}</button>"
new_cash = "{entry.code === 'cash' || entry.code === 'cod' ? <Receipt /> : <CreditCard />} {entry.code === 'cash' || entry.code === 'cod' ? 'Cash' : entry.name}</button>"
cash_count = text.count(old_cash)
if cash_count < 1:
    raise SystemExit('STOP: cash method render target not found')
text = text.replace(old_cash, new_cash)

if text == original:
    raise SystemExit('STOP: no changes made')
path.write_text(text, encoding='utf-8')

print('R60T UI polish applied successfully')
print('- Delivery/Delivered customer status -> Ready')
print('- Cash/cod display label -> Cash (method code unchanged)')
print('- Single-order payment keeps presets and adds Custom tip %')
