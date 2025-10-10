<?php

namespace App\Support;

class Url
{
    /**
     * Get the frontend URL for the current tenant context.
     * 
     * Prefers tenant's configured frontend_url, falls back to app.url config,
     * then finally uses the current request's scheme and host.
     *
     * @return string Frontend URL without trailing slash
     */
    public static function frontend(): string
    {
        $host = request()->getSchemeAndHttpHost();
        
        return rtrim(
            optional(app('tenant'))->frontend_url
            ?? config('app.url')
            ?? $host,
            '/'
        );
    }
}

