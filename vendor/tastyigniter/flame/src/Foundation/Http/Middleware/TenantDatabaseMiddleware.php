<?php

namespace Igniter\Flame\Foundation\Http\Middleware;

use Closure;
use Illuminate\Foundation\Http\Middleware\TransformsRequest;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use System\Models\Tenant;
use Illuminate\Support\Facades\Session;

class TenantDatabaseMiddleware extends TransformsRequest // ✅ Extends Middleware
{    protected static $tenantSwitched = false;


    public function handle($request, Closure $next)
    {
        if ($request->is('assets/*')) {
            return $next($request);
        }
        
        if ($request->is('images/*') || $request->is('assets/*')) {
            return $next($request);
        }
    if (!$request->attributes->get('tenantSwitched', false)) {
        $request->attributes->set('tenantSwitched', true);

    if (request()->getHost()) {
        // ✅ Get the tenant database dynamically
        $tenant = DB::connection('mysql')->table('tenants')->where('domain', request()->getHost())->first();
        if (!$tenant || $tenant->status !== 'active') {
            return response()->make("
                <!DOCTYPE html>
                <html lang='en'>
                <head>
                    <meta charset='UTF-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <title>Tenant Not Found</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            background: linear-gradient(to right, #141e30, #243b55);
                            font-family: 'Arial', sans-serif;
                            color: #fff;
                            text-align: center;
                            padding: 20px;
                        }
                        .container {
                            max-width: 500px;
                            background: rgba(255, 255, 255, 0.1);
                            padding: 30px;
                            border-radius: 12px;
                            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                            backdrop-filter: blur(10px);
                        }
                        h1 {
                            font-size: 42px;
                            margin-bottom: 10px;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        p {
                            font-size: 18px;
                            opacity: 0.8;
                        }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <h1>Tenant Not Found</h1>
                        <p>The requested tenant does not exist. Please verify the subdomain and try again.</p>
                    </div>
                </body>
                </html>
            ", 403);
        }
        
        
        
        if ($tenant && !empty($tenant->database)) {
            // ✅ Change the default connection globally
            Config::set('database.connections.tenant.database', $tenant->database);
            DB::purge('tenant'); // Reset connection
            DB::reconnect('tenant'); // Reconnect
            DB::setDefaultConnection('tenant'); // Apply globally

            // ✅ Debugging check (Remove later)
            // dd(DB::connection('tenant')->getDatabaseName());
        }
    }
  
    $pdo = DB::connection('tenant')->getPdo();
    \Log::info("Reconnection check: PDO is " . ($pdo ? 'set' : 'null'));
        return $next($request);
}else{
 

    return $next($request);

}
}
}
