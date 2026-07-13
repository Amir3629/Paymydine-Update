from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

if "pmd-waiter-floor-edit-v160.8" not in text:
    raise SystemExit("Expected V160.8 source not found")

needle = """    var tableNumber = String(table.getAttribute('data-table') || '').trim();
    var visual = getComputedStyle(table);
    var proxy = document.createElement('div');
"""
replacement = """    var tableNumber = String(table.getAttribute('data-table') || '').trim();
    var visual = getComputedStyle(table);
    var borderLeftWidth = parseFloat(visual.borderLeftWidth) || 0;
    var borderTopWidth = parseFloat(visual.borderTopWidth) || 0;
    var proxy = document.createElement('div');
"""
if needle not in text:
    raise SystemExit("Proxy visual anchor not found")
text = text.replace(needle, replacement, 1)

old_left = "setImportant(badge, 'left', (badgeRect.left - tableRect.left).toFixed(2) + 'px');"
new_left = "setImportant(badge, 'left', (badgeRect.left - tableRect.left - borderLeftWidth).toFixed(2) + 'px');"
old_top = "setImportant(badge, 'top', (badgeRect.top - tableRect.top).toFixed(2) + 'px');"
new_top = "setImportant(badge, 'top', (badgeRect.top - tableRect.top - borderTopWidth).toFixed(2) + 'px');"

if old_left not in text or old_top not in text:
    raise SystemExit("Badge offset anchors not found")
text = text.replace(old_left, new_left, 1)
text = text.replace(old_top, new_top, 1)

text = text.replace("pmd-waiter-floor-edit-v160.8", "pmd-waiter-floor-edit-v160.9")
text = text.replace(
    "proxyContent: 'one-number-visible-corner-badges-only',",
    "proxyContent: 'one-number-visible-corner-badges-only',\n        badgeOrigin: 'border-box-corrected',",
    1,
)
text = text.replace(
    "[PMD] Waiter floor edit V160.8 clean number-badge proxy authority active",
    "[PMD] Waiter floor edit V160.9 border-corrected number-badge proxy authority active",
    1,
)

required = [
    "pmd-waiter-floor-edit-v160.9",
    "borderLeftWidth = parseFloat(visual.borderLeftWidth) || 0",
    "borderTopWidth = parseFloat(visual.borderTopWidth) || 0",
    "badgeRect.left - tableRect.left - borderLeftWidth",
    "badgeRect.top - tableRect.top - borderTopWidth",
    "badgeOrigin: 'border-box-corrected'",
    "V160.9 border-corrected number-badge proxy authority active",
]
for item in required:
    if item not in text:
        raise SystemExit(f"Missing V160.9 marker: {item}")

for forbidden in [
    "setImportant(badge, 'left', (badgeRect.left - tableRect.left).toFixed(2)",
    "setImportant(badge, 'top', (badgeRect.top - tableRect.top).toFixed(2)",
]:
    if forbidden in text:
        raise SystemExit(f"Old uncorrected badge offset remains: {forbidden}")

path.write_text(text)
print("Patched V160.9 border-box badge origin")
