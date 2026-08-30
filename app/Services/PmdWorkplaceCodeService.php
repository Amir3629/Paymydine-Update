<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * PMD_WORKPLACE_CODE_V1
 *
 * Restaurant-bound rotating access code shown only on a trusted workplace hub.
 * The code is derived server-side from tenant + location + a 30-second window,
 * so no reusable raw OTP secret is stored in the tenant database.
 */
class PmdWorkplaceCodeService
{
    public const STEP_SECONDS = 30;

    public function current(int $locationId, ?Carbon $now = null): array
    {
        if ($locationId < 1) {
            throw new \InvalidArgumentException('A restaurant location is required.');
        }

        $now = $now ?: now();
        $timestamp = (int)$now->timestamp;
        $window = intdiv($timestamp, self::STEP_SECONDS);
        $elapsed = $timestamp % self::STEP_SECONDS;
        $expiresIn = self::STEP_SECONDS - $elapsed;

        return [
            'code' => $this->codeForWindow($locationId, $window),
            'expires_in' => max(1, $expiresIn),
            'window' => $window,
        ];
    }

    public function verify(int $locationId, string $input, ?Carbon $now = null): bool
    {
        if ($locationId < 1) return false;

        $clean = preg_replace('/\D+/', '', $input);
        if (strlen($clean) !== 6) return false;

        $now = $now ?: now();
        $window = intdiv((int)$now->timestamp, self::STEP_SECONDS);

        // Accept the previous 30-second window so a code does not fail merely
        // because the restaurant screen rotated while the employee submitted it.
        foreach ([$window, $window - 1] as $candidateWindow) {
            if (hash_equals($this->codeForWindow($locationId, $candidateWindow), $clean)) {
                return true;
            }
        }

        return false;
    }

    private function codeForWindow(int $locationId, int $window): string
    {
        $payload = implode('|', [
            'pmd-workplace',
            $this->tenantKey(),
            $locationId,
            $window,
        ]);

        $hex = hash_hmac('sha256', $payload, $this->appSecret());
        $number = hexdec(substr($hex, 0, 12)) % 1000000;

        return str_pad((string)$number, 6, '0', STR_PAD_LEFT);
    }

    private function tenantKey(): string
    {
        if (app()->bound('tenant')) {
            $tenant = app('tenant');
            $database = trim((string)($tenant->database ?? ''));
            $domain = strtolower(trim((string)($tenant->domain ?? '')));
            if ($database !== '' || $domain !== '') {
                return strtolower($database).'|'.$domain;
            }
        }

        try {
            return strtolower((string)DB::connection()->getDatabaseName());
        } catch (\Throwable $error) {
            return strtolower((string)request()->getHost());
        }
    }

    private function appSecret(): string
    {
        return (string)config('app.key', 'pmd-workplace-access');
    }
}
