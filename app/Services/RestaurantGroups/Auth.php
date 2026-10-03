<?php

namespace App\Services\RestaurantGroups;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;

final class Auth
{
    public const SESSION = 'pmd_group_owner_v1';

    public function __construct(private Store $store)
    {
    }

    /**
     * null = legacy/unmanaged identity, false = managed login rejected,
     * user model = central group-owner login accepted.
     */
    public function attempt($manager, array $credentials, bool $login = true)
    {
        if ($login) session()->forget(self::SESSION);

        $username = strtolower(trim((string)($credentials['username'] ?? '')));
        $password = (string)($credentials['password'] ?? '');

        if ($username === '' || $password === '') return null;

        $local = $manager->getByCredentials(['username' => $username]);
        $managedLocal = $local && $this->store->managedLocalUser((int)$local->getKey());

        if (!(bool)config('pmd_groups.enabled', true)) {
            return $managedLocal ? false : null;
        }

        try {
            if (!$this->store->installed()) {
                return $managedLocal ? false : null;
            }

            $owner = $this->store->central()
                ->table('pmd_group_owners')
                ->whereRaw('LOWER(username) = ?', [$username])
                ->first();

            if (!$owner) return $managedLocal ? false : null;

            $tenantId = $this->store->currentTenantId();
            if ($tenantId < 1) return $managedLocal ? false : null;

            $mappedHere = $this->store->central()->table('pmd_group_access')
                ->where('owner_id', (int)$owner->id)
                ->where('tenant_id', $tenantId)
                ->exists();

            // A group-owner username in another company must not shadow an
            // unrelated legacy local account on this tenant.
            if (!$mappedHere && !$managedLocal) return null;

            if (
                $owner->status !== 'active'
                || !Hash::check($password, (string)$owner->password)
            ) {
                return false;
            }

            $access = $this->store->access((int)$owner->id, $tenantId);
            $user = $manager->getById((int)$access->user_id);

            if (!$user || !$user->isSuperUser()) return false;
            if (!$login) return $user;

            $user->clearResetPasswordCode();

            session()->put(self::SESSION, [
                'owner_id' => (int)$owner->id,
                'tenant_id' => $tenantId,
                'user_id' => (int)$user->getKey(),
                'auth_version' => (int)$owner->auth_version,
                'password_at' => time(),
                'mfa_at' => 0,
                'session_id' => null,
            ]);

            try {
                // Never create a cross-subdomain remember cookie for a group owner.
                $manager->login($user, false);
            } catch (\Throwable $error) {
                session()->forget(self::SESSION);
                throw $error;
            }

            return $user;
        } catch (\DomainException $error) {
            return $managedLocal ? false : null;
        } catch (\Throwable $error) {
            logger()->error('PMD group owner authentication failure', [
                'host' => request()->getHost(),
                'username' => $username,
                'managed_local' => (bool)$managedLocal,
                'message' => $error->getMessage(),
            ]);

            // Existing restaurants keep legacy auth during a central group
            // outage; already-linked identities fail closed.
            return $managedLocal ? false : null;
        }
    }

    public function sessionAllowed($user): bool
    {
        if (!$user || !$this->store->managedLocalUser((int)$user->getKey())) {
            return true;
        }

        try {
            $this->owner(false, $user);
            return true;
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function owner(bool $requireMfa = true, $user = null): object
    {
        $user = $user ?: AdminAuth::getUser();
        $proof = (array)session()->get(self::SESSION, []);

        if (
            !$user
            || !$this->store->enabled()
            || empty($proof['owner_id'])
            || (int)($proof['tenant_id'] ?? 0) !== $this->store->currentTenantId()
            || (int)($proof['user_id'] ?? 0) !== (int)$user->getKey()
            || (int)($proof['password_at'] ?? 0)
                < time() - max(300, (int)config('pmd_groups.session_seconds', 43200))
        ) {
            throw new \DomainException('Sign in with the business account.');
        }

        $owner = $this->store->central()->table('pmd_group_owners')
            ->where('id', (int)$proof['owner_id'])
            ->first();

        if (
            !$owner
            || $owner->status !== 'active'
            || (int)$owner->auth_version !== (int)($proof['auth_version'] ?? 0)
        ) {
            throw new \DomainException('Business account session expired.');
        }

        $this->store->access((int)$owner->id, (int)$proof['tenant_id']);

        if (
            $requireMfa
            && (
                empty($proof['mfa_at'])
                || !$owner->confirmed_at
                || !hash_equals((string)($proof['session_id'] ?? ''), (string)session()->getId())
            )
        ) {
            throw new \DomainException('Complete Authenticator verification first.');
        }

        return $owner;
    }

    public function verified(int $userId, int $locationId): void
    {
        $owner = $this->owner(false);
        $proof = (array)session()->get(self::SESSION, []);
        $site = $this->store->site((int)$proof['tenant_id']);

        if (
            (int)($proof['user_id'] ?? 0) !== $userId
            || (int)$site->location_id !== $locationId
        ) {
            throw new \DomainException('Authenticator location mismatch.');
        }

        $proof['mfa_at'] = time();
        $proof['session_id'] = (string)session()->getId();
        $proof['auth_version'] = (int)$owner->auth_version;
        session()->put(self::SESSION, $proof);

        session()->put(\App\Services\PmdOwnerTotpService::SESSION_VERIFIED, [
            'user_id' => $userId,
            'location_id' => $locationId,
            'session_id' => (string)session()->getId(),
            'verified_at' => time(),
            'method' => 'group_totp',
        ]);
    }

    public function logout(): void
    {
        session()->forget(self::SESSION);
    }

    public function changePassword(string $current, string $next): void
    {
        $owner = $this->owner(true);

        if (
            strlen($next) < 14
            || strlen($next) > 128
            || !Hash::check($current, (string)$owner->password)
        ) {
            throw new \DomainException(
                'Check your current password. Use at least 14 characters for the new password.'
            );
        }

        $changed = $this->store->central()->table('pmd_group_owners')
            ->where('id', $owner->id)
            ->where('auth_version', $owner->auth_version)
            ->update([
                'password' => Hash::make($next),
                'auth_version' => (int)$owner->auth_version + 1,
                'updated_at' => now(),
            ]);

        if ($changed !== 1) {
            throw new \DomainException('The account changed. Sign in again.');
        }

        $this->store->audit(
            'owner',
            (int)$owner->id,
            'password_changed',
            null,
            ['tenant_id' => $this->store->currentTenantId()]
        );

        session()->forget(self::SESSION);
        AdminAuth::logout();
        Session::forget('pmd_admin_auth_v3');
        Cookie::queue(Cookie::forget('pmd_admin_auth_v3'));
    }
}
