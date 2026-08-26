#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER = "PMD_SUMUP_WALLET_CATALOGUE_SYNC_R1_4_6"


def fail(message: str) -> None:
    raise SystemExit("ERROR: " + message)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label} expected once, found {count}")
    return text.replace(old, new, 1)


def patch_model(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER in text and "'apple_pay' => ['stripe', 'sumup', 'vr_payment']" in text:
        return

    old = """        'apple_pay' => ['stripe', 'vr_payment'],
        'google_pay' => ['stripe', 'vr_payment'],
"""
    new = """        'apple_pay' => ['stripe', 'sumup', 'vr_payment'], // PMD_SUMUP_WALLET_CATALOGUE_SYNC_R1_4_6
        'google_pay' => ['stripe', 'sumup', 'vr_payment'],
"""
    if old in text:
        text = replace_once(text, old, new, "Payments_model wallet provider matrix")
    elif "'apple_pay' => ['stripe', 'sumup', 'vr_payment']" not in text:
        fail("Payments_model wallet provider matrix anchor missing")

    path.write_text(text, encoding="utf-8")


def patch_bridge(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        return

    if "class SumupPaymentRuntimeBridge" not in text:
        fail("target is not SumupPaymentRuntimeBridge.php")

    anchor = """            if (method_exists($card, 'setConfigData')) {
                $card->setConfigData($cardConfig);
            }
            $card->save();
        }

        return [
"""

    block = r'''            if (method_exists($card, 'setConfigData')) {
                $card->setConfigData($cardConfig);
            }
            $card->save();
        }

        // PMD_SUMUP_WALLET_CATALOGUE_SYNC_R1_4_6
        // The SumUp connection test used to reconcile only Card. That left
        // standalone Apple Pay / Google Pay rows disabled forever on new
        // tenants even after the restaurant completed SumUp wallet onboarding.
        // We now reconcile wallet rows from tenant-scoped, non-secret readiness
        // metadata. Browser/device capability remains authoritative at runtime
        // through SumUp Swift Checkout canMakePayment()/availablePaymentMethods().
        $walletRow = Schema::hasTable('terminal_provider_configs')
            ? DB::table('terminal_provider_configs')
                ->where('provider_code', 'sumup')
                ->where('environment', $environment)
                ->first()
            : null;

        $walletMetadata = [];
        if ($walletRow) {
            $rawMetadata = $walletRow->metadata ?? null;
            if (is_array($rawMetadata)) {
                $walletMetadata = $rawMetadata;
            } elseif (is_string($rawMetadata) && trim($rawMetadata) !== '') {
                $decodedMetadata = json_decode($rawMetadata, true);
                if (is_array($decodedMetadata)) {
                    $walletMetadata = $decodedMetadata;
                }
            }
        }

        $walletPublicKey = trim((string)(
            $walletMetadata['sumup_wallet_public_key']
            ?? $walletMetadata['swift_checkout_public_key']
            ?? ''
        ));
        $googleMerchantId = trim((string)($walletMetadata['google_pay_merchant_id'] ?? ''));
        $googleMerchantName = trim((string)($walletMetadata['google_pay_merchant_name'] ?? ''));

        $applePayReady = str_starts_with($walletPublicKey, 'sup_pk_');
        $googlePayReady = $applePayReady && $googleMerchantId !== '' && $googleMerchantName !== '';
        $walletSync = [];

        foreach ([
            'apple_pay' => [
                'ready' => $applePayReady,
                'name' => 'Apple Pay',
                'description' => 'SumUp Swift Checkout (Apple Pay)',
            ],
            'google_pay' => [
                'ready' => $googlePayReady,
                'name' => 'Google Pay',
                'description' => 'SumUp Swift Checkout (Google Pay)',
            ],
        ] as $methodCode => $walletDefinition) {
            $method = Payments_model::query()->where('code', $methodCode)->first();
            if (!$method) {
                $walletSync[$methodCode] = [
                    'ready' => (bool)$walletDefinition['ready'],
                    'changed' => false,
                    'reason' => 'method_row_missing',
                ];
                continue;
            }

            $selectedProvider = strtolower(trim((string)($method->provider_code ?? '')));
            $methodConfig = method_exists($method, 'getConfigData')
                ? $method->getConfigData()
                : [];
            $supported = array_values(array_unique(array_filter(array_map(
                fn ($value) => strtolower(trim((string)$value)),
                (array)($methodConfig['supported_providers'] ?? Payments_model::supportedProvidersForMethod($methodCode))
            ))));
            if (!in_array('sumup', $supported, true)) {
                $supported[] = 'sumup';
            }
            $methodConfig['supported_providers'] = $supported;

            // Never steal an explicit wallet assignment from another provider.
            // Tomo already assigns these rows to SumUp, so the normal path below
            // only fixes their stale disabled status.
            $alternateProviderPreserved = $selectedProvider !== '' && $selectedProvider !== 'sumup';
            $changed = false;
            if (!$alternateProviderPreserved) {
                if ($selectedProvider !== 'sumup') {
                    $method->provider_code = 'sumup';
                    $changed = true;
                }
                $targetStatus = (bool)$walletDefinition['ready'] ? 1 : 0;
                if ((int)($method->status ?? 0) !== $targetStatus) {
                    $method->status = $targetStatus;
                    $changed = true;
                }
                $method->name = (string)$walletDefinition['name'];
                $method->description = (string)$walletDefinition['description'];
            }

            if (method_exists($method, 'setConfigData')) {
                $method->setConfigData($methodConfig);
            }
            $method->save();

            $walletSync[$methodCode] = [
                'ready' => (bool)$walletDefinition['ready'],
                'changed' => $changed,
                'provider' => strtolower(trim((string)($method->provider_code ?? ''))),
                'enabled' => (bool)($method->status ?? false),
                'alternate_provider_preserved' => $alternateProviderPreserved,
            ];
        }

        return [
'''

    text = replace_once(text, anchor, block, "SumUp wallet catalogue insertion")

    old_return = """            'existing_card_provider_preserved' => $cardOwnerPreserved,
            'secret_persisted_to_legacy_table' => false,
"""
    new_return = """            'existing_card_provider_preserved' => $cardOwnerPreserved,
            'wallet_public_key_configured' => $applePayReady,
            'apple_pay_ready' => $applePayReady,
            'google_pay_ready' => $googlePayReady,
            'wallet_sync' => $walletSync,
            'secret_persisted_to_legacy_table' => false,
"""
    text = replace_once(text, old_return, new_return, "SumUp wallet sync result")

    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        fail("usage: patch-pmd-sumup-wallet-catalogue-r1-4-6.py <Payments_model.php> <SumupPaymentRuntimeBridge.php>")

    model = Path(sys.argv[1]).resolve()
    bridge = Path(sys.argv[2]).resolve()
    for target in [model, bridge]:
        if not target.is_file():
            fail("target not found: " + str(target))

    patch_model(model)
    patch_bridge(bridge)

    model_text = model.read_text(encoding="utf-8")
    bridge_text = bridge.read_text(encoding="utf-8")
    if "'apple_pay' => ['stripe', 'sumup', 'vr_payment']" not in model_text:
        fail("SumUp Apple Pay provider matrix missing after patch")
    if "'google_pay' => ['stripe', 'sumup', 'vr_payment']" not in model_text:
        fail("SumUp Google Pay provider matrix missing after patch")
    if MARKER not in bridge_text:
        fail("wallet catalogue sync marker missing after patch")

    print("PMD_SUMUP_WALLET_PROVIDER_MATRIX_R1_4_6=OK")
    print("PMD_SUMUP_WALLET_CATALOGUE_SYNC_R1_4_6=OK")
    print("APPLE_PAY_ENABLEMENT=SUP_PK_READINESS")
    print("GOOGLE_PAY_ENABLEMENT=SUP_PK_PLUS_GOOGLE_MERCHANT_METADATA")
    print("RUNTIME_DEVICE_DOMAIN_CHECK=SUMUP_SWIFT_AUTHORITY")


if __name__ == '__main__':
    main()
