#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

MARKER = 'PMD_SETTINGS_DYNAMIC_I18N_V17'
TARGETS = [
    'app/admin/i18n/platform/en.php',
    'app/admin/i18n/platform/de.php',
    'app/admin/assets/js/pmd-payment-provider-catalogue-v1.js',
    'app/admin/assets/js/pmd-sumup-self-service-v1.js',
    'app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js',
]


def die(message: str, code: int = 2) -> None:
    print('ERROR=' + message, file=sys.stderr)
    raise SystemExit(code)


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


def one(text: str, old: str, new: str, label: str, expected: int = 1) -> str:
    count = text.count(old)
    if count != expected:
        die(f'{label} anchor mismatch: {count}, expected {expected}')
    return text.replace(old, new, expected)


def copy_targets(root: Path, candidate: Path, backup: Path) -> None:
    for rel in TARGETS:
        src = root / rel
        if not src.is_file():
            die('Missing live V17 target: ' + rel, 100)
        dst = candidate / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        before = backup / (rel.replace('/', '__') + '.before')
        before.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, before)


def php_catalog(text: str) -> dict[str, str]:
    rx = re.compile(r"^\s*'((?:\\'|[^'])+)'\s*=>\s*'((?:\\'|[^'])*)',\s*$", re.M)
    result: dict[str, str] = {}
    for match in rx.finditer(text):
        key = match.group(1).replace("\\'", "'").replace('\\\\', '\\')
        value = match.group(2).replace("\\'", "'").replace('\\\\', '\\')
        result[key] = value
    if not result:
        die('Could not parse canonical platform catalogue')
    return result


def php_quote(value: str) -> str:
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def slug(value: str) -> str:
    raw = value
    value = value.lower().replace('’', '').replace("'", '')
    value = re.sub(r'[^a-z0-9]+', '_', value).strip('_')
    if not value:
        value = 'copy_' + hashlib.sha1(raw.encode('utf-8')).hexdigest()[:10]
    if len(value) > 65:
        value = value[:54].rstrip('_') + '_' + hashlib.sha1(raw.encode('utf-8')).hexdigest()[:10]
    return value


def replace_catalog_value(text: str, key: str, value: str) -> str:
    encoded_key = re.escape(key.replace('\\', '\\\\').replace("'", "\\'"))
    rx = re.compile(r"^(\s*'" + encoded_key + r"'\s*=>\s*)'(?:\\'|[^'])*'(,\s*)$", re.M)
    match = rx.search(text)
    if not match:
        die('Could not update existing catalogue key: ' + key)
    return text[:match.start()] + match.group(1) + php_quote(value) + match.group(2) + text[match.end():]


def patch_catalogues(en_path: Path, de_path: Path, mapping: dict[str, str]) -> None:
    en_text = read(en_path)
    de_text = read(de_path)
    if MARKER in en_text or MARKER in de_text:
        die('V17 catalogue marker already present')

    en = php_catalog(en_text)
    de = php_catalog(de_text)
    if set(en) != set(de):
        die('EN/DE catalogue key parity broken before V17')

    by_source: dict[str, list[str]] = {}
    for key, source in en.items():
        if key.startswith('settings.'):
            by_source.setdefault(source, []).append(key)

    additions: list[tuple[str, str, str]] = []
    used = set(en)
    updated = 0
    for source, german in mapping.items():
        keys = by_source.get(source, [])
        if keys:
            for key in keys:
                de_text = replace_catalog_value(de_text, key, german)
                updated += 1
            continue

        base = 'settings.runtime_v17.' + slug(source)
        key = base
        suffix = 2
        while key in used:
            key = base + '_' + str(suffix)
            suffix += 1
        used.add(key)
        additions.append((key, source, german))

    def block(which: str) -> str:
        lines = ['', '    // ' + MARKER]
        for key, source, german in additions:
            lines.append('    ' + php_quote(key) + ' => ' + php_quote(source if which == 'en' else german) + ',')
        return '\n'.join(lines) + '\n'

    en_pos = en_text.rfind('];')
    de_pos = de_text.rfind('];')
    if en_pos < 0 or de_pos < 0:
        die('Catalogue closing marker missing')

    if additions:
        en_text = en_text[:en_pos] + block('en') + en_text[en_pos:]
        de_text = de_text[:de_pos] + block('de') + de_text[de_pos:]
    else:
        en_text = en_text[:en_pos] + '\n    // ' + MARKER + '\n' + en_text[en_pos:]
        de_text = de_text[:de_pos] + '\n    // ' + MARKER + '\n' + de_text[de_pos:]

    write(en_path, en_text)
    write(de_path, de_text)
    print('V17_CATALOG_ADDITIONS=' + str(len(additions)))
    print('V17_CATALOG_EXISTING_KEYS_UPDATED=' + str(updated))


