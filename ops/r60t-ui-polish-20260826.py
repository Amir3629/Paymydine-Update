#!/usr/bin/env python3
from pathlib import Path

path = Path('/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/RuntimeOverlays.tsx')
text = path.read_text(encoding='utf-8')
original = text

replacements = [
    (
        "const stage = /ready|complete|on.?way|delivered/.test(statusText) ? 2 : /prepar|cook|kitchen/.test(statusText) ? 1 : 0",
        "const stage = /ready|complete|on.?way|delivered|delivery/.test(statusText) ? 2 : /prepar|cook|kitchen/.test(statusText) ? 1 : 0",
    ),
    (
        "if (/ready|complete|completed|delivered/.test(normalized)) return labels.ready",
        "if (/ready|complete|completed|delivered|delivery/.test(normalized)) return labels.ready",
    ),
    (
        "  const [tipPercent, setTipPercent] = useState(0)\n  const [couponCode, setCouponCode] = useState('')",
        "  const [tipPercent, setTipPercent] = useState(0)\n  const [customTipPercent, setCustomTipPercent] = useState(15)\n  const [customTipActive, setCustomTipActive] = useState(false)\n  const [couponCode, setCouponCode] = useState('')",
    ),
    (
        "      {bootstrap.features.tips && (\n        <div className={styles.segmented}>\n          {(bootstrap.tips.presets.length ? bootstrap.tips.presets : [0, 5, 10]).slice(0, 4).map((value) => (\n            <button key={value} type=\"button\" className={tipPercent === value ? styles.selected : ''} onClick={() => setTipPercent(value)}>{value}% {labels.tip}</button>\n          ))}\n        </div>\n      )}\n      {paymentChoices.length > 0 ? (",
        "      {bootstrap.features.tips && (\n        <div className={styles.stack}>\n          <div className={styles.segmented}>\n            {(bootstrap.tips.presets.length ? bootstrap.tips.presets : [0, 5, 10]).slice(0, 3).map((value) => (\n              <button key={value} type=\"button\" className={!customTipActive && tipPercent === value ? styles.selected : ''} onClick={() => { setCustomTipActive(false); setTipPercent(value) }}>{value}% {labels.tip}</button>\n            ))}\n            <button type=\"button\" className={customTipActive ? styles.selected : ''} onClick={() => { setCustomTipActive(true); setTipPercent(customTipPercent) }}>Custom</button>\n          </div>\n          {customTipActive && (\n            <label className={styles.label}>Custom tip %\n              <input\n                className={styles.input}\n                type=\"number\"\n                min={0}\n                max={100}\n                step={1}\n                inputMode=\"decimal\"\n                value={customTipPercent}\n                onChange={(event) => {\n                  const next = Math.min(100, Math.max(0, Number(event.target.value) || 0))\n                  setCustomTipPercent(next)\n                  setTipPercent(next)\n                }}\n              />\n            </label>\n          )}\n        </div>\n      )}\n      {paymentChoices.length > 0 ? (",
    ),
    (
        "{entry.code === 'cash' || entry.code === 'cod' ? <Receipt /> : <CreditCard />} {entry.name}</button>",
        "{entry.code === 'cash' || entry.code === 'cod' ? <Receipt /> : <CreditCard />} {entry.code === 'cash' || entry.code === 'cod' ? 'Cash' : entry.name}</button>",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if old.startswith("{entry.code === 'cash'"):
        if count < 1:
            raise SystemExit('STOP: cash method render target not found')
        text = text.replace(old, new)
        continue
    if count != 1:
        raise SystemExit(f'STOP: expected exactly one target, found {count}: {old[:80]!r}')
    text = text.replace(old, new)

if text == original:
    raise SystemExit('STOP: no changes made')

path.write_text(text, encoding='utf-8')
print('R60T UI polish applied:')
print('- Delivery/Delivered -> Ready in order status UI')
print('- Cash/cod display label -> Cash')
print('- PaymentPanel presets keep 0/5/10-style choices + Custom tip input')
