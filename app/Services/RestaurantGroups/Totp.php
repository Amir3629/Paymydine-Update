<?php

namespace App\Services\RestaurantGroups;

use App\Services\PmdOwnerTotpService;
use App\Services\PmdSiteAccessService;
use Illuminate\Support\Facades\Crypt;

final class Totp extends PmdOwnerTotpService
{
    private function groupOwnerForUser(int $userId): ?object
    {
        try {
            $store = app(Store::class);
            if (!$store->managedLocalUser($userId)) return null;

            $owner = app(Auth::class)->owner(false);
            $proof = (array)session()->get(Auth::SESSION, []);

            if ((int)($proof['user_id'] ?? 0) !== $userId) return null;

            return $owner;
        } catch (\Throwable $error) {
            return null;
        }
    }

    public function ready(): bool
    {
        $userId = (int)optional(\Admin\Facades\AdminAuth::getUser())->getKey();
        return $this->groupOwnerForUser($userId)
            ? app(Store::class)->enabled()
            : parent::ready();
    }

    public function enabled(int $userId): bool
    {
        $owner = $this->groupOwnerForUser($userId);
        if (!$owner) return parent::enabled($userId);

        return !empty($owner->secret_encrypted)
            && !empty($owner->confirmed_at);
    }

    public function enrollment(int $userId, int $locationId): array
    {
        $owner = $this->groupOwnerForUser($userId);
        if (!$owner) return parent::enrollment($userId, $locationId);

        if ($locationId < 1) {
            throw new \InvalidArgumentException('Owner and restaurant location are required.');
        }

        $current = (array)session()->get(self::SESSION_ENROLLMENT, []);
        $createdAt = (int)($current['created_at'] ?? 0);

        if (
            (int)($current['user_id'] ?? 0) === $userId
            && (int)($current['location_id'] ?? 0) === $locationId
            && (int)($current['group_owner_id'] ?? 0) === (int)$owner->id
            && !empty($current['secret'])
            && $createdAt > time() - 600
        ) {
            return $current;
        }

        $secret = $this->base32Encode(random_bytes(20));
        $payload = [
            'user_id' => $userId,
            'location_id' => $locationId,
            'group_owner_id' => (int)$owner->id,
            'secret' => $secret,
            'created_at' => time(),
        ];

        session()->put(self::SESSION_ENROLLMENT, $payload);

        return $payload;
    }

    public function provisioningUri(array $enrollment): string
    {
        if (empty($enrollment['group_owner_id'])) {
            return parent::provisioningUri($enrollment);
        }

        $secret = strtoupper(trim((string)($enrollment['secret'] ?? '')));
        if ($secret === '') {
            throw new \RuntimeException('Authenticator enrollment is missing.');
        }

        $owner = app(Store::class)->central()
            ->table('pmd_group_owners')
            ->where('id', (int)$enrollment['group_owner_id'])
            ->first();

        if (!$owner) {
            throw new \RuntimeException('Business owner account is missing.');
        }

        $proof = (array)session()->get(Auth::SESSION, []);
        $site = app(Store::class)->site((int)($proof['tenant_id'] ?? 0));
        $group = app(Store::class)->group((int)$site->group_id);

        $account = preg_replace(
            '/[^A-Za-z0-9._-]+/',
            '-',
            trim((string)$group->name)
        );
        $account = substr(trim((string)$account, '-._'), 0, 28) ?: 'Business';

        return 'otpauth://totp/'.rawurlencode('PayMyDine:'.$account)
            .'?secret='.rawurlencode($secret)
            .'&issuer='.rawurlencode('PayMyDine');
    }

