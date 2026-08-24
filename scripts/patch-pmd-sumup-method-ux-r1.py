#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: patch-pmd-sumup-method-ux-r1.py <stage-root>')

root = Path(sys.argv[1])


def read(rel):
    path = root / rel
    if not path.exists():
        raise SystemExit(f'ERROR: missing target: {rel}')
    return path, path.read_text()


def replace_once(rel, old, new, label):
    path, text = read(rel)
    count = text.count(old)
    if count == 0:
        if new in text:
            print(f'{label}=ALREADY_PATCHED')
            return
        raise SystemExit(f'ERROR: anchor missing for {label}: {rel}')
    if count != 1:
        raise SystemExit(f'ERROR: expected one anchor for {label}, found {count}: {rel}')
    path.write_text(text.replace(old, new, 1))
    print(f'{label}=PATCHED')


# 1) SumUp can now back the standalone Apple Pay / Google Pay method rows too.
replace_once(
    'app/admin/models/Payments_model.php',
    "        'apple_pay' => ['stripe', 'vr_payment'],\n        'google_pay' => ['stripe', 'vr_payment'],",
    "        'apple_pay' => ['stripe', 'sumup', 'vr_payment'],\n        'google_pay' => ['stripe', 'sumup', 'vr_payment'],",
    'METHOD_MATRIX_SUMUP_WALLETS',
)

replace_once(
    'app/admin/controllers/Payments.php',
    "            ['code' => 'sumup', 'name' => 'SumUp', 'supported_methods' => ['card']],",
    "            ['code' => 'sumup', 'name' => 'SumUp', 'supported_methods' => ['card', 'apple_pay', 'google_pay']],",
    'PAYMENTS_CONTROLLER_SUMUP_WALLETS',
)

# Selecting a provider means the method is offered; blank means Not offered.
replace_once(
    'app/admin/controllers/Payments.php',
    "            $model->provider_code = $providerCode;\n        }",
    "            $model->provider_code = $providerCode;\n\n            // PMD_METHOD_PROVIDER_IS_ENABLEMENT_R1\n            // The compact owner editor has only Name + Provider. For provider-\n            // backed methods, choosing a provider offers the method; choosing\n            // Not offered disables it. Cash methods keep their own status.\n            if (!in_array((string)$model->code, ['cod', 'cash'], true)) {\n                $model->status = $providerCode ? 1 : 0;\n                if (!$providerCode) {\n                    $model->is_default = 0;\n                }\n            }\n        }",
    'METHOD_PROVIDER_ENABLEMENT',
)

replace_once(
    'app/admin/controllers/Payments.php',
    "        $compatible = array_keys($this->getCompatibleProviders($methodCode));\n        if (!$providerCode || !in_array($providerCode, $compatible, true)) {\n            throw new ApplicationException(\"Provider '{$providerCode}' is not compatible with '{$methodCode}'.\");\n        }",
    "        // PMD_METHOD_PROVIDER_NOT_OFFERED_R1\n        // A blank provider is an explicit owner choice: do not offer this\n        // provider-backed method to guests. Compatibility is validated only\n        // when a provider is actually selected.\n        if (!$providerCode) {\n            return;\n        }\n\n        $compatible = array_keys($this->getCompatibleProviders($methodCode));\n        if (!in_array($providerCode, $compatible, true)) {\n            throw new ApplicationException(\"Provider '{$providerCode}' is not compatible with '{$methodCode}'.\");\n        }",
    'METHOD_PROVIDER_NOT_OFFERED_VALIDATION',
)

replace_once(
    'app/admin/controllers/Payments.php',
    "        if ((int)$postedDefault === 1) {\n            $model->status = 1;\n        }",
    "        if ((int)$postedDefault === 1) {\n            $model->status = 1;\n        }\n\n        // PMD_METHOD_PROVIDER_IS_ENABLEMENT_R1_FINAL\n        // A stale hidden default flag must never re-enable a provider-backed\n        // method after the owner selected Not offered.\n        if (in_array((string)$model->code, self::METHOD_CODES, true)\n            && !in_array((string)$model->code, ['cod', 'cash'], true)\n            && !strlen((string)$model->provider_code)) {\n            $model->status = 0;\n            $model->is_default = 0;\n        }",
    'METHOD_PROVIDER_ENABLEMENT_FINAL',
)

