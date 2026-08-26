#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER_CLIENT = "PMD_VR_LIGHTBOX_API_R1_4"
MARKER_SERVICE = "PMD_VR_LIGHTBOX_CHECKOUT_R1_4"
MARKER_V2_CLIENT = "PMD_VR_LIGHTBOX_CLIENT_R1_4"
MARKER_V2_RUNTIME = "PMD_VR_LIGHTBOX_RUNTIME_R1_4"


def fail(message: str) -> None:
    raise SystemExit("ERROR: " + message)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        fail(label + " anchor not found")
    return text.replace(old, new, 1)


def patch_api_client(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_CLIENT in text:
        return

    anchor = "    public function performTerminalTransaction(int $terminalId, int $transactionId, string $language = 'de-DE'): array\n"
    methods = r'''    // PMD_VR_LIGHTBOX_API_R1_4
    public function iframeJavascriptUrl(int $transactionId): array
    {
        return $this->request('GET', '/api/v2.0/payment/transactions/'.$transactionId.'/iframe-javascript-url');
    }

    public function lightboxJavascriptUrl(int $transactionId): array
    {
        return $this->request('GET', '/api/v2.0/payment/transactions/'.$transactionId.'/lightbox-javascript-url');
    }

'''
    text = replace_once(text, anchor, methods + anchor, "VrPaymentApiClient method")
    path.write_text(text, encoding="utf-8")


def patch_gateway_service(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_SERVICE in text:
        return

    anchor = "        $page = $client->paymentPageUrl($transactionId);\n"
    block = r'''        // PMD_VR_LIGHTBOX_CHECKOUT_R1_4
        // Lightbox is opt-in so legacy/shared checkout callers keep their proven
        // Payment Page redirect contract. The frontend-v2 client explicitly asks
        // for lightbox and we fall back to Payment Page if the tenant/method does
        // not expose a usable lightbox configuration.
        $requestedIntegration = strtolower(trim((string)(
            $payload['integration_preference']
            ?? $payload['integration_mode']
            ?? $payload['checkout_flow']
            ?? ''
        )));
        if (
            in_array($requestedIntegration, ['lightbox', 'embedded'], true)
            && in_array($method, ['card', 'wero', 'apple_pay', 'google_pay'], true)
        ) {
            $lightboxMethodId = null;
            $available = $client->availablePaymentMethodConfigurations($transactionId, 'lightbox');
            if ($available['ok'] ?? false) {
                $rows = $client->normalizeMethodConfigurations((array)($available['data'] ?? []));
                foreach ($rows as $row) {
                    $candidateId = (int)($row['id'] ?? 0);
                    if ($candidateId <= 0 || !($row['active'] ?? true)) continue;
                    $candidateCode = strtolower(trim((string)($row['pmd_method_code'] ?? '')));
                    if (
                        ($allowedIds && in_array($candidateId, $allowedIds, true))
                        || (!$allowedIds && $candidateCode === $method)
                    ) {
                        $lightboxMethodId = $candidateId;
                        break;
                    }
                }
            }

            if ($lightboxMethodId !== null) {
                $lightboxScript = $client->lightboxJavascriptUrl($transactionId);
                $scriptUrl = ($lightboxScript['ok'] ?? false)
                    ? $this->extractStringResult($lightboxScript['data'] ?? null)
                    : '';

                if ($scriptUrl !== '') {
                    PaymentLogger::info('VR_PAYMENT_LIGHTBOX_READY', [
                        'provider' => 'vr_payment',
                        'payment_method' => $method,
                        'transaction_id' => $transactionId,
                        'payment_method_configuration_id' => $lightboxMethodId,
                        'merchant_reference' => $merchantReference,
                    ]);

                    return [
                        'success' => true,
                        'provider' => 'vr_payment',
                        'method' => $method,
                        'flow' => 'lightbox',
                        'script_url' => $scriptUrl,
                        'payment_method_configuration_id' => $lightboxMethodId,
                        'redirect_url' => null,
                        'fallback_flow' => 'payment_page',
                        'merchant_reference' => $merchantReference,
                        'session_id' => (string)$transactionId,
                        'transaction_id' => (string)$transactionId,
                        'provider_reference' => (string)$transactionId,
                        'status' => $client->normalizeTransactionStatus($transaction),
                        'raw_status' => $transaction['state'] ?? null,
                    ];
                }
            }

            PaymentLogger::info('VR_PAYMENT_LIGHTBOX_FALLBACK', [
                'provider' => 'vr_payment',
                'payment_method' => $method,
                'transaction_id' => $transactionId,
                'available_api_ok' => (bool)($available['ok'] ?? false),
                'lightbox_configuration_found' => $lightboxMethodId !== null,
            ]);
        }

'''
    text = replace_once(text, anchor, block + anchor, "VRPaymentGatewayService payment page")

    response_anchor = "            'method' => $method,\n            'redirect_url' => $redirectUrl,\n"
    response_replacement = "            'method' => $method,\n            'flow' => 'redirect',\n            'redirect_url' => $redirectUrl,\n            'fallback_flow' => null,\n"
    text = replace_once(text, response_anchor, response_replacement, "VRPaymentGatewayService redirect response")
    path.write_text(text, encoding="utf-8")


def patch_frontend_client(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_V2_CLIENT in text:
        return

    type_anchor = r'''export type HostedProviderPaymentResult = {
  provider: string
  redirectUrl: string | null
  immediateReference: string | null
  raw: any
}
'''
    type_replacement = r'''// PMD_VR_LIGHTBOX_CLIENT_R1_4
export type HostedProviderPaymentResult = {
  provider: string
  redirectUrl: string | null
  immediateReference: string | null
  flow: 'redirect' | 'lightbox' | 'unknown'
  scriptUrl: string | null
  paymentMethodConfigurationId: number | null
  raw: any
}

const vrPaymentScriptLoads = new Map<string, Promise<void>>()

async function loadVrPaymentScript(url: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('VR Payment can only open in the browser.')
  const parsed = new URL(url, window.location.origin)
  if (parsed.protocol !== 'https:') throw new Error('VR Payment returned an insecure checkout script URL.')

  const key = parsed.toString()
  const existing = vrPaymentScriptLoads.get(key)
  if (existing) return existing

  const load = new Promise<void>((resolve, reject) => {
    const prior = Array.from(document.scripts).find((entry) => entry.src === key)
    if (prior) {
      if ((window as any).LightboxCheckoutHandler?.startPayment) { resolve(); return }
      prior.addEventListener('load', () => resolve(), { once: true })
      prior.addEventListener('error', () => reject(new Error('VR Payment checkout script failed to load.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = key
    script.async = true
    script.dataset.pmdVrPayment = 'lightbox-r1-4'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('VR Payment checkout script failed to load.'))
    document.head.appendChild(script)
  })
  vrPaymentScriptLoads.set(key, load)
  try {
    await load
  } catch (error) {
    vrPaymentScriptLoads.delete(key)
    throw error
  }
}

export async function launchVrPaymentLightbox(result: HostedProviderPaymentResult): Promise<boolean> {
  const provider = String(result.provider || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (provider !== 'vr_payment' || result.flow !== 'lightbox') return false
  if (!result.scriptUrl || !result.paymentMethodConfigurationId) {
    throw new Error('VR Payment lightbox session is incomplete.')
  }

  await loadVrPaymentScript(result.scriptUrl)
  const handler = (window as any).LightboxCheckoutHandler
  if (!handler || typeof handler.startPayment !== 'function') {
    throw new Error('VR Payment lightbox could not be initialized.')
  }

  handler.startPayment(result.paymentMethodConfigurationId, (error?: unknown) => {
    console.error('[PMD_VR_LIGHTBOX_ERROR]', error || 'VR Payment lightbox reported an error.')
  })
  return true
}
'''
    text = replace_once(text, type_anchor, type_replacement, "frontend HostedProviderPaymentResult")

    payload_anchor = "    items: input.items || [],\n  }\n"
    payload_replacement = "    items: input.items || [],\n    integration_preference: requestedProvider === 'vr_payment' || requestedProvider === 'vrpayment' ? 'lightbox' : undefined,\n  }\n"
    text = replace_once(text, payload_anchor, payload_replacement, "frontend session payload")

    return_anchor = r'''  return {
    provider,
    redirectUrl: providerRedirect(data),
    immediateReference: providerReference(data),
    raw: data,
  }
}
'''
    return_replacement = r'''  const redirectUrl = providerRedirect(data)
  const rawFlow = String(data?.flow || '').trim().toLowerCase()
  const flow: HostedProviderPaymentResult['flow'] = rawFlow === 'lightbox'
    ? 'lightbox'
    : redirectUrl
      ? 'redirect'
      : 'unknown'

  return {
    provider,
    redirectUrl,
    immediateReference: providerReference(data),
    flow,
    scriptUrl: data?.script_url ? String(data.script_url) : null,
    paymentMethodConfigurationId: Number(data?.payment_method_configuration_id || 0) || null,
    raw: data,
  }
}
'''
    text = replace_once(text, return_anchor, return_replacement, "frontend hosted payment return")
    path.write_text(text, encoding="utf-8")


def patch_runtime_overlays(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_V2_RUNTIME in text:
        return

    import_anchor = "import { callWaiter, clearPendingProviderPayment, finalizeExistingOrderPayment, payExistingOrder, prepareSplitPaymentIntent, startHostedProviderPayment, validateCoupon, downloadPaidInvoice,\n"
    import_replacement = "import { callWaiter, clearPendingProviderPayment, finalizeExistingOrderPayment, launchVrPaymentLightbox, payExistingOrder, prepareSplitPaymentIntent, startHostedProviderPayment, validateCoupon, downloadPaidInvoice,\n"
    text = replace_once(text, import_anchor, import_replacement, "RuntimeOverlays client-api import")

    # Include the preceding newline in these anchors so indentation is matched
    # exactly. Without it, the 6-space full-payment anchor is also a substring
    # of the 8-space split-payment line and produces a false duplicate count.
    response_anchor = "\n        if (response.redirectUrl) { window.location.assign(response.redirectUrl); return }\n"
    lightbox_check = "\n        // PMD_VR_LIGHTBOX_RUNTIME_R1_4\n        if (await launchVrPaymentLightbox(response)) { setMessage('VR Payment opened securely.'); return }\n        if (response.redirectUrl) { window.location.assign(response.redirectUrl); return }\n"
    count = text.count(response_anchor)
    if count != 1:
        fail(f"RuntimeOverlays split redirect anchor expected once, found {count}")
    text = text.replace(response_anchor, lightbox_check, 1)

    full_anchor = "\n      if (response.redirectUrl) { window.location.assign(response.redirectUrl); return }\n"
    full_replacement = "\n      if (await launchVrPaymentLightbox(response)) { setMessage('VR Payment opened securely.'); return }\n      if (response.redirectUrl) { window.location.assign(response.redirectUrl); return }\n"
    count = text.count(full_anchor)
    if count != 1:
        fail(f"RuntimeOverlays full redirect anchor expected once, found {count}")
    text = text.replace(full_anchor, full_replacement, 1)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 5:
        fail("usage: patch-pmd-vr-embedded-wallets-r1-4.py <VrPaymentApiClient.php> <VRPaymentGatewayService.php> <client-api.ts> <RuntimeOverlays.tsx>")

    paths = [Path(value).resolve() for value in sys.argv[1:]]
    for path in paths:
        if not path.is_file():
            fail("target not found: " + str(path))

    patch_api_client(paths[0])
    patch_gateway_service(paths[1])
    patch_frontend_client(paths[2])
    patch_runtime_overlays(paths[3])

    markers = [MARKER_CLIENT, MARKER_SERVICE, MARKER_V2_CLIENT, MARKER_V2_RUNTIME]
    for marker, path in zip(markers, paths):
        if marker not in path.read_text(encoding="utf-8"):
            fail("marker missing after patch: " + marker)

    print("PMD_VR_LIGHTBOX_API_R1_4=OK")
    print("PMD_VR_LIGHTBOX_CHECKOUT_R1_4=OK")
    print("PMD_VR_LIGHTBOX_CLIENT_R1_4=OK")
    print("PMD_VR_LIGHTBOX_RUNTIME_R1_4=OK")


if __name__ == "__main__":
    main()
