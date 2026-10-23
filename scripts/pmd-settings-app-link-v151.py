#!/usr/bin/env python3
"""Apply ONLY the approved ZCS Device APK 0.6.6 link inside the Settings launcher.

V151 conflicted-file recovery: the Tomo VPS Settings Blade file has concurrent
Staff/Owner edits. A broad Git patch is intentionally forbidden here. We update
the singular Device App anchor, leaving all surrounding text byte-identical.
No device, Staff APK or payment-provider configuration can be changed.
"""
import pathlib
import re
import sys

MARKER = "data-pmd-device-app-download-v21"
RELEASE = "https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-device-app-preview/"
TARGET = RELEASE + "PayMyDine-Device-App-0.6.6.apk"
SOURCE = re.compile(
    r'^' + re.escape(RELEASE) + r'PayMyDine-Device-App-\d+\.\d+\.\d+\.apk$'
)
LABEL = re.compile(r'(<strong>)PayMyDine Device App · Android(?: \d+\.\d+\.\d+)?(</strong>)')
COMMENT = re.compile(r'PMD_DEVICE_APP_0_6_\d+_ZCS_Z100_V\d+')


def update_settings(original: str) -> str:
    if original.count(MARKER) != 1:
        raise ValueError("Device App Settings anchor is not unique")
    pos = original.index(MARKER)
    start = original.rfind("<a", 0, pos)
    end = original.find("</a>", pos)
    if start < 0 or end < pos or pos - start > 3500 or end - pos > 6500:
        raise ValueError("Cannot isolate the exact Device App download link")
    end += len("</a>")
    block = original[start:end]
    if "data-pmd-staff-app-download" in block:
        raise ValueError("Device App block overlaps Staff download; refusing to edit")
    hrefs = list(re.finditer(r'href="([^"]+)"', block))
    if len(hrefs) != 1:
        raise ValueError("Device App anchor must have exactly one href")
    link = hrefs[0]
    current = link.group(1)
    if not SOURCE.fullmatch(current):
        raise ValueError("Unexpected Device App release link; refusing to guess")
    block = block[:link.start(1)] + TARGET + block[link.end(1):]
    block, labels = LABEL.subn(
        lambda m: m.group(1) + "PayMyDine Device App · Android 0.6.6" + m.group(2),
        block,
        count=1,
    )
    # A custom VPS label is acceptable: never rewrite unrelated owner copy.
    block, comments = COMMENT.subn("PMD_DEVICE_APP_0_6_6_ZCS_Z100_V150", block, count=1)
    if comments == 0:
        block = block.replace(
            MARKER,
            "{{-- PMD_DEVICE_APP_0_6_6_ZCS_Z100_V150 --}}\n"
            "                " + MARKER,
            1,
        )
    result = original[:start] + block + original[end:]
    if not result.startswith(original[:start]) or not result.endswith(original[end:]):
        raise ValueError("Out-of-bound Settings edit detected")
    if result.count(MARKER) != 1 or result.count(TARGET) != 1:
        raise ValueError("Settings link rewrite did not converge")
    # Idempotence matters if an installation was interrupted.
    return result


def main() -> int:
    if len(sys.argv) != 3:
        print("STOP: usage pmd-settings-app-link-v151.py INPUT OUTPUT", file=sys.stderr)
        return 2
    source, destination = (pathlib.Path(x) for x in sys.argv[1:])
    if not source.is_file() or source.is_symlink() or destination.is_symlink():
        print("STOP: unsafe Settings file", file=sys.stderr)
        return 2
    try:
        old = source.read_bytes()
        original = old.decode("utf-8")
        fixed = update_settings(original)
        output = fixed.encode("utf-8")
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(output)
        if update_settings(fixed) != fixed:
            raise ValueError("non-idempotent Settings transformation")
    except (OSError, UnicodeDecodeError, ValueError) as error:
        print("STOP: Settings Device APK anchor cannot be patched safely: " + str(error), file=sys.stderr)
        return 2
    print("DEVICE_APP_DOWNLOAD_0_6_6_PATCH=PASS (Settings Staff and local edits untouched)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
