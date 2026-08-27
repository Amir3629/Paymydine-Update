#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

MARKER = 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16'

CORE_TARGETS = [
    'app/admin/classes/PmdPlatformI18n.php',
    'app/admin/i18n/platform/en.php',
    'app/admin/i18n/platform/de.php',
    'app/admin/views/_partials/pmd_platform_messages.blade.php',
    'app/admin/assets/js/pmd-platform-messages.js',
]

SETTINGS_BLADE_TARGETS = [
    'app/admin/views/pmdsettings/index.blade.php',
    'app/admin/views/pmdsettings/restaurant.blade.php',
    'app/admin/views/pmdsettings/frontend.blade.php',
    'app/admin/views/pmdmenu/index.blade.php',
    'app/admin/views/pmdcustomer/index.blade.php',
    'app/admin/views/pmdteam/index.blade.php',
    'app/admin/views/pmdteam/_inline_staff_form_v1.blade.php',
    'app/admin/views/pmddevices/index.blade.php',
    'app/admin/views/pmddevices/_inline_modal_form.blade.php',
    'app/admin/views/pmddevices/_cash_drawer_simple_form.blade.php',
    'app/admin/views/pmddevices/_inline_modal_host.blade.php',
    'app/admin/views/pmdfinance/index.blade.php',
    'app/admin/views/pmdfinance/_inline_provider_form_v1.blade.php',
    'app/admin/views/pmdfinance/_inline_payment_form_v1.blade.php',
    'app/admin/views/pmdbrand/index.blade.php',
    'app/admin/views/pmdadvanced/index.blade.php',
    'app/admin/views/_partials/pmd_settings_inline_modal_host_v1.blade.php',
]

SETTINGS_JS_TARGETS = [
    'app/admin/assets/js/pmd-settings-inline-detail-v1.js',
    'app/admin/assets/js/pmd-device-inline-v6.js',
]

REPORT_TARGETS = [
    'app/admin/controllers/Pmdreports.php',
    'app/admin/views/pmdreports/index.blade.php',
    'app/admin/assets/js/pmd-reports-v1.js',
]

ALL_TARGETS = CORE_TARGETS + SETTINGS_BLADE_TARGETS + SETTINGS_JS_TARGETS + REPORT_TARGETS

SETTINGS_EXTRA: Dict[str, str] = {
    'No matching settings': 'Keine passenden Einstellungen',
    'Try another search term.': 'Versuchen Sie einen anderen Suchbegriff.',
    'Cashier App': 'Kassen-App',
    'PayMyDine Cashier': 'PayMyDine Kasse',
    'Download desktop app': 'Desktop-App herunterladen',
    'Download for Windows': 'Für Windows herunterladen',
    'Download for macOS': 'Für macOS herunterladen',
    'Close device settings': 'Geräteeinstellungen schließen',
    'Delete': 'Löschen',
    'Save device': 'Gerät speichern',
    'Delete device': 'Gerät löschen',
    'Staff attendance details': 'Details zur Mitarbeiteranwesenheit',
    'No POS devices are configured yet.': 'Noch keine POS-Geräte konfiguriert.',
    'Settings': 'Einstellungen',
    'No description': 'Keine Beschreibung',
    'Saved, but this settings section could not refresh': 'Gespeichert, aber dieser Einstellungsbereich konnte nicht aktualisiert werden',
    'Saved, but the Devices list could not refresh': 'Gespeichert, aber die Geräteliste konnte nicht aktualisiert werden',
}

REPORT_EXTRA: Dict[str, str] = {
    'Export this report as CSV': 'Diesen Bericht als CSV exportieren',
    'Chart type': 'Diagrammtyp',
    'Line': 'Linie',
    'Bar': 'Balken',
    'Report': 'Bericht',
    'No activity yet': 'Noch keine Aktivität',
    'There are no matching rows for this report window.': 'Für diesen Berichtszeitraum gibt es keine passenden Zeilen.',
    'There are no matching source rows for this report.': 'Für diesen Bericht gibt es keine passenden Quelldaten.',
    'No data for this view': 'Keine Daten für diese Ansicht',
    'There is no matching source activity for the selected report window.': 'Für den ausgewählten Berichtszeitraum gibt es keine passende Aktivität in der Datenquelle.',
    'All staff': 'Alle Mitarbeitenden',
    'Staff summary': 'Mitarbeiterübersicht',
    'Time-clock shifts': 'Zeiterfassungsschichten',
    'Active sessions': 'Aktive Sitzungen',
    'Right now': 'Jetzt',
    'Admin or time clock': 'Admin oder Zeiterfassung',
    'Admin session history': 'Verlauf der Admin-Sitzungen',
    'Attendance history': 'Anwesenheitsverlauf',
    'No matching staff': 'Keine passenden Mitarbeitenden',
    'Try another name, role or username.': 'Versuchen Sie einen anderen Namen, eine andere Rolle oder einen anderen Benutzernamen.',
    'No Admin staff accounts found': 'Keine Admin-Mitarbeiterkonten gefunden',
    'No enabled Admin account could be resolved for this location.': 'Für diesen Standort konnte kein aktiviertes Admin-Konto ermittelt werden.',
    'Open report': 'Bericht öffnen',
    'Custom date range': 'Benutzerdefinierter Datumsbereich',
    'Custom report date range': 'Benutzerdefinierter Berichtszeitraum',
    'Choose a custom date range': 'Benutzerdefinierten Datumsbereich auswählen',
    'Choose inclusive start and end dates.': 'Wählen Sie Start- und Enddatum einschließlich.',
    'Apply range': 'Zeitraum anwenden',
    'Please choose both dates.': 'Bitte wählen Sie beide Daten aus.',
    'Dashboard2 canonical analytics source.': 'Kanonische Dashboard2-Analytics-Datenquelle.',
    'Async report type mismatch': 'Berichtstyp der asynchronen Antwort stimmt nicht überein',
    'Expected JSON report response': 'JSON-Berichtsantwort erwartet',
    'Invalid report response': 'Ungültige Berichtsantwort',
    'Open': 'Offen',
    'Offline': 'Offline',
    'Online': 'Online',
    'Admin session': 'Admin-Sitzung',
    'Attendance': 'Anwesenheit',
    'No attendance rows in this period.': 'Keine Anwesenheitseinträge in diesem Zeitraum.',
    'No Admin sessions in this period.': 'Keine Admin-Sitzungen in diesem Zeitraum.',
    'Source': 'Quelle',
    'Currency': 'Währung',
    'at this location': 'an diesem Standort',
    'tenant-wide': 'mandantenweit',
    'threshold': 'Schwellenwert',
    'Selected period': 'Ausgewählter Zeitraum',
    'Current': 'Aktuell',
    'No description': 'Keine Beschreibung',
}

