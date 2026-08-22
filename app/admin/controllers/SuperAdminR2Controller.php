<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use App\Services\SuperAdminTenantDomainProvisioner;
use App\Services\SuperAdminTenantLifecycleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class SuperAdminR2Controller extends AdminController
{
    public function login()
    {
        if (Session::has('superadmin_id')) {
            return redirect('/superadmin/index');
        }

        return $this->html('admin::superadmin_r2.login');
    }

    public function sign(Request $request)
    {
        $request->validate([
            'username' => 'required|string|max:191',
            'password' => 'required|string|max:191',
        ]);

        $superAdmin = DB::connection('mysql')
            ->table('superadmin')
            ->where('username', $request->input('username'))
            ->first();

        if (!$superAdmin || !Hash::check((string)$request->input('password'), $superAdmin->password)) {
            return redirect('/superadmin/login')->withErrors(['message' => 'Invalid credentials.']);
        }

        Session::put('superadmin_id', $superAdmin->id);
        Session::put('superadmin_username', $superAdmin->username);
        Session::save();

        return redirect('/superadmin/index');
    }

    public function signOut()
    {
        Session::forget(['superadmin_id', 'superadmin_username', 'superadmin_intended_url']);
        Session::regenerateToken();

        return redirect('/superadmin/login');
    }

    public function dashboard()
    {
        $tenants = DB::connection('mysql')->table('tenants')->orderByDesc('id')->get();
        $now = now()->startOfDay();

        $stats = [
            'total' => $tenants->count(),
            'active' => $tenants->where('status', 'active')->count(),
            'needs_setup' => $tenants->filter(function ($tenant) {
                return strtolower((string)$tenant->status) !== 'active';
            })->count(),
            'expired' => $tenants->filter(function ($tenant) use ($now) {
                return !empty($tenant->end) && \Carbon\Carbon::parse($tenant->end)->lt($now);
            })->count(),
        ];

        $latest = $tenants->take(8);

        return $this->html('admin::superadmin_r2.dashboard', compact('stats', 'latest'));
    }

    public function restaurants(Request $request)
    {
        $search = trim((string)$request->input('q', ''));
        $status = trim((string)$request->input('status', ''));

        $query = DB::connection('mysql')->table('tenants')->orderByDesc('id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('domain', 'like', '%'.$search.'%')
                    ->orWhere('database', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%');
            });
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        $tenants = $query->paginate(15)->appends($request->query());

        return $this->html('admin::superadmin_r2.restaurants', compact('tenants', 'search', 'status'));
    }

    public function store(Request $request, SuperAdminTenantLifecycleService $lifecycle)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:191',
            'domain' => 'required|string|max:191',
            'database' => 'required|string|max:64',
            'email' => 'required|email|max:191',
            'phone' => 'required|string|max:40',
            'start' => 'required|date',
            'end' => 'required|date|after_or_equal:start',
            'type' => 'required|string|max:100',
            'country' => 'required|string|max:100',
            'description' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return redirect('/superadmin/new')
                ->withErrors($validator)
                ->withInput();
        }

        $data = $validator->validated();
        $domain = strtolower(trim($data['domain']));
        $database = trim(str_replace([' ', '-'], '_', $data['database']));

        if (DB::connection('mysql')->table('tenants')->where('domain', $domain)->exists()) {
            return redirect('/superadmin/new')->withErrors(['domain' => 'This domain already exists.'])->withInput();
        }

        if (DB::connection('mysql')->table('tenants')->where('database', $database)->exists()) {
            return redirect('/superadmin/new')->withErrors(['database' => 'This database name is already registered.'])->withInput();
        }

        $data['domain'] = $domain;
        $data['database'] = $database;
        $result = $lifecycle->create($data);

        $key = $result['ok'] ? 'success' : 'warning';
        return redirect('/superadmin/new')->with($key, $result['message']);
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer',
            'name' => 'required|string|max:191',
            'email' => 'required|email|max:191',
            'phone' => 'required|string|max:40',
            'start' => 'required|date',
            'end' => 'required|date|after_or_equal:start',
            'type' => 'required|string|max:100',
            'country' => 'required|string|max:100',
            'description' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return redirect('/superadmin/new')->withErrors($validator);
        }

        $data = $validator->validated();
        $id = (int)$data['id'];
        unset($data['id']);
        $data['updated_at'] = now();

        DB::connection('mysql')->table('tenants')->where('id', $id)->update($data);

        return redirect('/superadmin/new')->with('success', 'Restaurant updated.');
    }

    public function status(Request $request)
    {
        $request->validate([
            'id' => 'required|integer',
            'status' => 'required|in:active,disabled',
        ]);

        DB::connection('mysql')->table('tenants')
            ->where('id', (int)$request->input('id'))
            ->update([
                'status' => $request->input('status'),
                'updated_at' => now(),
            ]);

        return redirect('/superadmin/new')->with('success', 'Restaurant status updated.');
    }

    public function provision(Request $request, SuperAdminTenantDomainProvisioner $provisioner)
    {
        $request->validate(['id' => 'required|integer']);

        $tenant = DB::connection('mysql')->table('tenants')
            ->where('id', (int)$request->input('id'))
            ->first();

        if (!$tenant) {
            return redirect('/superadmin/health')->withErrors(['tenant' => 'Tenant not found.']);
        }

        $result = $provisioner->provision((string)$tenant->domain);

        if ($result['ok']) {
            DB::connection('mysql')->table('tenants')
                ->where('id', $tenant->id)
                ->update(['status' => 'active', 'updated_at' => now()]);

            return redirect('/superadmin/health')->with('success', 'Domain and TLS provisioning completed for '.$tenant->name.'.');
        }

        DB::connection('mysql')->table('tenants')
            ->where('id', $tenant->id)
            ->update(['status' => 'disabled', 'updated_at' => now()]);

        return redirect('/superadmin/health')->with('warning', 'Provisioning is still incomplete for '.$tenant->name.': '.$result['message']);
    }

    public function health()
    {
        $tenants = DB::connection('mysql')->table('tenants')->orderBy('name')->get();
        $schemas = collect(DB::connection('mysql')->select(
            'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA'
        ))->mapWithKeys(function ($row) {
            return [(string)$row->SCHEMA_NAME => true];
        });

        $rows = $tenants->map(function ($tenant) use ($schemas) {
            $domain = strtolower((string)$tenant->domain);
            $resolved = gethostbyname($domain);
            $dnsOk = $resolved !== $domain;
            $certPath = '/etc/letsencrypt/live/'.$domain.'/fullchain.pem';

            return (object)[
                'tenant' => $tenant,
                'db_ok' => $schemas->has((string)$tenant->database),
                'dns_ok' => $dnsOk,
                'resolved_ip' => $dnsOk ? $resolved : null,
                'tls_ok' => is_file($certPath),
                'expired' => !empty($tenant->end) && \Carbon\Carbon::parse($tenant->end)->isPast(),
            ];
        });

        return $this->html('admin::superadmin_r2.health', compact('rows'));
    }

    public function settings()
    {
        $superadmin = DB::connection('mysql')->table('superadmin')->first();
        return $this->html('admin::superadmin_r2.settings', compact('superadmin'));
    }

    public function updateSettings(Request $request)
    {
        $request->validate([
            'company_name' => 'required|string|max:191',
            'company_website' => 'required|string|max:191',
            'email' => 'required|email|max:191',
        ]);

        DB::connection('mysql')->table('superadmin')->limit(1)->update([
            'company_name' => $request->input('company_name'),
            'company_website' => $request->input('company_website'),
            'email' => $request->input('email'),
            'updated_at' => now(),
        ]);

        return redirect('/superadmin/settings')->with('success', 'Settings updated.');
    }

    public function locationRequests(Request $request)
    {
        $perPage = 15;

        try {
            $locationRequests = DB::connection('mysql')
                ->table('location_requests')
                ->orderByDesc('id')
                ->paginate($perPage);
        } catch (\Throwable $e) {
            $locationRequests = new \Illuminate\Pagination\LengthAwarePaginator([], 0, $perPage, 1);
        }

        return $this->html('admin::superadmin_r2.location_requests', compact('locationRequests'));
    }

    private function html(string $view, array $data = []): SymfonyResponse
    {
        return new SymfonyResponse(
            view($view, $data)->render(),
            200,
            [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            ]
        );
    }
}
