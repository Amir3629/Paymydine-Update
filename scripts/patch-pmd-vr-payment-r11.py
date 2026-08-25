#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER = "PMD_VR_PAYMENT_R11_METHOD_DISCOVERY"

OLD = """    public function paymentMethodConfigurations(): array\n    {\n        return $this->request('GET', '/api/v2.0/payment/method-configurations/search', [\n            'limit' => 100,\n            'order' => 'id ASC',\n        ]);\n    }\n"""

NEW = """    public function paymentMethodConfigurations(): array\n    {\n        // PMD_VR_PAYMENT_R11_METHOD_DISCOVERY\n        // The VR Payment list endpoint accepts chronological order as an enum.\n        // The previous search request used `order=id ASC`, which the live API\n        // rejected with HTTP 400: `The field 'ASC' is invalid.`\n        // For readiness discovery we only need all configurations, not a\n        // field-sorted search, so use the documented list endpoint directly.\n        return $this->request('GET', '/api/v2.0/payment/method-configurations', [\n            'limit' => 100,\n            'order' => 'ASC',\n        ]);\n    }\n"""


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: patch-pmd-vr-payment-r11.py <VrPaymentApiClient.php>")

    path = Path(sys.argv[1]).resolve()
    if not path.is_file():
        fail(f"target not found: {path}")

    text = path.read_text(encoding="utf-8")

    if MARKER in text:
        print(f"ALREADY_PATCHED={path}")
        return

    if "class VrPaymentApiClient" not in text:
        fail("target is not VrPaymentApiClient.php")

    if OLD not in text:
        fail("expected R1 paymentMethodConfigurations block not found")

    backup = path.with_name(path.name + ".before-vr-r11")
    if not backup.exists():
        backup.write_text(text, encoding="utf-8")

    text = text.replace(OLD, NEW, 1)
    path.write_text(text, encoding="utf-8")

    print(f"PATCHED={path}")
    print(f"BACKUP={backup}")
    print("PMD_VR_PAYMENT_R11_METHOD_DISCOVERY=OK")


if __name__ == "__main__":
    main()