DEVICE_JS_SIMPLE = [
    'Device settings', 'Connector not detected on this PC.', 'Finding printers...',
    'Could not read printers.', 'No available Windows printers found',
    'No available printer was found.', 'Default', 'Delete this device configuration?',
    'Saving…', 'Deleting…', 'Working…',
    'KDS station save was not confirmed by the server.', 'Deleted', 'Saved',
    'Printer saved for this POS.', 'Printer saved.', 'Test print sent.',
    'Drawer test sent.', 'Done', 'Request failed',
]
INLINE_JS_SIMPLE = ['Settings', 'Saving…', 'Working…', 'Saved', 'Done', 'Request failed']


def die(message: str, code: int = 2) -> None:
    print(f'ERROR={message}', file=sys.stderr)
    raise SystemExit(code)


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


def php_single(value: str) -> str:
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def js_single(value: str) -> str:
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n') + "'"


def slugify(value: str) -> str:
    source = value
    value = value.lower().replace('’', '').replace("'", '')
    value = re.sub(r'[^a-z0-9]+', '_', value).strip('_')
    if not value:
        value = 'copy_' + hashlib.sha1(source.encode('utf-8')).hexdigest()[:10]
    if len(value) > 72:
        value = value[:61].rstrip('_') + '_' + hashlib.sha1(source.encode('utf-8')).hexdigest()[:10]
    return value


def load_maps(map_path: Path) -> Tuple[Dict[str, str], Dict[str, str]]:
    try:
        raw = json.loads(read(map_path))
    except Exception as exc:
        die(f'Cannot parse V16 map JSON: {exc}')
    settings = dict(raw.get('settings') or {})
    reports = dict(raw.get('reports') or {})
    settings.update(SETTINGS_EXTRA)
    reports.update(REPORT_EXTRA)
    settings['Canceled status'] = 'Stornierungsstatus'
    reports['Open'] = 'Offen'
    return settings, reports


def copy_targets(root: Path, candidate: Path, backup: Path) -> None:
    for rel in ALL_TARGETS:
        src = root / rel
        if not src.is_file():
            die(f'Missing live target {rel}', 100)
        dst = candidate / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        bdst = backup / (rel.replace('/', '__') + '.before')
        bdst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, bdst)


def catalog_array(path: Path) -> Dict[str, str]:
    text = read(path)
    out: Dict[str, str] = {}
    rx = re.compile(r"^\s*'((?:\\'|[^'])+)'\s*=>\s*'((?:\\'|[^'])*)',\s*$", re.M)
    for m in rx.finditer(text):
        key = m.group(1).replace("\\'", "'").replace('\\\\', '\\')
        val = m.group(2).replace("\\'", "'").replace('\\\\', '\\')
        out[key] = val
    if not out:
        die(f'Could not parse canonical catalogue {path}')
    return out


def add_catalog_keys(en_path: Path, de_path: Path, settings: Dict[str, str], reports: Dict[str, str]) -> int:
    en_text = read(en_path)
    de_text = read(de_path)
    if MARKER in en_text or MARKER in de_text:
        die('V16 catalogue marker already present; refusing ambiguous re-run')
    existing_en = catalog_array(en_path)
    existing_de = catalog_array(de_path)
    if set(existing_en) != set(existing_de):
        die('Live EN/DE catalogue key parity is already broken before V16')
    additions: List[Tuple[str, str, str]] = []
    used = set(existing_en)
    for prefix, mapping in [('settings', settings), ('reports', reports)]:
        for source, german in mapping.items():
            source = str(source)
            german = str(german)
            if not source.strip() or not german.strip():
                die(f'Empty V16 mapping in {prefix}')
            base = f'{prefix}.ui.{slugify(source)}'
            key = base
            if key in used:
                suffix = hashlib.sha1((prefix + '\0' + source).encode('utf-8')).hexdigest()[:10]
                key = f'{base}_{suffix}'
            used.add(key)
            additions.append((key, source, german))

    def block(which: str) -> str:
        lines = [f"\n    // {MARKER}"]
        for key, source, german in additions:
            value = source if which == 'en' else german
            value = value.replace('\\', '\\\\').replace("'", "\\'")
            lines.append(f"    '{key}' => '{value}',")
        return '\n'.join(lines) + '\n'

    for path, text, which in [(en_path, en_text, 'en'), (de_path, de_text, 'de')]:
        pos = text.rfind('];')
        if pos < 0:
            die(f'Catalogue closing marker missing in {path}')
        write(path, text[:pos] + block(which) + text[pos:])
    return len(additions)


def patch_platform_class(path: Path) -> None:
    text = read(path)
    if MARKER in text:
        die('V16 platform class marker already present')
    anchor = "\n    public static function translate("
    pos = text.find(anchor)
    if pos < 0:
        die('PmdPlatformI18n translate() anchor missing')
    addition = r'''

    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    public static function fromEnglish(
        string $value,
        string $prefix = '',
        array $replace = [],
        ?string $locale = null,
        ?string $fallback = null
    ): string {
        if ($value === '') return $fallback ?? $value;
        $prefix = trim($prefix);
        static $sourceIndexes = [];
        if (!array_key_exists($prefix, $sourceIndexes)) {
            $index = [];
            foreach (self::messages('en') as $key => $source) {
                if ($prefix !== '' && !str_starts_with((string)$key, $prefix)) continue;
                if (is_string($source) && $source !== '' && !array_key_exists($source, $index)) $index[$source] = (string)$key;
            }
            $sourceIndexes[$prefix] = $index;
        }
        $key = $sourceIndexes[$prefix][$value] ?? null;
        if (!$key) return $fallback ?? $value;
        return self::translate($key, $replace, $locale, $fallback ?? $value);
    }

    public static function translateStructure($value, string $prefix = '', ?string $locale = null)
    {
        if (is_string($value)) return self::fromEnglish($value, $prefix, [], $locale, $value);
        if (!is_array($value)) return $value;
        $translated = [];
        foreach ($value as $key => $item) $translated[$key] = self::translateStructure($item, $prefix, $locale);
        return $translated;
    }
'''
    write(path, text[:pos] + addition + text[pos:])


