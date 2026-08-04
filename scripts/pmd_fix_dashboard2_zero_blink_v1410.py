#!/usr/bin/env python3
"""Apply the Dashboard2 V1.4.1.0 zero-blink consolidation patch.

This patch intentionally edits the existing monolithic Dashboard2 bundle rather
than adding another delayed runtime authority. It makes the canonical renderer
produce the selected bar window on its first DOM write, gives the scrubbers the
same defaults synchronously, uses the real chart-mode storage key, disables the
redundant V1402/V1403 boot timers, and bumps the asset URL.
"""
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "app/admin/assets/js/pmd-dashboard2-kpis-v1.js"
BLADE = ROOT / "app/admin/views/dashboard2_reservations2_exact.blade.php"
MARKER = "PMD_DASHBOARD2_V1410_ZERO_BLINK_CANONICAL_BOOT"
REAL_MODE_KEY = "pmd.dashboard2.salesChartMode.v1"
OLD_MODE_KEY = "pmd-dashboard2-chart-mode"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def disable_runtime(text: str, marker: str, global_name: str) -> str:
    header = f"""/* ============================================================
   {marker}"""
    start = text.find(header)
    if start < 0:
        raise RuntimeError(f"Could not locate runtime marker: {marker}")

    strict = text.find("  'use strict';", start)
    if strict < 0:
        raise RuntimeError(f"Could not locate strict mode after: {marker}")

    insertion_at = strict + len("  'use strict';")
    guard = f"""

  /* {MARKER}: this delayed repair is replaced by canonical boot. */
  if (window.PMD_DASHBOARD2_ZERO_BLINK_V1410) {{
    window.{global_name} = {{
      version: 'disabled-by-v1410',
      refresh() {{ return this.audit(); }},
      stop() {{ return this.audit(); }},
      audit() {{
        return {{
          version: 'disabled-by-v1410',
          disabled: true,
          replacement: '{MARKER}'
        }};
      }}
    }};
    return;
  }}"""

    return text[:insertion_at] + guard + text[insertion_at:]


