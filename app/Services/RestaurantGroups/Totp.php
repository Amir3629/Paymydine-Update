<?php

namespace App\Services\RestaurantGroups;

use Admin\Facades\AdminAuth;
use App\Services\PmdOwnerTotpService;
use App\Services\PmdSiteAccessService;
use Illuminate\Support\Facades\Crypt;

final class Totp extends PmdOwnerTotpService
{
    /** null is reserved for a positively identified unmanaged identity. */
    private function ownerForUser(int $userId): ?object
    {
        $auth = app(Auth::class);
        if ($auth->isLegacySessionForUserId($userId)) return null;
        if (!ManagedIdentity::isManaged($userId)) return null;
        $owner = $auth->owner(false);
        $proof = (array)session()->get(Auth::SESSION, []);
        if ((int)($proof['user_id'] ?? 0) !== $userId) {
            throw new \DomainException('Sign in with the business account.');
        }
        return $owner;
    }

    private function assertLocation(int $userId, int $locationId): void
    {
        $identity = app(PmdSiteAccessService::class)->identity();
        $site = app(Store::class)->site(app(Store::class)->currentTenantId());
        if ($locationId < 1 || (int)$site->location_id !== $locationId
            || (int)($identity['user_id'] ?? 0) !== $userId
            || (int)($identity['location_id'] ?? 0) !== $locationId) {
            throw new \DomainException('Authenticator location does not match this sign-in.');
        }
    }