def patch_platform_partial(path: Path) -> None:
    text = read(path)
    if MARKER in text:
        die('V16 platform message partial marker already present')
    old = "    $pmdPlatformMessages = \\Admin\\Classes\\PmdPlatformI18n::messages($pmdPlatformLocale);\n"
    if text.count(old) != 1:
        die('Platform message partial messages anchor mismatch')
    text = text.replace(old, old + "    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16\n    $pmdPlatformEnglishMessages = \\Admin\\Classes\\PmdPlatformI18n::messages('en');\n", 1)
    boot = "window.PMD_PLATFORM_MESSAGES = @json($pmdPlatformMessages);\n"
    if text.count(boot) != 1:
        die('Platform message partial boot anchor mismatch')
    text = text.replace(boot, boot + "window.PMD_PLATFORM_MESSAGES_ENGLISH = @json($pmdPlatformEnglishMessages);\n", 1)
    write(path, text)


def patch_platform_runtime(path: Path) -> None:
    text = read(path)
    if MARKER in text:
        die('V16 platform runtime marker already present')
    anchor = "    var messages = window.PMD_PLATFORM_MESSAGES || {};\n"
    if text.count(anchor) != 1:
        die('Platform runtime messages anchor mismatch')
    text = text.replace(anchor, anchor + "    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16\n    var englishMessages = window.PMD_PLATFORM_MESSAGES_ENGLISH || {};\n    var sourceIndexes = Object.create(null);\n", 1)
    anchor2 = "\n    window.PMDPlatformMessages = Object.freeze({\n"
    if text.count(anchor2) != 1:
        die('Platform runtime export anchor mismatch')
    helper = r'''

    function sourceIndex(prefix) {
        prefix = String(prefix || '');
        if (sourceIndexes[prefix]) return sourceIndexes[prefix];
        var index = Object.create(null);
        Object.keys(englishMessages).forEach(function (key) {
            if (prefix && key.indexOf(prefix) !== 0) return;
            var source = englishMessages[key];
            if (typeof source !== 'string' || !source || Object.prototype.hasOwnProperty.call(index, source)) return;
            index[source] = key;
        });
        sourceIndexes[prefix] = index;
        return index;
    }

    function fromEnglish(value, prefix, fallback) {
        value = String(value == null ? '' : value);
        var key = sourceIndex(prefix || '')[value];
        if (!key) return fallback == null ? value : String(fallback);
        return t(key, {}, fallback == null ? value : fallback);
    }
'''
    text = text.replace(anchor2, helper + anchor2, 1)
    export_anchor = "        t: t,\n"
    if text.count(export_anchor) != 1:
        die('Platform runtime t export anchor mismatch')
    text = text.replace(export_anchor, export_anchor + "        fromEnglish: fromEnglish,\n", 1)
    write(path, text)


def inject_blade_helper(text: str, variable: str, prefix: str) -> str:
    if MARKER in text:
        die(f'V16 marker already present while injecting {variable}')
    return (
        "@php\n"
        f"    // {MARKER}\n"
        f"    ${variable} = ${variable} ?? static function ($value) {{\n"
        f"        return \\Admin\\Classes\\PmdPlatformI18n::fromEnglish((string)$value, '{prefix}');\n"
        "    };\n"
        "@endphp\n\n" + text
    )


def transform_blade_visible(text: str, mapping: Dict[str, str], helper: str) -> Tuple[str, int]:
    parts = re.split(r'(?is)(<script\b.*?</script>|<style\b.*?</style>)', text)
    count = 0
    attrs = ['aria-label', 'title', 'placeholder', 'alt', 'data-pmd-confirm', 'data-pmd-inline-title']
    attr_rx = re.compile(r'(' + '|'.join(re.escape(a) for a in attrs) + r')="([^"]*)"')
    node_rx = re.compile(r'>([^<>]+)<')

    def arg(source: str) -> str:
        return f"{{{{ ${helper}({php_single(source)}) }}}}"

    def patch_segment(segment: str) -> str:
        nonlocal count
        def attr_repl(m: re.Match) -> str:
            nonlocal count
            name, value = m.group(1), m.group(2)
            if '{{' in value or '{!!' in value:
                return m.group(0)
            if value in mapping:
                count += 1
                return f'{name}="{arg(value)}"'
            return m.group(0)
        segment = attr_rx.sub(attr_repl, segment)

        def node_repl(m: re.Match) -> str:
            nonlocal count
            raw = m.group(1)
            if '{{' in raw or '@' in raw or '{!!' in raw:
                return m.group(0)
            stripped = raw.strip()
            if stripped in mapping:
                lead = raw[:len(raw) - len(raw.lstrip())]
                trail = raw[len(raw.rstrip()):]
                count += 1
                return '>' + lead + arg(stripped) + trail + '<'
            return m.group(0)
        return node_rx.sub(node_repl, segment)

    for i in range(0, len(parts), 2):
        parts[i] = patch_segment(parts[i])
    return ''.join(parts), count


def must_replace(text: str, old: str, new: str, label: str, min_count: int = 1, max_count: int | None = None) -> str:
    count = text.count(old)
    if count < min_count or (max_count is not None and count > max_count):
        die(f'{label} anchor mismatch: found {count}')
    return text.replace(old, new)