def patch_js(text: str) -> str:
    if MARKER in text:
        print("Dashboard2 V1410 marker already present; JS unchanged.")
        return text

    required = [
        "PMD_DASHBOARD2_V1375_ZOOM_DENSITY_SCRUBBER",
        "PMD_DASHBOARD2_V1377_DEFAULT_DENSITY",
        "PMD_DASHBOARD2_V1398_NO_PILL_FLASH_PARTIAL_MODE_RENDER",
        "PMD_DASHBOARD2_V1401_BOOT_BAR_HEADER_PILL",
        "PMD_DASHBOARD2_V1402_BOOT_BAR_WINDOW_SYNC",
        "PMD_DASHBOARD2_V1403_FINAL_BAR_BOOT_AUTHORITY",
    ]
    missing = [item for item in required if item not in text]
    if missing:
        raise RuntimeError(f"Required production markers missing: {missing}")

    wrong_key_count = text.count(OLD_MODE_KEY)
    if wrong_key_count < 4:
        raise RuntimeError(
            f"Expected at least four legacy chart-mode keys, found {wrong_key_count}"
        )
    text = text.replace(OLD_MODE_KEY, REAL_MODE_KEY)

    prepaint_anchor = """/* ============================================================
   PMD_DASHBOARD2_V1403_FINAL_BAR_BOOT_AUTHORITY
   PREPAINT GUARD
   ============================================================ */
(function () {
  'use strict';
"""
    prepaint_replacement = prepaint_anchor + f"""
  /* {MARKER} */
  window.PMD_DASHBOARD2_ZERO_BLINK_V1410 = true;
"""
    text = replace_once(
        text,
        prepaint_anchor,
        prepaint_replacement,
        "prepaint authority marker",
    )

    text = replace_once(
        text,
        "  function svgBars(rows, label) {",
        "  function svgBars(rows, label, initialVisibleCount) {",
        "svgBars signature",
    )

    old_layout = """    var gap = dimensions.plotW / rows.length;
    var barW = Math.max(5, Math.min(23, gap * 0.6));
    var baseline = dimensions.top + dimensions.plotH;
    var indexes = axisIndexes(rows, hourly);

    var barsMarkup = rows.map(function (row, index) {"""

    new_layout = f"""    var gap = dimensions.plotW / rows.length;
    var barW = Math.max(5, Math.min(23, gap * 0.6));
    var baseline = dimensions.top + dimensions.plotH;

    /* {MARKER}
     * Build the final selected window in the first HTML string. All points
     * remain in the SVG for the slider, but points outside the selected
     * window are hidden before the browser gets a paint opportunity.
     */
    var requestedInitialVisible = Number(initialVisibleCount);
    var initialVisible = Number.isFinite(requestedInitialVisible)
      ? Math.max(1, Math.min(requestedInitialVisible, rows.length))
      : rows.length;
    var initialWindowActive = initialVisible < rows.length;
    var initialPeakIndex = values.indexOf(peak);
    if (initialPeakIndex < 0) initialPeakIndex = 0;
    var initialStart = 0;

    if (initialWindowActive) {{
      initialStart = hourly
        ? Math.max(0, rows.length - initialVisible)
        : Math.max(
            0,
            Math.min(
              initialPeakIndex - Math.floor(initialVisible / 2),
              rows.length - initialVisible
            )
          );
    }}

    var initialEnd = initialStart + initialVisible;
    var initialGap = dimensions.plotW / initialVisible;
    var initialBarW = initialWindowActive
      ? Math.max(14, Math.min(58, initialGap * 0.68, barW * 2.8))
      : barW;
    var visibleRows = rows.slice(initialStart, initialEnd);
    var indexes = axisIndexes(visibleRows, hourly).map(function (index) {{
      return index + initialStart;
    }});

    var barsMarkup = rows.map(function (row, index) {{"""
    text = replace_once(text, old_layout, new_layout, "svgBars initial layout")

    old_x = """      var x =
        dimensions.left +
        index * gap +
        (gap - barW) / 2;

      var y = baseline - height;
      var isPeak = value === peak && value > 0;"""

    new_x = """      var insideInitialWindow =
        index >= initialStart && index < initialEnd;
      var visibleIndex = index - initialStart;
      var activeGap = initialWindowActive ? initialGap : gap;
      var activeBarW = initialWindowActive ? initialBarW : barW;
      var x = insideInitialWindow
        ? dimensions.left +
          visibleIndex * activeGap +
          (activeGap - activeBarW) / 2
        : dimensions.left +
          index * gap +
          (gap - barW) / 2;

      var y = baseline - height;
      var isPeak = value === peak && value > 0;"""
    text = replace_once(text, old_x, new_x, "svgBars x geometry")

    old_group = """        '<g class=\"pmd-chart-focus-point\" tabindex=\"0\" ' +
        'role=\"img\" aria-label=\"' + esc(aria) + '\">' +"""
    new_group = """        '<g class=\"pmd-chart-focus-point\" tabindex=\"0\" ' +
        (insideInitialWindow ? '' : 'style=\"display:none\" ') +
        'role=\"img\" aria-label=\"' + esc(aria) + '\">' +"""
    text = replace_once(text, old_group, new_group, "initial hidden bar groups")

    text = replace_once(
        text,
        "        'width=\"' + barW + '\" ' +",
        "        'width=\"' + (insideInitialWindow ? activeBarW : barW) + '\" ' +",
        "initial bar width",
    )

    old_label_x = """      var x =
        dimensions.left +
        index * gap +
        gap / 2;"""
    new_label_x = """      var visibleLabelIndex = index - initialStart;
      var labelGap = initialWindowActive ? initialGap : gap;
      var x =
        dimensions.left +
        visibleLabelIndex * labelGap +
        labelGap / 2;"""
    text = replace_once(text, old_label_x, new_label_x, "initial x-axis geometry")

    old_sales_render = """    var s=data.sales_over_time; put('salesOverTime',s.available?(salesChartMode==='line'?svgLine(s.buckets):svgBars(s.buckets,'Sales over time bar chart')):empty(s));
    var h=data.sales_by_hour; put('salesByHour',h.available?svgBars(h.hours,'Sales by hour bar chart'):empty(h));"""
    new_sales_render = f"""    var s=data.sales_over_time;
    var salesCard = root.querySelector(
      '[data-pmd-analytics-widget=\"salesOverTime\"]'
    );
    var salesBody = salesCard && salesCard.querySelector('[data-pmd-widget-body]');

    if (salesBody) {{
      salesBody.style.setProperty('visibility', 'hidden', 'important');
      salesBody.style.setProperty('opacity', '0', 'important');
    }}

    put(
      'salesOverTime',
      s.available
        ? (salesChartMode === 'line'
            ? svgLine(s.buckets)
            : svgBars(s.buckets, 'Sales over time bar chart', 19))
        : empty(s)
    );
    var h=data.sales_by_hour;
    put(
      'salesByHour',
      h.available
        ? svgBars(h.hours, 'Sales by hour bar chart', 15)
        : empty(h)
    );"""
    text = replace_once(
        text,
        old_sales_render,
        new_sales_render,
        "canonical chart render",
    )

    old_render_end = """    var ev=data.calendar_events; put('calendarEvents',ev.available?list(ev.events,function(r){return '<span>'+esc(r.title)+'</span><b>'+esc(r.date)+'</b>'; }):empty(ev));
  }"""
    new_render_end = f"""    var ev=data.calendar_events; put('calendarEvents',ev.available?list(ev.events,function(r){{return '<span>'+esc(r.title)+'</span><b>'+esc(r.date)+'</b>'; }}):empty(ev));

    /* {MARKER}
     * The fetch callback runs after this complete bundle has been evaluated,
     * so every authority below is already available. Apply the final state
     * synchronously and reveal exactly once.
     */
    if (salesCard) {{
      salesCard.dataset.pmdSalesChartMode = salesChartMode;
    }}

    window.PMDDashboard2ZoomDensityV1375?.refresh?.();

    if (salesChartMode === 'line') {{
      window.PMDDashboard2RealLineV1384?.apply?.();
    }}

    window.PMDDashboard2StablePillV1380?.apply?.();
    window.PMDDashboard2BarPillSmoothLineV1399?.refresh?.();
    window.PMDDashboard2SalesAxisV1393?.refresh?.();

    document.documentElement.classList.remove(
      'pmd-dashboard2-v1403-bar-boot'
    );

    if (salesBody) {{
      salesBody.style.removeProperty('visibility');
      salesBody.style.removeProperty('opacity');
    }}
  }}"""
    text = replace_once(text, old_render_end, new_render_end, "canonical reveal")

    old_scrubber = """    var scrubber =
      body.querySelector(
        '.pmd-dashboard2-zoom-scrubber-v1375'
      );

    if (scrubber) {
      scrubber.remove();
    }

    var html ="""
    new_scrubber = """    var scrubber =
      body.querySelector(
        '.pmd-dashboard2-zoom-scrubber-v1375'
      );

    var preservedVisible = Number(
      scrubber?.querySelector('input[type=\"range\"]')?.value
    );

    if (!Number.isFinite(preservedVisible) || preservedVisible <= 0) {
      preservedVisible = 19;
    }

    if (scrubber) {
      scrubber.remove();
    }

    var html ="""
    text = replace_once(text, old_scrubber, new_scrubber, "preserve bar window")

    old_partial_bar = """              : svgBars(
                  source.buckets,
                  'Sales over time bar chart'
                )"""
    new_partial_bar = """              : svgBars(
                  source.buckets,
                  'Sales over time bar chart',
                  preservedVisible
                )"""
    text = replace_once(text, old_partial_bar, new_partial_bar, "partial bar render")

    old_stored = """    const storedValue =
      zoomState.has(key)
        ? zoomState.get(key)
        : total;"""
    new_stored = f"""    /* {MARKER}: canonical defaults; no later correction pass. */
    const canonicalDefault =
      key === 'salesOverTime'
        ? Math.min(19, total)
        : key === 'salesByHour'
          ? Math.min(15, total)
          : total;

    const storedValue =
      zoomState.has(key)
        ? zoomState.get(key)
        : canonicalDefault;"""
    text = replace_once(text, old_stored, new_stored, "scrubber canonical default")

    default_schedule_pattern = re.compile(
        r"  function scheduleApply\(\) \{\n"
        r"    \[\n"
        r"      0,\n"
        r"      100,\n"
        r"      300,\n"
        r"      700,\n"
        r"      1400\n"
        r"    \]\.forEach\(delay => \{\n"
        r"      window\.setTimeout\(\n"
        r"        \(\) => applyAll\(`boot-\$\{delay\}`\),\n"
        r"        delay\n"
        r"      \);\n"
        r"    \}\);\n"
        r"  \}"
    )
    text, schedule_count = default_schedule_pattern.subn(
        f"""  function scheduleApply() {{
    /* {MARKER}: V1375 now owns the synchronous defaults. */
    return [];
  }}""",
        text,
        count=1,
    )
    if schedule_count != 1:
        raise RuntimeError(
            f"Default Density schedule: expected one match, found {schedule_count}"
        )

    text = disable_runtime(
        text,
        "PMD_DASHBOARD2_V1402_BOOT_BAR_WINDOW_SYNC",
        "PMDDashboard2BootBarWindowV1402",
    )
    text = disable_runtime(
        text,
        "PMD_DASHBOARD2_V1403_FINAL_BAR_BOOT_AUTHORITY\n   V1.4.0.3",
        "PMDDashboard2FinalBarBootV1403",
    )

    if text.count(MARKER) < 8:
        raise RuntimeError("V1410 marker count is unexpectedly low")

    return text


