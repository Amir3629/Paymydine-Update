<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class TenantProvisioningService
{
    public function provisionDomain(string $domain): array
    {
        if (!$this->isValidTenantDomain($domain)) {
            return ['ok' => false, 'message' => 'Invalid tenant domain format'];
        }

        $nginxTemplate = '/etc/nginx/sites-available/mimoza.paymydine.com.conf';
        $nginxTarget = "/etc/nginx/sites-available/{$domain}.conf";
        $nginxEnabled = "/etc/nginx/sites-enabled/{$domain}.conf";

        if (!is_file($nginxTemplate)) {
            Log::error('tenant_provisioning_failed', ['domain' => $domain, 'reason' => 'template_missing']);
            return ['ok' => false, 'message' => 'Nginx tenant template not found'];
        }

        try {
            $template = file_get_contents($nginxTemplate);
            $content = str_replace('mimoza.paymydine.com', $domain, $template);
            file_put_contents($nginxTarget, $content);

            if (!is_link($nginxEnabled)) {
                @symlink($nginxTarget, $nginxEnabled);
            }

            $test = new Process(['nginx', '-t']);
            $test->run();
            if (!$test->isSuccessful()) {
                Log::error('tenant_provisioning_failed', ['domain' => $domain, 'reason' => 'nginx_test_failed', 'output' => $test->getErrorOutput()]);
                return ['ok' => false, 'message' => 'Nginx config test failed'];
            }

            $certbot = new Process(['certbot', 'certonly', '--webroot', '-w', '/var/www/html', '-d', $domain, '--non-interactive', '--agree-tos', '-m', 'admin@paymydine.com']);
            $certbot->setTimeout(600);
            $certbot->run();
            if (!$certbot->isSuccessful()) {
                Log::error('tenant_provisioning_failed', ['domain' => $domain, 'reason' => 'certbot_failed', 'output' => $certbot->getErrorOutput()]);
                return ['ok' => false, 'message' => 'SSL certificate provisioning failed'];
            }

            $reload = new Process(['systemctl', 'reload', 'nginx']);
            $reload->run();
            if (!$reload->isSuccessful()) {
                Log::error('tenant_provisioning_failed', ['domain' => $domain, 'reason' => 'nginx_reload_failed', 'output' => $reload->getErrorOutput()]);
                return ['ok' => false, 'message' => 'Nginx reload failed'];
            }

            Log::info('tenant_provisioning_success', ['domain' => $domain]);
            return ['ok' => true, 'message' => 'Provisioning succeeded'];
        } catch (\Throwable $e) {
            Log::error('tenant_provisioning_exception', ['domain' => $domain, 'error' => $e->getMessage()]);
            return ['ok' => false, 'message' => 'Provisioning exception'];
        }
    }

    private function isValidTenantDomain(string $domain): bool
    {
        return (bool)preg_match('/^[a-z0-9-]+\.paymydine\.com$/', strtolower($domain))
            && !in_array(strtolower($domain), ['paymydine.com', 'www.paymydine.com'], true);
    }
}