def patch_settings_blade(path: Path, rel: str, mapping: Dict[str, str]) -> int:
    text = inject_blade_helper(read(path), 'pmdSettingsText', 'settings.')
    text, count = transform_blade_visible(text, mapping, 'pmdSettingsText')
    if rel.endswith('pmdsettings/index.blade.php'):
        text = must_replace(text, "@foreach(($pmdSettingsGroups ?? []) as $group)", "@foreach(\\Admin\\Classes\\PmdPlatformI18n::translateStructure(($pmdSettingsGroups ?? []), 'settings.') as $group)", 'Settings groups translation', 1, 1)
    elif rel.endswith('pmdsettings/restaurant.blade.php'):
        text = must_replace(text, "{{ $day['label'] }}", "{{ $pmdSettingsText($day['label']) }}", 'Restaurant day label', 1)
        text = must_replace(text, "{{ $social['label'] }}", "{{ $pmdSettingsText($social['label']) }}", 'Restaurant social label', 1)
    elif rel.endswith('pmdsettings/frontend.blade.php'):
        for old, new in [
            ("{{ $theme['type'] }}", "{{ $pmdSettingsText($theme['type']) }}"),
            ("{{ $toggle['label'] }}", "{{ $pmdSettingsText($toggle['label']) }}"),
            ("{{ $toggle['desc'] }}", "{{ $pmdSettingsText($toggle['desc']) }}"),
        ]:
            if old in text: text = text.replace(old, new)
    elif rel.endswith('pmdteam/index.blade.php'):
        if "{{ $role->description ?: 'No description' }}" in text:
            text = text.replace("{{ $role->description ?: 'No description' }}", "{{ $pmdSettingsText($role->description ?: 'No description') }}")
    elif rel.endswith('pmddevices/index.blade.php'):
        for old, new in [
            ("{{ method_exists($device, 'isOnline') && $device->isOnline() ? 'Online' : ($device->device_status ?: 'Configured') }}", "{{ $pmdSettingsText(method_exists($device, 'isOnline') && $device->isOnline() ? 'Online' : ($device->device_status ?: 'Configured')) }}"),
            ("{{ $terminal->pairing_state ?: 'Unknown pairing' }}", "{{ $pmdSettingsText($terminal->pairing_state ?: 'Unknown pairing') }}"),
            ("{{ !empty($terminal->is_active) ? ($terminal->terminal_status ?: 'Active') : 'Inactive' }}", "{{ $pmdSettingsText(!empty($terminal->is_active) ? ($terminal->terminal_status ?: 'Active') : 'Inactive') }}"),
            ("{{ !empty($drawer->status) ? 'Enabled' : 'Disabled' }}", "{{ $pmdSettingsText(!empty($drawer->status) ? 'Enabled' : 'Disabled') }}"),
            ("{{ !empty($device->status) ? 'Enabled' : 'Disabled' }}", "{{ $pmdSettingsText(!empty($device->status) ? 'Enabled' : 'Disabled') }}"),
        ]:
            if old in text: text = text.replace(old, new)
        text = text.replace("$pmdKdsCategoryCount.' routed categories' : 'All menu categories'", "$pmdKdsCategoryCount.' '.$pmdSettingsText('routed categories') : $pmdSettingsText('All menu categories')")
    elif rel.endswith('pmddevices/_inline_modal_form.blade.php'):
        text = text.replace("<span>{{ $label }}</span>", "<span>{{ $pmdSettingsText($label) }}</span>")
        text = text.replace(">{{ $label }}</option>", ">{{ $pmdSettingsText($label) }}</option>")
    elif rel.endswith('pmddevices/_cash_drawer_simple_form.blade.php'):
        old = "? (($opts['local_pos'][$pmdLocalPosId] ?? null) ?: 'Configured POS terminal')\n        : 'Not connected yet';"
        new = "? (($opts['local_pos'][$pmdLocalPosId] ?? null) ?: $pmdSettingsText('Configured POS terminal'))\n        : $pmdSettingsText('Not connected yet');"
        if old in text: text = text.replace(old, new)
    elif rel.endswith('pmdfinance/_inline_provider_form_v1.blade.php'):
        old = 'data-pmd-inline-title="Edit {{ $provider->name ?: ucfirst(str_replace(\'_\',\' \',$code)) }} provider"'
        if old in text:
            text = text.replace(old, 'data-pmd-inline-title="{{ $pmdSettingsText(\'Edit provider\') }}: {{ $provider->name ?: ucfirst(str_replace(\'_\',\' \',$code)) }}"')
        text = text.replace("{{ $field['label'] ?? ucwords(str_replace('_',' ',(string)$name)) }}", "{{ $pmdSettingsText($field['label'] ?? ucwords(str_replace('_',' ',(string)$name))) }}")
        text = text.replace("{{ $optionLabel }}", "{{ $pmdSettingsText($optionLabel) }}")
        text = text.replace("{{ $field['help'] }}", "{{ $pmdSettingsText($field['help']) }}")
    write(path, text)
    return count


def inject_js_text_helper(text: str, function_name: str, prefix: str) -> str:
    if MARKER in text:
        die(f'V16 marker already present in JS while injecting {function_name}')
    anchor = "  'use strict';\n"
    if text.count(anchor) != 1:
        die(f'JS use-strict anchor mismatch for {function_name}')
    helper = (
        anchor + f"\n  // {MARKER}\n"
        f"  function {function_name}(value) {{\n"
        "    var runtime = window.PMDPlatformMessages;\n"
        "    value = String(value == null ? '' : value);\n"
        "    return runtime && typeof runtime.fromEnglish === 'function'\n"
        f"      ? runtime.fromEnglish(value, '{prefix}', value)\n"
        "      : value;\n"
        "  }\n"
    )
    return text.replace(anchor, helper, 1)


def replace_standalone_js_literals(text: str, sources: Iterable[str], fn: str) -> str:
    for source in sorted(set(sources), key=len, reverse=True):
        lit = js_single(source)
        replacement = f"{fn}({lit})"
        patterns = [
            (rf"(?P<prefix>\b(?:setStatus|Error)\()\s*{re.escape(lit)}(?P<suffix>\s*[,\)])", rf"\g<prefix>{replacement}\g<suffix>"),
            (rf"(?P<prefix>\b(?:textContent|title)\s*=\s*){re.escape(lit)}(?P<suffix>\s*;)", rf"\g<prefix>{replacement}\g<suffix>"),
            (rf"(?P<prefix>\bsetAttribute\([^,]+,\s*){re.escape(lit)}(?P<suffix>\s*\))", rf"\g<prefix>{replacement}\g<suffix>"),
        ]
        for pattern, repl in patterns: text = re.sub(pattern, repl, text)
    return text


