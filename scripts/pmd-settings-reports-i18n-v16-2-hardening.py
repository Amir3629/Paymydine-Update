#!/usr/bin/env python3
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

MARKER = 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2'
SETTINGS_CONTROLLERS = [
    'app/admin/controllers/Pmdsettings.php',
    'app/admin/controllers/Pmddevices.php',
    'app/admin/controllers/Pmdfinance.php',
    'app/admin/controllers/Pmdadvanced.php',
    'app/admin/controllers/Pmdteam.php',
    'app/admin/controllers/Pmdmenu.php',
    'app/admin/controllers/Pmdcustomer.php',
]
ATTENDANCE = 'app/admin/controllers/concerns/PmdreportsAttendanceConcern.php'
NEW_TARGETS = SETTINGS_CONTROLLERS + [ATTENDANCE]


def die(message: str) -> None:
    print('ERROR=' + message, file=sys.stderr)
    raise SystemExit(2)


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


def php_single(value: str) -> str:
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def settings_expr(value: str) -> str:
    return "\\Admin\\Classes\\PmdPlatformI18n::fromEnglish(" + php_single(value) + ", 'settings.')"


def copy_new_targets(root: Path, candidate: Path, backup: Path) -> None:
    manifest = candidate / '.pmd-v16-targets.txt'
    if not manifest.is_file():
        die('V16 target manifest missing before V16.2 hardening')
    lines = [line for line in read(manifest).splitlines() if line.strip()]
    for rel in NEW_TARGETS:
        src = root / rel
        if not src.is_file():
            die('Missing live V16.2 target ' + rel)
        dst = candidate / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        bdst = backup / (rel.replace('/', '__') + '.before')
        bdst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, bdst)
        if rel not in lines:
            lines.append(rel)
    write(manifest, '\n'.join(lines) + '\n')


def patch_template_titles(text: str) -> tuple[str, int]:
    count = 0
    pattern = re.compile(r"Template::set(?P<kind>Title|Heading)\('(?P<value>(?:\\'|[^'])+)'\);")

    def repl(match: re.Match) -> str:
        nonlocal count
        count += 1
        value = match.group('value').replace("\\'", "'")
        return f"Template::set{match.group('kind')}({settings_expr(value)});"

    return pattern.sub(repl, text), count


def patch_simple_success_flash(text: str) -> tuple[str, int]:
    count = 0
    pattern = re.compile(r"flash\(\)->success\('(?P<value>(?:\\'|[^'])+)'\);")

    def repl(match: re.Match) -> str:
        nonlocal count
        count += 1
        value = match.group('value').replace("\\'", "'")
        return 'flash()->success(' + settings_expr(value) + ');'

    return pattern.sub(repl, text), count


def patch_runtime_exceptions(text: str) -> tuple[str, int]:
    count = 0
    pattern = re.compile(r"throw new \\RuntimeException\('(?P<value>(?:\\'|[^'])+)'\);")

    def repl(match: re.Match) -> str:
        nonlocal count
        count += 1
        value = match.group('value').replace("\\'", "'")
        return 'throw new \\RuntimeException(' + settings_expr(value) + ');'

    return pattern.sub(repl, text), count


def patch_saved_html(text: str) -> tuple[str, int]:
    count = 0
    pattern = re.compile(r"'(?P<before><span[^']*>)Saved(?P<after></span>)'")

    def repl(match: re.Match) -> str:
        nonlocal count
        count += 1
        return php_single(match.group('before')) + '.' + settings_expr('Saved') + '.' + php_single(match.group('after'))

    return pattern.sub(repl, text), count


