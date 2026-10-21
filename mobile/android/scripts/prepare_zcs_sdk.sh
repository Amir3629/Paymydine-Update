#!/usr/bin/env bash
set -euo pipefail

# PMD_ZCS_Z100_AUTO_SDK_V18
# Fetch the official ZCS Android POS SDK at build time, verify the exact
# SmartPos 2.0.6 AAR supplied by ZCS, then inject it into the Android app.
# No proprietary vendor binary is committed to this repository.

PAGE_URL="${ZCS_SDK_PAGE_URL:-https://www.szzcs.com/Support-Service/SDK-Download/}"
EXPECTED_NAME="SmartPos_2.0.6_R260615.aar"
EXPECTED_SHA256="fe2269746167064571ae23fc655838f203436deeb145606ff5c2d34b0054db18"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEST_DIR="$ROOT_DIR/mobile/android/app/libs"
WORK_DIR="${RUNNER_TEMP:-/tmp}/paymydine-zcs-sdk"

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR/downloads" "$WORK_DIR/extracted" "$DEST_DIR"

python3 - "$PAGE_URL" "$WORK_DIR/candidates.txt" <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

page_url, out_path = sys.argv[1], Path(sys.argv[2])
req = urllib.request.Request(
    page_url,
    headers={
        "User-Agent": "Mozilla/5.0 PayMyDine-ZCS-Builder/2.0",
        "Accept": "text/html,application/xhtml+xml",
    },
)
with urllib.request.urlopen(req, timeout=30) as response:
    html_text = response.read().decode("utf-8", "replace")

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag.lower() == "a":
            self.current = [data.get("href", ""), []]
        for key in ("href", "data-url", "data-href"):
            value = data.get(key)
            if value:
                self.links.append((value, key))

    def handle_data(self, data):
        if self.current is not None:
            self.current[1].append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self.current is not None:
            href, parts = self.current
            self.links.append((href, " ".join("".join(parts).split())))
            self.current = None

parser = Parser()
parser.feed(html_text)

candidates = []
for href, text in parser.links:
    blob = (href + " " + text).lower()
    if (
        ("z100" in blob and "sdk" in blob)
        or ("z90" in blob and "sdk" in blob)
        or ("z91" in blob and "sdk" in blob)
        or ("z92" in blob and "sdk" in blob)
        or "smartpos" in blob
        or re.search(r"\.(zip|7z|rar)(?:$|[?#])", href, re.I)
    ):
        candidates.append(href)

for match in re.findall(
    r"""https?://[^"'<>\s]+(?:\.zip|\.7z|\.rar)(?:\?[^"'<>\s]*)?""",
    html_text,
    re.I,
):
    candidates.append(match)

normalized = []
seen = set()
for href in candidates:
    href = href.strip()
    if not href or href.lower().startswith("javascript:"):
        continue
    url = urllib.parse.urljoin(page_url, href)
    if url in seen:
        continue
    seen.add(url)
    normalized.append(url)

if not normalized:
    raise SystemExit("No official ZCS SDK archive URL found on the SDK page")

out_path.write_text("\n".join(normalized) + "\n", encoding="utf-8")
print("ZCS SDK candidates:")
for url in normalized:
    print("  " + url)
PY

SDK_ARCHIVE=""
INDEX=0
while IFS= read -r URL; do
    [[ -n "$URL" ]] || continue
    INDEX=$((INDEX + 1))
    TARGET="$WORK_DIR/downloads/candidate-$INDEX"
    echo "Trying official ZCS SDK URL: $URL"
    if curl -fL --retry 2 --connect-timeout 20 --max-time 180         -A 'Mozilla/5.0 PayMyDine-ZCS-Builder/2.0'         "$URL" -o "$TARGET"; then
        if file "$TARGET" | grep -qi 'Zip archive'; then
            SDK_ARCHIVE="$TARGET"
            break
        fi
    fi
done < "$WORK_DIR/candidates.txt"

