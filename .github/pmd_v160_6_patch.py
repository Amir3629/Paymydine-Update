from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text()

if "pmd-waiter-floor-edit-v160.5" not in text:
    raise SystemExit("Expected V160.5 source not found")

needle = """  function writeCenter(table, center, mapRect) {
    writeRatio(table, center.x / mapRect.width, center.y / mapRect.height);
  }
"""
replacement = """  function writeCenter(table, center, mapRect) {
    writeRatio(table, center.x / mapRect.width, center.y / mapRect.height);
  }

  /* The visual drag proxy lives outside the waiter dashboard and uses viewport
   * pixels. It deliberately has no translate transform, so no floor authority
   * can create a half-width / half-height jump. */
  function writeProxyCenter(proxy, center, mapRect, width, height) {
    if (!proxy || !mapRect) return;
    setImportant(proxy, 'left', (mapRect.left + center.x - width / 2).toFixed(2) + 'px');
    setImportant(proxy, 'top', (mapRect.top + center.y - height / 2).toFixed(2) + 'px');
    setImportant(proxy, 'transform', 'none');
  }
"""
if needle not in text:
    raise SystemExit("writeCenter anchor not found")
text = text.replace(needle, replacement, 1)

pattern = re.compile(r"  function createDragProxy\(table, map, mapRect, tableRect, startCenter\) \{.*?\n  \}\n\n  function hideDragSource", re.S)
new_block = """  function createDragProxy(table, map, mapRect, tableRect, startCenter) {
    if (!table || !map || !document.body) return null;

    var visual = getComputedStyle(table);
    var proxy = table.cloneNode(true);
    stripProxyIdentity(proxy);

    proxy.setAttribute('data-pmd-v160-proxy-table', table.getAttribute('data-table') || '');
    proxy.removeAttribute('data-table');

    /* Critical isolation: V175c/V183 search globally for the real floor-table
     * classes. Keep none of those classes on the proxy. */
    proxy.className = 'pmd-v160-drag-proxy pmd-v160-dragging-table';
    proxy.setAttribute('data-pmd-v160-proxy', '1');
    proxy.setAttribute('aria-hidden', 'true');
    proxy.setAttribute('tabindex', '-1');

    setImportant(proxy, 'pointer-events', 'none');
    setImportant(proxy, 'position', 'fixed');
    setImportant(proxy, 'right', 'auto');
    setImportant(proxy, 'bottom', 'auto');
    setImportant(proxy, 'margin', '0');
    setImportant(proxy, 'width', tableRect.width + 'px');
    setImportant(proxy, 'height', tableRect.height + 'px');
    setImportant(proxy, 'min-width', tableRect.width + 'px');
    setImportant(proxy, 'min-height', tableRect.height + 'px');
    setImportant(proxy, 'max-width', tableRect.width + 'px');
    setImportant(proxy, 'max-height', tableRect.height + 'px');
    setImportant(proxy, 'box-sizing', 'border-box');
    setImportant(proxy, 'display', 'flex');
    setImportant(proxy, 'align-items', 'center');
    setImportant(proxy, 'justify-content', 'center');
    setImportant(proxy, 'appearance', 'none');
    setImportant(proxy, '-webkit-appearance', 'none');

    setImportant(proxy, 'background', visual.background);
    setImportant(proxy, 'border', visual.border);
    setImportant(proxy, 'border-radius', visual.borderRadius);
    setImportant(proxy, 'box-shadow', visual.boxShadow);
    setImportant(proxy, 'color', visual.color);
    setImportant(proxy, '-webkit-text-fill-color', visual.webkitTextFillColor || visual.color);
    setImportant(proxy, 'font-family', visual.fontFamily);
    setImportant(proxy, 'font-size', visual.fontSize);
    setImportant(proxy, 'font-weight', visual.fontWeight);
    setImportant(proxy, 'line-height', visual.lineHeight);
    setImportant(proxy, 'letter-spacing', visual.letterSpacing);
    setImportant(proxy, 'text-align', visual.textAlign);
    setImportant(proxy, 'padding', visual.padding);
    setImportant(proxy, 'overflow', 'visible');

    setImportant(proxy, 'transform', 'none');
    setImportant(proxy, 'transition', 'none');
    setImportant(proxy, 'animation', 'none');
    setImportant(proxy, 'visibility', 'visible');
    setImportant(proxy, 'opacity', '1');
    setImportant(proxy, 'z-index', '2147483000');
    setImportant(proxy, 'contain', 'layout paint style');
    setImportant(proxy, 'isolation', 'isolate');
    setImportant(proxy, 'will-change', 'left, top');
    setImportant(proxy, 'user-select', 'none');

    document.body.appendChild(proxy);
    writeProxyCenter(proxy, startCenter, mapRect, tableRect.width, tableRect.height);
    return proxy;
  }

  function hideDragSource"""
text, count = pattern.subn(new_block, text, count=1)
if count != 1:
    raise SystemExit(f"createDragProxy replacement count={count}")

text = text.replace(
    "writeCenter(drag.proxy, desired, mapRect);",
    "writeProxyCenter(drag.proxy, desired, mapRect, drag.width, drag.height);",
    1,
)
text = text.replace(
    "writeCenter(finished.proxy, settled, mapRect);",
    "writeProxyCenter(finished.proxy, settled, mapRect, finished.width, finished.height);",
    1,
)

text = text.replace("pmd-waiter-floor-edit-v160.5", "pmd-waiter-floor-edit-v160.6")
text = text.replace("dragVisual: 'isolated-proxy'", "dragVisual: 'body-fixed-classless-proxy'")
text = text.replace(
    "[PMD] Waiter floor edit V160.5 isolated-proxy drop authority active",
    "[PMD] Waiter floor edit V160.6 body-fixed classless proxy authority active",
)

required = [
    "pmd-waiter-floor-edit-v160.6",
    "body-fixed-classless-proxy",
    "document.body.appendChild(proxy)",
    "proxy.className = 'pmd-v160-drag-proxy pmd-v160-dragging-table'",
    "setImportant(proxy, 'position', 'fixed')",
    "function writeProxyCenter",
    "writeProxyCenter(drag.proxy, desired, mapRect, drag.width, drag.height)",
    "writeProxyCenter(finished.proxy, settled, mapRect, finished.width, finished.height)",
]
for item in required:
    if item not in text:
        raise SystemExit(f"Missing required V160.6 marker: {item}")

for forbidden in [
    "map.appendChild(proxy)",
    "writeCenter(drag.proxy, desired, mapRect)",
    "writeCenter(finished.proxy, settled, mapRect)",
]:
    if forbidden in text:
        raise SystemExit(f"Forbidden old proxy behavior remains: {forbidden}")

path.write_text(text)
print("Patched V160.6 body-fixed classless proxy")
