<?php

namespace App\Services\RestaurantGroups;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;

final class Auth
{
    public const SESSION = 'pmd_group_owner_v1';
    public const MODE_SESSION = 'pmd_group_auth_mode_v1';

    /** @var array<string,bool> Request-local only; never survives PHP request end. */
    private array $sessionAllowedCache = [];

    public function __construct(private Store $store)
    {
    }

    private function resetRequestValidation(): void
    {
        $this->sessionAllowedCache = [];
    }

    /** null means positively identified legacy login; false means rejected. */
    public function attempt($manager, array $credentials, bool $login = true)
    {
        $this->resetRequestValidation();

        if ($login) {
            session()->forget([self::SESSION, self::MODE_SESSION]);
        }
        $username = strtolower(trim((string)($credentials['username'] ?? '')));
        $password = (string)($credentials['password'] ?? '');
        if ($username === '' || $password === '') return false;

        try {
            $local = $manager->getByCredentials(['username' => $username]);
            $managed = $local && ManagedIdentity::isManaged((int)$local->getKey());
            if (!$this->store->installed()) return $managed ? false : null;

            $owner = $this->store->central()->table('pmd_group_owners')
                ->whereRaw('LOWER(username) = ?', [$username])->first();
            if (!$owner) return $managed ? false : null;

            $tenantId = $this->store->currentTenantId();
            if ($tenantId < 1) return $managed ? false : null;
            $mapped = $this->store->central()->table('pmd_group_access')
                ->where('owner_id', (int)$owner->id)->where('tenant_id', $tenantId)->exists();
            // A username belonging to another company must not shadow this tenant.
            if (!$mapped && !$managed) return null;
            if (!$this->store->enabled() || $owner->status !== 'active'
                || !Hash::check($password, (string)$owner->password)) return false;

            $access = $this->store->access((int)$owner->id, $tenantId);
            $user = $manager->getById((int)$access->user_id);
            if (!$user || !$user->isSuperUser()
                || !ManagedIdentity::isManaged((int)$user->getKey())) return false;
            if (!$login) return $user;

            $user->clearResetPasswordCode();
            session()->put(self::SESSION, [
                'owner_id' => (int)$owner->id, 'tenant_id' => $tenantId,
                'user_id' => (int)$user->getKey(), 'auth_version' => (int)$owner->auth_version,
                'password_at' => time(), 'mfa_at' => 0, 'session_id' => null,
            ]);
            session()->put(self::MODE_SESSION, [
                'mode' => 'group',
                'tenant_id' => $tenantId,
                'user_id' => (int)$user->getKey(),
            ]);
            $manager->login($user, false);
            return $user;
        } catch (\Throwable $error) {
            if ($login) session()->forget(self::SESSION);
            logger()->warning('PMD group authentication refused', ['exception' => get_class($error)]);
            // Once lookup fails, never retry the password through local auth.
            return false;
        }
    }

    public function isLegacySessionForUserId(int $userId): bool
    {
        if ($userId < 1 || session()->has(self::SESSION)) {
            return false;
        }

        $mode = (array)session()->get(self::MODE_SESSION, []);

        return ($mode['mode'] ?? '') === 'legacy'
            && (int)($mode['user_id'] ?? 0) === $userId
            && (int)($mode['tenant_id'] ?? 0) > 0
            && (int)($mode['tenant_id'] ?? 0) === $this->store->currentTenantId();
    }

    public function sessionAllowed($user): bool
    {
        if (!$user) {
            return false;
        }

        $userId = (int)$user->getKey();
        $proof = (array)session()->get(self::SESSION, []);

        // A legacy login marker is bound to both tenant and user. Once present,
        // ordinary restaurants incur zero Restaurant Groups DB/schema queries
        // during AdminAuth::check(). Existing sessions without a marker are
        // classified once below and then become equally cheap.
        if (!$proof && $this->isLegacySessionForUserId($userId)) {
            return true;
        }

        $proofKey = implode(':', [
            (int)($proof['owner_id'] ?? 0),
            (int)($proof['tenant_id'] ?? 0),
            (int)($proof['user_id'] ?? 0),
            (int)($proof['auth_version'] ?? 0),
            (int)($proof['password_at'] ?? 0),
            (int)($proof['mfa_at'] ?? 0),
            (string)($proof['session_id'] ?? ''),
        ]);
        $cacheKey = $userId.'|'.(string)session()->getId().'|'.hash('sha256', $proofKey);

        if (array_key_exists($cacheKey, $this->sessionAllowedCache)) {
            return $this->sessionAllowedCache[$cacheKey];
        }

        try {
            if (!$proof && !ManagedIdentity::isManaged($userId)) {
                $this->rememberLegacy($user);
                return $this->sessionAllowedCache[$cacheKey] = true;
            }

            $this->owner(false, $user);

            return $this->sessionAllowedCache[$cacheKey] = true;
        } catch (\Throwable $error) {
            return $this->sessionAllowedCache[$cacheKey] = false;
        }
    }

