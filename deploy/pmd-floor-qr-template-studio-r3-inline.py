#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MARKER = "PMD_FLOOR_QR_TEMPLATE_STUDIO_R3_INLINE"

if len(sys.argv) != 4:
    raise SystemExit("usage: pmd-floor-qr-template-studio-r3-inline.py <floor-partial> <studio-css> <studio-js>")

partial_path = Path(sys.argv[1])
css_path = Path(sys.argv[2])
js_path = Path(sys.argv[3])

text = partial_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")
studio_js = js_path.read_text(encoding="utf-8")

if MARKER in text:
    print("PMD_FLOOR_QR_TEMPLATE_STUDIO_R3_INLINE_ALREADY_PRESENT")
    raise SystemExit(0)

button_pattern = re.compile(
    r'<button\s+type="button"\s+data-pmd-floor-table-qr-download>'
    r"\{\{\s*\$pmdFloorTableManagerLocale\s*===\s*'de'\s*\?\s*'QR herunterladen'\s*:\s*'Download QR'\s*\}\}"
    r'</button>'
)
button_replacement = (
    '<button type="button" data-pmd-floor-table-qr-download '
    'data-pmd-floor-qr-template-trigger-r3="1">'
    "{{ $pmdFloorTableManagerLocale === 'de' ? 'Design wählen & herunterladen' : 'Choose design & download' }}"
    '</button>'
)
text, count = button_pattern.subn(button_replacement, text, count=1)
if count != 1:
    raise SystemExit("REFUSED: live Floor QR download button anchor missing or changed")

if "onPmdFloorTableManagerQrDownload" in text:
    # The handler normally lives in JS/backend, not this partial. Presence here is harmless,
    # but this patch never replaces or defines that backend authority.
    pass

identity_block = r'''
{{-- PMD_FLOOR_QR_TEMPLATE_STUDIO_R3_IDENTITY_READ_ONLY --}}
@php
    $pmdFloorQrRestaurantNameR3 = '';
    $pmdFloorQrRestaurantLogoR3 = '';
    try {
        $pmdFloorQrRestaurantNameR3 = trim((string)(
            \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', 'pmd_restaurant_identity_name')
                ->value('value')
            ?: \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', 'site_name')
                ->value('value')
            ?: ''
        ));
    } catch (\Throwable $error) {
        $pmdFloorQrRestaurantNameR3 = '';
    }
    if ($pmdFloorQrRestaurantNameR3 === '') {
        try {
            $pmdFloorQrRestaurantNameR3 = trim((string)(
                \Illuminate\Support\Facades\DB::table('locations')
                    ->where('location_id', (int)$pmdFloorTableManagerLocationId)
                    ->value('location_name')
                ?: ''
            ));
        } catch (\Throwable $error) {
            $pmdFloorQrRestaurantNameR3 = '';
        }
    }
    if ($pmdFloorQrRestaurantNameR3 === '') {
        $pmdFloorQrRestaurantNameR3 = ucfirst((string)(explode('.', request()->getHost())[0] ?? 'Restaurant'));
    }

    try {
        $pmdFloorQrRestaurantLogoR3 = trim((string)(
            \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', 'pmd_restaurant_identity_logo')
                ->value('value')
            ?: \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', 'site_logo')
                ->value('value')
            ?: ''
        ));
    } catch (\Throwable $error) {
        $pmdFloorQrRestaurantLogoR3 = '';
    }
    if ($pmdFloorQrRestaurantLogoR3 === '') {
        $pmdFloorQrRestaurantLogoR3 = '/brand/paymydine-logo.svg';
    } elseif (!preg_match('#^https?://#i', $pmdFloorQrRestaurantLogoR3)) {
        $pmdFloorQrLogoPathR3 = '/'.ltrim(str_replace('\\\\', '/', (string)(parse_url($pmdFloorQrRestaurantLogoR3, PHP_URL_PATH) ?: $pmdFloorQrRestaurantLogoR3)), '/');
        if (str_starts_with($pmdFloorQrLogoPathR3, '/api/media/')
            || str_starts_with($pmdFloorQrLogoPathR3, '/assets/media/')
            || str_starts_with($pmdFloorQrLogoPathR3, '/brand/')) {
            $pmdFloorQrRestaurantLogoR3 = $pmdFloorQrLogoPathR3;
        } elseif (str_starts_with($pmdFloorQrLogoPathR3, '/uploads/')) {
            $pmdFloorQrRestaurantLogoR3 = '/assets/media'.$pmdFloorQrLogoPathR3;
        } else {
            $pmdFloorQrRestaurantLogoR3 = '/api/media/'.basename($pmdFloorQrLogoPathR3);
        }
    }
@endphp
<div
    data-pmd-floor-qr-studio-identity-r3
    data-pmd-restaurant-name="{{ $pmdFloorQrRestaurantNameR3 }}"
    data-pmd-restaurant-logo="{{ $pmdFloorQrRestaurantLogoR3 }}"
    hidden
></div>
'''

