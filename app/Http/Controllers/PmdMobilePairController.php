<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Models\Users_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdMobileSync\PmdMobilePairingService;
use App\Services\PmdSiteAccessService;
use Illuminate\Support\Facades\Hash;
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
                // PMD_MOBILE_PAIR_SIGNED_HANDOFF_V3
                // Carry the public PKCE challenge + request id explicitly
                // through Login instead of relying only on browser session state.
                return redirect($pairing->loginUrl($request));
            }

            $security = app(PmdSiteAccessWorkspaceGateService::class)
                ->gateResponse($request);
            if ($security) {
                return $security;
            }

            $pairing->beginDashboardApproval($request);
            $status = $pairing->browserApprovalStatus($request);

            return response(
                $this->waitingPage(
                    (string)$request->getHost(),
                    (string)($status['request_code'] ?? '')
                ),
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

    /** PMD_MOBILE_PAIR_DASHBOARD_WAIT_V4 */
    public function wait(Request $request, PmdMobilePairingService $pairing)
    {
        if (!AdminAuth::isLogged()) {
            return response()->json([
                'ok' => false,
                'status' => 'authentication_required',
            ], 401, ['Cache-Control' => 'no-store, private']);
        }

        return response()->json(
            $pairing->browserApprovalStatus($request),
            200,
            ['Cache-Control' => 'no-store, private']
        );
    }

    /** PMD_MOBILE_NATIVE_PAIR_REQUEST_V12 */
    public function requestNative(
        Request $request,
        PmdMobilePairingService $pairing
    ) {
        $data = $request->validate([
            'pair_request' => ['required', 'uuid'],
            'code_challenge' => [
                'required',
                'string',
                'size:43',
                'regex:/^[A-Za-z0-9_-]+$/',
            ],
            'device_name' => ['nullable', 'string', 'max:128'],
            'username' => ['required', 'string', 'max:191'],
            'password' => ['required', 'string', 'min:6', 'max:191'],
        ]);

        $typedUsername = trim((string)$data['username']);
        $lookupUsername = $typedUsername;
        $lower = mb_strtolower($typedUsername);

        // Pairing always uses the normal workspace identity, matching the
        // canonical web pairing behavior even if someone typed usernameportal.
        if (
            mb_strlen($typedUsername) > 6
            && str_ends_with($lower, 'portal')
        ) {
            $lookupUsername = trim(
                mb_substr(
                    $typedUsername,
                    0,
                    mb_strlen($typedUsername) - 6
                )
            );
        }

        $user = $lookupUsername !== ''
            ? Users_model::query()
                ->whereRaw(
                    'LOWER(username) = ?',
                    [mb_strtolower($lookupUsername)]
                )
                ->first()
            : null;
        $staff = $user ? $user->staff : null;
        $passwordHash = (string)($user->password ?? '');

        if (
            !$user
            || !$staff
            || (isset($user->is_activated) && !(bool)$user->is_activated)
            || (isset($staff->staff_status) && !(bool)$staff->staff_status)
            || $passwordHash === ''
            || !Hash::check((string)$data['password'], $passwordHash)
        ) {
            return response()->json([
                'ok' => false,
                'message' => 'Username or password is incorrect.',
            ], 401, ['Cache-Control' => 'no-store, private']);
        }

        $roles = app(PmdDefaultStaffRoleService::class);
        $roleCode = $roles->roleCodeForUser($user);
        if (
            $roleCode === ''
            || $roles->routeForRoleCode($roleCode) === null
        ) {
            return response()->json([
                'ok' => false,
                'message' => 'This PayMyDine account has no active workspace role.',
            ], 403, ['Cache-Control' => 'no-store, private']);
        }

        $site = app(PmdSiteAccessService::class);
        $identity = $site->identity($user);

        if (
            (int)($identity['user_id'] ?? 0) < 1
            || (int)($identity['staff_id'] ?? 0) < 1
            || (int)($identity['location_id'] ?? 0) < 1
        ) {
            return response()->json([
                'ok' => false,
                'message' => 'This PayMyDine account is not assigned to an active restaurant location.',
            ], 403, ['Cache-Control' => 'no-store, private']);
        }

        try {
            return response()->json(
                $pairing->beginNativeDashboardApproval(
                    $request,
                    $identity,
                    (string)$data['pair_request'],
                    (string)$data['code_challenge'],
                    (string)($data['device_name']
                        ?? 'PayMyDine Android · Restaurant App')
                ),
                200,
                ['Cache-Control' => 'no-store, private']
            );
        } catch (\InvalidArgumentException $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 422, ['Cache-Control' => 'no-store, private']);
        } catch (\Throwable $error) {
            report($error);

            return response()->json([
                'ok' => false,
                'message' => $error->getMessage()
                    ?: 'Android connection could not be requested.',
            ], 409, ['Cache-Control' => 'no-store, private']);
        }
    }

    public function status(Request $request, PmdMobilePairingService $pairing)
    {
        $data = $request->validate([
            'pair_request' => ['required', 'uuid'],
            'code_verifier' => [
                'required',
                'string',
                'min:43',
                'max:128',
                'regex:/^[A-Za-z0-9._~-]+$/',
            ],
        ]);

        return response()->json(
            $pairing->status(
                $request,
                (string)$data['pair_request'],
                (string)$data['code_verifier']
            ),
            200,
            ['Cache-Control' => 'no-store, private']
        );
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

    private function waitingPage(string $host, string $requestCode): string
    {
        $safeHost = htmlspecialchars($host, ENT_QUOTES, 'UTF-8');
        $code = preg_replace('/\D+/', '', $requestCode);
        $safeCode = htmlspecialchars(
            strlen($code) === 6
                ? substr($code, 0, 3).' '.substr($code, 3)
                : '--- ---',
            ENT_QUOTES,
            'UTF-8'
        );
        $waitUrl = htmlspecialchars(
            admin_url('mobile/pair/wait'),
            ENT_QUOTES,
            'UTF-8'
        );
        $logo = htmlspecialchars(
            url('/app/admin/assets/images/pmd-brand-mark.svg'),
            ENT_QUOTES,
            'UTF-8'
        );

        return '<!doctype html><html><head><meta charset="utf-8">'
            .'<meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>Connect PayMyDine Android</title>'
            .'<style>'
            .':root{color-scheme:light}*{box-sizing:border-box}'
            .'body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f4f8f6;color:#17342f;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}'
            .'.card{width:min(520px,100%);padding:30px;border:1px solid #d9e6e2;border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(5,42,36,.12)}'
            .'.brand{display:flex;align-items:center;gap:13px}.brand img{width:52px;height:52px;object-fit:contain}.brand strong{font-size:20px;letter-spacing:-.02em}'
            .'h1{margin:26px 0 8px;font-size:27px;letter-spacing:-.03em}p{margin:0;color:#687a75;line-height:1.55}'
            .'.codebox{margin:24px 0 14px;padding:20px;border:1px solid #c8dfd7;border-radius:18px;background:#f1f8f5;text-align:center}'
            .'.label{color:#6c7c78;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.code{margin-top:8px;color:#063f36;font-size:38px;font-weight:950;letter-spacing:.14em;font-variant-numeric:tabular-nums}'
            .'.steps{display:grid;gap:8px;margin-top:18px;padding:0;list-style:none}.steps li{display:flex;gap:10px;align-items:flex-start;color:#49635c;font-size:13px;line-height:1.45}.n{display:grid;place-items:center;flex:0 0 24px;height:24px;border-radius:999px;background:#063f36;color:#fff;font-size:11px;font-weight:900}'
            .'.status{margin-top:20px;padding:12px 14px;border-radius:13px;background:#fbfcfc;color:#567069;font-size:12px;font-weight:750}.host{margin-top:12px;color:#8a9995;font-size:11px;text-align:center}'
            .'</style></head><body><main class="card">'
            .'<div class="brand"><img src="'.$logo.'" alt=""><strong>PayMyDine</strong></div>'
            .'<h1>Approve this Android device</h1>'
            .'<p>No second confirmation page is required here. The connection request is waiting on an already trusted restaurant dashboard.</p>'
            .'<div class="codebox"><div class="label">Connection code</div><div class="code" data-code>'.$safeCode.'</div></div>'
            .'<ul class="steps">'
            .'<li><span class="n">1</span><span>Open PayMyDine on a trusted Cashier, Manager or Owner dashboard.</span></li>'
            .'<li><span class="n">2</span><span>Tap the small security/person icon at the bottom-right.</span></li>'
            .'<li><span class="n">3</span><span>Match this six-digit code and approve the Android connection card.</span></li>'
            .'</ul>'
            .'<div class="status" data-status>Waiting for restaurant approval…</div>'
            .'<div class="host">'.$safeHost.'</div>'
            .'</main><script>'
            .'(function(){'
            .'var u='.json_encode($waitUrl, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).';'
            .'var s=document.querySelector("[data-status]"),c=document.querySelector("[data-code]");'
            .'function fmt(v){v=String(v||"").replace(/\D+/g,"").slice(0,6);return v.length===6?v.slice(0,3)+" "+v.slice(3):"--- ---"}'
            .'function poll(){fetch(u,{credentials:"same-origin",cache:"no-store",headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest"}})'
            .'.then(function(r){if(r.status===401){throw new Error("Sign-in expired.");}return r.json();})'
            .'.then(function(d){if(d.request_code)c.textContent=fmt(d.request_code);'
            .'if(d.status==="approved"||d.status==="exchanged"){s.textContent="Approved. Returning to PayMyDine…";if(d.deep_link)setTimeout(function(){location.href=d.deep_link;},120);return;}'
            .'if(d.status==="declined"){s.textContent="Connection declined. Return to the PayMyDine app and try again.";return;}'
            .'if(d.status==="expired"){s.textContent="Connection request expired. Return to the PayMyDine app and try again.";return;}'
            .'s.textContent="Waiting for restaurant approval…";setTimeout(poll,1400);})'
            .'.catch(function(e){s.textContent=e.message||"Waiting for approval…";setTimeout(poll,2500);});}'
            .'poll();})();'
            .'</script></body></html>';
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
