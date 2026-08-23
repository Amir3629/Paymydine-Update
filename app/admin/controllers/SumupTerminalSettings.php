<?php

namespace Admin\Controllers;

use App\Services\Payments\SumupPaymentRuntimeBridge;
use App\Services\TerminalPayments\SumupMerchantEnvironmentGuard;
use App\Services\TerminalPayments\SumupTenantConnectionService;
use Illuminate\Http\Request;

class SumupTerminalSettings extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function state(SumupTenantConnectionService $service)
    {
        $this->assertOwnerAccess();

        return response()->json([
            'success' => true,
            'state' => $service->state(),
        ]);
    }

    public function saveConnection(
        Request $request,
        SumupTenantConnectionService $service,
        SumupMerchantEnvironmentGuard $environmentGuard,
        SumupPaymentRuntimeBridge $runtimeBridge
    ) {
        $this->assertOwnerAccess();

        $data = $request->validate([
            'environment' => ['required', 'in:test,production'],
            'api_key' => ['nullable', 'string', 'max:4096'],
            'affiliate_key' => ['nullable', 'string', 'max:4096'],
            'merchant_code' => ['nullable', 'string', 'max:191'],
        ]);

        try {
            $environment = (string)$data['environment'];

            $service->saveConnection(
                $environment,
                $data['api_key'] ?? null,
                $data['affiliate_key'] ?? null,
                $data['merchant_code'] ?? null
            );

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
                'state' => $service->state(),
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    public function testConnection(
        Request $request,
        SumupTenantConnectionService $service,
        SumupMerchantEnvironmentGuard $environmentGuard,
        SumupPaymentRuntimeBridge $runtimeBridge
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
                'state' => $service->state(),
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    public function activateEnvironment(
        Request $request,
        SumupTenantConnectionService $service,
        SumupMerchantEnvironmentGuard $environmentGuard,
        SumupPaymentRuntimeBridge $runtimeBridge
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
                'state' => $state,
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
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
