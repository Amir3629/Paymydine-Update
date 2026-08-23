<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use App\Services\SuperAdminTenantDomainProvisioner;
use App\Services\SuperAdminTenantLifecycleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class SuperAdminR2Controller extends AdminController
{
    public function login()
    {
        if (Session::has('superadmin_id')) return redirect('/superadmin/index');
        return $this->html('admin::superadmin_r2.login');
    }

    public function sign(Request $request)
    {
        $request->validate(['username' => 'required|string|max:191','password' => 'required|string|max:191']);
        $superAdmin = DB::connection('mysql')->table('superadmin')->where('username', $request->input('username'))->first();
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
        Session::forget(['superadmin_id','superadmin_username','superadmin_intended_url']);
        Session::regenerateToken();
        return redirect('/superadmin/login');
    }

    public function dashboard()
    {
        $tenants = DB::connection('mysql')->table('tenants')->orderByDesc('id')->get();
        $now = now()->startOfDay();

        $stats = [
            'total' => $tenants->count(),
            'active' => $tenants->filter(fn($tenant) => strtolower((string)$tenant->status) === 'active')->count(),
            'disabled' => $tenants->filter(fn($tenant) => strtolower((string)$tenant->status) === 'disabled')->count(),
            'removed' => $tenants->filter(fn($tenant) => strtolower((string)$tenant->status) === 'removed')->count(),
            'expired' => $tenants->filter(function ($tenant) use ($now) {
                if (empty($tenant->end)) return false;
                try { return \Carbon\Carbon::parse($tenant->end)->lt($now); }
                catch (\Throwable $e) { return false; }
            })->count(),
        ];

        $chartStart = now()->startOfMonth()->subMonths(5);
        $growth = collect(range(0, 5))->map(function ($offset) use ($tenants, $chartStart) {
            $monthStart = $chartStart->copy()->addMonths($offset)->startOfMonth();
            $monthEnd = $monthStart->copy()->endOfMonth();
            $value = $tenants->filter(function ($tenant) use ($monthStart, $monthEnd) {
                if (empty($tenant->created_at)) return false;
                try {
                    $created = \Carbon\Carbon::parse($tenant->created_at);
                    return $created->gte($monthStart) && $created->lte($monthEnd);
                } catch (\Throwable $e) {
                    return false;
                }
            })->count();

            return ['label' => $monthStart->format('M'), 'value' => $value];
        });

        $growthMax = max(1, (int)$growth->max('value'));
        $statusBase = max(1, (int)$stats['total']);
        $statusMix = [
            'active_deg' => round(($stats['active'] / $statusBase) * 360, 2),
            'disabled_deg' => round(($stats['disabled'] / $statusBase) * 360, 2),
            'removed_deg' => round(($stats['removed'] / $statusBase) * 360, 2),
        ];

        $latest = $tenants->take(8);
        return $this->html('admin::superadmin_r2.dashboard', compact('stats','growth','growthMax','statusMix','latest'));
    }

    public function restaurants(Request $request)
    {
        $search = trim((string)$request->input('q', ''));
        $status = trim((string)$request->input('status', ''));
        $query = DB::connection('mysql')->table('tenants')->orderByDesc('id');
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name','like','%'.$search.'%')
                    ->orWhere('domain','like','%'.$search.'%')
                    ->orWhere('database','like','%'.$search.'%')
                    ->orWhere('email','like','%'.$search.'%');
            });
        }
        if ($status !== '') $query->where('status', $status);
        $tenants = $query->paginate(20)->appends($request->query());
        return $this->html('admin::superadmin_r2.restaurants', compact('tenants','search','status'));
    }

    public function store(Request $request, SuperAdminTenantLifecycleService $lifecycle)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name'=>'required|string|max:191',
                'domain'=>'required|string|max:191',
                'database'=>'required|string|max:64',
                'email'=>'required|email|max:191',
                'phone'=>'required|string|max:40',
                'start'=>'required|date',
                'end'=>'required|date|after_or_equal:start',
                'type'=>'required|string|max:100',
                'country'=>'required|string|max:100',
                'description'=>'nullable|string|max:1000',
            ]);
            if ($validator->fails()) return redirect('/superadmin/new')->withErrors($validator)->withInput();

            $data = $validator->validated();
            $domain = $this->normalizeTenantDomainInput((string)$data['domain']);
            $database = trim(str_replace([' ','-'], '_', $data['database']));

            if (!$this->isAllowedTenantDomain($domain)) {
                return redirect('/superadmin/new')
                    ->withErrors(['domain'=>'Enter a PayMyDine restaurant name such as "restaurant" or "restaurant.paymydine.com".'])
                    ->withInput();
            }

            if (DB::connection('mysql')->table('tenants')->where('domain', $domain)->exists()) {
                return redirect('/superadmin/new')->withErrors(['domain'=>'This restaurant domain already exists.'])->withInput();
            }
            if (DB::connection('mysql')->table('tenants')->where('database', $database)->exists()) {
                return redirect('/superadmin/new')->withErrors(['database'=>'A restaurant with this internal database name already exists.'])->withInput();
            }

            $data['domain']=$domain;
            $data['database']=$database;
            $result = $lifecycle->create($data);

            $response = redirect('/superadmin/new')->with($result['ok'] ? 'success' : 'warning', $result['message']);
            if (!$result['ok']) $response->withInput();
            return $response;
        } catch (\Throwable $e) {
            Log::error('pmd_superadmin_r2_store_http_failed', [
                'domain' => (string)$request->input('domain', ''),
                'name' => (string)$request->input('name', ''),
                'error' => $e->getMessage(),
                'exception' => get_class($e),
            ]);

            return redirect('/superadmin/new')
                ->with('warning', 'Restaurant creation could not be completed. Nothing was intentionally activated. Please retry; if it repeats, check Restaurant Health.')
                ->withInput();
        }
    }

    public function edit($id)
    {
        $tenant = DB::connection('mysql')->table('tenants')->where('id', (int)$id)->first();
        if (!$tenant) return redirect('/superadmin/new')->withErrors(['tenant'=>'Restaurant not found.']);
        return $this->html('admin::superadmin_r2.edit', compact('tenant'));
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id'=>'required|integer','name'=>'required|string|max:191','email'=>'required|email|max:191','phone'=>'required|string|max:40','start'=>'required|date','end'=>'required|date|after_or_equal:start','type'=>'required|string|max:100','country'=>'required|string|max:100','description'=>'nullable|string|max:1000',
        ]);
        if ($validator->fails()) return redirect('/superadmin/new')->withErrors($validator);
        $data = $validator->validated();
        $id=(int)$data['id'];
        unset($data['id']);
        $data['updated_at']=now();
        DB::connection('mysql')->table('tenants')->where('id',$id)->update($data);
        return redirect('/superadmin/new')->with('success','Restaurant updated.');
    }

    public function status(Request $request)
    {
        $request->validate(['id'=>'required|integer','status'=>'required|in:active,disabled']);
        $tenant = DB::connection('mysql')->table('tenants')->where('id',(int)$request->input('id'))->first();
        if (!$tenant) return redirect('/superadmin/new')->withErrors(['tenant'=>'Restaurant not found.']);

        $target = (string)$request->input('status');
        if ($target === 'active') {
            $readiness = $this->activationReadiness($tenant);
            if (!$readiness['ok']) {
                DB::connection('mysql')->table('tenants')->where('id',$tenant->id)->update(['status'=>'disabled','updated_at'=>now()]);
                return redirect('/superadmin/new')->with('warning',
                    'Cannot activate '.$tenant->name.' yet: '.implode('; ', $readiness['issues']).'. Use Restaurant Health → Retry provisioning.'
                );
            }
        }

        DB::connection('mysql')->table('tenants')->where('id',$tenant->id)->update(['status'=>$target,'updated_at'=>now()]);
        return redirect('/superadmin/new')->with('success','Restaurant status updated.');
    }

    public function provision(Request $request, SuperAdminTenantDomainProvisioner $provisioner)
    {
        $request->validate(['id'=>'required|integer']);
        $tenant = DB::connection('mysql')->table('tenants')->where('id',(int)$request->input('id'))->first();
        if (!$tenant) return redirect('/superadmin/health')->withErrors(['tenant'=>'Restaurant not found.']);

        DB::connection('mysql')->table('tenants')->where('id',$tenant->id)->update(['status'=>'disabled','updated_at'=>now()]);
        $result = $provisioner->provision((string)$tenant->domain);

        if ($result['ok']) {
            $tenant = DB::connection('mysql')->table('tenants')->where('id',$tenant->id)->first();
            $readiness = $this->activationReadiness($tenant);
            if ($readiness['ok']) {
                DB::connection('mysql')->table('tenants')->where('id',$tenant->id)->update(['status'=>'active','updated_at'=>now()]);
                return redirect('/superadmin/health')->with('success','Domain and TLS provisioning completed for '.$tenant->name.'.');
            }
            return redirect('/superadmin/health')->with('warning','Provisioning command completed, but health verification is not ready yet: '.implode('; ', $readiness['issues']).'.');
        }

        return redirect('/superadmin/health')->with('warning','Provisioning is still incomplete for '.$tenant->name.': '.$result['message']);
    }

    public function health()
    {
        $tenants = DB::connection('mysql')->table('tenants')->orderBy('name')->get();
        $schemas = collect(DB::connection('mysql')->select('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA'))
            ->mapWithKeys(fn($row)=>[(string)$row->SCHEMA_NAME=>true]);

        $rows = $tenants->map(function ($tenant) use ($schemas) {
            $domain = strtolower((string)$tenant->domain);
            $resolved = $domain !== '' ? gethostbyname($domain) : '';
            $dnsOk = $domain !== '' && $resolved !== $domain;
            $tls = $dnsOk ? $this->inspectTls($domain) : ['ok'=>false,'name'=>null,'expires'=>null];
            $expired = !empty($tenant->end) && \Carbon\Carbon::parse($tenant->end)->isPast();
            $dbOk = $schemas->has((string)$tenant->database);

            return (object)[
                'tenant'=>$tenant,
                'db_ok'=>$dbOk,
                'dns_ok'=>$dnsOk,
                'resolved_ip'=>$dnsOk?$resolved:null,
                'tls_ok'=>$tls['ok'],
                'tls_name'=>$tls['name'],
                'tls_expires'=>$tls['expires'],
                'expired'=>$expired,
                'ready'=>$dbOk && $dnsOk && $tls['ok'] && !$expired,
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
        $request->validate(['company_name'=>'required|string|max:191','company_website'=>'required|string|max:191','email'=>'required|email|max:191']);
        DB::connection('mysql')->table('superadmin')->limit(1)->update([
            'company_name'=>$request->input('company_name'),
            'company_website'=>$request->input('company_website'),
            'email'=>$request->input('email'),
            'updated_at'=>now(),
        ]);
        return redirect('/superadmin/settings')->with('success','Settings updated.');
    }

    public function locationRequests(Request $request)
    {
        $perPage=15;
        try {
            $locationRequests=DB::connection('mysql')->table('location_requests')->orderByDesc('id')->paginate($perPage);
        } catch (\Throwable $e) {
            $locationRequests=new \Illuminate\Pagination\LengthAwarePaginator([],0,$perPage,1);
        }
        return $this->html('admin::superadmin_r2.location_requests', compact('locationRequests'));
    }

    private function normalizeTenantDomainInput(string $input): string
    {
        $domain = strtolower(trim($input));
        if ($domain === '') return '';

        if (preg_match('#^[a-z][a-z0-9+.-]*://#i', $domain)) {
            $host = parse_url($domain, PHP_URL_HOST);
            $domain = is_string($host) ? strtolower(trim($host)) : '';
        } else {
            $domain = preg_replace('#[/?#].*$#', '', $domain) ?? '';
            $domain = preg_replace('/:\d+$/', '', $domain) ?? '';
        }

        $domain = rtrim(trim($domain), '.');
        if ($domain !== '' && !str_contains($domain, '.')) {
            $domain .= '.paymydine.com';
        }

        return $domain;
    }

    private function isAllowedTenantDomain(string $domain): bool
    {
        return (bool)preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $domain)
            && !in_array($domain, ['www.paymydine.com'], true);
    }

    private function activationReadiness($tenant): array
    {
        $issues = [];
        $database = trim((string)($tenant->database ?? ''));
        $domain = strtolower(trim((string)($tenant->domain ?? '')));

        $dbOk = $database !== '' && (bool)DB::connection('mysql')->selectOne(
            'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?', [$database]
        );
        if (!$dbOk) $issues[] = 'restaurant database is missing';

        $resolved = $domain !== '' ? gethostbyname($domain) : '';
        $dnsOk = $domain !== '' && $resolved !== $domain;
        if (!$dnsOk) $issues[] = 'DNS is not resolving';

        $tls = $domain !== '' && $dnsOk ? $this->inspectTls($domain) : ['ok'=>false];
        if (empty($tls['ok'])) $issues[] = 'TLS certificate does not match '.$domain;

        $expired = !empty($tenant->end) && \Carbon\Carbon::parse($tenant->end)->isPast();
        if ($expired) $issues[] = 'subscription end date has passed';

        return ['ok'=>count($issues) === 0, 'issues'=>$issues];
    }

    private function inspectTls(string $domain): array
    {
        $result = ['ok'=>false,'name'=>null,'expires'=>null];
        if (!preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $domain)) return $result;

        $context = stream_context_create(['ssl'=>[
            'capture_peer_cert'=>true,
            'verify_peer'=>false,
            'verify_peer_name'=>false,
            'SNI_enabled'=>true,
            'peer_name'=>$domain,
        ]]);

        // Health runs on the same VPS as Nginx. Connect locally and use SNI for
        // the restaurant hostname instead of making a slow external TLS round trip.
        $errno = 0;
        $errstr = '';
        $socket = @stream_socket_client('ssl://127.0.0.1:443', $errno, $errstr, 0.8, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) return $result;

        $params = stream_context_get_params($socket);
        fclose($socket);
        $cert = $params['options']['ssl']['peer_certificate'] ?? null;
        if (!$cert || !function_exists('openssl_x509_parse')) return $result;

        $parsed = @openssl_x509_parse($cert);
        if (!is_array($parsed)) return $result;

        $san = (string)($parsed['extensions']['subjectAltName'] ?? '');
        $names = [];
        foreach (explode(',', $san) as $entry) {
            $entry = trim($entry);
            if (str_starts_with($entry, 'DNS:')) $names[] = strtolower(substr($entry, 4));
        }

        $matches = false;
        foreach ($names as $name) {
            if ($name === $domain) { $matches = true; break; }
            if (str_starts_with($name, '*.')) {
                $suffix = substr($name, 1);
                if (str_ends_with($domain, $suffix) && substr_count($domain, '.') === substr_count($name, '.')) {
                    $matches = true;
                    break;
                }
            }
        }

        $validFrom = (int)($parsed['validFrom_time_t'] ?? 0);
        $validTo = (int)($parsed['validTo_time_t'] ?? 0);
        $validNow = ($validFrom === 0 || $validFrom <= time()) && ($validTo === 0 || $validTo > time());
        $subjectName = $names[0] ?? (string)($parsed['subject']['CN'] ?? '');

        return [
            'ok'=>$matches && $validNow,
            'name'=>$subjectName !== '' ? $subjectName : null,
            'expires'=>$validTo > 0 ? date('Y-m-d H:i:s', $validTo) : null,
        ];
    }

    private function html(string $view, array $data=[]): SymfonyResponse
    {
        return new SymfonyResponse(
            view($view,$data)->render(),
            200,
            ['Content-Type'=>'text/html; charset=UTF-8','Cache-Control'=>'no-store, no-cache, must-revalidate, max-age=0']
        );
    }
}