def patch_settings_controller(path: Path, rel: str) -> None:
    text = read(path)
    if MARKER in text:
        die('V16.2 controller marker already present in ' + rel)
    text, titles = patch_template_titles(text)
    text, flashes = patch_simple_success_flash(text)
    text, saved = patch_saved_html(text)
    exceptions = 0
    if rel.endswith('Pmdsettings.php') or rel.endswith('Pmdfinance.php'):
        text, exceptions = patch_runtime_exceptions(text)

    if rel.endswith('Pmdteam.php'):
        old = "flash()->success($staffId ? 'Staff member updated.' : 'Staff member added.');"
        new = "flash()->success(\\Admin\\Classes\\PmdPlatformI18n::fromEnglish($staffId ? 'Staff member updated.' : 'Staff member added.', 'settings.'));"
        if text.count(old) != 1:
            die('Team conditional flash anchor mismatch')
        text = text.replace(old, new, 1)
        old = "$fail('Choose one of the default staff roles.');"
        new = "$fail(\\Admin\\Classes\\PmdPlatformI18n::fromEnglish('Choose one of the default staff roles.', 'settings.'));"
        if text.count(old) != 1:
            die('Team role validation anchor mismatch')
        text = text.replace(old, new, 1)
        flashes += 1

    class_anchor = re.search(r'(class\s+Pmd[a-zA-Z0-9_]+\s+extends\s+AdminController\s*\{)', text)
    if not class_anchor:
        die('Controller class anchor missing in ' + rel)
    insert = class_anchor.end()
    text = text[:insert] + '\n    // ' + MARKER + text[insert:]
    write(path, text)
    print(f'V16_2_CONTROLLER_PATCH={rel}:titles={titles}:flashes={flashes}:saved={saved}:exceptions={exceptions}')


def patch_device_modal(path: Path) -> None:
    text = read(path)
    if MARKER in text:
        die('Device modal V16.2 marker already present')

    replacements = {
        'data-pmd-modal-title="{{ $titles[\'pos\'] }}"': 'data-pmd-modal-title="{{ $pmdSettingsText($titles[\'pos\']) }}"',
        'data-pmd-modal-title="{{ $titles[$kind] ?? \'Device settings\' }}"': 'data-pmd-modal-title="{{ $pmdSettingsText($titles[$kind] ?? \'Device settings\') }}"',
        "{{ $v('device_status','Configured') }}": "{{ $v('device_status',$pmdSettingsText('Configured')) }}",
    }
    for old, new in replacements.items():
        if text.count(old) != 1:
            die('Device modal hardening anchor mismatch: ' + old[:60])
        text = text.replace(old, new, 1)

    # KDS category names are restaurant content and must never enter the platform translator.
    category_old = '<span>{{ $pmdSettingsText($label) }}</span>'
    if text.count(category_old) < 1:
        die('Expected translated KDS category label candidate missing')
    text = text.replace(category_old, '<span>{{ $label }}</span>', 1)

    # POS device option names are tenant/device content; preserve them verbatim.
    pattern = re.compile(
        r"(@foreach\(\(\$opts\['pos_devices'\]\s*\?\?\s*\[\]\) as \$value=>\$label\).*?<option value=\"\{\{ \$value \}\}\".*?>)"
        r"\{\{ \$pmdSettingsText\(\$label\) \}\}(</option>@endforeach)",
        re.S,
    )
    text, pos_count = pattern.subn(r'\1{{ $label }}\2', text, count=1)
    if pos_count != 1:
        die('POS device option content-preservation anchor mismatch')

    # Provider/pairing labels are platform-owned and intentionally remain routed through pmdSettingsText.
    if text.count('{{ $pmdSettingsText($label) }}') < 2:
        die('Expected platform-owned device option translations missing')

    helper_marker = '// PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16\n'
    if helper_marker not in text:
        die('Device modal base V16 helper marker missing')
    text = text.replace(helper_marker, helper_marker + '    // ' + MARKER + '\n', 1)
    write(path, text)
    print('V16_2_DEVICE_DYNAMIC_CONTENT_BOUNDARY_OK=1')