manager_anchor = '        <div\n            class="pmd-floor-table-manager"\n            data-pmd-floor-table-manager-panel'
idx = text.find(manager_anchor)
if idx < 0:
    # Accept compact variants while still requiring the exact manager data attribute.
    match = re.search(r'\s*<div\s+class="pmd-floor-table-manager"\s+data-pmd-floor-table-manager-panel', text)
    if not match:
        raise SystemExit("REFUSED: Floor table manager panel anchor missing")
    idx = match.start()
text = text[:idx] + "\n" + identity_block + "\n" + text[idx:]

# Reuse the reviewed 10-template renderer, but keep it inline so this feature has no
# dependency on a new static asset URL/cache layer.
inline_style = "\n<style id=\"pmd-floor-qr-template-studio-r3-style\">\n/* " + MARKER + " */\n" + css + "\n.pmd-qr-template-modal-v1{z-index:2147483647!important;}\n</style>\n"

adapter_js = r'''
(function () {
    'use strict';
    if (window.PMDFloorQrTemplateStudioR3) return;

    function closestButton(target) {
        if (!target) return null;
        if (target.closest) return target.closest('[data-pmd-floor-table-qr-download]');
        return null;
    }

    function csrfToken() {
        var node = document.querySelector('meta[name="csrf-token"]');
        return node && node.content ? node.content : '';
    }

    function showError(panel, message) {
        var box = panel && panel.querySelector('[data-pmd-floor-table-manager-error]');
        if (box) {
            box.hidden = false;
            box.textContent = message || 'QR design could not be prepared.';
            return;
        }
        window.alert(message || 'QR design could not be prepared.');
    }

    function openStudio(payload, panel, tableId) {
        var identity = document.querySelector('[data-pmd-floor-qr-studio-identity-r3]');
        var tableNoField = panel && panel.querySelector('[data-pmd-floor-table-field="table_no"]');
        var tableNo = tableNoField ? String(tableNoField.value || '').trim() : '';
        var restaurantName = identity ? identity.getAttribute('data-pmd-restaurant-name') || 'Restaurant' : 'Restaurant';
        var restaurantLogo = identity ? identity.getAttribute('data-pmd-restaurant-logo') || '' : '';
        var tableName = tableNo ? ('Table ' + tableNo) : ('Table ' + tableId);

        var adapter = document.createElement('div');
        adapter.hidden = true;
        adapter.setAttribute('data-pmd-qr-template-studio-v1', '1');
        adapter.setAttribute('data-pmd-qr-src', payload.data_url || '');
        adapter.setAttribute('data-pmd-restaurant-name', restaurantName);
        adapter.setAttribute('data-pmd-restaurant-logo', restaurantLogo);
        adapter.setAttribute('data-pmd-table-name', tableName);

        var trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.setAttribute('data-pmd-qr-template-open-v1', '1');
        adapter.appendChild(trigger);
        document.body.appendChild(adapter);

        if (!window.PMDQrTemplateStudioV1 || typeof window.PMDQrTemplateStudioV1.boot !== 'function') {
            adapter.remove();
            throw new Error('QR Template Studio runtime is unavailable.');
        }

        window.PMDQrTemplateStudioV1.boot();
        trigger.click();
        setTimeout(function () { adapter.remove(); }, 0);
    }

    function fetchQr(button) {
        var panel = button.closest('[data-pmd-floor-table-manager-panel]');
        var root = document.querySelector('[data-pmd-floor-table-manager="true"]');
        var tableIdField = panel && panel.querySelector('[data-pmd-floor-table-field="table_id"]');
        var tableId = Number(tableIdField ? tableIdField.value : 0) || 0;
        var locationId = Number(root ? root.getAttribute('data-pmd-floor-table-manager-location') : 0) || 0;
        var url = root ? root.getAttribute('data-pmd-floor-table-manager-url') : '';
        if (!url) url = window.location.href;
        if (tableId < 1) throw new Error('Save the table first, then choose a QR design.');

        var originalText = button.textContent;
        button.disabled = true;
        button.textContent = document.documentElement.lang === 'de' ? 'Designs werden vorbereitet…' : 'Preparing designs…';
        button.dataset.pmdQrStudioBusyR3 = '1';

        var headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-IGNITER-REQUEST-HANDLER': 'onPmdFloorTableManagerQrDownload'
        };
        var token = csrfToken();
        if (token) headers['X-CSRF-TOKEN'] = token;

        return fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: headers,
            body: JSON.stringify({ location_id: locationId, table_id: tableId })
        }).then(function (response) {
            return response.text().then(function (body) {
                var payload = {};
                try { payload = body ? JSON.parse(body) : {}; }
                catch (error) { payload = { message: body }; }
                if (!response.ok || payload.ok === false) {
                    throw new Error(payload.message || body || ('HTTP ' + response.status));
                }
                if (!payload.data_url) throw new Error('QR download data is unavailable.');
                openStudio(payload, panel, tableId);
                return payload;
            });
        }).catch(function (error) {
            showError(panel, error && error.message ? error.message : String(error));
            throw error;
        }).finally(function () {
            button.disabled = false;
            button.textContent = originalText;
            delete button.dataset.pmdQrStudioBusyR3;
        });
    }

    document.addEventListener('click', function (event) {
        var button = closestButton(event.target);
        if (!button) return;
        // Capture-phase interception prevents the legacy Floor JS direct-download
        // listener from running. The same existing backend handler is reused below.
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (button.dataset.pmdQrStudioBusyR3 === '1') return;
        try {
            fetchQr(button).catch(function () {});
        } catch (error) {
            var panel = button.closest('[data-pmd-floor-table-manager-panel]');
            showError(panel, error && error.message ? error.message : String(error));
        }
    }, true);

    window.PMDFloorQrTemplateStudioR3 = {
        version: '3.0.0',
        backendHandler: 'onPmdFloorTableManagerQrDownload',
        templates: 10
    };
    console.info('[PMD Floor QR Template Studio R3] Ready', window.PMDFloorQrTemplateStudioR3);
})();
'''

