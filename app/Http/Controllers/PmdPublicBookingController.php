<?php

namespace App\Http\Controllers;

use Admin\Models\Locations_model;
use Admin\Models\Reservations_model;
use App\Services\Platform\LocationPlatformContext;
use App\Services\Reservations\PmdReservationGuaranteeService;
use App\Services\Reservations\PmdReservationMessagingService;
use Carbon\Carbon;
use DateTimeInterface;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Throwable;

class PmdPublicBookingController extends Controller
{
    private const MAX_BOOKING_DAYS = 180;
    private const MAX_DATE_STATUS_DAYS = 14;
    private const DEFAULT_SLOT_MINUTES = 30;
    private const DEFAULT_STAY_MINUTES = 90;
    private const PUBLIC_LOCALES = ['en', 'de', 'tr', 'ar'];

    public function show(Request $request)
    {
        if ($request->has('manage')) {
            $manage = trim((string)$request->query('manage', ''));

            if ($manage === '' || in_array(strtolower($manage), ['1', 'lookup'], true)) {
                return $this->renderManagePage($request, null, null);
            }

            $manageLocation = $this->location();
            $manageReservation = $this->reservationByPublicHash($manageLocation, $manage);

            if (!$manageReservation) {
                abort(404);
            }

            return $this->renderManagePage($request, $manageReservation, null);
        }

        $location = $this->location();
        $timezone = $this->timezone();
        $languageContext = $this->languageContext($location);
        $locale = $this->locale($request, $languageContext);
        $today = Carbon::now($timezone)->startOfDay();
        $maxGuests = $this->maxBookableGuests($location);
        $defaultGuests = min(2, $maxGuests);
        $openingHours = $this->openingHours($location);
        $stayMinutes = $this->stayMinutes($location);
        $slotInterval = $this->slotInterval($location);
        $availabilitySeed = $this->dateStatusPayload(
            $location,
            $today,
            7,
            $defaultGuests,
            $openingHours,
            $stayMinutes,
            $slotInterval
        );

        $guaranteeService = app(PmdReservationGuaranteeService::class);
        $guaranteeByLocale = [];
        foreach ((array)$languageContext['eligible'] as $guaranteeLocale) {
            $guaranteeByLocale[$guaranteeLocale] = $guaranteeService
                ->publicConfig($location, (string)$guaranteeLocale);
        }

        // PMD_PUBLIC_BOOKING_DIRECT_VIEW_FILE_R2
        // TastyIgniter's runtime view finder does not include Laravel's
        // resources/views path on this deployment. Render this standalone
        // public Blade by absolute file path so /book remains independent
        // from the active TastyIgniter theme/view namespace.
        $html = view()->file(
            base_path('resources/views/pmd/public-booking.blade.php'),
            [
                'bookingProfile' => $this->profile($location),
                'bookingLocale' => $locale,
                'bookingLocaleTag' => $languageContext['locale_tags'][$locale] ?? $this->defaultLocaleTag($locale),
                'bookingDirection' => $this->localeDirection($locale),
                'bookingLanguages' => $languageContext['eligible'],
                'bookingTimezone' => $timezone,
                'bookingToday' => $today->toDateString(),
                'bookingMaxDate' => $today->copy()->addDays(self::MAX_BOOKING_DAYS)->toDateString(),
                'bookingMaxGuests' => $maxGuests,
                'bookingStayMinutes' => $stayMinutes,
                'bookingAvailabilitySeed' => $availabilitySeed,
                'bookingOpeningHours' => $openingHours,
                'bookingTableRules' => $this->tableRules($location),
                'bookingGuarantee' => $guaranteeByLocale[$locale]
                    ?? $guaranteeService->publicConfig($location, $locale),
                'bookingGuaranteeByLocale' => $guaranteeByLocale,
            ]
        )->render();

        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'private, no-store, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    public function availability(Request $request): JsonResponse
    {
        if (strtolower(trim((string)$request->query('mode', ''))) === 'date-statuses') {
            return $this->dateStatuses($request);
        }

        $location = $this->location();
        $timezone = $this->timezone();
        $maxGuests = $this->maxBookableGuests($location);

        $data = validator($request->all(), [
            'date' => ['required', 'date_format:Y-m-d'],
            'guests' => ['required', 'integer', 'min:1', 'max:'.$maxGuests],
        ])->validate();

        $date = Carbon::createFromFormat('Y-m-d', (string)$data['date'], $timezone)->startOfDay();
        $this->guardBookableDate($date, $timezone);

        $manageHash = trim((string)$request->query('manage_hash', ''));
        if ($manageHash !== '') {
            $reservation = $this->reservationByPublicHash($location, $manageHash);
            if (!$reservation) {
                abort(404);
            }

            $payload = $this->availabilityPayloadExcludingReservation(
                $location,
                $date,
                (int)$data['guests'],
                (int)$reservation->getKey()
            );
        } else {
            $payload = $this->availabilityPayload($location, $date, (int)$data['guests']);
        }

        return response()->json([
            'success' => true,
            'date' => $date->toDateString(),
            'guest_num' => (int)$data['guests'],
            'timezone' => $timezone,
            'opening' => $payload['opening'],
            'duration' => $payload['duration'],
            'interval' => $payload['interval'],
            'slots' => $payload['slots'],
            'capacity_slots' => (array)($payload['capacity_slots'] ?? []),
        ]);
    }

    public function dateStatuses(Request $request): JsonResponse
    {
        $location = $this->location();
        $timezone = $this->timezone();
        $maxGuests = $this->maxBookableGuests($location);

        $data = validator($request->all(), [
            'start' => ['required', 'date_format:Y-m-d'],
            'days' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_DATE_STATUS_DAYS],
            'guests' => ['required', 'integer', 'min:1', 'max:'.$maxGuests],
        ])->validate();

        $start = Carbon::createFromFormat('Y-m-d', (string)$data['start'], $timezone)->startOfDay();
        $this->guardBookableDate($start, $timezone);

        $days = min(self::MAX_DATE_STATUS_DAYS, max(1, (int)($data['days'] ?? self::MAX_DATE_STATUS_DAYS)));
        $guests = (int)$data['guests'];
        $payload = $this->dateStatusPayload(
            $location,
            $start,
            $days,
            $guests
        );

        return response()->json([
            'success' => true,
            'start' => $start->toDateString(),
            'guest_num' => $guests,
            'dates' => $payload,
        ]);
    }

    public function guaranteeSetup(Request $request): JsonResponse
    {
        $location = $this->location();
        $timezone = $this->timezone();
        $maxGuests = $this->maxBookableGuests($location);

        $data = validator($request->all(), [
            'first_name' => ['required', 'string', 'min:1', 'max:48'],
            'last_name' => ['required', 'string', 'min:1', 'max:48'],
            'email' => ['required', 'email:filter', 'max:96'],
            'reserve_date' => ['required', 'date_format:Y-m-d'],
            'reserve_time' => ['required', 'date_format:H:i'],
            'guest_num' => [
                'required',
                'integer',
                'min:1',
                'max:'.$maxGuests,
            ],
            'locale' => ['nullable', 'string', 'in:en,de,tr,ar'],
            'manage_hash' => ['nullable', 'string', 'regex:/^[a-f0-9]{32}$/i'],
            'guarantee_method' => [
                'required',
                'string',
                'in:card,apple_pay,google_pay,paypal',
            ],
        ])->validate();

        $this->assertGuaranteeSlotAvailable(
            $location,
            $timezone,
            $data
        );

        try {
            $result = app(PmdReservationGuaranteeService::class)
                ->createSetup(
                    $location,
                    $data,
                    strtolower((string)$data['guarantee_method']),
                    (string)($data['locale'] ?? 'de')
                );

            return response()->json($result);
        } catch (Throwable $error) {
            Log::warning(
                'PMD public reservation guarantee setup failed',
                [
                    'location_id' => (int)$location->getKey(),
                    'guarantee_method' => (string)(
                        $data['guarantee_method'] ?? ''
                    ),
                    'message' => $error->getMessage(),
                ]
            );

            return response()->json([
                'success' => false,
                'message' => $error->getMessage(),
            ], 422);
        }
    }

    public function guaranteeStatus(Request $request): JsonResponse
    {
        $location = $this->location();
        $timezone = $this->timezone();
        $maxGuests = $this->maxBookableGuests($location);

        $data = validator($request->all(), [
            'reserve_date' => ['required', 'date_format:Y-m-d'],
            'reserve_time' => ['required', 'date_format:H:i'],
            'guest_num' => [
                'required',
                'integer',
                'min:1',
                'max:'.$maxGuests,
            ],
            'locale' => ['nullable', 'string', 'in:en,de,tr,ar'],
            'manage_hash' => ['nullable', 'string', 'regex:/^[a-f0-9]{32}$/i'],
            'guarantee_provider' => [
                'required',
                'string',
                'in:stripe,sumup,paypal,vr_payment,worldline',
            ],
            'guarantee_method' => [
                'required',
                'string',
                'in:card,apple_pay,google_pay,paypal',
            ],
            'setup_reference' => [
                'required',
                'string',
                'max:8192',
            ],
        ])->validate();

        $this->assertGuaranteeSlotAvailable(
            $location,
            $timezone,
            $data
        );

        try {
            return response()->json(
                app(PmdReservationGuaranteeService::class)
                    ->setupStatus(
                        $location,
                        $data,
                        strtolower((string)$data['guarantee_provider']),
                        strtolower((string)$data['guarantee_method']),
                        (string)$data['setup_reference'],
                        (string)($data['locale'] ?? 'de')
                    )
            );
        } catch (Throwable $error) {
            return response()->json([
                'success' => false,
                'message' => $error->getMessage(),
            ], 422);
        }
    }