def patch_settings_js(path: Path, rel: str) -> None:
    text = inject_js_text_helper(read(path), 'settingsText', 'settings.')
    if rel.endswith('pmd-settings-inline-detail-v1.js'):
        text = replace_standalone_js_literals(text, INLINE_JS_SIMPLE, 'settingsText')
        text = text.replace("form.getAttribute('data-pmd-inline-title') || 'Settings'", "form.getAttribute('data-pmd-inline-title') || settingsText('Settings')")
        text = text.replace("throw new Error('Saved, but this settings section could not refresh (' + response.status + ')')", "throw new Error(settingsText('Saved, but this settings section could not refresh') + ' (' + response.status + ')')")
    else:
        text = replace_standalone_js_literals(text, DEVICE_JS_SIMPLE, 'settingsText')
        text = text.replace("|| 'Device settings'", "|| settingsText('Device settings')")
        for old, new in {
            "'Connected on this PC'": "settingsText('Connected on this PC')",
            "'Connector is running but not paired. Download the connector again.'": "settingsText('Connector is running but not paired. Download the connector again.')",
            "'Not connected on this PC. Download and run the PayMyDine connector once.'": "settingsText('Not connected on this PC. Download and run the PayMyDine connector once.')",
            "'Connector is not available. Install it first, then try again.'": "settingsText('Connector is not available. Install it first, then try again.')",
            "'Connected. Printer list loaded from this PC.'": "settingsText('Connected. Printer list loaded from this PC.')",
            "'Printers found. Choose the receipt printer, then click Use this printer.'": "settingsText('Printers found. Choose the receipt printer, then click Use this printer.')",
            "'Download started. Run the file on this PC, then click Check connection.'": "settingsText('Download started. Run the file on this PC, then click Check connection.')",
        }.items():
            text = text.replace(old, new)
        text = text.replace("(printer.default ? ' (Default)' : '')", "(printer.default ? ' (' + settingsText('Default') + ')' : '')")
        text = text.replace("throw new Error('Saved, but the Devices list could not refresh (' + response.status + ')')", "throw new Error(settingsText('Saved, but the Devices list could not refresh') + ' (' + response.status + ')')")
        text = text.replace("window.confirm('Delete this device configuration?')", "window.confirm(settingsText('Delete this device configuration?'))")
    write(path, text)


