#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MARKER = "PMD_TABLE_QR_TEMPLATE_STUDIO_V1"
CSS_HREF = "/app/admin/assets/css/pmd-table-qr-template-studio-v1.css?v=20260825_1"
JS_SRC = "/app/admin/assets/js/pmd-table-qr-template-studio-v1.js?v=20260825_1"
QR_AUTHORITY = "$qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($qr_redirect_url);"

if len(sys.argv) != 2:
    raise SystemExit("usage: pmd-table-qr-template-studio-v1-patch.py <tables/edit.blade.php>")

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

if MARKER in text and CSS_HREF in text and JS_SRC in text:
    print("PMD_TABLE_QR_TEMPLATE_STUDIO_V1_PATCH_ALREADY_PRESENT")
    raise SystemExit(0)

if text.count(QR_AUTHORITY) != 1:
    raise SystemExit("REFUSED: canonical table QR provider anchor missing or duplicated")

if '<div class="ms-qr" style="margin-left:2rem;">' in text:
    text = text.replace('<div class="ms-qr" style="margin-left:2rem;">', '<div class="ms-qr">', 1)
elif '<div class="ms-qr">' not in text:
    raise SystemExit("REFUSED: table QR container anchor missing")

css_link = f'<link rel="stylesheet" href="{CSS_HREF}">\n\n'
if CSS_HREF not in text:
    text = css_link + text

start = text.find(QR_AUTHORITY)
if start < 0:
    raise SystemExit("REFUSED: table QR generator authority disappeared during patch")

end_candidates = [
    text.find("\n    } \n    ?>", start),
    text.find("\n    }\n    ?>", start),
]
end_candidates = [idx for idx in end_candidates if idx >= 0]
if not end_candidates:
    raise SystemExit("REFUSED: unable to locate end of existing table QR presentation block")
end = min(end_candidates)

replacement = r'''$qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($qr_redirect_url);

        // PMD_TABLE_QR_GENERATOR_AUTHORITY_UNCHANGED_V1
        // Keep the existing QR provider and payload exactly as-is. The template
        // studio below only changes how the already-generated QR is presented/downloaded.
        $qr_code_image = file_get_contents($qr_code_url);
        $base64_qr_code = base64_encode($qr_code_image);
        $qrDataUri = 'data:image/png;base64,' . $base64_qr_code;

        // PMD_TABLE_QR_TEMPLATE_STUDIO_V1
        // Read-only restaurant identity. No setting, table or QR data is written here.
        $settingValue = static function (string $key) {
            try {
                return DB::table('settings')->where('item', $key)->value('value');
            } catch (\Throwable $error) {
                return null;
            }
        };

        $restaurantName = trim((string)($settingValue('pmd_restaurant_identity_name') ?: $settingValue('site_name') ?: ''));
        if ($restaurantName === '') {
            try {
                $restaurantName = trim((string)(DB::table('locations')->where('location_id', $location_id)->value('location_name') ?: ''));
            } catch (\Throwable $error) {
                $restaurantName = '';
            }
        }
        if ($restaurantName === '') {
            $restaurantName = ucfirst((string)(explode('.', request()->getHost())[0] ?? 'Restaurant'));
        }

        $restaurantLogo = trim((string)($settingValue('pmd_restaurant_identity_logo') ?: $settingValue('site_logo') ?: ''));
        if ($restaurantLogo === '') {
            $restaurantLogo = '/brand/paymydine-logo.svg';
        } elseif (!preg_match('#^https?://#i', $restaurantLogo)) {
            $logoPath = '/'.ltrim(str_replace('\\', '/', (string)(parse_url($restaurantLogo, PHP_URL_PATH) ?: $restaurantLogo)), '/');
            if (str_starts_with($logoPath, '/api/media/') || str_starts_with($logoPath, '/assets/media/') || str_starts_with($logoPath, '/brand/')) {
                $restaurantLogo = $logoPath;
            } elseif (str_starts_with($logoPath, '/uploads/')) {
                $restaurantLogo = '/assets/media'.$logoPath;
            } else {
                $restaurantLogo = '/api/media/'.basename($logoPath);
            }
        }

        $tableDisplayName = trim((string)($table_data->table_name ?? ''));
        if ($tableDisplayName === '') {
            $tableDisplayName = 'Table '.$tableNumber;
        }

        echo '<div class="pmd-table-qr-studio-v1"'
            .' data-pmd-qr-template-studio-v1="1"'
            .' data-pmd-qr-src="'.e($qrDataUri).'"'
            .' data-pmd-restaurant-name="'.e($restaurantName).'"'
            .' data-pmd-restaurant-logo="'.e($restaurantLogo).'"'
            .' data-pmd-table-name="'.e($tableDisplayName).'">';
        echo '<div class="pmd-table-qr-studio-v1__preview">';
        echo '<img id="qr-code" src="'.e($qrDataUri).'" alt="QR Code for '.e($tableDisplayName).'" />';
        echo '</div>';
        echo '<div class="pmd-table-qr-studio-v1__actions">';
        echo '<strong>'.e($tableDisplayName).' QR code</strong>';
        echo '<span>Choose from 10 branded restaurant templates before downloading.</span>';
        echo '<button type="button" class="pmd-table-qr-studio-v1__button" data-pmd-qr-template-open-v1>Choose design &amp; download</button>';
        echo '</div>';
        echo '</div>';
'''

text = text[:start] + replacement + text[end:]

# Remove only the legacy inline QR styling block if it is still present.
legacy_style = re.compile(r"\n<style>\s*\.ms-qr\s*\{.*?\.ms-qr\s+button\s*\{.*?</style>\s*", re.S)
text = legacy_style.sub("\n", text, count=1)

script_tag = f'<script src="{JS_SRC}" defer></script>'
if JS_SRC not in text:
    text = text.rstrip() + "\n\n" + script_tag + "\n"

contracts = {
    "studio marker": MARKER,
    "generator unchanged marker": "PMD_TABLE_QR_GENERATOR_AUTHORITY_UNCHANGED_V1",
    "QR provider": QR_AUTHORITY,
    "open button": "data-pmd-qr-template-open-v1",
    "restaurant identity": "pmd_restaurant_identity_logo",
    "stylesheet": CSS_HREF,
    "script": JS_SRC,
}
for label, needle in contracts.items():
    if needle not in text:
        raise SystemExit(f"REFUSED: {label} contract missing after patch")

if 'download="qr-code.png"' in text or '>Download QR Code<' in text:
    raise SystemExit("REFUSED: legacy direct QR download UI still present")

path.write_text(text, encoding="utf-8")
print("PMD_TABLE_QR_TEMPLATE_STUDIO_V1_PATCH_OK")