def patch_reports_controller(path: Path) -> None:
    text = read(path)
    if MARKER in text:
        die('Reports controller V16.2 marker already present')

    custom_old = """            $label = $start->isSameDay($end)
                ? 'Custom · '.$start->format('d M Y')
                : 'Custom · '.$start->format('d M Y').' – '.$end->format('d M Y');
"""
    custom_new = """            $label = $start->isSameDay($end)
                ? 'Custom · '.$this->pmdReportDateOnly($start)
                : 'Custom · '.$this->pmdReportDateOnly($start).' – '.$this->pmdReportDateOnly($end);
"""
    if text.count(custom_old) != 1:
        die('Reports custom-date label anchor mismatch')
    text = text.replace(custom_old, custom_new, 1)

    old = "    protected function money(float $value): string { return ($this->reportCurrency()['symbol'] ?? '€').number_format($value,2); }\n    protected function bucketLabel(string $value): string { try { return Carbon::parse($value,$this->restaurantTimezone())->format(strlen($value)>10?'d M · H:i':'d M Y'); } catch(\\Throwable $e){ return $value; } }\n    protected function dateTime(string $value): string { if($value==='')return'—';try{return Carbon::parse($value,$this->restaurantTimezone())->format('d M Y · H:i');}catch(\\Throwable $e){return$value;} }\n    protected function duration(int $minutes): string { $minutes=max(0,$minutes);if($minutes<60)return$minutes.' min';$h=intdiv($minutes,60);$m=$minutes%60;return$m?$h.'h '.$m.'m':$h.'h'; }\n"
    new = """    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2
    protected function pmdReportIsGerman(): bool { return PmdPlatformI18n::currentLocale() === 'de'; }
    protected function pmdReportDateOnly(Carbon $value): string { return $value->format($this->pmdReportIsGerman() ? 'd.m.Y' : 'd M Y'); }
    protected function money(float $value): string { $symbol=(string)($this->reportCurrency()['symbol'] ?? '€');return $this->pmdReportIsGerman()?number_format($value,2,',','.').' '.$symbol:$symbol.number_format($value,2,'.',','); }
    protected function bucketLabel(string $value): string { try { $date=Carbon::parse($value,$this->restaurantTimezone());return $date->format($this->pmdReportIsGerman()?(strlen($value)>10?'d.m. · H:i':'d.m.Y'):(strlen($value)>10?'d M · H:i':'d M Y')); } catch(\\Throwable $e){ return $value; } }
    protected function dateTime(string $value): string { if($value==='')return'—';try{$date=Carbon::parse($value,$this->restaurantTimezone());return $date->format($this->pmdReportIsGerman()?'d.m.Y · H:i':'d M Y · H:i');}catch(\\Throwable $e){return$value;} }
    protected function duration(int $minutes): string { $minutes=max(0,$minutes);if($this->pmdReportIsGerman()){if($minutes<60)return$minutes.' Min.';$h=intdiv($minutes,60);$m=$minutes%60;return$m?$h.' Std. '.$m.' Min.':$h.' Std.';}if($minutes<60)return$minutes.' min';$h=intdiv($minutes,60);$m=$minutes%60;return$m?$h.'h '.$m.'m':$h.'h'; }
"""
    if text.count(old) != 1:
        die('Reports money/date/duration anchor mismatch after base V16 patch')
    text = text.replace(old, new, 1)
    write(path, text)
    print('V16_2_REPORT_LOCALE_FORMATTING_OK=1')


