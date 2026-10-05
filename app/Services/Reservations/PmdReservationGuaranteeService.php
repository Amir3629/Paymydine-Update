<?php

namespace App\Services\Reservations;

use Admin\Models\Locations_model;
use Admin\Models\Payments_model;
use Admin\Models\Reservations_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Stripe\StripeClient;
use Throwable;

final class PmdReservationGuaranteeService
{
    public function publicConfig(Locations_model $location, string $locale = 'de'): array
    {
        $base = $this->baseSettings();
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
            'currency' => $stripe['currency'] ?? 'EUR',
            'freeCancelHours' => $base['free_cancel_hours'],
            'graceMinutes' => $base['grace_minutes'],
            'termsVersion' => $base['terms_version'],
            'provider' => 'stripe',
            'providerReady' => (bool)($stripe['ready'] ?? false),
            'publishableKey' => (string)($stripe['publishable_key'] ?? ''),
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
            'provider_ready' => (bool)($stripe['ready'] ?? false),
            'provider' => 'stripe',
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

    public function createSetupIntent(
        Locations_model $location,
        array $booking,
        string $locale = 'de'
    ): array {
        $start = Carbon::parse(
            (string)$booking['reserve_date'].' '.(string)$booking['reserve_time'],
            'Europe/Berlin'
        );
        $policy = $this->policy(
            $location,
            (int)$booking['guest_num'],
            $start,
            $locale
        );

        if (!$policy['required']) {
            throw new RuntimeException('A card guarantee is not required for this reservation.');
        }

        $stripeConfig = $this->stripeCredentials(true);
        if (!($stripeConfig['ready'] ?? false)) {
            throw new RuntimeException('Card guarantee is temporarily unavailable. Please contact the restaurant.');
        }

        $stripe = new StripeClient($stripeConfig['secret_key']);
        $metadata = $this->setupMetadata($location, $booking, $policy);
        $customer = null;

        try {
            $customer = $stripe->customers->create([
                'email' => strtolower(trim((string)($booking['email'] ?? ''))),
                'name' => trim((string)($booking['first_name'] ?? '').' '.(string)($booking['last_name'] ?? '')),
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
                'publishable_key' => $stripeConfig['publishable_key'],
                'client_secret' => (string)$intent->client_secret,
                'setup_intent_id' => (string)$intent->id,
                'policy' => $this->publicPolicyPayload($policy),
            ];
        } catch (Throwable $error) {
            if ($customer && !empty($customer->id)) {
                try {
                    $stripe->customers->delete((string)$customer->id, []);
                } catch (Throwable $ignored) {
                }
            }

            Log::warning('PMD reservation guarantee setup failed', [
                'location_id' => (int)$location->getKey(),
                'message' => $error->getMessage(),
            ]);

            throw new RuntimeException('Card verification could not be started. Please try again.');
        }
    }

    public function verifySetupIntent(
        Locations_model $location,
        array $booking,
        string $setupIntentId,
        string $locale = 'de'
    ): array {
        $start = Carbon::parse(
            (string)$booking['reserve_date'].' '.(string)$booking['reserve_time'],
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

        $stripeConfig = $this->stripeCredentials(true);
        if (!($stripeConfig['ready'] ?? false)) {
            throw new RuntimeException('Card guarantee is not configured for this restaurant.');
        }

        if (!preg_match('/^seti_[A-Za-z0-9_]+$/', $setupIntentId)) {
            throw new RuntimeException('Card verification is missing or invalid.');
        }

        $stripe = new StripeClient($stripeConfig['secret_key']);

        try {
            $intent = $stripe->setupIntents->retrieve($setupIntentId, []);
        } catch (Throwable $error) {
            throw new RuntimeException('Card verification could not be verified.');
        }

        if ((string)$intent->status !== 'succeeded') {
            throw new RuntimeException('Please complete the card verification before confirming the reservation.');
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
            if ((string)($metadata[$key] ?? '') !== (string)($expected[$key] ?? '')) {
                throw new RuntimeException('The card guarantee no longer matches this reservation. Please verify the card again.');
            }
        }

        $paymentMethod = is_object($intent->payment_method ?? null)
            ? (string)($intent->payment_method->id ?? '')
            : (string)($intent->payment_method ?? '');
        $customer = is_object($intent->customer ?? null)
            ? (string)($intent->customer->id ?? '')
            : (string)($intent->customer ?? '');

        if ($paymentMethod === '' || $customer === '') {
            throw new RuntimeException('Card verification did not return a reusable payment reference.');
        }

        return [
            'required' => true,
            'policy' => $policy,
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

        if (!Schema::hasTable('reservation_guarantees')) {
            throw new RuntimeException('Reservation guarantee storage is not installed.');
        }

        $policy = (array)($verified['policy'] ?? []);
        $terms = (string)($policy['terms_text'] ?? '');
        $consent = (string)($policy['consent_text'] ?? '');
        $deadline = $policy['cancellation_deadline_at'] ?? null;
        $eligible = $policy['charge_eligible_at'] ?? null;
        $now = now();

        DB::table('reservation_guarantees')->updateOrInsert(
            ['reservation_id' => (int)$reservation->getKey()],
            [
                'location_id' => (int)$reservation->location_id,
                'provider' => 'stripe',
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

        $row = (object)[
            'guarantee_id' => 0,
            'customer_reference' => (string)($verified['customer_reference'] ?? ''),
            'payment_method_reference' => (string)($verified['payment_method_reference'] ?? ''),
        ];

        $this->cleanupStripeReferences($row);
    }

    public function guaranteeForReservation(int $reservationId): ?object
    {
        if ($reservationId < 1 || !Schema::hasTable('reservation_guarantees')) {
            return null;
        }

        return DB::table('reservation_guarantees')
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
            'amount_cents' => (int)$row->amount_cents,
            'charged_amount_cents' => isset($row->charged_amount_cents)
                ? (int)$row->charged_amount_cents
                : null,
            'currency' => (string)$row->currency,
            'terms_version' => (string)$row->terms_version,
            'cancellation_deadline_at' => $row->cancellation_deadline_at,
            'charge_eligible_at' => $row->charge_eligible_at,
            'charged_at' => $row->charged_at,
            'released_at' => $row->released_at,
        ];
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

        if (in_array((string)$row->status, ['released', 'charged'], true)) {
            return true;
        }

        $this->cleanupStripeReferences($row);

        DB::table('reservation_guarantees')
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
        $canChargeStatus = in_array($status, ['active', 'charge_failed', 'action_required'], true);
        $eligible = $row->charge_eligible_at
            ? Carbon::now('UTC')->greaterThanOrEqualTo(
                Carbon::parse((string)$row->charge_eligible_at, 'UTC')
            )
            : false;

        return [
            'status' => $status,
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
        ];
    }

    public function chargeNoShow(
        Reservations_model $reservation,
        ?int $requestedAmountCents = null
    ): array {

        $row = $this->guaranteeForReservation((int)$reservation->getKey());
        if (!$row) {
            throw new RuntimeException('This reservation has no card guarantee.');
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

        if (!in_array((string)$row->status, ['active', 'charge_failed', 'action_required'], true)) {
            throw new RuntimeException('This card guarantee can no longer be charged.');
        }

        if (!$row->charge_eligible_at || Carbon::now('UTC')->lessThan(
            Carbon::parse((string)$row->charge_eligible_at, 'UTC')
        )) {
            throw new RuntimeException('The no-show grace period has not ended yet.');
        }

        if (
            trim((string)$row->customer_reference) === ''
            || trim((string)$row->payment_method_reference) === ''
        ) {
            throw new RuntimeException('The saved card reference is unavailable.');
        }

        $stripeConfig = $this->stripeCredentials(true);
        if (!($stripeConfig['ready'] ?? false)) {
            throw new RuntimeException('Stripe is not enabled for this restaurant.');
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

        $stripe = new StripeClient($stripeConfig['secret_key']);
        $reference = 'R'.str_pad((string)$reservation->getKey(), 6, '0', STR_PAD_LEFT);

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
                ],
            ], [
                'idempotency_key' => 'pmd-noshow-'
                    .$reservation->getKey().'-'
                    .$row->guarantee_id.'-'
                    .$chargeAmount.'-'
                    .substr(
                        hash(
                            'sha256',
                            trim((string)($row->charge_intent_reference ?? '')) !== ''
                                ? (string)$row->charge_intent_reference
                                : 'first'
                        ),
                        0,
                        12
                    ),
            ]);

            $status = (string)$intent->status;
            if ($status === 'succeeded') {
                DB::table('reservation_guarantees')
                    ->where('guarantee_id', (int)$row->guarantee_id)
                    ->update([
                        'status' => 'charged',
                        'charged_amount_cents' => $chargeAmount,
                        'charge_intent_reference' => (string)$intent->id,
                        'charged_at' => now(),
                        'last_error' => null,
                        'updated_at' => now(),
                    ]);

                $this->cleanupStripeReferences($row);

                DB::table('reservation_guarantees')
                    ->where('guarantee_id', (int)$row->guarantee_id)
                    ->update([
                        'customer_reference' => null,
                        'payment_method_reference' => null,
                        'updated_at' => now(),
                    ]);

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

            DB::table('reservation_guarantees')
                ->where('guarantee_id', (int)$row->guarantee_id)
                ->update([
                    'status' => $nextStatus,
                    'charge_intent_reference' => (string)$intent->id,
                    'last_error' => $message,
                    'updated_at' => now(),
                ]);

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
            DB::table('reservation_guarantees')
                ->where('guarantee_id', (int)$row->guarantee_id)
                ->update([
                    'status' => 'charge_failed',
                    'last_error' => substr($error->getMessage(), 0, 2000),
                    'updated_at' => now(),
                ]);

            Log::warning('PMD reservation no-show charge failed', [
                'reservation_id' => (int)$reservation->getKey(),
                'message' => $error->getMessage(),
            ]);

            throw new RuntimeException(
                'The no-show charge was not completed. No successful charge was recorded.'
            );
        }
    }

    public function publicPolicyPayload(array $policy): array
    {
        return [
            'required' => (bool)($policy['required'] ?? false),
            'providerReady' => (bool)($policy['provider_ready'] ?? false),
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

    private function baseSettings(): array
    {
        $enabled = $this->boolSetting('reservation_guarantee_enabled', false);
        $amount = max(0, min(1000000, $this->intSetting('reservation_guarantee_amount_cents', 0)));

        return [
            'enabled' => $enabled && $amount > 0,
            'min_guests' => max(1, min(100, $this->intSetting('reservation_guarantee_min_guests', 6))),
            'amount_per_guest_cents' => $amount,
            'free_cancel_hours' => max(1, min(336, $this->intSetting('reservation_guarantee_free_cancel_hours', 24))),
            'grace_minutes' => max(0, min(180, $this->intSetting('reservation_guarantee_grace_minutes', 15))),
            'terms_version' => trim((string)setting('reservation_guarantee_terms_version', 'DE-NOSHOW-2026-01'))
                ?: 'DE-NOSHOW-2026-01',
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
            return "Kartengarantie: Jetzt wird nichts belastet. Bei Nichterscheinen kann nach {$grace} Minuten Kulanzzeit eine Ausfallentschädigung von bis zu {$perGuest} pro Person über die bestätigte Karte belastet werden. Bis {$hours} Stunden vor dem Reservierungszeitpunkt kann kostenlos storniert werden. Ihnen bleibt ausdrücklich der Nachweis gestattet, dass kein oder ein wesentlich geringerer Schaden entstanden ist.";
        }

        if ($locale === 'tr') {
            return "Kart garantisi: Şimdi herhangi bir ücret alınmaz. Rezervasyona gelinmemesi halinde {$grace} dakikalık bekleme süresinden sonra kişi başı en fazla {$perGuest} zarar tazminatı onaylanan karttan tahsil edilebilir. Rezervasyondan {$hours} saat öncesine kadar ücretsiz iptal mümkündür. Hiç zarar oluşmadığını veya zararın önemli ölçüde daha düşük olduğunu kanıtlama hakkınız saklıdır.";
        }

        if ($locale === 'ar') {
            return "ضمان البطاقة: لن يتم خصم أي مبلغ الآن. في حال عدم الحضور، وبعد مهلة قدرها {$grace} دقيقة، يمكن تحصيل تعويض عن الضرر يصل إلى {$perGuest} لكل شخص من البطاقة المؤكدة. يمكن الإلغاء مجاناً حتى {$hours} ساعة قبل موعد الحجز. ويظل من حقك إثبات عدم وقوع ضرر أو أن الضرر الفعلي أقل بكثير.";
        }

        return "Card guarantee: Nothing is charged now. If you do not show up, after a {$grace}-minute grace period the restaurant may charge liquidated damages of up to {$perGuest} per guest to the verified card. You can cancel free of charge until {$hours} hours before the reservation. You may expressly prove that no loss, or a substantially lower loss, occurred.";
    }

    private function consentText(array $policy): string
    {
        $locale = $this->locale((string)$policy['locale']);

        if ($locale === 'de') {
            return 'Ich habe die Kartengarantie und die mögliche Ausfallentschädigung gelesen und stimme der Kartenbestätigung für diese Reservierung zu.';
        }

        if ($locale === 'tr') {
            return 'Kart garantisi ve olası no-show tazminatı koşullarını okudum ve bu rezervasyon için kart doğrulamasını kabul ediyorum.';
        }

        if ($locale === 'ar') {
            return 'قرأت شروط ضمان البطاقة والتعويض المحتمل عن عدم الحضور وأوافق على التحقق من البطاقة لهذا الحجز.';
        }

        return 'I have read the card-guarantee and possible no-show compensation terms and agree to verify my card for this reservation.';
    }

    private function buttonText(string $locale): string
    {
        $locale = $this->locale($locale);

        if ($locale === 'de') {
            return 'Verbindlich reservieren – mögliche Ausfallentschädigung bis';
        }
        if ($locale === 'tr') {
            return 'Rezervasyonu onayla – olası no-show tazminatı en fazla';
        }
        if ($locale === 'ar') {
            return 'تأكيد الحجز – تعويض محتمل لعدم الحضور بحد أقصى';
        }

        return 'Confirm booking – possible no-show charge up to';
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
        $value = setting($key, $default);
        return is_scalar($value) || $value === null
            ? (int)$value
            : $default;
    }

    private function boolSetting(string $key, bool $default): bool
    {
        $value = setting($key, $default ? 1 : 0);
        if (is_bool($value)) {
            return $value;
        }

        return in_array(
            strtolower(trim((string)$value)),
            ['1', 'true', 'yes', 'on'],
            true
        );
    }
}
