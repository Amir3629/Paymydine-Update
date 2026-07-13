from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text()

if "pmd-waiter-floor-edit-v160.6" not in text:
    raise SystemExit("Expected V160.6 source not found")

anchor = """  function setImportant(element, property, value) {
    if (!element || !element.style) return;
    element.style.setProperty(property, value, 'important');
  }
"""
insert = """  function setImportant(element, property, value) {
    if (!element || !element.style) return;
    element.style.setProperty(property, value, 'important');
  }

  /* V175c globally writes transform:none to anything it identifies as a floor
   * tile. Expanded waiter-floor coordinates are stored as CENTER percentages,
   * so removing translate(-50%, -50%) shifts a table by half its own size.
   * Block only that invalid write, and only for registered real floor tables. */
  var transformStyleOwners = window.PMD_V160_TRANSFORM_STYLE_OWNERS || new WeakMap();
  window.PMD_V160_TRANSFORM_STYLE_OWNERS = transformStyleOwners;

  function installRealTableTransformGuard() {
    if (window.PMD_V160_REAL_TABLE_TRANSFORM_GUARD) return;

    var originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
    window.PMD_V160_ORIGINAL_STYLE_SET_PROPERTY = originalSetProperty;

    CSSStyleDeclaration.prototype.setProperty = function (property, value, priority) {
      var owner = transformStyleOwners.get(this);
      var prop = String(property == null ? '' : property).toLowerCase();
      var val = String(value == null ? '' : value).replace(/\\s+/g, ' ').trim().toLowerCase();

      if (
        owner &&
        owner.isConnected &&
        prop === 'transform' &&
        val === 'none' &&
        !isCompact()
      ) {
        var map = floorMap();
        if (map && map.contains(owner)) {
          return originalSetProperty.call(
            this,
            property,
            'translate(-50%, -50%)',
            'important'
          );
        }
      }

      return originalSetProperty.apply(this, arguments);
    };

    window.PMD_V160_REAL_TABLE_TRANSFORM_GUARD = true;
  }

  function registerRealTableTransforms() {
    installRealTableTransformGuard();

    tables().forEach(function (table) {
      if (!table || !table.style) return;
      transformStyleOwners.set(table.style, table);
      setImportant(table, 'transform', 'translate(-50%, -50%)');
    });
  }
"""
if text.count(anchor) != 1:
    raise SystemExit(f"setImportant anchor count={text.count(anchor)}")
text = text.replace(anchor, insert, 1)

old_mark = """  function markAuthority() {
    var r = root();
    var map = floorMap();
    if (r) r.classList.add('pmd-v160-layout-authority');
    if (map) map.setAttribute('data-pmd-v160-layout-authority', '1');
  }
"""
new_mark = """  function markAuthority() {
    var r = root();
    var map = floorMap();
    if (r) r.classList.add('pmd-v160-layout-authority');
    if (map) map.setAttribute('data-pmd-v160-layout-authority', '1');
    registerRealTableTransforms();
  }
"""
if text.count(old_mark) != 1:
    raise SystemExit(f"markAuthority anchor count={text.count(old_mark)}")
text = text.replace(old_mark, new_mark, 1)

old_identity = """    proxy.setAttribute('data-pmd-v160-proxy-table', table.getAttribute('data-table') || '');
    proxy.removeAttribute('data-table');

    /* Critical isolation: V175c/V183 search globally for the real floor-table
     * classes. Keep none of those classes on the proxy. */
    proxy.className = 'pmd-v160-drag-proxy pmd-v160-dragging-table';
"""
new_identity = """    proxy.setAttribute('data-pmd-v160-proxy-table', table.getAttribute('data-table') || '');

    [
      'data-table',
      'data-table-number',
      'data-table-no',
      'data-pmd-table-number',
      'data-pmd-table-no'
    ].forEach(function (attribute) {
      proxy.removeAttribute(attribute);
    });

    /* Keep visual/status classes needed by the number and top-right badges, but
     * remove every selector used by V175c/V183 to identify a live floor tile. */
    var unsafeProxyClasses = new Set([
      'pmd-w5-table',
      'pmd-v155-table',
      'pmd-floor-table',
      'pmd-waiter-floor-table'
    ]);
    var safeProxyClasses = Array.prototype.slice.call(table.classList).filter(function (className) {
      return !unsafeProxyClasses.has(className) && className.indexOf('pmd-v160-') !== 0;
    });
    safeProxyClasses.push('pmd-v160-drag-proxy', 'pmd-v160-dragging-table');
    proxy.className = safeProxyClasses.join(' ');
"""
if text.count(old_identity) != 1:
    raise SystemExit(f"proxy identity anchor count={text.count(old_identity)}")
