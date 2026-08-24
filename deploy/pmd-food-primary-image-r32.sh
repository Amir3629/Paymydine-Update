#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
PM2_USER="${PM2_USER:-ubuntu}"
PM2_SERVICE="${PM2_SERVICE:-paymydine-frontend-v2}"
API_TARGET="app/main/routes/menu-highlight-response.php"
SAVE_TARGET="app/admin/controllers/Menus.php"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
STAGE="/var/tmp/pmd-food-primary-image-r32-$STAMP"
BACKUP="$ROOT/storage/pmd-food-primary-image-r32-backups/$STAMP"
ACTIVATED=0
HEAD_BEFORE=""

log() {
  printf '\n============================================================\n%s\n============================================================\n' "$*"
}

fail() {
  printf '\nPMD FOOD PRIMARY IMAGE R3.2 REFUSED: %s\n' "$*" >&2
  exit 2
}

http_status() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || printf '000'
}

restore_one() {
  local rel="$1"
  if [[ -f "$BACKUP/files/$rel" ]]; then
    cp --preserve=mode,ownership,timestamps "$BACKUP/files/$rel" "$ROOT/$rel"
  fi
}

rollback() {
  set +e
  trap - EXIT
  log "AUTOMATIC R3.2 ROLLBACK"
  restore_one "$API_TARGET"
  restore_one "$SAVE_TARGET"
  cd "$ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
  sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null 2>&1 || true
  echo "R3.2 CODE ROLLBACK COMPLETE"
  echo "No database rows were modified by this deployer."
  exit 1
}

on_exit() {
  local rc=$?
  if [[ "$rc" -ne 0 && "$ACTIVATED" == "1" ]]; then
    rollback
  fi
  exit "$rc"
}
trap on_exit EXIT

[[ "$EUID" -eq 0 ]] || fail "Run with sudo/root"
for cmd in git php python3 curl systemctl; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"
done
[[ -f "$ROOT/artisan" ]] || fail "Not a PayMyDine root: $ROOT"
[[ -f "$ROOT/$API_TARGET" ]] || fail "Missing live API target"
[[ -f "$ROOT/$SAVE_TARGET" ]] || fail "Missing live save target"

cd "$ROOT"

log "1. PRE-DEPLOY HEALTH + CONTRACT"
HEAD_BEFORE="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "HEAD:   $HEAD_BEFORE"
echo "BRANCH: $(git branch --show-current 2>/dev/null || echo unknown)"

grep -q 'PMD_FOOD_PLACEHOLDER_BRAND_R3' "$API_TARGET" \
  || fail "R3 placeholder authority is not active"
grep -q 'onPmdMenuManagerSaveV1' "$SAVE_TARGET" \
  || fail "Menu Manager save authority missing"
if grep -q 'PMD_FOOD_REAL_IMAGE_AUTHORITY_R32' "$API_TARGET"; then
  fail "R3.2 API authority is already active"
fi
if grep -q 'PMD_FOOD_UPLOAD_PERSISTENCE_R32' "$SAVE_TARGET"; then
  fail "R3.2 save authority is already active"
fi

PRE_MENU="$(http_status "https://$TEST_HOST/api/v1/menu?r32pre=$STAMP")"
PRE_ROOT="$(http_status "https://$TEST_HOST/?r32pre=$STAMP")"
PRE_ADMIN="$(http_status "https://$TEST_HOST/admin/pmdmenus?r32pre=$STAMP")"
echo "PRE menu=$PRE_MENU root=$PRE_ROOT admin=$PRE_ADMIN"
[[ "$PRE_MENU" == "200" ]] || fail "Menu unhealthy before deploy: HTTP $PRE_MENU"
[[ "$PRE_ROOT" != 5* && "$PRE_ROOT" != "000" ]] || fail "Frontend unhealthy before deploy: HTTP $PRE_ROOT"
[[ "$PRE_ADMIN" != 5* && "$PRE_ADMIN" != "000" ]] || fail "Admin unhealthy before deploy: HTTP $PRE_ADMIN"

log "2. BACKUP EXACTLY TWO FILES"
mkdir -p "$STAGE/files/$(dirname "$API_TARGET")" "$STAGE/files/$(dirname "$SAVE_TARGET")"
mkdir -p "$BACKUP/files/$(dirname "$API_TARGET")" "$BACKUP/files/$(dirname "$SAVE_TARGET")"
chmod 755 "$STAGE" "$STAGE/files"
chmod 700 "$BACKUP"
for rel in "$API_TARGET" "$SAVE_TARGET"; do
  cp --preserve=mode,ownership,timestamps "$ROOT/$rel" "$BACKUP/files/$rel"
  cp --preserve=mode,ownership,timestamps "$ROOT/$rel" "$STAGE/files/$rel"
