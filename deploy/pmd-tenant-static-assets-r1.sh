#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/etc/nginx/pmd-backups/tenant-static-assets-r1-$STAMP"
TMPDIR="$(mktemp -d /tmp/pmd-tenant-static-assets-r1.XXXXXX)"
CHANGED_LIST="$TMPDIR/changed.list"
ACTIVATED=0

cleanup() {
  rm -rf "$TMPDIR" 2>/dev/null || true
}

rollback() {
  [[ "$ACTIVATED" -eq 1 ]] || return 0
  echo
  echo "AUTOMATIC TENANT STATIC ASSET R1 ROLLBACK"
  if [[ -f "$CHANGED_LIST" ]]; then
    while IFS= read -r target; do
      [[ -n "$target" ]] || continue
      backup_file="$BACKUP$target"
      if [[ -e "$backup_file" ]]; then
        cp -a "$backup_file" "$target"
      fi
    done < "$CHANGED_LIST"
  fi
  nginx -t >/dev/null 2>&1 && systemctl reload nginx >/dev/null 2>&1 || true
  echo "TENANT STATIC ASSET R1 ROLLBACK COMPLETE"
}

trap 'rc=$?; if [[ $rc -ne 0 ]]; then rollback; fi; cleanup; exit $rc' EXIT

fail() {
  echo "PMD TENANT STATIC ASSET R1 REFUSED: $*" >&2
  exit 1
}

http_code() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || printf '000'
}

[[ "$(id -u)" -eq 0 ]] || fail "Run with sudo/root"
[[ -d "$ROOT/.git" ]] || fail "PayMyDine git root missing: $ROOT"
[[ -d /etc/nginx/sites-enabled ]] || fail "Nginx sites-enabled directory missing"

cd "$ROOT"
HEAD_BEFORE="$(sudo -u ubuntu git -C "$ROOT" rev-parse HEAD)"
BRANCH_BEFORE="$(sudo -u ubuntu git -C "$ROOT" branch --show-current)"
[[ "$BRANCH_BEFORE" == "main" ]] || fail "Live branch must stay main; found $BRANCH_BEFORE"

echo "============================================================"
echo "PMD TENANT STATIC ASSET AUTHORITY R1"
echo "NGINX ONLY - ADMIN JS/CSS + MEDIA WIDGET ASSETS"
echo "============================================================"
echo "HEAD:   $HEAD_BEFORE"
echo "BRANCH: $BRANCH_BEFORE"

echo
echo "== PRE-DEPLOY HEALTH =="
PRE_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?pmdstaticr1=$(date +%s)")"
PRE_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?pmdstaticr1=$(date +%s)")"
PRE_ROOT="$(http_code "https://$TEST_HOST/?pmdstaticr1=$(date +%s)")"
echo "settings=$PRE_SETTINGS menu=$PRE_MENU root=$PRE_ROOT"
[[ "$PRE_SETTINGS" == "200" && "$PRE_MENU" == "200" && "$PRE_ROOT" == "200" ]] || fail "Production unhealthy before Nginx change"

