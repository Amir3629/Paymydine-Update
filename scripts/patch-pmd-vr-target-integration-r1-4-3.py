#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER_CLIENT = "PMD_VR_AVAILABLE_METHOD_EXPAND_R1_4_3"
MARKER_TARGET = "PMD_VR_TARGET_MODE_SELECTION_R1_4_3"
MARKER_IDS = "PMD_VR_CONFIG_ID_INTERSECTION_R1_4_3"
MARKER_NO_REDIRECT = "PMD_VR_LIGHTBOX_NO_REDIRECT_R1_4_3"


def fail(message: str) -> None:
    raise SystemExit("ERROR: " + message)


def patch_client(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_CLIENT in text:
        return

    old = """    public function availablePaymentMethodConfigurations(int $transactionId, string $integrationMode = 'payment_page'): array\n    {\n        return $this->request(\n            'GET',\n            '/api/v2.0/payment/transactions/'.$transactionId.'/payment-method-configurations',\n            ['integrationMode' => $integrationMode]\n        );\n    }\n"""
    new = """    public function availablePaymentMethodConfigurations(int $transactionId, string $integrationMode = 'payment_page'): array\n    {\n        return $this->request(\n            'GET',\n            '/api/v2.0/payment/transactions/'.$transactionId.'/payment-method-configurations',\n            [\n                'integrationMode' => $integrationMode,\n                'expand' => 'paymentMethod', // PMD_VR_AVAILABLE_METHOD_EXPAND_R1_4_3\n            ]\n        );\n    }\n"""
    if old not in text:
        fail("availablePaymentMethodConfigurations block not found")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def patch_service(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_TARGET in text and MARKER_IDS in text and MARKER_NO_REDIRECT in text:
        return
    if "PMD_VR_LIGHTBOX_CHECKOUT_R1_4" not in text:
        fail("R1.4 Lightbox service marker missing")
    if "PMD_VR_LIGHTBOX_METHOD_ID_MATCH_R1_4_2" not in text:
        fail("R1.4.2 method-id marker missing")

    start = text.find("        $possible = $client->availablePaymentMethodConfigurations($transactionId, 'payment_page');")
    end = text.find("        $version = (int)($transaction['version'] ?? 0);", start)
    if start < 0 or end < 0:
        fail("R1.4.2 transaction method gate block not found")

    replacement = r'''        // PMD_VR_TARGET_MODE_SELECTION_R1_4_3
        // VR's possible-method endpoint is integration-mode specific. Frontend V2
        // asks for Lightbox, so do not gate it through PAYMENT_PAGE first.
        $requestedIntegration = strtolower(trim((string)(
            $payload['integration_preference']
            ?? $payload['integration_mode']
            ?? $payload['checkout_flow']
            ?? ''
        )));
        $targetIntegrationMode = in_array($requestedIntegration, ['lightbox', 'embedded'], true)
            ? 'lightbox'
            : 'payment_page';

        // PMD_VR_CONFIG_ID_INTERSECTION_R1_4_3
        // The tenant catalogue is the authority for mapping PMD method -> VR method
        // configuration ID. Transaction-scoped responses are then used only to decide
        // which of those IDs are possible for THIS transaction + integration mode.
        // This avoids the R1.4.2 false negative when transaction rows do not expand a
        // payment-method name even though the configuration ID is valid.
        $catalogue = $client->paymentMethodConfigurations();
        if (!($catalogue['ok'] ?? false)) {
            return $this->businessError(
                'vr_payment_method_catalogue_failed',
                $catalogue['message'] ?? 'VR Payment could not read the payment method catalogue.',
                ['provider_http_status' => $catalogue['status'] ?? null, 'transaction_id' => $transactionId]
            );
        }
        $catalogueRows = $client->normalizeMethodConfigurations((array)($catalogue['data'] ?? []));
        $configuredMethodIds = [];
        foreach ($catalogueRows as $row) {
            if (
                ($row['pmd_method_code'] ?? null) === $method
                && !empty($row['id'])
                && ($row['active'] ?? true)
            ) {
                $configuredMethodIds[] = (int)$row['id'];
            }
        }
        $configuredMethodIds = array_values(array_unique(array_filter($configuredMethodIds)));
        if (!$configuredMethodIds) {
            return $this->businessError(
                'vr_payment_method_not_configured',
                strtoupper(str_replace('_', ' ', $method)).' is not configured in this VR Payment Space.',
                ['transaction_id' => $transactionId, 'integration_mode' => $targetIntegrationMode]
            );
        }

        $possible = $client->availablePaymentMethodConfigurations($transactionId, $targetIntegrationMode);
        if (!($possible['ok'] ?? false)) {
            return $this->businessError(
                'vr_payment_method_discovery_failed',
                $possible['message'] ?? 'VR Payment could not list payment methods for this transaction.',
                [
                    'provider_http_status' => $possible['status'] ?? null,
                    'transaction_id' => $transactionId,
                    'integration_mode' => $targetIntegrationMode,
                ]
            );
        }
        $possibleRows = $client->normalizeMethodConfigurations((array)($possible['data'] ?? []));
        $possibleIds = [];
        foreach ($possibleRows as $row) {
            if (!empty($row['id']) && ($row['active'] ?? true)) {
                $possibleIds[] = (int)$row['id'];
            }
        }
        $possibleIds = array_values(array_unique(array_filter($possibleIds)));
        $allowedIds = array_values(array_intersect($configuredMethodIds, $possibleIds));
        if (!$allowedIds) {
            PaymentLogger::info('VR_PAYMENT_TARGET_MODE_UNAVAILABLE_R1_4_3', [
                'provider' => 'vr_payment',
                'payment_method' => $method,
                'transaction_id' => $transactionId,
                'integration_mode' => $targetIntegrationMode,
                'configured_method_ids' => $configuredMethodIds,
                'possible_method_ids' => $possibleIds,
                'possible_rows' => array_map(static fn (array $row): array => [
                    'id' => (int)($row['id'] ?? 0),
                    'code' => (string)($row['pmd_method_code'] ?? ''),
                    'name' => (string)($row['name'] ?? ''),
                    'active' => (bool)($row['active'] ?? true),
                ], $possibleRows),
            ]);
            return $this->businessError(
                'vr_payment_method_not_available_for_integration',
                strtoupper(str_replace('_', ' ', $method)).' is not available for this VR Payment '.strtoupper($targetIntegrationMode).' transaction.',
                [
                    'transaction_id' => $transactionId,
                    'integration_mode' => $targetIntegrationMode,
                    'configured_method_ids' => $configuredMethodIds,
                    'possible_method_ids' => $possibleIds,
                ]
            );
        }

'''
    text = text[:start] + replacement + text[end:]

    duplicate = r'''        $requestedIntegration = strtolower(trim((string)(
            $payload['integration_preference']
            ?? $payload['integration_mode']
            ?? $payload['checkout_flow']
            ?? ''
        )));
'''
    second = text.find(duplicate, text.find("PMD_VR_LIGHTBOX_CHECKOUT_R1_4"))
    if second >= 0:
        text = text[:second] + "        // R1.4.3: requestedIntegration was resolved before transaction method restriction.\n" + text[second + len(duplicate):]

    fallback_marker = """            PaymentLogger::info('VR_PAYMENT_LIGHTBOX_FALLBACK', [\n"""
    fallback_start = text.find(fallback_marker)
    if fallback_start < 0:
        fail("Lightbox fallback log not found")
    block_end = text.find("        }\n\n        $page = $client->paymentPageUrl($transactionId);", fallback_start)
    if block_end < 0:
        fail("Lightbox fallback block end not found")
    insert_at = block_end
    no_redirect = r'''            // PMD_VR_LIGHTBOX_NO_REDIRECT_R1_4_3
            // Frontend V2 explicitly requested an in-PayMyDine flow. Do not silently
            // navigate the guest to a hosted page when the provider cannot initialize
            // Lightbox. Legacy callers that request PAYMENT_PAGE still keep redirect.
            if (in_array($requestedIntegration, ['lightbox', 'embedded'], true)) {
                return $this->businessError(
                    'vr_payment_lightbox_not_available',
                    'VR Payment could not initialize Lightbox for the selected method.',
                    [
                        'transaction_id' => $transactionId,
                        'integration_mode' => 'lightbox',
                        'allowed_method_ids' => $allowedIds,
                        'lightbox_configuration_found' => $lightboxMethodId !== null,
                        'provider_http_status' => $available['status'] ?? null,
                    ]
                );
            }
'''
    text = text[:insert_at] + no_redirect + text[insert_at:]
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        fail("usage: patch-pmd-vr-target-integration-r1-4-3.py <VrPaymentApiClient.php> <VRPaymentGatewayService.php>")

    client = Path(sys.argv[1]).resolve()
    service = Path(sys.argv[2]).resolve()
    for path in [client, service]:
        if not path.is_file():
            fail("target not found: " + str(path))

    patch_client(client)
    patch_service(service)

    checks = [
        (MARKER_CLIENT, client),
        (MARKER_TARGET, service),
        (MARKER_IDS, service),
        (MARKER_NO_REDIRECT, service),
    ]
    for marker, path in checks:
        if marker not in path.read_text(encoding="utf-8"):
            fail("marker missing after patch: " + marker)

    print("PMD_VR_AVAILABLE_METHOD_EXPAND_R1_4_3=OK")
    print("PMD_VR_TARGET_MODE_SELECTION_R1_4_3=OK")
    print("PMD_VR_CONFIG_ID_INTERSECTION_R1_4_3=OK")
    print("PMD_VR_LIGHTBOX_NO_REDIRECT_R1_4_3=OK")


if __name__ == "__main__":
    main()