def inject_helper(text: str) -> str:
    if MARKER in text:
        die('V17 JS marker already present')
    anchor = "  'use strict';\n"
    if text.count(anchor) != 1:
        die('JS use-strict anchor mismatch')
    helper = anchor + """
  // PMD_SETTINGS_DYNAMIC_I18N_V17
  function settingsText(value) {
    var runtime = window.PMDPlatformMessages;
    value = String(value == null ? '' : value);
    return runtime && typeof runtime.fromEnglish === 'function'
      ? runtime.fromEnglish(value, 'settings.', value)
      : value;
  }

  function settingsHtml(value) {
    return esc(settingsText(value));
  }
"""
    return text.replace(anchor, helper, 1)


def patch_provider(path: Path) -> None:
    text = inject_helper(read(path))

    text = one(text, '    return map[value] || value;\n', '    return settingsText(map[value] || value);\n', 'provider label maps', 2)
    text = one(text,
        '    if (!values.length) return \'<span class="pmd-provider-muted">Not enabled yet</span>\';',
        '    if (!values.length) return \'<span class="pmd-provider-muted">\' + settingsHtml(\'Not enabled yet\') + \'</span>\';',
        'provider empty chips')

    old_status = """  function sumupStatus(snapshot) {
    if (snapshot.connection_status === 'connected') return 'Connected';
    if (snapshot.connection_status === 'error') return 'Needs attention';
    if (snapshot.configured) return 'Saved, not tested';
    return 'Not connected';
  }
"""
    new_status = """  function sumupStatus(snapshot) {
    if (snapshot.connection_status === 'connected') return settingsText('Connected');
    if (snapshot.connection_status === 'error') return settingsText('Needs attention');
    if (snapshot.configured) return settingsText('Saved, not tested');
    return settingsText('Not connected');
  }
"""
    text = one(text, old_status, new_status, 'provider SumUp status')

    start = text.find('  function rowNote(definition, code) {')
    end = text.find('\n  function providerStatus(definition) {', start)
    if start < 0 or end < 0:
        die('provider rowNote function anchors missing')
    new_note = """  function rowNote(definition, code) {
    if (code === 'sumup') {
      var key = bestSumupEnvironment();
      var snapshot = sumupSnapshot(key);
      var count = Array.isArray(snapshot.terminals) ? snapshot.terminals.length : 0;
      if (snapshot.connection_status === 'connected') {
        var environmentLabel = settingsText(key === 'production' ? 'Production' : 'Test');
        return environmentLabel + ' ' + settingsText('connected') +
          (count ? ' · ' + count + ' ' + settingsText(count === 1 ? 'terminal' : 'terminals') : '');
      }
      if (snapshot.configured) return settingsText('Connection saved; test it before taking payments.');
      return settingsText("Connect this restaurant's SumUp account, then pair its terminals.");
    }

    var readyMethods = definition.implemented_payment_methods || [];
    var readyCapabilities = definition.implemented_capabilities || [];
    if (readyMethods.length || readyCapabilities.length) return settingsText('Part of this provider flow already exists in PayMyDine.');
    return settingsText('Provider adapter is not enabled yet.');
  }
"""
    text = text[:start] + new_note + text[end:]

    text = one(text,
        "    return {label: ready ? 'Partly ready' : 'Next', className: ready ? 'is-partial' : ''};",
        "    return {label: settingsText(ready ? 'Partly ready' : 'Next'), className: ready ? 'is-partial' : ''};",
        'provider readiness')

    text = one(text,
        "      ? '<button type=\"button\" class=\"pmd-provider-configure\" data-provider-configure=\"sumup\">Configure</button>'\n      : '<button type=\"button\" class=\"pmd-provider-configure\" data-pmd-inline-open=\"finance:provider:' + esc(code) + '\">Configure</button>';",
        "      ? '<button type=\"button\" class=\"pmd-provider-configure\" data-provider-configure=\"sumup\">' + settingsHtml('Configure') + '</button>'\n      : '<button type=\"button\" class=\"pmd-provider-configure\" data-pmd-inline-open=\"finance:provider:' + esc(code) + '\">' + settingsHtml('Configure') + '</button>';",
        'provider configure buttons')

    text = one(text, "        '<span>' + esc(label) + '</span>',", "        '<span>' + settingsHtml(label) + '</span>',", 'provider field label')
    text = one(text, "placeholder=\"' + esc(placeholder || '') + '\"", "placeholder=\"' + esc(placeholder ? settingsText(placeholder) : '') + '\"", 'provider field placeholder')
    text = one(text, "        help ? '<small>' + esc(help) + '</small>' : '',", "        help ? '<small>' + settingsHtml(help) + '</small>' : '',", 'provider field help')

    old_env = """  function envButton(key, label) {
    var snapshot = sumupSnapshot(key);
    var connected = snapshot.connection_status === 'connected';
    var active = sumup && sumup.active_environment === key;
    return [
      '<button type="button" data-provider-sumup-env="' + key + '" class="' + (environment === key ? 'is-active' : '') + '">',
        '<span>' + esc(label) + '</span>',
        connected ? '<small><i></i>' + (active ? 'Active' : 'Connected') + '</small>' : '<small>' + (snapshot.configured ? 'Saved' : 'Not connected') + '</small>',
      '</button>'
    ].join('');
  }
"""
    new_env = """  function envButton(key, label) {
    var snapshot = sumupSnapshot(key);
    var connected = snapshot.connection_status === 'connected';
    var active = sumup && sumup.active_environment === key;
    return [
      '<button type="button" data-provider-sumup-env="' + key + '" class="' + (environment === key ? 'is-active' : '') + '">',
        '<span>' + settingsHtml(label) + '</span>',
        connected ? '<small><i></i>' + settingsHtml(active ? 'Active' : 'Connected') + '</small>' : '<small>' + settingsHtml(snapshot.configured ? 'Saved' : 'Not connected') + '</small>',
      '</button>'
    ].join('');
  }
"""
    text = one(text, old_env, new_env, 'provider environment buttons')

    old_summary = """  function terminalSummary(snapshot) {
    var terminals = Array.isArray(snapshot.terminals) ? snapshot.terminals : [];
    if (!terminals.length) return '<span>No terminal paired in this environment.</span>';
    var online = terminals.filter(function (terminal) { return !!terminal.online; }).length;
    return '<span>' + terminals.length + ' terminal' + (terminals.length === 1 ? '' : 's') + ' · ' + online + ' online</span>';
  }
"""
    new_summary = """  function terminalSummary(snapshot) {
    var terminals = Array.isArray(snapshot.terminals) ? snapshot.terminals : [];
    if (!terminals.length) return '<span>' + settingsHtml('No terminal paired in this environment.') + '</span>';
    var online = terminals.filter(function (terminal) { return !!terminal.online; }).length;
    return '<span>' + terminals.length + ' ' + settingsHtml(terminals.length === 1 ? 'terminal' : 'terminals') + ' · ' + online + ' ' + settingsHtml('online') + '</span>';
  }
"""
    text = one(text, old_summary, new_summary, 'provider terminal summary')

    pairs = [
        ("        '<button type=\"button\" class=\"pmd-provider-modal__backdrop\" aria-label=\"Close\" data-provider-modal-close></button>',", "        '<button type=\"button\" class=\"pmd-provider-modal__backdrop\" aria-label=\"' + settingsHtml('Close') + '\" data-provider-modal-close></button>',", 'provider backdrop'),
        ("              '<span class=\"pmd-provider-modal__kicker\">PAYMENT PROVIDER</span>',", "              '<span class=\"pmd-provider-modal__kicker\">' + settingsHtml('PAYMENT PROVIDER') + '</span>',", 'provider kicker'),
        ("              '<h2 id=\"pmd-sumup-modal-title\">Configure SumUp</h2>',", "              '<h2 id=\"pmd-sumup-modal-title\">' + settingsHtml('Configure SumUp') + '</h2>',", 'provider modal title'),
        ("              '<p>Connect this restaurant\\'s own SumUp account. Test and production credentials stay separate.</p>',", "              '<p>' + settingsHtml(\"Connect this restaurant's own SumUp account. Test and production credentials stay separate.\") + '</p>',", 'provider intro'),
        ("            '<button type=\"button\" class=\"pmd-provider-modal__close\" data-provider-modal-close aria-label=\"Close\">×</button>',", "            '<button type=\"button\" class=\"pmd-provider-modal__close\" data-provider-modal-close aria-label=\"' + settingsHtml('Close') + '\">×</button>',", 'provider close'),
        ("              '<div><strong>' + esc(sumupStatus(snapshot)) + '</strong><span>' + (environment === 'production' ? 'Production' : 'Test') + ' environment</span></div>',", "              '<div><strong>' + esc(sumupStatus(snapshot)) + '</strong><span>' + settingsHtml(environment === 'production' ? 'Production' : 'Test') + ' ' + settingsHtml('environment') + '</span></div>',", 'provider environment summary'),
        ("            '<div class=\"pmd-provider-env-tabs\" role=\"tablist\" aria-label=\"SumUp environment\">',", "            '<div class=\"pmd-provider-env-tabs\" role=\"tablist\" aria-label=\"' + settingsHtml('SumUp environment') + '\">',", 'provider environment aria'),
        ("              '<div class=\"pmd-provider-modal-section__head\"><div><strong>Connection</strong><span>' + (environment === 'test' ? 'Use the restaurant\\'s SumUp sandbox credentials.' : 'Use the restaurant\\'s live SumUp credentials.') + '</span></div>' + (active === environment ? '<em>Used for payments</em>' : '') + '</div>',", "              '<div class=\"pmd-provider-modal-section__head\"><div><strong>' + settingsHtml('Connection') + '</strong><span>' + settingsHtml(environment === 'test' ? \"Use the restaurant's SumUp sandbox credentials.\" : \"Use the restaurant's live SumUp credentials.\") + '</span></div>' + (active === environment ? '<em>' + settingsHtml('Used for payments') + '</em>' : '') + '</div>',", 'provider connection copy'),
        ("              '<p class=\"pmd-provider-modal-security\">Saved secrets stay inside the current restaurant tenant and are never shown back in the browser.</p>',", "              '<p class=\"pmd-provider-modal-security\">' + settingsHtml('Saved secrets stay inside the current restaurant tenant and are never shown back in the browser.') + '</p>',", 'provider security'),
        ("                '<div><strong>Terminals</strong>' + terminalSummary(snapshot) + '</div>',", "                '<div><strong>' + settingsHtml('Terminals') + '</strong>' + terminalSummary(snapshot) + '</div>',", 'provider terminals'),
        ("                '<a class=\"pmd-provider-modal-link\" href=\"/admin/pmddevices#payment-terminals\">Manage terminals</a>',", "                '<a class=\"pmd-provider-modal-link\" href=\"/admin/pmddevices#payment-terminals\">' + settingsHtml('Manage terminals') + '</a>',", 'provider manage terminals'),
        ("              '<div class=\"pmd-provider-modal-section__head\"><div><strong>Available in PayMyDine</strong><span>Only flows already implemented by PayMyDine are shown here.</span></div></div>',", "              '<div class=\"pmd-provider-modal-section__head\"><div><strong>' + settingsHtml('Available in PayMyDine') + '</strong><span>' + settingsHtml('Only flows already implemented by PayMyDine are shown here.') + '</span></div></div>',", 'provider availability'),
        ("                '<div><span>Capabilities</span>' + chips(definition.implemented_capabilities || [], capabilityLabel) + '</div>',", "                '<div><span>' + settingsHtml('Capabilities') + '</span>' + chips(definition.implemented_capabilities || [], capabilityLabel) + '</div>',", 'provider capabilities'),
        ("                '<div><span>Payment methods</span>' + chips(definition.implemented_payment_methods || [], methodLabel) + '</div>',", "                '<div><span>' + settingsHtml('Payment methods') + '</span>' + chips(definition.implemented_payment_methods || [], methodLabel) + '</div>',", 'provider payment methods'),
        ("              snapshot.configured ? '<button type=\"button\" class=\"pmd-provider-secondary\" data-provider-sumup-test ' + (busy ? 'disabled' : '') + '>Test saved connection</button>' : '',", "              snapshot.configured ? '<button type=\"button\" class=\"pmd-provider-secondary\" data-provider-sumup-test ' + (busy ? 'disabled' : '') + '>' + settingsHtml('Test saved connection') + '</button>' : '',", 'provider test connection'),
        ("              connected && active !== environment ? '<button type=\"button\" class=\"pmd-provider-secondary\" data-provider-sumup-activate ' + (busy ? 'disabled' : '') + '>Use for payments</button>' : '',", "              connected && active !== environment ? '<button type=\"button\" class=\"pmd-provider-secondary\" data-provider-sumup-activate ' + (busy ? 'disabled' : '') + '>' + settingsHtml('Use for payments') + '</button>' : '',", 'provider activate'),
        ("              '<button type=\"button\" class=\"pmd-provider-secondary\" data-provider-modal-close ' + (busy ? 'disabled' : '') + '>Cancel</button>',", "              '<button type=\"button\" class=\"pmd-provider-secondary\" data-provider-modal-close ' + (busy ? 'disabled' : '') + '>' + settingsHtml('Cancel') + '</button>',", 'provider cancel'),
        ("              '<button type=\"button\" class=\"pmd-provider-primary\" data-provider-sumup-save ' + (busy ? 'disabled' : '') + '>' + (busy ? 'Working…' : 'Save & test connection') + '</button>',", "              '<button type=\"button\" class=\"pmd-provider-primary\" data-provider-sumup-save ' + (busy ? 'disabled' : '') + '>' + settingsHtml(busy ? 'Working…' : 'Save & test connection') + '</button>',", 'provider save'),
    ]
    for old, new, label in pairs:
        text = one(text, old, new, label)

    text = one(text, "      message = error && error.message ? error.message : 'Provider request failed.';", "      message = settingsText(error && error.message ? error.message : 'Provider request failed.');", 'provider request error')
    text = one(text, "      message = payload.message || 'Connected to SumUp.';", "      message = settingsText(payload.message || 'Connected to SumUp.');", 'provider save message')
    text = one(text, "      message = payload.message || 'SumUp connection is working.';", "      message = settingsText(payload.message || 'SumUp connection is working.');", 'provider test message')
    text = one(text, "      message = payload.message || 'Environment activated.';", "      message = settingsText(payload.message || 'Environment activated.');", 'provider activate message')
    text = one(text, "      warning.textContent = error && error.message ? error.message : 'Provider connections could not be loaded.';", "      warning.textContent = settingsText(error && error.message ? error.message : 'Provider connections could not be loaded.');", 'provider load error')

    write(path, text)
    print('V17_PROVIDER_CATALOGUE_I18N_OK=1')


