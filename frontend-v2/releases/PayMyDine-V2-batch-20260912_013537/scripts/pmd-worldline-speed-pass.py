#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIRECT = ROOT / 'src/runtime/components/WorldlineDirectMethodButton.tsx'
RUNTIME = ROOT / 'src/runtime/components/RuntimeOverlays.tsx'
BRIDGE = ROOT / 'src/runtime/components/WorldlineEmbeddedCheckoutBridge.tsx'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    return text.replace(old, new, 1)


direct = DIRECT.read_text()
runtime = RUNTIME.read_text()
bridge = BRIDGE.read_text()

# Google Pay: start the Google script and the Worldline Client Session request in
# parallel. Previously these were serial, which is why Apple was ready first.
old_prepare = """        if (code === 'google_pay') await loadGooglePayScript()\n        const slug = code.replace(/_/g, '-')\n        const payload = await requestJson(`/api/v1/payments/worldline/native/wallet/${slug}/create-session`, {\n          order_id: props.orderId,\n          payment_method: code,\n          provider: 'worldline',\n          return_url: returnUrl(),\n          tip_amount: props.tipAmount,\n          locale: String(props.locale || 'en').replace('-', '_'),\n        }) as WalletSessionPayload\n"""
new_prepare = """        const googleScript = code === 'google_pay' ? loadGooglePayScript() : Promise.resolve()\n        const slug = code.replace(/_/g, '-')\n        const sessionPromise = requestJson(`/api/v1/payments/worldline/native/wallet/${slug}/create-session`, {\n          order_id: props.orderId,\n          payment_method: code,\n          provider: 'worldline',\n          return_url: returnUrl(),\n          tip_amount: props.tipAmount,\n          locale: String(props.locale || 'en').replace('-', '_'),\n        }) as Promise<WalletSessionPayload>\n        const [payload] = await Promise.all([sessionPromise, googleScript])\n"""
direct = replace_once(direct, old_prepare, new_prepare, 'parallel Google Pay preparation')

old_product = """        const product = await session.getPaymentProduct(productId, details, specificInputs)\n        const paymentRequest = session.getPaymentRequest()\n        paymentRequest.setPaymentProduct(product)\n        if (cancelled || generation !== generationRef.current) return\n"""
new_product = """        const product = await session.getPaymentProduct(productId, details, specificInputs)\n        const paymentRequest = session.getPaymentRequest()\n        paymentRequest.setPaymentProduct(product)\n        if (code === 'google_pay') {\n          if (!googleMerchantId) throw new Error('Google Pay Merchant ID is not configured for this restaurant.')\n          const Constructor = getGooglePaymentsClientConstructor()\n          if (!Constructor) throw new Error('Google Pay API is unavailable in this browser.')\n          googleClientRef.current = googleClientRef.current || new Constructor({\n            environment: environment === 'PROD' ? 'PRODUCTION' : 'TEST',\n          })\n        }\n        if (cancelled || generation !== generationRef.current) return\n"""
direct = replace_once(direct, old_product, new_product, 'Google Pay client pre-initialization')

old_retry = """      if (code === 'apple_pay' || code === 'google_pay') {\n        if (!wallet) {\n          throw new Error(localError || `${props.method.name} is still preparing. Please tap once more when it is ready.`)\n        }\n        if (code === 'apple_pay') await payApple(wallet)\n"""
new_retry = """      if (code === 'apple_pay' || code === 'google_pay') {\n        if (!wallet) {\n          if (localError) throw new Error(localError)\n          return\n        }\n        if (code === 'apple_pay') await payApple(wallet)\n"""
direct = replace_once(direct, old_retry, new_retry, 'remove wallet second-tap message')

old_ready = """  const label = props.method.name || (code === 'apple_pay' ? 'Apple Pay' : code === 'google_pay' ? 'Google Pay' : code === 'paypal' ? 'PayPal' : 'Wero')\n  const notReady = (code === 'apple_pay' || code === 'google_pay') && !wallet\n\n  return (\n"""
new_ready = """  const label = props.method.name || (code === 'apple_pay' ? 'Apple Pay' : code === 'google_pay' ? 'Google Pay' : code === 'paypal' ? 'PayPal' : 'Wero')\n  const notReady = (code === 'apple_pay' || code === 'google_pay') && !wallet\n  const preparingWallet = notReady && !localError\n\n  return (\n"""
direct = replace_once(direct, old_ready, new_ready, 'wallet ready state')