# 2) Provider catalogue now truthfully reports the standalone wallet flows.
registry_rel = 'app/Services/Payments/ProviderCapabilityRegistry.php'
registry_path, registry = read(registry_rel)
old_registry = """                // PayMyDine exposes one simple Card / Wallet choice. The
                // embedded SumUp Payment Widget renders Card and, when the
                // merchant/checkout/browser is eligible, Apple Pay and Google
                // Pay inside the same PayMyDine checkout. Current public SumUp
                // online-payment methods do not advertise Wero, so Wero stays
                // with providers whose implemented flow explicitly supports it.
                'payment_methods' => [
                    self::METHOD_CARD,
                ],
                'implemented_capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_TERMINAL_PAYMENTS,
                    self::CAPABILITY_WEBHOOKS,
                ],
                'implemented_payment_methods' => [
                    self::METHOD_CARD,
                ],
"""
new_registry = """                // Card / Wallet can expose Card + eligible wallets together.
                // The standalone Apple Pay and Google Pay rows can also route to
                // this same embedded widget and filter it to that wallet only.
                // Wero is intentionally not advertised because it is not in
                // SumUp's current public online-payment method list.
                'payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                ],
                'implemented_capabilities' => [
                    self::CAPABILITY_ONLINE_PAYMENTS,
                    self::CAPABILITY_TERMINAL_PAYMENTS,
                    self::CAPABILITY_WEBHOOKS,
                ],
                'implemented_payment_methods' => [
                    self::METHOD_CARD,
                    self::METHOD_APPLE_PAY,
                    self::METHOD_GOOGLE_PAY,
                ],
"""
if old_registry in registry:
    registry_path.write_text(registry.replace(old_registry, new_registry, 1))
    print('PROVIDER_REGISTRY_SUMUP_WALLETS=PATCHED')
elif new_registry in registry:
    print('PROVIDER_REGISTRY_SUMUP_WALLETS=ALREADY_PATCHED')
else:
    raise SystemExit('ERROR: SumUp registry block not recognized')

# 3) Runtime routing: all three SumUp online methods must enter the embedded
# widget. The component itself filters standalone wallet rows to that wallet.
runtime_rel = 'frontend-v2/src/runtime/components/RuntimeOverlays.tsx'
runtime_path, runtime = read(runtime_rel)
old_predicate = "selectedProvider === 'sumup' && selectedCode === 'card'"
new_predicate = "selectedProvider === 'sumup' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode)"
count = runtime.count(old_predicate)
if count:
    runtime = runtime.replace(old_predicate, new_predicate)
    runtime_path.write_text(runtime)
    print(f'RUNTIME_SUMUP_WALLET_PREDICATES_PATCHED={count}')
elif runtime.count(new_predicate) >= 2:
    print('RUNTIME_SUMUP_WALLET_PREDICATES=ALREADY_PATCHED')
else:
    raise SystemExit('ERROR: SumUp runtime predicates not recognized')

# 4) Widget: Card/Wallet shows all eligible methods; standalone wallet rows
# filter the SumUp widget to exactly that wallet.
sumup_rel = 'frontend-v2/src/runtime/components/SumupInlinePayment.tsx'
sumup_path, sumup = read(sumup_rel)
allow_anchor = "const PMD_METHOD_ALLOWLIST = ['card', 'apple_pay', 'google_pay']\nlet sumupScriptPromise: Promise<void> | null = null"
allow_new = """const PMD_METHOD_ALLOWLIST = ['card', 'apple_pay', 'google_pay']

function requestedSumupMethods(methodCode: string): string[] {
  const code = String(methodCode || 'card').toLowerCase()
  if (code === 'apple_pay') return ['apple_pay']
  if (code === 'google_pay') return ['google_pay']
  return PMD_METHOD_ALLOWLIST
}

let sumupScriptPromise: Promise<void> | null = null"""
if allow_anchor in sumup:
    sumup = sumup.replace(allow_anchor, allow_new, 1)
elif 'function requestedSumupMethods(methodCode: string)' not in sumup:
    raise SystemExit('ERROR: SumUp method allowlist anchor missing')

