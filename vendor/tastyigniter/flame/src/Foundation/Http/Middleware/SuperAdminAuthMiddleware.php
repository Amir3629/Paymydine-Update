<?php

namespace Igniter\Flame\Foundation\Http\Middleware;

use Closure;
use Illuminate\Foundation\Http\Middleware\TransformsRequest;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use System\Models\Tenant;
use Illuminate\Support\Facades\Session;

class SuperAdminAuthMiddleware extends TransformsRequest // ✅ Extends Middleware
{   


    public function handle($request, Closure $next)
    {
      //  dd(Session::all());

         // Check if superadmin_id exists in session
         if (!Session::has('superadmin_id')) {
            return view('login')->withErrors(['message' => 'You must be logged in.']);
        }

        return $next($request);
}
}
