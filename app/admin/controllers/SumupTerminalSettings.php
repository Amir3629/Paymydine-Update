<?php

namespace Admin\Controllers;

use App\Services\Payments\SumupOnlineCheckoutService;
use App\Services\Payments\SumupPaymentRuntimeBridge;
use App\Services\TerminalPayments\SumupMerchantEnvironmentGuard;
use App\Services\TerminalPayments\SumupTenantConnectionService;
use Illuminate\Http\Request;

class SumupTerminalSettings extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function state(
        SumupTenantConnectionService $service,
        SumupOnlineCheckoutService $online
    ) {
        $this->assertOwnerAccess();

        return response()->json([
            'success' => true,
            'state' => $online->stateWithWallets($service->state()),
        ]);
    }

    public function saveConnection(
        Request $request,
        SumupTenantConnectionService $service,
        SumupMerchantEnvironmentGuard $environmentGuard,
        SumupPaymentRuntimeBridge $runtimeBridge,
        SumupOnlineCheckoutService $online
    ) {
        $this->assertOwnerAccess();

        $data = $request->validate([
            'environment' => ['required', 'in:test,production'],
            'api_key' => ['nullable', 'string', 'max:4096'],
            'affiliate_key' => ['nullable', 'string', 'max:4096'],
            'merchant_code' => ['nullable', 'string', 'max:191'],
            'google_pay_merchant_id' => ['nullable', 'string', 'max:191'],
            'google_pay_merchant_name' => ['nullable', 'string', 'max:191'],
            'sumup_wallet_public_key' => ['nullable', 'string', 'max:512'],
        ]);

        try {
            $environment = (string)$data['environment'];

            $service->saveConnection(
                $environment,
                $data['api_key'] ?? null,
                $data['affiliate_key'] ?? null,
                $data['merchant_code'] ?? null
            );

            // Google Pay merchant metadata is public browser configuration,
            // not a SumUp secret. It stays tenant-scoped beside the provider
            // connection metadata and is only exposed back through widget config.
            if (
                array_key_exists('google_pay_merchant_id', $data)
                || array_key_exists('google_pay_merchant_name', $data)
                || array_key_exists('sumup_wallet_public_key', $data)
            ) {
                $online->saveWalletSettings(
                    $environment,
                    $data['google_pay_merchant_id'] ?? null,
                    $data['google_pay_merchant_name'] ?? null,
                    array_key_exists('sumup_wallet_public_key', $data) ? $data['sumup_wallet_public_key'] : null
                );
            }

            $result = $service->testConnection($environment);
            $merchant = $environmentGuard->assertEnvironment($environment);
            $runtimeBridge->syncCatalogue($environment);

            return response()->json([
                'success' => true,
                'message' => $environment === 'test'
                    ? 'Connected to SumUp Sandbox.'
                    : 'Connected to SumUp production merchant.',
                'merchant' => $merchant,
                'connection' => $result,
                'state' => $online->stateWithWallets($service->state()),
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    public function testConnection(
        Request $request,
        SumupTenantConnectionService $service,
        SumupMerchantEnvironmentGuard $environmentGuard,
        SumupPaymentRuntimeBridge $runtimeBridge,
        SumupOnlineCheckoutService $online
    ) {
        $this->assertOwnerAccess();
        $data = $request->validate([
            'environment' => ['required', 'in:test,production'],
        ]);

        try {
            $environment = (string)$data['environment'];
            $result = $service->testConnection($environment);
            $merchant = $environmentGuard->assertEnvironment($environment);
            $runtimeBridge->syncCatalogue($environment);

            return response()->json([
                'success' => true,
                'message' => $environment === 'test'
                    ? 'SumUp Sandbox connection verified.'
                    : 'SumUp production connection verified.',
                'merchant' => $merchant,
                'connection' => $result,
                'state' => $online->stateWithWallets($service->state()),
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    public function activateEnvironment(
        Request $request,
        SumupTenantConnectionService $service,
        SumupMerchantEnvironmentGuard $environmentGuard,
        SumupPaymentRuntimeBridge $runtimeBridge,
        SumupOnlineCheckoutService $online
    ) {
        $this->assertOwnerAccess();
        $data = $request->validate([
            'environment' => ['required', 'in:test,production'],
        ]);

        try {
            $environment = (string)$data['environment'];
            $environmentGuard->assertEnvironment($environment);
            $state = $service->activateEnvironment($environment);
            $runtimeBridge->syncCatalogue($environment);

            return response()->json([
                'success' => true,
                'message' => ucfirst($environment).' SumUp is now used for payments.',
                'state' => $online->stateWithWallets($state),
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    public function saveApplePayDomainFile(Request $request)
    {
        $this->assertOwnerAccess();

        $data = $request->validate([
            'environment' => ['required', 'in:test,production'],
            'association_file_base64' => ['required', 'string', 'max:262144'],
        ]);

        try {
            $domain = $this->resolveTenantDomain($request);
            $raw = base64_decode((string)$data['association_file_base64'], true);
            if ($raw === false) {
                throw new \RuntimeException('The Apple Pay verification file could not be decoded.');
            }

            $bytes = strlen($raw);
            if ($bytes < 64 || $bytes > 131072) {
                throw new \RuntimeException('The Apple Pay verification file size is invalid.');
            }

            $sample = strtolower(substr(ltrim($raw), 0, 1024));
            if (strpos($sample, '<html') !== false || strpos($sample, '<!doctype') !== false) {
                throw new \RuntimeException('This looks like a web page, not the Apple Pay verification file downloaded from SumUp.');
            }

            $dir = storage_path('app/pmd-wallets/apple-pay');
            if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
                throw new \RuntimeException('Could not create the Apple Pay verification directory.');
            }

            $target = $dir.DIRECTORY_SEPARATOR.$domain.'.bin';
            $temp = $target.'.tmp-'.bin2hex(random_bytes(6));
            if (file_put_contents($temp, $raw, LOCK_EX) !== $bytes) {
                @unlink($temp);
                throw new \RuntimeException('Could not store the Apple Pay verification file.');
            }
            @chmod($temp, 0644);
            if (!@rename($temp, $target)) {
                @unlink($temp);
                throw new \RuntimeException('Could not activate the Apple Pay verification file.');
            }
            @chmod($target, 0644);

            return response()->json([
                'success' => true,
                'message' => 'Apple Pay verification file hosted by PayMyDine.',
                'environment' => (string)$data['environment'],
                'domain' => $domain,
                'path' => '/.well-known/apple-developer-merchantid-domain-association',
                'sha256' => hash('sha256', $raw),
                'bytes' => $bytes,
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    private function resolveTenantDomain(Request $request): string
    {
        $tenant = app()->bound('tenant') ? app('tenant') : null;
        $domain = strtolower(trim((string)($tenant->domain ?? $request->getHost())));
        $domain = preg_replace('/:\\d+$/', '', $domain);

        if (
            !$domain
            || strlen($domain) > 253
            || strpos($domain, '..') !== false
            || !preg_match('/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/', $domain)
        ) {
            throw new \RuntimeException('Could not resolve a safe tenant domain for Apple Pay.');
        }

        return $domain;
    }

    public function pairReader(Request $request, SumupTenantConnectionService $service)
    {
        $this->assertOwnerAccess();

        try {
            $request->merge([
                'label' => trim((string)$request->input('label', '')) ?: 'SumUp terminal',
            ]);

            $data = $request->validate([
                'environment' => ['required', 'in:test,production'],
                'pairing_code' => ['required', 'string', 'regex:/^[A-Za-z0-9]{8,9}$/'],
                'label' => ['required', 'string', 'min:2', 'max:191'],
            ]);

            $result = $service->pairReader(
                (string)$data['environment'],
                (string)$data['pairing_code'],
                (string)$data['label']
            );

            return response()->json($result);
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    public function testReader($terminalId, SumupTenantConnectionService $service)
    {
        $this->assertOwnerAccess();

        try {
            return response()->json($service->testReader((int)$terminalId));
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    public function removeReader($terminalId, SumupTenantConnectionService $service)
    {
        $this->assertOwnerAccess();

        try {
            return response()->json($service->removeReader((int)$terminalId));
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    private function assertOwnerAccess(): void
    {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user) {
            abort(401, 'Authentication required.');
        }

        if (!$user->hasPermission('Site.Settings') && !$user->hasPermission('Admin.Pos')) {
            abort(403, 'Settings permission required.');
        }
    }

    private function failure(\Throwable $e)
    {
        report($e);

        return response()->json([
            'success' => false,
            'message' => $e->getMessage() ?: 'SumUp request failed.',
        ], 422);
    }
}
