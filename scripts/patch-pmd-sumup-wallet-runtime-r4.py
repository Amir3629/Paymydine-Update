#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: patch-pmd-sumup-wallet-runtime-r4.py <stage-root>')

root = Path(sys.argv[1])
front_rel = 'frontend-v2/src/runtime/components/SumupInlinePayment.tsx'
wallet_js_rel = 'app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js'


def read(rel):
    path = root / rel
    if not path.exists():
        raise SystemExit(f'ERROR: missing target: {rel}')
    return path, path.read_text()


front_path, front = read(front_rel)

# R4 makes standalone wallets fail closed. If Apple Pay or Google Pay is not
# actually eligible in the browser/domain, PMD must never expose SumUp card
# fields as a silent fallback.
if 'function normalizeLoadedSumupMethods(value: unknown)' not in front:
    anchor = 'let sumupScriptPromise: Promise<void> | null = null'
    helper = '''function normalizeLoadedSumupMethods(value: unknown): string[] {\n  const source = Array.isArray(value)\n    ? value\n    : (value && typeof value === 'object' && Array.isArray((value as { items?: unknown[] }).items))\n      ? (value as { items: unknown[] }).items\n      : []\n\n  return Array.from(new Set(source\n    .map((item) => {\n      if (typeof item === 'string') return item\n      if (item && typeof item === 'object' && 'id' in item) return String((item as { id?: unknown }).id || '')\n      return ''\n    })\n    .map((item) => item.toLowerCase().trim())\n    .filter((item) => PMD_METHOD_ALLOWLIST.includes(item))))\n}\n\n'''
    if anchor not in front:
        raise SystemExit('ERROR: SumUp script promise anchor missing')
    front = front.replace(anchor, helper + anchor, 1)
    print('FRONTEND_SDK_METHOD_NORMALIZER=PATCHED')
else:
    print('FRONTEND_SDK_METHOD_NORMALIZER=ALREADY_PATCHED')

# Add concise localized setup errors.
old_de = "    methods: 'Karte, Apple Pay und Google Pay werden von SumUp je nach Verfügbarkeit angezeigt.',\n"
new_de = "    methods: 'Karte, Apple Pay und Google Pay werden von SumUp je nach Verfügbarkeit angezeigt.',\n    appleSetup: 'Apple Pay ist für diese Domain noch nicht eingerichtet. Laden Sie zuerst die SumUp-Verifizierungsdatei in PayMyDine hoch und registrieren Sie danach diese Domain in SumUp.',\n    walletUnavailable: '{wallet} ist auf diesem Gerät oder für diese Domain noch nicht verfügbar. Es wird nicht auf Kartenzahlung zurückgefallen.',\n"
if old_de in front:
    front = front.replace(old_de, new_de, 1)
elif 'appleSetup:' not in front:
    raise SystemExit('ERROR: German SumUp copy anchor missing')

old_en = "    methods: 'Card, Apple Pay and Google Pay are shown by SumUp when available.',\n"
new_en = "    methods: 'Card, Apple Pay and Google Pay are shown by SumUp when available.',\n    appleSetup: 'Apple Pay is not set up for this domain yet. Upload the SumUp verification file in PayMyDine first, then register this exact domain in SumUp.',\n    walletUnavailable: '{wallet} is not available on this device or domain yet. PayMyDine will not fall back to card entry.',\n"
if old_en in front:
    front = front.replace(old_en, new_en, 1)
elif "walletUnavailable: '{wallet}" not in front:
    raise SystemExit('ERROR: English SumUp copy anchor missing')

# Do not even mount SumUp's payment form for standalone Apple Pay until PMD is
# actually serving the association file on the current tenant host.
if 'PMD_SUMUP_APPLE_DOMAIN_PREFLIGHT_R4' not in front:
    anchor = "        if (!(amount > 0)) throw new Error('Payment amount must be greater than zero.')\n\n        const returnUrl"
    replacement = """        if (!(amount > 0)) throw new Error('Payment amount must be greater than zero.')\n\n        // PMD_SUMUP_APPLE_DOMAIN_PREFLIGHT_R4\n        if (String(props.methodCode || '').toLowerCase() === 'apple_pay') {\n          const appleDomain = await fetch('/.well-known/apple-developer-merchantid-domain-association?ts=' + Date.now(), {\n            credentials: 'same-origin',\n            cache: 'no-store',\n          })\n          if (!appleDomain.ok) throw new Error(copy.appleSetup)\n        }\n\n        const returnUrl"""
    if anchor not in front:
        raise SystemExit('ERROR: frontend amount/return URL anchor missing')
    front = front.replace(anchor, replacement, 1)
    print('FRONTEND_APPLE_DOMAIN_PREFLIGHT=PATCHED')
