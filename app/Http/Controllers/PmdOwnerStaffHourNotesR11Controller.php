<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use Admin\Services\PmdRoleDashboardDataV1;
use App\Services\PmdOwnerStaffHourNotesR11;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_OWNER_STAFF_HOUR_NOTES_ENDPOINTS_R11
 * Explicit authenticated, restaurant-scoped endpoints. Browser POSTs retain
 * the global web CSRF middleware; a Staff account can confirm ONLY its own
 * materialized receipt, never arbitrary notes or another staff account.
 */
final class PmdOwnerStaffHourNotesR11Controller extends Controller
{
    private function ownerLocation(): int
    {
        if (!AdminAuth::isLogged()) abort(401, 'Sign in to continue.');
        $role = app(PmdDefaultStaffRoleService::class)
            ->roleCodeForUser(AdminAuth::getUser());
        if ($role !== PmdDefaultStaffRoleService::OWNER) abort(403);
        $location = (int)(app(PmdRoleDashboardDataV1::class)->resolveWorkspaceLocation() ?: 0);
        if ($location < 1) abort(403, 'No accessible restaurant selected.');
        return $location;
    }

    private function staffIdentity(): array
    {
        if (!AdminAuth::isLogged()) abort(401, 'Sign in to continue.');
        $staff = optional(AdminAuth::getUser())->staff;
        $staffId = (int)optional($staff)->staff_id;
        if ($staffId < 1 || !(bool)optional($staff)->staff_status
            || !Schema::hasTable('pmd_operational_people')) {
            abort(403, 'An active Staff Portal profile is required.');
        }
        // Same current-person resolver as canonical PmdStaffPortalV5Controller.
        // NEVER accept location_id or staff_id from a request parameter.
        $person = DB::table('pmd_operational_people')
            ->where('staff_id', $staffId)
            ->where('is_active', 1)
            ->orderBy('location_id')->orderBy('id')->first();
        if (!$person || (int)$person->location_id < 1) abort(403);
        return ['location_id' => (int)$person->location_id, 'staff_id' => $staffId];
    }

    public function ownerIndex(Request $request, PmdOwnerStaffHourNotesR11 $notes)
    {
        $location = $this->ownerLocation();
        if (!$notes->ready()) return $this->json([
            'ok' => true, 'setup_required' => true,
            'message' => 'Team notes are not set up for this restaurant yet. Ask an administrator to finish setup.',
            'notes' => [], 'roles' => [], 'members' => [],
        ]);
        $year = (int)$request->query('year', (int)now('Europe/Berlin')->year);
        if ($year < 2000 || $year > 2100) abort(422, 'Invalid year.');
        return $this->json([
            'ok' => true,
            'year' => $year,
            'notes' => $notes->forOwnerYear($location, $year),
            'roles' => $notes->roleOptions($location),
            'members' => $notes->memberOptions($location),
            'setup_required' => false,
        ]);
    }

    public function ownerPublish(Request $request, PmdOwnerStaffHourNotesR11 $notes)
    {
        $location = $this->ownerLocation();
        if (!$notes->ready()) return $this->schemaMissing();
        if (!$notes->roleOptions($location)[0]['count']) {
            return $this->json([
                'ok' => false, 'error' => 'no_staff_recipients',
                'message' => 'No active staff accounts are available yet. Add or activate a team member in Shifts before sending a note.',
            ], 422);
        }
        $staffId = (int)optional(optional(AdminAuth::getUser())->staff)->staff_id;
        $created = $notes->publish($location, $staffId > 0 ? $staffId : null, $request->all());
        return $this->json(['ok' => true, 'published' => $created], 201);
    }

    public function ownerRemove(int $id, PmdOwnerStaffHourNotesR11 $notes)
    {
        $location = $this->ownerLocation();
        if (!$notes->ready()) return $this->schemaMissing();
        if ($id < 1 || !$notes->remove($location, $id)) abort(404);
        return $this->json(['ok' => true]);
    }

    public function staffIndex(PmdOwnerStaffHourNotesR11 $notes)
    {
        $identity = $this->staffIdentity();
        if (!$notes->ready()) return $this->schemaMissing();
        $items = $notes->forStaff($identity['location_id'], $identity['staff_id']);
        return $this->json([
            'ok' => true,
            'notes' => $items,
            'unconfirmed' => count(array_filter($items, fn ($note) => !$note['confirmed'])),
        ]);
    }

    public function staffConfirm(Request $request, int $id, PmdOwnerStaffHourNotesR11 $notes)
    {
        $identity = $this->staffIdentity();
        if (!$notes->ready()) return $this->schemaMissing();
        if ($id < 1 || !$notes->confirm($identity['location_id'], $identity['staff_id'], $id)) {
            abort(404, 'This note is not addressed to your account.');
        }
        if ($request->expectsJson()) return $this->json(['ok' => true, 'confirmed' => true]);
        return redirect(admin_url('mywork').'#schedule')->with('success', 'Message confirmed.');
    }

    private function schemaMissing()
    {
        return $this->json([
            'ok' => false,
            'error' => 'staff_notes_schema_not_ready',
            'message' => 'Team notes are not set up for this restaurant yet. Ask an administrator to finish setup.',
        ], 409);
    }

    private function json(array $body, int $status = 200)
    {
        return response()->json($body, $status)
            ->header('Cache-Control', 'private, no-store')
            ->header('X-Content-Type-Options', 'nosniff');
    }
}
