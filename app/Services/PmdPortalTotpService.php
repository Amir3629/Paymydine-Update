<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_PORTAL_TOTP_V2
 *
 * Personal RFC 6238 TOTP for Staff Portal / My Work logins.
 *
 * Security properties:
 * - user-scoped inside the tenant (one Authenticator follows a multi-location user)
 * - separate from Owner restaurant-security MFA and Workplace approval
 * - enrollment secret is encrypted even while stored in the server-side session
 * - recovery codes are hash-stored, single-use, and force a fresh enrollment
 * - recovery codes must be explicitly acknowledged before normal Portal use
 * - TOTP time-steps are replay-protected
 */
class PmdPortalTotpService
{
    public const TABLE = 'pmd_portal_mfa';
    public const RECOVERY_TABLE = 'pmd_portal_mfa_recovery_codes';

    public const SESSION_ENROLLMENT = 'pmd_portal_totp_enrollment_v2';
    public const SESSION_VERIFIED = 'pmd_portal_totp_session_v1';
    public const SESSION_RECOVERY_DISPLAY = 'pmd_portal_totp_recovery_display_v1';

    public const STEP_SECONDS = 30;

    private const DIGITS = 6;
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    private const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    private const RECOVERY_COUNT = 8;

    public function ready(): bool
    {
        try {
            return Schema::hasTable(self::TABLE)
                && Schema::hasColumn(self::TABLE, 'recovery_acknowledged_at')
                && Schema::hasTable(self::RECOVERY_TABLE);
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function ensureReady(): bool
    {
        if ($this->ready()) return true;

        try {
            $migration = base_path(
                'app/system/database/migrations/2026_09_01_000000_create_pmd_portal_mfa_table.php'
            );
            if (!is_file($migration)) return false;

            require_once $migration;
            (new \System\Database\Migrations\CreatePmdPortalMfaTable())->up();

            return $this->ready();
        } catch (\Throwable $error) {
            logger()->error('PMD Portal MFA storage setup failed', [
                'message' => $error->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Portal MFA is personal to the login user, not to one restaurant location.
     * locationId remains accepted for backward call compatibility but is not used
     * to select the Authenticator record.
     */
    public function enabled(int $userId, int $locationId = 0): bool
    {
        if (!$this->ready() || $userId < 1) return false;

        return DB::table(self::TABLE)
            ->where('user_id', $userId)
            ->whereNotNull('confirmed_at')
            ->whereNull('disabled_at')
            ->exists();
    }

    public function enrollment(int $userId, int $locationId, string $username): array
    {
        if ($userId < 1 || $locationId < 1) {
            throw new \InvalidArgumentException('Portal user and restaurant location are required.');
        }

        $current = (array)session()->get(self::SESSION_ENROLLMENT, []);
        $createdAt = (int)($current['created_at'] ?? 0);

        if (
            (int)($current['user_id'] ?? 0) === $userId
            && !empty($current['secret_encrypted'])
            && $createdAt > (time() - 600)
        ) {
            try {
                Crypt::decryptString((string)$current['secret_encrypted']);
                return $current;
            } catch (\Throwable $error) {
                session()->forget(self::SESSION_ENROLLMENT);
            }
        }

        $secret = $this->base32Encode(random_bytes(20));
        $payload = [
            'user_id' => $userId,
            'location_id' => $locationId,
            'username' => trim($username),
            'secret_encrypted' => Crypt::encryptString($secret),
            'created_at' => time(),
        ];

        session()->put(self::SESSION_ENROLLMENT, $payload);
        return $payload;
    }

    public function enrollmentSecret(array $enrollment): string
    {
        $encrypted = trim((string)($enrollment['secret_encrypted'] ?? ''));
        if ($encrypted === '') {
            throw new \RuntimeException('Portal Authenticator enrollment is missing.');
        }

        try {
            $secret = strtoupper(trim(Crypt::decryptString($encrypted)));
        } catch (\Throwable $error) {
            throw new \RuntimeException('Portal Authenticator enrollment could not be decrypted.');
        }

        if ($secret === '') {
            throw new \RuntimeException('Portal Authenticator enrollment is empty.');
        }

        return $secret;
    }

    public function provisioningUri(array $enrollment): string
    {
        $secret = $this->enrollmentSecret($enrollment);
        $issuer = 'PayMyDine';
        $username = $this->compactLabel((string)($enrollment['username'] ?? 'staff'));
        $tenant = $this->tenantLabel((int)($enrollment['location_id'] ?? 0));
        $label = $issuer.':'.$username.'@'.$tenant;

        return 'otpauth://totp/'.rawurlencode($label)
            .'?secret='.rawurlencode($secret)
            .'&issuer='.rawurlencode($issuer);
    }

    public function confirmEnrollment(int $userId, int $locationId, string $code): bool
    {
        if (!$this->ready() || $userId < 1 || $locationId < 1) return false;

        $enrollment = (array)session()->get(self::SESSION_ENROLLMENT, []);
        if (
            (int)($enrollment['user_id'] ?? 0) !== $userId
            || empty($enrollment['secret_encrypted'])
            || (int)($enrollment['created_at'] ?? 0) <= (time() - 600)
        ) {
            return false;
        }

        try {
            $secret = $this->enrollmentSecret($enrollment);
        } catch (\Throwable $error) {
            return false;
        }

        $matchedStep = $this->matchingStep($secret, $code);
        if ($matchedStep === null) return false;

        $identity = app(PmdSiteAccessService::class)->identity();
        $staffId = (int)($identity['staff_id'] ?? 0);
        $now = now();

        $recoveryCodes = DB::transaction(function () use ($userId, $locationId, $staffId, $secret, $matchedStep, $now) {
            $records = DB::table(self::TABLE)
                ->where('user_id', $userId)
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->get();

            $primary = $records->first();
            $values = [
                'staff_id' => $staffId ?: null,
                'mfa_type' => 'totp',
                'secret_encrypted' => Crypt::encryptString($secret),
                'last_used_step' => $matchedStep,
                'confirmed_at' => $now,
                'recovery_acknowledged_at' => null,
                'disabled_at' => null,
                'updated_at' => $now,
            ];

            if ($primary) {
                DB::table(self::TABLE)
                    ->where('user_id', $userId)
                    ->where('id', '<>', (int)$primary->id)
                    ->delete();

                DB::table(self::TABLE)
                    ->where('id', (int)$primary->id)
                    ->update($values);
            } else {
                DB::table(self::TABLE)->insert(array_merge($values, [
                    'user_id' => $userId,
                    'location_id' => $locationId,
                    'created_at' => $now,
                ]));
            }

            return $this->replaceRecoveryCodes($userId, $now);
        });

        session()->forget(self::SESSION_ENROLLMENT);
        $this->storeRecoveryDisplay($recoveryCodes);
        $this->markSessionVerified($userId, $locationId, 'enrollment');

        return true;
    }

    public function verify(int $userId, int $locationId, string $code): bool
    {
        if (!$this->ready() || $userId < 1 || $locationId < 1) return false;

        $record = $this->activeRecord($userId, true);
        if (!$record) return false;

        try {
            $secret = Crypt::decryptString((string)$record->secret_encrypted);
        } catch (\Throwable $error) {
            return false;
        }

        $matchedStep = $this->matchingStep($secret, $code);
        if ($matchedStep === null) return false;
        if ($record->last_used_step !== null && $matchedStep <= (int)$record->last_used_step) return false;

        DB::table(self::TABLE)->where('id', (int)$record->id)->update([
            'last_used_step' => $matchedStep,
            'updated_at' => now(),
        ]);

        $this->markSessionVerified($userId, $locationId, 'verify');
        return true;
    }

    public function needsRecoveryAcknowledgement(int $userId): bool
    {
        if (!$this->ready() || $userId < 1) return false;
        $record = $this->activeRecord($userId, false);
        return $record && empty($record->recovery_acknowledged_at);
    }

    /**
     * If a browser closed before saving recovery codes, hashes cannot be turned
     * back into plaintext. After the next successful TOTP we replace them with a
     * fresh set and show that new set before allowing normal Portal use.
     */
    public function ensureRecoveryCodesForDisplay(int $userId): array
    {
        if (!$this->ready() || $userId < 1) return [];

        $existing = $this->recoveryCodesForDisplay();
        if ($existing) return $existing;

        $codes = DB::transaction(function () use ($userId) {
            return $this->replaceRecoveryCodes($userId, now());
        });
        $this->storeRecoveryDisplay($codes);
        return $codes;
    }

    public function acknowledgeRecoveryCodes(int $userId): bool
    {
        if (!$this->ready() || $userId < 1) return false;
        if (!$this->recoveryCodesForDisplay()) return false;

        $record = $this->activeRecord($userId, false);
        if (!$record) return false;

        DB::table(self::TABLE)->where('id', (int)$record->id)->update([
            'recovery_acknowledged_at' => now(),
            'updated_at' => now(),
        ]);
        $this->clearRecoveryDisplay();
        return true;
    }

    /**
     * A personal recovery code does NOT open the Portal. It only proves recovery
     * authority, revokes the lost-phone secret, and forces a brand-new QR setup.
     */
    public function recoverToNewEnrollment(int $userId, string $recoveryCode): bool
    {
        if (!$this->ready() || $userId < 1) return false;

        $normalized = $this->normalizeRecoveryCode($recoveryCode);
        if ($normalized === '') return false;
        $hash = $this->recoveryHash($userId, $normalized);

        $ok = DB::transaction(function () use ($userId, $hash) {
            $row = DB::table(self::RECOVERY_TABLE)
                ->where('user_id', $userId)
                ->where('code_hash', $hash)
                ->whereNull('used_at')
                ->lockForUpdate()
                ->first();

            if (!$row) return false;

            DB::table(self::RECOVERY_TABLE)
                ->where('id', (int)$row->id)
                ->update(['used_at' => now()]);

            DB::table(self::TABLE)
                ->where('user_id', $userId)
                ->whereNull('disabled_at')
                ->update([
                    'disabled_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table(self::RECOVERY_TABLE)
                ->where('user_id', $userId)
                ->delete();

            return true;
        });

        if (!$ok) return false;

        $this->clearSessionVerification();
        $this->resetEnrollment();
        $this->clearRecoveryDisplay();
        return true;
    }

    /**
     * Emergency reset primitive. It never authenticates or approves a login; it
     * only invalidates the old factor so the next password-authenticated Portal
     * login must enroll a fresh Authenticator.
     */
    public function resetUser(int $userId): bool
    {
        if (!$this->ready() || $userId < 1) return false;

        DB::transaction(function () use ($userId) {
            DB::table(self::TABLE)
                ->where('user_id', $userId)
                ->whereNull('disabled_at')
                ->update([
                    'disabled_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table(self::RECOVERY_TABLE)
                ->where('user_id', $userId)
                ->delete();
        });

        return true;
    }

    public function recoveryCodesForDisplay(): array
    {
        $payload = trim((string)session()->get(self::SESSION_RECOVERY_DISPLAY, ''));
        if ($payload === '') return [];

        try {
            $decoded = json_decode(Crypt::decryptString($payload), true);
        } catch (\Throwable $error) {
            return [];
        }

        if (!is_array($decoded)) return [];

        return array_values(array_filter(
            array_map('strval', $decoded),
            static fn ($code) => trim($code) !== ''
        ));
    }

    public function clearRecoveryDisplay(): void
    {
        session()->forget(self::SESSION_RECOVERY_DISPLAY);
    }

    public function sessionVerified(int $userId, int $locationId, int $maxAgeSeconds = 600): bool
    {
        if ($userId < 1 || $locationId < 1) return false;

        $proof = (array)session()->get(self::SESSION_VERIFIED, []);
        return (int)($proof['user_id'] ?? 0) === $userId
            && (int)($proof['location_id'] ?? 0) === $locationId
            && hash_equals((string)($proof['session_id'] ?? ''), (string)session()->getId())
            && (int)($proof['verified_at'] ?? 0) > (time() - max(30, $maxAgeSeconds));
    }

    public function clearSessionVerification(): void
    {
        session()->forget(self::SESSION_VERIFIED);
    }

    public function resetEnrollment(): void
    {
        session()->forget(self::SESSION_ENROLLMENT);
    }

    private function activeRecord(int $userId, bool $collapseDuplicates = false)
    {
        $record = DB::table(self::TABLE)
            ->where('user_id', $userId)
            ->whereNotNull('confirmed_at')
            ->whereNull('disabled_at')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->first();

        if (!$record || !$collapseDuplicates) return $record;

        try {
            DB::table(self::TABLE)
                ->where('user_id', $userId)
                ->whereNull('disabled_at')
                ->where('id', '<>', (int)$record->id)
                ->update([
                    'disabled_at' => now(),
                    'updated_at' => now(),
                ]);
        } catch (\Throwable $error) {
        }

        return $record;
    }

    private function replaceRecoveryCodes(int $userId, $now): array
    {
        DB::table(self::RECOVERY_TABLE)->where('user_id', $userId)->delete();

        $codes = [];
        for ($i = 0; $i < self::RECOVERY_COUNT; $i++) {
            $raw = $this->randomRecoveryCode();
            $normalized = $this->normalizeRecoveryCode($raw);

            DB::table(self::RECOVERY_TABLE)->insert([
                'user_id' => $userId,
                'code_hash' => $this->recoveryHash($userId, $normalized),
                'used_at' => null,
                'created_at' => $now,
            ]);
            $codes[] = $raw;
        }

        return $codes;
    }

    private function storeRecoveryDisplay(array $codes): void
    {
        session()->put(
            self::SESSION_RECOVERY_DISPLAY,
            Crypt::encryptString(json_encode(array_values($codes)))
        );
    }

    private function randomRecoveryCode(): string
    {
        $alphabet = self::RECOVERY_ALPHABET;
        $max = strlen($alphabet) - 1;
        $chars = '';
        for ($i = 0; $i < 10; $i++) {
            $chars .= $alphabet[random_int(0, $max)];
        }
        return substr($chars, 0, 5).'-'.substr($chars, 5, 5);
    }

    private function normalizeRecoveryCode(string $value): string
    {
        return strtoupper(preg_replace('/[^A-Z0-9]/', '', trim($value)));
    }

    private function recoveryHash(int $userId, string $normalized): string
    {
        return hash_hmac(
            'sha256',
            'portal-recovery|'.$userId.'|'.$normalized,
            (string)config('app.key', 'pmd-portal-recovery')
        );
    }

    private function markSessionVerified(int $userId, int $locationId, string $method): void
    {
        session()->put(self::SESSION_VERIFIED, [
            'user_id' => $userId,
            'location_id' => $locationId,
            'session_id' => (string)session()->getId(),
            'method' => $method,
            'verified_at' => time(),
        ]);
    }

    private function tenantLabel(int $locationId): string
    {
        $host = strtolower(trim((string)request()->getHost()));
        $label = '';

        if (preg_match('/^([a-z0-9-]+)\.paymydine\.com$/i', $host, $match)) {
            $label = (string)$match[1];
        }

        if ($label === '' && $locationId > 0) {
            try {
                if (Schema::hasTable('locations')) {
                    $label = trim((string)DB::table('locations')
                        ->where('location_id', $locationId)
                        ->value('location_name'));
                }
            } catch (\Throwable $error) {
                $label = '';
            }
        }

        if ($label === '') $label = $host !== '' ? $host : 'restaurant';
        return $this->compactLabel($label);
    }

    private function compactLabel(string $value): string
    {
        $value = preg_replace('/[^A-Za-z0-9._-]+/', '-', trim($value));
        $value = trim(preg_replace('/-+/', '-', (string)$value), '-._');
        if ($value === '') $value = 'staff';
        // Keep the complete otpauth URI safely inside the dedicated Version 6-L
        // QR payload budget even when both username and tenant names are long.
        return substr($value, 0, 20);
    }

    private function matchingStep(string $secret, string $input): ?int
    {
        $clean = preg_replace('/\D+/', '', $input);
        if (strlen($clean) !== self::DIGITS) return null;

        $current = intdiv(time(), self::STEP_SECONDS);
        foreach ([$current, $current - 1, $current + 1] as $step) {
            if (hash_equals($this->codeForStep($secret, $step), $clean)) {
                return $step;
            }
        }
        return null;
    }

    private function codeForStep(string $secret, int $step): string
    {
        $key = $this->base32Decode($secret);
        $high = ($step >> 32) & 0xffffffff;
        $low = $step & 0xffffffff;
        $counter = pack('N2', $high, $low);
        $hash = hash_hmac('sha1', $counter, $key, true);
        $offset = ord($hash[19]) & 0x0f;
        $binary = ((ord($hash[$offset]) & 0x7f) << 24)
            | ((ord($hash[$offset + 1]) & 0xff) << 16)
            | ((ord($hash[$offset + 2]) & 0xff) << 8)
            | (ord($hash[$offset + 3]) & 0xff);
        $otp = $binary % 1000000;
        return str_pad((string)$otp, self::DIGITS, '0', STR_PAD_LEFT);
    }

    private function base32Encode(string $data): string
    {
        $bits = '';
        foreach (str_split($data) as $char) {
            $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
        }

        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            if (strlen($chunk) < 5) $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
            $out .= self::ALPHABET[bindec($chunk)];
        }
        return $out;
    }

    private function base32Decode(string $secret): string
    {
        $secret = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret));
        $bits = '';
        foreach (str_split($secret) as $char) {
            $pos = strpos(self::ALPHABET, $char);
            if ($pos === false) continue;
            $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }

        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) < 8) break;
            $out .= chr(bindec($byte));
        }
        return $out;
    }
}
