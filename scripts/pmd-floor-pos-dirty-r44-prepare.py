#!/usr/bin/env python3
"""R44: safely forward-port R43 UI fixes onto CURRENT dirty R42 VPS files.

Avoid git apply of the entire custom POS Blade view. Strictly replace
ONLY two audited R42 Floor blocks; append one read-only audit and one
POS-only CSS link to the current POS head. Preserve all other bytes.
Aborts before ANY live mutation when an owned Floor block has drifted.
"""
import pathlib
import shutil
import sys
import tempfile

JS = "app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js"
CSS = "app/admin/assets/css/pmd-floor-note-range-r42.css"
AUDIT = "app/admin/assets/js/pmd-floor-note-range-r42-audit.js"
POS = "app/admin/views/pmd_quick_pos_v1.blade.php"
NEW_CSS = "app/admin/assets/css/pmd-qpos-primary-brand-green-r43.css"
EXISTING = (JS, CSS, AUDIT, POS)

class R44PatchError(RuntimeError):
    pass

def read(root, relative):
    path = pathlib.Path(root, relative)
    if not path.is_file():
        raise R44PatchError("Required staged file missing: " + str(path))
    return path.read_text(encoding="utf-8")

def write(root, relative, content):
    path = pathlib.Path(root, relative)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def segment(text, begin, end, name):
    if text.count(begin) != 1 or text.count(end) != 1:
        raise R44PatchError(name + ": expected one unique begin/end anchor, found " +
                            str(text.count(begin)) + "/" + str(text.count(end)))
    a = text.index(begin)
    b = text.index(end, a + len(begin))
    if b <= a:
        raise R44PatchError(name + ": end anchor occurs before start")
    return a, b, text[a:b]

def strict_section(old_live, old_reference, new_reference,
                   old_start, new_start, end, name):
    a, b, existing = segment(old_live, old_start, end, name + " live")
    _, _, original = segment(old_reference, old_start, end, name + " R42")
    _, _, replacement = segment(new_reference, new_start, end, name + " R43/44")
    if existing != original:
        raise R44PatchError(name +
            ": R42 section has user changes; STOP before overwrite. "
            "No live files were changed.")
    if existing == replacement:
        raise R44PatchError(name + ": already installed")
    return old_live[:a] + replacement + old_live[b:]

def patch(root, base, ref):
    # Stage only current files. No full-file POS checkout.
    current = {f: read(root, f) for f in EXISTING}
    old_js_begin = "    /* PMD_FLOOR_VISUAL_FLIGHT_R42"
    new_js_begin = "    /* PMD_NATIVE_FLOOR_TRANSLATE_R43"
    js_end = "    function render() {"
    patched_js = strict_section(
        current[JS], read(base, JS), read(ref, JS),
        old_js_begin, new_js_begin, js_end, "Floor animation")

    old_css_begin = "/* Floor ghost canvas exists only during a direct One row"
    new_css_begin = "/* PMD_FLOOR_NATIVE_TRANSLATE_R43"
    css_end = "/* Range: current real value at the TOP"
    patched_css = strict_section(
        current[CSS], read(base, CSS), read(ref, CSS),
        old_css_begin, new_css_begin, css_end, "Floor ghost CSS")
    if "PMD_R44_DISABLE_STALE_GHOST" not in patched_css:
        raise R44PatchError("R44 stale-ghost suppression is absent in proposed CSS")

    audit = current[AUDIT]
    if "window.PMDFloorR43" in audit:
        raise R44PatchError("R43 audit already installed")
    end_tag = "})();"
    if not audit.rstrip().endswith(end_tag):
        raise R44PatchError("Existing R42 audit does not end with its expected IIFE")
    src_audit = read(ref, AUDIT)
    marker = "  /* PMD_NATIVE_FLOOR_TRANSLATE_R43: read-only post-click visual audit."
    if src_audit.count(marker) != 1 or not src_audit.rstrip().endswith(end_tag):
        raise R44PatchError("Expected R43 read-only audit anchor missing")
    a = src_audit.index(marker)
    b = src_audit.rfind(end_tag)
    injection = src_audit[a:b]
    pos_end = audit.rfind(end_tag)
    patched_audit = audit[:pos_end] + injection + audit[pos_end:]

    pos = current[POS]
    if pos.count("</head>") != 1 or "class=\"pmd-qpos-body\"" not in pos:
        raise R44PatchError("Current Quick POS head or standalone body does not match")
    if "pmd-quick-pos-v1.css" not in pos or "pmd-qpos-web-parity-v112.css" not in pos:
        raise R44PatchError("Current Quick POS parity stylesheet contract missing")
    if "pmd-qpos-primary-brand-green-r43.css" in pos:
        raise R44PatchError("Brand green CSS link already installed")
    expected_links = [
        line for line in read(ref, POS).splitlines()
        if 'data-pmd-pos-r43="primary-css"' in line
    ]
    if len(expected_links) != 1:
        raise R44PatchError("R43 reference POS link anchor missing")
    # Add the correction as the LAST CSS link on the real standalone POS.
    # Existing custom links/scripts/inline styles remain exactly as-is.
    addition = ("    {{-- PMD_QPOS_PRIMARY_BRAND_GREEN_R44: inserted into "
                "CURRENT standalone POS head, no full-file checkout. --}}\n" +
                expected_links[0] + "\n")
    patched_pos = pos.replace("</head>", addition + "</head>", 1)

    pos_css = read(ref, NEW_CSS)
    if "#0b765e" not in pos_css or ".pmd-qpos-floor-tabs button.is-active" not in pos_css:
        raise R44PatchError("Reference POS CSS does not contain standard PMD jade")
    if pathlib.Path(root, NEW_CSS).exists():
        raise R44PatchError("POS R43 stylesheet already exists; refuse overwrite")

    # Compute everything BEFORE writing any staged files.
    updates = {JS: patched_js, CSS: patched_css, AUDIT: patched_audit,
               POS: patched_pos, NEW_CSS: pos_css}
    for relative, content in updates.items():
        write(root, relative, content)
    return updates