done

log "3. PATCH FOOD IMAGE AUTHORITY + SAVE PERSISTENCE"
python3 - "$STAGE/files/$API_TARGET" "$STAGE/files/$SAVE_TARGET" <<'PY'
from pathlib import Path
import sys

api = Path(sys.argv[1])
save = Path(sys.argv[2])

# ------------------------------------------------------------------
# API: preload both real image authorities explicitly from the same
# tenant connection used by the menu response.
# ------------------------------------------------------------------
s = api.read_text()
insert_before = "if (!function_exists('pmd_menu_highlights_response_20260607')) {\n"
if insert_before not in s:
    raise SystemExit('REFUSED: menu response function marker missing')

helper = r'''// PMD_FOOD_REAL_IMAGE_AUTHORITY_R32
if (!function_exists('pmd_menu_real_image_sources_r32')) {
    function pmd_menu_real_image_sources_r32($conn, array $menuIds): array
    {
        $menuIds = array_values(array_unique(array_filter(array_map('intval', $menuIds))));
        $out = ['gallery' => [], 'attachments' => []];
        if (!$menuIds) return $out;

        try {
            $schema = $conn->getSchemaBuilder();

            if ($schema->hasTable('menu_images')) {
                $cols = $schema->getColumnListing('menu_images');
                $q = $conn->table('menu_images')
                    ->whereIn('menu_id', $menuIds)
                    ->whereNotNull('image_path');
                $q->orderBy('menu_id');
                if (in_array('sort_order', $cols, true)) $q->orderBy('sort_order');
                if (in_array('id', $cols, true)) $q->orderBy('id');

                foreach ($q->get(['menu_id', 'image_path']) as $row) {
                    $url = function_exists('pmd_menu_gallery_image_url')
                        ? pmd_menu_gallery_image_url($row->image_path ?? '')
                        : null;
                    $id = (int)($row->menu_id ?? 0);
                    if ($id > 0 && is_string($url) && trim($url) !== '') {
                        if (!isset($out['gallery'][$id])) $out['gallery'][$id] = [];
                        if (!in_array($url, $out['gallery'][$id], true)) {
                            $out['gallery'][$id][] = $url;
                        }
                    }
                }
            }

            if ($schema->hasTable('media_attachments')) {
                $cols = $schema->getColumnListing('media_attachments');
                $idCol = in_array('attachment_id', $cols, true) ? 'attachment_id' : null;
                $typeCol = in_array('attachment_type', $cols, true) ? 'attachment_type' : null;
                $tagCol = in_array('tag', $cols, true) ? 'tag' : null;
                $nameCol = null;
                foreach (['name', 'disk_name', 'file_name', 'path'] as $candidate) {
                    if (in_array($candidate, $cols, true)) {
                        $nameCol = $candidate;
                        break;
                    }
                }

                if ($idCol && $nameCol) {
                    $q = $conn->table('media_attachments')->whereIn($idCol, $menuIds);
                    if ($typeCol) {
                        $q->whereIn($typeCol, ['menus', 'Admin\\Models\\Menus_model']);
                    }
                    if ($tagCol) $q->where($tagCol, 'thumb');
                    $q->orderBy($idCol);
                    if (in_array('id', $cols, true)) $q->orderByDesc('id');

                    foreach ($q->get([$idCol, $nameCol]) as $row) {
                        $id = (int)($row->{$idCol} ?? 0);
                        $raw = trim((string)($row->{$nameCol} ?? ''));
                        if ($id < 1 || $raw === '' || isset($out['attachments'][$id])) continue;

                        if (preg_match('#^https?://#i', $raw)) {
                            $url = $raw;
                        } else {
                            $clean = ltrim(str_replace('\\', '/', $raw), '/');
                            foreach (['assets/media/attachments/public/', 'attachments/public/'] as $prefix) {
                                if (strpos($clean, $prefix) === 0) {
                                    $clean = substr($clean, strlen($prefix));
                                    break;
                                }
                            }
                            if (strpos($clean, 'api/media/') === 0) {
                                $url = '/'.$clean;
                            } else {
                                $url = '/api/media/'.$clean;
                            }
                        }
                        $out['attachments'][$id] = $url;
                    }
                }
            }
        } catch (\Throwable $e) {
            try {
                \Log::warning('PMD_FOOD_REAL_IMAGE_AUTHORITY_R32_READ_FAILED', [
                    'message' => $e->getMessage(),
                    'database' => method_exists($conn, 'getDatabaseName') ? $conn->getDatabaseName() : null,
                ]);
            } catch (\Throwable $ignored) {}
        }

        return $out;
    }
}

'''
if 'PMD_FOOD_REAL_IMAGE_AUTHORITY_R32' not in s:
    s = s.replace(insert_before, helper + insert_before, 1)