def patch_self_service(path: Path) -> None:
    text = inject_helper(read(path))

    old_status = """  function statusLabel(snapshot) {
    if (snapshot.connection_status === 'connected') return 'Connected';
    if (snapshot.connection_status === 'error') return 'Needs attention';
    if (snapshot.configured) return 'Connection not tested';
    return 'Not connected';
  }
"""
    new_status = """  function statusLabel(snapshot) {
    if (snapshot.connection_status === 'connected') return settingsText('Connected');
    if (snapshot.connection_status === 'error') return settingsText('Needs attention');
    if (snapshot.configured) return settingsText('Connection not tested');
    return settingsText('Not connected');
  }
"""
    text = one(text, old_status, new_status, 'self-service status')

    old_env = """  function environmentLabel(snapshot) {
    var name = state.environment === 'production' ? 'Production' : 'Test';
    var merchant = String(snapshot && snapshot.merchant_code ? snapshot.merchant_code : '').trim();
    return name + ' environment' + (merchant ? ' · Merchant ' + merchant : '');
  }
"""
    new_env = """  function environmentLabel(snapshot) {
    var name = settingsText(state.environment === 'production' ? 'Production' : 'Test');
    var merchant = String(snapshot && snapshot.merchant_code ? snapshot.merchant_code : '').trim();
    return name + ' ' + settingsText('environment') + (merchant ? ' · ' + settingsText('Merchant') + ' ' + merchant : '');
  }
"""
    text = one(text, old_env, new_env, 'self-service environment')

    pairs = [
        ("            '<b>Add terminal</b>',", "            '<b>' + settingsHtml('Add terminal') + '</b>',", 'self add terminal'),
        ("            '<span>Enter the temporary Cloud API pairing code shown on the Solo.</span>',", "            '<span>' + settingsHtml('Enter the temporary Cloud API pairing code shown on the Solo.') + '</span>',", 'self pair help'),
        ("          '<label><span>Pairing code</span><input data-sumup-pair-code maxlength=\"18\" placeholder=\"XXXXXXXXX\" autocomplete=\"off\" autocapitalize=\"characters\" spellcheck=\"false\"></label>',", "          '<label><span>' + settingsHtml('Pairing code') + '</span><input data-sumup-pair-code maxlength=\"18\" placeholder=\"XXXXXXXXX\" autocomplete=\"off\" autocapitalize=\"characters\" spellcheck=\"false\"></label>',", 'self pairing label'),
        ("          '<label><span>Terminal name (optional)</span><input data-sumup-pair-label maxlength=\"191\" placeholder=\"Front Desk, Bar, Terrace…\" autocomplete=\"off\"></label>',", "          '<label><span>' + settingsHtml('Terminal name (optional)') + '</span><input data-sumup-pair-label maxlength=\"191\" placeholder=\"Front Desk, Bar, Terrace…\" autocomplete=\"off\"></label>',", 'self terminal name'),
        ("          '<button type=\"button\" class=\"is-primary\" data-sumup-pair ' + (state.busy ? 'disabled' : '') + '>Pair terminal</button>',", "          '<button type=\"button\" class=\"is-primary\" data-sumup-pair ' + (state.busy ? 'disabled' : '') + '>' + settingsHtml('Pair terminal') + '</button>',", 'self pair button'),
        ("          '<b>' + esc(terminal.label || 'SumUp terminal') + '</b>',", "          '<b>' + esc(terminal.label || settingsText('SumUp terminal')) + '</b>',", 'self display fallback'),
        ("            (online ? 'Online' : esc(String(terminal.status || 'Offline').toLowerCase())) +", "            (online ? settingsHtml('Online') : settingsHtml(String(terminal.status || 'Offline').toLowerCase())) +", 'self terminal status'),
        ("          '<button type=\"button\" data-sumup-terminal-test=\"' + esc(terminal.terminal_device_id) + '\" ' + (state.busy ? 'disabled' : '') + '>Test</button>',", "          '<button type=\"button\" data-sumup-terminal-test=\"' + esc(terminal.terminal_device_id) + '\" ' + (state.busy ? 'disabled' : '') + '>' + settingsHtml('Test') + '</button>',", 'self test button'),
        ("          '<button type=\"button\" class=\"is-danger\" data-sumup-terminal-remove=\"' + esc(terminal.terminal_device_id) + '\" ' + (state.busy ? 'disabled' : '') + '>Remove</button>',", "          '<button type=\"button\" class=\"is-danger\" data-sumup-terminal-remove=\"' + esc(terminal.terminal_device_id) + '\" ' + (state.busy ? 'disabled' : '') + '>' + settingsHtml('Remove') + '</button>',", 'self remove button'),
        ("          '<div><b>Terminals</b><span>Cashiers and Waiters can choose between these terminals when more than one is available.</span></div>',", "          '<div><b>' + settingsHtml('Terminals') + '</b><span>' + settingsHtml('Cashiers and Waiters can choose between these terminals when more than one is available.') + '</span></div>',", 'self terminals head'),
        ("          : '<div class=\"pmd-sumup-empty\">No terminal paired in this environment yet.</div>',", "          : '<div class=\"pmd-sumup-empty\">' + settingsHtml('No terminal paired in this environment yet.') + '</div>',", 'self empty terminals'),
        ("            '<b>Connect SumUp first</b>',", "            '<b>' + settingsHtml('Connect SumUp first') + '</b>',", 'self connect first'),
        ("            '<span>Provider credentials are managed under Payments & finance.</span>',", "            '<span>' + settingsHtml('Provider credentials are managed under Payments & finance.') + '</span>',", 'self provider creds'),
        ("          '<a class=\"is-primary\" href=\"/admin/pmdfinance#payment-providers\">Manage SumUp connection</a>',", "          '<a class=\"is-primary\" href=\"/admin/pmdfinance#payment-providers\">' + settingsHtml('Manage SumUp connection') + '</a>',", 'self manage connection'),
        ("      state.root.innerHTML = '<div class=\"pmd-sumup-loading\">Loading terminal settings…</div>';", "      state.root.innerHTML = '<div class=\"pmd-sumup-loading\">' + settingsHtml('Loading terminal settings…') + '</div>';", 'self loading'),
        ("          '<span class=\"pmd-sumup-kicker\">PAYMENT TERMINALS</span>',", "          '<span class=\"pmd-sumup-kicker\">' + settingsHtml('PAYMENT TERMINALS') + '</span>',", 'self kicker'),
        ("          '<h2>SumUp terminals</h2>',", "          '<h2>' + settingsHtml('SumUp terminals') + '</h2>',", 'self title'),
    ]
    for old, new, label in pairs:
        text = one(text, old, new, label)

    text = one(text, "      state.message = error.message || 'Terminal request failed.';", "      state.message = settingsText(error && error.message ? error.message : 'Terminal request failed.');", 'self request error')
    text = one(text, "      state.message = 'Enter the 8 or 9 character pairing code shown on the Solo.';", "      state.message = settingsText('Enter the 8 or 9 character pairing code shown on the Solo.');", 'self validation')
    text = one(text, "      state.message = json.message || 'Terminal paired.';", "      state.message = settingsText(json.message || 'Terminal paired.');", 'self paired')
    text = one(text, "      state.message = json.message || 'Terminal tested.';", "      state.message = settingsText(json.message || 'Terminal tested.');", 'self tested')
    text = one(text, "    if (!window.confirm('Remove this SumUp terminal from PayMyDine?')) return;", "    if (!window.confirm(settingsText('Remove this SumUp terminal from PayMyDine?'))) return;", 'self confirm')
    text = one(text, "      state.message = json.message || 'Terminal removed.';", "      state.message = settingsText(json.message || 'Terminal removed.');", 'self removed')
    text = one(text, "      state.message = error && error.message ? error.message : 'Could not verify the SumUp terminal environment.';", "      state.message = settingsText(error && error.message ? error.message : 'Could not verify the SumUp terminal environment.');", 'self reconcile error')
    text = one(text, "      state.root.innerHTML = '<div class=\"pmd-sumup-message is-error\">' + esc(error.message || 'Could not load terminal settings.') + '</div>';", "      state.root.innerHTML = '<div class=\"pmd-sumup-message is-error\">' + esc(settingsText(error && error.message ? error.message : 'Could not load terminal settings.')) + '</div>';", 'self load error')

    write(path, text)
    print('V17_SUMUP_SELF_SERVICE_I18N_OK=1')