if [[ -z "$SDK_ARCHIVE" ]]; then
    echo "Official ZCS page currently gates the SDK behind its request form."
    echo "Inspecting our previously built ZCS V6 APK as a safe internal SDK carrier..."
    CARRIER="$WORK_DIR/PayMyDine-ZCS-Customer-Display-V6.apk"
    curl -fL --retry 2 \
        "https://raw.githubusercontent.com/Amir3629/Paymydine-Update/main/public/downloads/paymydine/PayMyDine-ZCS-Customer-Display-V6.apk" \
        -o "$CARRIER"
    echo "Carrier SHA256: $(sha256sum "$CARRIER" | awk '{print $1}')"
    while IFS= read -r DEX; do
        echo "DEX=$DEX"
        if unzip -p "$CARRIER" "$DEX" | strings | grep -Fq 'com/zcs/sdk/DriverManager'; then
            echo "  ZCS_DRIVER_MANAGER=yes"
        else
            echo "  ZCS_DRIVER_MANAGER=no"
        fi
        PMD_COUNT="$(unzip -p "$CARRIER" "$DEX" | strings | grep -Fc 'com/paymydine/' || true)"
        ZCS_COUNT="$(unzip -p "$CARRIER" "$DEX" | strings | grep -Fc 'com/zcs/' || true)"
        echo "  PMD_STRINGS=$PMD_COUNT ZCS_STRINGS=$ZCS_COUNT"
    done < <(zipinfo -1 "$CARRIER" | grep -E '^classes[0-9]*[.]dex

# Extract the downloaded archive and any nested ZIPs. ZCS sometimes distributes
# the SmartPos package directly and sometimes inside a larger POS-SDK bundle.
unzip -q "$SDK_ARCHIVE" -d "$WORK_DIR/extracted/root"

for DEPTH in 1 2 3; do
    mapfile -t NESTED < <(find "$WORK_DIR/extracted" -type f -iname '*.zip' -print)
    [[ "${#NESTED[@]}" -gt 0 ]] || break
    EXTRACTED_ANY=0
    for ZIP in "${NESTED[@]}"; do
        MARKER="$ZIP.pmd-extracted"
        [[ -f "$MARKER" ]] && continue
        OUT="$WORK_DIR/extracted/nested-$DEPTH-$(printf '%s' "$ZIP" | sha256sum | cut -c1-12)"
        mkdir -p "$OUT"
        if unzip -q "$ZIP" -d "$OUT"; then
            touch "$MARKER"
            EXTRACTED_ANY=1
        fi
    done
    [[ "$EXTRACTED_ANY" -eq 1 ]] || break
done

AAR="$(find "$WORK_DIR/extracted" -type f -name "$EXPECTED_NAME" -print -quit)"
if [[ -z "$AAR" ]]; then
    echo "ERROR: $EXPECTED_NAME was not found in the official ZCS SDK archive." >&2
    find "$WORK_DIR/extracted" -type f -iname 'SmartPos*.aar' -print >&2 || true
    exit 1
fi

ACTUAL_SHA256="$(sha256sum "$AAR" | awk '{print $1}')"
echo "ZCS_AAR=$AAR"
echo "ZCS_AAR_SHA256=$ACTUAL_SHA256"

if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
    echo "ERROR: ZCS SmartPos AAR checksum mismatch." >&2
    exit 1
fi

cp "$AAR" "$DEST_DIR/$EXPECTED_NAME"

test -s "$DEST_DIR/$EXPECTED_NAME"
echo "PMD_ZCS_Z100_SDK_INJECTED=PASS"
)
    echo "ERROR: Official raw AAR is not directly downloadable; carrier diagnostics printed above." >&2
    exit 1
fi

# Extract the downloaded archive and any nested ZIPs. ZCS sometimes distributes
# the SmartPos package directly and sometimes inside a larger POS-SDK bundle.
unzip -q "$SDK_ARCHIVE" -d "$WORK_DIR/extracted/root"

for DEPTH in 1 2 3; do
    mapfile -t NESTED < <(find "$WORK_DIR/extracted" -type f -iname '*.zip' -print)
    [[ "${#NESTED[@]}" -gt 0 ]] || break
    EXTRACTED_ANY=0
    for ZIP in "${NESTED[@]}"; do
        MARKER="$ZIP.pmd-extracted"
        [[ -f "$MARKER" ]] && continue
        OUT="$WORK_DIR/extracted/nested-$DEPTH-$(printf '%s' "$ZIP" | sha256sum | cut -c1-12)"
        mkdir -p "$OUT"
        if unzip -q "$ZIP" -d "$OUT"; then
            touch "$MARKER"
            EXTRACTED_ANY=1
        fi
    done
    [[ "$EXTRACTED_ANY" -eq 1 ]] || break
done

AAR="$(find "$WORK_DIR/extracted" -type f -name "$EXPECTED_NAME" -print -quit)"
if [[ -z "$AAR" ]]; then
    echo "ERROR: $EXPECTED_NAME was not found in the official ZCS SDK archive." >&2
    find "$WORK_DIR/extracted" -type f -iname 'SmartPos*.aar' -print >&2 || true
    exit 1
fi

ACTUAL_SHA256="$(sha256sum "$AAR" | awk '{print $1}')"
echo "ZCS_AAR=$AAR"
echo "ZCS_AAR_SHA256=$ACTUAL_SHA256"

if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
    echo "ERROR: ZCS SmartPos AAR checksum mismatch." >&2
    exit 1
fi

cp "$AAR" "$DEST_DIR/$EXPECTED_NAME"

test -s "$DEST_DIR/$EXPECTED_NAME"
echo "PMD_ZCS_Z100_SDK_INJECTED=PASS"