    public function confirmEnrollment(
        int $userId,
        int $locationId,
        string $code
    ): bool {
        $owner = $this->groupOwnerForUser($userId);
        if (!$owner) {
            return parent::confirmEnrollment($userId, $locationId, $code);
        }

        $enrollment = (array)session()->get(self::SESSION_ENROLLMENT, []);

        if (
            (int)($enrollment['user_id'] ?? 0) !== $userId
            || (int)($enrollment['location_id'] ?? 0) !== $locationId
            || (int)($enrollment['group_owner_id'] ?? 0) !== (int)$owner->id
            || empty($enrollment['secret'])
            || (int)($enrollment['created_at'] ?? 0) <= time() - 600
        ) {
            return false;
        }

        $step = Policy::matchingTotpStep(
            (string)$enrollment['secret'],
            $code,
            time(),
            null
        );

        if ($step === null) return false;

        $changed = app(Store::class)->central()
            ->table('pmd_group_owners')
            ->where('id', $owner->id)
            ->where('auth_version', $owner->auth_version)
            ->update([
                'secret_encrypted' => Crypt::encryptString((string)$enrollment['secret']),
                'last_used_step' => $step,
                'confirmed_at' => now(),
                'updated_at' => now(),
            ]);

        if ($changed !== 1) return false;

        session()->forget(self::SESSION_ENROLLMENT);
        app(Auth::class)->verified($userId, $locationId);

        app(Store::class)->audit(
            'owner',
            (int)$owner->id,
            'mfa_enrolled',
            (int)app(Store::class)->site(app(Store::class)->currentTenantId())->group_id,
            ['tenant_id' => app(Store::class)->currentTenantId()]
        );

        return true;
    }

    public function verify(int $userId, string $code): bool
    {
        $owner = $this->groupOwnerForUser($userId);
        if (!$owner) return parent::verify($userId, $code);

        $store = app(Store::class);
        $db = $store->central();

        return (bool)$db->transaction(function () use ($db, $store, $owner, $userId, $code) {
            $locked = $db->table('pmd_group_owners')
                ->where('id', $owner->id)
                ->lockForUpdate()
                ->first();

            if (!$locked || !$locked->confirmed_at || !$locked->secret_encrypted) {
                return false;
            }

            try {
                $secret = Crypt::decryptString((string)$locked->secret_encrypted);
            } catch (\Throwable $error) {
                return false;
            }

            $step = Policy::matchingTotpStep(
                $secret,
                $code,
                time(),
                $locked->last_used_step === null ? null : (int)$locked->last_used_step
            );

            if ($step === null) return false;

            $db->table('pmd_group_owners')
                ->where('id', $locked->id)
                ->update([
                    'last_used_step' => $step,
                    'updated_at' => now(),
                ]);

            $identity = app(PmdSiteAccessService::class)->identity();
            $locationId = (int)($identity['location_id'] ?? 0);
            if ($locationId < 1) return false;

            app(Auth::class)->verified($userId, $locationId);

            $site = $store->site($store->currentTenantId());
            $store->audit(
                'owner',
                (int)$locked->id,
                'mfa_verified',
                (int)$site->group_id,
                ['tenant_id' => $store->currentTenantId()]
            );

            return true;
        });
    }

    public function sessionVerified(
        int $userId,
        int $locationId,
        int $maxAgeSeconds = 600
    ): bool {
        return parent::sessionVerified($userId, $locationId, $maxAgeSeconds);
    }

    public function clearSessionVerification(): void
    {
        parent::clearSessionVerification();
    }

    public function resetEnrollment(): void
    {
        parent::resetEnrollment();
    }

    private function base32Encode(string $binary): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $buffer = 0;
        $bits = 0;
        $encoded = '';

        foreach (unpack('C*', $binary) as $byte) {
            $buffer = ($buffer << 8) | $byte;
            $bits += 8;

            while ($bits >= 5) {
                $bits -= 5;
                $encoded .= $alphabet[($buffer >> $bits) & 31];
                $buffer &= (1 << $bits) - 1;
            }
        }

        if ($bits > 0) {
            $encoded .= $alphabet[($buffer << (5 - $bits)) & 31];
        }

        return $encoded;
    }
}
