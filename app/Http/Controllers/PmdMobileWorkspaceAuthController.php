<?php

namespace App\Http\Controllers;

use Admin\Models\Users_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
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

        $deviceIdentity = $deviceAuth->authenticate($request);
        $pairedUser = $deviceIdentity['user'] ?? null;
        if (!$pairedUser || !(bool)($pairedUser->is_activated ?? false)) {
            abort(403, 'This paired PayMyDine account is no longer active.');
        }

        $typedUsername = trim((string)$data['username']);
        $storedUsername = trim((string)($pairedUser->username ?? ''));
        $passwordHash = (string)($pairedUser->password ?? '');

        if (
            $typedUsername === ''
            || $storedUsername === ''
            || !hash_equals(
                mb_strtolower($storedUsername),
                mb_strtolower($typedUsername)
            )
            || $passwordHash === ''
            || !Hash::check((string)$data['password'], $passwordHash)
        ) {
            abort(401, 'Username or password is incorrect.');
        }

        $roles = app(PmdDefaultStaffRoleService::class);
        $roleCode = $roles->roleCodeForUser($pairedUser);
        $route = $roles->routeForRoleCode($roleCode);

        if ($roleCode === '' || $route === null || trim($route) === '') {
            abort(403, 'This PayMyDine account has no Android destination.');
        }

        // Backward compatibility for 0.3.2: if the old app explicitly asks for
        // a surface, keep enforcing that exact surface boundary.
        $requestedSurface = strtolower(trim((string)($data['surface'] ?? '')));
        if (
            $requestedSurface !== ''
            && !$this->roleMayOpen($roleCode, $requestedSurface)
        ) {
            abort(403, 'This PayMyDine account cannot open that workspace.');
        }

        $surface = $this->surfaceForRole($roleCode);
        $leaseUntil = now()->addHours(8);

        return response()->json([
            'ok' => true,
            'surface' => $surface,
            'username' => $storedUsername,
            'staff_name' => (string)($pairedUser->staff_name ?? $storedUsername),
            'user_id' => (int)$pairedUser->getKey(),
            'staff_id' => (int)($pairedUser->staff_id ?? 0),
            'role_code' => $roleCode,
            'route' => $route,
            'lease_expires_at' => $leaseUntil->timestamp,
            'lease_expires_iso' => $leaseUntil->toIso8601String(),
        ], 200, ['Cache-Control' => 'no-store, private']);
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
