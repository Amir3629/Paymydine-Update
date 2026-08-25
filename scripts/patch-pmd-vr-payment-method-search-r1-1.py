#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER = "PMD_VR_PAYMENT_METHOD_SEARCH_R1_1"


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: patch-pmd-vr-payment-method-search-r1-1.py <VrPaymentApiClient.php>")

    path = Path(sys.argv[1]).resolve()
    if not path.is_file():
        fail(f"target not found: {path}")

    text = path.read_text(encoding="utf-8")

    if MARKER in text:
        print(f"ALREADY_PATCHED={path}")
        return

    old_method = """    public function paymentMethodConfigurations(): array\n    {\n        return $this->request('GET', '/api/v2.0/payment/method-configurations/search', [\n            'limit' => 100,\n            'order' => 'id ASC',\n        ]);\n    }\n"""

    new_method = """    public function paymentMethodConfigurations(): array\n    {\n        // PMD_VR_PAYMENT_METHOD_SEARCH_R1_1\n        // VR Payment search endpoints use a field-aware `order` grammar.\n        // Discovery does not require sorting, so omit `order` entirely instead\n        // of sending the invalid `id ASC` expression.\n        return $this->request('GET', '/api/v2.0/payment/method-configurations/search', [\n            'limit' => 100,\n        ]);\n    }\n"""

    if old_method not in text:
        fail("paymentMethodConfigurations R1 block not found")

    text = text.replace(old_method, new_method, 1)

    old_message = "                'message' => 'VR Payment credentials could not access the configured Space.',\n"
    new_message = "                'message' => (string)($methods['message'] ?? 'VR Payment credentials could not access the configured Space.'),\n"
    if old_message not in text:
        fail("connectionAudit generic-message block not found")
    text = text.replace(old_message, new_message, 1)

    if MARKER not in text:
        fail("patch marker missing after replacement")

    path.write_text(text, encoding="utf-8")
    print(f"PATCHED={path}")
    print("PMD_VR_PAYMENT_METHOD_SEARCH_R1_1=OK")


if __name__ == "__main__":
    main()
