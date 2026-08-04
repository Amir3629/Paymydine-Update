#!/usr/bin/env python3
"""Execute the V1410 patcher with its bar-only replacement scoped correctly."""
from pathlib import Path

patcher = Path(__file__).with_name("pmd_fix_dashboard2_zero_blink_v1410.py")
source = patcher.read_text(encoding="utf-8")

old = '''    text = replace_once(text, old_group, new_group, "initial hidden bar groups")
'''
new = '''    svg_bars_start = text.find("  function svgBars(rows, label, initialVisibleCount) {")
    svg_bars_end = text.find("  function svgDonut", svg_bars_start)
    if svg_bars_start < 0 or svg_bars_end < 0:
        raise RuntimeError("Could not isolate svgBars for initial hidden groups")
    svg_bars_block = text[svg_bars_start:svg_bars_end]
    if svg_bars_block.count(old_group) != 1:
        raise RuntimeError(
            "svgBars hidden groups: expected one match, found "
            f"{svg_bars_block.count(old_group)}"
        )
    svg_bars_block = svg_bars_block.replace(old_group, new_group, 1)
    text = text[:svg_bars_start] + svg_bars_block + text[svg_bars_end:]
'''

if source.count(old) != 1:
    raise RuntimeError(
        f"Expected one patcher hotfix anchor, found {source.count(old)}"
    )

source = source.replace(old, new, 1)
namespace = {
    "__name__": "__main__",
    "__file__": str(patcher),
}
exec(compile(source, str(patcher), "exec"), namespace, namespace)
