<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class StaticProxyController extends Controller
{
    public function paymentIcon(Request $request, string $filename)
    {
        // whitelist filenames like cod.svg, google_pay.svg, apple_pay.png...
        if (!preg_match('/^[a-z0-9_\-]+\.(svg|png|jpg|jpeg|webp)$/i', $filename)) {
            return response('Not found', 404);
        }

        $origin = rtrim(config('services.frontend.static_origin'), '/');
        $url    = $origin . '/images/payments/' . $filename;

        // fetch bytes
        $resp = Http::withHeaders([
            'Accept' => '*/*',
            'User-Agent' => 'PMD-Static-Proxy',
        ])->get($url);

        if (!$resp->ok()) {
            // optional fallback: if FE is down, try a local copy (see step 2)
            $local = public_path('images/payments/' . $filename);
            if (is_file($local)) {
                return response()->file($local, [
                    'Cache-Control' => 'public, max-age=3600',
                ]);
            }
            return response('Not found', 404);
        }

        $ctype = strtolower($resp->header('Content-Type', 'application/octet-stream'));
        // block HTML fallbacks (gray boxes problem)
        if (str_contains($ctype, 'text/html')) {
            return response('Not found', 404);
        }

        return response($resp->body(), Response::HTTP_OK)
            ->header('Content-Type', $ctype)
            ->header('Cache-Control', $resp->header('Cache-Control', 'public, max-age=3600'));
    }
}