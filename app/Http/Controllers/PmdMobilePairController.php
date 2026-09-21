<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use App\Services\PmdMobileSync\PmdMobilePairingService;
use App\Services\PmdSiteAccessWorkspaceGateService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class PmdMobilePairController extends Controller
{
    public function start(Request $request, PmdMobilePairingService $pairing)
    {
        try {
            // Save PKCE intent before generic Workspace security can redirect
            // this browser to Login/MFA/restaurant verification.
            $pairing->rememberIntent($request);

            if (!AdminAuth::isLogged()) {
                return redirect(admin_url('login'));
            }

            $security = app(PmdSiteAccessWorkspaceGateService::class)
                ->gateResponse($request);
            if ($security) {
                return $security;
            }

            return response(
                $this->approvalPage((string)$request->getHost()),
                200,
                [
                    'Content-Type' => 'text/html; charset=UTF-8',
                    'Cache-Control' => 'no-store, private',
                ]
            );
        } catch (\Throwable $error) {
            report($error);

            return response(
                $this->messagePage(
                    'PayMyDine pairing could not start',
                    $error->getMessage()
                ),
                409,
                [
                    'Content-Type' => 'text/html; charset=UTF-8',
                    'Cache-Control' => 'no-store',
                ]
            );
        }
    }

    public function approve(Request $request, PmdMobilePairingService $pairing)
    {
        try {
            if (!AdminAuth::isLogged()) {
                return redirect(admin_url('login'));
            }

            $deepLink = $pairing->approveVerifiedSession($request);

            return response(
                $this->approvedPage($deepLink),
                200,
                [
                    'Content-Type' => 'text/html; charset=UTF-8',
                    'Cache-Control' => 'no-store, private',
                ]
            );
        } catch (\Throwable $error) {
            report($error);

            return response(
                $this->messagePage(
                    'Android connection expired',
                    $error->getMessage()
                ),
                410,
                [
                    'Content-Type' => 'text/html; charset=UTF-8',
                    'Cache-Control' => 'no-store',
                ]
            );
        }
    }

    /**
     * Backward-compatible finish route for any browser session that already
     * completed the older Site Access pairing challenge.
     */
    public function finish(Request $request, PmdMobilePairingService $pairing)
    {
        try {
            return response(
                $this->approvedPage($pairing->finish($request)),
                200,
                [
                    'Content-Type' => 'text/html; charset=UTF-8',
                    'Cache-Control' => 'no-store, private',
                ]
            );
        } catch (\Throwable $error) {
            report($error);

            return response(
                $this->messagePage(
                    'Android connection expired',
                    $error->getMessage()
                ),
                410,
                [
                    'Content-Type' => 'text/html; charset=UTF-8',
                    'Cache-Control' => 'no-store',
                ]
            );
        }
    }

    public function exchange(Request $request, PmdMobilePairingService $pairing)
    {
        $data = $request->validate([
            'exchange' => ['required', 'string', 'size:64'],
            'code_verifier' => [
                'required',
                'string',
                'min:43',
                'max:128',
                'regex:/^[A-Za-z0-9._~-]+$/',
            ],
        ]);

        return response()->json(
            $pairing->exchange(
                $request,
                (string)$data['exchange'],
                (string)$data['code_verifier']
            ),
            200,
            ['Cache-Control' => 'no-store, private']
        );
    }

    private function approvalPage(string $host): string
    {
        $safeHost = htmlspecialchars($host, ENT_QUOTES, 'UTF-8');
        $action = htmlspecialchars(
            admin_url('mobile/pair/approve'),
            ENT_QUOTES,
            'UTF-8'
        );
        $csrf = htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8');

        return '<!doctype html><html><head><meta charset="utf-8">'
            .'<meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>Connect PayMyDine</title>'
            .'<style>'
            .'body{margin:0;background:#f6f8f7;color:#102f2a;font-family:system-ui,-apple-system,sans-serif}'
            .'.card{max-width:460px;margin:12vh auto;padding:28px;background:#fff;border:1px solid #dce8e4;border-radius:22px;box-shadow:0 18px 50px rgba(7,48,41,.09)}'
            .'h1{margin:0 0 10px;font-size:26px}p{color:#667a74;line-height:1.5}'
            .'button{width:100%;height:52px;border:0;border-radius:14px;background:#073f35;color:#fff;font-size:16px;font-weight:800;cursor:pointer}'
            .'.host{padding:12px 14px;border-radius:12px;background:#f1f7f5;font-weight:750;margin:18px 0}'
            .'</style></head><body><main class="card">'
            .'<h1>Connect this Android device?</h1>'
            .'<p>Your PayMyDine security check is complete. Confirm once to connect this tablet to the restaurant.</p>'
            .'<div class="host">'.$safeHost.'</div>'
            .'<form method="post" action="'.$action.'">'
            .'<input type="hidden" name="_token" value="'.$csrf.'">'
            .'<button type="submit">Connect device</button>'
            .'</form></main></body></html>';
    }

    private function approvedPage(string $deepLink): string
    {
        $safe = htmlspecialchars($deepLink, ENT_QUOTES, 'UTF-8');
        $json = json_encode(
            $deepLink,
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
        );

        return '<!doctype html><html><head><meta charset="utf-8">'
            .'<meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>Open PayMyDine</title>'
            .'<style>'
            .'body{margin:0;background:#f6f8f7;color:#102f2a;font-family:system-ui,-apple-system,sans-serif}'
            .'.card{max-width:460px;margin:12vh auto;padding:28px;background:#fff;border:1px solid #dce8e4;border-radius:22px;text-align:center}'
            .'h1{margin:0 0 10px;font-size:26px}p{color:#667a74;line-height:1.5}'
            .'a{display:grid;place-items:center;height:52px;margin-top:20px;border-radius:14px;background:#073f35;color:#fff;text-decoration:none;font-weight:800}'
            .'</style></head><body><main class="card">'
            .'<h1>Device connected</h1>'
            .'<p>Returning to the PayMyDine app…</p>'
            .'<a href="'.$safe.'">Open PayMyDine</a>'
            .'</main><script>'
            .'(function(){var u='.$json.';setTimeout(function(){window.location.href=u;},120);})();'
            .'</script></body></html>';
    }

    private function messagePage(string $title, string $message): string
    {
        return '<!doctype html><html><head><meta charset="utf-8">'
            .'<meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</title>'
            .'<style>body{font-family:system-ui,-apple-system,sans-serif;padding:32px;max-width:680px;margin:auto;color:#173b34}p{color:#667a74}</style>'
            .'</head><body>'
            .'<h1>'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</h1>'
            .'<p>'.htmlspecialchars($message, ENT_QUOTES, 'UTF-8').'</p>'
            .'</body></html>';
    }
}
