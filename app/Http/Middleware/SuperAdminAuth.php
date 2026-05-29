<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Log;

class SuperAdminAuth
{
    public function handle(Request $request, Closure $next)
    {
        if (!Session::has('superadmin_id')) {
            $intendedUrl = $request->isMethod('get') ? $request->fullUrl() : '/superadmin/new';
            Session::put('superadmin_intended_url', $intendedUrl);
            Log::info('superadmin_auth_missing', [
                'path' => $request->path(),
                'method' => $request->method(),
                'intended' => $intendedUrl,
            ]);
            return redirect('/superadmin/login');
        }

        return $next($request);
    }
}
