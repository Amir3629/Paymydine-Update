<?php

namespace App\Services\GoogleBusiness;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class PmdGoogleBusinessService
{
    private const OAUTH_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    private const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private const OAUTH_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
    private const ACCOUNT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
    private const BUSINESS_INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
    private const REVIEWS_API = 'https://mybusiness.googleapis.com/v4';
    private const NOTIFICATIONS_API = 'https://mybusinessnotifications.googleapis.com/v1';
    private const PLACES_API = 'https://places.googleapis.com/v1';
    private const OAUTH_SCOPE = 'https://www.googleapis.com/auth/business.manage';
    private const CENTRAL_MAP_TABLE = 'pmd_google_business_tenant_map';

    public function configuration(): array
    {
        $redirect = trim((string)env(
            'PMD_GOOGLE_BUSINESS_REDIRECT_URI',
            ''
        ));

        return [
            'client_id' => trim((string)env('PMD_GOOGLE_BUSINESS_CLIENT_ID', '')),
            'client_secret' => trim((string)env('PMD_GOOGLE_BUSINESS_CLIENT_SECRET', '')),
            'redirect_uri' => $redirect,
            'places_api_key' => trim((string)env('PMD_GOOGLE_PLACES_API_KEY', '')),
            'pubsub_topic' => trim((string)env('PMD_GOOGLE_BUSINESS_PUBSUB_TOPIC', '')),
            'pubsub_token' => trim((string)env('PMD_GOOGLE_BUSINESS_PUBSUB_TOKEN', '')),
        ];
    }

    public function configurationReady(): bool
    {
        $config = $this->configuration();

        return $config['client_id'] !== ''
            && $config['client_secret'] !== ''
            && filter_var($config['redirect_uri'], FILTER_VALIDATE_URL);
    }

    public function status(int $locationId): array
    {
        $config = $this->configuration();
        $base = [
            'configured' => $this->configurationReady(),
            'places_configured' => $config['places_api_key'] !== '',
            'notifications_configured' => $config['pubsub_topic'] !== '' && $config['pubsub_token'] !== '',
            'redirect_uri' => $config['redirect_uri'],
            'connected' => false,
            'pending_location' => false,
            'location_id' => $locationId,
            'google_account_name' => null,
            'google_account_display_name' => null,
            'google_location_name' => null,
            'google_location_title' => null,
            'google_place_id' => null,
            'google_maps_uri' => null,
            'google_write_review_uri' => null,
            'google_reviews_uri' => null,
            'average_rating' => null,
            'total_review_count' => 0,
            'notifications_enabled' => false,
            'last_synced_at' => null,
            'last_error' => null,
        ];

        if (!Schema::hasTable('pmd_google_business_connections')) {
            return $base;
        }

        $row = DB::table('pmd_google_business_connections')
            ->where('location_id', $locationId)
            ->first();

        if (!$row) {
            return $base;
        }

        return array_merge($base, [
            'connected' => (string)($row->status ?? '') === 'connected'
                && trim((string)($row->google_location_name ?? '')) !== '',
            'pending_location' => (string)($row->status ?? '') === 'pending_location',
            'google_account_name' => $row->google_account_name ?? null,
            'google_account_display_name' => $row->google_account_display_name ?? null,
            'google_location_name' => $row->google_location_name ?? null,
            'google_location_title' => $row->google_location_title ?? null,
            'google_place_id' => $row->google_place_id ?? null,
            'google_maps_uri' => $row->google_maps_uri ?? null,
            'google_write_review_uri' => $row->google_write_review_uri ?? null,
            'google_reviews_uri' => $row->google_reviews_uri ?? null,
            'average_rating' => isset($row->google_average_rating) ? (float)$row->google_average_rating : null,
            'total_review_count' => (int)($row->google_total_review_count ?? 0),
            'notifications_enabled' => (bool)($row->notifications_enabled ?? false),
            'last_synced_at' => $row->last_synced_at ?? null,
            'last_error' => $row->last_error ?? null,
        ]);
    }

    public function authorizationUrl(string $tenantHost, int $locationId): string
    {
        if (!$this->configurationReady()) {
            throw new RuntimeException(
                'Google Business Profile is not configured on the PayMyDine server yet.'
            );
        }

        $tenantHost = $this->sanitizeHost($tenantHost);
        if ($tenantHost === '') {
            throw new RuntimeException('Unable to determine the restaurant tenant host.');
        }

        $nonce = bin2hex(random_bytes(24));
        $payload = [
            'tenant_host' => $tenantHost,
            'location_id' => max(1, $locationId),
            'nonce' => $nonce,
            'expires_at' => time() + 900,
        ];

        $state = Crypt::encryptString(json_encode($payload, JSON_UNESCAPED_SLASHES));

        try {
            Cache::put(
                'pmd:google-business:oauth:'.$nonce,
                hash('sha256', $state),
                now()->addMinutes(15)
            );
        } catch (\Throwable $error) {
            Log::warning('PMD Google OAuth nonce cache unavailable', [
                'message' => $error->getMessage(),
            ]);
        }

        $config = $this->configuration();
        $query = http_build_query([
            'client_id' => $config['client_id'],
            'redirect_uri' => $config['redirect_uri'],
            'response_type' => 'code',
            'scope' => self::OAUTH_SCOPE,
            'access_type' => 'offline',
            'include_granted_scopes' => 'true',
            'prompt' => 'consent',
            'state' => $state,
        ], '', '&', PHP_QUERY_RFC3986);

        return self::OAUTH_AUTHORIZE_URL.'?'.$query;
    }

