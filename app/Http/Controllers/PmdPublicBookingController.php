<?php

namespace App\Http\Controllers;

use Admin\Models\Locations_model;
use Admin\Models\Reservations_model;
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
    private const DEFAULT_SLOT_MINUTES = 30;
    private const DEFAULT_STAY_MINUTES = 90;

    public function show(Request $request)
    {
        $location = $this->location();
        $timezone = $this->timezone();
        $locale = $this->locale($request);

        return response()
            ->view('pmd.public-booking', [
                'bookingProfile' => $this->profile($location),
                'bookingHours' => $this->openingHours($location),
                'bookingLocale' => $locale,
                'bookingTimezone' => $timezone,
                'bookingToday' => Carbon::now($timezone)->toDateString(),
                'bookingMaxDate' => Carbon::now($timezone)->addDays(self::MAX_BOOKING_DAYS)->toDateString(),
                'bookingMaxGuests' => $this->maxBookableGuests($location),
                'bookingStayMinutes' => $this->stayMinutes($location),
            ])
            ->header('Cache-Control', 'private, no-store, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    public function availability(Request $request): JsonResponse
    {
        $location = $this->location();
        $timezone = $this->timezone();
        $maxGuests = $this->maxBookableGuests($location);

        $data = validator($request->all(), [
            'date' => ['required', 'date_format:Y-m-d'],
            'guests' => ['required', 'integer', 'min:1', 'max:'.$maxGuests],
        ])->validate();

        $date = Carbon::createFromFormat('Y-m-d', (string)$data['date'], $timezone)->startOfDay();
        $this->guardBookableDate($date, $timezone);

        $payload = $this->availabilityPayload($location, $date, (int)$data['guests']);

        return response()->json([
            'success' => true,
            'date' => $date->toDateString(),
            'guest_num' => (int)$data['guests'],
            'timezone' => $timezone,
            'opening' => $payload['opening'],
            'duration' => $payload['duration'],
            'interval' => $payload['interval'],
            'slots' => $payload['slots'],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
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
            'occasion_id' => ['nullable', 'integer', 'between:0,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'consent' => ['accepted'],
        ])->validate();

        $date = Carbon::createFromFormat('Y-m-d', (string)$data['reserve_date'], $timezone)->startOfDay();
        $this->guardBookableDate($date, $timezone);

        $guests = (int)$data['guest_num'];
        $time = (string)$data['reserve_time'];
        $availability = $this->availabilityPayload($location, $date, $guests);
        $slot = collect($availability['slots'])->firstWhere('value', $time);

        if (!$slot) {
            throw ValidationException::withMessages([
                'reserve_time' => ['That time is no longer available. Please choose another time.'],
            ]);
        }

        try {
            $reservation = DB::transaction(function () use (
                $location,
                $date,
                $time,
                $guests,
                $data,
                $timezone,
                $availability
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

                return $reservation->fresh(['tables', 'status', 'location']);
            }, 3);

            $confirmedStatus = (int)setting('confirmed_reservation_status', 0);
            $isConfirmed = $confirmedStatus > 0
                && (int)$reservation->status_id === $confirmedStatus;

            return response()->json([
                'success' => true,
                'reservation_id' => (int)$reservation->getKey(),
                'reference' => 'R'.str_pad((string)$reservation->getKey(), 6, '0', STR_PAD_LEFT),
                'status' => (string)($reservation->status_name ?: ($isConfirmed ? 'Confirmed' : 'Received')),
                'confirmed' => $isConfirmed,
                'message' => $isConfirmed
                    ? 'Your table is confirmed.'
                    : 'Your reservation request has been received.',
                'reservation' => [
                    'date' => $date->toDateString(),
                    'time' => $time,
                    'guests' => $guests,
                    'duration' => (int)$reservation->duration,
                    'name' => trim($reservation->first_name.' '.$reservation->last_name),
                ],
            ]);
        } catch (ValidationException $error) {
            throw $error;
        } catch (Throwable $error) {
            Log::error('PMD public booking create failed', [
                'host' => $request->getHost(),
                'location_id' => (int)$location->getKey(),
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'We could not save the reservation. Please try again or contact the restaurant.',
            ], 500);
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

    private function availabilityPayload(Locations_model $location, Carbon $date, int $guests): array
    {
        $opening = $this->hoursForDate($location, $date);
        $duration = $this->stayMinutes($location);
        $interval = $this->slotInterval($location);

        if (!$opening['enabled'] || !$opening['opening_time'] || !$opening['closing_time']) {
            return [
                'opening' => $opening,
                'duration' => $duration,
                'interval' => $interval,
                'slots' => [],
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
            ];
        }

        $activeReservations = $this->activeReservations($location, $opensAt, $closesAt);
        $now = Carbon::now($timezone);
        $slots = [];

        for ($cursor = $opensAt->copy(); $cursor->lessThanOrEqualTo($lastStart); $cursor->addMinutes($interval)) {
            if ($cursor->lessThanOrEqualTo($now)) {
                continue;
            }

            $slotEnd = $cursor->copy()->addMinutes($duration);
            $tableIds = $this->selectTableIds(
                $location,
                $cursor,
                $slotEnd,
                $guests,
                $activeReservations
            );

            if (!$tableIds) {
                continue;
            }

            $slots[] = [
                'value' => $cursor->format('H:i'),
                'label' => $cursor->format('H:i'),
                'period' => ((int)$cursor->format('H') < 16) ? 'day' : 'evening',
            ];
        }

        return [
            'opening' => $opening,
            'duration' => $duration,
            'interval' => $interval,
            'slots' => $slots,
        ];
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
        $blocked = $this->blockedTableIds($location, $activeReservations, $start, $end);

        $tables = $location->tables
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
            });

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
        $weekday = max(0, min(6, (int)$date->dayOfWeekIso - 1));

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

        $addressParts = array_values(array_filter([
            trim((string)$location->location_address_1),
            trim((string)$location->location_address_2),
            trim((string)$location->location_postcode).' '.trim((string)$location->location_city),
            trim((string)$location->location_state),
        ], static fn ($value) => trim((string)$value) !== ''));

        return [
            'name' => $name,
            'logo' => $this->logoUrl($logo),
            'description' => trim(strip_tags((string)($location->description ?? ''))),
            'telephone' => trim((string)$location->location_telephone),
            'email' => trim((string)($location->location_email ?: ($settings['site_email'] ?? ''))),
            'address' => implode(', ', $addressParts),
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

    private function locale(Request $request): string
    {
        $requested = strtolower(substr((string)$request->query('lang', app()->getLocale()), 0, 2));

        return in_array($requested, ['en', 'de', 'tr'], true) ? $requested : 'en';
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
