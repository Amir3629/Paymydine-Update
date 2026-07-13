from pathlib import Path
import re

path = Path('app/admin/assets/js/pmd-waiter-floor-edit-v160.js')
text = path.read_text()

if 'pmd-waiter-floor-edit-v160.7' not in text:
    raise SystemExit('Expected V160.7 source not found')

pattern = re.compile(
    r"  function createDragProxy\(table, map, mapRect, tableRect, startCenter\) \{.*?\n  \}\n\n  function hideDragSource",
    re.S,
)

replacement = r'''  function createDragProxy(table, map, mapRect, tableRect, startCenter) {
    if (!table || !map || !document.body) return null;

    var tableNumber = String(table.getAttribute('data-table') || '').trim();
    var visual = getComputedStyle(table);
    var proxy = document.createElement('div');

    proxy.className = 'pmd-v160-drag-proxy pmd-v160-dragging-table';
    proxy.setAttribute('data-pmd-v160-proxy', '1');
    proxy.setAttribute('data-pmd-v160-proxy-table', tableNumber);
    proxy.setAttribute('aria-hidden', 'true');

    /* Copy only concrete visual properties. Never clone the live table DOM:
     * it contains hidden Available/status text and duplicate number nodes whose
     * suppression depends on live-table selectors. */
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
    setImportant(proxy, 'display', 'block');
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
    setImportant(proxy, 'padding', '0');
    setImportant(proxy, 'overflow', 'visible');

    setImportant(proxy, 'transform', 'none');
    setImportant(proxy, 'transition', 'none');
    setImportant(proxy, 'animation', 'none');
    setImportant(proxy, 'visibility', 'visible');
    setImportant(proxy, 'opacity', '1');
    setImportant(proxy, 'z-index', '2147483000');
    setImportant(proxy, 'contain', 'none');
    setImportant(proxy, 'isolation', 'isolate');
    setImportant(proxy, 'will-change', 'left, top');
    setImportant(proxy, 'user-select', 'none');

    function copyVisualTree(source, target) {
      if (!source || !target) return;

      var computed = getComputedStyle(source);
      [
        'display', 'box-sizing', 'width', 'height', 'min-width', 'min-height',
        'max-width', 'max-height', 'margin', 'padding', 'background', 'border',
        'border-radius', 'box-shadow', 'color', '-webkit-text-fill-color',
        'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
        'letter-spacing', 'text-align', 'text-shadow', 'white-space', 'opacity',
        'visibility', 'overflow', 'object-fit', 'object-position'
      ].forEach(function (property) {
        var value = computed.getPropertyValue(property);
        if (value) setImportant(target, property, value);
      });

      var sourceChildren = Array.prototype.slice.call(source.children || []);
      var targetChildren = Array.prototype.slice.call(target.children || []);
      sourceChildren.forEach(function (child, index) {
        if (targetChildren[index]) copyVisualTree(child, targetChildren[index]);
      });
    }

    function stripVisualIdentity(node) {
      if (!node) return;
      [node].concat(Array.prototype.slice.call(node.querySelectorAll('[id], [name], [data-table], [data-table-number], [data-table-no]'))).forEach(function (item) {
        item.removeAttribute('id');
        item.removeAttribute('name');
        item.removeAttribute('data-table');
        item.removeAttribute('data-table-number');
        item.removeAttribute('data-table-no');
      });
    }

    /* Exactly one center number. */
    var numberSource = table.querySelector(':scope > .pmd-v175c-table-number');
    var number = document.createElement('span');
    number.className = 'pmd-v160-proxy-number';
    number.textContent = tableNumber;

    var numberVisual = getComputedStyle(numberSource || table);
    setImportant(number, 'position', 'absolute');
    setImportant(number, 'left', '50%');
    setImportant(number, 'top', '50%');
    setImportant(number, 'right', 'auto');
    setImportant(number, 'bottom', 'auto');
    setImportant(number, 'transform', 'translate(-50%, -50%)');
    setImportant(number, 'margin', '0');
    setImportant(number, 'padding', '0');
    setImportant(number, 'display', 'block');
    setImportant(number, 'width', 'auto');
    setImportant(number, 'height', 'auto');
    setImportant(number, 'background', 'transparent');
    setImportant(number, 'border', '0');
    setImportant(number, 'box-shadow', 'none');
    setImportant(number, 'font-family', numberVisual.fontFamily || visual.fontFamily);
    setImportant(number, 'font-size', numberVisual.fontSize || visual.fontSize);
    setImportant(number, 'font-weight', numberVisual.fontWeight || visual.fontWeight);
    setImportant(number, 'font-style', numberVisual.fontStyle || 'normal');
    setImportant(number, 'line-height', numberVisual.lineHeight || '1');
    setImportant(number, 'letter-spacing', numberVisual.letterSpacing || 'normal');
    setImportant(number, 'color', numberVisual.color || visual.color);
    setImportant(number, '-webkit-text-fill-color', numberVisual.webkitTextFillColor || numberVisual.color || visual.color);
    setImportant(number, 'text-shadow', numberVisual.textShadow || 'none');
    setImportant(number, 'white-space', 'nowrap');
    setImportant(number, 'opacity', '1');
    setImportant(number, 'visibility', 'visible');
    setImportant(number, 'pointer-events', 'none');
    setImportant(number, 'z-index', '2');
    proxy.appendChild(number);

    /* Copy only small visible direct children at the top-right corner. These are
     * the waiter/cleaning/note badge and the order-count badge. */
    var visibleCornerBadges = Array.prototype.slice.call(table.children).filter(function (child) {
      if (!child || child === numberSource) return false;

      var childStyle = getComputedStyle(child);
      if (childStyle.display === 'none' || childStyle.visibility === 'hidden' || Number(childStyle.opacity) === 0) return false;

      var rect = child.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.width > 66 || rect.height > 66) return false;

      var className = String(child.className || '');
      var isKnownBadge = /badge|attention|order-count/i.test(className) || child.hasAttribute('data-pmd-kind');
      var nearTopRight = rect.left >= tableRect.right - 72 && rect.top <= tableRect.top + 36;
      return isKnownBadge && nearTopRight;
    });

    visibleCornerBadges.forEach(function (sourceBadge, index) {
      var badgeRect = sourceBadge.getBoundingClientRect();
      var badge = sourceBadge.cloneNode(true);
      stripVisualIdentity(badge);
      copyVisualTree(sourceBadge, badge);

      badge.className = 'pmd-v160-proxy-corner-badge pmd-v160-proxy-corner-badge-' + index;
      setImportant(badge, 'position', 'absolute');
      setImportant(badge, 'left', (badgeRect.left - tableRect.left).toFixed(2) + 'px');
      setImportant(badge, 'top', (badgeRect.top - tableRect.top).toFixed(2) + 'px');
      setImportant(badge, 'right', 'auto');
      setImportant(badge, 'bottom', 'auto');
      setImportant(badge, 'width', badgeRect.width + 'px');
      setImportant(badge, 'height', badgeRect.height + 'px');
      setImportant(badge, 'min-width', badgeRect.width + 'px');
      setImportant(badge, 'min-height', badgeRect.height + 'px');
      setImportant(badge, 'max-width', badgeRect.width + 'px');
      setImportant(badge, 'max-height', badgeRect.height + 'px');
      setImportant(badge, 'margin', '0');
      setImportant(badge, 'transform', 'none');
      setImportant(badge, 'transition', 'none');
      setImportant(badge, 'animation', 'none');
      setImportant(badge, 'visibility', 'visible');
      setImportant(badge, 'opacity', '1');
      setImportant(badge, 'pointer-events', 'none');
      setImportant(badge, 'z-index', String(20 + index));
      proxy.appendChild(badge);
    });

    proxy.setAttribute('data-pmd-v160-proxy-badges', String(visibleCornerBadges.length));
    document.body.appendChild(proxy);
    writeProxyCenter(proxy, startCenter, mapRect, tableRect.width, tableRect.height);
    return proxy;
  }

  function hideDragSource'''