else:
    print('FRONTEND_APPLE_DOMAIN_PREFLIGHT=ALREADY_PATCHED')

# R3 returned the requested method unconditionally. R4 also listens to the SDK's
# client-side method discovery when the SDK supplies it. If the requested wallet
# is absent, unmount immediately instead of allowing the widget to render card.
old_loader = '          onPaymentMethodsLoad: () => allowedMethods,\n'
new_loader = '''          onPaymentMethodsLoad: (sdkMethods: unknown) => {\n            const requested = requestedSumupMethods(props.methodCode)\n            const loaded = normalizeLoadedSumupMethods(sdkMethods)\n            const filtered = loaded.length ? loaded.filter((method) => requested.includes(method)) : requested\n\n            if (props.methodCode !== 'card' && loaded.length && !loaded.includes(props.methodCode)) {\n              const wallet = props.methodCode === 'apple_pay' ? 'Apple Pay' : 'Google Pay'\n              window.setTimeout(() => {\n                if (cancelled) return\n                try { widgetRef.current?.unmount?.() } catch {}\n                widgetRef.current = null\n                mountedRef.current = false\n                setReady(false)\n                reportError(copy.walletUnavailable.replace('{wallet}', wallet))\n              }, 0)\n              return []\n            }\n\n            return filtered\n          },\n'''
if old_loader in front:
    front = front.replace(old_loader, new_loader, 1)
    print('FRONTEND_SDK_METHOD_GUARD=PATCHED')
elif 'const loaded = normalizeLoadedSumupMethods(sdkMethods)' not in front:
    raise SystemExit('ERROR: onPaymentMethodsLoad anchor missing')
else:
    print('FRONTEND_SDK_METHOD_GUARD=ALREADY_PATCHED')

# The latest SumUp SDK warns that amount is deprecated. PMD already renders the
# amount on its own button, while SumUp fetches the authoritative total from the
# checkout ID.
old_amount = "          amount: amount.toFixed(2),\n          currency: String(props.currency || 'EUR').toUpperCase(),\n"
if old_amount in front:
    front = front.replace(old_amount, '          showAmount: false,\n', 1)
    print('FRONTEND_DEPRECATED_WIDGET_AMOUNT=REMOVED')
elif 'showAmount: false,' in front:
    print('FRONTEND_DEPRECATED_WIDGET_AMOUNT=ALREADY_REMOVED')
else:
    raise SystemExit('ERROR: deprecated SumUp amount config anchor missing')

# Final fail-closed DOM guard. Some SumUp widget builds do not expose their
# client method list to onPaymentMethodsLoad. If a standalone wallet selection
# nevertheless produces actual card-entry inputs, destroy the widget and show a
# setup/eligibility error. This guard is intentionally conservative and only runs
# for apple_pay/google_pay, never for Card / Wallet.
if 'PMD_SUMUP_WALLET_DOM_GUARD_R4' not in front:
    old_onload = '''          onLoad: () => {\n            if (cancelled) return\n            mountedRef.current = true\n            setInfo('')\n            setReady(true)\n          },\n'''
    new_onload = '''          onLoad: () => {\n            if (cancelled) return\n            mountedRef.current = true\n            setInfo('')\n            setReady(true)\n\n            // PMD_SUMUP_WALLET_DOM_GUARD_R4\n            if (props.methodCode === 'apple_pay' || props.methodCode === 'google_pay') {\n              const guardWallet = () => {\n                if (cancelled || !mountedRef.current) return\n                const host = document.getElementById(mountIdRef.current)\n                if (!host) return\n                const cardInput = host.querySelector(\n                  'input[autocomplete="cc-number"], input[autocomplete="cc-exp"], input[autocomplete="cc-csc"], input[name*="card-number" i], input[name*="cardNumber" i]'\n                )\n                if (!cardInput) return\n                const wallet = props.methodCode === 'apple_pay' ? 'Apple Pay' : 'Google Pay'\n                try { widgetRef.current?.unmount?.() } catch {}\n                widgetRef.current = null\n                mountedRef.current = false\n                setReady(false)\n                reportError(copy.walletUnavailable.replace('{wallet}', wallet))\n              }\n              window.setTimeout(guardWallet, 120)\n              window.setTimeout(guardWallet, 450)\n              window.setTimeout(guardWallet, 900)\n            }\n          },\n'''
    if old_onload not in front:
        raise SystemExit('ERROR: SumUp onLoad anchor missing')
    front = front.replace(old_onload, new_onload, 1)
    print('FRONTEND_WALLET_DOM_GUARD=PATCHED')