old_items = "            $items = $conn->select($query);\n            $stats = pmd_menu_popularity_stats_20260607();\n"
new_items = "            $items = $conn->select($query);\n            $pmdRealImagesR32 = pmd_menu_real_image_sources_r32($conn, array_map(static fn($row) => (int)($row->id ?? 0), $items));\n            $stats = pmd_menu_popularity_stats_20260607();\n"
if old_items not in s:
    raise SystemExit('REFUSED: menu items preload marker changed unexpectedly')
s = s.replace(old_items, new_items, 1)

old_r3 = '''                // PMD_FOOD_PLACEHOLDER_BRAND_R3
                $item->image = $item->image ? "/api/media/".$item->image : '/brand/paymydine-logo.svg';
                $item->isCombo = false;
                $item->comboId = null;
                $item->images = pmd_menu_gallery_images_for_id((int)$item->id);
'''
new_r32 = '''                // PMD_FOOD_PLACEHOLDER_BRAND_R3
                // PMD_FOOD_REAL_IMAGE_AUTHORITY_R32
                // Real selected image wins. The PMD glass logo is a true no-photo fallback only.
                $pmdMenuIdR32 = (int)$item->id;
                $item->images = $pmdRealImagesR32['gallery'][$pmdMenuIdR32] ?? [];
                $pmdSelectedImageR32 = trim((string)($item->images[0] ?? ''));
                $pmdAttachmentImageR32 = trim((string)($pmdRealImagesR32['attachments'][$pmdMenuIdR32] ?? ''));
                if ($pmdSelectedImageR32 !== '') {
                    $item->image = $pmdSelectedImageR32;
                } elseif ($pmdAttachmentImageR32 !== '') {
                    $item->image = $pmdAttachmentImageR32;
                } elseif (!empty($item->image)) {
                    $item->image = "/api/media/".ltrim((string)$item->image, '/');
                } else {
                    $item->image = '/brand/paymydine-logo.svg';
                }
                $item->isCombo = false;
                $item->comboId = null;
'''
if old_r3 not in s:
    raise SystemExit('REFUSED: live R3 primary-image block changed unexpectedly')
s = s.replace(old_r3, new_r32, 1)
api.write_text(s)

# ------------------------------------------------------------------
# Save: persist the uploaded image using the exact connection of the
# saved Menu model. Never silently report success if the image row was
# skipped because a facade resolved another schema/connection.
# ------------------------------------------------------------------
s = save.read_text()
old_save = '''                if ($uploadedRelative && Schema::hasTable('menu_images')) {
                    DB::table('menu_images')->where('menu_id', $menu->menu_id)->increment('sort_order', 1);
                    DB::table('menu_images')->insert([
                        'menu_id' => (int)$menu->menu_id,
                        'image_path' => $uploadedRelative,
                        'sort_order' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
'''
new_save = '''                // PMD_FOOD_UPLOAD_PERSISTENCE_R32
                if ($uploadedRelative) {
                    $pmdMenuConnectionR32 = $menu->getConnection();
                    $pmdMenuSchemaR32 = $pmdMenuConnectionR32->getSchemaBuilder();
                    if (!$pmdMenuSchemaR32->hasTable('menu_images')) {
                        throw new \\RuntimeException('Menu image storage is unavailable for this restaurant.');
                    }

                    $pmdMenuConnectionR32->table('menu_images')
                        ->where('menu_id', (int)$menu->menu_id)
                        ->increment('sort_order', 1);

                    $pmdMenuConnectionR32->table('menu_images')->insert([
                        'menu_id' => (int)$menu->menu_id,
                        'image_path' => $uploadedRelative,
                        'sort_order' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
'''
if old_save not in s:
    raise SystemExit('REFUSED: Menu Manager upload persistence block changed unexpectedly')
s = s.replace(old_save, new_save, 1)
save.write_text(s)
PY

for rel in "$API_TARGET" "$SAVE_TARGET"; do
  php -l "$STAGE/files/$rel" >/dev/null || fail "PHP syntax failed: $rel"
