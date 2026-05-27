<?php

namespace Admin\Controllers;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;
use Admin\Classes\AdminController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Config;
use System\Models\Themes_model;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use App\Services\TenantProvisioningService;
class SuperAdminController  extends AdminController
{
    public function showIndex()
    {
         // Fetch the first superadmin record
 $superadmin = DB::connection('mysql')
 ->table('superadmin')
 ->first();
 Session::put('superadmin_id', $superadmin->id);
 Session::put('superadmin_username', $superadmin->username);
 Session::save(); // Force session to save!

        return new SymfonyResponse(
            view('index')->render(),
            200,
            ['Content-Type' => 'text/html; charset=UTF-8']
        );
    }
public function login(){
    if (Session::has('superadmin_id')) {
        return redirect('/superadmin/index');
    }
    return new SymfonyResponse(
        view('login')->render(),
        200,
        ['Content-Type' => 'text/html; charset=UTF-8']
    );
}
public function sign(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $superAdmin = DB::connection('mysql')
            ->table('superadmin')
            ->where('username', $request->username)
            ->first();

        if (!$superAdmin || !Hash::check($request->password, $superAdmin->password)) {
            return redirect()->back()->withErrors(['message' => 'Invalid credentials']);
        }

        // Store user session
        Session::put('superadmin_id', $superAdmin->id);
        Session::put('superadmin_username', $superAdmin->username);
        Session::save(); // Force session to save!

        \Log::info('superadmin_login_success', ['superadmin_id' => $superAdmin->id]);

        $intendedUrl = Session::pull('superadmin_intended_url');
        if (!$intendedUrl || str_contains($intendedUrl, '/superadmin/new/store') || str_contains($intendedUrl, '/superadmin/sign')) {
            $intendedUrl = '/superadmin/index';
        }

        \Log::info('superadmin_login_redirect', ['to' => $intendedUrl]);
        return redirect($intendedUrl);
    }
    public function signOut()
    {
        // Forget specific session values
        Session::forget('superadmin_id');
        Session::forget('superadmin_username');
    
        // Destroy the entire session
        Session::flush();
    
        // Redirect to login page
        return redirect('/superadmin/login')->with(['message' => 'You have been logged out.']);
    }
    public function showNewPage(Request $request)
    {
        
 // Fetch the first superadmin record
 $superadmin = DB::connection('mysql')
 ->table('superadmin')
 ->first();
 
 Session::put('superadmin_id', $superadmin->id);
 Session::put('superadmin_username', $superadmin->username);
 Session::save(); // Force session to save!

        $perPage = $request->input('per_page', 5); // Default: 10
        $order = $request->input('order', 'DESC'); // Default: DESC
    
        // Fetch tenants with pagination and sorting
        $tenants = DB::connection('mysql')
                     ->table('tenants')
                     ->orderBy('id', $order)
                     ->paginate($perPage);
                             return new SymfonyResponse(
                                 view('new', compact('tenants', 'perPage', 'order'))->render(),
                                 200,
                                 ['Content-Type' => 'text/html; charset=UTF-8']
                             );
    }

