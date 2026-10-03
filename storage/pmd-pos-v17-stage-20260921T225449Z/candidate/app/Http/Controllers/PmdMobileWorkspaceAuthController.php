<?php

namespace App\Http\Controllers;

use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;

/**
 * PMD_ANDROID_WORKSPACE_REAUTH_V1
 *
 * Re-authenticates the already-paired restaurant identity before Android opens
 * or switches an operational workspace. The password is checked in memory and
 * is never persisted or returned to the device.
 */
final class PmdMobileWorkspaceAuthController extends Controller
{
    public function __invoke(
        Request $request,
        PmdMobileDeviceAuthService $deviceAuth
    ) {
        $data = $request->validate([
            'surface' => ['required', 'string', 'in:pos,kds,reservations'],
            'username' => ['required', 'string', 'max:191'],
            'password' => ['required', 'string', 'min:6', 'max:191'],
        ]);

        $identity = $deviceAuth->authenticate($request);
        $user = $identity['user'] ?? null;
        if (!$user || !(bool)($user->is_activated ?? false)) {
            abort(403, 'This paired PayMyDine account is no longer active.');
        }

        $typedUsername = trim((string)$data['username']);
        $storedUsername = trim((string)($user->username ?? ''));
        $passwordHash = (string)($user->password ?? '');

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

        $surface = (string)$data['surface'];
        $roleCode = (string)($identity['role_code'] ?? '');

        if (!$this->roleMayOpen($roleCode, $surface)) {
            abort(403, 'This PayMyDine account cannot open that workspace.');
        }

        $leaseUntil = now()->addHours(8);

        return response()->json([
            'ok' => true,
            'surface' => $surface,
            'username' => $storedUsername,
            'lease_expires_at' => $leaseUntil->timestamp,
            'lease_expires_iso' => $leaseUntil->toIso8601String(),
        ], 200, ['Cache-Control' => 'no-store, private']);
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
