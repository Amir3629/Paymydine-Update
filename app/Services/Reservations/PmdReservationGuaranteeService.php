<?php

namespace App\Services\Reservations;

use Admin\Models\Locations_model;
use Admin\Models\Payments_model;
use Admin\Models\Reservations_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Stripe\StripeClient;
use Throwable;

final class PmdReservationGuaranteeService
{
    public function publicConfig(
        Locations_model $location,
        string $locale = 'de'
    ): array {
        $base = $this->baseSettings();
        $registry = app(PmdReservationGuaranteeProviderRegistry::class);
        $methods = $this->runtimeAvailableMethods();
        $cardProvider = $registry->selectedProvider();
        $cardProviderState = $registry->provider($cardProvider);
        $stripe = $this->stripeCredentials(true);

        $samplePolicy = $this->policy(
            $location,
            $base['min_guests'],
            null,
            $locale
        );

        return [
            'enabled' => $base['enabled'],
            'minGuests' => $base['min_guests'],
            'amountPerGuestCents' => $base['amount_per_guest_cents'],
            'currency' => (string)($stripe['currency'] ?? 'EUR'),
            'freeCancelHours' => $base['free_cancel_hours'],
            'graceMinutes' => $base['grace_minutes'],
            'termsVersion' => $base['terms_version'],
            'provider' => $cardProvider,
            'providerLabel' => (string)(
                $cardProviderState['label'] ?? $cardProvider
            ),
            'providerReady' => !empty($methods),
            'methods' => array_values($methods),
            'defaultMethod' => (string)(
                array_key_exists('card', $methods)
                    ? 'card'
                    : (array_key_first($methods) ?? '')
            ),
            'publishableKey' => (string)($stripe['publishable_key'] ?? ''),
            'stripeReady' => (bool)($stripe['ready'] ?? false),
            'locale' => $this->locale($locale),
            'termsText' => (string)$samplePolicy['terms_text'],
            'consentText' => (string)$samplePolicy['consent_text'],
            'buttonText' => (string)$samplePolicy['button_text'],
        ];
    }

    public function policy(
        Locations_model $location,
        int $guests,
        ?Carbon $reservationStart = null,
        string $locale = 'de'
    ): array {
        $base = $this->baseSettings();
        $providerRegistry = app(PmdReservationGuaranteeProviderRegistry::class);
        $providerCode = $providerRegistry->selectedProvider();
        $providerState = $providerRegistry->provider($providerCode);
        $enabledMethods = array_keys($this->runtimeAvailableMethods());
        $stripe = $this->stripeCredentials(true);
        $guests = max(1, $guests);
        $required = $base['enabled']
            && $base['amount_per_guest_cents'] > 0
            && $guests >= $base['min_guests'];

        $currency = strtoupper((string)($stripe['currency'] ?? 'EUR'));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            $currency = 'EUR';
        }

        $total = $required
            ? min(100000000, $base['amount_per_guest_cents'] * $guests)
            : 0;

        $deadline = null;
        $eligible = null;
        if ($reservationStart) {
            $deadline = $reservationStart->copy()
                ->subHours($base['free_cancel_hours']);
            $eligible = $reservationStart->copy()
                ->addMinutes($base['grace_minutes']);
        }

        $policy = [
            'enabled' => $base['enabled'],
            'required' => $required,
            'provider_ready' => !empty($enabledMethods),
            'provider' => $providerCode,
            'methods' => $enabledMethods,
            'provider_mode' => (string)($providerState['mode'] ?? ($stripe['mode'] ?? 'test')),
            'min_guests' => $base['min_guests'],
            'guests' => $guests,
            'amount_per_guest_cents' => $base['amount_per_guest_cents'],
            'amount_cents' => $total,
            'currency' => $currency,
            'free_cancel_hours' => $base['free_cancel_hours'],
            'grace_minutes' => $base['grace_minutes'],
            'terms_version' => $base['terms_version'],
            'cancellation_deadline_at' => $deadline,
            'charge_eligible_at' => $eligible,
            'locale' => $this->locale($locale),
        ];

        $policy['terms_text'] = $this->termsText($policy);
        $policy['consent_text'] = $this->consentText($policy);
        $policy['button_text'] = $this->buttonText($policy['locale']);

