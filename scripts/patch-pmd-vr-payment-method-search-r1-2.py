#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MARKER = "PMD_VR_PAYMENT_METHOD_SEARCH_R1_2"


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: patch-pmd-vr-payment-method-search-r1-2.py <VrPaymentApiClient.php>")

    path = Path(sys.argv[1]).resolve()
    if not path.is_file():
        fail(f"target not found: {path}")

    text = path.read_text(encoding="utf-8")

    method_start = text.find("    public function paymentMethodConfigurations(): array")
    next_start = text.find("    public function availablePaymentMethodConfigurations", method_start)
    if method_start < 0 or next_start < 0:
        fail("paymentMethodConfigurations region not found")

    block = text[method_start:next_start]
    if "/api/v2.0/payment/method-configurations/search" not in block:
        fail("payment method search endpoint not found in target function")

    # Remove any order argument only from paymentMethodConfigurations().
    # Live authorities can differ in formatting, so do not depend on one exact R1 block.
    patched_block, removed = re.subn(
        r"^\s*['\"]order['\"]\s*=>\s*[^\n]+\n",
        "",
        block,
        flags=re.MULTILINE,
    )

    if "'order'" in patched_block or '"order"' in patched_block:
        fail("an order argument still exists inside paymentMethodConfigurations")

    if MARKER not in patched_block:
        brace = patched_block.find("{\n")
        if brace < 0:
            fail("function opening brace not found")
        insertion = (
            "{\n"
            "        // PMD_VR_PAYMENT_METHOD_SEARCH_R1_2\n"
            "        // VR discovery needs no sorting. Omit `order` so the Gateway\n"
            "        // cannot reject an unsupported ordering expression.\n"
        )
        patched_block = patched_block[:brace] + insertion + patched_block[brace + 2:]

    text = text[:method_start] + patched_block + text[next_start:]

    # Surface the provider's safe error message when available. Make this idempotent.
    generic = "                'message' => 'VR Payment credentials could not access the configured Space.',\n"
    provider_message = "                'message' => (string)($methods['message'] ?? 'VR Payment credentials could not access the configured Space.'),\n"
    if generic in text:
        text = text.replace(generic, provider_message, 1)
    elif provider_message not in text:
        fail("connectionAudit message authority not found")

    if MARKER not in text:
        fail("R1.2 marker missing after patch")

    path.write_text(text, encoding="utf-8")

    print(f"PATCHED={path}")
    print(f"ORDER_LINES_REMOVED={removed}")
    print("PMD_VR_PAYMENT_METHOD_SEARCH_R1_2=OK")


if __name__ == "__main__":
    main()
