#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-allergen-i18n-v14-backups/$STAMP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

EN="app/admin/i18n/platform/en.php"
DE="app/admin/i18n/platform/de.php"
INDEX="app/admin/views/pmdmenus/index.blade.php"
MODAL="app/admin/views/pmdmenus/_modal_host.blade.php"
MENU_JS="app/admin/assets/js/pmd-menu-manager-v129.js"
WAITER_VIEW="app/admin/views/waiter_pos.blade.php"
WAITER_JS="app/admin/assets/js/pmd-waiter-pos-product-details-v3.js"

cd "$ROOT"
mkdir -p "$BACKUP" "$TMP/candidate/app/admin/i18n" "$TMP/candidate/app/admin/views/pmdmenus" "$TMP/candidate/app/admin/assets/js" "$TMP/candidate/app/admin/views"

for path in "$EN" "$DE" "$INDEX" "$MODAL" "$MENU_JS" "$WAITER_VIEW" "$WAITER_JS"; do
  [ -f "$path" ] || { echo "ERROR=Missing $path" >&2; exit 100; }
done

cp -a "$EN" "$BACKUP/en.php.before"
cp -a "$DE" "$BACKUP/de.php.before"
cp -a "$INDEX" "$BACKUP/pmdmenus-index.blade.php.before"
cp -a "$MODAL" "$BACKUP/pmdmenus-modal-host.blade.php.before"
cp -a "$MENU_JS" "$BACKUP/pmd-menu-manager-v129.js.before"
cp -a "$WAITER_VIEW" "$BACKUP/waiter_pos.blade.php.before"
cp -a "$WAITER_JS" "$BACKUP/pmd-waiter-pos-product-details-v3.js.before"
sha256sum "$EN" "$DE" "$INDEX" "$MODAL" "$MENU_JS" "$WAITER_VIEW" "$WAITER_JS" > "$BACKUP/hashes.before"

cp -a app/admin/i18n/platform "$TMP/candidate/app/admin/i18n/platform"
cp -a "$INDEX" "$TMP/candidate/$INDEX"
cp -a "$MODAL" "$TMP/candidate/$MODAL"
cp -a "$MENU_JS" "$TMP/candidate/$MENU_JS"
cp -a "$WAITER_VIEW" "$TMP/candidate/$WAITER_VIEW"
cp -a "$WAITER_JS" "$TMP/candidate/$WAITER_JS"

echo "============================================================"
echo " PMD SHARED ALLERGEN DISPLAY I18N V14"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

echo "[1/7] Adding shared allergen keys to live-derived catalogue candidates..."
python3 - "$TMP/candidate/$EN" "$TMP/candidate/$DE" <<'PY'
from pathlib import Path
import sys

paths = [Path(sys.argv[1]), Path(sys.argv[2])]
translations = {
    'en': {
        'allergen.celery': 'Celery',
        'allergen.crustaceans': 'Crustaceans',
        'allergen.eggs': 'Eggs',
        'allergen.fish': 'Fish',
        'allergen.gluten': 'Gluten',
        'allergen.lupin': 'Lupin',
        'allergen.milk_lactose': 'Milk / Lactose',
        'allergen.molluscs': 'Molluscs',
        'allergen.mustard': 'Mustard',
        'allergen.nuts': 'Nuts',
        'allergen.peanuts': 'Peanuts',
        'allergen.sesame': 'Sesame',
        'allergen.soy': 'Soy',
        'allergen.sulphites': 'Sulphites',
        'waiter.product_details.allergen_information': 'Allergen information',
        'waiter.product_details.allergen_help': 'Check with the guest before ordering',
    },
    'de': {
        'allergen.celery': 'Sellerie',
        'allergen.crustaceans': 'Krebstiere',
        'allergen.eggs': 'Eier',
        'allergen.fish': 'Fisch',
        'allergen.gluten': 'Gluten',
        'allergen.lupin': 'Lupinen',
        'allergen.milk_lactose': 'Milch / Laktose',
        'allergen.molluscs': 'Weichtiere',
        'allergen.mustard': 'Senf',
        'allergen.nuts': 'Schalenfrüchte',
        'allergen.peanuts': 'Erdnüsse',
        'allergen.sesame': 'Sesam',
        'allergen.soy': 'Soja',
        'allergen.sulphites': 'Sulfite',
        'waiter.product_details.allergen_information': 'Allergeninformationen',
        'waiter.product_details.allergen_help': 'Vor der Bestellung mit dem Gast abklären',
    },
}

