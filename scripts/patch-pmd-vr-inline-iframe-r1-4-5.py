#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER_ROUTE = "PMD_VR_IFRAME_ROUTE_R1_4_5"
MARKER_SERVICE = "PMD_VR_IFRAME_SERVICE_R1_4_5"
MARKER_CLIENT = "PMD_VR_IFRAME_CLIENT_R1_4_5"
MARKER_RUNTIME = "PMD_VR_IFRAME_RUNTIME_R1_4_5"


def fail(message: str) -> None:
    raise SystemExit("ERROR: " + message)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label} expected once, found {count}")
    return text.replace(old, new, 1)


def patch_route(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_ROUTE in text:
        return
    if "PMD_VR_CREATE_SESSION_VALIDATION_R1_4_2" not in text:
        fail("R1.4.2 VR route validator marker missing")

    old = "                'integration_preference' => 'nullable|string|in:lightbox,embedded,payment_page',\n"
    new = "                'integration_preference' => 'nullable|string|in:iframe,lightbox,embedded,payment_page', // PMD_VR_IFRAME_ROUTE_R1_4_5\n"
    text = replace_once(text, old, new, "VR route integration validator")
    path.write_text(text, encoding="utf-8")


def patch_service(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_SERVICE in text:
        return
    for marker in [
        "PMD_VR_TARGET_MODE_SELECTION_R1_4_3",
        "PMD_VR_CONFIG_ID_INTERSECTION_R1_4_3",
        "PMD_VR_LIGHTBOX_CHECKOUT_R1_4",
    ]:
        if marker not in text:
            fail("required service marker missing: " + marker)

    old_mode = """        $targetIntegrationMode = in_array($requestedIntegration, ['lightbox', 'embedded'], true)\n            ? 'lightbox'\n            : 'payment_page';\n"""
    new_mode = """        $targetIntegrationMode = $requestedIntegration === 'iframe'\n            ? 'iframe'\n            : (in_array($requestedIntegration, ['lightbox', 'embedded'], true)\n                ? 'lightbox'\n                : 'payment_page'); // PMD_VR_IFRAME_SERVICE_R1_4_5\n"""
    text = replace_once(text, old_mode, new_mode, "VR target integration mode")

    anchor = "        // PMD_VR_LIGHTBOX_CHECKOUT_R1_4\n"
    iframe_block = r'''        // PMD_VR_IFRAME_SERVICE_R1_4_5
        // Frontend V2 Card/Wero requests the provider's IFRAME integration so the
        // secure payment UI is rendered inside PayMyDine instead of opening a
        // Lightbox or hosted Payment Page. The transaction-level possible-method
        // intersection above remains authoritative; no provider method is forced.
        if (
            $requestedIntegration === 'iframe'
            && in_array($method, ['card', 'wero'], true)
        ) {
            $iframeMethodId = (int)($allowedIds[0] ?? 0);
            if ($iframeMethodId <= 0) {
                return $this->businessError(
                    'vr_payment_iframe_method_missing',
                    'VR Payment did not return an iframe-capable configuration for the selected method.',
                    [
                        'transaction_id' => $transactionId,
                        'integration_mode' => 'iframe',
                        'allowed_method_ids' => $allowedIds,
                    ]
                );
            }

            $iframeScript = $client->iframeJavascriptUrl($transactionId);
            $scriptUrl = ($iframeScript['ok'] ?? false)
                ? $this->extractStringResult($iframeScript['data'] ?? null)
                : '';

            if ($scriptUrl === '') {
                return $this->businessError(
                    'vr_payment_iframe_script_unavailable',
                    'VR Payment could not initialize the embedded iframe checkout for the selected method.',
                    [
                        'transaction_id' => $transactionId,
                        'integration_mode' => 'iframe',
                        'payment_method_configuration_id' => $iframeMethodId,
                        'provider_http_status' => $iframeScript['status'] ?? null,
                    ]
                );
            }

            PaymentLogger::info('VR_PAYMENT_IFRAME_READY_R1_4_5', [
                'provider' => 'vr_payment',
                'payment_method' => $method,
                'transaction_id' => $transactionId,
                'payment_method_configuration_id' => $iframeMethodId,
                'merchant_reference' => $merchantReference,
            ]);

            return [
                'success' => true,
                'provider' => 'vr_payment',
                'method' => $method,
                'flow' => 'iframe',
                'script_url' => $scriptUrl,
                'payment_method_configuration_id' => $iframeMethodId,
                'redirect_url' => null,
                'fallback_flow' => null,
                'merchant_reference' => $merchantReference,
                'session_id' => (string)$transactionId,
                'transaction_id' => (string)$transactionId,
                'provider_reference' => (string)$transactionId,
                'status' => $client->normalizeTransactionStatus($transaction),
                'raw_status' => $transaction['state'] ?? null,
            ];
        }

'''
    text = replace_once(text, anchor, iframe_block + anchor, "VR Lightbox service anchor")
    path.write_text(text, encoding="utf-8")


def patch_client(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_CLIENT in text:
        return
    if "PMD_VR_LIGHTBOX_CLIENT_R1_4" not in text:
        fail("R1.4 frontend VR Lightbox client marker missing")

    text = replace_once(
        text,
        "  flow: 'redirect' | 'lightbox' | 'unknown'\n",
        "  flow: 'redirect' | 'iframe' | 'lightbox' | 'unknown' // PMD_VR_IFRAME_CLIENT_R1_4_5\n",
        "HostedProviderPaymentResult flow union",
    )

    old_prior = "      if ((window as any).LightboxCheckoutHandler?.startPayment) { resolve(); return }\n"
    new_prior = "      if ((window as any).LightboxCheckoutHandler?.startPayment || typeof (window as any).IframeCheckoutHandler === 'function') { resolve(); return }\n"
    text = replace_once(text, old_prior, new_prior, "VR loaded script handler check")

    normalize_anchor = "function normalizeProviderCode(methodCode: string, providerCode: string | null | undefined): string {\n"
    iframe_api = r'''export type VrPaymentIframeHandler = {
  create: (containerId: string) => unknown
  validate: () => unknown
  submit: () => unknown
  trigger?: () => unknown
  setValidationCallback?: (callback: (result: unknown) => void) => unknown
  setInitializeCallback?: (callback: () => void) => unknown
  setHeightChangeCallback?: (callback: (height: number) => void) => unknown
}

export async function mountVrPaymentIframe(
  result: HostedProviderPaymentResult,
  containerId: string,
  callbacks: {
    onValidation?: (result: unknown, handler: VrPaymentIframeHandler) => void
    onInitialize?: () => void
    onHeightChange?: (height: number) => void
  } = {},
): Promise<VrPaymentIframeHandler> {
  // PMD_VR_IFRAME_CLIENT_R1_4_5
  const provider = String(result.provider || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (provider !== 'vr_payment' || result.flow !== 'iframe') {
    throw new Error('VR Payment did not return an embedded iframe session.')
  }
  if (!result.scriptUrl || !result.paymentMethodConfigurationId) {
    throw new Error('VR Payment iframe session is incomplete.')
  }
  if (!containerId || !document.getElementById(containerId)) {
    throw new Error('PayMyDine iframe payment container is unavailable.')
  }

  await loadVrPaymentScript(result.scriptUrl)
  const factory = (window as any).IframeCheckoutHandler
  if (typeof factory !== 'function') {
    throw new Error('VR Payment iframe could not be initialized.')
  }

  const handler = factory(result.paymentMethodConfigurationId) as VrPaymentIframeHandler
  if (!handler || typeof handler.create !== 'function' || typeof handler.validate !== 'function' || typeof handler.submit !== 'function') {
    throw new Error('VR Payment returned an invalid iframe checkout handler.')
  }

  if (typeof handler.setValidationCallback === 'function') {
    handler.setValidationCallback((validationResult: unknown) => callbacks.onValidation?.(validationResult, handler))
  }
  if (typeof handler.setInitializeCallback === 'function') {
    handler.setInitializeCallback(() => callbacks.onInitialize?.())
  }
  if (typeof handler.setHeightChangeCallback === 'function') {
    handler.setHeightChangeCallback((height: number) => callbacks.onHeightChange?.(Number(height || 0)))
  }

  handler.create(containerId)
  return handler
}

'''
    text = replace_once(text, normalize_anchor, iframe_api + normalize_anchor, "frontend VR iframe API insertion")

    old_pref = "    integration_preference: requestedProvider === 'vr_payment' || requestedProvider === 'vrpayment' ? 'lightbox' : undefined,\n"
    new_pref = """    integration_preference: requestedProvider === 'vr_payment' || requestedProvider === 'vrpayment'\n      ? (['card', 'wero'].includes(String(input.methodCode || '').trim().toLowerCase()) ? 'iframe' : 'lightbox')\n      : undefined,\n"""
    text = replace_once(text, old_pref, new_pref, "frontend VR integration preference")

    old_flow = """  const flow: HostedProviderPaymentResult['flow'] = rawFlow === 'lightbox'\n    ? 'lightbox'\n    : redirectUrl\n      ? 'redirect'\n      : 'unknown'\n"""
    new_flow = """  const flow: HostedProviderPaymentResult['flow'] = rawFlow === 'iframe'\n    ? 'iframe'\n    : rawFlow === 'lightbox'\n      ? 'lightbox'\n      : redirectUrl\n        ? 'redirect'\n        : 'unknown'\n"""
    text = replace_once(text, old_flow, new_flow, "frontend provider flow parse")
    path.write_text(text, encoding="utf-8")


def patch_runtime(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_RUNTIME in text:
        return
    if "PMD_VR_LIGHTBOX_RUNTIME_R1_4" not in text:
        fail("R1.4 frontend VR runtime marker missing")

    import_anchor = "import { StripeInlinePayment } from './StripeInlinePayment'\n"
    import_new = import_anchor + "import { VrPaymentInline } from './VrPaymentInline'\n"
    text = replace_once(text, import_anchor, import_new, "RuntimeOverlays VR iframe import")

    inline_anchor = "  const isSumupInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && selectedProvider === 'sumup' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))\n"
    inline_new = inline_anchor + "  const isVrPaymentInline = Boolean(selectedMethod && ['vr_payment', 'vrpayment'].includes(selectedProvider) && ['card', 'wero'].includes(selectedCode)) // PMD_VR_IFRAME_RUNTIME_R1_4_5\n"
    text = replace_once(text, inline_anchor, inline_new, "RuntimeOverlays VR inline flag")

    render_anchor = "      {isPayPalInline && selectedMethod && canStartPayment ? (\n"
    vr_render = r'''      {isVrPaymentInline && selectedMethod && canStartPayment ? (
        <VrPaymentInline
          key={`vr-r1-4-5-${paymentMethodKey(selectedMethod)}-${order.orderId}-${payableEstimate.toFixed(2)}-${tipAmountEstimate.toFixed(2)}-${couponDiscount.toFixed(2)}-${splitMode}-${JSON.stringify(selectedItemsPayload || [])}`}
          orderId={order.orderId}
          settlementMode={settlementMode}
          table={bootstrap.table}
          methodCode={selectedMethod.code}
          providerCode={selectedMethod.providerCode}
          amount={payableEstimate}
          currency={bootstrap.restaurant.currency}
          tipAmount={tipAmountEstimate}
          couponCode={mode === 'split' ? null : couponCode.trim() || null}
          couponDiscount={mode === 'split' ? 0 : couponDiscount}
          selectedItems={selectedItemsPayload}
          payerLabel={payerLabel}
          items={order.items.filter((item) => item.unpaidQuantity > 0).map((item) => ({ id: String(item.orderMenuId || item.menuId), name: item.name, quantity: item.unpaidQuantity, price: item.price * grossRatio }))}
          prepareSplitIntent={mode === 'split' && splitMode !== 'full' ? prepareSplit : undefined}
          guestSessionId={guestSessionId || getSafeGuestSession(bootstrap.tenant.id, bootstrap.table.id || bootstrap.table.number || 'delivery')}
          locale={locale}
          onError={setMessage}
        />
      ) : isPayPalInline && selectedMethod && canStartPayment ? (
'''
    text = replace_once(text, render_anchor, vr_render, "RuntimeOverlays payment renderer")
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 5:
        fail("usage: patch-pmd-vr-inline-iframe-r1-4-5.py <routes/admin-app-before.php> <VRPaymentGatewayService.php> <client-api.ts> <RuntimeOverlays.tsx>")

    route, service, client, runtime = [Path(value).resolve() for value in sys.argv[1:]]
    for path in [route, service, client, runtime]:
        if not path.is_file():
            fail("target not found: " + str(path))

    patch_route(route)
    patch_service(service)
    patch_client(client)
    patch_runtime(runtime)

    checks = [
        (MARKER_ROUTE, route),
        (MARKER_SERVICE, service),
        (MARKER_CLIENT, client),
        (MARKER_RUNTIME, runtime),
    ]
    for marker, path in checks:
        if marker not in path.read_text(encoding="utf-8"):
            fail("marker missing after patch: " + marker)

    print("PMD_VR_IFRAME_ROUTE_R1_4_5=OK")
    print("PMD_VR_IFRAME_SERVICE_R1_4_5=OK")
    print("PMD_VR_IFRAME_CLIENT_R1_4_5=OK")
    print("PMD_VR_IFRAME_RUNTIME_R1_4_5=OK")
    print("VR_CARD_CHECKOUT=INLINE_IFRAME")
    print("VR_WERO_CHECKOUT=INLINE_IFRAME_WHEN_PROVIDER_EXPOSES_IFRAME")
    print("VR_LIGHTBOX=RETAINED_FOR_NON_CARD_WERO_METHODS")


if __name__ == "__main__":
    main()