text = text.replace(old_identity, new_identity, 1)

old_contain = "    setImportant(proxy, 'contain', 'layout paint style');"
new_contain = "    setImportant(proxy, 'contain', 'none');"
if text.count(old_contain) != 1:
    raise SystemExit(f"proxy contain anchor count={text.count(old_contain)}")
text = text.replace(old_contain, new_contain, 1)

# Re-register the real table before and after the final center write.
old_drop = """      settled = nearestFreeCenter(desired, finished, occupied, mapRect);
      writeCenter(finished.table, settled, mapRect);
"""
new_drop = """      settled = nearestFreeCenter(desired, finished, occupied, mapRect);
      transformStyleOwners.set(finished.table.style, finished.table);
      writeCenter(finished.table, settled, mapRect);
      setImportant(finished.table, 'transform', 'translate(-50%, -50%)');
"""
if text.count(old_drop) != 1:
    raise SystemExit(f"drop write anchor count={text.count(old_drop)}")
text = text.replace(old_drop, new_drop, 1)

text = text.replace("pmd-waiter-floor-edit-v160.6", "pmd-waiter-floor-edit-v160.7")
text = text.replace("dragVisual: 'body-fixed-classless-proxy'", "dragVisual: 'body-fixed-safe-visual-proxy'")
text = text.replace(
    "[PMD] Waiter floor edit V160.6 body-fixed classless proxy authority active",
    "[PMD] Waiter floor edit V160.7 transform-guard badge-attached authority active",
)

# Add diagnostics beside proxyActive.
old_debug = """        proxyActive: !!(drag && drag.proxy && drag.proxy.isConnected),
        tableCount: tableNodes.length,
"""
new_debug = """        proxyActive: !!(drag && drag.proxy && drag.proxy.isConnected),
        transformGuardActive: !!window.PMD_V160_REAL_TABLE_TRANSFORM_GUARD,
        transformMismatchTables: Array.prototype.slice.call(tableNodes).filter(function (table) {
          return table.style.getPropertyValue('transform') !== 'translate(-50%, -50%)';
        }).map(function (table) {
          return table.getAttribute('data-table') || '';
        }),
        tableCount: tableNodes.length,
"""
if text.count(old_debug) != 1:
    raise SystemExit(f"debug anchor count={text.count(old_debug)}")
text = text.replace(old_debug, new_debug, 1)

required = [
    "pmd-waiter-floor-edit-v160.7",
    "PMD_V160_REAL_TABLE_TRANSFORM_GUARD",
    "transformStyleOwners",
    "originalSetProperty.call",
    "body-fixed-safe-visual-proxy",
    "unsafeProxyClasses",
    "setImportant(proxy, 'contain', 'none')",
    "transformMismatchTables",
    "V160.7 transform-guard badge-attached authority active",
]
for marker in required:
    if marker not in text:
        raise SystemExit(f"Missing V160.7 marker: {marker}")

for forbidden in [
    "pmd-waiter-floor-edit-v160.6",
    "body-fixed-classless-proxy",
    "setImportant(proxy, 'contain', 'layout paint style')",
]:
    if forbidden in text:
        raise SystemExit(f"Forbidden V160.6 marker remains: {forbidden}")

path.write_text(text)
print("PMD_V160_7_PATCH_OK")