for path in paths:
    locale = path.stem.lower()
    wanted = translations[locale]
    text = path.read_text(encoding='utf-8')

    existing = [key for key in wanted if ("'" + key + "' =>") in text]
    if existing:
        raise SystemExit(f"ERROR={locale} already contains V14 keys; refusing ambiguous re-run: {existing}")

    marker = text.rfind('];')
    if marker < 0:
        raise SystemExit(f'ERROR={locale} catalogue closing marker not found')

    block = '\n    // PMD_SHARED_ALLERGEN_DISPLAY_I18N_V14\n'
    for key, value in wanted.items():
        escaped = value.replace('\\', '\\\\').replace("'", "\\'")
        block += f"    '{key}' => '{escaped}',\n"

    text = text[:marker] + block + text[marker:]
    path.write_text(text, encoding='utf-8')
    print(f'CATALOG_{locale.upper()}_V14_KEYS_ADDED={len(wanted)}')
PY

php -l "$TMP/candidate/$EN"
php -l "$TMP/candidate/$DE"

git show "origin/$BRANCH:scripts/pmd-validate-platform-i18n.php" > "$TMP/pmd-validate-platform-i18n.php"
php "$TMP/pmd-validate-platform-i18n.php" "$TMP/candidate"

echo "CATALOG_ALLERGEN_KEYS_OK=1"

echo "[2/7] Building Menu Manager server-rendered allergen label candidate..."
python3 - "$TMP/candidate/$INDEX" "$TMP/candidate/$MODAL" <<'PY'
from pathlib import Path
import sys

index = Path(sys.argv[1])
modal = Path(sys.argv[2])
text = index.read_text(encoding='utf-8')
modal_text = modal.read_text(encoding='utf-8')

if 'PMD_ALLERGEN_DISPLAY_I18N_V14' in text or 'PMD_ALLERGEN_DISPLAY_I18N_V14' in modal_text:
    raise SystemExit('ERROR=V14 Menu marker already present; refusing ambiguous re-run')

old_messages = "    $pmdMenuCopy = [];\n\n    foreach (\\Admin\\Classes\\PmdPlatformI18n::messages($pmdMenuLocale) as $pmdMenuMessageKey => $pmdMenuMessageValue) {\n"
new_messages = "    $pmdMenuCopy = [];\n    $pmdMenuPlatformMessages = \\Admin\\Classes\\PmdPlatformI18n::messages($pmdMenuLocale);\n\n    foreach ($pmdMenuPlatformMessages as $pmdMenuMessageKey => $pmdMenuMessageValue) {\n"
if text.count(old_messages) != 1:
    raise SystemExit('ERROR=Menu platform messages anchor mismatch')
text = text.replace(old_messages, new_messages, 1)

old_closure = "    $pmdT = static function ($key) use ($pmdMenuCopy) {\n        return $pmdMenuCopy[(string)$key] ?? (string)$key;\n    };\n"
new_closure = old_closure + "\n    // PMD_ALLERGEN_DISPLAY_I18N_V14\n    $pmdAllergenLabel = static function ($name) use ($pmdMenuPlatformMessages) {\n        $raw = trim((string)$name);\n        $slug = strtolower($raw);\n        $slug = preg_replace('/[^a-z0-9]+/', '_', $slug) ?? '';\n        $slug = trim($slug, '_');\n        if ($slug === '') return $raw;\n        return $pmdMenuPlatformMessages['allergen.'.$slug] ?? $raw;\n    };\n"
if text.count(old_closure) != 1:
    raise SystemExit('ERROR=Menu translator closure anchor mismatch')
