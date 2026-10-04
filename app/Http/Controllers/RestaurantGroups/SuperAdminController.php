<?php
namespace App\Http\Controllers\RestaurantGroups;

use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\RestaurantGroups\Provisioner;
use App\Services\RestaurantGroups\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

final class SuperAdminController
{
    public function index(Store $store, CountryPlatformProfileRegistry $profiles)
    {
        $installed = $store->installed();
        $groups = collect();
        if ($installed) {
            $groups = $store->central()->table('pmd_groups as g')
                ->leftJoin('pmd_group_owners as o', 'o.id', '=', 'g.owner_id')
                ->orderByDesc('g.id')->get([
                    'g.id', 'g.uuid', 'g.name', 'g.type', 'g.status', 'g.owner_id',
                    'o.name as owner_name', 'o.username as owner_username', 'o.email as owner_email', 'g.created_at',
                ])->map(function ($group) use ($store) {
                    $group->sites = $store->central()->table('pmd_group_sites as s')
                        ->leftJoin('tenants as t', 't.id', '=', 's.tenant_id')->where('s.group_id', $group->id)
                        ->orderBy('s.id')->get(['s.id', 's.label', 's.slug', 's.state', 's.last_error', 's.tenant_id', 't.domain', 't.status as tenant_status']);
                    return $group;
                });
        }
        return view('pmd-groups::superadmin', ['installed' => $installed, 'groups' => $groups, 'countryOptions' => $profiles->countryOptions()]);
    }

    public function store(Request $request, Provisioner $provisioner)
    {
        // Laravel's default password flash exclusion does not cover these
        // custom field names. Do not send them to session-backed old input.
        $safeInput = $request->except(['owner_password', 'owner_password_confirmation']);
        $validator = Validator::make($request->all(), [
            'organization_name' => 'required|string|max:191',
            'organization_type' => 'required|string|in:independent,multi_location,food_court',
            'owner_name' => 'required|string|max:191',
            'owner_username' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/'],
            'owner_email' => 'required|email|max:191',
            'owner_password' => 'required|string|min:14|max:128|confirmed',
            'phone' => 'required|string|max:40', 'country' => 'required|string|max:80',
            'start' => 'required|date_format:Y-m-d', 'end' => 'required|date_format:Y-m-d|after_or_equal:start',
            'plan_type' => 'nullable|string|max:80', 'description' => 'nullable|string|max:1000',
            'sites' => 'required|array|min:1|max:20', 'sites.*.label' => 'required|string|max:191',
            'sites.*.slug' => 'required|string|max:63', 'sites.*.database' => 'required|string|max:64',
            'sites.*.country' => 'sometimes|string|max:80',
        ]);
        if ($validator->fails()) return redirect('/superadmin/groups')->withErrors($validator)->withInput($safeInput);
        try {
            $result = $provisioner->create($validator->validated());
            return redirect('/superadmin/groups')->with($result['ok'] ? 'success' : 'warning', $result['message']);
        } catch (\Throwable $error) {
            logger()->error('PMD business account creation stopped', ['exception' => get_class($error)]);
            $message = $error instanceof \InvalidArgumentException || $error instanceof \DomainException
                ? $error->getMessage() : 'Business account creation stopped. Check the server log before retrying.';
            return redirect('/superadmin/groups')->withErrors(['group' => $message])->withInput($safeInput);
        }
    }

    public function retry(Request $request, Provisioner $provisioner)
    {
        $data = $request->validate(['site_id' => 'required|integer|min:1']);
        try {
            $result = $provisioner->provisionSite((int)$data['site_id']);
            return redirect('/superadmin/groups')->with($result['ok'] ? 'success' : 'warning',
                $result['ok'] ? 'Location is ready.' : ($result['message'] ?? 'Location needs provisioning review.'));
        } catch (\Throwable $error) {
            logger()->error('PMD business location retry refused', ['site_id' => (int)$data['site_id'], 'exception' => get_class($error)]);
            $message = $error instanceof \DomainException ? $error->getMessage() : 'Provisioning could not start. Check the server log.';
            return redirect('/superadmin/groups')->withErrors(['group' => $message]);
        }
    }
}
