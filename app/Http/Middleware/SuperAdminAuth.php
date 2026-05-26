<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class SuperAdminAuth
{
    public function handle(Request $request, Closure $next)
    {
        if (!Session::has('superadmin_id')) {
            return redirect('/superadmin/login');
        }

        return $next($request);
    }
}