def patch_blade(text: str) -> str:
    old = (
        '<script src="/app/admin/assets/js/'
        'pmd-dashboard2-kpis-v1.js?v=dashboard2-v132"></script>'
    )
    new = (
        '<script src="/app/admin/assets/js/'
        'pmd-dashboard2-kpis-v1.js?v=dashboard2-v1410-zero-blink"></script>'
    )

    if new in text:
        print("Dashboard2 V1410 asset key already present; Blade unchanged.")
        return text

    return replace_once(text, old, new, "Dashboard2 asset cache key")


def main() -> int:
    if not JS.is_file() or not BLADE.is_file():
        raise RuntimeError("Dashboard2 source files not found")

    original_js = JS.read_text(encoding="utf-8")
    original_blade = BLADE.read_text(encoding="utf-8")

    patched_js = patch_js(original_js)
    patched_blade = patch_blade(original_blade)

    JS.write_text(patched_js, encoding="utf-8")
    BLADE.write_text(patched_blade, encoding="utf-8")

    print(f"Patched: {JS.relative_to(ROOT)}")
    print(f"Patched: {BLADE.relative_to(ROOT)}")
    print(f"Legacy mode-key replacements: {original_js.count(OLD_MODE_KEY)}")
    print(f"V1410 marker count: {patched_js.count(MARKER)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
