from pathlib import Path
import re

path = Path('app/admin/views/_layouts/default.blade.php')
s = path.read_text(encoding='utf-8')

compact_css = '''/* Compact mode changes only the floor viewport. The real table nodes keep
 * their saved absolute coordinates, dimensions, colors, numbers and badges. */
html.pmd-waiter-dashboard-active
#pmd-waiter-dashboard-root.pmd-w19-compact
.pmd-w5-floor-map-real {
  height: var(--pmd-v190-floor-height) !important;
  min-height: var(--pmd-v190-floor-height) !important;
  max-height: var(--pmd-v190-floor-height) !important;
  display: block !important;
  position: relative !important;
  padding: 0 !important;
  overflow: var(--pmd-v190-floor-overflow) !important;
  overscroll-behavior: contain !important;
  scrollbar-gutter: stable !important;
}

'''
s, n = re.subn(r'/\* Compact mode \*/\n.*?(?=/\* Order cards must stay clean)', compact_css, s, count=1, flags=re.S)
assert n == 1, 'V19 compact CSS not found'

replacements = [
    ("    compact: localStorage.getItem('pmd_waiter_floor_compact') === '1',", "    compact: false,"),
    ("      '<button class=\"pmd-w19-btn\" data-w19-compact title=\"Compact / expand floor\">▤</button>';", "      '<button type=\"button\" class=\"pmd-w19-btn\" data-w19-compact title=\"Compact floor\" aria-label=\"Compact floor\" aria-pressed=\"false\">▤</button>';"),
    ("    var compact = document.querySelector('[data-w19-compact]');", "    var compact = document.querySelector('#pmd-waiter-dashboard-root .pmd-w19-tools button[data-w19-compact]');"),
    ("    var compact = e.target.closest('[data-w19-compact]');", "    var compact = e.target.closest('#pmd-waiter-dashboard-root .pmd-w19-tools button[data-w19-compact]');"),
]
for old, new in replacements:
    assert old in s, old
    s = s.replace(old, new, 1)

old = """    if (compact) compact.classList.toggle('primary', state.compact);

    if (badge) {"""
new = """    if (compact) {
      compact.classList.toggle('primary', state.compact);
      compact.setAttribute('title', state.compact ? 'Expand floor' : 'Compact floor');
      compact.setAttribute('aria-label', state.compact ? 'Expand floor' : 'Compact floor');
      compact.setAttribute('aria-pressed', state.compact ? 'true' : 'false');
    }

    if (badge) {"""
assert old in s
s = s.replace(old, new, 1)

s, n = re.subn(
    r"  function toggleCompact\(\) \{\n    state\.compact = !state\.compact;\n    state\.edit = false;\n    localStorage\.setItem\('pmd_waiter_floor_compact', state\.compact \? '1' : '0'\);\n    sync\(\);\n  \}",
    """  function toggleCompact() {
    state.compact = !state.compact;
    state.edit = false;
    state.merge = false;
    state.selected.clear();
    sync();
  }""",
    s,
    count=1,
)
assert n == 1, 'toggleCompact not found'

v175 = s.index('<!-- PMD_V175C_NO_DUPE_NO_BLINK_START -->')
head, tail = s[:v175], s[v175:]
floor_css = '''html.pmd-waiter-dashboard-active #pmd-waiter-dashboard-root {
  --pmd-v190-floor-height: clamp(560px, calc(100vh - 220px), 820px);
  --pmd-v190-floor-overflow: visible;
  --pmd-v190-floor-transition: none;
}

html.pmd-waiter-dashboard-active #pmd-waiter-dashboard-root.pmd-w19-compact {
  --pmd-v190-floor-height: clamp(300px, 38vh, 360px);
  --pmd-v190-floor-overflow: auto;
}

html.pmd-waiter-dashboard-active #pmd-waiter-dashboard-root.pmd-v190-floor-ready {
  --pmd-v190-floor-transition: height 220ms cubic-bezier(.2,.8,.2,1), min-height 220ms cubic-bezier(.2,.8,.2,1), max-height 220ms cubic-bezier(.2,.8,.2,1);
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real,
html.pmd-waiter-dashboard-active .pmd-v155-floor-map,
html.pmd-waiter-dashboard-active [class*="floor-map"] {
  height: var(--pmd-v190-floor-height) !important;
  min-height: var(--pmd-v190-floor-height) !important;
  max-height: var(--pmd-v190-floor-height) !important;
  overflow: var(--pmd-v190-floor-overflow) !important;
  background: #ffffff !important;
  transform: none !important;
  transition: var(--pmd-v190-floor-transition) !important;
  animation: none !important;
}'''
tail, n = re.subn(
    r'html\.pmd-waiter-dashboard-active \.pmd-w5-floor-map,\nhtml\.pmd-waiter-dashboard-active \.pmd-w5-floor-map-real,\nhtml\.pmd-waiter-dashboard-active \.pmd-v155-floor-map,\nhtml\.pmd-waiter-dashboard-active \[class\*="floor-map"\] \{.*?\n\}',
    floor_css,
    tail,
    count=1,
    flags=re.S,
)
assert n == 1, 'V175 floor CSS not found'
s = head + tail

s, n = re.subn(
    r"  function repairFloor\(\) \{\n    floorElements\(\)\.forEach\(function \(floor\) \{.*?\n    \}\);\n  \}",
    """  function repairFloor() {
    floorElements().forEach(function (floor) {
      setImportant(floor, 'height', 'var(--pmd-v190-floor-height)');
      setImportant(floor, 'min-height', 'var(--pmd-v190-floor-height)');
      setImportant(floor, 'max-height', 'var(--pmd-v190-floor-height)');
      setImportant(floor, 'overflow', 'var(--pmd-v190-floor-overflow)');
      setImportant(floor, 'background', '#ffffff');
      setImportant(floor, 'transform', 'none');
      setImportant(floor, 'transition', 'var(--pmd-v190-floor-transition)');
      setImportant(floor, 'animation', 'none');
    });
  }""",
    s,
    count=1,
    flags=re.S,
)
assert n == 1, 'V175 repairFloor not found'

