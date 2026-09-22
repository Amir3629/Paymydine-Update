<?php

namespace App\Services;

use Admin\Models\Users_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_STAFF_QUICK_PIN_V1
 *
 * Six-digit staff PINs are a convenience credential for an already trusted
 * restaurant terminal. The Login controller is responsible for enforcing the
 * Site Access hub before a PIN may create an Admin session.
 *
 * Raw PINs are never stored. pin_lookup is a keyed HMAC used only to locate the
 * candidate row efficiently; pin_hash is the slow password hash that must also
 * verify before the account can be used.
 */
final class PmdStaffPinService
{
    public const TABLE = 'pmd_staff_login_pins';
    public const LENGTH = 6;

    private ?bool $readyCache = null;

    public function ready(): bool
    {
        if ($this->readyCache !== null) return $this->readyCache;

        try {
            return $this->readyCache = Schema::hasTable(self::TABLE);
        } catch (\Throwable $error) {
            return $this->readyCache = false;
        }
    }

    public function ensureReady(): bool
    {
        if ($this->ready()) return true;

        try {
            $migration = base_path(
                'app/system/database/migrations/2026_09_23_000000_create_pmd_staff_login_pins_table.php'
            );
            if (!is_file($migration)) return false;

            require_once $migration;
            (new \System\Database\Migrations\CreatePmdStaffLoginPinsTable())->up();
            $this->readyCache = null;

            return $this->ready();
        } catch (\Throwable $error) {
            logger()->error('PMD Staff Quick PIN storage setup failed', [
                'message' => $error->getMessage(),
            ]);
            return false;
        }
    }

    public function hasAnyPin(): bool
    {
        if (!$this->ready()) return false;

        try {
            return DB::table(self::TABLE)
                ->whereNull('disabled_at')
                ->exists();
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function hasPinForUser(int $userId): bool
    {
        if (!$this->ready() || $userId < 1) return false;

        return DB::table(self::TABLE)
            ->where('user_id', $userId)
            ->whereNull('disabled_at')
            ->exists();
    }

    public function isWeakPin(string $pin): bool
    {
        $pin = trim($pin);
        if (!preg_match('/^[0-9]{6}$/', $pin)) return true;
        if (preg_match('/^(\\d)\\1{5}$/', $pin)) return true;

        return in_array($pin, [
            '012345', '123456', '234567', '345678', '456789',
            '987654', '876543', '765432', '654321', '543210',
        ], true);
    }

    public function availableForUser(string $pin, int $userId = 0): bool
    {
        if (!$this->ready() || !preg_match('/^[0-9]{6}$/', trim($pin))) {
            return false;
        }

        $query = DB::table(self::TABLE)
            ->where('pin_lookup', $this->lookupHash($pin))
            ->whereNull('disabled_at');

        if ($userId > 0) $query->where('user_id', '<>', $userId);

        return !$query->exists();
    }

    public function setPin(int $userId, int $staffId, string $pin): void
    {
        $pin = trim($pin);
        if (!$this->ready()) {
            throw new \RuntimeException('Quick PIN storage is not ready.');
        }
        if (!preg_match('/^[0-9]{6}$/', $pin) || $this->isWeakPin($pin)) {
            throw new \InvalidArgumentException('Choose a stronger 6-digit Quick PIN.');
        }
        if ($userId < 1 || $staffId < 1) {
            throw new \InvalidArgumentException('A valid PMD staff account is required.');
        }
        if (!$this->availableForUser($pin, $userId)) {
            throw new \InvalidArgumentException('That Quick PIN is already in use.');
        }

        $now = now();
        $values = [
            'staff_id' => $staffId,
            'pin_lookup' => $this->lookupHash($pin),
            'pin_hash' => Hash::make($this->verificationSecret($pin)),
            'disabled_at' => null,
            'updated_at' => $now,
        ];

        $existing = DB::table(self::TABLE)
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            DB::table(self::TABLE)
                ->where('user_id', $userId)
                ->update($values);
            return;
        }

        DB::table(self::TABLE)->insert($values + [
            'user_id' => $userId,
            'last_used_at' => null,
            'created_at' => $now,
        ]);
    }

    public function userForPin(string $pin)
    {
        $pin = trim($pin);
        if (!$this->ready() || !preg_match('/^[0-9]{6}$/', $pin)) return null;

        $record = DB::table(self::TABLE)
            ->where('pin_lookup', $this->lookupHash($pin))
            ->whereNull('disabled_at')
            ->first();

        if (
            !$record
            || !Hash::check(
                $this->verificationSecret($pin),
                (string)$record->pin_hash
            )
        ) {
            return null;
        }

        $user = Users_model::query()->find((int)$record->user_id);
        $staff = $user ? $user->staff : null;
        if (
            !$user
            || !$staff
            || (int)$staff->getKey() !== (int)$record->staff_id
            || (isset($user->is_activated) && !(bool)$user->is_activated)
            || (isset($staff->staff_status) && !(bool)$staff->staff_status)
        ) {
            return null;
        }

        return $user;
    }

    public function touchUser(int $userId): void
    {
        if (!$this->ready() || $userId < 1) return;

        DB::table(self::TABLE)
            ->where('user_id', $userId)
            ->whereNull('disabled_at')
            ->update([
                'last_used_at' => now(),
                'updated_at' => now(),
            ]);
    }

    public function canUseRole(string $roleCode): bool
    {
        $roleCode = strtolower(trim($roleCode));

        if (str_starts_with($roleCode, PmdDefaultStaffRoleService::KDS_PREFIX)) {
            return true;
        }

        return in_array($roleCode, [
            PmdDefaultStaffRoleService::CASHIER,
            PmdDefaultStaffRoleService::WAITER,
            PmdDefaultStaffRoleService::RESERVATIONS,
            PmdDefaultStaffRoleService::TEAM_MEMBER,
            PmdDefaultStaffRoleService::SONSTIGE,
        ], true);
    }

    private function verificationSecret(string $pin): string
    {
        return hash_hmac(
            'sha256',
            'pmd-staff-pin-verify-v1|'.trim($pin),
            (string)config('app.key', 'pmd-staff-pin')
        );
    }

    private function lookupHash(string $pin): string
    {
        return hash_hmac(
            'sha256',
            'pmd-staff-pin-v1|'.trim($pin),
            (string)config('app.key', 'pmd-staff-pin')
        );
    }
}