inline_script = "\n<script id=\"pmd-floor-qr-template-studio-r3-runtime\">\n/* " + MARKER + " */\n" + studio_js + "\n" + adapter_js + "\n</script>\n"

# Append after the existing Floor bootstrap scripts so the complete Floor DOM exists.
text = text.rstrip() + "\n" + inline_style + inline_script + "\n"

contracts = [
    MARKER,
    'data-pmd-floor-qr-template-trigger-r3',
    'data-pmd-floor-qr-studio-identity-r3',
    'Choose design & download',
    'Design wählen & herunterladen',
    'onPmdFloorTableManagerQrDownload',
    'PMDQrTemplateStudioV1',
    'PMDFloorQrTemplateStudioR3',
    "id: 'classic'",
    "id: 'midnight'",
    "id: 'emerald'",
    "id: 'bistro'",
    "id: 'ocean'",
    "id: 'mono'",
    "id: 'gold'",
    "id: 'coral'",
    "id: 'tent'",
    "id: 'botanical'",
    'Powered by',
    'PayMyDine',
]
for needle in contracts:
    if needle not in text:
        raise SystemExit(f"REFUSED: R3 contract missing after patch: {needle}")

if text.count("id: 'classic'") != 1:
    raise SystemExit("REFUSED: QR template runtime duplicated")

partial_path.write_text(text, encoding="utf-8")
print("PMD_FLOOR_QR_TEMPLATE_STUDIO_R3_INLINE_PATCH_OK")