def patch_reports_controller(path: Path) -> None:
    text = read(path)
    if MARKER in text: die('V16 marker already present in Pmdreports controller')
    use_anchor = "use Admin\\Facades\\Template;\n"
    if text.count(use_anchor) != 1: die('Pmdreports use anchor mismatch')
    text = text.replace(use_anchor, use_anchor + "use Admin\\Classes\\PmdPlatformI18n;\n", 1)
    old = "        $meta = $this->meta($type);\n        $period = $this->period($type);\n        [$start, $end, $periodLabel] = $this->window($period);\n        Template::setTitle($meta['title']);\n        Template::setHeading($meta['title']);\n"
    new = "        // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16\n        $meta = $this->pmdLocalizeReportMeta($this->meta($type));\n        $period = $this->period($type);\n        [$start, $end, $periodLabel] = $this->window($period);\n        $periodLabel = $this->pmdReportDisplayText($periodLabel);\n        Template::setTitle($meta['title']);\n        Template::setHeading($meta['title']);\n"
    if text.count(old) != 1: die('Pmdreports show() opening anchor mismatch')
    text = text.replace(old, new, 1)
    payload_anchor = "            $payload = $this->payload($type, $start, $end, $period);\n"
    if text.count(payload_anchor) != 1: die('Pmdreports payload anchor mismatch')
    text = text.replace(payload_anchor, payload_anchor + "            $payload = $this->pmdLocalizeReportPayload($type, $payload);\n", 1)
    text = text.replace("'error' => 'This report could not be loaded from its source right now.',", "'error' => $this->pmdReportDisplayText('This report could not be loaded from its source right now.'),")
    text = text.replace("'source' => 'Runtime query failed safely. No data was changed.',", "'source' => $this->pmdReportDisplayText('Runtime query failed safely. No data was changed.'),")
    periods_anchor = "            'periods' => $this->periodOptions($type),\n"
    if text.count(periods_anchor) != 1: die('Pmdreports periods assignment anchor mismatch')
    text = text.replace(periods_anchor, "            'periods' => $this->pmdLocalizeReportPeriods($this->periodOptions($type)),\n", 1)
    anchor = "\n    protected function reportUrl(string $type): string\n"
    if text.count(anchor) != 1: die('Pmdreports reportUrl anchor mismatch')
    helpers = r'''

    protected function pmdReportText(string $value): string
    {
        return PmdPlatformI18n::fromEnglish($value, 'reports.', [], null, $value);
    }

    protected function pmdReportDisplayText(string $value): string
    {
        if ($value === '') return $value;
        if (str_starts_with($value, 'Custom · ')) return $this->pmdReportText('Custom').' · '.substr($value, strlen('Custom · '));
        if (preg_match('/^(\d+) at this location · (\d+) tenant-wide$/', $value, $m)) return $m[1].' '.$this->pmdReportText('at this location').' · '.$m[2].' '.$this->pmdReportText('tenant-wide');
        if (preg_match('/^Current · (\d+) min threshold$/', $value, $m)) return $this->pmdReportText('Current').' · '.$m[1].' min '.$this->pmdReportText('threshold');
        if (str_starts_with($value, 'Selected period · ')) return $this->pmdReportText('Selected period').' · '.substr($value, strlen('Selected period · '));
        return $this->pmdReportText($value);
    }

    protected function pmdLocalizeReportMeta(array $meta): array
    {
        foreach (['title', 'subtitle'] as $key) if (isset($meta[$key]) && is_string($meta[$key])) $meta[$key] = $this->pmdReportDisplayText($meta[$key]);
        return $meta;
    }

    protected function pmdLocalizeReportPeriods(array $periods): array
    {
        foreach ($periods as $key => $label) if (is_string($label)) $periods[$key] = $this->pmdReportDisplayText($label);
        return $periods;
    }

    protected function pmdLocalizeReportPayload(string $type, array $payload): array
    {
        foreach ((array)($payload['stats'] ?? []) as $index => $stat) {
            if (!is_array($stat)) continue;
            if (isset($stat['label']) && is_string($stat['label'])) $stat['label'] = $this->pmdReportDisplayText($stat['label']);
            if (isset($stat['meta']) && is_string($stat['meta'])) $stat['meta'] = $this->pmdReportDisplayText($stat['meta']);
            $payload['stats'][$index] = $stat;
        }
        foreach ((array)($payload['columns'] ?? []) as $index => $column) {
            if (!is_array($column)) continue;
            if (isset($column['label']) && is_string($column['label'])) $column['label'] = $this->pmdReportDisplayText($column['label']);
            $payload['columns'][$index] = $column;
        }
        if (isset($payload['error']) && is_string($payload['error'])) $payload['error'] = $this->pmdReportDisplayText($payload['error']);
        $payload['rows'] = $this->pmdLocalizeReportRows($type, (array)($payload['rows'] ?? []));
        if ($type === 'attendance') {
            foreach ((array)($payload['staff_directory_rows'] ?? []) as $i => $row) {
                if (!is_array($row)) continue;
                if (isset($row['last_activity']) && is_string($row['last_activity'])) $row['last_activity'] = $this->pmdReportDisplayText($row['last_activity']);
                $payload['staff_directory_rows'][$i] = $row;
            }
            foreach ((array)($payload['selected_admin_sessions'] ?? []) as $i => $row) {
                if (!is_array($row)) continue;
                foreach (['end','status'] as $key) if (isset($row[$key]) && is_string($row[$key])) $row[$key] = $this->pmdReportDisplayText($row[$key]);
                $payload['selected_admin_sessions'][$i] = $row;
            }
            foreach ((array)($payload['selected_attendance_rows'] ?? []) as $i => $row) {
                if (!is_array($row)) continue;
                foreach (['verification','status'] as $key) if (isset($row[$key]) && is_string($row[$key])) $row[$key] = $this->pmdReportDisplayText($row[$key]);
                $payload['selected_attendance_rows'][$i] = $row;
            }
        }
        return $payload;
    }

    protected function pmdLocalizeReportRows(string $type, array $rows): array
    {
        $safeKeys = match ($type) {
            'transactions' => ['channel', 'method'],
            'alerts' => ['alert', 'detail'],
            'liveorders' => ['channel'],
            'channels' => ['channel'],
            'reviews' => ['status'],
            'reservations' => ['tables', 'status'],
            'attendance' => ['verification', 'status'],
            default => [],
        };
        if (!$safeKeys) return $rows;
        foreach ($rows as $i => $row) {
            if (!is_array($row)) continue;
            foreach ($safeKeys as $key) if (isset($row[$key]) && is_string($row[$key])) $row[$key] = $this->pmdReportDisplayText($row[$key]);
            $rows[$i] = $row;
        }
        return $rows;
    }
'''
    text = text.replace(anchor, helpers + anchor, 1)
    old_channel = "protected function channelLabel(string $value): string { $v=strtolower(trim($value));if(in_array($v,['collection','takeaway','take-away','pickup'],true))return'Take away';if(in_array($v,['delivery','delivered'],true))return'Delivery';if(in_array($v,['','dine_in','dine-in','restaurant','table'],true))return'Dine in';return ucwords(str_replace(['_','-'],' ',$v)); }"
    new_channel = "protected function channelLabel(string $value): string { $v=strtolower(trim($value));if(in_array($v,['collection','takeaway','take-away','pickup'],true))return $this->pmdReportText('Take away');if(in_array($v,['delivery','delivered'],true))return $this->pmdReportText('Delivery');if(in_array($v,['','dine_in','dine-in','restaurant','table'],true))return $this->pmdReportText('Dine in');return ucwords(str_replace(['_','-'],' ',$v)); }"
    if old_channel not in text: die('Pmdreports channelLabel exact anchor mismatch')
    text = text.replace(old_channel, new_channel, 1)
    old_payment = "protected function paymentLabel(string $value): string { $c=strtolower(trim(preg_replace('/[^a-z0-9]+/i','_',$value),'_'));return match($c){'cash','cod','cash_on_delivery'=>'Cash','card','credit_card','debit_card','stripe','worldline','sumup','square','vr_payment'=>'Card','apple_pay','applepay'=>'Apple Pay','google_pay','googlepay'=>'Google Pay','paypal','pay_pal'=>'PayPal','wero'=>'Wero','','qr_payment_later','qr_pay_later','payment_later','pay_later','later','deferred','pending_payment','unpaid','not_paid'=>'Not recorded',default=>ucwords(str_replace('_',' ',$c)),}; }"
    new_payment = "protected function paymentLabel(string $value): string { $c=strtolower(trim(preg_replace('/[^a-z0-9]+/i','_',$value),'_'));$label=match($c){'cash','cod','cash_on_delivery'=>'Cash','card','credit_card','debit_card','stripe','worldline','sumup','square','vr_payment'=>'Card','apple_pay','applepay'=>'Apple Pay','google_pay','googlepay'=>'Google Pay','paypal','pay_pal'=>'PayPal','wero'=>'Wero','','qr_payment_later','qr_pay_later','payment_later','pay_later','later','deferred','pending_payment','unpaid','not_paid'=>'Not recorded',default=>ucwords(str_replace('_',' ',$c)),};return $this->pmdReportText($label); }"
    if old_payment not in text: die('Pmdreports paymentLabel exact anchor mismatch')
    text = text.replace(old_payment, new_payment, 1)
    write(path, text)