def patch_attendance(path: Path) -> None:
    text = read(path)
    if MARKER in text:
        die('Attendance V16.2 marker already present')

    date_old = "->format('d M Y · H:i')"
    date_new = "->format($this->pmdReportIsGerman() ? 'd.m.Y · H:i' : 'd M Y · H:i')"
    count = text.count(date_old)
    if count != 5:
        die(f'Attendance date-format count mismatch: {count}')
    text = text.replace(date_old, date_new)

    text = text.replace("?: 'Staff'", "?: $this->pmdReportText('Staff')")
    if "'check_out' => $checkOut ? $checkOut->format($this->pmdReportIsGerman() ? 'd.m.Y · H:i' : 'd M Y · H:i') : 'Active'," not in text:
        die('Attendance Active fallback anchor mismatch')
    text = text.replace(" : 'Active',", " : $this->pmdReportText('Active'),", 1)
    if "'worked' => $checkOut ? number_format($hours, 2).' h' : 'In progress'," not in text:
        die('Attendance In progress fallback anchor mismatch')
    text = text.replace(" : 'In progress',", " : $this->pmdReportText('In progress'),", 1)

    duration_old = """    protected function attendanceDuration(int $seconds): string
    {
        $seconds = max(0, $seconds);
        $minutes = intdiv($seconds, 60);
        if ($minutes < 60) return $minutes.' min';
        $hours = intdiv($minutes, 60);
        $remaining = $minutes % 60;
        return $remaining > 0 ? $hours.'h '.$remaining.'m' : $hours.'h';
    }
"""
    duration_new = """    protected function attendanceDuration(int $seconds): string
    {
        $seconds = max(0, $seconds);
        $minutes = intdiv($seconds, 60);
        if ($this->pmdReportIsGerman()) {
            if ($minutes < 60) return $minutes.' Min.';
            $hours = intdiv($minutes, 60);
            $remaining = $minutes % 60;
            return $remaining > 0 ? $hours.' Std. '.$remaining.' Min.' : $hours.' Std.';
        }
        if ($minutes < 60) return $minutes.' min';
        $hours = intdiv($minutes, 60);
        $remaining = $minutes % 60;
        return $remaining > 0 ? $hours.'h '.$remaining.'m' : $hours.'h';
    }
"""
    if text.count(duration_old) != 1:
        die('Attendance duration anchor mismatch')
    text = text.replace(duration_old, duration_new, 1)

    label_old = """    protected function attendanceLabel(string $value): string
    {
        $value = trim(str_replace(['_', '-'], ' ', $value));
        return $value === '' ? '—' : ucwords($value);
    }
"""
    label_new = """    protected function attendanceLabel(string $value): string
    {
        $value = trim(str_replace(['_', '-'], ' ', $value));
        return $value === '' ? '—' : $this->pmdReportText(ucwords($value));
    }
"""
    if text.count(label_old) != 1:
        die('Attendance label anchor mismatch')
    text = text.replace(label_old, label_new, 1)

    trait_anchor = "trait PmdreportsAttendanceConcern\n{\n"
    if text.count(trait_anchor) != 1:
        die('Attendance trait anchor mismatch')
    text = text.replace(trait_anchor, trait_anchor + '    // ' + MARKER + '\n', 1)
    write(path, text)
    print('V16_2_ATTENDANCE_I18N_OK=1')


def validate(candidate: Path) -> None:
    for rel in SETTINGS_CONTROLLERS:
        text = read(candidate / rel)
        if MARKER not in text:
            die('V16.2 controller marker missing from ' + rel)
        if 'Template::setTitle(\'' in text or 'Template::setHeading(\'' in text:
            die('Raw Settings Template title survived in ' + rel)
    modal = read(candidate / 'app/admin/views/pmddevices/_inline_modal_form.blade.php')
    if '{{ $pmdSettingsText($label) }}</span>' in modal:
        die('KDS category name still routed through platform translator')
    pos_match = re.search(r"\$opts\['pos_devices'\].*?\{\{ \$pmdSettingsText\(\$label\) \}\}", modal, re.S)
    if pos_match:
        die('POS device name still routed through platform translator')
    if MARKER not in read(candidate / 'app/admin/controllers/Pmdreports.php'):
        die('Reports locale marker missing')
    attendance = read(candidate / ATTENDANCE)
    if MARKER not in attendance or "format('d M Y · H:i')" in attendance:
        die('Attendance locale hardening incomplete')


def main() -> None:
    if len(sys.argv) != 4:
        die('Usage: hardening.py ROOT CANDIDATE BACKUP')
    root = Path(sys.argv[1]).resolve()
    candidate = Path(sys.argv[2]).resolve()
    backup = Path(sys.argv[3]).resolve()
    copy_new_targets(root, candidate, backup)
    for rel in SETTINGS_CONTROLLERS:
        patch_settings_controller(candidate / rel, rel)
    patch_device_modal(candidate / 'app/admin/views/pmddevices/_inline_modal_form.blade.php')
    patch_reports_controller(candidate / 'app/admin/controllers/Pmdreports.php')
    patch_attendance(candidate / ATTENDANCE)
    validate(candidate)
    print('V16_2_CONTROLLER_PRESENTATION_OK=1')
    print('V16_2_REPORT_FORMATTING_OK=1')
    print('V16_2_HARDENING_OK=1')


if __name__ == '__main__':
    main()
