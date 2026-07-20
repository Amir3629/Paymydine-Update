<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Debug Session Pulse Middleware
 * 
 * FOR DEVELOPMENT/STAGING ONLY - DO NOT ENABLE IN PRODUCTION
 * 
 * Purpose: Logs session state before/after each request to diagnose
 *          "random logout" issues caused by session expiration, CSRF failures,
 *          or cookie problems.
 * 
 * Enable: Set DEBUG_SESSION_PULSE=true in .env
 * 
 * Usage:
 *   1. Add to app/Http/Kernel.php web middleware group
 *   2. Enable in .env: DEBUG_SESSION_PULSE=true
 *   3. Tail logs: tail -f storage/logs/laravel.log | grep SESSION_PULSE
 *   4. Reproduce logout issue
 *   5. Analyze SESSION_PULSE_BEFORE and SESSION_PULSE_AFTER entries
 * 
 * What to look for:
 *   - session_id changes (unexpected session rotation)
 *   - cookie_present: false (cookie not sent by browser)
 *   - redirect_to: /admin/login (logout redirects)
 *   - csrf_token_hash changes (CSRF token rotation issues)
 */
class DebugSessionPulse
{
    public function handle(Request $request, Closure $next)
    {
        // Only log if explicitly enabled (dev/staging only)
        if (!env('DEBUG_SESSION_PULSE', false)) {
            return $next($request);
        }
        
        // Skip for asset requests (too noisy)
        if ($this->shouldSkip($request)) {
            return $next($request);
        }
        
        // Capture before state
        $beforeState = [
            'timestamp' => now()->toISOString(),
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'ip' => $request->ip(),
            'session_id' => session()->getId(),
            'user_id' => auth()->id(),
            'user_email' => auth()->user()->staff_email ?? null,
            'csrf_token_hash' => substr(sha1(session()->token()), 0, 8),
            'cookie_name' => config('session.cookie'),
            'cookie_present' => $request->hasCookie(config('session.cookie')),
            'cookie_value_hash' => $request->cookie(config('session.cookie')) 
                ? substr(sha1($request->cookie(config('session.cookie'))), 0, 8) 
                : null,
            'has_xsrf_token' => $request->hasCookie('XSRF-TOKEN'),
            'session_driver' => config('session.driver'),
            'session_domain' => config('session.domain'),
            'session_secure' => config('session.secure'),
            'session_same_site' => config('session.same_site'),
        ];
        
        Log::channel('single')->info('SESSION_PULSE_BEFORE', $beforeState);
        
        // Process request
        $response = $next($request);
        
        // Capture after state
        $afterState = [
            'timestamp' => now()->toISOString(),
            'url' => $request->fullUrl(),
            'status' => $response->getStatusCode(),
            'is_redirect' => $response->isRedirect(),
            'redirect_to' => $response->headers->get('Location'),
            'session_id_after' => session()->getId(),
            'session_changed' => session()->getId() !== $beforeState['session_id'],
            'set_cookie_headers' => $this->extractSetCookieHeaders($response),
        ];
        
        // Flag suspicious behavior
        if ($afterState['session_changed']) {
            $afterState['WARNING'] = 'Session ID changed during request!';
        }
        
        if ($afterState['is_redirect'] && str_contains($afterState['redirect_to'], 'login')) {
            $afterState['WARNING'] = 'Redirected to login page!';
        }
        
        if (!$beforeState['cookie_present'] && auth()->id()) {
            $afterState['WARNING'] = 'User authenticated but cookie not present!';
        }
        
        Log::channel('single')->info('SESSION_PULSE_AFTER', $afterState);
        
        return $response;
    }
    
    /**
     * Skip noisy requests (assets, etc.)
     */
    private function shouldSkip(Request $request): bool
    {
        $path = $request->path();
        
        $skipPatterns = [
            '_assets/',
            '.css',
            '.js',
            '.png',
            '.jpg',
            '.svg',
            '.woff',
            'favicon',
        ];
        
        foreach ($skipPatterns as $pattern) {
            if (str_contains($path, $pattern)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Extract Set-Cookie headers from response
     */
    private function extractSetCookieHeaders($response): array
    {
        $cookies = [];
        
        foreach ($response->headers->getCookies() as $cookie) {
            $cookies[] = [
                'name' => $cookie->getName(),
                'domain' => $cookie->getDomain(),
                'path' => $cookie->getPath(),
                'secure' => $cookie->isSecure(),
                'http_only' => $cookie->isHttpOnly(),
                'same_site' => $cookie->getSameSite(),
            ];
        }
        
        return $cookies;
    }
}

