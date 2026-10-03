<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class SuperAdminTenantDomainProvisioner
{
    private const HELPER = '/usr/local/sbin/pmd-tenant-provision';

    public function provision(string $domain): array
    {
        $domain = strtolower(trim($domain));

        if (!$this->isValidTenantDomain($domain)) {
            return ['ok' => false, 'message' => 'Invalid tenant domain.'];
        }

        if (!is_file(self::HELPER) || !is_executable(self::HELPER)) {
            Log::warning('pmd_superadmin_r2_provision_helper_missing', ['domain' => $domain]);
            return [
                'ok' => false,
                'message' => 'Privileged provisioning helper is not installed yet.',
            ];
        }

        try {
            $process = new Process(['sudo', '-n', self::HELPER, $domain]);
            $process->setTimeout(600);
            $process->run();

            if (!$process->isSuccessful()) {
                Log::error('pmd_superadmin_r2_provision_failed', [
                    'domain' => $domain,
                    'code' => $process->getExitCode(),
                    'stderr' => trim($process->getErrorOutput()),
                    'stdout' => trim($process->getOutput()),
                ]);

                return [
                    'ok' => false,
                    'message' => trim($process->getErrorOutput() ?: $process->getOutput() ?: 'Provisioning helper failed.'),
                ];
            }

            Log::info('pmd_superadmin_r2_provision_success', ['domain' => $domain]);

            return [
                'ok' => true,
                'message' => trim($process->getOutput() ?: 'Domain and TLS are ready.'),
            ];
        } catch (\Throwable $e) {
            Log::error('pmd_superadmin_r2_provision_exception', [
                'domain' => $domain,
                'error' => $e->getMessage(),
            ]);

            return ['ok' => false, 'message' => 'Provisioning exception: '.$e->getMessage()];
        }
    }

    private function isValidTenantDomain(string $domain): bool
    {
        return (bool)preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $domain)
            && !in_array($domain, ['www.paymydine.com'], true);
    }
}