text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'createDragProxy replacement count={count}')

text = text.replace('pmd-waiter-floor-edit-v160.7', 'pmd-waiter-floor-edit-v160.8')
text = text.replace("dragVisual: 'body-fixed-safe-visual-proxy'", "dragVisual: 'body-fixed-clean-shell'")
text = text.replace(
    "[PMD] Waiter floor edit V160.7 transform-guard badge-attached authority active",
    "[PMD] Waiter floor edit V160.8 clean number-badge proxy authority active",
)

text = text.replace(
    "dragVisual: 'body-fixed-clean-shell',",
    "dragVisual: 'body-fixed-clean-shell',\n        proxyContent: 'one-number-visible-corner-badges-only',",
    1,
)

required = [
    'pmd-waiter-floor-edit-v160.8',
    "dragVisual: 'body-fixed-clean-shell'",
    "proxyContent: 'one-number-visible-corner-badges-only'",
    "var proxy = document.createElement('div')",
    "number.className = 'pmd-v160-proxy-number'",
    'visibleCornerBadges',
    'copyVisualTree',
    "data-pmd-v160-proxy-badges",
    "V160.8 clean number-badge proxy authority active",
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'Missing V160.8 marker: {marker}')

for forbidden in [
    'var proxy = table.cloneNode(true)',
    "safeProxyClasses.push('pmd-v160-drag-proxy'",
]:
    if forbidden in text:
        raise SystemExit(f'Forbidden old proxy clone behavior remains: {forbidden}')

path.write_text(text)
print('PMD V160.8 clean visual proxy patched')
