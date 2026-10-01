<?php

namespace App\Services;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class PmdDevicePlatformAuthService
{
    public function authenticate(Request $request)
    {
        $this->ensureTrustStorage();

        $raw = trim((string)$request->bearerToken());
        if ($raw === '' || strlen($raw) < 32) {
            $this->fail(401, 'PayMyDine device authentication is required.');
        }

        $device = DB::table('pmd_site_access_devices')
            ->where('token_hash', hash('sha256', $raw))
            ->whereNull('revoked_at')
            ->first();

        if (!$device) {
            $this->fail(401, 'This PayMyDine device is not trusted.');
        }

        $kind = strtolower(trim((string)($device->device_kind ?? '')));
        if (!in_array($kind, [
            'table_display',
            'staff_personal',
            'site_hub',
            'kds',
            'cashier',
            'customer_display',
            'kiosk',
        ], true)) {
            $this->fail(403, 'This device type cannot use Device Platform.');
        }

        DB::table('pmd_site_access_devices')
            ->where('id', (int)$device->id)
            ->update([
                'last_seen_at' => now(),
                'updated_at' => now(),
            ]);

        return $device;
    }

    private function ensureTrustStorage(): void
    {
        if (Schema::hasTable('pmd_site_access_devices')) {
            return;
        }

        $path = base_path(
            'app/system/database/migrations/2026_08_30_103000_create_pmd_site_access_tables.php'
        );
        if (!is_file($path)) {
            throw new \RuntimeException('PayMyDine trusted-device storage is not installed.');
        }

        require_once $path;
        (new \System\Database\Migrations\CreatePmdSiteAccessTables())->up();
    }

    private function fail(int $status, string $message): void
    {
        throw new HttpResponseException(
            response()->json(
                ['ok' => false, 'message' => $message],
                $status,
                ['Cache-Control' => 'no-store, private']
            )
        );
    }
}
