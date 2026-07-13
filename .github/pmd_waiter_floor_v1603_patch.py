from pathlib import Path

path = Path('app/admin/assets/js/pmd-waiter-floor-edit-v160.js')
text = path.read_text()

replacements = [
    (
"""  function isEditing() {
    var r = root();
    return !!(r && r.classList.contains('pmd-w19-editing'));
  }
""",
"""  function toolbarState() {
    return window.PMDWaiterFloorToolbar && window.PMDWaiterFloorToolbar.state
      ? window.PMDWaiterFloorToolbar.state
      : null;
  }

  function isEditing() {
    var r = root();
    var state = toolbarState();
    return !!(
      (state && state.edit) ||
      (r && (
        r.classList.contains('pmd-w19-editing') ||
        r.classList.contains('pmd-v21-editing') ||
        r.classList.contains('pmd-v22-editing')
      ))
    );
  }
"""
    ),
    (
"""  function tableFromEvent(event) {
    var target = event && event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return null;
    if (target.closest('button, a, input, textarea, select, [role=\"button\"], .pmd-w19-unmerge, .pmd-v40-unmerge')) return null;
    return target.closest(TABLE_SELECTOR);
  }
""",
"""  /* The floor tile itself is a button. Resolve the tile first and reject only
   * a real interactive child inside it, such as the unmerge control. */
  function tableFromEvent(event) {
    var target = event && event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return null;

    var table = target.closest(TABLE_SELECTOR);
    if (!table) return null;

    var childControl = target.closest('a, input, textarea, select, .pmd-w19-unmerge, .pmd-v40-unmerge, .pmd-v18-unmerge');
    if (childControl && childControl !== table && table.contains(childControl)) return null;

    return table;
  }
"""
    ),
    (
"""  function freezeEditGeometry(snapshot) {
    var r = root();
    if (!r) return;
    r.classList.add('pmd-v160-edit-freeze');
    restoreLayout(snapshot);

    requestAnimationFrame(function () {
      markAuthority();
      restoreLayout(snapshot);
    });
    setTimeout(function () {
      markAuthority();
      restoreLayout(snapshot);
    }, 40);
    setTimeout(function () {
      markAuthority();
      restoreLayout(snapshot);
      repairBrokenColumnLayout();
      r.classList.remove('pmd-v160-edit-freeze');
    }, 180);
  }
""",
"""  function freezeEditGeometry(snapshot) {
    var r = root();
    if (!r) return;
    r.classList.add('pmd-v160-edit-freeze');
    markAuthority();
    restoreLayout(snapshot);

    requestAnimationFrame(function () {
      markAuthority();
      if (!drag) restoreLayout(snapshot);
      r.classList.remove('pmd-v160-edit-freeze');
    });
  }
"""
    ),
    (
"""    var r = root();
    var map = floorMap();
    if (!r || !map || r.getAttribute('data-pmd-v160-column-recovered') === '1') return false;
""",
"""    var map = floorMap();
    if (!map || map.getAttribute('data-pmd-v160-column-recovered') === '1') return false;
"""
    ),
    (
"""    r.setAttribute('data-pmd-v160-column-recovered', '1');
""",
"""    map.setAttribute('data-pmd-v160-column-recovered', '1');
"""
    ),
    (
"""      if (r) r.removeAttribute('data-pmd-v160-column-recovered');
""",
"""      var map = floorMap();
      if (map) map.removeAttribute('data-pmd-v160-column-recovered');
"""
    ),
    (
"""        version: 'pmd-waiter-floor-edit-v160.2',
""",
"""        version: 'pmd-waiter-floor-edit-v160.3',
"""
    ),
    (
"""        editing: isEditing(),
""",
"""        editing: isEditing(),
        toolbarEdit: !!(toolbarState() && toolbarState().edit),
        tableTag: tableNodes.length ? tableNodes[0].tagName : null,
"""
    ),
    (
"""        columnRecovered: !!(root() && root().getAttribute('data-pmd-v160-column-recovered') === '1'),
""",
"""        columnRecovered: !!(map && map.getAttribute('data-pmd-v160-column-recovered') === '1'),
"""
    ),
    (
"""  console.info('[PMD] Waiter floor edit V160.2 stable absolute drag authority active');
""",
"""  console.info('[PMD] Waiter floor edit V160.3 button-safe drag authority active');
"""
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one match, found {count}: {old[:100]!r}')
    text = text.replace(old, new, 1)

path.write_text(text)
print('Patched waiter floor edit JS to V160.3')