def patch_reports_blade(path: Path, mapping: Dict[str, str]) -> int:
    text = inject_blade_helper(read(path), 'pmdReportText', 'reports.')
    text, count = transform_blade_visible(text, mapping, 'pmdReportText')
    anchor = "    $profile = $profiles[$type] ?? $profiles['sales'];\n"
    if text.count(anchor) != 1: die('Report profile anchor mismatch')
    text = text.replace(anchor, anchor + "    $profile = \\Admin\\Classes\\PmdPlatformI18n::translateStructure($profile, 'reports.');\n", 1)
    text = text.replace(">{{ $label }}</a>", ">{{ $pmdReportText($label) }}</a>")
    old = "{{ count($rows) }} row{{ count($rows) === 1 ? '' : 's' }}"
    if old in text: text = text.replace(old, "{{ count($rows) }} {{ count($rows) === 1 ? $pmdReportText('row') : $pmdReportText('rows') }}")
    text = text.replace("{{ count($staffDirectoryRows) }} staff", "{{ count($staffDirectoryRows) }} {{ $pmdReportText('staff') }}")
    text = text.replace("<strong>{{ count($staffDirectoryRows) }}</strong> at this location", "<strong>{{ count($staffDirectoryRows) }}</strong> {{ $pmdReportText('at this location') }}")
    text = text.replace("{{ (int)$attendanceContext['tenant_account_count'] }} tenant-wide; staff assigned only to other locations are excluded.", "{{ (int)$attendanceContext['tenant_account_count'] }} {{ $pmdReportText('tenant-wide; staff assigned only to other locations are excluded.') }}")
    text = text.replace("<span aria-hidden=\"true\">←</span> All staff", "<span aria-hidden=\"true\">←</span> {{ $pmdReportText('All staff') }}")
    text = text.replace("{{ !empty($selectedStaff['online']) ? 'Online now' : 'Offline now' }}", "{{ $pmdReportText(!empty($selectedStaff['online']) ? 'Online now' : 'Offline now') }}")
    text = text.replace("{{ !empty($staffRow['online']) ? 'Online' : 'Offline' }}", "{{ $pmdReportText(!empty($staffRow['online']) ? 'Online' : 'Offline') }}")
    text = text.replace("{{ $selectedStaff['last_activity'] ?? 'No tracked activity' }}", "{{ $pmdReportText($selectedStaff['last_activity'] ?? 'No tracked activity') }}")
    text = text.replace("{{ $staffRow['last_activity'] ?? 'No tracked activity' }}", "{{ $pmdReportText($staffRow['last_activity'] ?? 'No tracked activity') }}")
    text = text.replace("aria-label=\"{{ $pmdReportText('Open') }}\"", "aria-label=\"{{ $pmdReportText('Open report') }}\"")
    dyn_open = 'aria-label="Open {{ $staffRow[\'name\'] ?? \'staff\' }} report"'
    if dyn_open in text: text = text.replace(dyn_open, 'aria-label="{{ $pmdReportText(\'Open report\') }}: {{ $staffRow[\'name\'] ?? \'staff\' }}"')
    text = text.replace("aria-label=\"{{ $report['title'] ?? 'Report' }} chart\"", "aria-label=\"{{ ($report['title'] ?? $pmdReportText('Report')).' '.$pmdReportText('chart') }}\"")
    write(path, text)
    return count


def patch_reports_js(path: Path) -> None:
    text = inject_js_text_helper(read(path), 'reportText', 'reports.')
    replacements = [
        ("chartRoot.innerHTML = '<div class=\"pmd-report-empty pmd-report-empty--inside\"><strong>No chart data</strong><span>There is no activity to plot for this report window.</span></div>';", "chartRoot.innerHTML = '<div class=\"pmd-report-empty pmd-report-empty--inside\"><strong>' + escapeHtml(reportText('No chart data')) + '</strong><span>' + escapeHtml(reportText('There is no activity to plot for this report window.')) + '</span></div>';"),
        ("'aria-label': (tableData.title || 'Owner report') + ' chart'", "'aria-label': (tableData.title || reportText('Owner report')) + ' ' + reportText('chart')"),
        ("escapeHtml(tableData.title || 'Distribution') + ' distribution'", "escapeHtml(tableData.title || reportText('Distribution')) + ' ' + escapeHtml(reportText('distribution'))"),
        ("customLink.title = 'Choose a custom date range';", "customLink.title = reportText('Choose a custom date range');"),
        ("customRangePanel.setAttribute('aria-label', 'Custom report date range');", "customRangePanel.setAttribute('aria-label', reportText('Custom report date range'));"),
        ("errorNode.textContent = 'Please choose both dates.';", "errorNode.textContent = reportText('Please choose both dates.');"),
        ("error.innerHTML = '<strong>Report unavailable</strong><span>' + escapeHtml(message) + '</span>';", "error.innerHTML = '<strong>' + escapeHtml(reportText('Report unavailable')) + '</strong><span>' + escapeHtml(message) + '</span>';"),
        ("section.setAttribute('aria-label', 'Summary');", "section.setAttribute('aria-label', reportText('Summary'));"),
        ("focus.innerHTML = '<div class=\"pmd-report-empty pmd-report-empty--inside\"><strong>No activity yet</strong><span>There are no matching rows for this report window.</span></div>';", "focus.innerHTML = '<div class=\"pmd-report-empty pmd-report-empty--inside\"><strong>' + escapeHtml(reportText('No activity yet')) + '</strong><span>' + escapeHtml(reportText('There are no matching rows for this report window.')) + '</span></div>';"),
        ("operational.innerHTML = '<div class=\"pmd-report-empty pmd-report-empty--inside\"><strong>No activity yet</strong><span>There are no matching source rows for this report.</span></div>';", "operational.innerHTML = '<div class=\"pmd-report-empty pmd-report-empty--inside\"><strong>' + escapeHtml(reportText('No activity yet')) + '</strong><span>' + escapeHtml(reportText('There are no matching source rows for this report.')) + '</span></div>';"),
        ("body.innerHTML = '<div class=\"pmd-report-empty\"><strong>No data for this view</strong><span>There is no matching source activity for the selected report window.</span></div>';", "body.innerHTML = '<div class=\"pmd-report-empty\"><strong>' + escapeHtml(reportText('No data for this view')) + '</strong><span>' + escapeHtml(reportText('There is no matching source activity for the selected report window.')) + '</span></div>';"),
        ("copy.textContent = copy.dataset.pmdReportBaseCopy + ' · ' + rows.length + ' row' + (rows.length === 1 ? '' : 's');", "copy.textContent = copy.dataset.pmdReportBaseCopy + ' · ' + rows.length + ' ' + reportText(rows.length === 1 ? 'row' : 'rows');"),
        ("report.source || 'Dashboard2 canonical analytics source.'", "report.source || reportText('Dashboard2 canonical analytics source.')"),
        ("title: report.title || 'Owner report'", "title: report.title || reportText('Owner report')"),
    ]
    for old, new in replacements:
        if old not in text: die(f'Reports JS guarded anchor missing: {old[:70]}')
        text = text.replace(old, new, 1)
    custom_pairs = {
        '<div><strong style="display:block;color:#17332c;font-size:12px;font-weight:800">Custom date range</strong>': '<div><strong style="display:block;color:#17332c;font-size:12px;font-weight:800">' + "' + escapeHtml(reportText('Custom date range')) + '" + '</strong>',
        '<span style="display:block;margin-top:3px;color:#7b8985;font-size:10px;line-height:1.35">Choose inclusive start and end dates.</span></div>': '<span style="display:block;margin-top:3px;color:#7b8985;font-size:10px;line-height:1.35">' + "' + escapeHtml(reportText('Choose inclusive start and end dates.')) + '" + '</span></div>',
        'aria-label="Close"': 'aria-label="' + "' + escapeHtml(reportText('Close')) + '" + '"',
        '>From': '>' + "' + escapeHtml(reportText('From')) + '",
        '>To': '>' + "' + escapeHtml(reportText('To')) + '",
        '>Cancel</button>': '>' + "' + escapeHtml(reportText('Cancel')) + '" + '</button>',
        '>Apply range</button>': '>' + "' + escapeHtml(reportText('Apply range')) + '" + '</button>',
    }
    for old, new in custom_pairs.items():
        if old in text: text = text.replace(old, new)
    write(path, text)


