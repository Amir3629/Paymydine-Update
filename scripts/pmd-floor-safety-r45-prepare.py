#!/usr/bin/env python3
"""PMD_R45_SURGICAL_DIRTY_VPS_PATCHER
Forward-port R45 changes into a STAGED copy of currently installed R44.
Each diff hunk must match EXACTLY ONCE (with 12 context lines), or abort
before any live write. Do not checkout/replace user-modified full files.
"""
import difflib
import pathlib
import sys
import tempfile

FILES = (
    "app/admin/classes/PmdCleanWorkspaceControllerV1.php",
    "app/admin/Services/PmdSharedFloorRegistryV1.php",
    "app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js",
    "app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js",
    "app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php",
    "app/admin/views/_layouts/default.blade.php",
)
NEW = (
    "app/admin/Services/PmdFloorOperationalSafetyR45.php",
    "app/admin/assets/css/pmd-floor-operational-safety-r45.css",
    "app/admin/assets/js/pmd-floor-confirm-r45.js",
)

def source(root, name):
    return pathlib.Path(root, name).read_bytes().decode("utf-8")

def write(root, name, value):
    path = pathlib.Path(root, name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(value.encode("utf-8"))

def forward_port(current, original, target, name):
    if original == target:
        raise RuntimeError("No R45 changes available for " + name)
    previous_lines = original.splitlines(keepends=True)
    target_lines = target.splitlines(keepends=True)
    groups = list(difflib.SequenceMatcher(
        None, previous_lines, target_lines, autojunk=True
    ).get_grouped_opcodes(n=12))
    if not groups:
        raise RuntimeError("No patch hunks: " + name)

    result = current
    for group in groups:
        a = group[0][1]
        end_a = group[-1][2]
        b = group[0][3]
        end_b = group[-1][4]
        old = "".join(previous_lines[a:end_a])
        new = "".join(target_lines[b:end_b])
        occurrences = result.count(old)
        if not old or occurrences != 1:
            raise RuntimeError(
                "STOP: " + name + " has an incompatible/ambiguous R44 "
                "code hunk near source line " + str(a + 1) +
                " (matches=" + str(occurrences) + "). "
                "Current VPS file preserved."
            )
        result = result.replace(old, new, 1)

    if current == original and result != target:
        raise RuntimeError("Reference verification failed for " + name)
    return result, len(groups)

def forward_port_layout(current, original, target, name):
    """R45B: one additive head block, never a whole-context layout patch.

    Prior versions required 12 identical lines near the end of the busy
    layout. R41/R42 and later VPS changes made that unsafe assumption fail.
    The unique R42 head-end anchor is a stable semantic insertion point.
    All unrelated custom layout text is preserved byte-for-byte.
    """
    start = "<!-- PMD_FLOOR_OPERATIONAL_SAFETY_R45_REAL_HEAD -->"
    end = "<!-- /PMD_FLOOR_OPERATIONAL_SAFETY_R45_REAL_HEAD -->"
    anchor = "<!-- /PMD_FLOOR_NOTE_RANGE_R42_REAL_HEAD -->\n"
    if original.count(start) or target.count(start) != 1 or target.count(end) != 1:
        raise RuntimeError("STOP: R45 target head assets are ambiguous.")
    if current.count(start) or current.count(end) or "pmd-floor-confirm-r45.js" in current:
        raise RuntimeError("STOP: R45 head assets are already installed/partially installed.")
    if current.count(anchor) != 1 or current.count("</head>") != 1:
        raise RuntimeError("STOP: exact installed R42 head anchor missing/ambiguous.")
    block_begin = target.index(start)
    block_end = target.index(end, block_begin) + len(end)
    block = target[block_begin:block_end]
    # One line is injected directly after the known R42 head block. This
    # preserves the original R42 CSS order and does not touch local extras.
    result = current.replace(anchor, anchor + block + "\n", 1)
    if result.count(start) != 1 or result.count(end) != 1:
        raise RuntimeError("STOP: R45 head injection failed uniqueness check.")
    if current == original and result != target:
        raise RuntimeError("STOP: R44/R45 reference layout does not match injection.")
    return result, 1


def patch(root, base, ref):
    results = {}
    for name in FILES:
        if name == "app/admin/views/_layouts/default.blade.php":
            results[name] = forward_port_layout(
                source(root, name), source(base, name), source(ref, name), name
            )
        else:
            results[name] = forward_port(
                source(root, name), source(base, name), source(ref, name), name
            )
    for name in NEW:
        if pathlib.Path(root, name).exists():
            raise RuntimeError("STOP: R45 new file already exists: " + name)
        results[name] = (source(ref, name), 1)
    for name, (value, groups) in results.items():
        write(root, name, value)
        print("R45 STAGED:", name, "hunks:", groups)
    return results

def selftest(base, ref):
    with tempfile.TemporaryDirectory(prefix="pmd-r45-fixture-") as tmp:
        for name in FILES:
            write(tmp, name, source(base, name))
        results = patch(tmp, base, ref)
        assert len(results) == len(FILES) + len(NEW)
        for name in FILES:
            assert source(tmp, name) == source(ref, name), name
        print("PASS R45: exact R44 -> R45 source transformation")

    with tempfile.TemporaryDirectory(prefix="pmd-r45-dirty-fixture-") as tmp:
        for name in FILES:
            write(tmp, name, source(base, name))
        layout = "app/admin/views/_layouts/default.blade.php"
        text = source(tmp, layout)
        marker = "<!-- PMD_R45_USER_VPS_CUSTOM_LAYOUT_PRESERVED -->"
        text = text.replace("</head>", marker + "\n</head>", 1)
        write(tmp, layout, text)
        results = patch(tmp, base, ref)
        assert marker in source(tmp, layout)
        print("PASS R45: unrelated VPS layout customization preserved")

    # R45B: reproduce the practical dirty-layout blocker: extra user lines
    # within the 12-line context that the former patcher required unchanged.
    with tempfile.TemporaryDirectory(prefix="pmd-r45-layout-drift-fixture-") as tmp:
        for name in FILES:
            write(tmp, name, source(base, name))
        layout = "app/admin/views/_layouts/default.blade.php"
        before = source(tmp, layout)
        css_line = '<!-- /PMD_FLOOR_NOTE_RANGE_R42_REAL_HEAD -->'
        custom = '<!-- USER_R14_LOCAL_HEADER_KEEP_UNCHANGED -->'
        assert before.count(css_line) == 1
        write(tmp, layout, before.replace(css_line, custom + "\n" + css_line, 1))
        patch(tmp, base, ref)
        after = source(tmp, layout)
        assert after.count(custom) == 1
        assert after.count('PMD_FLOOR_OPERATIONAL_SAFETY_R45_REAL_HEAD') == 2
        assert after.count('pmd-floor-confirm-r45.js') == 1
        print("PASS R45B: changed local R14/R42 head survives without hunk conflict")
        try:
            forward_port_layout(after, source(base, layout), source(ref, layout), layout)
        except RuntimeError as error:
            assert "already installed" in str(error)
            print("PASS R45B: duplicate/partial head injection fails closed")
        else:
            raise RuntimeError("R45B duplicate injection was not rejected")

    with tempfile.TemporaryDirectory(prefix="pmd-r45-drift-fixture-") as tmp:
        for name in FILES:
            write(tmp, name, source(base, name))
        name = "app/admin/classes/PmdCleanWorkspaceControllerV1.php"
        value = source(tmp, name).replace(
            "$table->table_status = $enabled;",
            "$table->table_status = !$enabled; // USER CHANGED CRITICAL ACTION",
            1,
        )
        write(tmp, name, value)
        try:
            patch(tmp, base, ref)
        except RuntimeError as error:
            assert "incompatible" in str(error)
            assert not pathlib.Path(tmp, NEW[0]).exists()
            print("PASS R45: dirty critical block fails closed before any mutation")
        else:
            raise RuntimeError("CRITICAL REGRESSION: edited disable action overwritten")
    print("R45B SURGICAL PATCHER: 5 groups passed")

if __name__ == "__main__":
    if len(sys.argv) != 5 or sys.argv[1] not in ("--apply", "--selftest"):
        raise SystemExit("Usage: prepare-r45.py --apply|--selftest ROOT BASE REF")
    command, root, base, ref = sys.argv[1:]
    try:
        if command == "--selftest":
            selftest(base, ref)
        else:
            patch(root, base, ref)
    except (AssertionError, RuntimeError) as err:
        print("R45 PREFLIGHT STOP:", err, file=sys.stderr)
        raise SystemExit(1)
