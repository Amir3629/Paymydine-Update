#!/usr/bin/env python3
"""PMD_CANONICAL_PROVIDER_SETTLEMENT_GROUP_IDEMPOTENCY_PATCH_R11

A single verified provider charge may settle multiple PMD orders. Its provider
transaction reference is therefore shared, while each order gets its own canonical
transaction/idempotency key. Scope the legacy provider-reference fallback by
order_id so the second order is not mistaken for a duplicate of the first.
"""
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
path = root / 'app/Services/Payments/CanonicalProviderSettlementService.php'
text = path.read_text()
marker = 'PMD_CANONICAL_PROVIDER_GROUP_IDEMPOTENCY_R11'
if marker in text:
    print('Canonical provider settlement group idempotency patch already present')
    raise SystemExit(0)

old_call = "$existing = $this->existingTransaction($idempotencyKey, $provider, $reference);"
new_call = "$existing = $this->existingTransaction($orderId, $idempotencyKey, $provider, $reference);"
if old_call not in text:
    raise SystemExit('STOP: canonical settlement existingTransaction call anchor missing')
text = text.replace(old_call, new_call, 1)

old_sig = "    private function existingTransaction(string $idempotencyKey, string $provider, string $reference): ?object\n    {"
new_sig = "    // PMD_CANONICAL_PROVIDER_GROUP_IDEMPOTENCY_R11\n    private function existingTransaction(int $orderId, string $idempotencyKey, string $provider, string $reference): ?object\n    {"
if old_sig not in text:
    raise SystemExit('STOP: canonical settlement existingTransaction signature anchor missing')
text = text.replace(old_sig, new_sig, 1)

old_fallback = "        $query->where('payment_reference', $reference);\n        if (Schema::hasColumn('order_payment_transactions', 'provider_code')) $query->where('provider_code', $provider);"
new_fallback = "        $query->where('order_id', $orderId)->where('payment_reference', $reference);\n        if (Schema::hasColumn('order_payment_transactions', 'provider_code')) $query->where('provider_code', $provider);"
if old_fallback not in text:
    raise SystemExit('STOP: canonical settlement provider-reference fallback anchor missing')
text = text.replace(old_fallback, new_fallback, 1)

path.write_text(text)
print('Canonical provider settlement group idempotency R11 patch: OK')