text = text.replace(old_closure, new_closure, 1)

old_tooltip = "title=\"{{ e(implode(', ', $combo['allergen_names'])) }}\""
new_tooltip = "title=\"{{ e(implode(', ', array_map($pmdAllergenLabel, (array)$combo['allergen_names']))) }}\""
if text.count(old_tooltip) != 1:
    raise SystemExit('ERROR=Combo allergen tooltip anchor mismatch')
text = text.replace(old_tooltip, new_tooltip, 1)

old_label = '<b>{{ $allergen->name }}</b>'
new_label = '<b>{{ $pmdAllergenLabel($allergen->name) }}</b>'
if modal_text.count(old_label) != 1:
    raise SystemExit('ERROR=Menu allergen label anchor mismatch')
modal_text = modal_text.replace(old_label, new_label, 1)
modal_text = modal_text.replace('@php\n    $pmdMenuAllergenIcon', '@php\n    // PMD_ALLERGEN_DISPLAY_I18N_V14\n    $pmdMenuAllergenIcon', 1)

# Preserve V10 safety if it is present on the live target.
if 'name="allergen_ids_present" value="1"' not in modal_text:
    raise SystemExit('ERROR=V10 allergen ownership marker missing from live-derived modal candidate')

index.write_text(text, encoding='utf-8')
modal.write_text(modal_text, encoding='utf-8')
print('MENU_ALLERGEN_LABEL_CANDIDATE=1')
print('MENU_COMBO_TOOLTIP_CANDIDATE=1')
PY

echo "[3/7] Building active Menu Manager JS allergen candidate..."
python3 - "$TMP/candidate/$MENU_JS" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
if 'PMD_ALLERGEN_DISPLAY_I18N_V14' in text:
    raise SystemExit('ERROR=V14 Menu JS marker already present; refusing ambiguous re-run')

anchor = "  function tr(key, fallback) {\n    var value = i18n && i18n[key];\n    return typeof value === 'string' && value !== '' ? value : (fallback || key);\n  }\n"
addition = anchor + "\n  // PMD_ALLERGEN_DISPLAY_I18N_V14\n  function platformTr(key, fallback) {\n    var runtime = window.PMDPlatformMessages;\n    if (runtime && typeof runtime.t === 'function') {\n      return runtime.t(key, {}, fallback || key);\n    }\n    return fallback || key;\n  }\n\n  function allergenDisplayName(name) {\n    var raw = String(name == null ? '' : name).trim();\n    var slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');\n    return slug ? platformTr('allergen.' + slug, raw) : raw;\n  }\n"
if text.count(anchor) != 1:
    raise SystemExit('ERROR=Menu JS tr() anchor mismatch')
text = text.replace(anchor, addition, 1)

old = '          text.textContent = name;\n'
new = '          text.textContent = allergenDisplayName(name);\n'
if text.count(old) != 1:
    raise SystemExit('ERROR=Menu JS derived allergen text anchor mismatch')
text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('MENU_COMBO_ALLERGEN_CANDIDATE=1')
PY

node --check "$TMP/candidate/$MENU_JS"

echo "[4/7] Building standalone Waiter POS central-message mount and allergen candidate..."
python3 - "$TMP/candidate/$WAITER_VIEW" "$TMP/candidate/$WAITER_JS" <<'PY'
from pathlib import Path
import sys

view = Path(sys.argv[1])
js = Path(sys.argv[2])
view_text = view.read_text(encoding='utf-8')
js_text = js.read_text(encoding='utf-8')

if 'PMD_WAITER_PLATFORM_MESSAGES_V14' in view_text or 'PMD_ALLERGEN_DISPLAY_I18N_V14' in js_text:
    raise SystemExit('ERROR=V14 Waiter marker already present; refusing ambiguous re-run')