start = s.index('<!-- PMD_V191_COMPACT_STRIP_AUTHORITY_START -->')
end_marker = '<!-- PMD_V191_COMPACT_STRIP_AUTHORITY_END -->'
end = s.index(end_marker, start) + len(end_marker)
final = r'''<!-- PMD_V190_CONTAINER_ONLY_FLOOR_COMPACT_START -->
<script id="pmd-v190-container-only-floor-compact-script">
(function () {
  'use strict';
  if (!/\/admin\/dashboardwaiter(?:$|[?#\/])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMDFloorDeterministicV190 && window.PMDFloorDeterministicV190.active) return;

  var ROOT = '#pmd-waiter-dashboard-root';
  var BUTTON = ROOT + ' .pmd-w19-tools button[data-w19-compact]';
  var observer = null;
  var raf = 0;

  function root() { return document.querySelector(ROOT); }
  function floor() { var r = root(); return r ? r.querySelector('.pmd-w5-floor-map-real') : null; }
  function button() { return document.querySelector(BUTTON); }
  function compact() { var r = root(); return !!(r && r.classList.contains('pmd-w19-compact')); }

  function cleanup() {
    document.documentElement.classList.remove(
      'pmd-v184-floor-small', 'pmd-v184-floor-large',
      'pmd-v185-floor-small', 'pmd-v185-floor-large', 'pmd-v185-sizing',
      'pmd-v187-floor-small', 'pmd-v187-floor-large', 'pmd-v187-sizing',
      'pmd-v188-floor-compact', 'pmd-v188-floor-expanded',
      'pmd-v189-floor-compact', 'pmd-v189-floor-expanded'
    );
    document.querySelectorAll('.pmd-v185-floor-scaler, .pmd-v187-floor-scaler').forEach(function (node) {
      var parent = node.parentElement;
      if (!parent) return;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      node.remove();
    });
  }

  function apply() {
    var r = root();
    if (!r) return;
    cleanup();
    r.classList.toggle('pmd-v190-floor-compact', compact());
    r.classList.toggle('pmd-v190-floor-expanded', !compact());
    var f = floor();
    if (f && compact()) f.removeAttribute('data-pmd-v159-full-floor');
    var b = button();
    if (b) {
      b.setAttribute('title', compact() ? 'Expand floor' : 'Compact floor');
      b.setAttribute('aria-label', compact() ? 'Expand floor' : 'Compact floor');
      b.setAttribute('aria-pressed', compact() ? 'true' : 'false');
      b.setAttribute('data-pmd-v190-mode', compact() ? 'compact' : 'expanded');
    }
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; apply(); });
  }

  function clickButton() { var b = button(); if (b) b.click(); }

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target || !target.closest(BUTTON)) return;
    setTimeout(apply, 0);
    setTimeout(apply, 90);
    setTimeout(apply, 240);
  }, true);

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    setTimeout(apply, 0);
    setTimeout(apply, 120);
  }, true);

  ['pmd_waiter_floor_compact', 'PMD_WAITER_FLOOR_COMPACT_V89',
   'pmd_waiter_floor_size_v184', 'pmd_waiter_floor_scale_v185',
   'pmd_waiter_floor_scale_v187', 'pmd_waiter_floor_compact_v188',
   'pmd_waiter_floor_compact_v189', 'pmd_waiter_floor_positions_v189',
   'pmd_waiter_floor_compact_v190'].forEach(function (key) {
    try { localStorage.removeItem(key); } catch (error) {}
  });

  apply();
  var r = root();
  if (r) {
    observer = new MutationObserver(schedule);
    observer.observe(r, {attributes:true, attributeFilter:['class'], childList:true});
  }
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      var current = root();
      if (current) current.classList.add('pmd-v190-floor-ready');
      apply();
    });
  });

  window.PMDFloorDeterministicV190 = {
    active: true,
    apply: apply,
    toggle: clickButton,
    compact: function () { if (!compact()) clickButton(); },
    expand: function () { if (compact()) clickButton(); },
    expanded: function () { if (compact()) clickButton(); },
    debug: function () {
      var f = floor();
      var tiles = f ? Array.prototype.slice.call(f.querySelectorAll('.pmd-w5-table[data-table]')) : [];
      var points = {};
      tiles.forEach(function (tile) {
        var rect = tile.getBoundingClientRect();
        points[Math.round(rect.x) + ',' + Math.round(rect.y)] = true;
      });
      var out = {
        active: true,
        mode: compact() ? 'compact' : 'expanded',
        floorHeight: f ? Math.round(f.getBoundingClientRect().height) : 0,
        tableCount: tiles.length,
        uniqueTablePositions: Object.keys(points).length,
        scalerCount: document.querySelectorAll('.pmd-v185-floor-scaler, .pmd-v187-floor-scaler').length
      };
      console.log(out);
      return out;
    },
    stop: function () {
      if (observer) observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
      observer = null;
      raf = 0;
    }
  };
  console.info('[PMD] V190 container-only floor compact active');
})();
</script>
<!-- PMD_V190_CONTAINER_ONLY_FLOOR_COMPACT_END -->'''
s = s[:start] + final + s[end:]

assert 'PMD_V191_COMPACT_STRIP_AUTHORITY' not in s
assert 'pmd-v191-mini-table' not in s
assert "localStorage.setItem('pmd_waiter_floor_compact'" not in s
path.write_text(s, encoding='utf-8')
