<?php

namespace App\Services\PmdMobileSync;

use Admin\Facades\AdminAuth;
use App\Services\PmdSiteAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Crypt;
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
    public const INTENT_COOKIE = 'pmd_mobile_pair_intent_v2';
    public const HANDOFF_PARAM = 'pmd_pair';
    private const INTENT_TTL_SECONDS = 900;
    private const EXCHANGE_TTL_SECONDS = 300;

    public function rememberIntent(Request $request): void
    {
        $host = strtolower((string)$request->getHost());
        $providedChallenge = trim((string)$request->query('code_challenge', ''));
        $providedRequest = strtolower(trim((string)$request->query('pair_request', '')));
        $providedDeviceName = trim((string)$request->query(
            'device_name',
            'PayMyDine Android Tablet'
        ));

        if ($providedRequest !== '' && !$this->validPairRequest($providedRequest)) {
            throw new \InvalidArgumentException(
                'A valid Android pair_request is required.'
            );
        }

        // PMD_MOBILE_PAIR_SEALED_INTENT_V2
        // Admin login/security may rotate or invalidate the Laravel session.
        // Recover the short-lived pairing intent from an encrypted, host-only
        // cookie so the Android destination survives that canonical flow.
        $existing = $this->intent($request);
        $existingCreated = (int)($existing['created_at'] ?? 0);
        $existingHost = strtolower(trim((string)($existing['host'] ?? '')));
        $existingChallenge = trim((string)($existing['code_challenge'] ?? ''));
        $existingRequest = strtolower(trim((string)($existing['pair_request'] ?? '')));
        $existingDeviceName = trim((string)($existing['device_name'] ?? ''));

        $reuseExisting = $providedChallenge === ''
            && $providedRequest === ''
            && $existingCreated > time() - 900
            && $existingHost !== ''
            && hash_equals($existingHost, $host)
            && $this->validCodeChallenge($existingChallenge)
            && $this->validPairRequest($existingRequest);

        $codeChallenge = $reuseExisting
            ? $existingChallenge
            : $providedChallenge;

        if (!$this->validCodeChallenge($codeChallenge)) {
            throw new \InvalidArgumentException(
                'A valid Android pairing code_challenge is required.'
            );
        }

        $pairRequest = $reuseExisting
            ? $existingRequest
            : ($providedRequest !== '' ? $providedRequest : (string)Str::uuid());

        $intent = [
            'host' => $host,
            // Do not let the post-login continuation extend the original
            // pairing intent forever.
            'created_at' => $reuseExisting ? $existingCreated : time(),
            'code_challenge' => $codeChallenge,
            'pair_request' => $pairRequest,
            'device_name' => mb_substr(
                $reuseExisting && $existingDeviceName !== ''
                    ? $existingDeviceName
                    : ($providedDeviceName !== '' ? $providedDeviceName : 'PayMyDine Android Tablet'),
                0,
                128
            ),
        ];

        session()->put(self::SESSION_INTENT, $intent);
        $this->queueIntentCookie($intent);

        logger()->info('PMD mobile pairing intent stored', [
            'host' => $host,
            'pair_request' => $pairRequest,
            'transport' => 'session+sealed_cookie',
        ]);
    }

    public function hasFreshIntent(Request $request): bool
    {
        return $this->validIntent(
            $this->intent($request),
            $request
        );
    }

    /** PMD_MOBILE_PAIR_SIGNED_HANDOFF_V3 */
    public function signedHandoff(Request $request): string
    {
        $intent = $this->intent($request);
        if (!$this->validIntent($intent, $request)) {
            throw new \RuntimeException(
                'The Android pairing request expired. Start again from the app.'
            );
        }

        $body = $this->base64UrlEncode(
            json_encode(
                [
                    'v' => 1,
                    'host' => strtolower(trim((string)($intent['host'] ?? ''))),
                    'created_at' => (int)($intent['created_at'] ?? 0),
                    'code_challenge' => trim((string)($intent['code_challenge'] ?? '')),
                    'pair_request' => strtolower(trim((string)($intent['pair_request'] ?? ''))),
                    'device_name' => mb_substr(
                        trim((string)($intent['device_name'] ?? 'PayMyDine Android Tablet')),
                        0,
                        128
                    ),
                ],
                JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            )
        );

        $signature = $this->base64UrlEncode(
            hash_hmac(
                'sha256',
                'pmd-mobile-pair-handoff-v1|'.$body,
                (string)config('app.key', 'pmd-mobile-pairing'),
                true
            )
        );

        return $body.'.'.$signature;
    }

    public function loginUrl(Request $request): string
    {
        return admin_url('login').'?'.http_build_query([
            self::HANDOFF_PARAM => $this->signedHandoff($request),
        ]);
    }

    public function restoreSignedHandoff(Request $request): bool
    {
        $token = trim((string)$request->input(self::HANDOFF_PARAM, ''));
        if ($token === '') {
            return false;
        }

        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return false;
        }

        [$body, $signature] = $parts;
        if ($body === '' || $signature === '') {
            return false;
        }

        $expected = $this->base64UrlEncode(
            hash_hmac(
                'sha256',
                'pmd-mobile-pair-handoff-v1|'.$body,
                (string)config('app.key', 'pmd-mobile-pairing'),
                true
            )
        );

        if (!hash_equals($expected, $signature)) {
            return false;
        }

        try {
            $decoded = json_decode(
                $this->base64UrlDecode($body),
                true,
                16,
                JSON_THROW_ON_ERROR
            );
        } catch (\Throwable $error) {
            return false;
        }

        if (!is_array($decoded) || !$this->validIntent($decoded, $request)) {
            return false;
        }

        session()->put(self::SESSION_INTENT, $decoded);
        $this->queueIntentCookie($decoded);

        logger()->info('PMD mobile pairing signed handoff restored', [
            'host' => strtolower((string)$request->getHost()),
            'pair_request' => strtolower(trim((string)($decoded['pair_request'] ?? ''))),
            'transport' => 'signed_login_handoff',
        ]);

        return true;
    }

    public function start(Request $request): string
    {
        $this->rememberIntent($request);

        if (!AdminAuth::isLogged()) {
            return admin_url('login');
        }

        $this->ensureMobileSyncStorage();

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

    /**
     * PMD_MOBILE_PAIR_DASHBOARD_APPROVAL_V4
     *
     * Pairing no longer asks the requesting browser to approve itself. Once
     * canonical Login/MFA/Workspace security is complete, create a normal Site
     * Access challenge. The existing bottom-right restaurant approval surface
     * on Cashier/Manager/Owner then becomes the only approval UX.
     */
    public function beginDashboardApproval(Request $request)
    {
        $this->ensureMobileSyncStorage();

        if (!AdminAuth::isLogged() || !$this->hasFreshIntent($request)) {
            throw new \RuntimeException(
                'The Android pairing request expired. Start again from the app.'
            );
        }

        $site = app(PmdSiteAccessService::class);
        $identity = $site->identity();
        $locationId = (int)($identity['location_id'] ?? 0);
        $userId = (int)($identity['user_id'] ?? 0);
        $staffId = (int)($identity['staff_id'] ?? 0);

        if (!$site->ready() || $locationId < 1 || $userId < 1 || $staffId < 1) {
            throw new \RuntimeException(
                'This PayMyDine account cannot request an Android connection.'
            );
        }
        if (!$site->policyEnabled($locationId)) {
            throw new \RuntimeException(
                'Restaurant security must be active before connecting Android devices.'
            );
        }
        if (
            !$site->isWorkspaceVerified($locationId)
            || !app(\App\Services\PmdSiteAccessSessionBindingService::class)
                ->isBoundToCurrentUser()
        ) {
            throw new \RuntimeException(
                'Complete PayMyDine security verification before connecting this device.'
            );
        }

        $intent = $this->intent($request);
        $pairRequest = strtolower(trim((string)($intent['pair_request'] ?? '')));
        $codeChallenge = trim((string)($intent['code_challenge'] ?? ''));
        $deviceName = trim((string)($intent['device_name'] ?? 'PayMyDine Android Tablet'));

        if (
            !$this->validPairRequest($pairRequest)
            || !$this->validCodeChallenge($codeChallenge)
        ) {
            throw new \RuntimeException(
                'The Android PKCE pairing request is no longer valid.'
            );
        }

        $existingRequest = DB::table('pmd_mobile_pair_requests')
            ->where('pair_request', $pairRequest)
            ->first();

        if ($existingRequest) {
            $existingChallenge = DB::table('pmd_site_access_challenges')
                ->where('id', (int)$existingRequest->challenge_id)
                ->first();

            if (
                $existingChallenge
                && in_array(
                    (string)$existingChallenge->status,
                    ['pending', 'approved', 'used'],
                    true
                )
                && now()->lessThan($existingChallenge->expires_at)
            ) {
                DB::table('pmd_site_access_challenges')
                    ->where('id', (int)$existingChallenge->id)
                    ->update([
                        'requested_device_name' => mb_substr(
                            $deviceName !== '' ? $deviceName : 'PayMyDine Android Tablet',
                            0,
                            128
                        ),
                        'updated_at' => now(),
                    ]);
                session()->put(PmdSiteAccessService::SESSION_PENDING, [
                    'public_id' => (string)$existingChallenge->public_id,
                    'purpose' => PmdSiteAccessService::PURPOSE_PAIR_STAFF,
                    'redirect' => admin_url('mobile/pair/start'),
                ]);
                return $existingChallenge;
            }
        }

        // A browser that already has a personal-device cookie must not silently
        // self-authorize a new Android installation.
        $challengeRequest = clone $request;
        $challengeRequest->cookies->remove(PmdSiteAccessService::STAFF_DEVICE_COOKIE);

        $challenge = $site->beginChallenge(
            PmdSiteAccessService::PURPOSE_PAIR_STAFF,
            admin_url('mobile/pair/start'),
            $challengeRequest
        );

        if (!$challenge) {
            throw new \RuntimeException(
                'The restaurant Android approval request could not be created.'
            );
        }

        // PMD_MOBILE_PAIR_APPROVAL_CARD_DEVICE_V5
        // The dashboard approval card must identify the Android purpose selected
        // in the app, not the browser that transported Login/MFA.
        DB::table('pmd_site_access_challenges')
            ->where('id', (int)$challenge->id)
            ->update([
                'requested_device_name' => mb_substr(
                    $deviceName !== '' ? $deviceName : 'PayMyDine Android Tablet',
                    0,
                    128
                ),
                'updated_at' => now(),
            ]);

        DB::table('pmd_mobile_pair_requests')->updateOrInsert(
            ['pair_request' => $pairRequest],
            [
                'challenge_id' => (int)$challenge->id,
                'code_challenge' => $codeChallenge,
                'location_id' => $locationId,
                'user_id' => $userId,
                'staff_id' => $staffId,
                'device_name' => mb_substr(
                    $deviceName !== '' ? $deviceName : 'PayMyDine Android Tablet',
                    0,
                    128
                ),
                'status' => 'pending',
                'device_id' => null,
                'approved_at' => null,
                'expires_at' => $challenge->expires_at,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $site->audit(
            'mobile_device_pair_requested',
            true,
            $identity,
            null,
            (int)$challenge->id,
            $request,
            [
                'pair_request' => $pairRequest,
                'device_name' => $deviceName,
                'approval_surface' => 'restaurant_inline_approval',
            ]
        );

        return $challenge;
    }

    /**
     * PMD_MOBILE_NATIVE_PAIR_DASHBOARD_WAIT_V12
     *
     * Starts Android pairing without a browser handoff. Username/password have
     * already been verified by the native controller; this method creates the
     * same pair_staff_device Site Access challenge consumed by the existing
     * Owner/Manager/trusted-Cashier dashboard approval card.
     */
    public function beginNativeDashboardApproval(
        Request $request,
        array $identity,
        string $pairRequest,
        string $codeChallenge,
        string $deviceName
    ): array {
        $this->ensureMobileSyncStorage();

        $pairRequest = strtolower(trim($pairRequest));
        $codeChallenge = trim($codeChallenge);
        $deviceName = trim($deviceName);
        if ($deviceName === '') $deviceName = 'PayMyDine Android · Restaurant App';

        if (
            !$this->validPairRequest($pairRequest)
            || !$this->validCodeChallenge($codeChallenge)
        ) {
            throw new \InvalidArgumentException(
                'The Android secure pairing request is invalid.'
            );
        }

        $site = app(PmdSiteAccessService::class);
        $locationId = (int)($identity['location_id'] ?? 0);
        $userId = (int)($identity['user_id'] ?? 0);
        $staffId = (int)($identity['staff_id'] ?? 0);

        if (
            !$site->ready()
            || $locationId < 1
            || $userId < 1
            || $staffId < 1
        ) {
            throw new \RuntimeException(
                'This PayMyDine account cannot request an Android connection.'
            );
        }

        if (!$site->policyEnabled($locationId)) {
            throw new \RuntimeException(
                'Restaurant security must be active before connecting Android devices.'
            );
        }

        $existing = DB::table('pmd_mobile_pair_requests')
            ->where('pair_request', $pairRequest)
            ->where('code_challenge', $codeChallenge)
            ->first();

        if ($existing) {
            $challenge = DB::table('pmd_site_access_challenges')
                ->where('id', (int)$existing->challenge_id)
                ->first();

            if (
                $challenge
                && in_array(
                    (string)$challenge->status,
                    ['pending', 'approved', 'used'],
                    true
                )
                && now()->lessThan($existing->expires_at)
            ) {
                return [
                    'ok' => true,
                    'status' => (string)$existing->status,
                    'request_code' => $site->challengeCodeForHub($challenge),
                    'expires_at' => (string)$existing->expires_at,
                ];
            }
        }

        $challenge = $site->beginChallengeForIdentity(
            $identity,
            PmdSiteAccessService::PURPOSE_PAIR_STAFF,
            '',
            $request,
            false
        );

        if (!$challenge) {
            throw new \RuntimeException(
                'The restaurant Android approval request could not be created.'
            );
        }

        $safeName = mb_substr($deviceName, 0, 128);
        DB::table('pmd_site_access_challenges')
            ->where('id', (int)$challenge->id)
            ->update([
                'requested_device_name' => $safeName,
                'updated_at' => now(),
            ]);

        DB::table('pmd_mobile_pair_requests')->updateOrInsert(
            ['pair_request' => $pairRequest],
            [
                'challenge_id' => (int)$challenge->id,
                'code_challenge' => $codeChallenge,
                'location_id' => $locationId,
                'user_id' => $userId,
                'staff_id' => $staffId,
                'device_name' => $safeName,
                'status' => 'pending',
                'device_id' => null,
                'approved_at' => null,
                'expires_at' => $challenge->expires_at,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $site->audit(
            'mobile_device_pair_requested',
            true,
            $identity,
            null,
            (int)$challenge->id,
            $request,
            [
                'pair_request' => $pairRequest,
                'device_name' => $safeName,
                'approval_surface' => 'restaurant_inline_approval',
                'transport' => 'native_wait',
            ]
        );

        return [
            'ok' => true,
            'status' => 'pending',
            'request_code' => $site->challengeCodeForHub($challenge),
            'expires_at' => (string)$challenge->expires_at,
        ];
    }

    /**
     * Called by the existing restaurant approval endpoint after an Owner,
     * Manager or trusted Cashier approves the Site Access challenge.
     *
     * Device creation + one-time PKCE exchange are persisted here, so Android
     * can finish pairing even if the requesting browser is closed afterwards.
     */
    public function completeApprovedChallenge(
        int $challengeId,
        int $approvedByDeviceId = 0,
        ?int $approvedByStaffId = null
    ): bool {
        $this->ensureMobileSyncStorage();

        return DB::transaction(function () use (
            $challengeId,
            $approvedByDeviceId,
            $approvedByStaffId
        ) {
            $pair = DB::table('pmd_mobile_pair_requests')
                ->where('challenge_id', $challengeId)
                ->lockForUpdate()
                ->first();

            if (!$pair) {
                return false;
            }

            if (in_array((string)$pair->status, ['approved', 'exchanged'], true)) {
                return true;
            }

            $challenge = DB::table('pmd_site_access_challenges')
                ->where('id', $challengeId)
                ->lockForUpdate()
                ->first();

            if (!$challenge) {
                throw new \RuntimeException('Android approval request was not found.');
            }
            if ((string)$challenge->status !== 'approved') {
                throw new \RuntimeException(
                    'Android connection must be approved before device creation.'
                );
            }
            if (now()->greaterThanOrEqualTo($challenge->expires_at)) {
                DB::table('pmd_mobile_pair_requests')
                    ->where('id', (int)$pair->id)
                    ->update([
                        'status' => 'expired',
                        'updated_at' => now(),
                    ]);
                throw new \RuntimeException('Android connection request expired.');
            }

            $site = app(PmdSiteAccessService::class);
            $identity = [
                'location_id' => (int)$pair->location_id,
                'user_id' => (int)$pair->user_id,
                'staff_id' => (int)$pair->staff_id,
            ];
            $device = $site->createApprovedMobileDevice(
                $identity,
                (string)$pair->device_name,
                $approvedByDeviceId,
                $approvedByStaffId
            );

            $rawExchange = $this->pairExchangeSecret(
                (string)$pair->pair_request,
                (string)$pair->code_challenge
            );

            DB::table('pmd_mobile_pair_exchanges')->updateOrInsert(
                ['public_id' => (string)$pair->pair_request],
                [
                    'exchange_hash' => $this->exchangeHash(
                        $rawExchange,
                        (string)$pair->code_challenge
                    ),
                    'location_id' => (int)$pair->location_id,
                    'device_id' => (int)$device->id,
                    'user_id' => (int)$pair->user_id,
                    'staff_id' => (int)$pair->staff_id,
                    'expires_at' => now()->addSeconds(self::EXCHANGE_TTL_SECONDS),
                    'used_at' => null,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            DB::table('pmd_mobile_pair_requests')
                ->where('id', (int)$pair->id)
                ->update([
                    'status' => 'approved',
                    'device_id' => (int)$device->id,
                    'approved_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('pmd_site_access_challenges')
                ->where('id', $challengeId)
                ->update([
                    'status' => 'used',
                    'used_at' => now(),
                    'updated_at' => now(),
                ]);

            return true;
        });
    }

    public function browserApprovalStatus(Request $request): array
    {
        $this->ensureMobileSyncStorage();

        if (!AdminAuth::isLogged() || !$this->hasFreshIntent($request)) {
            return ['ok' => false, 'status' => 'expired'];
        }

        $intent = $this->intent($request);
        $pairRequest = strtolower(trim((string)($intent['pair_request'] ?? '')));
        $codeChallenge = trim((string)($intent['code_challenge'] ?? ''));

        $pair = DB::table('pmd_mobile_pair_requests')
            ->where('pair_request', $pairRequest)
            ->where('code_challenge', $codeChallenge)
            ->first();

        if (!$pair) {
            return ['ok' => false, 'status' => 'missing'];
        }

        $challenge = DB::table('pmd_site_access_challenges')
            ->where('id', (int)$pair->challenge_id)
            ->first();

        $status = strtolower((string)($pair->status ?? 'pending'));
        if ($challenge && (string)$challenge->status === 'declined') {
            $status = 'declined';
        }
        if (
            now()->greaterThanOrEqualTo($pair->expires_at)
            && !in_array($status, ['approved', 'exchanged'], true)
        ) {
            $status = 'expired';
        }

        $response = [
            'ok' => true,
            'status' => $status,
            'device_name' => (string)$pair->device_name,
            'expires_at' => (string)$pair->expires_at,
        ];

        if ($challenge) {
            $response['request_code'] = app(PmdSiteAccessService::class)
                ->challengeCodeForHub($challenge);
        }

        if (in_array($status, ['approved', 'exchanged'], true)) {
            $rawExchange = $this->pairExchangeSecret(
                $pairRequest,
                $codeChallenge
            );
            $response['deep_link'] =
                'paymydine://pair?exchange='.rawurlencode($rawExchange)
                .'&tenant='.rawurlencode('https://'.$request->getHost())
                .'&pair_request='.rawurlencode($pairRequest);
        }

        return $response;
    }

    public function approveVerifiedSession(Request $request): string
    {
        if (!AdminAuth::isLogged() || !$this->hasFreshIntent($request)) {
            throw new \RuntimeException(
                'The Android pairing request expired. Start again from the app.'
            );
        }

        $this->ensureMobileSyncStorage();

        $site = app(PmdSiteAccessService::class);
        $site->pairCurrentVerifiedPersonalDevice($request);

        return $this->finish($request);
    }

    public function finish(Request $request): string
    {
        if (!AdminAuth::isLogged() || !$this->hasFreshIntent($request)) {
            throw new \RuntimeException('The mobile pairing session expired. Start again from the app.');
        }

        $site = app(PmdSiteAccessService::class);
        $identity = $site->identity();
        $intent = $this->intent($request);
        $codeChallenge = trim((string)($intent['code_challenge'] ?? ''));
        $pairRequest = strtolower(trim((string)($intent['pair_request'] ?? '')));
        $deviceId = (int)session()->pull(PmdSiteAccessService::SESSION_LAST_PAIRED_DEVICE, 0);

        if (!$this->validCodeChallenge($codeChallenge) || !$this->validPairRequest($pairRequest)) {
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

        // The raw exchange is deterministic from the app-owned request id and
        // PKCE challenge. It is never stored in plaintext. This lets the Android
        // app recover the approved exchange by polling when a browser blocks the
        // custom-scheme callback.
        $rawExchange = $this->pairExchangeSecret(
            $pairRequest,
            $codeChallenge
        );
        $publicId = $pairRequest;

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

            DB::table('pmd_mobile_pair_exchanges')->updateOrInsert(
                ['public_id' => $publicId],
                [
                    'exchange_hash' => $this->exchangeHash(
                        $rawExchange,
                        $codeChallenge
                    ),
                    'location_id' => (int)$identity['location_id'],
                    'device_id' => $deviceId,
                    'user_id' => (int)$identity['user_id'] ?: null,
                    'staff_id' => (int)$identity['staff_id'] ?: null,
                    'expires_at' => now()->addSeconds(self::EXCHANGE_TTL_SECONDS),
                    'used_at' => null,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        });

        $this->clearIntent();

        return 'paymydine://pair?exchange='.rawurlencode($rawExchange)
            .'&tenant='.rawurlencode('https://'.$request->getHost())
            .'&pair_request='.rawurlencode($publicId);
    }

    public function status(
        Request $request,
        string $pairRequest,
        string $codeVerifier
    ): array {
        try {
            $this->ensureMobileSyncStorage();
        } catch (\Throwable $error) {
            report($error);
            abort(503, 'PayMyDine mobile pairing storage is not ready.');
        }

        $pairRequest = strtolower(trim($pairRequest));
        $codeVerifier = trim($codeVerifier);

        if (!$this->validPairRequest($pairRequest)) {
            abort(422, 'The PayMyDine pair_request is not valid.');
        }
        if (!preg_match('/^[A-Za-z0-9._~-]{43,128}$/', $codeVerifier)) {
            abort(422, 'The PayMyDine pairing code_verifier is not valid.');
        }

        $codeChallenge = $this->codeChallengeFromVerifier($codeVerifier);
        $rawExchange = $this->pairExchangeSecret(
            $pairRequest,
            $codeChallenge
        );

        $pair = DB::table('pmd_mobile_pair_requests')
            ->where('pair_request', $pairRequest)
            ->where('code_challenge', $codeChallenge)
            ->first();
        $challenge = $pair
            ? DB::table('pmd_site_access_challenges')
                ->where('id', (int)$pair->challenge_id)
                ->first()
            : null;
        $requestCode = $challenge
            ? app(PmdSiteAccessService::class)->challengeCodeForHub($challenge)
            : null;

        if (
            $challenge
            && (string)$challenge->status === 'declined'
        ) {
            DB::table('pmd_mobile_pair_requests')
                ->where('id', (int)$pair->id)
                ->update(['status' => 'declined', 'updated_at' => now()]);

            return [
                'ok' => true,
                'status' => 'declined',
                'request_code' => $requestCode,
            ];
        }

        if (
            $pair
            && now()->greaterThanOrEqualTo($pair->expires_at)
            && !in_array((string)$pair->status, ['approved', 'exchanged'], true)
        ) {
            DB::table('pmd_mobile_pair_requests')
                ->where('id', (int)$pair->id)
                ->update(['status' => 'expired', 'updated_at' => now()]);

            return [
                'ok' => true,
                'status' => 'expired',
                'request_code' => $requestCode,
            ];
        }

        $exchange = DB::table('pmd_mobile_pair_exchanges')
            ->where('public_id', $pairRequest)
            ->where(
                'exchange_hash',
                $this->exchangeHash($rawExchange, $codeChallenge)
            )
            ->first();

        if (!$exchange) {
            return [
                'ok' => true,
                'status' => 'pending',
                'request_code' => $requestCode,
                'device_name' => $pair ? (string)$pair->device_name : null,
                'expires_at' => $pair ? (string)$pair->expires_at : null,
            ];
        }

        if ($exchange->used_at) {
            return [
                'ok' => true,
                'status' => 'used',
                'request_code' => $requestCode,
            ];
        }

        if (now()->greaterThanOrEqualTo($exchange->expires_at)) {
            return [
                'ok' => true,
                'status' => 'expired',
                'request_code' => $requestCode,
            ];
        }

        return [
            'ok' => true,
            'status' => 'approved',
            'exchange' => $rawExchange,
            'tenant' => 'https://'.$request->getHost(),
            'expires_at' => (string)$exchange->expires_at,
            'request_code' => $requestCode,
        ];
    }

    public function exchange(
        Request $request,
        string $rawExchange,
        string $codeVerifier
    ): array
    {
        try {
            $this->ensureMobileSyncStorage();
        } catch (\Throwable $error) {
            report($error);
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

            if (Schema::hasTable('pmd_mobile_pair_requests')) {
                DB::table('pmd_mobile_pair_requests')
                    ->where('pair_request', (string)$exchange->public_id)
                    ->update([
                        'status' => 'exchanged',
                        'updated_at' => now(),
                    ]);
            }

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

    private function ensureMobileSyncStorage(): void
    {
        $tables = [
            'pmd_sync_commands',
            'pmd_sync_events',
            'pmd_sync_aggregate_versions',
            'pmd_mobile_edges',
            'pmd_mobile_pair_requests',
            'pmd_mobile_pair_exchanges',
        ];

        $ready = true;
        foreach ($tables as $table) {
            if (!Schema::hasTable($table)) {
                $ready = false;
                break;
            }
        }
        if ($ready) return;

        $migration = base_path(
            'app/system/database/migrations/2026_09_20_190000_create_pmd_mobile_sync_tables.php'
        );
        if (!is_file($migration)) {
            throw new \RuntimeException(
                'PayMyDine mobile sync migration file is missing.'
            );
        }

        require_once $migration;
        (new \System\Database\Migrations\CreatePmdMobileSyncTables())->up();

        foreach ($tables as $table) {
            if (!Schema::hasTable($table)) {
                throw new \RuntimeException(
                    'PayMyDine mobile sync schema missing table: '.$table
                );
            }
        }
    }

    private function intent(Request $request): array
    {
        $sessionIntent = (array)session()->get(self::SESSION_INTENT, []);
        if ($this->validIntent($sessionIntent, $request)) {
            return $sessionIntent;
        }

        $sealed = trim((string)$request->cookie(self::INTENT_COOKIE, ''));
        if ($sealed === '') {
            return [];
        }

        try {
            $decoded = json_decode(
                Crypt::decryptString($sealed),
                true,
                16,
                JSON_THROW_ON_ERROR
            );
        } catch (\Throwable $error) {
            return [];
        }

        if (!is_array($decoded) || !$this->validIntent($decoded, $request)) {
            return [];
        }

        session()->put(self::SESSION_INTENT, $decoded);

        logger()->info('PMD mobile pairing intent recovered', [
            'host' => strtolower((string)$request->getHost()),
            'pair_request' => strtolower(trim((string)($decoded['pair_request'] ?? ''))),
            'transport' => 'sealed_cookie',
        ]);

        return $decoded;
    }

    private function validIntent(array $intent, Request $request): bool
    {
        $created = (int)($intent['created_at'] ?? 0);
        $host = strtolower(trim((string)($intent['host'] ?? '')));
        $codeChallenge = trim((string)($intent['code_challenge'] ?? ''));
        $pairRequest = strtolower(trim((string)($intent['pair_request'] ?? '')));

        return $created > time() - self::INTENT_TTL_SECONDS
            && $created <= time() + 30
            && $host !== ''
            && hash_equals(
                $host,
                strtolower(trim((string)$request->getHost()))
            )
            && $this->validCodeChallenge($codeChallenge)
            && $this->validPairRequest($pairRequest);
    }

    private function queueIntentCookie(array $intent): void
    {
        $payload = Crypt::encryptString(
            json_encode(
                $intent,
                JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            )
        );

        Cookie::queue(
            self::INTENT_COOKIE,
            $payload,
            (int)ceil(self::INTENT_TTL_SECONDS / 60),
            '/',
            null,
            true,
            true,
            false,
            'lax'
        );
    }

    private function clearIntent(): void
    {
        session()->forget(self::SESSION_INTENT);
        Cookie::queue(Cookie::forget(self::INTENT_COOKIE, '/'));
    }

    private function pairExchangeSecret(
        string $pairRequest,
        string $codeChallenge
    ): string {
        return hash_hmac(
            'sha256',
            'mobile-pair-secret|'.$pairRequest.'|'.$codeChallenge,
            (string)config('app.key', 'pmd-mobile-pairing')
        );
    }

    private function validPairRequest(string $value): bool
    {
        return (bool)preg_match(
            '/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/',
            strtolower(trim($value))
        );
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

    private function base64UrlEncode(string $value): string
    {
        return rtrim(
            strtr(base64_encode($value), '+/', '-_'),
            '='
        );
    }

    private function base64UrlDecode(string $value): string
    {
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $value)) {
            throw new \InvalidArgumentException('Invalid base64url payload.');
        }

        $padding = strlen($value) % 4;
        if ($padding > 0) {
            $value .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode(
            strtr($value, '-_', '+/'),
            true
        );

        if ($decoded === false) {
            throw new \InvalidArgumentException('Invalid base64url payload.');
        }

        return $decoded;
    }

    private function validCodeChallenge(string $value): bool
    {
        return (bool)preg_match('/^[A-Za-z0-9_-]{43}$/', $value);
    }
}