    public function rememberLegacy($user): void
    {
        if (!$user) {
            return;
        }

        $tenantId = $this->store->currentTenantId();
        $userId = (int)$user->getKey();

        if ($tenantId < 1 || $userId < 1) {
            return;
        }

        session()->put(self::MODE_SESSION, [
            'mode' => 'legacy',
            'tenant_id' => $tenantId,
            'user_id' => $userId,
        ]);
    }

    public function owner(bool $requireMfa = true, $user = null): object
    {
        $user = $user ?: AdminAuth::getUser();
        $proof = (array)session()->get(self::SESSION, []);
        if (!$user || !$this->store->enabled() || empty($proof['owner_id'])) {
            throw new \DomainException('Sign in with the business account.');
        }
        $owner = $this->store->central()->table('pmd_group_owners')
            ->where('id', (int)$proof['owner_id'])->first();
        $tenantId = $this->store->currentTenantId();
        $maxAge = max(300, (int)config('pmd_groups.session_seconds', 43200));
        if (!$owner || !SecurityProof::password($proof, $owner, $tenantId, (int)$user->getKey(), time(), $maxAge)) {
            throw new \DomainException('Business account session expired. Sign in again.');
        }
        $access = $this->store->access((int)$owner->id, $tenantId);
        if ((int)$access->user_id !== (int)$user->getKey()) {
            throw new \DomainException('Owner access changed. Sign in again.');
        }
        if ($requireMfa && !SecurityProof::factor($proof, $owner, (string)session()->getId(), time(), $maxAge)) {
            throw new \DomainException('Complete Authenticator verification first.');
        }
        return $owner;
    }

    public function verified(int $userId, int $locationId): void
    {
        $this->resetRequestValidation();
        $owner = $this->owner(false);
        $proof = (array)session()->get(self::SESSION, []);
        $site = $this->store->site((int)$proof['tenant_id']);
        if ((int)($proof['user_id'] ?? 0) !== $userId || (int)$site->location_id !== $locationId
            || !$owner->confirmed_at || !$owner->secret_encrypted) {
            throw new \DomainException('Authenticator verification could not be linked to this location.');
        }
        $proof['mfa_at'] = time();
        $proof['session_id'] = (string)session()->getId();
        session()->put(self::SESSION, $proof);
        session()->put(\App\Services\PmdOwnerTotpService::SESSION_VERIFIED, [
            'user_id' => $userId, 'location_id' => $locationId,
            'session_id' => (string)session()->getId(), 'verified_at' => time(), 'method' => 'group_totp',
        ]);
    }

    public function logout(): void
    {
        $this->resetRequestValidation();
        session()->forget([self::SESSION, self::MODE_SESSION, \App\Services\PmdOwnerTotpService::SESSION_VERIFIED,
            \App\Services\PmdOwnerTotpService::SESSION_ENROLLMENT]);
    }

    public function changePassword(string $current, string $next): void
    {
        $this->resetRequestValidation();
        $owner = $this->owner(true);
        if (strlen($next) < 14 || strlen($next) > 128 || !Hash::check($current, (string)$owner->password)) {
            throw new \DomainException('Check the current password. The new password needs at least 14 characters.');
        }
        $db = $this->store->central();
        $db->transaction(function () use ($db, $owner, $next) {
            $changed = $db->table('pmd_group_owners')->where('id', $owner->id)
                ->where('auth_version', $owner->auth_version)->where('status', 'active')->update([
                    'password' => Hash::make($next), 'auth_version' => (int)$owner->auth_version + 1,
                    'updated_at' => now(),
                ]);
            if ($changed !== 1) throw new \DomainException('The account changed. Sign in again.');
            $this->store->audit('owner', (int)$owner->id, 'password_changed', null,
                ['tenant_id' => $this->store->currentTenantId()]);
        });
        $this->logout();
        AdminAuth::logout();
        Session::forget('pmd_admin_auth_v3');
        Cookie::queue(Cookie::forget('pmd_admin_auth_v3'));
    }
}