    public function ready(): bool
    {
        try {
            $user = AdminAuth::getUser();
            if (!$user) return parent::ready();

            $owner = $this->ownerForUser((int)$user->getKey());

            return $owner ? true : parent::ready();
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function enabled(int $userId): bool
    {
        try {
            $owner = $this->ownerForUser($userId);
            return $owner ? !empty($owner->confirmed_at) && !empty($owner->secret_encrypted)
                : parent::enabled($userId);
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function enrollment(int $userId, int $locationId): array
    {
        $owner = $this->ownerForUser($userId);
        if (!$owner) return parent::enrollment($userId, $locationId);
        $this->assertLocation($userId, $locationId);
        if ($owner->confirmed_at) {
            throw new \DomainException('Authenticator is already connected. Use its verification code.');
        }
        $tenantId = app(Store::class)->currentTenantId();
        $current = (array)session()->get(self::SESSION_ENROLLMENT, []);
        if (SecurityProof::enrollment($current, $owner, $userId, $locationId, $tenantId, time())) return $current;
        $payload = [
            'user_id' => $userId, 'location_id' => $locationId, 'tenant_id' => $tenantId,
            'group_owner_id' => (int)$owner->id, 'auth_version' => (int)$owner->auth_version,
            'secret' => $this->encodeSecret(random_bytes(20)), 'created_at' => time(),
        ];
        session()->put(self::SESSION_ENROLLMENT, $payload);
        return $payload;
    }

    public function provisioningUri(array $enrollment): string
    {
        $owner = $this->ownerForUser((int)($enrollment['user_id'] ?? 0));
        if (!$owner) {
            if (!empty($enrollment['group_owner_id'])) throw new \DomainException('Start a new sign-in.');
            return parent::provisioningUri($enrollment);
        }
        $tenantId = app(Store::class)->currentTenantId();
        $stored = (array)session()->get(self::SESSION_ENROLLMENT, []);
        if (!SecurityProof::enrollment($enrollment, $owner, (int)$enrollment['user_id'],
                (int)($enrollment['location_id'] ?? 0), $tenantId, time())
            || !hash_equals((string)($stored['secret'] ?? ''), (string)$enrollment['secret'])) {
            throw new \DomainException('Authenticator setup expired. Start a new sign-in.');
        }
        $site = app(Store::class)->site($tenantId);
        $group = app(Store::class)->group((int)$site->group_id);
        $label = trim((string)preg_replace('/[^A-Za-z0-9._-]+/', '-', (string)$group->name), '-._');
        $label = substr($label ?: 'Business', 0, 15);
        // Same compact QR contract as the canonical Owner TOTP service.
        $uri = 'otpauth://totp/'.rawurlencode('PayMyDine:'.$label)
            .'?secret='.rawurlencode((string)$enrollment['secret']).'&issuer=PayMyDine';
        if (strlen($uri) > 106) throw new \RuntimeException('Authenticator QR payload is too long.');
        return $uri;
    }

    public function confirmEnrollment(int $userId, int $locationId, string $code): bool
    {
        try {
            $owner = $this->ownerForUser($userId);
            if (!$owner) return parent::confirmEnrollment($userId, $locationId, $code);
            $this->assertLocation($userId, $locationId);
            $store = app(Store::class);
            $tenantId = $store->currentTenantId();
            $enrollment = (array)session()->get(self::SESSION_ENROLLMENT, []);
            if (!SecurityProof::enrollment($enrollment, $owner, $userId, $locationId, $tenantId, time())) return false;
            $step = Policy::matchingTotpStep((string)$enrollment['secret'], $code, time(), null);
            if ($step === null) return false;
            $db = $store->central();
            $changed = $db->transaction(function () use ($db, $owner, $enrollment, $step, $store, $tenantId, $userId, $locationId) {
                $locked = $db->table('pmd_group_owners')->where('id', $owner->id)->lockForUpdate()->first();
                if (!$locked || !SecurityProof::enrollment($enrollment, $locked, $userId, $locationId, $tenantId, time())) return false;
                // A second tab cannot replace an already confirmed factor.
                $rows = $db->table('pmd_group_owners')->where('id', $owner->id)
                    ->where('auth_version', $owner->auth_version)->where('status', 'active')
                    ->whereNull('confirmed_at')->update([
                        'secret_encrypted' => Crypt::encryptString((string)$enrollment['secret']),
                        'confirmed_at' => now(), 'last_used_step' => $step, 'updated_at' => now(),
                    ]);
                if ($rows !== 1) return false;
                $store->audit('owner', (int)$owner->id, 'mfa_enrolled', (int)$store->site($tenantId)->group_id,
                    ['tenant_id' => $tenantId]);
                return true;
            });
            if (!$changed) return false;
            // Do not produce a verified session until the DB commit succeeds.
            app(Auth::class)->verified($userId, $locationId);
            session()->forget(self::SESSION_ENROLLMENT);
            return true;
        } catch (\Throwable $error) {
            logger()->warning('PMD group MFA enrollment refused', ['exception' => get_class($error)]);
            return false;
        }
    }

    public function verify(int $userId, string $code): bool
    {
        try {
            $owner = $this->ownerForUser($userId);
            if (!$owner) return parent::verify($userId, $code);
            $identity = app(PmdSiteAccessService::class)->identity();
            $locationId = (int)($identity['location_id'] ?? 0);
            $this->assertLocation($userId, $locationId);
            $store = app(Store::class);
            $db = $store->central();
            $verified = $db->transaction(function () use ($db, $owner, $code, $store) {
                $locked = $db->table('pmd_group_owners')->where('id', $owner->id)->lockForUpdate()->first();
                if (!$locked || $locked->status !== 'active'
                    || (int)$locked->auth_version !== (int)$owner->auth_version
                    || !$locked->confirmed_at || !$locked->secret_encrypted) return false;
                $secret = Crypt::decryptString((string)$locked->secret_encrypted);
                $step = Policy::matchingTotpStep($secret, $code, time(),
                    $locked->last_used_step === null ? null : (int)$locked->last_used_step);
                if ($step === null) return false;
                $db->table('pmd_group_owners')->where('id', $locked->id)->update([
                    'last_used_step' => $step, 'updated_at' => now(),
                ]);
                $tenantId = $store->currentTenantId();
                $store->audit('owner', (int)$locked->id, 'mfa_verified', (int)$store->site($tenantId)->group_id,
                    ['tenant_id' => $tenantId]);
                return true;
            });
            if (!$verified) return false;
            app(Auth::class)->verified($userId, $locationId);
            return true;
        } catch (\Throwable $error) {
            logger()->warning('PMD group MFA verification refused', ['exception' => get_class($error)]);
            return false;
        }
    }

    public function sessionVerified(int $userId, int $locationId, int $maxAgeSeconds = 600): bool
    {
        try {
            if ($this->ownerForUser($userId)) {
                app(Auth::class)->owner(true);
                $this->assertLocation($userId, $locationId);
            }
            return parent::sessionVerified($userId, $locationId, $maxAgeSeconds);
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function clearSessionVerification(): void
    {
        parent::clearSessionVerification();
        $proof = (array)session()->get(Auth::SESSION, []);
        if ($proof) {
            $proof['mfa_at'] = 0;
            $proof['session_id'] = null;
            session()->put(Auth::SESSION, $proof);
        }
    }

    private function encodeSecret(string $binary): string
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
        if ($bits > 0) $encoded .= $alphabet[($buffer << (5 - $bits)) & 31];
        return $encoded;
    }
}
