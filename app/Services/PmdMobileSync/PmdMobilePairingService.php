<?php

namespace App\Services\PmdMobileSync;

use Admin\Facades\AdminAuth;
use App\Services\PmdSiteAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Browser-assisted native pairing.
 *
 * The browser handles canonical PayMyDine password/MFA/Site Access approval.
 * Android receives only a short-lived one-time exchange secret. The long-lived
 * device token is created/rotated only when that exchange is consumed.
 */
final class PmdMobilePairingService
{
    public const SESSION_INTENT = 'pmd_mobile_pair_intent_v1';
    private const EXCHANGE_TTL_SECONDS = 120;

    public function rememberIntent(Request $request): void
    {
        $host = strtolower((string)$request->getHost());
        $providedChallenge = trim((string)$request->query('code_challenge', ''));
        $existing = (array)session()->get(self::SESSION_INTENT, []);
        $existingCreated = (int)($existing['created_at'] ?? 0);
        $existingHost = strtolower(trim((string)($existing['host'] ?? '')));
        $existingChallenge = trim((string)($existing['code_challenge'] ?? ''));

        $reuseExisting = $providedChallenge === ''
            && $existingCreated > time() - 900
            && $existingHost !== ''
            && hash_equals($existingHost, $host)
            && $this->validCodeChallenge($existingChallenge);

        $codeChallenge = $reuseExisting
            ? $existingChallenge
            : $providedChallenge;

        if (!$this->validCodeChallenge($codeChallenge)) {
            throw new \InvalidArgumentException(
                'A valid Android pairing code_challenge is required.'
            );
        }

        session()->put(self::SESSION_INTENT, [
            'host' => $host,
            // Do not let the post-login continuation extend the original
            // pairing intent forever.
            'created_at' => $reuseExisting ? $existingCreated : time(),
            'code_challenge' => $codeChallenge,
        ]);
    }

    public function hasFreshIntent(Request $request): bool
    {
        $intent = (array)session()->get(self::SESSION_INTENT, []);
        $created = (int)($intent['created_at'] ?? 0);
        $host = strtolower(trim((string)($intent['host'] ?? '')));
        $codeChallenge = trim((string)($intent['code_challenge'] ?? ''));

        return $created > time() - 900
            && $host !== ''
            && hash_equals($host, strtolower((string)$request->getHost()))
            && $this->validCodeChallenge($codeChallenge);
    }

    public function start(Request $request): string
    {
        $this->rememberIntent($request);

        if (!AdminAuth::isLogged()) {
            return admin_url('login');
        }

        if (!Schema::hasTable('pmd_mobile_pair_exchanges')) {
            throw new \RuntimeException('PayMyDine mobile pairing storage is not ready.');
        }

        $site = app(PmdSiteAccessService::class);
        $identity = $site->identity();

        if (
            !$site->ready()
            || (int)$identity['user_id'] < 1
            || (int)$identity['staff_id'] < 1
            || (int)$identity['location_id'] < 1
        ) {
            throw new \RuntimeException('This PayMyDine account cannot pair a mobile device.');
        }

        if (!$site->policyEnabled((int)$identity['location_id'])) {
            throw new \RuntimeException(
                'Activate the restaurant Site Access hub before pairing Android devices.'
            );
        }

        // A trusted browser cookie must not silently authorize a new Android
        // installation. Force a fresh pair_staff_device approval challenge.
        $challengeRequest = clone $request;
        $challengeRequest->cookies->remove(PmdSiteAccessService::STAFF_DEVICE_COOKIE);

        $challenge = $site->beginChallenge(
            PmdSiteAccessService::PURPOSE_PAIR_STAFF,
            admin_url('mobile/pair/finish'),
            $challengeRequest
        );

        if (!$challenge) {
            throw new \RuntimeException('Mobile pairing approval could not be started.');
        }

        return admin_url('login');
    }

