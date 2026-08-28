#!/usr/bin/env python3
"""PMD_CANONICAL_PROVIDER_SETTLEMENT_GROUP_IDEMPOTENCY_PATCH_R11

Hardens the shared verified-provider settlement authority for:
1) one provider charge settling multiple PMD orders; and
2) concurrent duplicate callbacks racing before the order lock is acquired.

The patch is additive/idempotent and operates on the current live file so work
from another branch/chat is not replaced by a stale snapshot.
"""
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
path = root / 'app/Services/Payments/CanonicalProviderSettlementService.php'
text = path.read_text()
group_marker = 'PMD_CANONICAL_PROVIDER_GROUP_IDEMPOTENCY_R11'
race_marker = 'PMD_CANONICAL_PROVIDER_RACE_RECHECK_R11'

if group_marker not in text:
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

if race_marker not in text:
    lock_anchor = "            $order = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();\n            if (!$order) throw new \\RuntimeException('Canonical order was not found.');"
    lock_replacement = """            $order = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
            if (!$order) throw new \\RuntimeException('Canonical order was not found.');

            // PMD_CANONICAL_PROVIDER_RACE_RECHECK_R11
            // Another identical verified callback may have inserted its transaction
            // while this transaction was waiting for the order lock. Re-check now.
            $raceExisting = $this->existingTransaction($orderId, $idempotencyKey, $provider, $reference);
            if ($raceExisting) {
                $freshOrder = DB::table('orders')->where('order_id', $orderId)->first();
                return $this->resultFromOrder($freshOrder, (int)$raceExisting->id, true, $payableAmount);
            }"""
    if lock_anchor not in text:
        raise SystemExit('STOP: canonical settlement order-lock anchor missing')
    text = text.replace(lock_anchor, lock_replacement, 1)

if group_marker not in text or race_marker not in text:
    raise SystemExit('STOP: canonical settlement idempotency markers missing after patch')

path.write_text(text)
print('Canonical provider settlement group + race idempotency R11 patch: OK')