else:
    print('FRONTEND_WALLET_DOM_GUARD=ALREADY_PATCHED')

front_path.write_text(front)

# Apple association files downloaded from SumUp intentionally have no extension.
# macOS disables them if the input has a .txt/.bin accept filter, so R4 removes
# the file-type restriction and keeps validation on the server by size/content.
js_path, js = read(wallet_js_rel)
accept_line = "    appleFileInput.accept = '.txt,.bin,application/octet-stream,text/plain';\n"
if accept_line in js:
    js = js.replace(accept_line, "    appleFileInput.setAttribute('data-pmd-extensionless-file', 'allowed');\n", 1)
    print('APPLE_EXTENSIONLESS_PICKER=PATCHED')
elif "data-pmd-extensionless-file', 'allowed'" in js:
    print('APPLE_EXTENSIONLESS_PICKER=ALREADY_PATCHED')
else:
    raise SystemExit('ERROR: Apple file accept anchor missing')

old_help = "    appleFileHelp.textContent = 'Download the domain verification file from SumUp, then choose it here. No VPS upload is needed.';"
new_help = "    appleFileHelp.textContent = 'Choose the file exactly as downloaded from SumUp. It normally has no file extension. No VPS upload is needed.';"
if old_help in js:
    js = js.replace(old_help, new_help, 1)
elif new_help not in js:
    raise SystemExit('ERROR: Apple file helper anchor missing')

old_success = "        appleStatus.textContent = 'Hosted for ' + String(saved.domain || location.hostname) + ' · SHA-256 ' + String(saved.sha256 || '').slice(0, 12) + '…';"
new_success = "        appleStatus.textContent = 'Hosted for ' + String(saved.domain || location.hostname) + '. Next: add this exact domain in SumUp → Payment wallets and continue verification.';"
if old_success in js:
    js = js.replace(old_success, new_success, 1)
elif new_success not in js:
    raise SystemExit('ERROR: Apple upload success anchor missing')

# Surface current hosting status when the modal opens, without adding another
# settings field or another action for the owner.
if 'PMD_SUMUP_APPLE_HOSTING_STATUS_R4' not in js:
    anchor = "    section.appendChild(appleActions);\n\n    appleUpload.addEventListener('click', async function () {"
    block = """    section.appendChild(appleActions);\n\n    // PMD_SUMUP_APPLE_HOSTING_STATUS_R4\n    fetch('/.well-known/apple-developer-merchantid-domain-association?ts=' + Date.now(), {\n      credentials: 'same-origin',\n      cache: 'no-store'\n    }).then(function (response) {\n      if (response.ok) appleStatus.textContent = 'Verification file is hosted for ' + location.hostname + '.';\n    }).catch(function () {});\n\n    appleUpload.addEventListener('click', async function () {"""
    if anchor not in js:
        raise SystemExit('ERROR: Apple action/status anchor missing')
    js = js.replace(anchor, block, 1)
    print('APPLE_HOSTING_STATUS=PATCHED')
else:
    print('APPLE_HOSTING_STATUS=ALREADY_PATCHED')

js_path.write_text(js)

for rel, needle in [
    (front_rel, 'PMD_SUMUP_APPLE_DOMAIN_PREFLIGHT_R4'),
    (front_rel, 'PMD_SUMUP_WALLET_DOM_GUARD_R4'),
    (front_rel, 'normalizeLoadedSumupMethods(sdkMethods)'),
    (front_rel, 'showAmount: false'),
    (wallet_js_rel, "data-pmd-extensionless-file', 'allowed'"),
    (wallet_js_rel, 'PMD_SUMUP_APPLE_HOSTING_STATUS_R4'),
]:
    _, text = read(rel)
    if needle not in text:
        raise SystemExit(f'ERROR: R4 contract missing {needle}: {rel}')

print('PMD_SUMUP_WALLET_RUNTIME_R4=OK')