head_anchor = '</head>'
mount = "    {{-- PMD_WAITER_PLATFORM_MESSAGES_V14: standalone page uses the same canonical platform payload. --}}\n    @include('admin::_partials.pmd_platform_messages')\n</head>"
if view_text.count(head_anchor) != 1:
    raise SystemExit('ERROR=Waiter standalone head anchor mismatch')
if 'pmd_platform_messages' in view_text or 'pmd-platform-messages-boot' in view_text:
    raise SystemExit('ERROR=Waiter standalone page already mounts platform messages unexpectedly')
view_text = view_text.replace(head_anchor, mount, 1)

unique_anchor = "  function unique(values) {\n    var seen = Object.create(null);\n    return (values || []).filter(function (value) {\n      value = String(value || '').trim();\n      if (!value || seen[value]) return false;\n      seen[value] = true;\n      return true;\n    });\n  }\n"
helper = unique_anchor + "\n  // PMD_ALLERGEN_DISPLAY_I18N_V14\n  function platformTr(key, fallback) {\n    var runtime = window.PMDPlatformMessages;\n    if (runtime && typeof runtime.t === 'function') {\n      return runtime.t(key, {}, fallback || key);\n    }\n    return fallback || key;\n  }\n\n  function allergenDisplayName(name) {\n    var raw = String(name == null ? '' : name).trim();\n    var slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');\n    return slug ? platformTr('allergen.' + slug, raw) : raw;\n  }\n"
if js_text.count(unique_anchor) != 1:
    raise SystemExit('ERROR=Waiter JS unique() anchor mismatch')
js_text = js_text.replace(unique_anchor, helper, 1)

old_section = "        allergenBox.innerHTML = allergens.length ? '<div class=\"pmd-pos-detail-section-title\"><span>Allergen information</span><small>Check with the guest before ordering</small></div><div class=\"pmd-pos-detail-allergen-list\">' + allergens.map(function (allergen) {\n          var name = typeof allergen === 'string' ? allergen : (allergen.name || 'Allergen');\n          return '<span>' + esc(name) + '</span>';\n        }).join('') + '</div>' : '';\n"
new_section = "        allergenBox.innerHTML = allergens.length ? '<div class=\"pmd-pos-detail-section-title\"><span>' + esc(platformTr('waiter.product_details.allergen_information', 'Allergen information')) + '</span><small>' + esc(platformTr('waiter.product_details.allergen_help', 'Check with the guest before ordering')) + '</small></div><div class=\"pmd-pos-detail-allergen-list\">' + allergens.map(function (allergen) {\n          var name = typeof allergen === 'string' ? allergen : (allergen.name || 'Allergen');\n          return '<span>' + esc(allergenDisplayName(name)) + '</span>';\n        }).join('') + '</div>' : '';\n"
if js_text.count(old_section) != 1:
    raise SystemExit('ERROR=Waiter allergen section anchor mismatch')
js_text = js_text.replace(old_section, new_section, 1)

view.write_text(view_text, encoding='utf-8')
js.write_text(js_text, encoding='utf-8')
print('WAITER_PLATFORM_MESSAGES_CANDIDATE=1')
print('WAITER_ALLERGEN_I18N_CANDIDATE=1')
PY

node --check "$TMP/candidate/$WAITER_JS"

