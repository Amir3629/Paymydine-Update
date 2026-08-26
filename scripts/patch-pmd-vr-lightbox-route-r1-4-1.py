#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER_ROUTE = "PMD_VR_LIGHTBOX_ROUTE_BRIDGE_R1_4_1"
MARKER_SERVICE = "PMD_VR_LIGHTBOX_METHOD_MATCH_R1_4_1"
MARKER_ADMIN = "PMD_VR_LIGHTBOX_ADMIN_TRUTH_R1_4_1"
MARKER_VIEW = "PMD_VR_METHOD_RUNTIME_TRUTH_UI_R1_4_1"


def fail(message: str) -> None:
    raise SystemExit("ERROR: " + message)


def patch_route(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_ROUTE in text:
        return

    route_start = text.find("$registerVRPaymentSessionRoute = function")
    if route_start < 0:
        fail("VR Payment session route registration not found")

    validate_start = text.find("$payload = $request->validate([", route_start)
    if validate_start < 0:
        fail("VR Payment create-session validation block not found")

    validate_end = text.find("            ]);", validate_start)
    if validate_end < 0:
        fail("VR Payment create-session validation block end not found")

    block = text[validate_start:validate_end]
    if "integration_preference" not in block:
        insertion = (
            "                'integration_preference' => 'nullable|string|in:lightbox,embedded,payment_page', "
            "// PMD_VR_LIGHTBOX_ROUTE_BRIDGE_R1_4_1\n"
        )
        text = text[:validate_end] + insertion + text[validate_end:]
    else:
        # Keep an explicit marker if a newer baseline already validates the field.
        line_end = text.find("\n", text.find("integration_preference", validate_start))
        if line_end < 0:
            fail("integration_preference validation line is malformed")
        text = text[:line_end] + " // " + MARKER_ROUTE + text[line_end:]

    post_block = text[validate_start:text.find("});", validate_start)]
    if "integration_preference" not in post_block:
        fail("integration_preference did not remain inside VR create-session route")

    path.write_text(text, encoding="utf-8")


def patch_service(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_SERVICE in text:
        return
    if "PMD_VR_LIGHTBOX_CHECKOUT_R1_4" not in text:
        fail("R1.4 Lightbox service marker missing")

    old = """                    if (\n                        ($allowedIds && in_array($candidateId, $allowedIds, true))\n                        || (!$allowedIds && $candidateCode === $method)\n                    ) {\n"""
    new = """                    // PMD_VR_LIGHTBOX_METHOD_MATCH_R1_4_1\n                    // A transaction may expose several Lightbox configurations. The\n                    // selected PMD method must match the VR method code as well as the\n                    // tenant-scoped allow-list; never let Wero pick Card or vice versa.\n                    if (\n                        $candidateCode === $method\n                        && (!$allowedIds || in_array($candidateId, $allowedIds, true))\n                    ) {\n"""
    if old not in text:
        fail("R1.4 Lightbox method-selection anchor not found")
    text = text.replace(old, new, 1)

    fallback_anchor = """            PaymentLogger::info('VR_PAYMENT_LIGHTBOX_FALLBACK', [\n                'provider' => 'vr_payment',\n                'payment_method' => $method,\n"""
    fallback_new = """            PaymentLogger::info('VR_PAYMENT_LIGHTBOX_FALLBACK', [\n                'provider' => 'vr_payment',\n                'payment_method' => $method,\n                'requested_integration' => $requestedIntegration,\n"""
    if fallback_anchor in text:
        text = text.replace(fallback_anchor, fallback_new, 1)

    path.write_text(text, encoding="utf-8")


def patch_admin(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_ADMIN in text:
        return

    old = """                'preferred_integration_mode' => ['label' => 'Preferred Integration', 'type' => 'select', 'default' => 'payment_page', 'options' => ['payment_page' => 'Hosted Payment Page']],\n                'api_endpoint' => ['label' => 'Terminal API Endpoint'],\n                'merchant_id' => ['label' => 'Terminal Merchant ID'],\n                'terminal_id' => ['label' => 'Terminal Device ID'],\n"""
    new = """                // PMD_VR_LIGHTBOX_ADMIN_TRUTH_R1_4_1\n                'preferred_integration_mode' => [\n                    'label' => 'Default / legacy integration',\n                    'type' => 'select',\n                    'default' => 'lightbox',\n                    'options' => [\n                        'lightbox' => 'Lightbox (embedded overlay)',\n                        'payment_page' => 'Hosted Payment Page',\n                    ],\n                    'help' => 'PayMyDine Frontend V2 requests Lightbox per transaction. Hosted Payment Page remains the safe fallback when VR Payment does not expose a Lightbox configuration for that transaction/method.',\n                ],\n                'api_endpoint' => [\n                    'label' => 'Terminal API Endpoint (legacy / optional)',\n                    'help' => 'Leave blank for the canonical VR Payment Cloud Till flow. PMD uses the same VR Web Service API and Space credentials to discover terminals.',\n                ],\n                'merchant_id' => [\n                    'label' => 'Terminal Merchant ID (legacy / optional)',\n                    'help' => 'Not required by the canonical Space-scoped Cloud Till API. Keep only if VR Payment support gives you a separate merchant identifier for a certified terminal setup.',\n                ],\n                'terminal_id' => [\n                    'label' => 'Terminal ID override (optional)',\n                    'help' => 'First provision/link a terminal under VR Payment Space > Payment > Terminals. If Test saved connection reports terminal_count=0, there is no terminal device available for PMD to test yet.',\n                ],\n"""
    if old not in text:
        fail("Pmdfinance VR provider field anchor not found")
    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")


def patch_view(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_VIEW in text:
        return

    old = """                                <div><strong>{{ $method->name ?: ucfirst(str_replace('_',' ',(string)$method->code)) }}</strong><small>{{ $method->description ?: strtoupper((string)$method->code) }}</small></div>\n"""
    new = """                                {{-- PMD_VR_METHOD_RUNTIME_TRUTH_UI_R1_4_1 --}}\n                                @php\n                                    $methodCode = strtolower((string)$method->code);\n                                    $methodProvider = strtolower((string)($method->provider_code ?: ''));\n                                    $methodHint = $method->description ?: strtoupper((string)$method->code);\n                                    if ($methodProvider === 'vr_payment') {\n                                        if (in_array($methodCode, ['apple_pay', 'google_pay'], true)) {\n                                            $methodHint = !empty($method->status)\n                                                ? 'VR Payment wallet available in this Space.'\n                                                : 'Unavailable in the current VR Payment Space. Activate/configure this wallet with VR Payment first; PMD will not fake-enable it.';\n                                        } elseif ($methodCode === 'card') {\n                                            $methodHint = 'VR Payment card checkout — Lightbox first, hosted page only as a provider fallback.';\n                                        } elseif ($methodCode === 'wero') {\n                                            $methodHint = 'VR Payment Wero checkout — Lightbox first, hosted page only as a provider fallback.';\n                                        }\n                                    }\n                                @endphp\n                                <div><strong>{{ $method->name ?: ucfirst(str_replace('_',' ',(string)$method->code)) }}</strong><small>{{ $methodHint }}</small></div>\n"""
    if old not in text:
        fail("Pmdfinance payment-method description anchor not found")
    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 5:
        fail("usage: patch-pmd-vr-lightbox-route-r1-4-1.py <routes/admin-app-before.php> <VRPaymentGatewayService.php> <Pmdfinance.php> <pmdfinance/index.blade.php>")

    paths = [Path(value).resolve() for value in sys.argv[1:]]
    for path in paths:
        if not path.is_file():
            fail("target not found: " + str(path))

    patch_route(paths[0])
    patch_service(paths[1])
    patch_admin(paths[2])
    patch_view(paths[3])

    checks = [
        (MARKER_ROUTE, paths[0]),
        (MARKER_SERVICE, paths[1]),
        (MARKER_ADMIN, paths[2]),
        (MARKER_VIEW, paths[3]),
    ]
    for marker, path in checks:
        if marker not in path.read_text(encoding="utf-8"):
            fail("marker missing after patch: " + marker)

    print("PMD_VR_LIGHTBOX_ROUTE_BRIDGE_R1_4_1=OK")
    print("PMD_VR_LIGHTBOX_METHOD_MATCH_R1_4_1=OK")
    print("PMD_VR_LIGHTBOX_ADMIN_TRUTH_R1_4_1=OK")
    print("PMD_VR_METHOD_RUNTIME_TRUTH_UI_R1_4_1=OK")


if __name__ == "__main__":
    main()