def validate_candidate(candidate: Path) -> None:
    cls = read(candidate / 'app/admin/classes/PmdPlatformI18n.php')
    if MARKER not in cls or 'function fromEnglish' not in cls or 'function translateStructure' not in cls: die('Platform i18n V16 helpers missing from candidate')
    runtime = read(candidate / 'app/admin/assets/js/pmd-platform-messages.js')
    if MARKER not in runtime or 'fromEnglish: fromEnglish' not in runtime: die('Platform JS fromEnglish runtime missing from candidate')
    if 'MutationObserver' in runtime or 'querySelectorAll' in runtime: die('Canonical platform message runtime unexpectedly contains DOM-scanning logic')
    for rel in SETTINGS_BLADE_TARGETS:
        if MARKER not in read(candidate / rel): die(f'V16 Settings marker missing from {rel}')
    for rel in SETTINGS_JS_TARGETS + ['app/admin/assets/js/pmd-reports-v1.js']:
        if MARKER not in read(candidate / rel): die(f'V16 JS marker missing from {rel}')
    if MARKER not in read(candidate / 'app/admin/controllers/Pmdreports.php'): die('V16 Reports controller marker missing')
    if MARKER not in read(candidate / 'app/admin/views/pmdreports/index.blade.php'): die('V16 Reports view marker missing')
    report_view = read(candidate / 'app/admin/views/pmdreports/index.blade.php')
    if "translateStructure($profile, 'reports.')" not in report_view: die('Report profile translation missing')
    report_controller = read(candidate / 'app/admin/controllers/Pmdreports.php')
    if 'pmdLocalizeReportPeriods' not in report_controller or 'pmdLocalizeReportPayload' not in report_controller: die('Reports first-paint/async localization contract missing')
    for rel in SETTINGS_BLADE_TARGETS:
        text = read(candidate / rel)
        if re.search(r'\bname="\{\{\s*\$pmdSettingsText', text): die(f'Settings translator touched a form name in {rel}')
        if re.search(r'\bvalue="\{\{\s*\$pmdSettingsText', text): die(f'Settings translator touched a form value in {rel}')


def build(root: Path, candidate: Path, map_path: Path, backup: Path) -> None:
    settings, reports = load_maps(map_path)
    candidate.mkdir(parents=True, exist_ok=True)
    backup.mkdir(parents=True, exist_ok=True)
    copy_targets(root, candidate, backup)
    added = add_catalog_keys(candidate / 'app/admin/i18n/platform/en.php', candidate / 'app/admin/i18n/platform/de.php', settings, reports)
    patch_platform_class(candidate / 'app/admin/classes/PmdPlatformI18n.php')
    patch_platform_partial(candidate / 'app/admin/views/_partials/pmd_platform_messages.blade.php')
    patch_platform_runtime(candidate / 'app/admin/assets/js/pmd-platform-messages.js')
    blade_hits = 0
    for rel in SETTINGS_BLADE_TARGETS: blade_hits += patch_settings_blade(candidate / rel, rel, settings)
    for rel in SETTINGS_JS_TARGETS: patch_settings_js(candidate / rel, rel)
    patch_reports_controller(candidate / 'app/admin/controllers/Pmdreports.php')
    report_hits = patch_reports_blade(candidate / 'app/admin/views/pmdreports/index.blade.php', reports)
    patch_reports_js(candidate / 'app/admin/assets/js/pmd-reports-v1.js')
    validate_candidate(candidate)
    write(candidate / '.pmd-v16-targets.txt', '\n'.join(ALL_TARGETS) + '\n')
    print(f'V16_CATALOG_ENTRIES_ADDED={added}')
    print(f'SETTINGS_STATIC_COPY_PATCHES={blade_hits}')
    print(f'REPORTS_STATIC_COPY_PATCHES={report_hits}')
    print('V16_CANDIDATE_BUILD_OK=1')


def main() -> None:
    if len(sys.argv) != 6 or sys.argv[1] != 'build': die('Usage: patcher.py build ROOT CANDIDATE MAP BACKUP')
    build(Path(sys.argv[2]).resolve(), Path(sys.argv[3]).resolve(), Path(sys.argv[4]).resolve(), Path(sys.argv[5]).resolve())


if __name__ == '__main__':
    main()