done
grep -q 'PMD_FOOD_REAL_IMAGE_AUTHORITY_R32' "$STAGE/files/$API_TARGET" || fail "R3.2 API marker missing"
grep -q 'PMD_FOOD_UPLOAD_PERSISTENCE_R32' "$STAGE/files/$SAVE_TARGET" || fail "R3.2 save marker missing"

log "4. WRITE FILE-SAFE ROLLBACK"
cat > "$BACKUP/rollback.sh" <<ROLLBACK
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$ROOT"
BACKUP="$BACKUP"
PM2_USER="$PM2_USER"
PM2_SERVICE="$PM2_SERVICE"
FILES=("$API_TARGET" "$SAVE_TARGET")
[[ "\$EUID" -eq 0 ]] || { echo "Run with sudo/root"; exit 2; }
for rel in "\${FILES[@]}"; do
  cp --preserve=mode,ownership,timestamps "\$BACKUP/files/\$rel" "\$ROOT/\$rel"
done
cd "\$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "\$PM2_USER" -H pm2 restart "\$PM2_SERVICE" --update-env >/dev/null 2>&1 || true
echo "PMD FOOD PRIMARY IMAGE R3.2 ROLLED BACK"
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

log "5. ACTIVATE EXACTLY TWO PHP FILES"
ACTIVATED=1
for rel in "$API_TARGET" "$SAVE_TARGET"; do
  cp --preserve=mode,ownership,timestamps "$STAGE/files/$rel" "$ROOT/$rel"
done

cd "$ROOT"
php artisan optimize:clear >/dev/null
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null
sleep 3

log "6. FAIL-CLOSED POST-DEPLOY HEALTH"
POST_MENU="$(http_status "https://$TEST_HOST/api/v1/menu?r32post=$STAMP")"
POST_ROOT="$(http_status "https://$TEST_HOST/?r32post=$STAMP")"
POST_ADMIN="$(http_status "https://$TEST_HOST/admin/pmdmenus?r32post=$STAMP")"
echo "POST menu=$POST_MENU root=$POST_ROOT admin=$POST_ADMIN"
[[ "$POST_MENU" == "200" ]] || fail "Menu broke after R3.2: HTTP $POST_MENU"
[[ "$POST_ROOT" != 5* && "$POST_ROOT" != "000" ]] || fail "Frontend broke after R3.2: HTTP $POST_ROOT"
[[ "$POST_ADMIN" != 5* && "$POST_ADMIN" != "000" ]] || fail "Admin broke after R3.2: HTTP $POST_ADMIN"

POST_BODY="$(curl -k -fsSL "https://$TEST_HOST/api/v1/menu?r32body=$STAMP")"
POST_AUDIT="$(printf '%s' "$POST_BODY" | python3 -c '
import json, sys
j=json.load(sys.stdin)
items=(j.get("data") or {}).get("items") or []
real=[]; placeholder=[]; pasta=[]; mismatch=[]
for x in items:
    image=str(x.get("image") or "")
    images=x.get("images") or []
    if image == "/brand/paymydine-logo.svg": placeholder.append(x)
    elif image == "/images/pasta.png": pasta.append(x)
    elif image: real.append(x)
    if isinstance(images, list) and images and str(images[0] or "").strip() and image != str(images[0]):
        mismatch.append(x)
print("real=%d placeholder=%d pasta=%d gallery_mismatch=%d" % (len(real), len(placeholder), len(pasta), len(mismatch)))
for x in real[:30]: print("REAL", x.get("id"), x.get("name"), x.get("image"))
for x in placeholder[:30]: print("PLACEHOLDER", x.get("id"), x.get("name"))
if pasta or mismatch:
    raise SystemExit(3)
')" || fail "R3.2 menu image contract failed"
echo "$POST_AUDIT"

HEAD_AFTER="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "Git HEAD after deploy: $HEAD_AFTER"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || fail "Git HEAD moved unexpectedly"

ACTIVATED=0
trap - EXIT
rm -rf "$STAGE"

log "PMD FOOD PRIMARY IMAGE R3.2 DEPLOYED"
echo "Contract:"
echo "- menu_images first selected image is primary"
echo "- media_attachments thumb supports both menus and Admin\\Models\\Menus_model"
echo "- PMD glass logo appears only when neither real source exists"
echo "- Future Menu Manager uploads persist through the Menu model tenant connection"
echo "- No DB rows were modified by deployment"
echo "- No Git checkout/reset/pull performed"
echo "Backup:   $BACKUP"
echo "Rollback: sudo bash $BACKUP/rollback.sh"
