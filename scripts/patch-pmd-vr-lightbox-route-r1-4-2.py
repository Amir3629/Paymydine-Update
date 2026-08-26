#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER_ROUTE_VALIDATION = "PMD_VR_CREATE_SESSION_VALIDATION_R1_4_2"
MARKER_ROUTE_FORWARD = "PMD_VR_LIGHTBOX_ROUTE_FORWARD_R1_4_2"
MARKER_SERVICE = "PMD_VR_LIGHTBOX_METHOD_ID_MATCH_R1_4_2"
MARKER_UI = "PMD_VR_PROVIDER_RUNTIME_GUIDE_R1_4_2"


def fail(message: str) -> None:
    raise SystemExit("ERROR: " + message)


def patch_route(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_ROUTE_FORWARD in text and MARKER_ROUTE_VALIDATION in text:
        return

    route_start = text.find("$registerVRPaymentSessionRoute = function")
    route_end = text.find("$registerVRPaymentSessionRoute('card'", route_start)
    if route_start < 0 or route_end < 0:
        fail("VR Payment generic create-session route block not found")

    segment = text[route_start:route_end]

    validate_start = segment.find("            $payload = $request->validate([")
    if validate_start < 0:
        fail("VR Payment create-session validator start not found")
    validate_end = segment.find("            ]);", validate_start)
    if validate_end < 0:
        fail("VR Payment create-session validator end not found")
    validate_end += len("            ]);")

    validator = r'''            // PMD_VR_CREATE_SESSION_VALIDATION_R1_4_2
            // Frontend V2 owns the checkout URLs. Validate the transport payload
            // without Laravel's stricter URL rule rejecting otherwise valid encoded
            // return URLs; then enforce http/https + host explicitly below.
            $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                'amount' => 'required|numeric|min:0.01',
                'currency' => 'required|string|size:3',
                'return_url' => 'required|string|max:2048',
                'cancel_url' => 'nullable|string|max:2048',
                'locale' => 'nullable|string|max:10',
                'country_code' => 'nullable|string|max:3',
                'merchant_customer_id' => 'nullable|string|max:120',
                'merchant_reference' => 'nullable|string|max:191',
                'items' => 'nullable|array',
                'integration_preference' => 'nullable|string|in:lightbox,embedded,payment_page',
                'order_id' => 'nullable|integer|min:1',
                'guest_session_id' => 'nullable|string|max:191',
                'payment_intent_token' => 'nullable|string|max:191',
                'selected_items' => 'nullable|array',
                'payer_label' => 'nullable|string|max:191',
                'tip_amount' => 'nullable|numeric|min:0',
                'coupon_code' => 'nullable|string|max:191',
                'coupon_discount' => 'nullable|numeric|min:0',
                'table_id' => 'nullable',
                'table_no' => 'nullable',
                'qr' => 'nullable|string|max:191',
                'provider' => 'nullable|string|max:64',
                'payment_method' => 'nullable|string|max:64',
            ]);
            if ($validator->fails()) {
                $validationErrors = $validator->errors()->toArray();
                \Illuminate\Support\Facades\Log::warning('VR_PAYMENT_CREATE_SESSION_VALIDATION_FAILED_R1_4_2', [
                    'host' => request()->getHost(),
                    'method' => $methodCode,
                    'errors' => $validationErrors,
                    'received_keys' => array_values(array_keys($request->all())),
                ]);
                return response()->json([
                    'success' => false,
                    'provider' => 'vr_payment',
                    'method' => $methodCode,
                    'business_error' => true,
                    'error_code' => 'vr_payment_request_invalid',
                    'error' => 'VR Payment checkout request is invalid.',
                    'diagnostic_stage' => 'request_validation',
                    'validation_errors' => $validationErrors,
                ], 422);
            }
            $payload = $validator->validated();
            $payload['return_url'] = trim((string)$payload['return_url']);
            $payload['cancel_url'] = trim((string)($payload['cancel_url'] ?? '')) ?: $payload['return_url'];
            foreach (['return_url', 'cancel_url'] as $urlField) {
                $urlValue = (string)$payload[$urlField];
                $parts = parse_url($urlValue);
                $scheme = strtolower((string)($parts['scheme'] ?? ''));
                $host = trim((string)($parts['host'] ?? ''));
                if (!is_array($parts) || !in_array($scheme, ['http', 'https'], true) || $host === '') {
                    \Illuminate\Support\Facades\Log::warning('VR_PAYMENT_CREATE_SESSION_VALIDATION_FAILED_R1_4_2', [
                        'host' => request()->getHost(),
                        'method' => $methodCode,
                        'url_field' => $urlField,
                        'reason' => 'invalid_http_url',
                    ]);
                    return response()->json([
                        'success' => false,
                        'provider' => 'vr_payment',
                        'method' => $methodCode,
                        'business_error' => true,
                        'error_code' => 'vr_payment_return_url_invalid',
                        'error' => 'VR Payment return URL is invalid.',
                        'diagnostic_stage' => 'request_validation',
                        'validation_errors' => [$urlField => ['A valid HTTP(S) URL is required.']],
                    ], 422);
                }
            }'''

    segment = segment[:validate_start] + validator + segment[validate_end:]

    service_anchor = "            $service = app(\\Admin\\Classes\\VRPaymentGatewayService::class);\n"
    if service_anchor not in segment:
        fail("VR Payment service call anchor not found")
    service_prefix = r'''            \Illuminate\Support\Facades\Log::info('VR_PAYMENT_CREATE_SESSION_REQUEST_R1_4_2', [
                'host' => request()->getHost(),
                'method' => $methodCode,
                'integration_preference' => (string)($payload['integration_preference'] ?? 'payment_page'),
                'amount' => (float)$payload['amount'],
                'currency' => strtoupper((string)$payload['currency']),
                'return_host' => (string)(parse_url((string)$payload['return_url'], PHP_URL_HOST) ?: ''),
                'cancel_host' => (string)(parse_url((string)$payload['cancel_url'], PHP_URL_HOST) ?: ''),
            ]);
            $service = app(\Admin\Classes\VRPaymentGatewayService::class);
'''
    segment = segment.replace(service_anchor, service_prefix, 1)

    payload_anchor = "                'merchant_reference' => (string)($payload['merchant_reference'] ?? ''),\n                'items' => (array)($payload['items'] ?? []),\n"
    if payload_anchor not in segment:
        fail("VR Payment service payload anchor not found")
    payload_replacement = "                'merchant_reference' => (string)($payload['merchant_reference'] ?? ''),\n                'integration_preference' => (string)($payload['integration_preference'] ?? 'payment_page'), // PMD_VR_LIGHTBOX_ROUTE_FORWARD_R1_4_2\n                'order_id' => isset($payload['order_id']) ? (int)$payload['order_id'] : null,\n                'items' => (array)($payload['items'] ?? []),\n"
    segment = segment.replace(payload_anchor, payload_replacement, 1)

    failure_anchor = "                return response()->json($result, 422);\n"
    if failure_anchor not in segment:
        fail("VR Payment service failure response anchor not found")
    failure_replacement = r'''                $result['diagnostic_stage'] = $result['diagnostic_stage'] ?? 'vr_service';
                \Illuminate\Support\Facades\Log::warning('VR_PAYMENT_CREATE_SESSION_SERVICE_FAILED_R1_4_2', [
                    'host' => request()->getHost(),
                    'method' => $methodCode,
                    'integration_preference' => (string)($payload['integration_preference'] ?? 'payment_page'),
                    'error_code' => $result['error_code'] ?? null,
                    'error' => $result['error'] ?? $result['message'] ?? null,
                    'provider_http_status' => $result['provider_http_status'] ?? null,
                    'transaction_id' => $result['transaction_id'] ?? null,
                ]);
                return response()->json($result, 422);
'''
    segment = segment.replace(failure_anchor, failure_replacement, 1)

    text = text[:route_start] + segment + text[route_end:]
    path.write_text(text, encoding="utf-8")


def patch_service(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_SERVICE in text:
        return
    if "PMD_VR_LIGHTBOX_CHECKOUT_R1_4" not in text:
        fail("R1.4 Lightbox service marker missing")
    if "PMD_VR_LIGHTBOX_METHOD_MATCH_R1_4_1" not in text:
        fail("R1.4.1 exact method marker missing")

    old = r'''                    // PMD_VR_LIGHTBOX_METHOD_MATCH_R1_4_1
                    // A transaction may expose several Lightbox configurations. The
                    // selected PMD method must match the VR method code as well as the
                    // tenant-scoped allow-list; never let Wero pick Card or vice versa.
                    if (
                        $candidateCode === $method
                        && (!$allowedIds || in_array($candidateId, $allowedIds, true))
                    ) {
'''
    new = r'''                    // PMD_VR_LIGHTBOX_METHOD_ID_MATCH_R1_4_2
                    // allowedIds was built only from the selected PMD method before the
                    // transaction was created. Some transaction-scoped VR responses do
                    // not expand paymentMethod names, so their candidateCode can be empty.
                    // In that case the selected-method ID allow-list is the authoritative
                    // and still exact match. Only fall back to code matching if no IDs exist.
                    $candidateMatchesSelectedMethod = $allowedIds
                        ? in_array($candidateId, $allowedIds, true)
                        : $candidateCode === $method;
                    if ($candidateMatchesSelectedMethod) {
'''
    if old not in text:
        fail("R1.4.1 exact Lightbox method block not found")
    text = text.replace(old, new, 1)

    rows_anchor = "                $rows = $client->normalizeMethodConfigurations((array)($available['data'] ?? []));\n                foreach ($rows as $row) {\n"
    if rows_anchor in text:
        rows_replacement = "                $rows = $client->normalizeMethodConfigurations((array)($available['data'] ?? []));\n                $lightboxCandidates = array_map(static fn (array $row): array => [\n                    'id' => (int)($row['id'] ?? 0),\n                    'code' => (string)($row['pmd_method_code'] ?? ''),\n                    'active' => (bool)($row['active'] ?? true),\n                ], $rows);\n                foreach ($rows as $row) {\n"
        text = text.replace(rows_anchor, rows_replacement, 1)
    else:
        # Newer live authority may already define diagnostics; keep it if present.
        if "$lightboxCandidates" not in text:
            fail("Lightbox candidate rows anchor not found")

    fallback_anchor = "                'lightbox_configuration_found' => $lightboxMethodId !== null,\n"
    if fallback_anchor in text and "'allowed_method_ids' => $allowedIds" not in text:
        fallback_replacement = "                'lightbox_configuration_found' => $lightboxMethodId !== null,\n                'available_http_status' => $available['status'] ?? null,\n                'allowed_method_ids' => $allowedIds,\n                'lightbox_candidates' => $lightboxCandidates ?? [],\n"
        text = text.replace(fallback_anchor, fallback_replacement, 1)

    path.write_text(text, encoding="utf-8")


def patch_ui(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_UI in text:
        return

    anchor = "        <div class=\"pmd-inline-note\">Credentials are sent only to the existing <strong>Payments</strong> backend. Blank secret fields keep the current stored secret.</div>\n"
    if anchor not in text:
        fail("VR provider inline guide anchor not found")
    block = r'''        @if($code === 'vr_payment')
            {{-- PMD_VR_PROVIDER_RUNTIME_GUIDE_R1_4_2 --}}
            <div class="pmd-inline-note" style="margin-top:12px">
                <strong>VR Payment runtime guide</strong><br>
                Guest checkout: Frontend V2 requests <strong>Lightbox</strong>. Hosted Payment Page is only the safe fallback when VR Payment does not expose a usable Lightbox configuration for the selected transaction/method.<br><br>
                Terminal test: open VR Payment <strong>Space → Payment → Terminals</strong>, provision/link a real or provider-issued test terminal, then run <strong>Test saved connection</strong> here. PayMyDine will not offer a terminal payment test until <code>terminal_count ≥ 1</code>.<br><br>
                Apple Pay / Google Pay: disabled means the current VR Space did not expose that wallet. Configure/activate the wallet with VR Payment first, then run <strong>Test saved connection</strong>. PayMyDine intentionally does not fake-enable unavailable wallets.
            </div>
        @endif
'''
    text = text.replace(anchor, anchor + block, 1)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 4:
        fail("usage: patch-pmd-vr-lightbox-route-r1-4-2.py <routes/admin-app-before.php> <VRPaymentGatewayService.php> <_inline_provider_form_v1.blade.php>")

    route = Path(sys.argv[1]).resolve()
    service = Path(sys.argv[2]).resolve()
    ui = Path(sys.argv[3]).resolve()
    for path in [route, service, ui]:
        if not path.is_file():
            fail("target not found: " + str(path))

    patch_route(route)
    patch_service(service)
    patch_ui(ui)

    for marker, path in [
        (MARKER_ROUTE_VALIDATION, route),
        (MARKER_ROUTE_FORWARD, route),
        (MARKER_SERVICE, service),
        (MARKER_UI, ui),
    ]:
        if marker not in path.read_text(encoding="utf-8"):
            fail("marker missing after patch: " + marker)

    print("PMD_VR_CREATE_SESSION_VALIDATION_R1_4_2=OK")
    print("PMD_VR_LIGHTBOX_ROUTE_FORWARD_R1_4_2=OK")
    print("PMD_VR_LIGHTBOX_METHOD_ID_MATCH_R1_4_2=OK")
    print("PMD_VR_PROVIDER_RUNTIME_GUIDE_R1_4_2=OK")


if __name__ == "__main__":
    main()