    public function consumeOAuthState(string $state): array
    {
        if ($state === '') {
            throw new RuntimeException('Missing Google OAuth state.');
        }

        try {
            $decoded = json_decode(Crypt::decryptString($state), true);
        } catch (\Throwable $error) {
            throw new RuntimeException('Google OAuth state is invalid or expired.');
        }

        if (!is_array($decoded)) {
            throw new RuntimeException('Google OAuth state is invalid.');
        }

        $tenantHost = $this->sanitizeHost((string)($decoded['tenant_host'] ?? ''));
        $locationId = (int)($decoded['location_id'] ?? 0);
        $nonce = trim((string)($decoded['nonce'] ?? ''));
        $expiresAt = (int)($decoded['expires_at'] ?? 0);

        if ($tenantHost === '' || $locationId < 1 || $nonce === '' || $expiresAt < time()) {
            throw new RuntimeException('Google OAuth state is invalid or expired.');
        }

        $cacheKey = 'pmd:google-business:oauth:'.$nonce;
        try {
            $expected = Cache::get($cacheKey);
            Cache::forget($cacheKey);

            if (is_string($expected) && !hash_equals($expected, hash('sha256', $state))) {
                throw new RuntimeException('Google OAuth state could not be verified.');
            }
        } catch (RuntimeException $error) {
            throw $error;
        } catch (\Throwable $error) {
            Log::warning('PMD Google OAuth nonce cache verification skipped', [
                'message' => $error->getMessage(),
            ]);
        }

        return [
            'tenant_host' => $tenantHost,
            'location_id' => $locationId,
        ];
    }

