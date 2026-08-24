#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MARKER = "PMD_PAYMENT_METHOD_BASELINE_R2"


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: patch-pmd-payment-method-baseline-r2.py <PmdTenantProductBaselineR1.php>")

    path = Path(sys.argv[1]).resolve()
    if not path.is_file():
        fail(f"target not found: {path}")

    text = path.read_text(encoding="utf-8")

    if MARKER in text:
        print(f"ALREADY_PATCHED={path}")
        return

    if "class PmdTenantProductBaselineR1" not in text:
        fail("target is not PmdTenantProductBaselineR1.php")

    original = text

    # Bump the baseline version without depending on one exact previous version.
    text, count = re.subn(
        r"public const VERSION = '[^']+';",
        "public const VERSION = '1.1.0';",
        text,
        count=1,
    )
    if count != 1:
        fail("VERSION marker not found")

    start = text.find("    protected function ensurePaymentCatalog(): array")
    end = text.find("    protected function paymentInsertPayload(", start)
    if start < 0 or end < 0:
        fail("ensurePaymentCatalog region not found")

    region = text[start:end]

    # New tenants must start with payment methods NOT OFFERED. A provider is only
    # assigned when the restaurant owner explicitly selects it.
    replacements = {
        "'card' => ['name' => 'Card', 'priority' => 10, 'provider_code' => 'stripe'],":
            "'card' => ['name' => 'Card', 'priority' => 10, 'provider_code' => null],",
        "'apple_pay' => ['name' => 'Apple Pay', 'priority' => 20, 'provider_code' => 'stripe'],":
            "'apple_pay' => ['name' => 'Apple Pay', 'priority' => 20, 'provider_code' => null],",
        "'google_pay' => ['name' => 'Google Pay', 'priority' => 30, 'provider_code' => 'stripe'],":
            "'google_pay' => ['name' => 'Google Pay', 'priority' => 30, 'provider_code' => null],",
        "'wero' => ['name' => 'Wero', 'priority' => 40, 'provider_code' => 'worldline'],":
            "'wero' => ['name' => 'Wero', 'priority' => 40, 'provider_code' => null],",
        "'paypal' => ['name' => 'PayPal', 'priority' => 50, 'provider_code' => 'paypal'],":
            "'paypal' => ['name' => 'PayPal', 'priority' => 50, 'provider_code' => null],",
    }

    for old, new in replacements.items():
        if old in region:
            region = region.replace(old, new, 1)
        elif new not in region:
            fail(f"method seed pattern not found: {old}")

    # SumUp R5 implements standalone Apple Pay and Google Pay in addition to card.
    old_sumup = "'sumup' => ['name' => 'SumUp', 'priority' => 140, 'supported_methods' => ['card']],"
    new_sumup = "'sumup' => ['name' => 'SumUp', 'priority' => 140, 'supported_methods' => ['card', 'apple_pay', 'google_pay']],"
    if old_sumup in region:
        region = region.replace(old_sumup, new_sumup, 1)
    elif new_sumup not in region:
        fail("SumUp supported_methods seed pattern not found")

    old_return = "        return ['table' => $table, 'created' => $created, 'created_count' => count($created), 'new_rows_enabled' => false];"
    if old_return not in region:
        fail("ensurePaymentCatalog return marker not found")

    reconciliation = r'''        // PMD_PAYMENT_METHOD_BASELINE_R2
        // Durable invariant for every tenant:
        // - freshly-created methods start as Not offered (provider=null, status=0);
        // - old baseline default mappings are removed while still disabled;
        // - an explicit non-default provider assignment may self-heal to enabled,
        //   but only when that provider record is enabled and PMD implements the
        //   method end-to-end. Unsupported flows are never auto-enabled.
        $legacySeedProviders = [
            'card' => 'stripe',
            'apple_pay' => 'stripe',
            'google_pay' => 'stripe',
            'wero' => 'worldline',
            'paypal' => 'paypal',
        ];
        $reconciled = [];
        $registry = app(\App\Services\Payments\ProviderCapabilityRegistry::class);

        foreach (array_keys($legacySeedProviders) as $code) {
            $row = $connection->table($table)->where('code', $code)->first();
            if (!$row) continue;

            $jsonColumn = in_array('meta', $columns, true)
                ? 'meta'
                : (in_array('data', $columns, true) ? 'data' : null);
            $payload = [];
            if ($jsonColumn && isset($row->{$jsonColumn})) {
                $raw = $row->{$jsonColumn};
                if (is_array($raw)) {
                    $payload = $raw;
                } elseif (is_string($raw) && trim($raw) !== '') {
                    $decoded = json_decode($raw, true);
                    if (is_array($decoded)) $payload = $decoded;
                }
            }

            $providerCode = '';
            if (in_array('provider_code', $columns, true)) {
                $providerCode = trim((string)($row->provider_code ?? ''));
            }
            if ($providerCode === '') {
                $providerCode = trim((string)($payload['provider_code'] ?? ''));
            }

            $status = (int)($row->status ?? 0);

            // A provider-backed method without a provider must never remain enabled.
            if ($providerCode === '') {
                if ($status !== 0 && in_array('status', $columns, true)) {
                    $update = ['status' => 0];
                    if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();
                    if (in_array('date_updated', $columns, true)) $update['date_updated'] = now();
                    $connection->table($table)->where('code', $code)->update($update);
                    $reconciled[] = ['code' => $code, 'action' => 'disabled_without_provider'];
                }
                continue;
            }

            // Rows created by the old baseline could say provider=stripe/paypal/worldline
            // while status=0. That was never a real owner choice. Convert those rows
            // back to the honest Not offered state instead of silently enabling them.
            if ($status === 0 && $providerCode === ($legacySeedProviders[$code] ?? null)) {
                $update = [];
                if (in_array('provider_code', $columns, true)) $update['provider_code'] = null;
                if ($jsonColumn) {
                    unset($payload['provider_code']);
                    $update[$jsonColumn] = json_encode(
                        $payload,
                        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                    ) ?: '{}';
                }
                if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();
                if (in_array('date_updated', $columns, true)) $update['date_updated'] = now();
                if ($update) {
                    $connection->table($table)->where('code', $code)->update($update);
                }
                $reconciled[] = [
                    'code' => $code,
                    'action' => 'cleared_legacy_default_provider',
                    'provider' => $providerCode,
                ];
                continue;
            }

            if ($status !== 0) continue;
            if (!$registry->implementsPaymentMethod($providerCode, $code)) continue;

            $providerRow = $connection->table($table)
                ->where('code', $providerCode)
                ->first();
            if (!$providerRow || (int)($providerRow->status ?? 0) !== 1) continue;

            if (in_array('status', $columns, true)) {
                $update = ['status' => 1];
                if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();
                if (in_array('date_updated', $columns, true)) $update['date_updated'] = now();
                $connection->table($table)->where('code', $code)->update($update);
                $reconciled[] = [
                    'code' => $code,
                    'action' => 'enabled_explicit_connected_provider',
                    'provider' => $providerCode,
                ];
            }
        }

        return [
            'table' => $table,
            'created' => $created,
            'created_count' => count($created),
            'new_rows_enabled' => false,
            'payment_method_invariant' => 'provider-selection-controls-offering',
            'reconciled' => $reconciled,
        ];'''

    region = region.replace(old_return, reconciliation, 1)
    text = text[:start] + region + text[end:]

    if MARKER not in text:
        fail("patch marker was not installed")
    if text == original:
        fail("patch produced no changes")

    backup = path.with_name(path.name + ".before-payment-method-baseline-r2")
    if not backup.exists():
        backup.write_text(original, encoding="utf-8")

    path.write_text(text, encoding="utf-8")
    print(f"PATCHED={path}")
    print(f"BACKUP={backup}")
    print("PMD_PAYMENT_METHOD_BASELINE_R2=OK")


if __name__ == "__main__":
    main()
