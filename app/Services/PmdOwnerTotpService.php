<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_OWNER_TOTP_V1
 *
 * Provider-free RFC 6238 TOTP for the restaurant Owner. Compatible with
 * Google Authenticator, Microsoft Authenticator, 1Password and other
 * standard authenticator apps. The tenant DB stores only an encrypted secret.
 */
class PmdOwnerTotpService
{
    public const TABLE = 'pmd_owner_mfa';
    public const SESSION_ENROLLMENT = 'pmd_owner_totp_enrollment_v1';
    public const STEP_SECONDS = 30;
    private const DIGITS = 6;
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function ready(): bool
    {
        try {
            return Schema::hasTable(self::TABLE);
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function enabled(int $userId): bool
    {
        if (!$this->ready() || $userId < 1) return false;

        return DB::table(self::TABLE)
            ->where('user_id', $userId)
            ->whereNotNull('confirmed_at')
            ->whereNull('disabled_at')
            ->exists();
    }

    public function enrollment(int $userId, int $locationId): array
    {
        if ($userId < 1 || $locationId < 1) {
            throw new \InvalidArgumentException('Owner and restaurant location are required.');
        }

        $current = (array)session()->get(self::SESSION_ENROLLMENT, []);
        $createdAt = (int)($current['created_at'] ?? 0);
        if (
            (int)($current['user_id'] ?? 0) === $userId
            && (int)($current['location_id'] ?? 0) === $locationId
            && !empty($current['secret'])
            && $createdAt > (time() - 600)
        ) {
            return $current;
        }

        $secret = $this->base32Encode(random_bytes(20));
        $payload = [
            'user_id' => $userId,
            'location_id' => $locationId,
            'secret' => $secret,
            'created_at' => time(),
        ];
        session()->put(self::SESSION_ENROLLMENT, $payload);

        return $payload;
    }

    public function provisioningUri(array $enrollment): string
    {
        $secret = strtoupper(trim((string)($enrollment['secret'] ?? '')));
        if ($secret === '') throw new \RuntimeException('Authenticator enrollment is missing.');

        $tenant = strtolower(trim((string)request()->getHost()));
        $tenant = explode('.', $tenant)[0] ?: 'restaurant';
        $label = rawurlencode('PayMyDine:'.$tenant);

        return 'otpauth://totp/'.$label
            .'?secret='.rawurlencode($secret)
            .'&issuer=PayMyDine&digits=6&period=30';
    }

    public function confirmEnrollment(int $userId, int $locationId, string $code): bool
    {
        if (!$this->ready()) return false;
        $enrollment = (array)session()->get(self::SESSION_ENROLLMENT, []);
        if (
            (int)($enrollment['user_id'] ?? 0) !== $userId
            || (int)($enrollment['location_id'] ?? 0) !== $locationId
            || empty($enrollment['secret'])
            || (int)($enrollment['created_at'] ?? 0) <= (time() - 600)
        ) {
            return false;
        }

        $matchedStep = $this->matchingStep((string)$enrollment['secret'], $code);
        if ($matchedStep === null) return false;

        $now = now();
        $existing = DB::table(self::TABLE)->where('user_id', $userId)->first();
        $values = [
            'staff_id' => (int)(app(PmdSiteAccessService::class)->identity()['staff_id'] ?? 0) ?: null,
            'mfa_type' => 'totp',
            'secret_encrypted' => Crypt::encryptString((string)$enrollment['secret']),
            'last_used_step' => $matchedStep,
            'confirmed_at' => $now,
            'disabled_at' => null,
            'updated_at' => $now,
        ];

        if ($existing) {
            DB::table(self::TABLE)->where('id', $existing->id)->update($values);
        } else {
            DB::table(self::TABLE)->insert(array_merge($values, [
                'user_id' => $userId,
                'created_at' => $now,
            ]));
        }

        session()->forget(self::SESSION_ENROLLMENT);
        return true;
    }

    /** Verify and consume one TOTP step so the same code cannot be replayed. */
    public function verify(int $userId, string $code): bool
    {
        if (!$this->ready() || $userId < 1) return false;

        $record = DB::table(self::TABLE)
            ->where('user_id', $userId)
            ->whereNotNull('confirmed_at')
            ->whereNull('disabled_at')
            ->first();
        if (!$record) return false;

        try {
            $secret = Crypt::decryptString((string)$record->secret_encrypted);
        } catch (\Throwable $error) {
            return false;
        }

        $matchedStep = $this->matchingStep($secret, $code);
        if ($matchedStep === null) return false;
        if ($record->last_used_step !== null && $matchedStep <= (int)$record->last_used_step) return false;

        DB::table(self::TABLE)->where('id', $record->id)->update([
            'last_used_step' => $matchedStep,
            'updated_at' => now(),
        ]);
        return true;
    }

    public function resetEnrollment(): void
    {
        session()->forget(self::SESSION_ENROLLMENT);
    }

    private function matchingStep(string $secret, string $input): ?int
    {
        $clean = preg_replace('/\D+/', '', $input);
        if (strlen($clean) !== self::DIGITS) return null;

        $current = intdiv(time(), self::STEP_SECONDS);
        foreach ([$current, $current - 1, $current + 1] as $step) {
            if (hash_equals($this->codeForStep($secret, $step), $clean)) return $step;
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