    public function guaranteeReturn(Request $request)
    {
        $provider = strtolower(trim((string)$request->query(
            'provider',
            ''
        )));
        $result = strtolower(trim((string)$request->query(
            'result',
            'returned'
        )));

        if (!in_array(
            $provider,
            ['paypal', 'vr_payment', 'worldline'],
            true
        )) {
            abort(404);
        }

        $ok = in_array(
            $result,
            ['approved', 'success', 'returned'],
            true
        );
        $title = $ok
            ? 'Payment method confirmed'
            : 'Payment method not confirmed';
        $message = $ok
            ? 'Return to the PayMyDine booking page to continue.'
            : 'Return to the PayMyDine booking page and try again.';

        $html = '<!doctype html><html><head><meta charset="utf-8">'
            .'<meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>'.e($title).'</title></head><body>'
            .'<main><h1>'.e($title).'</h1><p>'.e($message).'</p></main>'
            .'</body></html>';

        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'private, no-store, max-age=0');
    }

    private function assertGuaranteeSlotAvailable(
        Locations_model $location,
        string $timezone,
        array $data
    ): void {
        $date = Carbon::createFromFormat(
            'Y-m-d',
            (string)$data['reserve_date'],
            $timezone
        )->startOfDay();
        $this->guardBookableDate($date, $timezone);

        $manageHash = trim((string)($data['manage_hash'] ?? ''));
        if ($manageHash !== '') {
            $manageReservation = $this->reservationByPublicHash(
                $location,
                $manageHash
            );
            if (!$manageReservation) {
                abort(404);
            }

            $availability = $this->availabilityPayloadExcludingReservation(
                $location,
                $date,
                (int)$data['guest_num'],
                (int)$manageReservation->getKey()
            );
        } else {
            $availability = $this->availabilityPayload(
                $location,
                $date,
                (int)$data['guest_num']
            );
        }

        if (!collect($availability['slots'])->firstWhere(
            'value',
            (string)$data['reserve_time']
        )) {
            throw ValidationException::withMessages([
                'reserve_time' => [
                    'That time is no longer available. Please choose another time.',
                ],
            ]);
        }
    }

    private function dateStatusPayload(
        Locations_model $location,
        Carbon $start,
        int $days,
        int $guests,
        ?array $openingHoursOverride = null,
        ?int $durationOverride = null,
        ?int $intervalOverride = null
    ): array {
        $days = min(self::MAX_DATE_STATUS_DAYS, max(1, $days));
        $timezone = $this->timezone();
        $latest = Carbon::now($timezone)->startOfDay()->addDays(self::MAX_BOOKING_DAYS);
        $lastDate = $start->copy()->addDays($days - 1);

        if ($lastDate->greaterThan($latest)) {
            $lastDate = $latest->copy();
        }

        /*
         * PMD_PUBLIC_BOOKING_ZERO_WAIT_R5
         *
         * Build all near-term date statuses and time slots in one batch so the
         * first HTML response can seed the browser cache. Date switching then
         * does not depend on a network round trip.
         */
        $openingHours = $openingHoursOverride ?? $this->openingHours($location);
        $duration = $durationOverride ?? $this->stayMinutes($location);
        $interval = $intervalOverride ?? $this->slotInterval($location);
        $batchReservations = $this->activeReservations(
            $location,
            $start->copy()->startOfDay(),
            $lastDate->copy()->endOfDay()->addDay()
        );
        $dates = [];

        for ($index = 0; $index < $days; $index++) {
            $date = $start->copy()->addDays($index);
            if ($date->greaterThan($latest)) {
                break;
            }

            $weekday = max(0, min(6, ((int)$date->isoWeekday()) - 1));
            $opening = $openingHours[$weekday] ?? [
                'weekday' => $weekday,
                'enabled' => false,
                'opening_time' => null,
                'closing_time' => null,
            ];

            $reservationDateMin = $date->copy()->subDay()->toDateString();
            $reservationDateMax = $date->copy()->addDay()->toDateString();
            $dateReservations = $batchReservations->filter(static function ($reservation) use ($reservationDateMin, $reservationDateMax) {
                $reserveDate = $reservation->reserve_date instanceof DateTimeInterface
                    ? $reservation->reserve_date->format('Y-m-d')
                    : substr((string)$reservation->reserve_date, 0, 10);

                return $reserveDate >= $reservationDateMin && $reserveDate <= $reservationDateMax;
            })->values();

            $capacityPayload = $this->availabilityTablePayload(
                $location,
                $date,
                $guests,
                $opening,
                $duration,
                $interval,
                $dateReservations
            );
            $slots = (array)($capacityPayload['slots'] ?? []);
            $capacitySlots = (array)($capacityPayload['capacity_slots'] ?? []);

            $status = 'available';
            if (empty($opening['enabled'])) {
                $status = 'closed';
            } elseif (!$slots) {
                $status = 'full';
            }

            $dates[] = [
                'date' => $date->toDateString(),
                'status' => $status,
                'slot_count' => count($slots),
                'opening' => $capacityPayload['opening'],
                'duration' => $capacityPayload['duration'],
                'interval' => $capacityPayload['interval'],
                'slots' => $slots,
                'capacity_slots' => $capacitySlots,
            ];
        }

        return $dates;
    }

    public function store(Request $request)
    {
        $manageAction = strtolower(trim((string)$request->input('_pmd_manage_action', '')));
        if ($manageAction !== '') {
            $manageHash = trim((string)$request->input('_pmd_manage_hash', ''));

            if ($manageAction === 'lookup') {
                return $this->manageLookup($request);
            }

            if (!preg_match('/^[a-f0-9]{32}$/i', $manageHash)) {
                abort(404);
            }

            if ($manageAction === 'update') {
                return $this->manageUpdate($request, $manageHash);
            }

            if ($manageAction === 'cancel') {
                return $this->manageCancel($request, $manageHash);
            }

            abort(404);
        }

        // Quiet honeypot. Real guests never see or populate this field.
        if (trim((string)$request->input('website', '')) !== '') {
            return response()->json([
                'success' => true,
                'message' => 'Reservation received.',
            ]);
        }

        $location = $this->location();
        $timezone = $this->timezone();
        $maxGuests = $this->maxBookableGuests($location);

        $data = validator($request->all(), [
            'first_name' => ['required', 'string', 'min:1', 'max:48'],
            'last_name' => ['required', 'string', 'min:1', 'max:48'],
            'email' => ['required', 'email:filter', 'max:96'],
            'telephone' => ['required', 'string', 'min:5', 'max:64'],
            'reserve_date' => ['required', 'date_format:Y-m-d'],
            'reserve_time' => ['required', 'date_format:H:i'],
            'guest_num' => ['required', 'integer', 'min:1', 'max:'.$maxGuests],
            'occasion_id' => ['nullable', 'integer', 'in:0,3,6'],
            'pmd_table_features' => ['nullable', 'array', 'max:3'],
            'pmd_table_features.*' => [
                'string',
                'distinct',
                'in:near_window,quiet_area,accessible',
            ],
            'comment' => ['nullable', 'string', 'max:1000'],
            'consent' => ['accepted'],
            'whatsapp_updates' => ['nullable'],
            '_pmd_booking_locale' => ['nullable', 'string', 'in:en,de,tr,ar'],
            '_pmd_guarantee_provider' => [
                'nullable',
                'string',
                'in:stripe,sumup,paypal,vr_payment,worldline',
            ],
            '_pmd_guarantee_method' => [
                'nullable',
                'string',
                'in:card,apple_pay,google_pay,paypal',
            ],
            '_pmd_guarantee_setup_reference' => [
                'nullable',
                'string',
                'max:8192',
            ],
            '_pmd_guarantee_setup_intent' => [
                'nullable',
                'string',
                'max:255',
            ],
            '_pmd_guarantee_terms_accepted' => ['nullable'],
        ])->validate();

        $date = Carbon::createFromFormat('Y-m-d', (string)$data['reserve_date'], $timezone)->startOfDay();
        $this->guardBookableDate($date, $timezone);

        $tablePreferences = $this->normalizePublicTablePreferences(
            $data['pmd_table_features'] ?? []
        );

        $guests = (int)$data['guest_num'];
        $time = (string)$data['reserve_time'];
        $availability = $this->availabilityPayload($location, $date, $guests);
        $slot = collect($availability['slots'])->firstWhere('value', $time);

        if (!$slot) {
            throw ValidationException::withMessages([
                'reserve_time' => ['That time is no longer available. Please choose another time.'],
            ]);
        }

        $guaranteeService = app(PmdReservationGuaranteeService::class);
        $reservationStart = Carbon::parse(
            $date->toDateString().' '.$time,
            $timezone
        );
        $bookingLocale = (string)($data['_pmd_booking_locale'] ?? 'de');
        $guaranteePolicy = $guaranteeService->policy(
            $location,
            $guests,
            $reservationStart,
            $bookingLocale
        );
        $guaranteeVerified = [
            'required' => false,
            'policy' => $guaranteePolicy,
        ];

        if (!empty($guaranteePolicy['required'])) {
            if (empty($data['_pmd_guarantee_terms_accepted'])) {
                throw ValidationException::withMessages([
                    '_pmd_guarantee_terms_accepted' => [
                        'Please accept the payment guarantee terms before confirming the reservation.',
                    ],
                ]);
            }

            if (empty($guaranteePolicy['provider_ready'])) {
                throw ValidationException::withMessages([
                    'reservation' => [
                        'Payment guarantee is temporarily unavailable. Please contact the restaurant.',
                    ],
                ]);
            }

            $guaranteeProvider = strtolower(trim((string)(
                $data['_pmd_guarantee_provider']
                ?? $guaranteePolicy['provider']
                ?? 'stripe'
            )));
            $guaranteeMethod = strtolower(trim((string)(
                $data['_pmd_guarantee_method'] ?? 'card'
            )));
            $setupReference = trim((string)(
                $data['_pmd_guarantee_setup_reference']
                ?? $data['_pmd_guarantee_setup_intent']
                ?? ''
            ));

            try {
                $guaranteeVerified = $guaranteeService->verifySetup(
                    $location,
                    $data,
                    $guaranteeProvider,
                    $guaranteeMethod,
                    $setupReference,
                    $bookingLocale
                );
            } catch (Throwable $error) {
                throw ValidationException::withMessages([
                    '_pmd_guarantee_setup_reference' => [
                        $error->getMessage(),
                    ],
                ]);
            }
        }

        $reservation = null;
        $bookingStage = 'transaction';

        try {
            $reservation = DB::transaction(function () use (
                $location,
                $date,
                $time,
                $guests,
                $data,
                $timezone,
                $availability,
                $guaranteeVerified,
                $guaranteeService,
                $tablePreferences
            ) {
                $allTableIds = $location->tables
                    ->pluck('table_id')
                    ->map(static fn ($id) => (int)$id)
                    ->filter()
                    ->values()
                    ->all();

                if ($allTableIds) {
                    DB::table('tables')
                        ->whereIn('table_id', $allTableIds)
                        ->orderBy('table_id')
                        ->lockForUpdate()
                        ->get(['table_id']);
                }

                $start = Carbon::parse($date->toDateString().' '.$time, $timezone);
                $duration = (int)$availability['duration'];
                $end = $start->copy()->addMinutes($duration);

                $activeReservations = $this->activeReservations($location, $start, $end);
                $tableIds = $this->selectTableIds(
                    $location,
                    $start,
                    $end,
                    $guests,
                    $activeReservations
                );

                if (!$tableIds) {
                    throw ValidationException::withMessages([
                        'reserve_time' => ['That time was just taken. Please choose another available time.'],
                    ]);
                }

                $statusId = (int)setting('default_reservation_status', 0);
                if ($statusId <= 0) {
                    $statusId = (int)setting('confirmed_reservation_status', 0);
                }
                if ($statusId <= 0) {
                    throw new \RuntimeException('Reservation statuses are not configured.');
                }

                $reservation = new Reservations_model;
                $reservation->skipAutoTableAllocation = true;
                $reservation->location_id = (int)$location->getKey();
                $reservation->first_name = trim((string)$data['first_name']);
                $reservation->last_name = trim((string)$data['last_name']);
                $reservation->email = strtolower(trim((string)$data['email']));
                $reservation->telephone = trim((string)$data['telephone']);
                $reservation->reserve_date = $date->toDateString();
                $reservation->reserve_time = $time;
                $reservation->guest_num = $guests;
                $reservation->duration = $duration;
                $reservation->occasion_id = (int)($data['occasion_id'] ?? 0);
                $reservation->comment = trim((string)($data['comment'] ?? ''));
                $reservation->status_id = $statusId;
                $reservation->save();

                try {
                    $this->persistPublicTablePreferences(
                        $reservation,
                        $tablePreferences
                    );
                } catch (Throwable $preferenceError) {
                    // Table preferences are optional metadata and must never
                    // make an otherwise valid reservation fail.
                    Log::warning('PMD public booking preference persistence failed', [
                        'reservation_id' => (int)$reservation->getKey(),
                        'message' => $preferenceError->getMessage(),
                    ]);
                }

                $reservation->addReservationTables($tableIds);

                try {
                    $reservation->addStatusHistory($statusId, [
                        'comment' => 'Public online booking',
                    ]);
                } catch (Throwable $historyError) {
                    Log::warning('PMD public booking status history failed', [
                        'reservation_id' => (int)$reservation->getKey(),
                        'message' => $historyError->getMessage(),
                    ]);
                }

                $guaranteeService->recordGuarantee(
                    $reservation,
                    $guaranteeVerified
                );

                return $reservation->fresh(['tables', 'status', 'location']);
            }, 3);

            $bookingStage = 'post_commit';

            $confirmedStatus = (int)setting('confirmed_reservation_status', 0);
            $isConfirmed = $confirmedStatus > 0
                && (int)$reservation->status_id === $confirmedStatus;

            $successMessages = [
                'en' => [
                    'confirmed' => 'The restaurant has confirmed your table.',
                    'received' => 'Your request was sent to the restaurant.',
                ],
                'de' => [
                    'confirmed' => 'Das Restaurant hat Ihren Tisch bestätigt.',
                    'received' => 'Ihre Anfrage wurde an das Restaurant gesendet.',
                ],
                'tr' => [
                    'confirmed' => 'Restoran masanızı onayladı.',
                    'received' => 'Talebiniz restorana gönderildi.',
                ],
                'ar' => [
                    'confirmed' => 'أكد المطعم طاولتك.',
                    'received' => 'تم إرسال طلبك إلى المطعم.',
                ],
            ];
            $successCopy = $successMessages[$bookingLocale]
                ?? $successMessages['en'];

            $this->pushReservationAdminNotification($reservation, 'created');

            $messagingService = app(PmdReservationMessagingService::class);
            $messagingService->savePreference(
                (int)$reservation->getKey(),
                !empty($data['whatsapp_updates']),
                $bookingLocale
            );
            $messagingService->notifyAfterResponse(
                $reservation,
                'created',
                $bookingLocale
            );

            $guaranteePayload = null;
            try {
                $guaranteePayload = $guaranteeService->publicGuaranteePayload(
                    (int)$reservation->getKey()
                );
            } catch (Throwable $guaranteePayloadError) {
                Log::warning('PMD public booking guarantee payload failed after commit', [
                    'reservation_id' => (int)$reservation->getKey(),
                    'message' => $guaranteePayloadError->getMessage(),
                ]);
            }

            if (
                $guaranteePayload
                && !$messagingService->guestEmailOperational()
            ) {
                // Backward-compatible fallback when the new reservation email
                // channel is not configured. R28 guest email already includes
                // the active guarantee summary, so it must not be duplicated.
                $guaranteeService->sendGuaranteeConfirmation($reservation);
            }

            return response()->json([
                'success' => true,
                'reservation_id' => (int)$reservation->getKey(),
                'reference' => 'R'.str_pad((string)$reservation->getKey(), 6, '0', STR_PAD_LEFT),
                'status' => (string)($reservation->status_name ?: ($isConfirmed ? 'Confirmed' : 'Received')),
                'confirmed' => $isConfirmed,
                'locale' => $bookingLocale,
                'message' => $isConfirmed
                    ? $successCopy['confirmed']
                    : $successCopy['received'],
                'manage_url' => url('/book').'?manage='.rawurlencode((string)$reservation->hash),
                'reservation' => [
                    'date' => $date->toDateString(),
                    'time' => $time,
                    'guests' => $guests,
                    'duration' => (int)$reservation->duration,
                    'name' => trim($reservation->first_name.' '.$reservation->last_name),
                ],
                'guarantee' => $guaranteePayload,
            ]);
        } catch (ValidationException $error) {
            if (!$reservation || !(int)$reservation->getKey()) {
                $guaranteeService->discardVerification($guaranteeVerified);
            }
            throw $error;
        } catch (Throwable $error) {
            $persistedReservationId = $reservation
                ? (int)$reservation->getKey()
                : 0;

            Log::error('PMD public booking create failed', [
                'host' => $request->getHost(),
                'location_id' => (int)$location->getKey(),
                'reservation_id' => $persistedReservationId,
                'stage' => $bookingStage,
                'message' => $error->getMessage(),
            ]);

            // Once the DB transaction committed, never tell the guest that
            // the reservation failed and never detach an already-recorded
            // guarantee merely because nonessential response work failed.
            if ($persistedReservationId > 0) {
                $fallbackMessages = [
                    'de' => 'Ihre Anfrage wurde an das Restaurant gesendet.',
                    'tr' => 'Talebiniz restorana gönderildi.',
                    'ar' => 'تم إرسال طلبك إلى المطعم.',
                    'en' => 'Your request was sent to the restaurant.',
                ];

                return response()->json([
                    'success' => true,
                    'reservation_id' => $persistedReservationId,
                    'reference' => 'R'.str_pad((string)$persistedReservationId, 6, '0', STR_PAD_LEFT),
                    'status' => (string)($reservation->status_name ?: 'Received'),
                    'confirmed' => false,
                    'locale' => $bookingLocale,
                    'message' => $fallbackMessages[$bookingLocale]
                        ?? $fallbackMessages['en'],
                    'manage_url' => url('/book').'?manage='.rawurlencode((string)$reservation->hash),
                    'reservation' => [
                        'date' => $date->toDateString(),
                        'time' => $time,
                        'guests' => $guests,
                        'duration' => (int)$reservation->duration,
                        'name' => trim($reservation->first_name.' '.$reservation->last_name),
                    ],
                    'guarantee' => null,
                ]);
            }

            $guaranteeService->discardVerification($guaranteeVerified);

            return response()->json([
                'success' => false,
                'message' => 'We could not save the reservation. Please try again or contact the restaurant.',
            ], 500);
        }
    }

    public function manageLookupPage(Request $request)
    {
        return $this->renderManagePage($request, null, null);
    }

    public function manageLookup(Request $request)
    {
        $location = $this->location();

        $data = validator($request->all(), [
            'reference' => ['required', 'string', 'max:32'],
            'email' => ['required', 'email:filter', 'max:96'],
        ])->validate();

        $reference = strtoupper(trim((string)$data['reference']));
        $reservationId = (int)preg_replace('/\D+/', '', $reference);

        $reservation = $reservationId > 0
            ? Reservations_model::query()
                ->where('location_id', (int)$location->getKey())
                ->where('reservation_id', $reservationId)
                ->whereRaw('LOWER(email) = ?', [strtolower(trim((string)$data['email']))])
                ->first()
            : null;

        if (!$reservation || trim((string)$reservation->hash) === '') {
            return $this->renderManagePage(
                $request,
                null,
                'We could not find that reservation. Check the booking reference and email address.'
            );
        }

        $languageContext = $this->languageContext($location);
        $requestedLocale = strtolower(substr((string)$request->input('lang', ''), 0, 2));
        $locale = in_array($requestedLocale, (array)$languageContext['eligible'], true)
            ? $requestedLocale
            : $this->locale($request, $languageContext);

        return redirect('/book?manage='.rawurlencode((string)$reservation->hash).'&lang='.rawurlencode($locale), 302);
    }

    public function manageShow(Request $request, string $hash)
    {
        $location = $this->location();
        $reservation = $this->reservationByPublicHash($location, $hash);

        if (!$reservation) {
            abort(404);
        }

        return $this->renderManagePage($request, $reservation, null);
    }

    public function manageAvailability(Request $request, string $hash): JsonResponse
    {
        $location = $this->location();
        $reservation = $this->reservationByPublicHash($location, $hash);

        if (!$reservation) {
            abort(404);
        }

        $maxGuests = $this->maxBookableGuests($location);
        $timezone = $this->timezone();

        $data = validator($request->all(), [
            'date' => ['required', 'date_format:Y-m-d'],
            'guests' => ['required', 'integer', 'min:1', 'max:'.$maxGuests],
        ])->validate();

        $date = Carbon::createFromFormat('Y-m-d', (string)$data['date'], $timezone)->startOfDay();
        $this->guardBookableDate($date, $timezone);

        $payload = $this->availabilityPayloadExcludingReservation(
            $location,
            $date,
            (int)$data['guests'],
            (int)$reservation->getKey()
        );

        return response()->json([
            'success' => true,
            'date' => $date->toDateString(),
            'guest_num' => (int)$data['guests'],
            'duration' => (int)$payload['duration'],
            'opening' => $payload['opening'],
            'slots' => $payload['slots'],
            'capacity_slots' => (array)($payload['capacity_slots'] ?? []),
        ]);
    }

    public function manageUpdate(Request $request, string $hash): JsonResponse
    {
        $location = $this->location();
        $reservation = $this->reservationByPublicHash($location, $hash);

        if (!$reservation) {
            abort(404);
        }

        if (!$this->reservationCanBeManaged($reservation)) {
            return response()->json([
                'success' => false,
                'message' => 'This reservation can no longer be changed online. Please contact the restaurant.',
            ], 422);
        }

        $timezone = $this->timezone();
        $maxGuests = $this->maxBookableGuests($location);
        $beforeSnapshot = $this->reservationChangeSnapshot($reservation);
        $data = validator($request->all(), [
            'first_name' => ['required', 'string', 'min:1', 'max:48'],
            'last_name' => ['required', 'string', 'min:1', 'max:48'],
            'email' => ['required', 'email:filter', 'max:96'],
            'telephone' => ['required', 'string', 'min:5', 'max:64'],
            'reserve_date' => ['required', 'date_format:Y-m-d'],
            'reserve_time' => ['required', 'date_format:H:i'],
            'guest_num' => ['required', 'integer', 'min:1', 'max:'.$maxGuests],
            'pmd_table_features' => ['nullable', 'array', 'max:3'],
            'pmd_table_features.*' => [
                'string',
                'distinct',
                'in:near_window,quiet_area,accessible',
            ],
            'comment' => ['nullable', 'string', 'max:1000'],
            'whatsapp_updates' => ['nullable'],
            '_pmd_booking_locale' => ['nullable', 'string', 'in:en,de,tr,ar'],
            '_pmd_guarantee_provider' => [
                'nullable',
                'string',
                'in:stripe,sumup,paypal,vr_payment,worldline',
            ],
            '_pmd_guarantee_method' => [
                'nullable',
                'string',
                'in:card,apple_pay,google_pay,paypal',
            ],
            '_pmd_guarantee_setup_reference' => [
                'nullable',
                'string',
                'max:8192',
            ],
            '_pmd_guarantee_setup_intent' => [
                'nullable',
                'string',
                'max:255',
            ],
            '_pmd_guarantee_terms_accepted' => ['nullable'],
        ])->validate();

        $date = Carbon::createFromFormat('Y-m-d', (string)$data['reserve_date'], $timezone)->startOfDay();
        $this->guardBookableDate($date, $timezone);
        $guests = (int)$data['guest_num'];
        $time = (string)$data['reserve_time'];
        $tablePreferences = $this->normalizePublicTablePreferences(
            $data['pmd_table_features'] ?? []
        );

        $guaranteeService = app(PmdReservationGuaranteeService::class);
        $activeGuarantee = $guaranteeService
            ->guaranteeForReservation((int)$reservation->getKey());
        $hasLiveGuarantee = $activeGuarantee
            && in_array(
                (string)$activeGuarantee->status,
                ['active', 'charge_failed', 'action_required'],
                true
            );

        if (
            $hasLiveGuarantee
            && (
                (string)($beforeSnapshot['date'] ?? '') !== $date->toDateString()
                || (string)($beforeSnapshot['time'] ?? '') !== $time
                || (int)($beforeSnapshot['guests'] ?? 0) !== $guests
                || (string)($beforeSnapshot['first_name'] ?? '') !== trim((string)$data['first_name'])
                || (string)($beforeSnapshot['last_name'] ?? '') !== trim((string)$data['last_name'])
                || (string)($beforeSnapshot['email'] ?? '') !== strtolower(trim((string)$data['email']))
            )
        ) {
            throw ValidationException::withMessages([
                'reservation' => [
                    'This reservation has an active card guarantee. Date, time, party size, guest name or email can only be changed after the restaurant reconfirms the guarantee terms. Please contact the restaurant.',
                ],
            ]);
        }

        $bookingLocale = (string)($data['_pmd_booking_locale'] ?? 'de');
        $reservationStart = Carbon::parse(
            $date->toDateString().' '.$time,
            $timezone
        );
        $guaranteePolicy = $guaranteeService->policy(
            $location,
            $guests,
            $reservationStart,
            $bookingLocale
        );
        $guaranteeVerified = [
            'required' => false,
            'policy' => $guaranteePolicy,
        ];

        // PMD_MANAGE_GUARANTEE_THRESHOLD_R27
        // An old booking may have been created below the no-show threshold.
        // If an edit now crosses the configured threshold, it must complete the
        // same payment-method guarantee contract as a brand-new reservation.
        if (!$hasLiveGuarantee && !empty($guaranteePolicy['required'])) {
            if (empty($data['_pmd_guarantee_terms_accepted'])) {
                throw ValidationException::withMessages([
                    '_pmd_guarantee_terms_accepted' => [
                        'Please accept the payment guarantee terms before saving this reservation.',
                    ],
                ]);
            }

            if (empty($guaranteePolicy['provider_ready'])) {
                throw ValidationException::withMessages([
                    'reservation' => [
                        'Payment guarantee is temporarily unavailable. Please contact the restaurant.',
                    ],
                ]);
            }

            $guaranteeProvider = strtolower(trim((string)(
                $data['_pmd_guarantee_provider']
                ?? $guaranteePolicy['provider']
                ?? 'stripe'
            )));
            $guaranteeMethod = strtolower(trim((string)(
                $data['_pmd_guarantee_method'] ?? 'card'
            )));
            $setupReference = trim((string)(
                $data['_pmd_guarantee_setup_reference']
                ?? $data['_pmd_guarantee_setup_intent']
                ?? ''
            ));

            try {
                $guaranteeVerified = $guaranteeService->verifySetup(
                    $location,
                    $data,
                    $guaranteeProvider,
                    $guaranteeMethod,
                    $setupReference,
                    $bookingLocale
                );
            } catch (Throwable $error) {
                throw ValidationException::withMessages([
                    '_pmd_guarantee_setup_reference' => [
                        $error->getMessage(),
                    ],
                ]);
            }
        }

        $preflight = $this->availabilityPayloadExcludingReservation(
            $location,
            $date,
            $guests,
            (int)$reservation->getKey()
        );

        if (!collect($preflight['slots'])->firstWhere('value', $time)) {
            $guaranteeService->discardVerification($guaranteeVerified);
            throw ValidationException::withMessages([
                'reserve_time' => ['That time is no longer available. Please choose another time.'],
            ]);
        }

        $updatedReservation = null;
        $updateCommitted = false;

        try {
            $updated = DB::transaction(function () use ($location, $reservation, $hash, $date, $time, $guests, $data, $timezone, $preflight, $beforeSnapshot, $guaranteeService, $guaranteeVerified, $tablePreferences) {
                $allTableIds = $location->tables
                    ->pluck('table_id')
                    ->map(static fn ($id) => (int)$id)
                    ->filter()
                    ->values()
                    ->all();

                if ($allTableIds) {
                    DB::table('tables')
                        ->whereIn('table_id', $allTableIds)
                        ->orderBy('table_id')
                        ->lockForUpdate()
                        ->get(['table_id']);
                }

                $locked = Reservations_model::query()
                    ->where('location_id', (int)$location->getKey())
                    ->where('reservation_id', (int)$reservation->getKey())
                    ->where('hash', $hash)
                    ->lockForUpdate()
                    ->first();

                if (!$locked) {
                    abort(404);
                }

                if (!$this->reservationCanBeManaged($locked)) {
                    throw ValidationException::withMessages([
                        'reservation' => ['This reservation can no longer be changed online.'],
                    ]);
                }

                $start = Carbon::parse($date->toDateString().' '.$time, $timezone);
                $duration = (int)$preflight['duration'];
                $end = $start->copy()->addMinutes($duration);
                $active = $this->activeReservations($location, $start, $end)
                    ->reject(static fn ($item) => (int)$item->getKey() === (int)$locked->getKey())
                    ->values();

                $tableIds = $this->selectTableIds($location, $start, $end, $guests, $active);
                if (!$tableIds) {
                    throw ValidationException::withMessages([
                        'reserve_time' => ['That time was just taken. Please choose another available time.'],
                    ]);
                }

                $locked->skipAutoTableAllocation = true;
                $locked->first_name = trim((string)$data['first_name']);
                $locked->last_name = trim((string)$data['last_name']);
                $locked->email = strtolower(trim((string)$data['email']));
                $locked->telephone = trim((string)$data['telephone']);
                $locked->reserve_date = $date->toDateString();
                $locked->reserve_time = $time;
                $locked->guest_num = $guests;
                $locked->duration = $duration;
                // PMD_MANAGE_TABLE_PREFERENCES_R28
                $locked->occasion_id = 0;
                $locked->comment = trim((string)($data['comment'] ?? ''));
                $locked->save();
                $locked->addReservationTables($tableIds);
                $this->persistPublicTablePreferences(
                    $locked,
                    $tablePreferences
                );

                $guaranteeService->recordGuarantee(
                    $locked,
                    $guaranteeVerified
                );

                $fresh = $locked->fresh(['tables', 'status', 'location']);
                $changes = $this->reservationChangeList($beforeSnapshot, $fresh);
                $historyComment = 'Updated by guest via public booking manager';
                if ($changes) {
                    $historyComment .= ': '.implode('; ', $changes);
                }

                try {
                    $fresh->addStatusHistory((int)$fresh->status_id, [
                        'comment' => $historyComment,
                    ]);
                } catch (Throwable $historyError) {
                    Log::warning('PMD public booking update history failed', [
                        'reservation_id' => (int)$fresh->getKey(),
                        'message' => $historyError->getMessage(),
                    ]);
                }

                return [
                    'reservation' => $fresh,
                    'changes' => $changes,
                ];
            }, 3);

            $updatedReservation = $updated['reservation'];
            $updateCommitted = true;
            $changes = (array)($updated['changes'] ?? []);
            $this->pushReservationAdminNotification($updatedReservation, 'updated', $changes);

            $messagingService = app(PmdReservationMessagingService::class);
            $messagingService->savePreference(
                (int)$updatedReservation->getKey(),
                !empty($data['whatsapp_updates']),
                $bookingLocale
            );
            $messagingService->notifyAfterResponse(
                $updatedReservation,
                'updated',
                $bookingLocale,
                $changes
            );

            if (
                !empty($guaranteeVerified['required'])
                && !$messagingService->guestEmailOperational()
            ) {
                $guaranteeService->sendGuaranteeConfirmation(
                    $updatedReservation
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Your reservation has been updated.',
                'reservation' => $this->publicReservationPayload($updatedReservation),
                'changes' => $changes,
            ]);
        } catch (ValidationException $error) {
            if (!$updateCommitted) {
                $guaranteeService->discardVerification($guaranteeVerified);
            }
            throw $error;
        } catch (Throwable $error) {
            Log::error('PMD public booking update failed', [
                'reservation_id' => (int)$reservation->getKey(),
                'committed' => $updateCommitted,
                'message' => $error->getMessage(),
            ]);

            // Match new-booking semantics: once the reservation transaction
            // committed, never report a false failure merely because optional
            // response/notification work failed afterward.
            if ($updateCommitted && $updatedReservation) {
                return response()->json([
                    'success' => true,
                    'message' => 'Your reservation has been updated.',
                    'reservation' => [
                        'id' => (int)$updatedReservation->getKey(),
                        'reference' => 'R'.str_pad((string)$updatedReservation->getKey(), 6, '0', STR_PAD_LEFT),
                        'hash' => (string)$updatedReservation->hash,
                        'date' => $date->toDateString(),
                        'time' => $time,
                        'guests' => $guests,
                        'duration' => (int)$updatedReservation->duration,
                        'first_name' => (string)$updatedReservation->first_name,
                        'last_name' => (string)$updatedReservation->last_name,
                        'email' => (string)$updatedReservation->email,
                        'telephone' => (string)$updatedReservation->telephone,
                        'occasion_id' => (int)$updatedReservation->occasion_id,
                        'table_preferences' => $this->publicTablePreferences(
                            (int)$updatedReservation->getKey()
                        ),
                        'comment' => (string)$updatedReservation->comment,
                        'canceled' => false,
                        'can_manage' => true,
                        'can_cancel' => $this->reservationCanBeCanceledOnline($updatedReservation),
                        'guarantee' => null,
                    ],
                    'changes' => [],
                ]);
            }

            $guaranteeService->discardVerification($guaranteeVerified);

            return response()->json([
                'success' => false,
                'message' => 'We could not update the reservation. Please try again or contact the restaurant.',
            ], 500);
        }
    }

    public function manageCancel(Request $request, string $hash): JsonResponse
    {
        $location = $this->location();
        $reservation = $this->reservationByPublicHash($location, $hash);

        if (!$reservation) {
            abort(404);
        }

        if ($reservation->isCanceled()) {
            app(PmdReservationGuaranteeService::class)
                ->releaseGuarantee($reservation, 'already_canceled');

            return response()->json([
                'success' => true,
                'canceled' => true,
                'message' => 'This reservation is already canceled.',
            ]);
        }

        if (!$this->reservationCanBeCanceledOnline($reservation)) {
            return response()->json([
                'success' => false,
                'message' => 'This reservation can no longer be canceled online. Please contact the restaurant.',
            ], 422);
        }

        try {
            $ok = DB::transaction(function () use ($location, $reservation, $hash) {
                $locked = Reservations_model::query()
                    ->where('location_id', (int)$location->getKey())
                    ->where('reservation_id', (int)$reservation->getKey())
                    ->where('hash', $hash)
                    ->lockForUpdate()
                    ->first();

                if (!$locked) {
                    abort(404);
                }

                if ($locked->isCanceled()) {
                    return true;
                }

                if (!$this->reservationCanBeCanceledOnline($locked)) {
                    throw ValidationException::withMessages([
                        'reservation' => ['This reservation can no longer be canceled online.'],
                    ]);
                }

                return $locked->markAsCanceled([
                    'comment' => 'Canceled by guest via public booking manager',
                ]);
            }, 3);

            if (!$ok) {
                throw new \RuntimeException('Cancellation could not be recorded.');
            }

            $canceledReservation = $this->reservationByPublicHash($location, $hash);
            if ($canceledReservation) {
                app(PmdReservationGuaranteeService::class)
                    ->releaseGuarantee(
                        $canceledReservation,
                        'guest_canceled_before_deadline'
                    );
                $this->pushReservationAdminNotification($canceledReservation, 'canceled');

                $messagingService = app(PmdReservationMessagingService::class);
                $preference = $messagingService->preferenceForReservation(
                    (int)$canceledReservation->getKey()
                );
                $messagingService->notifyAfterResponse(
                    $canceledReservation,
                    'canceled',
                    (string)($preference['locale'] ?? 'de')
                );
            }

            return response()->json([
                'success' => true,
                'canceled' => true,
                'message' => 'Your reservation has been canceled.',
            ]);
        } catch (ValidationException $error) {
            throw $error;
        } catch (Throwable $error) {
            Log::error('PMD public booking cancel failed', [
                'reservation_id' => (int)$reservation->getKey(),
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'We could not cancel the reservation. Please contact the restaurant.',
            ], 500);
        }
    }

    private function renderManagePage(Request $request, ?Reservations_model $reservation, ?string $lookupError)
    {
        $location = $this->location();
        $languageContext = $this->languageContext($location);
        $locale = $this->locale($request, $languageContext);
        $timezone = $this->timezone();
        $today = Carbon::now($timezone)->startOfDay();

        $guaranteeService = app(PmdReservationGuaranteeService::class);
        $guaranteeByLocale = [];
        foreach ((array)$languageContext['eligible'] as $guaranteeLocale) {
            $guaranteeByLocale[$guaranteeLocale] = $guaranteeService
                ->publicConfig($location, (string)$guaranteeLocale);
        }

        $reservationPayload = null;
        $initialAvailability = null;
        if ($reservation) {
            $reservation->loadMissing(['tables', 'status', 'location']);
            $reservationPayload = $this->publicReservationPayload($reservation);

            if (!$reservation->isCanceled() && $reservation->reservation_datetime->isFuture()) {
                $reservationDate = Carbon::parse($reservationPayload['date'], $timezone)->startOfDay();
                $initialAvailability = $this->availabilityPayloadExcludingReservation(
                    $location,
                    $reservationDate,
                    (int)$reservation->guest_num,
                    (int)$reservation->getKey()
                );
            }
        }

        $html = view()->file(
            base_path('resources/views/pmd/public-booking-manage.blade.php'),
            [
                'bookingProfile' => $this->profile($location),
                'bookingLocale' => $locale,
                'bookingLocaleTag' => $languageContext['locale_tags'][$locale] ?? $this->defaultLocaleTag($locale),
                'bookingDirection' => $this->localeDirection($locale),
                'bookingLanguages' => $languageContext['eligible'],
                'bookingTimezone' => $timezone,
                'bookingToday' => $today->toDateString(),
                'bookingMaxDate' => $today->copy()->addDays(self::MAX_BOOKING_DAYS)->toDateString(),
                'bookingMaxGuests' => $this->maxBookableGuests($location),
                'bookingStayMinutes' => $this->stayMinutes($location),
                'bookingTableRules' => $this->tableRules($location),
                'bookingGuarantee' => $guaranteeByLocale[$locale]
                    ?? $guaranteeService->publicConfig($location, $locale),
                'bookingGuaranteeByLocale' => $guaranteeByLocale,
                'bookingMessagingPreference' => $reservation
                    ? app(PmdReservationMessagingService::class)
                        ->preferenceForReservation((int)$reservation->getKey())
                    : ['whatsapp_opt_in' => false, 'locale' => $locale],
                'reservation' => $reservation,
                'reservationPayload' => $reservationPayload,
                'initialAvailability' => $initialAvailability,
                'lookupError' => $lookupError,
                'canManage' => $reservation ? $this->reservationCanBeManaged($reservation) : false,
                'canCancel' => $reservation
                    ? (!$reservation->isCanceled() && $this->reservationCanBeCanceledOnline($reservation))
                    : false,
            ]
        )->render();

        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'private, no-store, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    private function reservationByPublicHash(Locations_model $location, string $hash): ?Reservations_model
    {
        if (!preg_match('/^[a-f0-9]{32}$/i', $hash)) {
            return null;
        }

        return Reservations_model::query()
            ->with(['tables', 'status', 'location'])
            ->where('location_id', (int)$location->getKey())
            ->where('hash', strtolower($hash))
            ->first();
    }

    private function reservationCanBeManaged(Reservations_model $reservation): bool
    {
        if ($reservation->isCanceled()) {
            return false;
        }

        try {
            if (!$reservation->reservation_datetime->isFuture()) {
                return false;
            }
        } catch (Throwable $error) {
            return false;
        }

        return true;
    }

    private function publicReservationPayload(Reservations_model $reservation): array
    {
        $dateValue = $reservation->reserve_date;
        $timeValue = $reservation->reserve_time;

        return [
            'id' => (int)$reservation->getKey(),
            'reference' => 'R'.str_pad((string)$reservation->getKey(), 6, '0', STR_PAD_LEFT),
            'hash' => (string)$reservation->hash,
            'date' => $dateValue instanceof DateTimeInterface
                ? $dateValue->format('Y-m-d')
                : substr((string)$dateValue, 0, 10),
            'time' => $timeValue instanceof DateTimeInterface
                ? $timeValue->format('H:i')
                : substr((string)$timeValue, 0, 5),
            'guests' => (int)$reservation->guest_num,
            'duration' => (int)$reservation->duration,
            'first_name' => (string)$reservation->first_name,
            'last_name' => (string)$reservation->last_name,
            'email' => (string)$reservation->email,
            'telephone' => (string)$reservation->telephone,
            'occasion_id' => (int)$reservation->occasion_id,
            'table_preferences' => $this->publicTablePreferences(
                (int)$reservation->getKey()
            ),
            'comment' => (string)$reservation->comment,
            'canceled' => $reservation->isCanceled(),
            'can_manage' => $this->reservationCanBeManaged($reservation),
            'can_cancel' => !$reservation->isCanceled() && $this->reservationCanBeCanceledOnline($reservation),
            'guarantee' => app(PmdReservationGuaranteeService::class)
                ->publicGuaranteePayload((int)$reservation->getKey()),
        ];
    }

    private function reservationCanBeCanceledOnline(
        Reservations_model $reservation
    ): bool {
        try {
            if ($reservation->isCanceled() || !$reservation->reservation_datetime->isFuture()) {
                return false;
            }
        } catch (Throwable $error) {
            return false;
        }

        $guaranteeDecision = app(PmdReservationGuaranteeService::class)
            ->canGuestCancel($reservation);

        if ($guaranteeDecision !== null) {
            return $guaranteeDecision;
        }

        // PMD_PUBLIC_BOOKING_CANCEL_FALLBACK_R20_1
        // TastyIgniter's legacy Reservations_model::isCancelable() treats an
        // empty/zero location cancellation timeout as "online cancellation
        // disabled". For PayMyDine public reservations that makes a normal
        // future booking impossible to cancel. Preserve an explicitly
        // configured timeout, but interpret no timeout as cancellable until
        // the reservation starts.
        try {
            $timeout = (int)$reservation->location
                ->getReservationCancellationTimeout();

            if ($timeout > 0) {
                return $reservation->reservation_datetime
                    ->diffInRealMinutes() > $timeout;
            }
        } catch (Throwable $error) {
            // Fall through to the safe future-reservation default below.
        }

        return true;
    }

    private function availabilityPayloadExcludingReservation(
        Locations_model $location,
        Carbon $date,
        int $guests,
        int $excludeReservationId
    ): array {
        $opening = $this->hoursForDate($location, $date);
        $duration = $this->stayMinutes($location);
        $interval = $this->slotInterval($location);

        if (!$opening['enabled'] || !$opening['opening_time'] || !$opening['closing_time']) {
            return [
                'opening' => $opening,
                'duration' => $duration,
                'interval' => $interval,
                'slots' => [],
                'capacity_slots' => [],
            ];
        }

        $timezone = $this->timezone();
        $opensAt = Carbon::parse($date->toDateString().' '.$opening['opening_time'], $timezone);
        $closesAt = Carbon::parse($date->toDateString().' '.$opening['closing_time'], $timezone);
        if ($closesAt->lessThanOrEqualTo($opensAt)) {
            $closesAt->addDay();
        }

        $active = $this->activeReservations($location, $opensAt, $closesAt)
            ->reject(static fn ($item) => (int)$item->getKey() === $excludeReservationId)
            ->values();

        return $this->availabilityPayload(
            $location,
            $date,
            $guests,
            $opening,
            $duration,
            $interval,
            $active
        );
    }

    private function reservationChangeSnapshot(Reservations_model $reservation): array
    {
        $date = $reservation->reserve_date;
        $time = $reservation->reserve_time;

        return [
            'date' => $date instanceof DateTimeInterface
                ? $date->format('Y-m-d')
                : substr((string)$date, 0, 10),
            'time' => $time instanceof DateTimeInterface
                ? $time->format('H:i')
                : substr((string)$time, 0, 5),
            'guests' => (int)$reservation->guest_num,
            'first_name' => trim((string)$reservation->first_name),
            'last_name' => trim((string)$reservation->last_name),
            'email' => strtolower(trim((string)$reservation->email)),
            'telephone' => trim((string)$reservation->telephone),
            'table_preferences' => implode(
                ',',
                $this->publicTablePreferences((int)$reservation->getKey())
            ),
            'comment' => trim((string)$reservation->comment),
        ];
    }

    private function reservationChangeList(array $before, Reservations_model $reservation): array
    {
        $after = $this->reservationChangeSnapshot($reservation);
        $labels = [
            'date' => 'date',
            'time' => 'time',
            'guests' => 'party size',
            'first_name' => 'first name',
            'last_name' => 'last name',
            'email' => 'email',
            'telephone' => 'phone',
            'table_preferences' => 'table preferences',
            'comment' => 'notes',
        ];

        $changes = [];
        foreach ($labels as $key => $label) {
            $old = (string)($before[$key] ?? '');
            $new = (string)($after[$key] ?? '');
            if ($old === $new) {
                continue;
            }

            if (in_array($key, ['comment', 'table_preferences'], true)) {
                $changes[] = $label.' changed';
                continue;
            }

            $changes[] = $label.' '.$old.' -> '.$new;
        }

        return $changes;
    }

    private function pushReservationAdminNotification(
        Reservations_model $reservation,
        string $action,
        array $changes = []
    ): void {
        try {
            if (!Schema::hasTable('notifications')) {
                return;
            }

            $reservation->loadMissing(['tables', 'status', 'location']);
            $id = (int)$reservation->getKey();
            $reference = 'R'.str_pad((string)$id, 6, '0', STR_PAD_LEFT);
            $name = trim((string)$reservation->first_name.' '.(string)$reservation->last_name);
            $table = $reservation->tables ? $reservation->tables->first() : null;

            $date = $reservation->reserve_date instanceof DateTimeInterface
                ? $reservation->reserve_date->format('Y-m-d')
                : substr((string)$reservation->reserve_date, 0, 10);
            $time = $reservation->reserve_time instanceof DateTimeInterface
                ? $reservation->reserve_time->format('H:i')
                : substr((string)$reservation->reserve_time, 0, 5);

            $types = [
                'created' => 'reservation_created',
                'updated' => 'reservation_updated',
                'canceled' => 'reservation_canceled',
            ];
            $verbs = [
                'created' => 'New online reservation',
                'updated' => 'Reservation updated by guest',
                'canceled' => 'Reservation canceled by guest',
            ];

            $type = $types[$action] ?? 'reservation_updated';
            $verb = $verbs[$action] ?? 'Reservation changed';
            $message = $verb.' · '.$reference;
            if ($name !== '') {
                $message .= ' · '.$name;
            }
            $message .= ' · '.$date.' '.$time.' · '.(int)$reservation->guest_num.' guests';

            if ($changes) {
                $message .= ' · '.implode(', ', array_slice($changes, 0, 3));
            }

            $priority = $action === 'canceled' ? 'high' : 'medium';
            $payload = [
                'reservation_id' => $id,
                'reference' => $reference,
                'action' => $action,
                'customer_name' => $name,
                'date' => $date,
                'time' => $time,
                'guests' => (int)$reservation->guest_num,
                'status_id' => (int)$reservation->status_id,
                'status_name' => (string)($reservation->status_name ?? ''),
                'changes' => array_values($changes),
                'source' => 'public_booking',
                'message' => $message,
                'priority' => $priority,
                'admin_reservations_url' => '/admin/reservations?pmd_mode=edit&pmd_id='.$id,
                'pos_reservations_url' => '/admin/pos?workspace=reservations',
            ];

            $notification = [
                'type' => $type,
                'title' => $verb,
                'table_id' => $table ? (int)$table->table_id : null,
                'table_name' => $table ? (string)$table->table_name : null,
                'payload' => json_encode(
                    $payload,
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                ),
                'status' => 'new',
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // PMD_NOTIFICATION_SCHEMA_COMPAT_R26
            // Production tenants still use the legacy notification table on
            // which message/priority may not exist. Keep rich copy in payload,
            // and write optional columns only when that tenant actually has them.
            if (Schema::hasColumn('notifications', 'message')) {
                $notification['message'] = $message;
            }
            if (Schema::hasColumn('notifications', 'priority')) {
                $notification['priority'] = $priority;
            }

            DB::table('notifications')->insert($notification);
        } catch (Throwable $error) {
            Log::warning('PMD public booking admin notification failed', [
                'reservation_id' => (int)$reservation->getKey(),
                'action' => $action,
                'message' => $error->getMessage(),
            ]);
        }
    }

    private function location(): Locations_model
    {
        $location = Locations_model::getDefault();

        if (!$location || !$location->exists || !$location->location_status) {
            abort(404);
        }

        $location->loadMissing(['tables', 'country']);

        return $location;
    }

    private function availabilityTablePayload(
        Locations_model $location,
        Carbon $date,
        int $guests,
        array $opening,
        int $duration,
        int $interval,
        Collection $activeReservations
    ): array {
        if (!$opening['enabled'] || !$opening['opening_time'] || !$opening['closing_time']) {
            return [
                'opening' => $opening,
                'duration' => $duration,
                'interval' => $interval,
                'slots' => [],
                'capacity_slots' => [],
            ];
        }

        $timezone = $this->timezone();
        $opensAt = Carbon::parse($date->toDateString().' '.$opening['opening_time'], $timezone);
        $closesAt = Carbon::parse($date->toDateString().' '.$opening['closing_time'], $timezone);
        if ($closesAt->lessThanOrEqualTo($opensAt)) {
            $closesAt->addDay();
        }

        $lastStart = $closesAt->copy()->subMinutes($duration);
        if ($lastStart->lessThan($opensAt)) {
            return [
                'opening' => $opening,
                'duration' => $duration,
                'interval' => $interval,
                'slots' => [],
                'capacity_slots' => [],
            ];
        }

        $now = Carbon::now($timezone);
        $slots = [];
        $capacitySlots = [];

        for ($cursor = $opensAt->copy(); $cursor->lessThanOrEqualTo($lastStart); $cursor->addMinutes($interval)) {
            if ($cursor->lessThanOrEqualTo($now)) {
                continue;
            }

            $slotEnd = $cursor->copy()->addMinutes($duration);
            $tables = $this->availableTablesForWindow(
                $location,
                $activeReservations,
                $cursor,
                $slotEnd
            );

            if ($tables->isEmpty()) {
                continue;
            }

            $tableIds = $tables
                ->pluck('table_id')
                ->map(static fn ($id) => (int)$id)
                ->filter()
                ->values()
                ->all();

            $slot = [
                'value' => $cursor->format('H:i'),
                'label' => $cursor->format('H:i'),
                'period' => ((int)$cursor->format('H') < 16) ? 'day' : 'evening',
                'table_ids' => $tableIds,
            ];

            $capacitySlots[] = $slot;

            if ($this->selectTableIdsFromAvailableTables($tables, $guests)) {
                $slots[] = $slot;
            }
        }

        return [
            'opening' => $opening,
            'duration' => $duration,
            'interval' => $interval,
            'slots' => $slots,
            'capacity_slots' => $capacitySlots,
        ];
    }

    private function publicTablePreferences(int $reservationId): array
    {
        if (
            $reservationId < 1
            || !Schema::hasTable('pmd_reservation_preferences')
        ) {
            return [];
        }

        try {
            $raw = DB::table('pmd_reservation_preferences')
                ->where('reservation_id', $reservationId)
                ->value('table_features');

            if (!is_string($raw) || trim($raw) === '') {
                return [];
            }

            $decoded = json_decode($raw, true);

            return $this->normalizePublicTablePreferences(
                is_array($decoded) ? $decoded : []
            );
        } catch (Throwable $error) {
            Log::warning('PMD public booking preference read failed', [
                'reservation_id' => $reservationId,
                'message' => $error->getMessage(),
            ]);

            return [];
        }
    }

    private function normalizePublicTablePreferences($features): array
    {
        $allowed = ['near_window', 'quiet_area', 'accessible'];

        return collect((array)$features)
            ->map(static fn ($feature): string => strtolower(trim((string)$feature)))
            ->filter(static fn (string $feature): bool => in_array(
                $feature,
                $allowed,
                true
            ))
            ->unique()
            ->values()
            ->all();
    }

    private function persistPublicTablePreferences(
        Reservations_model $reservation,
        array $features
    ): void {
        if (!Schema::hasTable('pmd_reservation_preferences')) {
            Log::warning(
                'PMD public booking preference table is unavailable',
                ['reservation_id' => (int)$reservation->getKey()]
            );
            return;
        }

        $reservationId = (int)$reservation->getKey();
        if ($reservationId <= 0) {
            return;
        }

        $features = $this->normalizePublicTablePreferences($features);
        $query = DB::table('pmd_reservation_preferences')
            ->where('reservation_id', $reservationId);

        if (!$features) {
            $query->delete();
            return;
        }

        $encoded = json_encode(
            $features,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        );

        if (!is_string($encoded)) {
            throw new \RuntimeException(
                'Unable to encode reservation table preferences.'
            );
        }

        DB::table('pmd_reservation_preferences')->updateOrInsert(
            ['reservation_id' => $reservationId],
            ['table_features' => $encoded]
        );
    }

    private function tableRules(Locations_model $location): array
    {
        $rules = [];

        foreach ($location->tables as $table) {
            if (!(bool)$table->table_status) {
                continue;
            }

            $tableId = (int)$table->table_id;
            if ($tableId <= 0) {
                continue;
            }

            $min = max(1, (int)$table->min_capacity);
            $max = max($min, (int)$table->max_capacity);

            $rules[(string)$tableId] = [
                'min' => $min,
                'max' => $max,
                'joinable' => (bool)$table->is_joinable,
            ];
        }

        return $rules;
    }

    private function availabilityPayload(
        Locations_model $location,
        Carbon $date,
        int $guests,
        ?array $openingOverride = null,
        ?int $durationOverride = null,
        ?int $intervalOverride = null,
        ?Collection $activeReservationsOverride = null
    ): array {
        $opening = $openingOverride ?? $this->hoursForDate($location, $date);
        $duration = $durationOverride ?? $this->stayMinutes($location);
        $interval = $intervalOverride ?? $this->slotInterval($location);

        if (!$opening['enabled'] || !$opening['opening_time'] || !$opening['closing_time']) {
            return [
                'opening' => $opening,
                'duration' => $duration,
                'interval' => $interval,
                'slots' => [],
                'capacity_slots' => [],
            ];
        }

        $timezone = $this->timezone();
        $opensAt = Carbon::parse(
            $date->toDateString().' '.$opening['opening_time'],
            $timezone
        );
        $closesAt = Carbon::parse(
            $date->toDateString().' '.$opening['closing_time'],
            $timezone
        );
        if ($closesAt->lessThanOrEqualTo($opensAt)) {
            $closesAt->addDay();
        }

        $activeReservations = $activeReservationsOverride
            ?? $this->activeReservations($location, $opensAt, $closesAt);

        // PMD_PUBLIC_BOOKING_ZERO_WAIT_R27
        // Always return the full free-table capacity map. The browser can then
        // recalculate every party-size change locally without another request.
        return $this->availabilityTablePayload(
            $location,
            $date,
            $guests,
            $opening,
            $duration,
            $interval,
            $activeReservations
        );
    }

    private function activeReservations(Locations_model $location, Carbon $windowStart, Carbon $windowEnd): Collection
    {
        $query = Reservations_model::query()
            ->with(['tables'])
            ->where('location_id', (int)$location->getKey())
            ->whereBetween('reserve_date', [
                $windowStart->copy()->subDay()->toDateString(),
                $windowEnd->copy()->addDay()->toDateString(),
            ])
            ->where('status_id', '>', 0);

        $canceledStatus = (int)setting('canceled_reservation_status', 0);
        if ($canceledStatus > 0) {
            $query->where('status_id', '!=', $canceledStatus);
        }

        return $query->orderBy('reserve_date')->orderBy('reserve_time')->get();
    }

    private function selectTableIds(
        Locations_model $location,
        Carbon $start,
        Carbon $end,
        int $guests,
        Collection $activeReservations
    ): array {
        return $this->selectTableIdsFromAvailableTables(
            $this->availableTablesForWindow(
                $location,
                $activeReservations,
                $start,
                $end
            ),
            $guests
        );
    }

    private function availableTablesForWindow(
        Locations_model $location,
        Collection $activeReservations,
        Carbon $start,
        Carbon $end
    ): Collection {
        $blocked = $this->blockedTableIds($location, $activeReservations, $start, $end);

        return $location->tables
            ->filter(static function ($table) use ($blocked) {
                return (bool)$table->table_status
                    && !isset($blocked[(int)$table->table_id]);
            })
            ->sortBy(static function ($table) {
                return sprintf(
                    '%08d:%08d:%08d',
                    (int)($table->priority ?? 0),
                    (int)($table->max_capacity ?? 0),
                    (int)($table->table_id ?? 0)
                );
            })
            ->values();
    }

    private function selectTableIdsFromAvailableTables(Collection $tables, int $guests): array
    {
        foreach ($tables as $table) {
            $min = max(1, (int)$table->min_capacity);
            $max = max($min, (int)$table->max_capacity);

            if ($guests >= $min && $guests <= $max) {
                return [(int)$table->table_id];
            }
        }

        $selected = [];
        $remaining = $guests;

        foreach ($tables as $table) {
            if (!(bool)$table->is_joinable) {
                continue;
            }

            $min = max(1, (int)$table->min_capacity);
            $max = max($min, (int)$table->max_capacity);

            if ($remaining < $min) {
                continue;
            }

            $selected[] = (int)$table->table_id;
            $remaining -= $max;

            if ($remaining <= 0) {
                return $selected;
            }
        }

        return [];
    }

    private function blockedTableIds(
        Locations_model $location,
        Collection $reservations,
        Carbon $start,
        Carbon $end
    ): array {
        $blocked = [];

        foreach ($reservations as $reservation) {
            $reservationStart = $this->reservationStart($reservation);
            if (!$reservationStart) {
                continue;
            }

            $duration = (int)$reservation->duration;
            if ($duration <= 0) {
                $duration = $this->stayMinutes($location);
            }

            $reservationEnd = $reservationStart->copy()->addMinutes($duration);
            $overlaps = $start->lessThan($reservationEnd) && $end->greaterThan($reservationStart);

            if (!$overlaps) {
                continue;
            }

            foreach ((array)$reservation->tables->pluck('table_id')->all() as $tableId) {
                $tableId = (int)$tableId;
                if ($tableId > 0) {
                    $blocked[$tableId] = true;
                }
            }
        }

        return $blocked;
    }

    private function reservationStart($reservation): ?Carbon
    {
        try {
            $dateValue = $reservation->reserve_date;
            $timeValue = $reservation->reserve_time;

            $date = $dateValue instanceof DateTimeInterface
                ? $dateValue->format('Y-m-d')
                : substr((string)$dateValue, 0, 10);

            $time = $timeValue instanceof DateTimeInterface
                ? $timeValue->format('H:i:s')
                : substr((string)$timeValue, 0, 8);

            if ($date === '' || $time === '') {
                return null;
            }

            return Carbon::parse($date.' '.$time, $this->timezone());
        } catch (Throwable $error) {
            return null;
        }
    }

    private function openingHours(Locations_model $location): array
    {
        $hours = [];
        foreach (range(0, 6) as $weekday) {
            $hours[$weekday] = [
                'weekday' => $weekday,
                'enabled' => false,
                'opening_time' => null,
                'closing_time' => null,
            ];
        }

        try {
            if (!Schema::hasTable('working_hours')) {
                return array_values($hours);
            }

            $rows = DB::table('working_hours')
                ->where('location_id', (int)$location->getKey())
                ->where('type', 'opening')
                ->orderBy('weekday')
                ->get();

            foreach ($rows as $row) {
                $weekday = (int)$row->weekday;
                if (!array_key_exists($weekday, $hours)) {
                    continue;
                }

                $hours[$weekday] = [
                    'weekday' => $weekday,
                    'enabled' => (bool)$row->status,
                    'opening_time' => substr((string)$row->opening_time, 0, 5),
                    'closing_time' => substr((string)$row->closing_time, 0, 5),
                ];
            }
        } catch (Throwable $error) {
            Log::warning('PMD public booking opening-hours read failed', [
                'location_id' => (int)$location->getKey(),
                'message' => $error->getMessage(),
            ]);
        }

        return array_values($hours);
    }

    private function hoursForDate(Locations_model $location, Carbon $date): array
    {
        $hours = $this->openingHours($location);
        $weekday = max(0, min(6, ((int)$date->isoWeekday()) - 1));

        return $hours[$weekday] ?? [
            'weekday' => $weekday,
            'enabled' => false,
            'opening_time' => null,
            'closing_time' => null,
        ];
    }

    private function slotInterval(Locations_model $location): int
    {
        $interval = (int)$location->reservation_time_interval;
        if ($interval <= 0) {
            $interval = self::DEFAULT_SLOT_MINUTES;
        }

        return max(15, min(120, $interval));
    }

    private function stayMinutes(Locations_model $location): int
    {
        $minutes = 0;

        try {
            if (method_exists($location, 'getReservationStayTime')) {
                $minutes = (int)$location->getReservationStayTime();
            }
        } catch (Throwable $error) {
            $minutes = 0;
        }

        if ($minutes <= 0) {
            try {
                $minutes = (int)$location->getOption('reservation_lead_time', self::DEFAULT_STAY_MINUTES);
            } catch (Throwable $error) {
                $minutes = self::DEFAULT_STAY_MINUTES;
            }
        }

        return max(30, min(360, $minutes ?: self::DEFAULT_STAY_MINUTES));
    }

    private function maxBookableGuests(Locations_model $location): int
    {
        $tables = $location->tables->filter(static fn ($table) => (bool)$table->table_status);

        $single = (int)$tables->max('max_capacity');
        $joinable = (int)$tables
            ->filter(static fn ($table) => (bool)$table->is_joinable)
            ->sum(static fn ($table) => max(0, (int)$table->max_capacity));

        $max = max($single, $joinable, 2);

        return max(2, min(50, $max));
    }

    private function guardBookableDate(Carbon $date, string $timezone): void
    {
        $today = Carbon::now($timezone)->startOfDay();
        $latest = $today->copy()->addDays(self::MAX_BOOKING_DAYS);

        if ($date->lessThan($today) || $date->greaterThan($latest)) {
            throw ValidationException::withMessages([
                'date' => ['Please choose a date within the next '.self::MAX_BOOKING_DAYS.' days.'],
            ]);
        }
    }

    private function profile(Locations_model $location): array
    {
        $settings = $this->settings([
            'pmd_restaurant_identity_name',
            'pmd_restaurant_identity_logo',
            'site_name',
            'site_logo',
            'site_email',
            'pmd_social_website_enabled',
            'pmd_social_website_url',
            'pmd_social_instagram_enabled',
            'pmd_social_instagram_url',
            'pmd_social_google_enabled',
            'pmd_social_google_url',
            'pmd_social_trustpilot_enabled',
            'pmd_social_trustpilot_url',
        ]);

        $name = trim((string)($settings['pmd_restaurant_identity_name'] ?? ''))
            ?: trim((string)($settings['site_name'] ?? ''))
            ?: trim((string)$location->location_name)
            ?: 'Restaurant';

        $logo = trim((string)($settings['pmd_restaurant_identity_logo'] ?? ''))
            ?: trim((string)($settings['site_logo'] ?? ''));

        if ($logo === '') {
            try {
                $logo = trim((string)$location->thumb);
            } catch (Throwable $error) {
                $logo = '';
            }
        }

        $cityLine = implode(' ', array_values(array_filter([
            trim((string)$location->location_postcode),
            trim((string)$location->location_city),
        ], static fn ($value) => $value !== '')));

        $addressParts = array_values(array_filter([
            trim((string)$location->location_address_1),
            trim((string)$location->location_address_2),
            $cityLine,
            trim((string)$location->location_state),
        ], static fn ($value) => trim((string)$value) !== ''));

        $email = trim((string)($location->location_email ?: ($settings['site_email'] ?? '')));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = '';
        }

        return [
            'name' => $name,
            'logo' => $this->logoUrl($logo),
            'description' => trim(strip_tags((string)($location->description ?? ''))),
            'telephone' => trim((string)$location->location_telephone),
            'email' => $email,
            'address' => implode(', ', $addressParts),
            'whatsapp_number' => app(PmdReservationMessagingService::class)
                ->publicWhatsappNumber(),
            'whatsapp_updates_enabled' => app(PmdReservationMessagingService::class)
                ->whatsappOperational(),
            'website_url' => !empty($settings['pmd_social_website_enabled'])
                ? trim((string)($settings['pmd_social_website_url'] ?? ''))
                : '',
            'instagram_url' => !empty($settings['pmd_social_instagram_enabled'])
                ? trim((string)($settings['pmd_social_instagram_url'] ?? ''))
                : '',
            'google_url' => !empty($settings['pmd_social_google_enabled'])
                ? trim((string)($settings['pmd_social_google_url'] ?? ''))
                : '',
            'trustpilot_url' => !empty($settings['pmd_social_trustpilot_enabled'])
                ? trim((string)($settings['pmd_social_trustpilot_url'] ?? ''))
                : '',
        ];
    }

    private function settings(array $keys): array
    {
        try {
            return DB::table('settings')
                ->whereIn('item', $keys)
                ->pluck('value', 'item')
                ->map(static fn ($value) => is_scalar($value) ? (string)$value : $value)
                ->all();
        } catch (Throwable $error) {
            return [];
        }
    }

    private function logoUrl(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '/brand/paymydine-logo.svg';
        }

        if (preg_match('#^https?://#i', $value)) {
            return $value;
        }

        $path = '/'.ltrim((string)(parse_url($value, PHP_URL_PATH) ?: $value), '/');

        if (
            str_starts_with($path, '/api/media/')
            || str_starts_with($path, '/assets/media/')
            || str_starts_with($path, '/brand/')
        ) {
            return $path;
        }

        if (str_starts_with($path, '/uploads/')) {
            return '/assets/media'.$path;
        }

        return '/api/media/'.rawurlencode(basename($path));
    }

    private function locale(Request $request, array $languageContext): string
    {
        $eligible = array_values((array)($languageContext['eligible'] ?? []));
        $default = strtolower(substr((string)($languageContext['default'] ?? 'en'), 0, 2));
        $requested = strtolower(substr((string)$request->query('lang', ''), 0, 2));

        if ($requested !== '' && in_array($requested, $eligible, true)) {
            return $requested;
        }

        if (in_array($default, $eligible, true)) {
            return $default;
        }

        return (string)($eligible[0] ?? 'en');
    }

    private function languageContext(Locations_model $location): array
    {
        $marketLanguages = [];

        try {
            $marketLanguages = app(LocationPlatformContext::class)->languages((int)$location->getKey());
        } catch (Throwable $error) {
            $marketLanguages = [];
        }

        $rawEligible = array_values((array)($marketLanguages['eligible'] ?? []));
        $rawTags = array_values((array)($marketLanguages['locale_tags'] ?? []));
        $eligible = [];
        $localeTags = [];

        foreach ($rawEligible as $index => $rawLocale) {
            $locale = strtolower(substr(trim((string)$rawLocale), 0, 2));
            if (
                $locale === ''
                || !in_array($locale, self::PUBLIC_LOCALES, true)
                || in_array($locale, $eligible, true)
            ) {
                continue;
            }

            $eligible[] = $locale;
            $tag = trim((string)($rawTags[$index] ?? ''));
            $localeTags[$locale] = $tag !== '' ? $tag : $this->defaultLocaleTag($locale);
        }

        if (!$eligible) {
            $eligible = ['en'];
            $localeTags['en'] = $this->defaultLocaleTag('en');
        }

        $default = strtolower(substr((string)($marketLanguages['default'] ?? ''), 0, 2));
        if (!in_array($default, $eligible, true)) {
            $default = (string)$eligible[0];
        }

        $fallback = strtolower(substr((string)($marketLanguages['fallback'] ?? ''), 0, 2));
        if (!in_array($fallback, $eligible, true)) {
            $fallback = $default;
        }

        foreach ($eligible as $locale) {
            if (!isset($localeTags[$locale])) {
                $localeTags[$locale] = $this->defaultLocaleTag($locale);
            }
        }

        return [
            'default' => $default,
            'fallback' => $fallback,
            'eligible' => $eligible,
            'locale_tags' => $localeTags,
        ];
    }

    private function defaultLocaleTag(string $locale): string
    {
        return match (strtolower(substr($locale, 0, 2))) {
            'de' => 'de-DE',
            'tr' => 'tr-TR',
            'ar' => 'ar-OM',
            default => 'en-GB',
        };
    }

    private function localeDirection(string $locale): string
    {
        return in_array(strtolower(substr($locale, 0, 2)), ['ar', 'fa', 'he', 'ur'], true)
            ? 'rtl'
            : 'ltr';
    }

    private function timezone(): string
    {
        $timezone = trim((string)setting('timezone', config('app.timezone', 'Europe/Berlin')));
        if ($timezone === '') {
            $timezone = 'Europe/Berlin';
        }

        try {
            new DateTimeZone($timezone);
            return $timezone;
        } catch (Throwable $error) {
            return 'Europe/Berlin';
        }
    }
}