    // ✅ Handle form submission
    public function store(Request $request)
    {
        \Log::info('tenant_create_store_first_line', [
            'path' => $request->path(),
            'method' => $request->method(),
            'has_superadmin_id' => Session::has('superadmin_id'),
            'mysql_database' => Config::get('database.connections.mysql.database'),
            'name' => $request->input('name'),
            'domain' => $request->input('domain'),
            'database' => $request->input('database'),
        ]);

        if (!Session::has('superadmin_id')) {
            \Log::warning('tenant_create_auth_missing_in_store', [
                'path' => $request->path(),
                'method' => $request->method(),
            ]);
            return redirect('/superadmin/login');
        }

        $centralDatabase = Config::get('database.connections.mysql.database');
        $databaseName = null;

        \Log::info('tenant_create_enter', [
            'path' => $request->path(),
            'method' => $request->method(),
            'has_superadmin_id' => Session::has('superadmin_id'),
            'mysql_database' => $centralDatabase,
            'name' => $request->input('name'),
            'domain' => $request->input('domain'),
            'database' => $request->input('database'),
        ]);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'domain' => 'required|string|max:255|unique:tenants,domain',
            'database' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'start' => 'required|date',
            'end' => 'required|date|after_or_equal:start',
            'type' => 'required|string|max:255',
            'country' => 'required|string|max:255', 
            'description' => 'nullable|string|max:1000', 
        ]);
        if ($validator->fails()) {
            \Log::warning('tenant_create_validation_failed', [
                'errors' => $validator->errors()->toArray(),
                'name' => $request->input('name'),
                'domain' => $request->input('domain'),
                'database' => $request->input('database'),
            ]);
            return redirect(url('/superadmin/new?error=Validation failed. Please check input values.'));
        }
        $validated = $validator->validated();
        \Log::info('tenant_create_validated', [
            'name' => $validated['name'] ?? null,
            'domain' => $validated['domain'] ?? null,
            'database' => $validated['database'] ?? null,
        ]);

        $tenantName = $validated['name'];
        $domain = $validated['domain'];
        $databaseName = $validated['database'];
        $email = $validated['email'];
        $phone = $validated['phone'];
        $start = $validated['start'];
        $end = $validated['end'];
        $type = $validated['type'];
        $country = $validated['country']; 
        $description = $validated['description'] ?? null; 
        $templateDb = 'newtenantdb'; 
        \Log::info('tenant_create_start', ['tenant' => $tenantName, 'database' => $databaseName]);

        try {
            $databaseExists = DB::select("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", [$databaseName]);

            if (count($databaseExists) > 0) { // ✅ Check if the array contains any results
                return redirect(url('/superadmin/new?error=Database name already exists!'));
            }
            DB::connection('mysql')->table('tenants')->insert([
                'name' => $tenantName,
                'domain' => $domain,
                'database' => $databaseName,
                'email' => $email,
                'phone' => $phone,
                'start' => $start,
                'end' => $end,
                'type' => $type,
                'country' => $country, 
                'description' => $description, 
                'status' =>  'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            \Log::info('tenant_create_row_inserted', ['database' => $databaseName, 'domain' => $domain]);
        
            // ✅ Step 2: Create the new database
            DB::statement("CREATE DATABASE `$databaseName`");
            \Log::info('tenant_create_db_created', ['database' => $databaseName]);

            $tables = DB::connection('mysql')->select("SHOW TABLES FROM `$templateDb`");

            foreach ($tables as $table) {
                $tableName = array_values((array) $table)[0];
            
                // ✅ Get the table creation SQL
                $createTableResult = DB::connection('mysql')->select("SHOW CREATE TABLE `$templateDb`.`$tableName`");
                
                if (!$createTableResult) {
                    \Log::error("Failed to get CREATE TABLE statement for: $tableName");
                    continue; // Skip this table
                }
            
                $createTableQuery = $createTableResult[0]->{'Create Table'};
            
                // ✅ Replace source database name with new database name in query
                $createTableQuery = str_replace("`$templateDb`.", "", $createTableQuery);
            
                // ✅ Execute the table creation query in the new database
                DB::connection('mysql')->statement("USE `$databaseName`");
                DB::connection('mysql')->statement($createTableQuery);
            
                // ✅ Copy data if the table has any rows
                $rowCount = DB::connection('mysql')->selectOne("SELECT COUNT(*) AS count FROM `$templateDb`.`$tableName`")->count;
                if ($rowCount > 0) {
                    DB::connection('mysql')->statement("INSERT INTO `$databaseName`.`$tableName` SELECT * FROM `$templateDb`.`$tableName`");
                }
            }
            \Log::info('tenant_create_db_cloned', ['database' => $databaseName, 'template' => $templateDb]);
            // After cloning schema/data, switch to tenant DB and activate the frontend theme
            try {
                \Log::info('tenant_create_db_switch_to_tenant', ['database' => $databaseName]);
                Config::set('database.connections.mysql.database', $databaseName);
                DB::purge('mysql');
                DB::reconnect('mysql');

                // Create default Cashier table for this tenant (idempotent)
                $existingCashier = DB::table('tables')->where('table_name', 'Cashier')->first();
                if (!$existingCashier) {
                    $cashierTableId = DB::table('tables')->insertGetId([
                        'table_name' => 'Cashier',
                        'min_capacity' => 1,
                        'max_capacity' => 1,
                        'table_status' => 1,
                        'extra_capacity' => 0,
                        'is_joinable' => 0,
                        'priority' => 999, // High priority to appear at the end
                        'created_at' => now(),
                        'updated_at' => now(),
                        'qr_code' => 'cashier',
                    ]);

                    // Link the cashier table to the default location (location_id = 1)
                    DB::table('locationables')->insert([
                        'location_id' => 1,
                        'locationable_id' => $cashierTableId,
                        'locationable_type' => 'tables',
                        'options' => null,
                    ]);
                    
                    \Log::info("Created Cashier table for tenant: $databaseName");
                } else {
                    \Log::info("Cashier table already exists for tenant: $databaseName");
                }

                // Ensure filesystem themes are synced into tenant DB
                Themes_model::syncAll();

                // Activate our custom theme for this tenant
                Themes_model::activateTheme('frontend-theme');
            } catch (\Throwable $e) {
                // Swallow to avoid breaking tenant creation; admin can fix manually if needed
                \Log::error('Failed to activate theme for tenant '.$databaseName.': '.$e->getMessage());
            } finally {
                // Switch back to original central database
                \Log::info('tenant_create_restore_central_db', ['database' => $centralDatabase]);
                Config::set('database.connections.mysql.database', $centralDatabase);
                DB::purge('mysql');
                DB::reconnect('mysql');
            }

            $provisioning = app(TenantProvisioningService::class)->provisionDomain($domain);
            \Log::info('tenant_create_success', ['database' => $databaseName, 'domain' => $domain, 'provisioning_ok' => $provisioning['ok']]);
            if ($provisioning['ok']) {
                return redirect(url('/superadmin/new?success=Tenant created successfully!'));
            }
            return redirect(url('/superadmin/new?error=Tenant created, but domain provisioning failed: '.$provisioning['message']));
        } catch (\Throwable $e) {
            \Log::error('tenant_create_failed', [
                'tenant' => $tenantName ?? null,
                'database' => $databaseName,
                'error' => $e->getMessage(),
            ]);

            return redirect(url('/superadmin/new?error=Unable to create tenant. Please try again.'));
        } finally {
            // Safety restore in all code paths before response/session handling
            Config::set('database.connections.mysql.database', $centralDatabase);
            DB::purge('mysql');
            DB::reconnect('mysql');
            \Log::info('tenant_create_restore_central_db', ['database' => $centralDatabase]);
        }

        // ✅ Redirect back with success message
     //   return redirect(url('/superadmin/new'))->with('success', 'Tenant created successfully!');
    }
    public function update(Request $request)
    {
        
        // Validate request
        $validated = $request->validate([
            'id' => 'required|exists:tenants,id',
            'name' => 'required|string|max:255',
            'domain' => 'required|string|max:255|unique:tenants,domain,' . $request->id,
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'start' => 'required|date',
            'end' => 'required|date|after_or_equal:start',
            'type' => 'required|string|max:255',
            'country' => 'required|string|max:255', 
            'description' => 'nullable|string|max:1000',
        ]);
    
        // ✅ Step 1: Find the tenant by ID
        DB::connection('mysql')->table('tenants')
            ->where('id', $validated['id'])
            ->update([
                'name' => $validated['name'],
                'domain' => $validated['domain'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'start' => $validated['start'],
                'end' => $validated['end'],
                'type' => $validated['type'],
                'country' => $validated['country'],
                'description' => $validated['description'],
                'updated_at' => now(),
            ]);
            return redirect(url('/superadmin/new?success=Tenant updated successfully!'));

        // ✅ Redirect back with success message
     //   return redirect(url('/superadmin/new'))->with('success',  'Tenant updated successfully!');

    }
    
    public function delete($id)
    {
        // ✅ Find tenant
        $tenant = DB::connection('mysql')->table('tenants')->where('id', $id)->first();

        if (!$tenant) {
            return redirect()->back()->with('error', 'Tenant not found!');
        }

        // ✅ Delete the associated database
        DB::statement("DROP DATABASE IF EXISTS `$tenant->database`");

        // ✅ Delete the tenant record
        DB::connection('mysql')->table('tenants')->where('id', $id)->delete();
        return redirect(url('/superadmin/new?error=Tenant deleted successfully!'));

       // return redirect(url('/superadmin/new'))->with('success',  'Tenant deleted successfully!');

    }
    public function settings(){
    

 // Fetch the first superadmin record
 $superadmin = DB::connection('mysql')
 ->table('superadmin')
 ->first();
 Session::put('superadmin_id', $superadmin->id);
 Session::put('superadmin_username', $superadmin->username);
 Session::save(); // Force session to save!

return new SymfonyResponse(
    view('settings', compact('superadmin'))->render(),
    200,
    ['Content-Type' => 'text/html; charset=UTF-8']
);    }

public function updateSettings(Request $request)
{
    $request->validate([
        'company_name' => 'required|string|max:191',
        'company_website' => 'required|string|max:191',
        'email' => 'required|email|max:191',
    ]);
    DB::connection('mysql')
    ->table('superadmin')
    ->limit(1)
    ->update([
        'company_name' => $request->input('company_name'),
        'company_website' => $request->input('company_website'),
        'email' => $request->input('email'),
        'updated_at' => now(),
    ]);
        return redirect()->back()->with('success', 'Settings updated successfully.');

}

public function locationRequests(Request $request)
{
    // Fetch the first superadmin record
    $superadmin = DB::connection('mysql')
        ->table('superadmin')
        ->first();
    Session::put('superadmin_id', $superadmin->id);
    Session::put('superadmin_username', $superadmin->username);
    Session::save();

    $perPage = $request->input('per_page', 10);
    $order = $request->input('order', 'DESC');

    // Check if location_requests table exists, if not return empty collection
    try {
        $locationRequests = DB::connection('mysql')
            ->table('location_requests')
            ->orderBy('id', $order)
            ->paginate($perPage);
    } catch (\Exception $e) {
        // Table doesn't exist yet, return empty paginated collection
        $locationRequests = new \Illuminate\Pagination\LengthAwarePaginator(
            collect([]),
            0,
            $perPage,
            1
        );
    }

    return new SymfonyResponse(
        view('location_requests', compact('locationRequests', 'perPage', 'order'))->render(),
        200,
        ['Content-Type' => 'text/html; charset=UTF-8']
    );
}
}