def patch_wallet(path: Path) -> None:
    text = inject_helper(read(path))

    text = one(text, "return reject(new Error('Could not read the verification file.'));", "return reject(new Error(settingsText('Could not read the verification file.')));", 'wallet read error inline')
    text = one(text, "reader.onerror = function () { reject(new Error('Could not read the verification file.')); };", "reader.onerror = function () { reject(new Error(settingsText('Could not read the verification file.'))); };", 'wallet read error event')
    text = one(text, '    title.textContent = label;', '    title.textContent = settingsText(label);', 'wallet field label')
    text = one(text, "    input.placeholder = placeholder || '';", "    input.placeholder = placeholder ? settingsText(placeholder) : '';", 'wallet placeholder')
    text = one(text, '      small.textContent = help;', '      small.textContent = settingsText(help);', 'wallet field help')

    direct = [
        ("    strong.textContent = 'Online Card & Wallets';", "    strong.textContent = settingsText('Online Card & Wallets');"),
        ("    appleDomainTitle.textContent = 'Apple Pay Domain';", "    appleDomainTitle.textContent = settingsText('Apple Pay Domain');"),
        ("    appleFileTitle.textContent = 'Apple Pay Verification File';", "    appleFileTitle.textContent = settingsText('Apple Pay Verification File');"),
        ("    appleUpload.textContent = 'Upload & verify Apple Pay file';", "    appleUpload.textContent = settingsText('Upload & verify Apple Pay file');"),
        ("    save.textContent = 'Save wallet settings';", "    save.textContent = settingsText('Save wallet settings');"),
        ("        appleStatus.textContent = 'Choose the verification file downloaded from SumUp first.';", "        appleStatus.textContent = settingsText('Choose the verification file downloaded from SumUp first.');"),
        ("        appleStatus.textContent = 'Verification file size looks invalid.';", "        appleStatus.textContent = settingsText('Verification file size looks invalid.');"),
        ("      appleStatus.textContent = 'Uploading…';", "      appleStatus.textContent = settingsText('Uploading…');"),
        ("      status.textContent = 'Saving…';", "      status.textContent = settingsText('Saving…');"),
        ("        status.textContent = 'Saved';", "        status.textContent = settingsText('Saved');"),
    ]
    for old, new in direct:
        text = one(text, old, new, 'wallet direct text')

    long_direct = [
        "Card / Wallet uses the embedded SumUp Payment Widget. Standalone Apple Pay and Google Pay use SumUp Swift Checkout buttons inside the same PayMyDine checkout card, so wallet selection never falls back to card fields.",
        "PayMyDine serves the verification file automatically on this tenant domain.",
        "Choose the file exactly as downloaded from SumUp. It normally has no file extension. No VPS upload is needed.",
        "Apple Pay: download the verification file from SumUp once, upload it here, then register this exact tenant domain in SumUp. PayMyDine hosts the public .well-known URL automatically. Google Pay production still requires Google web approval and a Google Merchant ID. Wero is not a SumUp online method."
    ]
    variables = ['span', 'appleDomainHelp', 'appleFileHelp', 'note']
    for variable, source in zip(variables, long_direct):
        text = one(text, f"    {variable}.textContent = {json.dumps(source)};".replace('"', "'"), f"    {variable}.textContent = settingsText({json.dumps(source)});", 'wallet long text')

    text = one(text, "      if (response.ok) appleStatus.textContent = 'Verification file is hosted for ' + location.hostname + '.';", "      if (response.ok) appleStatus.textContent = settingsText('Verification file is hosted for') + ' ' + location.hostname + '.';", 'wallet hosted status')
    text = one(text, "        if (!verify.ok) throw new Error('File saved, but public verification URL returned HTTP ' + verify.status + '.');", "        if (!verify.ok) throw new Error(settingsText('File saved, but public verification URL returned HTTP') + ' ' + verify.status + '.');", 'wallet HTTP error')
    text = one(text, "        appleStatus.textContent = 'Hosted for ' + String(saved.domain || location.hostname) + '. Next: add this exact domain in SumUp → Payment wallets and continue verification.';", "        appleStatus.textContent = settingsText('Hosted for') + ' ' + String(saved.domain || location.hostname) + '. ' + settingsText('Next: add this exact domain in SumUp → Payment wallets and continue verification.');", 'wallet hosted next')
    text = one(text, "        appleStatus.textContent = error && error.message ? error.message : 'Could not host the Apple Pay verification file.';", "        appleStatus.textContent = settingsText(error && error.message ? error.message : 'Could not host the Apple Pay verification file.');", 'wallet host error')
    text = one(text, "        status.textContent = error && error.message ? error.message : 'Could not save wallet settings.';", "        status.textContent = settingsText(error && error.message ? error.message : 'Could not save wallet settings.');", 'wallet save error')

    write(path, text)
    print('V17_SUMUP_WALLET_I18N_OK=1')


def main() -> None:
    if len(sys.argv) != 5:
        die('Usage: pmd-settings-dynamic-i18n-v17.py ROOT CANDIDATE BACKUP MAP')

    root = Path(sys.argv[1]).resolve()
    candidate = Path(sys.argv[2]).resolve()
    backup = Path(sys.argv[3]).resolve()
    map_path = Path(sys.argv[4]).resolve()

    try:
        mapping = json.loads(read(map_path))
    except Exception as error:
        die('Could not parse V17 map: ' + str(error))
    if not isinstance(mapping, dict) or not mapping:
        die('V17 map is empty')

    copy_targets(root, candidate, backup)
    patch_catalogues(candidate / TARGETS[0], candidate / TARGETS[1], mapping)
    patch_provider(candidate / TARGETS[2])
    patch_self_service(candidate / TARGETS[3])
    patch_wallet(candidate / TARGETS[4])
    write(candidate / '.pmd-v17-targets.txt', '\n'.join(TARGETS) + '\n')

    print('V17_TARGET_FILES=' + str(len(TARGETS)))
    print('V17_CANDIDATES_BUILT_OK=1')


if __name__ == '__main__':
    main()