mapfile -t TARGETS < <(
  for enabled in /etc/nginx/sites-enabled/*; do
    [[ -e "$enabled" || -L "$enabled" ]] || continue
    realpath "$enabled" 2>/dev/null || true
  done | sort -u
)

[[ ${#TARGETS[@]} -gt 0 ]] || fail "No enabled Nginx site configs found"
mkdir -p "$BACKUP"
: > "$CHANGED_LIST"

PATCHER="$TMPDIR/patch.py"
cat > "$PATCHER" <<'PY'
from __future__ import annotations

import re
import sys
from pathlib import Path

ADMIN_PATH = '/app/admin/assets/'
MEDIA_PATH = '/app/main/widgets/mediamanager/assets/'
MARKER = 'PMD_TENANT_STATIC_ASSET_AUTHORITY_R1'


def matching_brace(text: str, open_pos: int) -> int:
    depth = 0
    quote = None
    escaped = False
    in_comment = False
    i = open_pos
    while i < len(text):
        ch = text[i]
        if in_comment:
            if ch == '\n':
                in_comment = False
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == '#':
            in_comment = True
            i += 1
            continue
        if ch in ('"', "'"):
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise RuntimeError('unbalanced Nginx braces')


def server_blocks(text: str):
    matches = list(re.finditer(r'(?m)^\s*server\s*\{', text))
    blocks = []
    for m in matches:
        open_pos = text.find('{', m.start(), m.end())
        end = matching_brace(text, open_pos)
        blocks.append((m.start(), end + 1))
    return blocks


def is_tenant_https(block: str) -> bool:
    if '/var/www/paymydine' not in block:
        return False
    if not re.search(r'(?m)^\s*listen\s+[^;]*443[^;]*;', block):
        return False
    names = []
    for match in re.finditer(r'(?m)^\s*server_name\s+([^;]+);', block):
        names.extend(match.group(1).split())
    return any(name.endswith('.paymydine.com') for name in names)


def ensure_location(block: str, path: str, label: str) -> tuple[str, bool]:
    loc_re = re.compile(r'(?m)^([ \t]*)location\s+\^~\s+' + re.escape(path) + r'\s*\{')
    m = loc_re.search(block)
    if m:
        open_pos = block.find('{', m.start(), m.end())
        close_pos = matching_brace(block, open_pos)
        body = block[open_pos + 1:close_pos]
        changed = False
        indent = m.group(1) + '    '
        inserts = []
        if not re.search(r'(?m)^\s*auth_request\s+off\s*;', body):
            inserts.append(f'\n{indent}auth_request off;')
        if not re.search(r'(?m)^\s*try_files\s+\$uri\s+=404\s*;', body):
            inserts.append(f'\n{indent}try_files $uri =404;')
        if inserts:
            block = block[:open_pos + 1] + ''.join(inserts) + block[open_pos + 1:]
            changed = True
        return block, changed

    open_pos = block.find('{')
    if open_pos < 0:
        raise RuntimeError('server opening brace missing')
    server_indent_match = re.search(r'(?m)^([ \t]*)server\s*\{', block)
    server_indent = server_indent_match.group(1) if server_indent_match else ''
    indent = server_indent + '    '
    snippet = (
        f'\n{indent}# {MARKER} - {label}\n'
        f'{indent}location ^~ {path} {{\n'
        f'{indent}    auth_request off;\n'
        f'{indent}    try_files $uri =404;\n'
        f'{indent}}}\n'
    )
    block = block[:open_pos + 1] + snippet + block[open_pos + 1:]
    return block, True


def patch(text: str) -> tuple[str, int]:
    blocks = server_blocks(text)
    changed_servers = 0
    for start, end in reversed(blocks):
        block = text[start:end]
        if not is_tenant_https(block):
            continue
        original = block
        block, _ = ensure_location(block, ADMIN_PATH, 'Admin static assets')
        block, _ = ensure_location(block, MEDIA_PATH, 'Media-manager static assets')
        if block != original:
            text = text[:start] + block + text[end:]
            changed_servers += 1
    return text, changed_servers


def main() -> int:
    if len(sys.argv) != 3:
        print('usage: patch.py <input> <output>', file=sys.stderr)
        return 2
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    original = src.read_text(encoding='utf-8')
    updated, changed_servers = patch(original)
    dst.write_text(updated, encoding='utf-8')
    print(f'CHANGED_SERVERS={changed_servers}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
PY
python3 -m py_compile "$PATCHER"

echo
echo "== PATCH ENABLED TENANT VHOSTS =="
PATCHED_CONFIGS=0
PATCHED_SERVERS=0
for target in "${TARGETS[@]}"; do
  [[ -f "$target" ]] || continue
  staged="$TMPDIR/$(printf '%s' "$target" | sha256sum | awk '{print $1}').conf"
  result="$(python3 "$PATCHER" "$target" "$staged")" || fail "Unable to patch $target"
  changed_servers="${result#CHANGED_SERVERS=}"
  [[ "$changed_servers" =~ ^[0-9]+$ ]] || fail "Unexpected patcher result for $target: $result"
  if cmp -s "$target" "$staged"; then
    continue
  fi

  backup_file="$BACKUP$target"
  mkdir -p "$(dirname "$backup_file")"
  cp -a "$target" "$backup_file"

  owner="$(stat -c '%u' "$target")"
  group="$(stat -c '%g' "$target")"
  mode="$(stat -c '%a' "$target")"
  install -o "$owner" -g "$group" -m "$mode" "$staged" "$target"
  echo "$target" >> "$CHANGED_LIST"
  ACTIVATED=1
  PATCHED_CONFIGS=$((PATCHED_CONFIGS + 1))
  PATCHED_SERVERS=$((PATCHED_SERVERS + changed_servers))
  echo "PATCHED=$target SERVERS=$changed_servers"
done

echo "PATCHED_CONFIGS=$PATCHED_CONFIGS"
echo "PATCHED_HTTPS_TENANT_SERVERS=$PATCHED_SERVERS"
[[ "$PATCHED_CONFIGS" -gt 0 ]] || echo "No config text changed; existing static authorities will be verified."

echo
echo "== NGINX CONFIG TEST =="
nginx -t
systemctl reload nginx
sleep 2

echo
echo "== DIRECT STATIC ASSET PROOF =="
PROBE_REL="app/admin/assets/js/pmd-device-inline-v6.js"
[[ -s "$ROOT/$PROBE_REL" ]] || fail "Known live admin asset missing: $PROBE_REL"
PROBE_BODY="$TMPDIR/probe.body"
PROBE_META="$(curl -k -fsS -o "$PROBE_BODY" -w '%{http_code}|%{url_effective}|%{num_redirects}' \
  "https://$TEST_HOST/$PROBE_REL?pmdstaticr1=$(date +%s%N)")" || fail "Unable to fetch direct admin static asset"
LOCAL_HASH="$(sha256sum "$ROOT/$PROBE_REL" | awk '{print $1}')"
SERVED_HASH="$(sha256sum "$PROBE_BODY" | awk '{print $1}')"
echo "PROBE=$PROBE_REL"
echo "HTTP/FINAL/REDIRECTS=$PROBE_META"
echo "LOCAL =$LOCAL_HASH"
echo "SERVED=$SERVED_HASH"
[[ "$PROBE_META" == 200\|https://$TEST_HOST/*\|0 ]] || fail "Tenant static asset still redirects or is not 200: $PROBE_META"
[[ "$LOCAL_HASH" == "$SERVED_HASH" ]] || fail "Tenant static asset bytes do not match live file"

echo
echo "== POST-DEPLOY HEALTH =="
POST_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?pmdstaticr1=$(date +%s)")"
POST_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?pmdstaticr1=$(date +%s)")"
POST_ROOT="$(http_code "https://$TEST_HOST/?pmdstaticr1=$(date +%s)")"
echo "settings=$POST_SETTINGS menu=$POST_MENU root=$POST_ROOT"
[[ "$POST_SETTINGS" == "200" && "$POST_MENU" == "200" && "$POST_ROOT" == "200" ]] || fail "Production unhealthy after Nginx change"

HEAD_AFTER="$(sudo -u ubuntu git -C "$ROOT" rev-parse HEAD)"
[[ "$HEAD_BEFORE" == "$HEAD_AFTER" ]] || fail "Live Git HEAD moved"

echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
echo "NO_DB_CHANGES=YES"
echo "NO_PHP_CHANGES=YES"
echo "NO_PAYMENT_CHANGES=YES"
echo "DIRECT_STATIC_ASSET_CONTRACT=PASS"
echo "PMD TENANT STATIC ASSET AUTHORITY R1 DEPLOYED"
