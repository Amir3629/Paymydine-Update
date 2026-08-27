#!/usr/bin/env python3
from __future__ import annotations
import shutil, sys
from pathlib import Path

MARKER = 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1'

def die(msg):
    print('ERROR=' + msg, file=sys.stderr)
    raise SystemExit(2)

def read(p): return Path(p).read_text(encoding='utf-8')
def write(p,s): Path(p).write_text(s,encoding='utf-8')

def one(text, old, new, label, required=True):
    c=text.count(old)
    if required and c != 1: die(f'{label} anchor mismatch: {c}')
    if c: text=text.replace(old,new,1)
    return text

def main():
    if len(sys.argv)!=4: die('Usage: overlay.py ROOT CANDIDATE BACKUP')
    root=Path(sys.argv[1]).resolve(); cand=Path(sys.argv[2]).resolve(); backup=Path(sys.argv[3]).resolve()

    excel_rel='app/admin/assets/js/pmd-reports-excel-v1.js'
    src=root/excel_rel; dst=cand/excel_rel
    if not src.is_file(): die('Missing live report Excel runtime')
    dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(src,dst)
    b=backup/(excel_rel.replace('/','__')+'.before'); b.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,b)
    manifest=cand/'.pmd-v16-targets.txt'
    lines=[x for x in read(manifest).splitlines() if x.strip()]
    if excel_rel not in lines: lines.append(excel_rel)
    write(manifest,'\n'.join(lines)+'\n')

    p=cand/'app/admin/views/pmdbrand/index.blade.php'; t=read(p)
    if MARKER in t: die('Brand V16.1 marker already present')
    t=t.replace('{{ $label }}','{{ $pmdSettingsText($label) }}')
    for old,new in [
      ("placeholder=\"{{ !empty($brand['has_smtp_pass']) ? 'Stored — leave blank to keep' : 'Enter password' }}\"", "placeholder=\"{{ $pmdSettingsText(!empty($brand['has_smtp_pass']) ? 'Stored — leave blank to keep' : 'Enter password') }}\""),
      ("placeholder=\"{{ !empty($brand['has_mailgun_secret']) ? 'Stored — leave blank to keep' : 'Enter secret' }}\"", "placeholder=\"{{ $pmdSettingsText(!empty($brand['has_mailgun_secret']) ? 'Stored — leave blank to keep' : 'Enter secret') }}\""),
      ("placeholder=\"{{ !empty($brand['has_postmark_token']) ? 'Stored — leave blank to keep' : 'Enter token' }}\"", "placeholder=\"{{ $pmdSettingsText(!empty($brand['has_postmark_token']) ? 'Stored — leave blank to keep' : 'Enter token') }}\""),
      ("placeholder=\"{{ !empty($brand['has_ses_key']) ? 'Stored — leave blank to keep' : 'Enter key' }}\"", "placeholder=\"{{ $pmdSettingsText(!empty($brand['has_ses_key']) ? 'Stored — leave blank to keep' : 'Enter key') }}\""),
      ("placeholder=\"{{ !empty($brand['has_ses_secret']) ? 'Stored — leave blank to keep' : 'Enter secret' }}\"", "placeholder=\"{{ $pmdSettingsText(!empty($brand['has_ses_secret']) ? 'Stored — leave blank to keep' : 'Enter secret') }}\""),
    ]:
        t=one(t,old,new,'Brand secret placeholder')
    t=t.replace('@php\n    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16', '@php\n    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16\n    // '+MARKER,1)
    write(p,t)

    p=cand/'app/admin/views/pmdadvanced/index.blade.php'; t=read(p)
    if MARKER in t: die('Advanced V16.1 marker already present')
    t=t.replace('{{ $label }}','{{ $pmdSettingsText($label) }}')
    t=t.replace('@php\n    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16', '@php\n    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16\n    // '+MARKER,1)
    write(p,t)

    p=cand/'app/admin/views/pmdfinance/index.blade.php'; t=read(p)
    if MARKER in t: die('Finance V16.1 marker already present')
    t=t.replace('{{ $label }}','{{ $pmdSettingsText($label) }}')
    t=t.replace("{{ !empty($provider->status) ? 'Connected/configured for this restaurant' : 'Not configured yet' }}", "{{ $pmdSettingsText(!empty($provider->status) ? 'Connected/configured for this restaurant' : 'Not configured yet') }}")
    t=t.replace("{{ !empty($provider->status) ? 'Enabled' : 'Available' }}", "{{ $pmdSettingsText(!empty($provider->status) ? 'Enabled' : 'Available') }}")
    t=t.replace('<small>{{ $methodHint }}</small>','<small>{{ $pmdSettingsText($methodHint) }}</small>')
    t=t.replace('Provider: {{ $method->provider_code ?: \'—\' }}', "{{ $pmdSettingsText('Provider') }}: {{ $method->provider_code ?: '—' }}")
    t=t.replace("{{ !empty($method->status) ? 'Enabled' : 'Disabled' }}", "{{ $pmdSettingsText(!empty($method->status) ? 'Enabled' : 'Disabled') }}")
    t=one(t,'value="Added at checkout and shown separately" readonly', 'value="{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish(\'Added at checkout and shown separately\', \'settings.\') }}" readonly','Finance VAT display value')
    t=t.replace("placeholder=\"{{ !empty($fiskaly['has_api_secret']) ? 'Stored — leave blank to keep' : 'Enter API secret' }}\"", "placeholder=\"{{ $pmdSettingsText(!empty($fiskaly['has_api_secret']) ? 'Stored — leave blank to keep' : 'Enter API secret') }}\"")
    t=t.replace('@php\n    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16', '@php\n    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16\n    // '+MARKER,1)
    write(p,t)

    p=cand/'app/admin/views/pmdfinance/_inline_provider_form_v1.blade.php'; t=read(p)
    if MARKER in t: die('Provider modal V16.1 marker already present')
    old="placeholder=\"{{ array_key_exists($name,$config) && trim((string)$config[$name]) !== '' ? 'Stored — leave blank to keep' : 'Enter credential' }}\""
    new="placeholder=\"{{ $pmdSettingsText(array_key_exists($name,$config) && trim((string)$config[$name]) !== '' ? 'Stored — leave blank to keep' : 'Enter credential') }}\""
    t=one(t,old,new,'Provider credential placeholder')
    t=t.replace('@php\n    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16', '@php\n    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16\n    // '+MARKER,1)
    write(p,t)

    p=dst; t=read(p)
    if 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16' in t or MARKER in t: die('Report Excel V16 marker already present')
    anchor="  'use strict';\n"
    helper=anchor+"\n  // "+MARKER+"\n  function reportText(value) {\n    var runtime = window.PMDPlatformMessages;\n    value = String(value == null ? '' : value);\n    return runtime && typeof runtime.fromEnglish === 'function' ? runtime.fromEnglish(value, 'reports.', value) : value;\n  }\n"
    t=one(t,anchor,helper,'Excel use strict')
    t=one(t,"button.setAttribute('aria-label', 'Download this report as Excel');", "button.setAttribute('aria-label', reportText('Download this report as Excel'));",'Excel aria')
    t=one(t,"button.setAttribute('title', 'Download Excel');", "button.setAttribute('title', reportText('Download Excel'));",'Excel title')
    t=t.replace("tableData.title || (headerTitle ? headerTitle.textContent : 'Owner report')", "tableData.title || (headerTitle ? headerTitle.textContent : reportText('Owner report'))")
    t=t.replace("source ? source.textContent : 'Dashboard2 canonical analytics source.'", "source ? source.textContent : reportText('Dashboard2 canonical analytics source.')")
    for source in ['Period','Timezone','Currency','Generated','Data authority']:
        t=t.replace("['"+source+"',", "[reportText('"+source+"'),")
    t=t.replace("rowXml(rowNumber++, ['No matching report rows'], [3])", "rowXml(rowNumber++, [reportText('No matching report rows')], [3])")
    t=t.replace('<sheets><sheet name="Report"', '<sheets><sheet name="' + "' + xmlEscape(reportText('Report')) + '" + '"')
    write(p,t)

    print('V16_1_BRAND_DYNAMIC_I18N_OK=1')
    print('V16_1_ADVANCED_DYNAMIC_I18N_OK=1')
    print('V16_1_FINANCE_DYNAMIC_I18N_OK=1')
    print('V16_1_PROVIDER_MODAL_I18N_OK=1')
    print('V16_1_REPORT_EXCEL_I18N_OK=1')
    print('V16_1_OVERLAY_OK=1')

if __name__=='__main__': main()