    public function activateTenantHost(string $host): object
    {
        $host = $this->sanitizeHost($host);
        if ($host === '') {
            throw new RuntimeException('Invalid tenant host.');
        }

        $registry = DB::connection('mysql');
        $tenant = $registry->table('tenants')
            ->whereRaw('LOWER(domain) = ?', [strtolower($host)])
            ->first();

        if (!$tenant) {
            $subdomain = explode('.', $host)[0] ?? '';
            $tenant = $registry->table('tenants')
                ->where('domain', 'like', $subdomain.'.%')
                ->orWhere('domain', $subdomain)
                ->first();
        }

        if (!$tenant || empty($tenant->database)) {
            throw new RuntimeException('Restaurant tenant could not be resolved.');
        }

        Config::set('database.connections.tenant.database', $tenant->database);
        Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
        Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
        Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
        Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));

        DB::purge('tenant');
        DB::reconnect('tenant');
        Config::set('database.default', 'tenant');
        DB::setDefaultConnection('tenant');

        app()->instance('tenant', $tenant);

        return $tenant;
    }

    public function completeOAuth(int $locationId, string $code, string $tenantHost): void
    {
        $this->assertTenantTables();

        if (!$this->configurationReady()) {
            throw new RuntimeException('Google Business Profile server configuration is incomplete.');
        }

        $code = trim($code);
        if ($code === '') {
            throw new RuntimeException('Google did not return an authorization code.');
        }

        $config = $this->configuration();
        $response = Http::asForm()
            ->acceptJson()
            ->timeout(25)
            ->post(self::OAUTH_TOKEN_URL, [
                'code' => $code,
                'client_id' => $config['client_id'],
                'client_secret' => $config['client_secret'],
                'redirect_uri' => $config['redirect_uri'],
                'grant_type' => 'authorization_code',
            ]);

        $payload = (array)$response->json();
        if (!$response->successful() || trim((string)($payload['access_token'] ?? '')) === '') {
            throw new RuntimeException(
                (string)($payload['error_description'] ?? $payload['error'] ?? 'Google OAuth token exchange failed.')
            );
        }

        $existing = DB::table('pmd_google_business_connections')
            ->where('location_id', $locationId)
            ->first();

        $refreshToken = trim((string)($payload['refresh_token'] ?? ''));
        $storedRefresh = $existing->refresh_token_encrypted ?? null;
        $refreshEncrypted = $refreshToken !== ''
            ? Crypt::encryptString($refreshToken)
            : $storedRefresh;

        $expiresIn = max(60, (int)($payload['expires_in'] ?? 3600));
        $now = now();

        DB::table('pmd_google_business_connections')->updateOrInsert(
            ['location_id' => $locationId],
            [
                'tenant_host' => $this->sanitizeHost($tenantHost),
                'access_token_encrypted' => Crypt::encryptString((string)$payload['access_token']),
                'refresh_token_encrypted' => $refreshEncrypted,
                'token_expires_at' => $now->copy()->addSeconds($expiresIn),
                'scopes' => trim((string)($payload['scope'] ?? self::OAUTH_SCOPE)),
                'status' => $existing && !empty($existing->google_location_name)
                    ? 'connected'
                    : 'pending_location',
                'last_error' => null,
                'updated_at' => $now,
                'created_at' => $existing->created_at ?? $now,
            ]
        );
    }

    public function listGoogleLocations(int $locationId): array
    {
        $token = $this->accessToken($locationId);
        $accounts = [];
        $pageToken = null;

        for ($page = 0; $page < 10; $page++) {
            $query = ['pageSize' => 100];
            if ($pageToken) $query['pageToken'] = $pageToken;

            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(25)
                ->get(self::ACCOUNT_API.'/accounts', $query);

            $json = (array)$response->json();
            if (!$response->successful()) {
                throw $this->googleApiException('Unable to load Google Business accounts.', $json, $response->status());
            }

            foreach ((array)($json['accounts'] ?? []) as $account) {
                if (is_array($account) && !empty($account['name'])) {
                    $accounts[] = $account;
                }
            }

            $pageToken = trim((string)($json['nextPageToken'] ?? ''));
            if ($pageToken === '') break;
        }

        $rows = [];
        foreach ($accounts as $account) {
            $accountName = $this->normalizeResourceName((string)$account['name'], 'accounts');
            if ($accountName === '') continue;

            $locationsPageToken = null;
            for ($page = 0; $page < 10; $page++) {
                $query = [
                    'readMask' => 'name,title,storeCode,metadata,storefrontAddress,websiteUri',
                    'pageSize' => 100,
                ];
                if ($locationsPageToken) $query['pageToken'] = $locationsPageToken;

                $response = Http::withToken($token)
                    ->acceptJson()
                    ->timeout(25)
                    ->get(self::BUSINESS_INFO_API.'/'.$accountName.'/locations', $query);

                $json = (array)$response->json();
                if (!$response->successful()) {
                    Log::warning('PMD Google Business location list failed', [
                        'account' => $accountName,
                        'status' => $response->status(),
                        'payload' => $json,
                    ]);
                    break;
                }

                foreach ((array)($json['locations'] ?? []) as $location) {
                    if (!is_array($location)) continue;
                    $locationName = $this->normalizeResourceName((string)($location['name'] ?? ''), 'locations');
                    if ($locationName === '') continue;

                    $metadata = (array)($location['metadata'] ?? []);
                    $rows[] = [
                        'account_name' => $accountName,
                        'account_display_name' => trim((string)($account['accountName'] ?? $accountName)),
                        'location_name' => $locationName,
                        'title' => trim((string)($location['title'] ?? $locationName)),
                        'store_code' => trim((string)($location['storeCode'] ?? '')),
                        'place_id' => trim((string)($metadata['placeId'] ?? '')),
                        'maps_uri' => trim((string)($metadata['mapsUri'] ?? '')),
                        'address' => $this->formatAddress((array)($location['storefrontAddress'] ?? [])),
                        'website_uri' => trim((string)($location['websiteUri'] ?? '')),
                    ];
                }

                $locationsPageToken = trim((string)($json['nextPageToken'] ?? ''));
                if ($locationsPageToken === '') break;
            }
        }

        usort($rows, function (array $a, array $b) {
            return strcasecmp($a['title'], $b['title']);
        });

        return $rows;
    }

    public function selectLocation(
        int $locationId,
        string $accountName,
        string $googleLocationName,
        string $tenantHost
    ): array {
        $accountName = $this->normalizeResourceName($accountName, 'accounts');
        $googleLocationName = $this->normalizeResourceName($googleLocationName, 'locations');

        if ($accountName === '' || $googleLocationName === '') {
            throw new RuntimeException('Please choose a valid Google Business Profile location.');
        }

        $match = null;
        foreach ($this->listGoogleLocations($locationId) as $candidate) {
            if (
                hash_equals($candidate['account_name'], $accountName)
                && hash_equals($candidate['location_name'], $googleLocationName)
            ) {
                $match = $candidate;
                break;
            }
        }

        if (!$match) {
            throw new RuntimeException('The selected Google Business Profile location is not available to this account.');
        }

        $now = now();
        DB::table('pmd_google_business_connections')
            ->where('location_id', $locationId)
            ->update([
                'tenant_host' => $this->sanitizeHost($tenantHost),
                'google_account_name' => $match['account_name'],
                'google_account_display_name' => $match['account_display_name'],
                'google_location_name' => $match['location_name'],
                'google_location_title' => $match['title'],
                'google_place_id' => $match['place_id'] ?: null,
                'google_maps_uri' => $match['maps_uri'] ?: null,
                'status' => 'connected',
                'last_error' => null,
                'updated_at' => $now,
            ]);

        $this->writePublicSettings($locationId, [
            'pmd_google_business_connected' => '1',
            'pmd_google_business_location_title' => $match['title'],
            'pmd_google_place_id' => $match['place_id'],
            'pmd_google_maps_url' => $match['maps_uri'],
        ]);

        if ($match['place_id'] !== '') {
            try {
                $this->refreshPlaceLinks($locationId);
            } catch (\Throwable $error) {
                $this->recordError($locationId, 'Places link lookup: '.$error->getMessage());
            }
        }

        try {
            $this->registerCentralRoute($locationId);
        } catch (\Throwable $error) {
            Log::warning('PMD Google Business central route registration failed', [
                'location_id' => $locationId,
                'message' => $error->getMessage(),
            ]);
        }

        try {
            $this->configureNotifications($locationId);
        } catch (\Throwable $error) {
            $this->recordError($locationId, 'Notifications: '.$error->getMessage());
        }

        $this->syncReviews($locationId);

        return $this->status($locationId);
    }

    public function refreshPlaceLinks(int $locationId): array
    {
        $config = $this->configuration();
        if ($config['places_api_key'] === '') {
            throw new RuntimeException('PMD_GOOGLE_PLACES_API_KEY is not configured.');
        }

        $connection = $this->connection($locationId);
        $placeId = trim((string)($connection->google_place_id ?? ''));
        if ($placeId === '') {
            throw new RuntimeException('The selected Google Business Profile has no Google Maps Place ID.');
        }

        $response = Http::withHeaders([
                'X-Goog-Api-Key' => $config['places_api_key'],
                'X-Goog-FieldMask' => 'id,googleMapsUri,googleMapsLinks',
            ])
            ->acceptJson()
            ->timeout(20)
            ->get(self::PLACES_API.'/places/'.rawurlencode($placeId));

        $json = (array)$response->json();
        if (!$response->successful()) {
            throw $this->googleApiException('Unable to load Google Maps links.', $json, $response->status());
        }

        $links = (array)($json['googleMapsLinks'] ?? []);
        $mapsUri = trim((string)($links['placeUri'] ?? $json['googleMapsUri'] ?? $connection->google_maps_uri ?? ''));
        $writeUri = trim((string)($links['writeAReviewUri'] ?? ''));
        $reviewsUri = trim((string)($links['reviewsUri'] ?? ''));

        DB::table('pmd_google_business_connections')
            ->where('location_id', $locationId)
            ->update([
                'google_maps_uri' => $mapsUri ?: null,
                'google_write_review_uri' => $writeUri ?: null,
                'google_reviews_uri' => $reviewsUri ?: null,
                'updated_at' => now(),
            ]);

        $this->writePublicSettings($locationId, [
            'pmd_google_place_id' => $placeId,
            'pmd_google_maps_url' => $mapsUri,
            'pmd_google_write_review_url' => $writeUri,
            'pmd_google_reviews_url' => $reviewsUri,
        ]);

        return [
            'place_id' => $placeId,
            'maps_uri' => $mapsUri,
            'write_review_uri' => $writeUri,
            'reviews_uri' => $reviewsUri,
        ];
    }

    public function syncReviews(int $locationId): array
    {
        $this->assertTenantTables();
        $connection = $this->connection($locationId);

        if ((string)($connection->status ?? '') !== 'connected') {
            throw new RuntimeException('Connect a Google Business Profile location first.');
        }

        $accountId = $this->resourceId((string)$connection->google_account_name, 'accounts');
        $googleLocationId = $this->resourceId((string)$connection->google_location_name, 'locations');
        if ($accountId === '' || $googleLocationId === '') {
            throw new RuntimeException('The Google Business Profile connection is incomplete.');
        }

        $token = $this->accessToken($locationId);
        $pageToken = null;
        $synced = 0;
        $averageRating = null;
        $totalReviewCount = null;

        for ($page = 0; $page < 25; $page++) {
            $query = ['pageSize' => 50];
            if ($pageToken) $query['pageToken'] = $pageToken;

            $url = self::REVIEWS_API
                .'/accounts/'.rawurlencode($accountId)
                .'/locations/'.rawurlencode($googleLocationId)
                .'/reviews';

            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(25)
                ->get($url, $query);

            $json = (array)$response->json();
            if (!$response->successful()) {
                $error = $this->googleApiException('Unable to sync Google reviews.', $json, $response->status());
                $this->recordError($locationId, $error->getMessage());
                throw $error;
            }

            if (isset($json['averageRating'])) {
                $averageRating = (float)$json['averageRating'];
            }
            if (isset($json['totalReviewCount'])) {
                $totalReviewCount = (int)$json['totalReviewCount'];
            }

            foreach ((array)($json['reviews'] ?? []) as $review) {
                if (!is_array($review)) continue;
                $reviewId = trim((string)($review['reviewId'] ?? ''));
                if ($reviewId === '') {
                    $reviewId = $this->resourceId((string)($review['name'] ?? ''), 'reviews');
                }
                if ($reviewId === '') continue;

                $reviewer = (array)($review['reviewer'] ?? []);
                $reply = (array)($review['reviewReply'] ?? []);
                $now = now();

                $reviewIdentity = [
                    'provider' => 'google',
                    'location_id' => $locationId,
                    'provider_review_id' => $reviewId,
                ];
                $existingReview = DB::table('pmd_external_reviews')
                    ->where($reviewIdentity)
                    ->first();

                DB::table('pmd_external_reviews')->updateOrInsert(
                    $reviewIdentity,
                    [
                        'google_location_name' => (string)$connection->google_location_name,
                        'reviewer_name' => trim((string)($reviewer['displayName'] ?? 'Google user')) ?: 'Google user',
                        'reviewer_photo_url' => trim((string)($reviewer['profilePhotoUrl'] ?? '')) ?: null,
                        'rating' => $this->starRating((string)($review['starRating'] ?? '')),
                        'comment' => (string)($review['comment'] ?? ''),
                        'review_created_at' => $this->timestampOrNull($review['createTime'] ?? null),
                        'review_updated_at' => $this->timestampOrNull($review['updateTime'] ?? null),
                        'owner_reply' => trim((string)($reply['comment'] ?? '')) ?: null,
                        'owner_reply_updated_at' => $this->timestampOrNull($reply['updateTime'] ?? null),
                        'raw_payload' => json_encode($review, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        'synced_at' => $now,
                        'updated_at' => $now,
                        'created_at' => $existingReview->created_at ?? $now,
                    ]
                );
                $synced++;
            }

            $pageToken = trim((string)($json['nextPageToken'] ?? ''));
            if ($pageToken === '') break;
        }

        $update = [
            'last_synced_at' => now(),
            'last_error' => null,
            'updated_at' => now(),
        ];
        if ($averageRating !== null) $update['google_average_rating'] = $averageRating;
        if ($totalReviewCount !== null) $update['google_total_review_count'] = $totalReviewCount;

        DB::table('pmd_google_business_connections')
            ->where('location_id', $locationId)
            ->update($update);

        return [
            'synced' => $synced,
            'average_rating' => $averageRating,
            'total_review_count' => $totalReviewCount,
        ];
    }

    public function externalReviews(int $locationId, int $limit = 200)
    {
        if (!Schema::hasTable('pmd_external_reviews')) {
            return collect();
        }

        return DB::table('pmd_external_reviews')
            ->where('location_id', $locationId)
            ->where('provider', 'google')
            ->orderByRaw('COALESCE(review_updated_at, review_created_at, created_at) DESC')
            ->limit(max(1, min(500, $limit)))
            ->get();
    }

    public function replyToReview(int $locationId, int $externalReviewId, string $comment): array
    {
        $comment = trim($comment);
        if ($comment === '') {
            throw new RuntimeException('Reply text is required.');
        }
        if (mb_strlen($comment) > 4096) {
            throw new RuntimeException('Google review replies must be 4096 characters or fewer.');
        }

        $review = DB::table('pmd_external_reviews')
            ->where('id', $externalReviewId)
            ->where('location_id', $locationId)
            ->where('provider', 'google')
            ->first();

        if (!$review) {
            throw new RuntimeException('Google review not found.');
        }

        $connection = $this->connection($locationId);
        $accountId = $this->resourceId((string)$connection->google_account_name, 'accounts');
        $googleLocationId = $this->resourceId((string)$connection->google_location_name, 'locations');
        $reviewId = trim((string)$review->provider_review_id);

        $url = self::REVIEWS_API
            .'/accounts/'.rawurlencode($accountId)
            .'/locations/'.rawurlencode($googleLocationId)
            .'/reviews/'.rawurlencode($reviewId)
            .'/reply';

        $response = Http::withToken($this->accessToken($locationId))
            ->acceptJson()
            ->asJson()
            ->timeout(25)
            ->put($url, ['comment' => $comment]);

        $json = (array)$response->json();
        if (!$response->successful()) {
            throw $this->googleApiException('Google review reply could not be published.', $json, $response->status());
        }

        DB::table('pmd_external_reviews')
            ->where('id', $externalReviewId)
            ->update([
                'owner_reply' => trim((string)($json['comment'] ?? $comment)),
                'owner_reply_updated_at' => $this->timestampOrNull($json['updateTime'] ?? null) ?: now(),
                'synced_at' => now(),
                'updated_at' => now(),
            ]);

        return $json;
    }

    public function deleteReviewReply(int $locationId, int $externalReviewId): void
    {
        $review = DB::table('pmd_external_reviews')
            ->where('id', $externalReviewId)
            ->where('location_id', $locationId)
            ->where('provider', 'google')
            ->first();

        if (!$review) {
            throw new RuntimeException('Google review not found.');
        }

        $connection = $this->connection($locationId);
        $accountId = $this->resourceId((string)$connection->google_account_name, 'accounts');
        $googleLocationId = $this->resourceId((string)$connection->google_location_name, 'locations');

        $url = self::REVIEWS_API
            .'/accounts/'.rawurlencode($accountId)
            .'/locations/'.rawurlencode($googleLocationId)
            .'/reviews/'.rawurlencode((string)$review->provider_review_id)
            .'/reply';

        $response = Http::withToken($this->accessToken($locationId))
            ->acceptJson()
            ->timeout(25)
            ->delete($url);

        if (!$response->successful()) {
            throw $this->googleApiException(
                'Google review reply could not be deleted.',
                (array)$response->json(),
                $response->status()
            );
        }

        DB::table('pmd_external_reviews')
            ->where('id', $externalReviewId)
            ->update([
                'owner_reply' => null,
                'owner_reply_updated_at' => null,
                'synced_at' => now(),
                'updated_at' => now(),
            ]);
    }

    public function configureNotifications(int $locationId): bool
    {
        $config = $this->configuration();
        if ($config['pubsub_topic'] === '') {
            return false;
        }

        $connection = $this->connection($locationId);
        $accountId = $this->resourceId((string)$connection->google_account_name, 'accounts');
        if ($accountId === '') {
            return false;
        }

        $url = self::NOTIFICATIONS_API
            .'/accounts/'.rawurlencode($accountId)
            .'/notificationSetting?updateMask=pubsubTopic,notificationTypes';

        $response = Http::withToken($this->accessToken($locationId))
            ->acceptJson()
            ->asJson()
            ->timeout(25)
            ->patch($url, [
                'pubsubTopic' => $config['pubsub_topic'],
                'notificationTypes' => ['NEW_REVIEW', 'UPDATED_REVIEW'],
            ]);

        $json = (array)$response->json();
        if (!$response->successful()) {
            throw $this->googleApiException('Google review notifications could not be enabled.', $json, $response->status());
        }

        DB::table('pmd_google_business_connections')
            ->where('location_id', $locationId)
            ->update([
                'notifications_enabled' => 1,
                'updated_at' => now(),
            ]);

        return true;
    }

    public function disconnect(int $locationId): void
    {
        $connection = null;
        if (Schema::hasTable('pmd_google_business_connections')) {
            $connection = DB::table('pmd_google_business_connections')
                ->where('location_id', $locationId)
                ->first();
        }

        if ($connection) {
            $refresh = $this->decryptNullable($connection->refresh_token_encrypted ?? null);
            $access = $this->decryptNullable($connection->access_token_encrypted ?? null);
            $token = $refresh ?: $access;
            if ($token !== '') {
                try {
                    Http::asForm()
                        ->timeout(10)
                        ->post(self::OAUTH_REVOKE_URL, ['token' => $token]);
                } catch (\Throwable $error) {
                    Log::warning('PMD Google OAuth revoke failed', ['message' => $error->getMessage()]);
                }
            }

            try {
                $this->removeCentralRoute($locationId, (string)($connection->tenant_host ?? ''));
            } catch (\Throwable $error) {
                Log::warning('PMD Google central map cleanup failed', ['message' => $error->getMessage()]);
            }
        }

        if (Schema::hasTable('pmd_external_reviews')) {
            DB::table('pmd_external_reviews')
                ->where('location_id', $locationId)
                ->where('provider', 'google')
                ->delete();
        }

        if (Schema::hasTable('pmd_google_business_connections')) {
            DB::table('pmd_google_business_connections')
                ->where('location_id', $locationId)
                ->delete();
        }

        $this->writePublicSettings($locationId, [
            'pmd_google_business_connected' => '0',
            'pmd_google_business_location_title' => '',
            'pmd_google_place_id' => '',
            'pmd_google_maps_url' => '',
            'pmd_google_write_review_url' => '',
            'pmd_google_reviews_url' => '',
        ]);
    }

    public function handlePubSubPush(array $body): array
    {
        $message = (array)($body['message'] ?? []);
        $encoded = trim((string)($message['data'] ?? ''));
        $decoded = $encoded !== '' ? base64_decode($encoded, true) : false;
        $notification = [];

        if (is_string($decoded) && $decoded !== '') {
            $json = json_decode($decoded, true);
            if (is_array($json)) $notification = $json;
        }

        if (!$notification) {
            $notification = $body;
        }

        $locationName = $this->normalizeResourceName(
            (string)($notification['locationName'] ?? $notification['location_name'] ?? ''),
            'locations'
        );
        $accountName = $this->normalizeResourceName(
            (string)($notification['accountName'] ?? $notification['account_name'] ?? ''),
            'accounts'
        );

        $this->ensureCentralMapTable();
        $query = DB::connection('mysql')->table(self::CENTRAL_MAP_TABLE);
        if ($locationName !== '') {
            $query->where('google_location_name', $locationName);
        } elseif ($accountName !== '') {
            $query->where('google_account_name', $accountName);
        } else {
            Log::warning('PMD Google Pub/Sub message did not contain a routable account/location', [
                'notification' => $notification,
            ]);
            return ['processed' => 0, 'notification' => $notification];
        }

        $routes = $query->get();
        $processed = 0;

        foreach ($routes as $route) {
            try {
                $this->activateTenantHost((string)$route->tenant_host);
                $this->syncReviews((int)$route->location_id);
                $processed++;
            } catch (\Throwable $error) {
                Log::error('PMD Google Pub/Sub review sync failed', [
                    'tenant_host' => $route->tenant_host ?? null,
                    'location_id' => $route->location_id ?? null,
                    'message' => $error->getMessage(),
                ]);
            }
        }

        return ['processed' => $processed, 'notification' => $notification];
    }

    public function verifyPubSubToken(string $provided): bool
    {
        $expected = $this->configuration()['pubsub_token'];
        return $expected !== '' && $provided !== '' && hash_equals($expected, $provided);
    }

    private function accessToken(int $locationId): string
    {
        $connection = $this->connection($locationId);
        $access = $this->decryptNullable($connection->access_token_encrypted ?? null);
        $expiresAt = $connection->token_expires_at ?? null;

        if (
            $access !== ''
            && $expiresAt
            && strtotime((string)$expiresAt) > time() + 90
        ) {
            return $access;
        }

        $refresh = $this->decryptNullable($connection->refresh_token_encrypted ?? null);
        if ($refresh === '') {
            throw new RuntimeException('Google authorization expired. Please reconnect Google Business Profile.');
        }

        $config = $this->configuration();
        $response = Http::asForm()
            ->acceptJson()
            ->timeout(25)
            ->post(self::OAUTH_TOKEN_URL, [
                'client_id' => $config['client_id'],
                'client_secret' => $config['client_secret'],
                'refresh_token' => $refresh,
                'grant_type' => 'refresh_token',
            ]);

        $json = (array)$response->json();
        $newAccess = trim((string)($json['access_token'] ?? ''));
        if (!$response->successful() || $newAccess === '') {
            throw $this->googleApiException('Google authorization refresh failed.', $json, $response->status());
        }

        DB::table('pmd_google_business_connections')
            ->where('location_id', $locationId)
            ->update([
                'access_token_encrypted' => Crypt::encryptString($newAccess),
                'token_expires_at' => now()->addSeconds(max(60, (int)($json['expires_in'] ?? 3600))),
                'last_error' => null,
                'updated_at' => now(),
            ]);

        return $newAccess;
    }

    private function connection(int $locationId): object
    {
        $this->assertTenantTables();

        $row = DB::table('pmd_google_business_connections')
            ->where('location_id', $locationId)
            ->first();

        if (!$row) {
            throw new RuntimeException('Google Business Profile is not connected for this restaurant.');
        }

        return $row;
    }

    private function assertTenantTables(): void
    {
        if (
            !Schema::hasTable('pmd_google_business_connections')
            || !Schema::hasTable('pmd_external_reviews')
        ) {
            throw new RuntimeException(
                'Google Business Profile database tables are not installed. Run php artisan igniter:up first.'
            );
        }
    }

    private function registerCentralRoute(int $locationId): void
    {
        $this->ensureCentralMapTable();
        $connection = $this->connection($locationId);

        $tenantHost = $this->sanitizeHost((string)($connection->tenant_host ?? request()->getHost()));
        if ($tenantHost === '') {
            throw new RuntimeException('Tenant host is unavailable for Google notification routing.');
        }

        $central = DB::connection('mysql');
        $existing = $central->table(self::CENTRAL_MAP_TABLE)
            ->where('tenant_host', $tenantHost)
            ->where('location_id', $locationId)
            ->first();

        $central->table(self::CENTRAL_MAP_TABLE)->updateOrInsert(
            [
                'tenant_host' => $tenantHost,
                'location_id' => $locationId,
            ],
            [
                'google_account_name' => (string)$connection->google_account_name,
                'google_location_name' => (string)$connection->google_location_name,
                'updated_at' => now(),
                'created_at' => $existing->created_at ?? now(),
            ]
        );
    }

    private function removeCentralRoute(int $locationId, string $tenantHost): void
    {
        $this->ensureCentralMapTable();
        $tenantHost = $this->sanitizeHost($tenantHost);
        if ($tenantHost === '') return;

        DB::connection('mysql')->table(self::CENTRAL_MAP_TABLE)
            ->where('tenant_host', $tenantHost)
            ->where('location_id', $locationId)
            ->delete();
    }

    private function ensureCentralMapTable(): void
    {
        $schema = Schema::connection('mysql');
        if ($schema->hasTable(self::CENTRAL_MAP_TABLE)) {
            return;
        }

        $schema->create(self::CENTRAL_MAP_TABLE, function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('tenant_host', 191);
            $table->unsignedInteger('location_id');
            $table->string('google_account_name', 191)->nullable()->index();
            $table->string('google_location_name', 191)->nullable()->index();
            $table->timestamps();
            $table->unique(['tenant_host', 'location_id'], 'pmd_google_tenant_location_unique');
        });
    }

    private function writePublicSettings(int $locationId, array $values): void
    {
        if (!Schema::hasTable('settings')) return;

        $columns = Schema::getColumnListing('settings');
        $keyColumn = in_array('item', $columns, true)
            ? 'item'
            : (in_array('key', $columns, true) ? 'key' : null);
        $valueColumn = in_array('value', $columns, true)
            ? 'value'
            : (in_array('data', $columns, true) ? 'data' : null);

        if (!$keyColumn || !$valueColumn) return;

        foreach ($values as $key => $value) {
            $existing = DB::table('settings')->where($keyColumn, (string)$key)->first();
            $payload = [$valueColumn => (string)($value ?? '')];

            if (in_array('serialized', $columns, true)) $payload['serialized'] = 0;
            if (in_array('updated_at', $columns, true)) $payload['updated_at'] = now();

            if ($existing) {
                DB::table('settings')->where($keyColumn, (string)$key)->update($payload);
            } else {
                $insert = array_merge([$keyColumn => (string)$key], $payload);
                if (in_array('sort', $columns, true)) $insert['sort'] = 'config';
                if (in_array('created_at', $columns, true)) $insert['created_at'] = now();
                DB::table('settings')->insert($insert);
            }
        }
    }

    private function recordError(int $locationId, string $message): void
    {
        if (!Schema::hasTable('pmd_google_business_connections')) return;

        DB::table('pmd_google_business_connections')
            ->where('location_id', $locationId)
            ->update([
                'last_error' => mb_substr($message, 0, 2000),
                'updated_at' => now(),
            ]);
    }

    private function sanitizeHost(string $host): string
    {
        $host = strtolower(trim($host));
        $host = preg_replace('/:\d+$/', '', $host) ?: '';
        if ($host === '' || strlen($host) > 253) return '';
        if (!preg_match('/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/', $host)) return '';
        return $host;
    }

    private function normalizeResourceName(string $value, string $type): string
    {
        $value = trim($value, " \t\n\r\0\x0B/");
        if ($value === '') return '';

        if ($type === 'accounts') {
            return preg_match('#^accounts/[A-Za-z0-9_-]+$#', $value) ? $value : '';
        }

        if ($type === 'locations') {
            if (preg_match('#^(?:accounts/[A-Za-z0-9_-]+/)?locations/([A-Za-z0-9_-]+)$#', $value, $matches)) {
                return 'locations/'.$matches[1];
            }
            return '';
        }

        return $value;
    }

    private function resourceId(string $resourceName, string $type): string
    {
        $resourceName = trim($resourceName, '/');
        $pattern = $type === 'accounts'
            ? '#(?:^|/)accounts/([^/]+)$#'
            : '#(?:^|/)'.preg_quote($type, '#').'/([^/]+)$#';

        return preg_match($pattern, $resourceName, $matches)
            ? trim((string)$matches[1])
            : '';
    }

    private function formatAddress(array $address): string
    {
        $parts = [];
        foreach ((array)($address['addressLines'] ?? []) as $line) {
            $line = trim((string)$line);
            if ($line !== '') $parts[] = $line;
        }

        foreach (['postalCode', 'locality', 'administrativeArea', 'regionCode'] as $key) {
            $value = trim((string)($address[$key] ?? ''));
            if ($value !== '') $parts[] = $value;
        }

        return implode(', ', array_values(array_unique($parts)));
    }

    private function starRating(string $rating): int
    {
        $map = [
            'ONE' => 1,
            'TWO' => 2,
            'THREE' => 3,
            'FOUR' => 4,
            'FIVE' => 5,
        ];

        $rating = strtoupper(trim($rating));
        if (isset($map[$rating])) return $map[$rating];
        if (is_numeric($rating)) return max(0, min(5, (int)$rating));
        return 0;
    }

    private function timestampOrNull($value)
    {
        $value = trim((string)($value ?? ''));
        if ($value === '') return null;

        try {
            return date('Y-m-d H:i:s', strtotime($value));
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function decryptNullable($value): string
    {
        $value = trim((string)($value ?? ''));
        if ($value === '') return '';

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable $error) {
            return '';
        }
    }

    private function googleApiException(string $prefix, array $payload, int $status): RuntimeException
    {
        $message = trim((string)(
            $payload['error']['message']
            ?? $payload['error_description']
            ?? $payload['message']
            ?? ''
        ));

        return new RuntimeException(
            $prefix.' '.($message !== '' ? $message : 'HTTP '.$status)
        );
    }
}
