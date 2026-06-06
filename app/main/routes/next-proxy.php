<?php

        // If the active theme is frontend-theme, proxy root to Next.js server so URL stays 127.0.0.1:8000
        Route::get('/', function () {
            $active = params('default_themes.main', config('system.defaultTheme'));
            if ($active === 'frontend-theme') {
                // stream/proxy Next content
                $next = env('NEXT_PROXY_ORIGIN', 'http://localhost:3001');
                $ch = curl_init($next.'/');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HEADER, false);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                $resp = curl_exec($ch);
                $ctype = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'text/html; charset=UTF-8';
                curl_close($ch);
                return response($resp)->header('Content-Type', $ctype);
            }
            return app('System\\Classes\\Controller')->run('/');
        });

        // Catch-all: proxy all paths to Next when frontend-theme is active, otherwise run TI controller
        Route::any('{slug?}', function ($slug = null) {
            $active = params('default_themes.main', config('system.defaultTheme'));
            if ($active === 'frontend-theme') {
                $path = '/'.ltrim($slug ?? '', '/');
                // Exclusions to keep backend working
                $exclusions = [
                    '/admin',
                    config('system.assetsCombinerUri', '/_assets'),
                    '/api',
                    '/api-server.php',
                    '/simple-theme',
                    '/vat-settings',
                    '/validate-coupon',
                    '/orders',
                ];
                foreach ($exclusions as $ex) {
                    if ($path === $ex || strpos($path, rtrim($ex,'/').'/') === 0) {
                        return app('System\\Classes\\Controller')->run($path);
                    }
                }

                $next = env('NEXT_PROXY_ORIGIN', 'http://localhost:3001');
                // Preserve query string and path
                $uri = request()->getRequestUri();
                $target = rtrim($next, '/').'/'.ltrim($uri, '/');

                $ch = curl_init($target);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HEADER, false);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                // Forward method/body
                $method = request()->getMethod();
                if ($method !== 'GET') {
                    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, request()->getContent());
                }
                $resp = curl_exec($ch);
                $ctype = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'text/html; charset=UTF-8';
                curl_close($ch);

                return response($resp)->header('Content-Type', $ctype);
            }

            return app('System\\Classes\\Controller')->run($slug);
        })->where('slug', '(.*)?');