echo "[5/7] Final validation before ANY write..."
php "$TMP/pmd-validate-platform-i18n.php" "$TMP/candidate"
grep -Fq "'allergen.celery' => 'Celery'" "$TMP/candidate/$EN"
grep -Fq "'allergen.celery' => 'Sellerie'" "$TMP/candidate/$DE"
grep -Fq "'allergen.nuts' => 'Schalenfrüchte'" "$TMP/candidate/$DE"
grep -Fq "'allergen.milk_lactose' => 'Milch / Laktose'" "$TMP/candidate/$DE"
grep -Fq 'PMD_ALLERGEN_DISPLAY_I18N_V14' "$TMP/candidate/$INDEX"
grep -Fq 'PMD_ALLERGEN_DISPLAY_I18N_V14' "$TMP/candidate/$MODAL"
grep -Fq 'allergenDisplayName(name)' "$TMP/candidate/$MENU_JS"
grep -Fq 'PMD_WAITER_PLATFORM_MESSAGES_V14' "$TMP/candidate/$WAITER_VIEW"
grep -Fq "@include('admin::_partials.pmd_platform_messages')" "$TMP/candidate/$WAITER_VIEW"
grep -Fq 'allergenDisplayName(name)' "$TMP/candidate/$WAITER_JS"
grep -Fq 'name="allergen_ids_present" value="1"' "$TMP/candidate/$MODAL"
echo "ALL_V14_CANDIDATES_VALID=1"

echo "[6/7] Installing validated display-only i18n candidates..."
sudo tee "$EN" < "$TMP/candidate/$EN" >/dev/null
sudo tee "$DE" < "$TMP/candidate/$DE" >/dev/null
sudo tee "$INDEX" < "$TMP/candidate/$INDEX" >/dev/null
sudo tee "$MODAL" < "$TMP/candidate/$MODAL" >/dev/null
sudo tee "$MENU_JS" < "$TMP/candidate/$MENU_JS" >/dev/null
sudo tee "$WAITER_VIEW" < "$TMP/candidate/$WAITER_VIEW" >/dev/null
sudo tee "$WAITER_JS" < "$TMP/candidate/$WAITER_JS" >/dev/null

php -l "$EN"
php -l "$DE"
node --check "$MENU_JS"
node --check "$WAITER_JS"
php "$TMP/pmd-validate-platform-i18n.php" "$ROOT"
php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[7/7] Verifying installed contract..."
php -r '$en=require $argv[1]; $de=require $argv[2]; $keys=["celery","crustaceans","eggs","fish","gluten","lupin","milk_lactose","molluscs","mustard","nuts","peanuts","sesame","soy","sulphites"]; foreach($keys as $slug){$k="allergen.".$slug; if(!isset($en[$k],$de[$k])||trim((string)$en[$k])===""||trim((string)$de[$k])===""){fwrite(STDERR,"ERROR=missing ".$k.PHP_EOL); exit(1);}} echo "ALLERGEN_I18N_CATALOG_OK=1\n";' "$EN" "$DE"
grep -Fq 'PMD_ALLERGEN_DISPLAY_I18N_V14' "$INDEX"
grep -Fq 'PMD_ALLERGEN_DISPLAY_I18N_V14' "$MODAL"
grep -Fq 'allergenDisplayName(name)' "$MENU_JS"
echo "MENU_ALLERGEN_I18N_OK=1"
grep -Fq 'PMD_WAITER_PLATFORM_MESSAGES_V14' "$WAITER_VIEW"
grep -Fq "@include('admin::_partials.pmd_platform_messages')" "$WAITER_VIEW"
grep -Fq 'allergenDisplayName(name)' "$WAITER_JS"
echo "WAITER_ALLERGEN_I18N_OK=1"
grep -Fq 'name="allergen_ids_present" value="1"' "$MODAL"
echo "V10_ALLERGEN_PRESERVATION_STILL_PRESENT=1"

echo "============================================================"
echo " PMD SHARED ALLERGEN DISPLAY I18N V14 COMPLETE"
echo "============================================================"
echo "ALLERGEN_DISPLAY_I18N_V14_OK=1"
echo "BACKUP=$BACKUP"
echo "EXPECTED_DE=Sellerie,Krebstiere,Eier,Fisch,Gluten,Lupinen,Milch / Laktose,Weichtiere,Senf,Schalenfrüchte,Erdnüsse,Sesam,Soja,Sulfite"
echo "NOTE=Database allergen IDs/names and food associations were not modified."