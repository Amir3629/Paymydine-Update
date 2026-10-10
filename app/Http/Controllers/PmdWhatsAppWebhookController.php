<?php

namespace App\Http\Controllers;

use App\Services\WhatsApp\PmdWhatsAppGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Meta signs webhook requests with X-Hub-Signature-256 using the App Secret.
 * Do NOT authenticate callbacks with the temporary Graph API access token.
 */
final class PmdWhatsAppWebhookController extends Controller
{
    public function verify(Request $request)
    {
        if (!$this->enabledForHost($request)) {
            return response('Not found', 404);
        }

        $token = (string)config('pmd_whatsapp.verify_token', '');
        // PHP parse_str normalizes Meta's dotted hub.* query keys into
        // hub_* (e.g. hub.verify_token => hub_verify_token). Accept both.
        $provided = (string)$request->query(
            'hub.verify_token',
            $request->query('hub_verify_token', '')
        );
        $challenge = (string)$request->query(
            'hub.challenge',
            $request->query('hub_challenge', '')
        );
        $mode = (string)$request->query(
            'hub.mode',
            $request->query('hub_mode', '')
        );
        if ($mode !== 'subscribe'
            || strlen($token) < 32
            || $provided === ''
            || !hash_equals($token, $provided)
            || !preg_match('/^[0-9]{1,32}$/D', $challenge)) {
            return response('Forbidden', 403);
        }

        return response($challenge, 200)
            ->header('Content-Type', 'text/plain; charset=UTF-8')
            ->header('Cache-Control', 'no-store');
    }

    public function receive(Request $request, PmdWhatsAppGateway $gateway)
    {
        if (!$this->enabledForHost($request)) {
            return response('Not found', 404);
        }

        $raw = (string)$request->getContent();
        $max = (int)config('pmd_whatsapp.max_body_bytes', 131072);
        if ($raw === '' || strlen($raw) > $max) {
            return response('Invalid payload', 413);
        }

        $appSecret = (string)config('pmd_whatsapp.app_secret', '');
        $signature = (string)$request->header('X-Hub-Signature-256', '');
        if (!$gateway->validSignature($raw, $signature, $appSecret)) {
            return response('Forbidden', 403);
        }

        $data = json_decode($raw, true);
        if (!is_array($data)
            || ($data['object'] ?? null) !== 'whatsapp_business_account'
            || !isset($data['entry'])
            || !is_array($data['entry'])) {
            return response('Bad payload', 400);
        }

        try {
            $gateway->ingest($data);
        } catch (Throwable $error) {
            // Never log message bodies, numbers, tokens, or full exception
            // messages (which may contain sensitive provider material).
            Log::warning('PMD WhatsApp webhook persistence unavailable', [
                'exception_type' => get_class($error),
            ]);
            return response('Temporarily unavailable', 503);
        }

        return response('EVENT_RECEIVED', 200)
            ->header('Content-Type', 'text/plain; charset=UTF-8')
            ->header('Cache-Control', 'no-store');
    }

    private function enabledForHost(Request $request): bool
    {
        $host = strtolower(trim((string)config('pmd_whatsapp.webhook_host', '')));
        return config('pmd_whatsapp.enabled', false) === true
            && $request->isSecure()
            && $host !== ''
            && $host === strtolower((string)$request->getHost());
    }
}