    public function finish(Request $request): string
    {
        if (!AdminAuth::isLogged() || !$this->hasFreshIntent($request)) {
            throw new \RuntimeException('The mobile pairing session expired. Start again from the app.');
        }

        $site = app(PmdSiteAccessService::class);
        $identity = $site->identity();
        $intent = (array)session()->get(self::SESSION_INTENT, []);
        $codeChallenge = trim((string)($intent['code_challenge'] ?? ''));
        $deviceId = (int)session()->pull(PmdSiteAccessService::SESSION_LAST_PAIRED_DEVICE, 0);

        if (!$this->validCodeChallenge($codeChallenge)) {
            throw new \RuntimeException(
                'The Android pairing challenge expired. Start again from the app.'
            );
        }

        if ($deviceId < 1) {
            throw new \RuntimeException('No approved mobile device was found for this session.');
        }

        $device = DB::table('pmd_site_access_devices')
            ->where('id', $deviceId)
            ->where('device_kind', 'staff_personal')
            ->where('location_id', (int)$identity['location_id'])
            ->where('staff_id', (int)$identity['staff_id'])
            ->whereNull('revoked_at')
            ->first();

        if (!$device) {
            throw new \RuntimeException('The approved mobile device no longer matches this account.');
        }

        $rawExchange = bin2hex(random_bytes(32));
        $publicId = (string)Str::uuid();

        DB::transaction(function () use (
            $identity,
            $deviceId,
            $rawExchange,
            $publicId,
            $codeChallenge
        ) {
            DB::table('pmd_mobile_pair_exchanges')
                ->where('device_id', $deviceId)
                ->whereNull('used_at')
                ->update([
                    'used_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('pmd_mobile_pair_exchanges')->insert([
                'public_id' => $publicId,
                'exchange_hash' => $this->exchangeHash(
                    $rawExchange,
                    $codeChallenge
                ),
                'location_id' => (int)$identity['location_id'],
                'device_id' => $deviceId,
                'user_id' => (int)$identity['user_id'] ?: null,
                'staff_id' => (int)$identity['staff_id'] ?: null,
                'expires_at' => now()->addSeconds(self::EXCHANGE_TTL_SECONDS),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        session()->forget(self::SESSION_INTENT);

        return 'paymydine://pair?exchange='.rawurlencode($rawExchange)
            .'&tenant='.rawurlencode('https://'.$request->getHost());
    }

    public function exchange(
        Request $request,
        string $rawExchange,
        string $codeVerifier
    ): array
    {
        if (!Schema::hasTable('pmd_mobile_pair_exchanges')) {
            abort(503, 'PayMyDine mobile pairing storage is not ready.');
        }

        $rawExchange = strtolower(trim($rawExchange));
        $codeVerifier = trim($codeVerifier);
        if (!preg_match('/^[a-f0-9]{64}$/', $rawExchange)) {
            abort(422, 'The PayMyDine pairing exchange is not valid.');
        }
        if (!preg_match('/^[A-Za-z0-9._~-]{43,128}$/', $codeVerifier)) {
            abort(422, 'The PayMyDine pairing code_verifier is not valid.');
        }

        $codeChallenge = $this->codeChallengeFromVerifier($codeVerifier);

        return DB::transaction(function () use (
            $request,
            $rawExchange,
            $codeChallenge
        ) {
            $exchange = DB::table('pmd_mobile_pair_exchanges')
                ->where(
                    'exchange_hash',
                    $this->exchangeHash($rawExchange, $codeChallenge)
                )
                ->lockForUpdate()
                ->first();

            if (
                !$exchange
                || $exchange->used_at
                || now()->greaterThanOrEqualTo($exchange->expires_at)
            ) {
                abort(410, 'The PayMyDine pairing exchange expired or was already used.');
            }

            $device = DB::table('pmd_site_access_devices')
                ->where('id', (int)$exchange->device_id)
                ->where('location_id', (int)$exchange->location_id)
                ->where('device_kind', 'staff_personal')
                ->whereNull('revoked_at')
                ->lockForUpdate()
                ->first();

            if (!$device) {
                abort(410, 'The paired PayMyDine device is no longer active.');
            }

            $site = app(PmdSiteAccessService::class);
            $deviceToken = $site->rotateTrustedDeviceToken(
                (int)$device->id,
                'staff_personal'
            );

            $capabilities = json_decode((string)($device->capabilities ?? '[]'), true);
            if (!is_array($capabilities)) $capabilities = [];
            $capabilities = array_values(array_unique(array_merge(
                $capabilities,
                ['staff_portal', 'mobile_app', 'mobile_sync_v1']
            )));

            $update = [
                'capabilities' => json_encode($capabilities),
                'last_seen_at' => now(),
                'updated_at' => now(),
            ];

            if (Schema::hasColumn('pmd_site_access_devices', 'user_id')) {
                $update['user_id'] = (int)$exchange->user_id ?: null;
            }

            DB::table('pmd_site_access_devices')
                ->where('id', (int)$device->id)
                ->update($update);

            DB::table('pmd_mobile_pair_exchanges')
                ->where('id', (int)$exchange->id)
                ->update([
                    'used_at' => now(),
                    'updated_at' => now(),
                ]);

            $identity = [
                'location_id' => (int)$exchange->location_id,
                'user_id' => (int)$exchange->user_id,
                'staff_id' => (int)$exchange->staff_id,
            ];
            $site->audit(
                'mobile_device_exchange',
                true,
                $identity,
                (int)$device->id,
                null,
                $request,
                ['protocol' => 'pmd-sync-v1']
            );

            return [
                'ok' => true,
                'protocol' => 'pmd-sync-v1',
                'device_token' => $deviceToken,
                'device_id' => (int)$device->id,
                'location_id' => (int)$exchange->location_id,
                'user_id' => (int)$exchange->user_id,
                'staff_id' => (int)$exchange->staff_id,
            ];
        });
    }

    private function exchangeHash(
        string $raw,
        string $codeChallenge
    ): string {
        return hash_hmac(
            'sha256',
            'mobile-exchange|'.$codeChallenge.'|'.$raw,
            (string)config('app.key', 'pmd-mobile-pairing')
        );
    }

    private function codeChallengeFromVerifier(string $verifier): string
    {
        return rtrim(
            strtr(
                base64_encode(hash('sha256', $verifier, true)),
                '+/',
                '-_'
            ),
            '='
        );
    }

    private function validCodeChallenge(string $value): bool
    {
        return (bool)preg_match('/^[A-Za-z0-9_-]{43}$/', $value);
    }
}