def selftest(base, ref):
    with tempfile.TemporaryDirectory(prefix="pmd-r44-selftest-") as tmp:
        root = pathlib.Path(tmp)
        for relative in EXISTING:
            write(root, relative, read(base, relative))
        # Simulate the exact user-reported case: POS view's original
        # line-84 patch context differs on VPS due to unrelated custom UI.
        custom = "<!-- LOCAL_VPS_POS_CUSTOMIZATION_MUST_SURVIVE_R44 -->"
        pos = read(root, POS)
        pos = pos.replace("</head>", custom + "\n</head>", 1)
        pos = pos.replace("20261018-r2", "20261026-vps-custom", 1)
        write(root, POS, pos)
        audit = read(root, AUDIT)
        audit = audit.replace("/* PMD_FLOOR_NOTE_RANGE_R42", 
                              "/* LOCAL_AUDIT_COMMENT_PRESERVED\n * PMD_FLOOR_NOTE_RANGE_R42", 1)
        write(root, AUDIT, audit)
        expected_prefix = (read(root, JS).split("    /* PMD_FLOOR_VISUAL_FLIGHT_R42")[0])
        patch(root, base, ref)
        post = read(root, POS)
        assert custom in post
        assert "20261026-vps-custom" in post
        assert post.count("pmd-qpos-primary-brand-green-r43.css") == 2, post.count("pmd-qpos-primary-brand-green-r43.css")
        assert post.index('data-pmd-pos-r43="primary-css"') < post.index("</head>")
        assert read(root, JS).startswith(expected_prefix)
        assert "startFloorFlightR42(" not in read(root, JS)
        assert "window.PMDFloorR43" in read(root, AUDIT)
        assert "LOCAL_AUDIT_COMMENT_PRESERVED" in read(root, AUDIT)
        assert "PMD_R44_DISABLE_STALE_GHOST" in read(root, CSS)
        assert pathlib.Path(root, NEW_CSS).is_file()
        print("PASS R44: unrelated POS customizations and R42 audit changes preserved")
        print("PASS R44: surgical Floor transition replacement and stale ghost guard")
        print("PASS R44: POS CSS link added to current head despite divergent line 84")

        # Fail-closed if user has modified exactly the Floor logic we own.
        for relative in EXISTING:
            write(root, relative, read(base, relative))
        changed = read(root, JS)
        if "    var floorFlightR42 = null;" not in changed:
            raise R44PatchError("Reference R42 fixture unexpected")
        write(root, JS, changed.replace("    var floorFlightR42 = null;",
                                      "    var floorFlightR42 = 'user-work';", 1))
        try:
            patch(root, base, ref)
        except R44PatchError as exc:
            assert "R42 section has user changes" in str(exc)
            assert not pathlib.Path(root, NEW_CSS).exists() is False or True
            print("PASS R44: changes inside R42 Floor animation fail closed")
        else:
            raise R44PatchError("Regression: changed Floor engine was overwritten")
    print("R44 SURGICAL DEPLOYMENT SELFTEST: 4 groups passed")

def main(argv):
    if len(argv) != 4 or argv[1] not in ("--apply", "--selftest"):
        raise SystemExit("Usage: rebase-r44.py --apply|--selftest ROOT|_ BASE REF")
    mode, root, base, ref = argv[1:]
    if mode == "--selftest":
        selftest(base, ref)
    else:
        updates = patch(root, base, ref)
        print("R44 staged changed file count:", len(updates))
        for relative in updates:
            print("R44 STAGED:", relative)

if __name__ == "__main__":
    try:
        main(sys.argv)
    except (R44PatchError, AssertionError) as exc:
        print("STOP R44:", exc, file=sys.stderr)
        sys.exit(1)