        return $policy;
    }

    private function runtimeAvailableMethods(): array
    {
        $registry = app(PmdReservationGuaranteeProviderRegistry::class);
        $methods = $registry->availableMethods();

        $wallets = array_values(array_intersect(
            ['apple_pay', 'google_pay'],
            array_keys($methods)
        ));
        if (!$wallets) {
            return $methods;
        }

        $stripe = $this->stripeCredentials(true);
        if (!($stripe['ready'] ?? false)) {
            unset($methods['apple_pay'], $methods['google_pay']);

            return $methods;
        }

        $host = '';
        try {
            $host = strtolower(trim((string)request()->getHost()));
        } catch (Throwable $ignored) {
        }

        if ($host === '') {
            unset($methods['apple_pay'], $methods['google_pay']);

            return $methods;
        }

        $cacheKey = 'pmd:guarantee:stripe-wallet-domain:'
            .sha1((string)($stripe['mode'] ?? 'test').'|'.$host);

        try {
            $domain = Cache::remember(
                $cacheKey,
                now()->addHours(12),
                fn (): array => $this->ensureStripePaymentMethodDomain(
                    $host
                )
            );
        } catch (Throwable $error) {
            Log::warning(
                'PMD reservation guarantee wallet domain unavailable',
                [
                    'host' => $host,
                    'message' => $error->getMessage(),
                ]
            );
            unset($methods['apple_pay'], $methods['google_pay']);

            return $methods;
        }

        if (
            strtolower((string)(
                $domain['apple_pay_status']
                ?? ''
            )) !== 'active'
        ) {
            unset($methods['apple_pay']);
        }
        if (
            strtolower((string)(
                $domain['google_pay_status']
                ?? ''
            )) !== 'active'
        ) {
            unset($methods['google_pay']);
        }

        return $methods;
    }

    public function ensureStripePaymentMethodDomain(
        string $host
    ): array {
        $host = strtolower(trim($host));
        $host = preg_replace('/:\\d+$/', '', $host) ?? '';

        if (
            $host === ''
            || !preg_match(
                '/^(?:[a-z0-9-]+\\.)*paymydine\\.com$/',
                $host
            )
        ) {
            throw new RuntimeException(
                'The PayMyDine wallet domain is invalid.'
            );
        }

        $config = $this->stripeCredentials(true);
        if (!($config['ready'] ?? false)) {
            throw new RuntimeException(
                'Stripe must be enabled before Apple Pay or Google Pay can be used.'
            );
        }

        $client = Http::withBasicAuth(
                (string)$config['secret_key'],
                ''
            )
            ->acceptJson()
            ->asForm()
            ->timeout(25);

        $list = $client->get(
            'https://api.stripe.com/v1/payment_method_domains',
            [
                'domain_name' => $host,
                'limit' => 10,
            ]
        );
        $listBody = (array)$list->json();

        if (!$list->successful()) {
            throw new RuntimeException(
                $this->stripeApiMessage(
                    $listBody,
                    'Stripe could not check the wallet domain.'
                )
            );
        }

        $domain = null;
        foreach ((array)($listBody['data'] ?? []) as $row) {
            if (
                is_array($row)
                && strtolower(trim((string)($row['domain_name'] ?? '')))
                    === $host
            ) {
                $domain = $row;
                break;
            }
        }

        if (!$domain) {
            $created = $client->post(
                'https://api.stripe.com/v1/payment_method_domains',
                ['domain_name' => $host]
            );
            $createdBody = (array)$created->json();

            if (!$created->successful()) {
                throw new RuntimeException(
                    $this->stripeApiMessage(
                        $createdBody,
                        'Stripe could not register the wallet domain.'
                    )
                );
            }
            $domain = $createdBody;
        }

        $domainId = trim((string)($domain['id'] ?? ''));
        if (
            $domainId === ''
            || !preg_match('/^pmd_[A-Za-z0-9_]+$/', $domainId)
        ) {
            throw new RuntimeException(
                'Stripe did not return a valid Payment Method Domain.'
            );
        }

        if (array_key_exists('enabled', $domain) && !$domain['enabled']) {
            $enabled = $client->post(
                'https://api.stripe.com/v1/payment_method_domains/'
                    .rawurlencode($domainId),
                ['enabled' => 'true']
            );
            $enabledBody = (array)$enabled->json();

            if (!$enabled->successful()) {
                throw new RuntimeException(
                    $this->stripeApiMessage(
                        $enabledBody,
                        'Stripe could not enable the wallet domain.'
                    )
                );
            }
            $domain = $enabledBody;
        }

        $validated = $client->post(
            'https://api.stripe.com/v1/payment_method_domains/'
                .rawurlencode($domainId)
                .'/validate'
        );
        if ($validated->successful()) {
            $domain = (array)$validated->json();
        }

        $apple = strtolower(trim((string)(
            $domain['apple_pay']['status']
            ?? ''
        )));
        $google = strtolower(trim((string)(
            $domain['google_pay']['status']
            ?? ''
        )));

        return [
            'success' => true,
            'id' => $domainId,
            'domain' => $host,
            'mode' => (string)($config['mode'] ?? 'test'),
            'apple_pay_status' => $apple,
            'google_pay_status' => $google,
        ];
    }

    public function createSetup(
        Locations_model $location,
        array $booking,
        string $method,
        string $locale = 'de'
    ): array {
        $start = Carbon::parse(
            (string)$booking['reserve_date'].' '
                .(string)$booking['reserve_time'],
            'Europe/Berlin'
        );
        $policy = $this->policy(
            $location,
            (int)$booking['guest_num'],
            $start,
            $locale
        );

        if (!$policy['required']) {
            throw new RuntimeException(
                'A payment-method guarantee is not required for this reservation.'
            );
        }

        if (empty($policy['provider_ready'])) {
            throw new RuntimeException(
                'Reservation guarantee is temporarily unavailable. Please contact the restaurant.'
            );
        }

        $method = strtolower(trim($method));
        if (!in_array($method, (array)($policy['methods'] ?? []), true)) {
            throw new RuntimeException(
                'Please choose an available guarantee payment method.'
            );
        }

        $registry = app(PmdReservationGuaranteeProviderRegistry::class);
        $providerCode = $registry->providerForMethod($method);
        if ($providerCode === '' || !$registry->canEnable($providerCode)) {
            throw new RuntimeException(
                'The selected guarantee payment method is unavailable.'
            );
        }
        $providerState = $registry->provider($providerCode);
        $policy['provider'] = $providerCode;
        $policy['provider_mode'] = (string)($providerState['mode'] ?? 'test');

        if ($providerCode !== 'stripe') {
            $result = app(PmdReservationGuaranteeGateway::class)->begin(
                $providerCode,
                $method,
                $location,
                $booking,
                $policy
            );
            $result['policy'] = $this->publicPolicyPayload($policy);

            return $result;
        }

        return $this->createStripeSetup(
            $location,
            $booking,
            $method,
            $policy
        );
    }

    public function setupStatus(
        Locations_model $location,
        array $booking,
        string $provider,
        string $method,
        string $setupReference,
        string $locale = 'de'
    ): array {
        $start = Carbon::parse(
            (string)$booking['reserve_date'].' '
                .(string)$booking['reserve_time'],
            'Europe/Berlin'
        );
        $policy = $this->policy(
            $location,
            (int)$booking['guest_num'],
            $start,
            $locale
        );

        $provider = strtolower(trim($provider));
        $method = strtolower(trim($method));
        $expectedProvider = app(PmdReservationGuaranteeProviderRegistry::class)
            ->providerForMethod($method);
        if ($provider !== $expectedProvider) {
            throw new RuntimeException(
                'The guarantee provider no longer matches this reservation.'
            );
        }

        if ($provider === 'stripe') {
            if (!preg_match('/^seti_[A-Za-z0-9_]+$/', $setupReference)) {
                return [
                    'success' => true,
                    'ready' => false,
                    'status' => 'PENDING',
                ];
            }

            $config = $this->stripeCredentials(true);
            $stripe = new StripeClient($config['secret_key']);
            $intent = $stripe->setupIntents->retrieve(
                $setupReference,
                []
            );

            return [
                'success' => true,
                'ready' => (string)$intent->status === 'succeeded',
                'status' => strtoupper((string)$intent->status),
            ];
        }

        return app(PmdReservationGuaranteeGateway::class)->status(
            $provider,
            $method,
            $setupReference,
            $location,
            $booking,
            $policy
        );
    }

    public function verifySetup(
        Locations_model $location,
        array $booking,
        string $provider,
        string $method,
        string $setupReference,
        string $locale = 'de'
    ): array {
        $start = Carbon::parse(
            (string)$booking['reserve_date'].' '
                .(string)$booking['reserve_time'],
            'Europe/Berlin'
        );
        $policy = $this->policy(
            $location,
            (int)$booking['guest_num'],
            $start,
            $locale
        );

        if (!$policy['required']) {
            return ['required' => false, 'policy' => $policy];
        }

        $provider = strtolower(trim($provider));
        $method = strtolower(trim($method));
        $expectedProvider = app(PmdReservationGuaranteeProviderRegistry::class)
            ->providerForMethod($method);

        if ($provider !== $expectedProvider) {
            throw new RuntimeException(
                'The guarantee provider no longer matches this reservation.'
            );
        }
        if (!in_array($method, (array)($policy['methods'] ?? []), true)) {
            throw new RuntimeException(
                'The selected guarantee method is no longer available.'
            );
        }

        $providerState = app(PmdReservationGuaranteeProviderRegistry::class)
            ->provider($provider);
        $policy['provider'] = $provider;
        $policy['provider_mode'] = (string)($providerState['mode'] ?? 'test');

        if ($provider !== 'stripe') {
            return app(PmdReservationGuaranteeGateway::class)->verify(
                $provider,
                $method,
                $setupReference,
                $location,
                $booking,
                $policy
            );
        }

        return $this->verifyStripeSetup(
            $location,
            $booking,
            $setupReference,
            $policy
        );
    }

    public function createSetupIntent(
        Locations_model $location,
        array $booking,
        string $locale = 'de'
    ): array {
        return $this->createSetup(
            $location,
            $booking,
            'card',
            $locale
        );
    }

    public function verifySetupIntent(
        Locations_model $location,
        array $booking,
        string $setupIntentId,
        string $locale = 'de'
    ): array {
        return $this->verifySetup(
            $location,
            $booking,
            'stripe',
            'card',
            $setupIntentId,
            $locale
        );
    }

    private function createStripeSetup(
        Locations_model $location,
        array $booking,
        string $requestedMethod,
        array $policy
    ): array {
        $stripeConfig = $this->stripeCredentials(true);
        if (!($stripeConfig['ready'] ?? false)) {
            throw new RuntimeException(
                'Card guarantee is temporarily unavailable. Please contact the restaurant.'
            );
        }

        $stripe = new StripeClient($stripeConfig['secret_key']);
        $metadata = $this->setupMetadata($location, $booking, $policy);
        $metadata['pmd_requested_method'] = $requestedMethod;
        $customer = null;

        try {
            $customer = $stripe->customers->create([
                'email' => strtolower(
                    trim((string)($booking['email'] ?? ''))
                ),
                'name' => trim(
                    (string)($booking['first_name'] ?? '').' '
                        .(string)($booking['last_name'] ?? '')
                ),
                'metadata' => [
                    'pmd_surface' => 'public_reservation_guarantee',
                    'pmd_location_id' => (string)$location->getKey(),
                ],
            ]);

            $intent = $stripe->setupIntents->create([
                'customer' => $customer->id,
                'usage' => 'off_session',
                'payment_method_types' => ['card'],
                'metadata' => $metadata,
            ]);

            return [
                'success' => true,
                'provider' => 'stripe',
                'method' => $requestedMethod,
                'integration_mode' => 'stripe_payment_element',
                'publishable_key' => $stripeConfig['publishable_key'],
                'client_secret' => (string)$intent->client_secret,
                'setup_intent_id' => (string)$intent->id,
                'policy' => $this->publicPolicyPayload($policy),
            ];
        } catch (Throwable $error) {
            if ($customer && !empty($customer->id)) {
                try {
                    $stripe->customers->delete(
                        (string)$customer->id,
                        []
                    );
                } catch (Throwable $ignored) {
                }
            }

            Log::warning('PMD reservation guarantee setup failed', [
                'location_id' => (int)$location->getKey(),
                'message' => $error->getMessage(),
            ]);

            throw new RuntimeException(
                'Payment-method verification could not be started. Please try again.'
            );
        }
    }

    private function verifyStripeSetup(
        Locations_model $location,
        array $booking,
        string $setupIntentId,
        array $policy
    ): array {
        $stripeConfig = $this->stripeCredentials(true);
        if (!($stripeConfig['ready'] ?? false)) {
            throw new RuntimeException(
                'Card guarantee is not configured for this restaurant.'
            );
        }

        if (!preg_match('/^seti_[A-Za-z0-9_]+$/', $setupIntentId)) {
            throw new RuntimeException(
                'Payment-method verification is missing or invalid.'
            );
        }

        $stripe = new StripeClient($stripeConfig['secret_key']);

        try {
            $intent = $stripe->setupIntents->retrieve(
                $setupIntentId,
                ['expand' => ['payment_method']]
            );
        } catch (Throwable $error) {
            throw new RuntimeException(
                'Payment-method verification could not be verified.'
            );
        }

        if ((string)$intent->status !== 'succeeded') {
            throw new RuntimeException(
                'Please complete payment-method verification before confirming the reservation.'
            );
        }

        $metadata = $this->stripeObjectArray($intent->metadata ?? []);
        $expected = $this->setupMetadata($location, $booking, $policy);

        foreach ([
            'pmd_location_id',
            'pmd_reserve_date',
            'pmd_reserve_time',
            'pmd_guests',
            'pmd_amount_cents',
            'pmd_currency',
            'pmd_terms_version',
            'pmd_contract_hash',
        ] as $key) {
            if (
                (string)($metadata[$key] ?? '')
                !== (string)($expected[$key] ?? '')
            ) {
                throw new RuntimeException(
                    'The payment-method guarantee no longer matches this reservation. Please verify again.'
                );
            }
        }

        $paymentMethodObject = is_object($intent->payment_method ?? null)
            ? $intent->payment_method
            : null;
        $paymentMethod = $paymentMethodObject
            ? (string)($paymentMethodObject->id ?? '')
            : (string)($intent->payment_method ?? '');
        $customer = is_object($intent->customer ?? null)
            ? (string)($intent->customer->id ?? '')
            : (string)($intent->customer ?? '');

        if ($paymentMethod === '' || $customer === '') {
            throw new RuntimeException(
                'Payment-method verification did not return a reusable reference.'
            );
        }

        $method = 'card';
        $walletType = strtolower((string)(
            $paymentMethodObject->card->wallet->type
            ?? ''
        ));
        if (in_array($walletType, ['apple_pay', 'google_pay'], true)) {
            $method = $walletType;
        }

        if (!in_array($method, (array)($policy['methods'] ?? []), true)) {
            throw new RuntimeException(
                'This wallet is not enabled for reservation guarantees.'
            );
        }

        return [
            'required' => true,
            'policy' => $policy,
            'payment_method_code' => $method,
            'customer_reference' => $customer,
            'payment_method_reference' => $paymentMethod,
            'setup_intent_reference' => (string)$intent->id,
        ];
    }

    public function recordGuarantee(
        Reservations_model $reservation,
        array $verified
    ): void {
        if (empty($verified['required'])) {
            return;
        }

        if (!$this->guaranteeSchema()->hasTable('reservation_guarantees')) {
            throw new RuntimeException('Reservation guarantee storage is not installed.');
        }

        $policy = (array)($verified['policy'] ?? []);
        $terms = (string)($policy['terms_text'] ?? '');
        $consent = (string)($policy['consent_text'] ?? '');
        $deadline = $policy['cancellation_deadline_at'] ?? null;
        $eligible = $policy['charge_eligible_at'] ?? null;
        $now = now();

        $this->guaranteeDb()->table('reservation_guarantees')->updateOrInsert(
            ['reservation_id' => (int)$reservation->getKey()],
            [
                'location_id' => (int)$reservation->location_id,
                'provider' => (string)($policy['provider'] ?? 'stripe'),
                'provider_mode' => (string)($policy['provider_mode'] ?? 'test'),
                'payment_method_code' => (string)($verified['payment_method_code'] ?? 'card'),
                'status' => 'active',
                'amount_per_guest_cents' => max(0, (int)($policy['amount_per_guest_cents'] ?? 0)),
                'amount_cents' => max(0, (int)($policy['amount_cents'] ?? 0)),
                'charged_amount_cents' => null,
                'currency' => strtoupper((string)($policy['currency'] ?? 'EUR')),
                'customer_reference' => (string)($verified['customer_reference'] ?? ''),
                'payment_method_reference' => (string)($verified['payment_method_reference'] ?? ''),
                'setup_intent_reference' => (string)($verified['setup_intent_reference'] ?? ''),
                'charge_intent_reference' => null,
                'terms_version' => (string)($policy['terms_version'] ?? ''),
                'locale' => (string)($policy['locale'] ?? 'en'),
                'terms_text' => $terms,
                'terms_hash' => hash('sha256', $terms),
                'consent_text' => $consent,
                'consent_text_hash' => hash('sha256', $consent),
                'consent_at' => $now,
                'cancellation_deadline_at' => $deadline
                    ? Carbon::parse($deadline)->utc()->format('Y-m-d H:i:s')
                    : null,
                'charge_eligible_at' => $eligible
                    ? Carbon::parse($eligible)->utc()->format('Y-m-d H:i:s')
                    : null,
                'charged_at' => null,
                'released_at' => null,
                'last_error' => null,
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );
    }

    public function discardVerification(array $verified): void
    {
        if (empty($verified['required'])) {
            return;
        }

        $policy = (array)($verified['policy'] ?? []);
        $row = (object)[
            'guarantee_id' => 0,
            'provider' => (string)($policy['provider'] ?? 'stripe'),
            'customer_reference' => (string)($verified['customer_reference'] ?? ''),
            'payment_method_reference' => (string)($verified['payment_method_reference'] ?? ''),
        ];

        if (strtolower((string)$row->provider) === 'stripe') {
            $this->cleanupStripeReferences($row);
        } else {
            app(PmdReservationGuaranteeGateway::class)->release($row);
        }
    }

    public function guaranteeForReservation(int $reservationId): ?object
    {
        if ($reservationId < 1 || !$this->guaranteeSchema()->hasTable('reservation_guarantees')) {
            return null;
        }

        return $this->guaranteeDb()->table('reservation_guarantees')
            ->where('reservation_id', $reservationId)
            ->first();
    }

    public function publicGuaranteePayload(int $reservationId): ?array
    {
        $row = $this->guaranteeForReservation($reservationId);
        if (!$row) {
            return null;
        }

        return [
            'status' => (string)$row->status,
            'provider' => (string)($row->provider ?? 'stripe'),
            'payment_method_code' => (string)($row->payment_method_code ?? 'card'),
            'amount_per_guest_cents' => (int)$row->amount_per_guest_cents,
            'amount_cents' => (int)$row->amount_cents,
            'charged_amount_cents' => isset($row->charged_amount_cents)
                ? (int)$row->charged_amount_cents
                : null,
            'currency' => (string)$row->currency,
            'terms_version' => (string)$row->terms_version,
            'locale' => (string)($row->locale ?? 'en'),
            'terms_text' => (string)($row->terms_text ?? ''),
            'consent_text' => (string)($row->consent_text ?? ''),
            'cancellation_deadline_at' => $row->cancellation_deadline_at,
            'charge_eligible_at' => $row->charge_eligible_at,
            'charged_at' => $row->charged_at,
            'released_at' => $row->released_at,
        ];
    }

    public function sendGuaranteeConfirmation(
        Reservations_model $reservation
    ): bool {
        if (!$this->boolSetting('reservation_guarantee_send_confirmation_email', true)) {
            return false;
        }

        $row = $this->guaranteeForReservation((int)$reservation->getKey());
        if (!$row) {
            return false;
        }

        $email = strtolower(trim((string)$reservation->email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Log::warning('PMD reservation guarantee confirmation email skipped', [
                'reservation_id' => (int)$reservation->getKey(),
                'reason' => 'invalid_customer_email',
            ]);

            return false;
        }

        try {
            $reservation->loadMissing('location');
            $locale = $this->locale((string)($row->locale ?? 'de'));
            $currency = strtoupper((string)($row->currency ?? 'EUR'));
            $customerName = trim(
                (string)$reservation->first_name.' '.(string)$reservation->last_name
            );
            $restaurantName = $reservation->location
                ? trim((string)$reservation->location->location_name)
                : '';
            $restaurantEmail = $reservation->location
                ? strtolower(trim((string)$reservation->location->location_email))
                : '';

            $reserveDate = $reservation->reserve_date instanceof \DateTimeInterface
                ? $reservation->reserve_date->format('Y-m-d')
                : substr((string)$reservation->reserve_date, 0, 10);
            $reserveTime = $reservation->reserve_time instanceof \DateTimeInterface
                ? $reservation->reserve_time->format('H:i')
                : substr((string)$reservation->reserve_time, 0, 5);

            $deadline = '';
            if (!empty($row->cancellation_deadline_at)) {
                $deadlineCarbon = Carbon::parse(
                    (string)$row->cancellation_deadline_at,
                    'UTC'
                )->setTimezone('Europe/Berlin');

                $deadline = $locale === 'de'
                    ? $deadlineCarbon->format('d.m.Y H:i')
                    : $deadlineCarbon->format('Y-m-d H:i');
            }

            $reference = 'R'.str_pad(
                (string)$reservation->getKey(),
                6,
                '0',
                STR_PAD_LEFT
            );
            $manageUrl = url('/book')
                .'?manage='.rawurlencode((string)$reservation->hash)
                .'&lang='.rawurlencode($locale);

            $subjects = [
                'de' => 'Kartengarantie für Ihre Reservierung '.$reference,
                'tr' => 'Rezervasyon kart garantisi '.$reference,
                'ar' => 'تأكيد ضمان البطاقة للحجز '.$reference,
                'en' => 'Card guarantee for reservation '.$reference,
            ];

            $vars = [
                'locale' => $locale,
                'email_subject' => $subjects[$locale] ?? $subjects['en'],
                'reference' => $reference,
                'customer_name' => $customerName,
                'restaurant_name' => $restaurantName,
                'reservation_date' => $reserveDate,
                'reservation_time' => $reserveTime,
                'reservation_guests' => (int)$reservation->guest_num,
                'guarantee_amount' => $this->money(
                    (int)$row->amount_cents,
                    $currency,
                    $locale
                ),
                'guarantee_per_guest_amount' => $this->money(
                    (int)$row->amount_per_guest_cents,
                    $currency,
                    $locale
                ),
                'guarantee_terms' => (string)($row->terms_text ?? ''),
                'guarantee_consent' => (string)($row->consent_text ?? ''),
                'guarantee_terms_version' => (string)($row->terms_version ?? ''),
                'free_cancellation_deadline' => $deadline,
                'manage_url' => $manageUrl,
            ];

            Mail::queue(
                'admin::_mail.reservation_guarantee_confirmation',
                $vars,
                function ($message) use (
                    $email,
                    $customerName,
                    $restaurantEmail,
                    $restaurantName
                ) {
                    $message->to($email, $customerName);

                    if (filter_var($restaurantEmail, FILTER_VALIDATE_EMAIL)) {
                        $message->replyTo(
                            $restaurantEmail,
                            $restaurantName
                        );
                    }
                }
            );

            return true;
        } catch (Throwable $error) {
            Log::warning('PMD reservation guarantee confirmation email failed', [
                'reservation_id' => (int)$reservation->getKey(),
                'message' => $error->getMessage(),
            ]);

            return false;
        }
    }

    public function canGuestCancel(Reservations_model $reservation): ?bool
    {
        $row = $this->guaranteeForReservation((int)$reservation->getKey());
        if (!$row || (string)$row->status !== 'active') {
            return null;
        }

        if (!$row->cancellation_deadline_at) {
            return false;
        }

        return Carbon::now('UTC')->lessThanOrEqualTo(
            Carbon::parse((string)$row->cancellation_deadline_at, 'UTC')
        );
    }

    public function releaseGuarantee(
        Reservations_model $reservation,
        string $reason = 'reservation_released'
    ): bool {
        $row = $this->guaranteeForReservation((int)$reservation->getKey());
        if (!$row) {
            return false;
        }

        if ((string)$row->status === 'released') {
            return true;
        }

        if ((string)$row->status === 'charged') {
            return false;
        }

        if (strtolower((string)($row->provider ?? 'stripe')) === 'stripe') {
            $this->cleanupStripeReferences($row);
        } else {
            app(PmdReservationGuaranteeGateway::class)->release($row);
        }

        $this->guaranteeDb()->table('reservation_guarantees')
            ->where('guarantee_id', (int)$row->guarantee_id)
            ->update([
                'status' => 'released',
                'customer_reference' => null,
                'payment_method_reference' => null,
                'released_at' => now(),
                'last_error' => null,
                'updated_at' => now(),
            ]);

        Log::info('PMD reservation guarantee released', [
            'reservation_id' => (int)$reservation->getKey(),
            'reason' => $reason,
        ]);

        return true;
    }

    public function adminPayloadForReservation(int $reservationId): array
    {
        $row = $this->guaranteeForReservation($reservationId);
        if (!$row) {
            return [
                'status' => 'none',
                'amount_cents' => 0,
                'currency' => 'EUR',
                'can_charge' => false,
                'can_release' => false,
            ];
        }

        $status = (string)$row->status;
        $canChargeStatus = in_array($status, ['active', 'charge_failed'], true);
        $eligible = $row->charge_eligible_at
            ? Carbon::now('UTC')->greaterThanOrEqualTo(
                Carbon::parse((string)$row->charge_eligible_at, 'UTC')
            )
            : false;

        return [
            'status' => $status,
            'provider' => (string)($row->provider ?? 'stripe'),
            'payment_method_code' => (string)($row->payment_method_code ?? 'card'),
            'amount_cents' => (int)$row->amount_cents,
            'charged_amount_cents' => isset($row->charged_amount_cents)
                ? (int)$row->charged_amount_cents
                : null,
            'amount_per_guest_cents' => (int)$row->amount_per_guest_cents,
            'currency' => (string)$row->currency,
            'can_charge' => $canChargeStatus && $eligible,
            'can_release' => !in_array($status, ['released', 'charged'], true),
            'charge_eligible_at' => $row->charge_eligible_at,
            'cancellation_deadline_at' => $row->cancellation_deadline_at,
            'charge_intent_reference' => $row->charge_intent_reference,
            'loss_assessment_note' => (string)($row->loss_assessment_note ?? ''),
            'loss_assessed_by_staff_id' => isset($row->loss_assessed_by_staff_id)
                ? (int)$row->loss_assessed_by_staff_id
                : null,
            'loss_assessed_at' => $row->loss_assessed_at ?? null,
        ];
    }

    public function chargeNoShow(
        Reservations_model $reservation,
        ?int $requestedAmountCents = null,
        ?string $lossAssessmentNote = null,
        ?int $staffId = null
    ): array {
        $row = $this->guaranteeForReservation(
            (int)$reservation->getKey()
        );
        if (!$row) {
            throw new RuntimeException(
                'This reservation has no payment-method guarantee.'
            );
        }

        if ($reservation->isCanceled()) {
            throw new RuntimeException(
                'A canceled reservation cannot be charged as a no-show.'
            );
        }

        if ((string)$row->status === 'charged') {
            return [
                'success' => true,
                'already_charged' => true,
                'payment_intent_id' => (string)$row->charge_intent_reference,
                'amount_cents' => isset($row->charged_amount_cents)
                    ? (int)$row->charged_amount_cents
                    : (int)$row->amount_cents,
                'maximum_amount_cents' => (int)$row->amount_cents,
                'currency' => (string)$row->currency,
            ];
        }

        if ((string)$row->status === 'action_required') {
            throw new RuntimeException(
                'The payment provider requires customer authentication. No charge was completed. Release the guarantee or ask the guest for a new authorization.'
            );
        }

        if (!in_array(
            (string)$row->status,
            ['active', 'charge_failed'],
            true
        )) {
            throw new RuntimeException(
                'This guarantee can no longer be charged.'
            );
        }

        if (
            !$row->charge_eligible_at
            || Carbon::now('UTC')->lessThan(
                Carbon::parse(
                    (string)$row->charge_eligible_at,
                    'UTC'
                )
            )
        ) {
            throw new RuntimeException(
                'The no-show grace period has not ended yet.'
            );
        }

        $providerCode = strtolower(
            trim((string)($row->provider ?? 'stripe'))
        );
        $paymentReference = trim(
            (string)$row->payment_method_reference
        );
        if ($paymentReference === '') {
            throw new RuntimeException(
                'The saved payment-method reference is unavailable.'
            );
        }

        if (
            in_array($providerCode, ['stripe', 'sumup'], true)
            && trim((string)$row->customer_reference) === ''
        ) {
            throw new RuntimeException(
                'The saved customer reference is unavailable.'
            );
        }

        $maximumAmount = max(0, (int)$row->amount_cents);
        $chargeAmount = $requestedAmountCents === null
            ? $maximumAmount
            : max(0, (int)$requestedAmountCents);

        if ($chargeAmount < 1) {
            throw new RuntimeException(
                'Enter the actual no-show compensation amount to charge, or release the guarantee if no charge is appropriate.'
            );
        }

        if ($chargeAmount > $maximumAmount) {
            throw new RuntimeException(
                'The no-show charge cannot exceed the maximum amount accepted by the guest.'
            );
        }

        $lossAssessmentNote = trim((string)$lossAssessmentNote);
        if (mb_strlen($lossAssessmentNote) < 5) {
            throw new RuntimeException(
                'Record the actual loss assessment before charging this no-show.'
            );
        }
        if (mb_strlen($lossAssessmentNote) > 2000) {
            throw new RuntimeException(
                'The no-show loss assessment must be 2000 characters or fewer.'
            );
        }

        $this->guaranteeDb()->table('reservation_guarantees')
            ->where('guarantee_id', (int)$row->guarantee_id)
            ->update([
                'loss_assessment_note' => $lossAssessmentNote,
                'loss_assessed_by_staff_id' => $staffId && $staffId > 0
                    ? $staffId
                    : null,
                'loss_assessed_at' => now(),
                'updated_at' => now(),
            ]);

        if ($providerCode !== 'stripe') {
            return $this->chargeNoShowWithGateway(
                $providerCode,
                $row,
                $reservation,
                $chargeAmount,
                $maximumAmount
            );
        }

        $stripeConfig = $this->stripeCredentials(true);
        if (!($stripeConfig['ready'] ?? false)) {
            throw new RuntimeException(
                'Stripe is not enabled for this restaurant.'
            );
        }

        if (
            trim((string)($row->provider_mode ?? '')) !== ''
            && (string)$row->provider_mode
                !== (string)($stripeConfig['mode'] ?? '')
        ) {
            throw new RuntimeException(
                'Stripe test/live mode changed after this guarantee was created. Release this guarantee and ask the guest to verify again.'
            );
        }

        $stripe = new StripeClient($stripeConfig['secret_key']);
        $reference = 'R'.str_pad(
            (string)$reservation->getKey(),
            6,
            '0',
            STR_PAD_LEFT
        );

        try {
            $intent = $stripe->paymentIntents->create([
                'amount' => $chargeAmount,
                'currency' => strtolower((string)$row->currency),
                'customer' => (string)$row->customer_reference,
                'payment_method' => (string)$row->payment_method_reference,
                'off_session' => true,
                'confirm' => true,
                'description' => 'No-show compensation '.$reference,
                'metadata' => [
                    'pmd_surface' => 'reservation_no_show',
                    'pmd_reservation_id' => (string)$reservation->getKey(),
                    'pmd_reference' => $reference,
                    'pmd_terms_version' => (string)$row->terms_version,
                    'pmd_payment_method' => (string)(
                        $row->payment_method_code ?? 'card'
                    ),
                ],
            ], [
                'idempotency_key' => 'pmd-noshow-'
                    .$reservation->getKey().'-'
                    .$row->guarantee_id.'-'
                    .$chargeAmount.'-'
                    .substr(
                        hash(
                            'sha256',
                            trim(
                                (string)(
                                    $row->charge_intent_reference
                                    ?? ''
                                )
                            ) !== ''
                                ? (string)$row->charge_intent_reference
                                : 'first'
                        ),
                        0,
                        12
                    ),
            ]);

            $status = (string)$intent->status;
            if ($status === 'succeeded') {
                $this->markGuaranteeCharged(
                    $row,
                    $chargeAmount,
                    (string)$intent->id
                );
                $this->cleanupStripeReferences($row);
                $this->clearStoredProviderReferences($row);

                return [
                    'success' => true,
                    'already_charged' => false,
                    'payment_intent_id' => (string)$intent->id,
                    'amount_cents' => $chargeAmount,
                    'maximum_amount_cents' => $maximumAmount,
                    'currency' => (string)$row->currency,
                ];
            }

            $nextStatus = $status === 'requires_action'
                ? 'action_required'
                : 'charge_failed';
            $message = 'Stripe returned payment status '.$status.'.';
            $this->markGuaranteeFailed(
                $row,
                $nextStatus,
                (string)$intent->id,
                $message
            );

            return [
                'success' => false,
                'requires_action' => $status === 'requires_action',
                'payment_intent_id' => (string)$intent->id,
                'status' => $status,
                'message' => $message,
                'amount_cents' => $chargeAmount,
                'maximum_amount_cents' => $maximumAmount,
                'currency' => (string)$row->currency,
            ];
        } catch (Throwable $error) {
            $this->markGuaranteeFailed(
                $row,
                'charge_failed',
                '',
                $error->getMessage()
            );

            Log::warning('PMD reservation no-show charge failed', [
                'reservation_id' => (int)$reservation->getKey(),
                'provider' => 'stripe',
                'message' => $error->getMessage(),
            ]);

            throw new RuntimeException(
                'The no-show charge was not completed. No successful charge was recorded.'
            );
        }
    }

    private function chargeNoShowWithGateway(
        string $providerCode,
        object $row,
        Reservations_model $reservation,
        int $chargeAmount,
        int $maximumAmount
    ): array {
        try {
            $result = app(PmdReservationGuaranteeGateway::class)->charge(
                $row,
                $reservation,
                $chargeAmount
            );
            $paymentId = trim((string)(
                $result['payment_id']
                ?? ''
            ));
            $status = strtolower(trim((string)(
                $result['status']
                ?? ''
            )));

            if (!empty($result['success'])) {
                $this->markGuaranteeCharged(
                    $row,
                    $chargeAmount,
                    $paymentId
                );
                app(PmdReservationGuaranteeGateway::class)->release($row);
                $this->clearStoredProviderReferences($row);

                return [
                    'success' => true,
                    'already_charged' => false,
                    'payment_intent_id' => $paymentId,
                    'amount_cents' => $chargeAmount,
                    'maximum_amount_cents' => $maximumAmount,
                    'currency' => (string)$row->currency,
                    'provider' => $providerCode,
                ];
            }

            $requiresAction = in_array(
                $status,
                [
                    'requires_action',
                    'pending_customer_action',
                    'payer_action_required',
                ],
                true
            );
            $next = $requiresAction
                ? 'action_required'
                : 'charge_failed';
            $message = ucfirst($providerCode)
                .' returned payment status '
                .($status !== '' ? $status : 'not completed').'.';

            $this->markGuaranteeFailed(
                $row,
                $next,
                $paymentId,
                $message
            );

            return [
                'success' => false,
                'requires_action' => $requiresAction,
                'payment_intent_id' => $paymentId,
                'status' => $status,
                'message' => $message,
                'amount_cents' => $chargeAmount,
                'maximum_amount_cents' => $maximumAmount,
                'currency' => (string)$row->currency,
                'provider' => $providerCode,
            ];
        } catch (Throwable $error) {
            $this->markGuaranteeFailed(
                $row,
                'charge_failed',
                '',
                $error->getMessage()
            );

            Log::warning('PMD reservation no-show charge failed', [
                'reservation_id' => (int)$reservation->getKey(),
                'provider' => $providerCode,
                'message' => $error->getMessage(),
            ]);

            throw new RuntimeException(
                'The no-show charge was not completed. No successful charge was recorded.'
            );
        }
    }

    private function markGuaranteeCharged(
        object $row,
        int $chargeAmount,
        string $paymentId
    ): void {
        $this->guaranteeDb()->table('reservation_guarantees')
            ->where('guarantee_id', (int)$row->guarantee_id)
            ->update([
                'status' => 'charged',
                'charged_amount_cents' => $chargeAmount,
                'charge_intent_reference' => $paymentId !== ''
                    ? $paymentId
                    : null,
                'charged_at' => now(),
                'last_error' => null,
                'updated_at' => now(),
            ]);
    }

    private function markGuaranteeFailed(
        object $row,
        string $status,
        string $paymentId,
        string $message
    ): void {
        $this->guaranteeDb()->table('reservation_guarantees')
            ->where('guarantee_id', (int)$row->guarantee_id)
            ->update([
                'status' => $status,
                'charge_intent_reference' => $paymentId !== ''
                    ? $paymentId
                    : ($row->charge_intent_reference ?? null),
                'last_error' => substr($message, 0, 2000),
                'updated_at' => now(),
            ]);
    }

    private function clearStoredProviderReferences(object $row): void
    {
        $this->guaranteeDb()->table('reservation_guarantees')
            ->where('guarantee_id', (int)$row->guarantee_id)
            ->update([
                'customer_reference' => null,
                'payment_method_reference' => null,
                'updated_at' => now(),
            ]);
    }

    public function publicPolicyPayload(array $policy): array
    {
        return [
            'required' => (bool)($policy['required'] ?? false),
            'providerReady' => (bool)($policy['provider_ready'] ?? false),
            'provider' => (string)($policy['provider'] ?? 'stripe'),
            'methods' => array_values((array)($policy['methods'] ?? [])),
            'amountPerGuestCents' => (int)($policy['amount_per_guest_cents'] ?? 0),
            'amountCents' => (int)($policy['amount_cents'] ?? 0),
            'currency' => (string)($policy['currency'] ?? 'EUR'),
            'freeCancelHours' => (int)($policy['free_cancel_hours'] ?? 24),
            'graceMinutes' => (int)($policy['grace_minutes'] ?? 15),
            'termsVersion' => (string)($policy['terms_version'] ?? ''),
            'termsText' => (string)($policy['terms_text'] ?? ''),
            'consentText' => (string)($policy['consent_text'] ?? ''),
            'buttonText' => (string)($policy['button_text'] ?? ''),
        ];
    }

    private function guaranteeConnectionName(): string
    {
        return app()->bound('tenant')
            ? 'tenant'
            : DB::getDefaultConnection();
    }

    private function guaranteeDb()
    {
        return DB::connection($this->guaranteeConnectionName());
    }

    private function guaranteeSchema()
    {
        return Schema::connection($this->guaranteeConnectionName());
    }

    private function baseSettings(): array
    {
        $settings = app(PmdReservationGuaranteeSettings::class);
        $enabled = $settings->bool('reservation_guarantee_enabled', false);
        $amount = max(0, min(
            1000000,
            $settings->int('reservation_guarantee_amount_cents', 0)
        ));

        $provider = app(PmdReservationGuaranteeProviderRegistry::class)
            ->selectedProvider();

        return [
            'enabled' => $enabled && $amount > 0,
            'provider' => $provider,
            'methods' => app(PmdReservationGuaranteeProviderRegistry::class)
                ->selectedMethods(),
            'send_confirmation_email' => $settings->bool('reservation_guarantee_send_confirmation_email', true),
            'min_guests' => max(1, min(100, $settings->int('reservation_guarantee_min_guests', 6))),
            'amount_per_guest_cents' => $amount,
            'free_cancel_hours' => max(1, min(336, $settings->int('reservation_guarantee_free_cancel_hours', 24))),
            'grace_minutes' => max(0, min(180, $settings->int('reservation_guarantee_grace_minutes', 15))),
            'terms_version' => trim($settings->string(
                'reservation_guarantee_terms_version',
                'DE-NOSHOW-2026-01'
            )) ?: 'DE-NOSHOW-2026-01',
        ];
    }

    private function stripeCredentials(bool $requireEnabled): array
    {
        try {
            $payment = Payments_model::query()
                ->where('code', 'stripe')
                ->first();

            if (!$payment) {
                return ['ready' => false];
            }

            $data = method_exists($payment, 'getConfigData')
                ? (array)$payment->getConfigData()
                : (array)$payment->data;
            $mode = strtolower(trim((string)($data['transaction_mode'] ?? 'test')));
            $live = $mode === 'live';
            $secret = trim((string)($live
                ? ($data['live_secret_key'] ?? '')
                : ($data['test_secret_key'] ?? '')));
            $publishable = trim((string)($live
                ? ($data['live_publishable_key'] ?? '')
                : ($data['test_publishable_key'] ?? '')));
            $currency = strtoupper(trim((string)($data['currency'] ?? 'EUR')));

            $enabled = !$requireEnabled || (int)$payment->status === 1;

            return [
                'ready' => $enabled && $secret !== '' && $publishable !== '',
                'secret_key' => $secret,
                'publishable_key' => $publishable,
                'currency' => preg_match('/^[A-Z]{3}$/', $currency) ? $currency : 'EUR',
                'mode' => $mode,
            ];
        } catch (Throwable $error) {
            Log::warning('PMD reservation guarantee Stripe configuration read failed', [
                'message' => $error->getMessage(),
            ]);

            return ['ready' => false];
        }
    }

    private function setupMetadata(
        Locations_model $location,
        array $booking,
        array $policy
    ): array {
        $parts = [
            (int)$location->getKey(),
            (string)$booking['reserve_date'],
            substr((string)$booking['reserve_time'], 0, 5),
            (int)$booking['guest_num'],
            (int)$policy['amount_cents'],
            strtoupper((string)$policy['currency']),
            (string)$policy['terms_version'],
        ];

        return [
            'pmd_surface' => 'public_reservation_guarantee',
            'pmd_location_id' => (string)$parts[0],
            'pmd_reserve_date' => (string)$parts[1],
            'pmd_reserve_time' => (string)$parts[2],
            'pmd_guests' => (string)$parts[3],
            'pmd_amount_cents' => (string)$parts[4],
            'pmd_currency' => (string)$parts[5],
            'pmd_terms_version' => (string)$parts[6],
            'pmd_contract_hash' => hash_hmac(
                'sha256',
                implode('|', $parts),
                (string)config('app.key')
            ),
        ];
    }

    private function cleanupStripeReferences(object $row): void
    {
        $stripeConfig = $this->stripeCredentials(false);
        if (!($stripeConfig['secret_key'] ?? '')) {
            return;
        }

        try {
            $stripe = new StripeClient($stripeConfig['secret_key']);
            $paymentMethod = trim((string)($row->payment_method_reference ?? ''));
            $customer = trim((string)($row->customer_reference ?? ''));

            if ($paymentMethod !== '') {
                try {
                    $stripe->paymentMethods->detach($paymentMethod, []);
                } catch (Throwable $ignored) {
                }
            }

            if ($customer !== '') {
                try {
                    $stripe->customers->delete($customer, []);
                } catch (Throwable $ignored) {
                }
            }
        } catch (Throwable $error) {
            Log::warning('PMD reservation guarantee Stripe cleanup failed', [
                'guarantee_id' => (int)($row->guarantee_id ?? 0),
                'message' => $error->getMessage(),
            ]);
        }
    }

    private function termsText(array $policy): string
    {
        $locale = $this->locale((string)$policy['locale']);
        $perGuest = $this->money((int)$policy['amount_per_guest_cents'], (string)$policy['currency'], $locale);
        $hours = (int)$policy['free_cancel_hours'];
        $grace = (int)$policy['grace_minutes'];

        if ($locale === 'de') {
            return "Kostenlos bis {$hours} Std. vorher · No-Show: max. {$perGuest}/Person nach {$grace} Min. · Nur tatsächlicher Schaden";
        }

        if ($locale === 'tr') {
            return "Ücretsiz iptal: {$hours} saat öncesine kadar · Gelmeme: {$grace} dk sonra en fazla {$perGuest}/kişi · Yalnızca gerçek zarar";
        }

        if ($locale === 'ar') {
            return "إلغاء مجاني حتى قبل {$hours} ساعة · عدم الحضور: بحد أقصى {$perGuest} للشخص بعد {$grace} دقيقة · الضرر الفعلي فقط";
        }

        return "Free cancellation: until {$hours}h before · No-show: max. {$perGuest}/guest after {$grace} min · Actual loss only";
    }

    private function consentText(array $policy): string
    {
        $locale = $this->locale((string)$policy['locale']);

        if ($locale === 'de') {
            return 'Ich stimme der Kartengarantie und den Bedingungen zu.';
        }

        if ($locale === 'tr') {
            return 'Kart garantisini ve koşullarını kabul ediyorum.';
        }

        if ($locale === 'ar') {
            return 'أوافق على ضمان البطاقة وشروطه.';
        }

        return 'I agree to the card guarantee and its terms.';
    }

    private function buttonText(string $locale): string
    {
        $locale = $this->locale($locale);

        if ($locale === 'de') {
            return 'Mit Kartengarantie reservieren';
        }
        if ($locale === 'tr') {
            return 'Kart garantisiyle onayla';
        }
        if ($locale === 'ar') {
            return 'تأكيد الحجز بضمان البطاقة';
        }

        return 'Confirm with card guarantee';
    }

    private function money(int $cents, string $currency, string $locale): string
    {
        $amount = number_format(
            $cents / 100,
            2,
            $locale === 'de' ? ',' : '.',
            $locale === 'de' ? '.' : ','
        );

        return strtoupper($currency) === 'EUR'
            ? $amount.' €'
            : $amount.' '.strtoupper($currency);
    }

    private function stripeApiMessage(
        array $body,
        string $fallback
    ): string {
        $error = (array)($body['error'] ?? []);
        $message = trim((string)($error['message'] ?? ''));

        return $message !== ''
            ? substr($message, 0, 500)
            : $fallback;
    }

    private function stripeObjectArray($value): array
    {
        if (is_object($value) && method_exists($value, 'toArray')) {
            return (array)$value->toArray();
        }

        return (array)$value;
    }

    private function locale(string $locale): string
    {
        $locale = strtolower(substr($locale, 0, 2));
        return in_array($locale, ['de', 'en', 'tr', 'ar'], true)
            ? $locale
            : 'en';
    }

    private function intSetting(string $key, int $default): int
    {
        return app(PmdReservationGuaranteeSettings::class)
            ->int($key, $default);
    }

    private function boolSetting(string $key, bool $default): bool
    {
        return app(PmdReservationGuaranteeSettings::class)
            ->bool($key, $default);
    }
}
