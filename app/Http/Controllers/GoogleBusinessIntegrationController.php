<?php

namespace App\Http\Controllers;

use App\Services\GoogleBusiness\PmdGoogleBusinessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleBusinessIntegrationController extends Controller
{
    public function callback(Request $request, PmdGoogleBusinessService $google)
    {
        $state = (string)$request->query('state', '');
        $tenantHost = '';

        try {
            $context = $google->consumeOAuthState($state);
            $tenantHost = (string)$context['tenant_host'];

            $requestHost = strtolower(trim((string)$request->getHost()));
            if ($requestHost === '' || !hash_equals($tenantHost, $requestHost)) {
                throw new \RuntimeException('Google OAuth callback tenant does not match the restaurant that started the connection.');
            }

            if ($request->filled('error')) {
                throw new \RuntimeException(
                    'Google authorization was not completed: '.(string)$request->query('error')
                );
            }

            $google->completeOAuth(
                (int)$context['location_id'],
                (string)$request->query('code', ''),
                $tenantHost
            );

            return redirect(
                'https://'.$tenantHost.'/admin/pmdgooglebusiness/locations?google=authorized'
            );
        } catch (\Throwable $error) {
            Log::error('PMD Google Business OAuth callback failed', [
                'tenant_host' => $tenantHost ?: null,
                'message' => $error->getMessage(),
            ]);

            if ($tenantHost !== '') {
                return redirect(
                    'https://'.$tenantHost.'/admin/pmdsettings/restaurant?google=error'
                );
            }

            return response(
                'Google Business Profile connection could not be completed. Return to PayMyDine and try again.',
                400
            );
        }
    }

    public function pubsub(Request $request, PmdGoogleBusinessService $google)
    {
        $provided = trim((string)(
            $request->query('token')
            ?: $request->header('X-PMD-Google-PubSub-Token', '')
        ));

        if (!$google->verifyPubSubToken($provided)) {
            return response()->json(['ok' => false, 'error' => 'unauthorized'], 401);
        }

        try {
            $result = $google->handlePubSubPush((array)$request->all());

            return response()->json([
                'ok' => true,
                'processed' => (int)($result['processed'] ?? 0),
            ]);
        } catch (\Throwable $error) {
            Log::error('PMD Google Business Pub/Sub handler failed', [
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'error' => 'review sync failed',
            ], 500);
        }
    }
}
