<?php

namespace App\Http\Controllers;

use Admin\Models\Users_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use App\Services\PmdMobileSync\PmdMobileStaffGrantService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;

/**
 * PMD_ANDROID_STAFF_LOGIN_ROUTER_V2
 *
 * Android no longer asks the operator to choose a workspace. The paired device
 * proves restaurant/device trust, then canonical username/password credentials
 * determine the current PayMyDine role and its default destination.
 *
 * V17 surface-based authorization remains accepted for older 0.3.2 clients.
 */
final class PmdMobileWorkspaceAuthController extends Controller
{
    public function __invoke(
        Request $request,
        PmdMobileDeviceAuthService $deviceAuth
    ) {
        $data = $request->validate([
            'surface' => ['nullable', 'string', 'in:pos,kds,reservations'],
            'username' => ['required', 'string', 'max:191'],
            'password' => ['required', 'string', 'min:6', 'max:191'],
        ]);

        // PMD_ANDROID_DEVICE_TRUST_BEFORE_STAFF_LOGIN_V3
        // The tablet was already paired. At this point verify only device +
        // restaurant trust; the human identity is exactly what this request is
        // about to authenticate.
        $deviceIdentity = $deviceAuth->authenticateDevice($request);

        $typedUsername = trim((string)$data['username']);
        if ($typedUsername === '') {
            $this->fail(401, 'Username or password is incorrect.');
        }

        // Keep the Android login identity compatible with the canonical web
        // login convention: "usernameportal" selects My Work for that person.
        $destination = 'workspace';
        $lookupUsername = $typedUsername;
        $lower = mb_strtolower($typedUsername);
        if (
            mb_strlen($typedUsername) > 6
            && str_ends_with($lower, 'portal')
        ) {
            $lookupUsername = trim(
                mb_substr($typedUsername, 0, mb_strlen($typedUsername) - 6)
            );
            $destination = 'staff';
        }

        if ($lookupUsername === '') {
            $this->fail(401, 'Username or password is incorrect.');
        }

        $user = Users_model::query()
            ->whereRaw(
                'LOWER(username) = ?',
                [mb_strtolower($lookupUsername)]
            )
            ->first();
        $staff = $user ? $user->staff : null;
        $passwordHash = (string)($user->password ?? '');

        if (
            !$user
            || !$staff
            || (isset($user->is_activated) && !(bool)$user->is_activated)
            || (isset($staff->staff_status) && !(bool)$staff->staff_status)
            || $passwordHash === ''
            || !Hash::check((string)$data['password'], $passwordHash)
        ) {
            $this->fail(401, 'Username or password is incorrect.');
        }

        $grants = app(PmdMobileStaffGrantService::class);
        $locationId = (int)($deviceIdentity['location_id'] ?? 0);
        if (!$grants->userMayUseLocation($user, $staff, $locationId)) {
            $this->fail(403, 'This PayMyDine account cannot use this restaurant location.');
        }

        $roles = app(PmdDefaultStaffRoleService::class);
        $roleCode = $roles->roleCodeForUser($user);
        $route = $roles->routeForRoleCode($roleCode);

        if ($roleCode === '' || $route === null || trim($route) === '') {
            $this->fail(403, 'This PayMyDine account has no Android destination.');
        }

        // Backward compatibility for 0.3.2: if the old app explicitly asks for
        // a surface, keep enforcing that exact surface boundary.
        $requestedSurface = strtolower(trim((string)($data['surface'] ?? '')));
        if (
            $requestedSurface !== ''
            && !$this->roleMayOpen($roleCode, $requestedSurface)
        ) {
            $this->fail(403, 'This PayMyDine account cannot open that workspace.');
        }

        if ($destination === 'staff') {
            $route = 'mywork';
        }

        $surface = $this->surfaceForRole($roleCode);
        $leaseUntil = now()->addHours(8);
        $staffGrant = $grants->issue($deviceIdentity, $user);
        $storedUsername = trim((string)($user->username ?? $typedUsername));

        return response()->json([
            'ok' => true,
            'surface' => $surface,
            'username' => $storedUsername,
            'staff_name' => (string)($user->staff_name ?? $storedUsername),
            'user_id' => (int)$user->getKey(),
            'staff_id' => (int)($user->staff_id ?? 0),
            'role_code' => $roleCode,
            'route' => $route,
            'staff_grant' => $staffGrant,
            'lease_expires_at' => $leaseUntil->timestamp,
            'lease_expires_iso' => $leaseUntil->toIso8601String(),
        ], 200, ['Cache-Control' => 'no-store, private']);
    }

    private function fail(int $status, string $message): void
    {
        throw new HttpResponseException(
            response()->json(
                [
                    'ok' => false,
                    'message' => $message,
                ],
                $status,
                ['Cache-Control' => 'no-store, private']
            )
        );
    }

    private function surfaceForRole(string $roleCode): string
    {
        $roles = PmdDefaultStaffRoleService::class;

        if ($roleCode === $roles::CASHIER || $roleCode === $roles::WAITER) {
            return 'pos';
        }
        if (str_starts_with($roleCode, $roles::KDS_PREFIX)) {
            return 'kds';
        }
        if ($roleCode === $roles::RESERVATIONS) {
            return 'reservations';
        }

        return 'web';
    }

    private function roleMayOpen(string $roleCode, string $surface): bool
    {
        $roles = PmdDefaultStaffRoleService::class;

        if ($roleCode === $roles::OWNER || $roleCode === $roles::MANAGER) {
            return true;
        }

        if ($surface === 'pos') {
            return $roleCode === $roles::CASHIER
                || $roleCode === $roles::WAITER;
        }

        if ($surface === 'kds') {
            return str_starts_with($roleCode, $roles::KDS_PREFIX);
        }

        if ($surface === 'reservations') {
            return $roleCode === $roles::RESERVATIONS;
        }

        return false;
    }
}