direct = replace_once(
    direct,
    "        disabled={Boolean(props.disabled)}\n",
    "        disabled={Boolean(props.disabled || preparingWallet)}\n",
    'wallet button readiness gate',
)
direct = replace_once(
    direct,
    "        [data-pmd-worldline-direct-method][data-pmd-worldline-ready=\"false\"] {\n          opacity: .78 !important;\n        }\n",
    "        [data-pmd-worldline-direct-method][data-pmd-worldline-ready=\"false\"] {\n          opacity: 1 !important;\n        }\n",
    'keep preparing wallet visually stable',
)

# Card: warm the lightweight Worldline Client Session while the payment panel is
# already open. This does not create a card payment and contains no PAN/CVV.
runtime = replace_once(
    runtime,
    "import { WorldlineDirectMethodButton } from './WorldlineDirectMethodButton'\n",
    "import { WorldlineDirectMethodButton } from './WorldlineDirectMethodButton'\nimport { WorldlineCardSessionPrewarmer } from './WorldlineCardSessionPrewarmer'\n",
    'RuntimeOverlays card prewarmer import',
)

payer_anchor = "  const payerLabel = splitMode === 'full' ? null : `PMD R35 ${splitMode}`\n"
payer_replacement = payer_anchor + """  const canPrewarmWorldlineCard = settlementMode === 'pay-existing'\n    && mode === 'payment'\n    && payableEstimate > 0\n    && couponDiscount <= 0.0001\n    && !couponCode.trim()\n    && !selectedItemsPayload?.length\n    && paymentChoices.some((entry) => {\n      const code = String(entry.code || '').trim().toLowerCase()\n      const provider = String(entry.providerCode || '').trim().toLowerCase().replace(/[\\s-]+/g, '_')\n      return code === 'card' && provider === 'worldline'\n    })\n"""
runtime = replace_once(runtime, payer_anchor, payer_replacement, 'Worldline card prewarm eligibility')

root_anchor = "  return (\n    <div className={styles.stack} data-pmd-payment-order-id={order.orderId} data-pmd-split-safety={mode === 'split' ? 'r35' : undefined}>\n"
root_replacement = root_anchor + """      <WorldlineCardSessionPrewarmer\n        enabled={canPrewarmWorldlineCard}\n        orderId={order.orderId!}\n        amount={payableEstimate}\n        currency={bootstrap.restaurant.currency}\n        tipAmount={tipAmountEstimate}\n        locale={locale}\n      />\n"""
runtime = replace_once(runtime, root_anchor, root_replacement, 'mount Worldline card prewarmer')

# Bridge: if the exact order/amount/tip session was already warmed, consume it.
# Otherwise use the existing canonical network call unchanged.
bridge = replace_once(
    bridge,
    "import { WorldlineNativeWalletForm } from './WorldlineNativeWalletForm'\n",
    "import { WorldlineNativeWalletForm } from './WorldlineNativeWalletForm'\nimport { consumeWorldlineCardSession, type WorldlineCardPrewarmInput } from './WorldlineCardSessionPrewarm'\n",
    'Bridge card prewarm import',
)

old_card_fetch = "        const response = await originalFetch.call(window, NATIVE_CARD_CREATE_ENDPOINT, nextInit)\n"
new_card_fetch = """        const warmedCard = await consumeWorldlineCardSession(payload as unknown as WorldlineCardPrewarmInput)\n        const response = warmedCard\n          ? new Response(JSON.stringify(warmedCard), {\n              status: 200,\n              headers: { 'content-type': 'application/json; charset=utf-8' },\n            })\n          : await originalFetch.call(window, NATIVE_CARD_CREATE_ENDPOINT, nextInit)\n"""
bridge = replace_once(bridge, old_card_fetch, new_card_fetch, 'consume prewarmed Worldline card session')

DIRECT.write_text(direct)
RUNTIME.write_text(runtime)
BRIDGE.write_text(bridge)

print('PASS: Google Pay script and Worldline session now prepare in parallel')
print('PASS: Google Pay cannot emit the old second-tap preparation message')
print('PASS: Google Pay client is initialized before the method becomes ready')
print('PASS: Worldline Card session prewarmer is mounted in PaymentPanel')
print('PASS: Card bridge consumes the exact prewarmed session before falling back to network')