old_methods = """        const methods = (checkout.widget?.allowed_payment_methods || checkout.available_payment_methods || ['card'])
          .map((value) => String(value || '').toLowerCase())
          .filter((value) => PMD_METHOD_ALLOWLIST.includes(value))
        const allowedMethods = methods.length ? Array.from(new Set(methods)) : ['card']
        setAvailableMethods(allowedMethods)
"""
new_methods = """        const requestedMethods = requestedSumupMethods(props.methodCode)
        const methods = (checkout.widget?.allowed_payment_methods || checkout.available_payment_methods || ['card'])
          .map((value) => String(value || '').toLowerCase())
          .filter((value) => requestedMethods.includes(value))
        const allowedMethods = Array.from(new Set(methods))
        if (!allowedMethods.length) {
          const requestedLabel = props.methodCode === 'apple_pay'
            ? 'Apple Pay'
            : props.methodCode === 'google_pay'
              ? 'Google Pay'
              : 'Card / Wallet'
          throw new Error(`${requestedLabel} is not available for this SumUp checkout. Check merchant onboarding, domain eligibility and the current browser/device.`)
        }
        setAvailableMethods(allowedMethods)
"""
if old_methods in sumup:
    sumup = sumup.replace(old_methods, new_methods, 1)
elif 'const requestedMethods = requestedSumupMethods(props.methodCode)' not in sumup:
    raise SystemExit('ERROR: SumUp payment-method filtering anchor missing')

sumup = sumup.replace(
    'className={styles.stripeInlineBox} data-pmd-sumup-inline-widget="r1"',
    'className={`${styles.stripeInlineBox} ${styles.sumupInlineBox}`} data-pmd-sumup-inline-widget="r1"',
    1,
)
sumup = sumup.replace(
    'className={styles.stripeCardFrame}>\n        <div id={mountIdRef.current}',
    'className={`${styles.stripeCardFrame} ${styles.sumupCardFrame}`}>\n        <div id={mountIdRef.current}',
    1,
)
if 'styles.sumupInlineBox' not in sumup or 'styles.sumupCardFrame' not in sumup:
    raise SystemExit('ERROR: SumUp theme classes were not applied')
sumup_path.write_text(sumup)
print('SUMUP_STANDALONE_WALLET_FILTER=PATCHED')

# 5) Theme-aware SumUp styling. Every global hook is nested under a local
# CSS-module class so Next 16 pure-selector validation remains satisfied.
css_rel = 'frontend-v2/src/runtime/components/RuntimeOverlays.module.css'
css_path, css = read(css_rel)
marker = '/* PMD_SUMUP_WIDGET_THEME_R1 */'
if marker not in css:
    css += r'''

/* PMD_SUMUP_WIDGET_THEME_R1
   SumUp officially exposes data-sumup-id hooks for custom styling. Keep the
   provider-owned form, validation and wallet buttons intact while matching the
   active PayMyDine theme surface, text, line and control colors. */
.sumupInlineBox { color: var(--pmd-text, inherit); }
.sumupCardFrame {
  overflow: hidden;
  padding: .65rem;
  background: color-mix(in srgb, var(--pmd-surface, #fff) 92%, transparent);
}
.sumupInlineBox :global([data-sumup-id="widget__container"]) {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: .9rem !important;
  background: var(--pmd-surface, #fff) !important;
  color: var(--pmd-text, #161616) !important;
  box-shadow: none !important;
  font-family: inherit !important;
}
.sumupInlineBox :global([data-sumup-id="widget__container"]) input {
  border-color: var(--pmd-line, rgba(0,0,0,.16)) !important;
  border-radius: .78rem !important;
  background: var(--pmd-control, transparent) !important;
  color: var(--pmd-text, #161616) !important;
  font-family: inherit !important;
}
.sumupInlineBox :global([data-sumup-id="widget__container"]) label,
.sumupInlineBox :global([data-sumup-id="widget__container"]) h1,
.sumupInlineBox :global([data-sumup-id="widget__container"]) h2,
.sumupInlineBox :global([data-sumup-id="widget__container"]) h3,
.sumupInlineBox :global([data-sumup-id="widget__container"]) p,
.sumupInlineBox :global([data-sumup-id="widget__container"]) span {
  color: inherit !important;
  font-family: inherit !important;
}
.sumupInlineBox :global([data-sumup-id="widget__container"]) a {
  color: var(--pmd-accent, currentColor) !important;
}
'''
    css_path.write_text(css)
    print('SUMUP_WIDGET_THEME=PATCHED')
else:
    print('SUMUP_WIDGET_THEME=ALREADY_PATCHED')

print('PMD_SUMUP_METHOD_UX_R1=OK')
