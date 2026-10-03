<?php

namespace Admin\Services;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Admin\Models\Tables_model;
use Admin\Requests\ReservationComposer;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config; // PMD_COMPOSER_V6_CONFIG_IMPORT_FIX_20260808
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;
use Throwable;

class ReservationComposerService
{
    public function load(array $input)
    {
        try {
            $this->ensureTenantDatabaseAuthority();
            $user = $this->authorize();
            $mode = ($input['mode'] ?? null) === 'edit' ? 'edit' : 'create';
            $locations = $this->locations();
            $location = $this->resolveLocation($input['location_id'] ?? null, $locations);
            $reservation = null;

            if ($mode === 'edit') {
                $reservation = $this->reservation((int)($input['reservation_id'] ?? 0), $locations);
                $location = $this->resolveLocation($reservation->location_id, $locations);
            }

            $date = $this->dateHint($input['selected_date'] ?? null);
            $duration = $location->getReservationStayTime();
            $tables = $this->tablesFor($location->getKey());
            $selectedIds = $reservation
                ? $reservation->tables->pluck('table_id')->map(fn($id) => (int)$id)->values()->all()
                : $this->positiveIds($input['table_ids'] ?? []);

            return response()->json([
                'success' => true,
                'mode' => $mode,
                'location' => $this->locationPayload($location),
                'locations' => $locations->map(fn($item) => $this->locationPayload($item))->values(),
                'showLocation' => $locations->count() > 1,
                'tables' => $tables->map(fn($table) => $this->tablePayload($table))->values(),
                'statuses' => Statuses_model::isForReservation()->get()->map(fn($status) => [
                    'status_id' => (int)$status->status_id,
                    'status_name' => $status->status_name,
                    'status_color' => $status->status_color,
                ])->values(),
                'occasions' => collect((new Reservations_model)->getOccasionOptions())->map(
                    fn($label, $id) => ['occasion_id' => (int)$id, 'label' => $label]
                )->values(),
                'defaults' => [
                    'first_name' => '', 'last_name' => '', 'telephone' => '', 'email' => '',
                    'guest_num' => 1, 'reserve_date' => $date,
                    'reserve_time' => $this->timeHint($input['selected_time'] ?? null),
                    'duration' => (int)$duration,
                    'assignment_mode' => $selectedIds ? 'choose' : 'auto',
                    'tables' => $selectedIds, 'comment' => '',
                    'status_id' => (int)setting('default_reservation_status'),
                    'occasion_id' => 0, 'notify' => true,
                    'location_id' => (int)$location->getKey(),
                ],
                'reservation' => $reservation ? $this->serialize($reservation) : null,
                'permissions' => [
                    'assign' => $user->hasPermission('Admin.AssignReservations'),
                ],
            ]);
        } catch (Throwable $exception) {
            return $this->error($exception);
        }
    }

    public function availability(array $input)
    {
        try {
            $this->ensureTenantDatabaseAuthority();
            $this->authorize();
            $validated = $this->validate($input, false);
            $locations = $this->locations();
            $location = $this->resolveLocation($validated['location_id'] ?? null, $locations);
            $reservation = !empty($validated['reservation_id'])
                ? $this->reservation((int)$validated['reservation_id'], $locations)
                : null;
            $result = $this->checkAvailability($validated, $location, $reservation);

            return response()->json(['success' => true, 'availability' => $result]);
        } catch (Throwable $exception) {
            return $this->error($exception);
        }
    }

    public function save(array $input)
    {
        try {
            $this->ensureTenantDatabaseAuthority();
            $user = $this->authorize();
            $validated = $this->validate($input, true);
            $locations = $this->locations();
            $mode = !empty($validated['reservation_id']) ? 'edit' : 'create';
            $reservation = $mode === 'edit'
                ? $this->reservation((int)$validated['reservation_id'], $locations)
                : new Reservations_model;
            $location = $this->resolveLocation(
                $validated['location_id'] ?? ($reservation->location_id ?: null),
                $locations
            );
            $assignment = $validated['assignment_mode'];
            $existingIds = $reservation->exists
                ? $reservation->tables->pluck('table_id')->map(fn($id) => (int)$id)->sort()->values()->all()
                : [];
            $requestedIds = $this->positiveIds($validated['tables'] ?? []);

            /*
             * PMD_MANUAL_TABLE_DISCOVERY_422_FIX_20260807
             *
             * Discovery may use assignment_mode=choose with zero
             * selected tables, but a real Save may not.
             */
            if (
                $assignment === 'choose'
                && !$requestedIds
            ) {
                throw ValidationException::withMessages([
                    'tables' => [
                        'Choose at least one table.',
                    ],
                ]);
            }

            /*
             * PMD_COMPOSER_PERSIST_ASSIGNMENT_V230
             *
             * The Composer UI displays Backend-recommended table IDs, but an
             * Auto submission does not naturally contain tables[] fields.
             *
             * Recalculate the recommendation authoritatively during Save and
             * convert it into the real physical table IDs that must be stored
             * in reservation_tables.
             */
            $resolvedTableIds = $requestedIds;

            if ($assignment === 'auto') {
                $autoAvailability = $this->checkAvailability(
                    $validated,
                    $location,
                    $reservation->exists ? $reservation : null
                );

                $resolvedTableIds = $this->positiveIds(
                    $autoAvailability['recommendedTableIds'] ?? []
                );

                if (
                    empty($autoAvailability['available'])
                    || !$resolvedTableIds
                ) {
                    throw ValidationException::withMessages([
                        'tables' => [
                            'No available table matches this reservation.',
                        ],
                    ]);
                }

                // Keep all later Save logic consistent with Choose mode.
                $validated['tables'] = $resolvedTableIds;
            }
            $assignmentChanged = $assignment !== 'later'
                || $existingIds !== $requestedIds;

            if (($assignment === 'auto' || $assignment === 'choose' || ($mode === 'edit' && $assignmentChanged))
                && !$user->hasPermission('Admin.AssignReservations')) {
                abort(403, 'You are not allowed to assign reservation tables.');
            }

            // PMD_COMPOSER_STATUS_REMOVED_V162
            // Composer does not validate or change reservation status.
            /*
             * PMD_COMPOSER_OPTIONAL_OCCASION_V15
             *
             * The Composer uses 0 for "No occasion".
             * Normalize it to null and validate only real positive IDs.
             */
            $occasionId = (int)($validated['occasion_id'] ?? 0);

            if (
                $occasionId > 0
                && !array_key_exists(
                    $occasionId,
                    (new Reservations_model)->getOccasionOptions()
                )
            ) {
                throw ValidationException::withMessages([
                    'occasion_id' => ['Invalid occasion.'],
                ]);
            }

            $validated['occasion_id'] = $occasionId > 0
                ? $occasionId
                : null;

            /*
             * PMD_COMPOSER_RESOLVED_IDS_SCOPE_V231
             *
             * Auto recommendations are calculated before entering the
             * transaction. The resolved physical table IDs must therefore be
             * explicitly imported into the transaction Closure.
             */
            $saved = DB::transaction(function () use (
                $validated,
                $reservation,
                $location,
                $assignment,
                $requestedIds,
                $resolvedTableIds
            ) {
                $availability = $this->checkAvailability($validated, $location, $reservation->exists ? $reservation : null);
                if (!$availability['available']) {
                    throw new HttpResponseException(response()->json([
                        'success' => false,
                        'error' => [
                            'code' => 'RESERVATION_CONFLICT',
                            'message' => 'The requested table assignment is not available.',
                            'availability' => $availability,
                        ],
                    ], 409));
                }

                $reservation->fill(collect($validated)->only([
                    'first_name', 'last_name', 'telephone', 'email', 'guest_num',
                    'reserve_date', 'reserve_time', 'duration', 'comment',
                    'occasion_id', 'notify',
                ])->all());
                $reservation->location_id = (int)$location->getKey();

                if ($assignment === 'choose') {
                    $reservation->tables = $requestedIds;
                } elseif ($assignment === 'auto') {
                    $reservation->tables = [];
                } else {
                    $reservation->tables = [];
                    $reservation->skipAutoTableAllocation = true;
                }

                // PMD_COMPOSER_MORE_OPTIONS_REMOVED_V17
            // These optional values are not controlled by Composer.
            $reservation->occasion_id = null;
            $reservation->notify = false;

            /*
             * PMD_COMPOSER_PERSIST_ASSIGNMENT_V230
             *
             * For both Auto and manual Choose mode:
             *
             * 1. Store the first table's visible table number in the legacy
             *    ti_reservations.table_id column.
             * 2. Put every physical table ID into the model's purgeable
             *    tables attribute before Save.
             * 3. Explicitly sync the reservation_tables Pivot after Save.
             *
             * The explicit sync is intentional and idempotent. It guarantees
             * that multi-table assignments survive even when an older model
             * lifecycle does not restore the purgeable tables attribute.
             */
            if (
                in_array(
                    $assignment,
                    ['auto', 'choose'],
                    true
                )
            ) {
                if (!$resolvedTableIds) {
                    throw ValidationException::withMessages([
                        'tables' => [
                            'Choose at least one available table.',
                        ],
                    ]);
                }

                $tableCatalogById = $this
                    ->tablesFor($location->getKey())
                    ->keyBy(
                        fn($table) => (int)$table->table_id
                    );

                $primaryPhysicalId = (int)$resolvedTableIds[0];
                $primaryTable = $tableCatalogById->get(
                    $primaryPhysicalId
                );

                if (!$primaryTable) {
                    throw ValidationException::withMessages([
                        'tables' => [
                            'The recommended table is no longer available.',
                        ],
                    ]);
                }

                /*
                 * Legacy reservation cards expect the visible table number
                 * here, while reservation_tables stores physical table IDs.
                 *
                 * Example:
                 * ti_reservations.table_id = 10
                 * ti_reservation_tables.table_id = 330
                 */
                $reservation->table_id = (int)(
                    $primaryTable->table_no ?? 0
                );

                $reservation->tables = $resolvedTableIds;
            }

            $reservation->save();

            // PMD_RESERVATION_TABLE_PREFERENCES_V1

            $this->pmdPersistReservationTableFeatures($reservation, $validated['pmd_table_features'] ?? []);
            if (
                in_array(
                    $assignment,
                    ['auto', 'choose'],
                    true
                )
            ) {
                $reservation->addReservationTables(
                    $resolvedTableIds
                );

                $reservation->unsetRelation('tables');
                $reservation->load('tables');
            }
                return $reservation->fresh(['location.all_options', 'tables', 'status']);
            });

            return response()->json([
                'success' => true,
                'mode' => $mode,
                'reservation' => $this->serialize($saved),
                'source' => (string)($validated['source'] ?? ''),
                'warnings' => [],
            ]);
        } catch (Throwable $exception) {
            return $this->error($exception);
        }
    }

    /*
     * PMD_COMPOSER_TENANT_DB_AUTHORITY_V6_20260808
     *
     * Reservation Composer availability MUST read the same tenant
     * database as the currently open restaurant admin workspace.
     *
     * Never allow availability to silently fall back to the central
     * paymydine database.
     */
    protected function ensureTenantDatabaseAuthority()
    {
        $host = strtolower(
            trim((string)request()->getHost())
        );

        if ($host === '') {
            throw new \RuntimeException(
                'Unable to determine tenant host.'
            );
        }

        $tenant = DB::connection('mysql')
            ->table('tenants')
            ->where('domain', $host)
            ->where('status', 'active')
            ->first();

        if (
            !$tenant
            || empty($tenant->database)
        ) {
            throw new \RuntimeException(
                'Active tenant database was not found for '.$host.'.'
            );
        }

        Config::set(
            'database.connections.tenant.database',
            $tenant->database
        );

        if (!empty($tenant->db_host)) {
            Config::set(
                'database.connections.tenant.host',
                $tenant->db_host
            );
        }

        if (!empty($tenant->db_user)) {
            Config::set(
                'database.connections.tenant.username',
                $tenant->db_user
            );
        }

        if (!empty($tenant->db_pass)) {
            Config::set(
                'database.connections.tenant.password',
                $tenant->db_pass
            );
        }

        DB::purge('tenant');
        DB::reconnect('tenant');
        DB::setDefaultConnection('tenant');

        if (
            DB::connection()->getDatabaseName()
            !== $tenant->database
        ) {
            throw new \RuntimeException(
                'Composer tenant database switch failed.'
            );
        }

        return $tenant;
    }

    protected function authorize()
    {
        $user = AdminAuth::getUser();
        if (!$user) abort(401, 'Authentication required.');
        if (!$user->hasPermission('Admin.Reservations')) abort(403, 'Forbidden.');
        return $user;
    }

    protected function locations()
    {
        $locations = collect(AdminLocation::listLocations())->values();
        if (!$locations->count()) abort(409, 'No manageable restaurant location is available.');
        return $locations;
    }

    protected function resolveLocation($id, $locations)
    {
        $id = (int)$id;
        if (!$id) $id = (int)AdminLocation::getId();
        if (!$id && $locations->count() === 1) $id = (int)$locations->first()->getKey();
        $location = $locations->first(fn($item) => (int)$item->getKey() === $id);
        if (!$location) abort(403, 'The selected location is not available.');
        return $location;
    }

    protected function reservation($id, $locations)
    {
        $ids = $locations->pluck('location_id')->map(fn($value) => (int)$value)->all();
        $model = Reservations_model::query()->with(['location.all_options', 'tables', 'status'])
            ->whereHasLocation($ids)->whereKey($id)->first();
        if (!$model) abort(404, 'Reservation not found.');
        return $model;
    }

    protected function validate(array $input, $saving)
    {
        $rules = (new ReservationComposer)->rules();
        if (!$saving) {
            foreach (['first_name', 'last_name'] as $field) $rules[$field] = ['sometimes'];
        }
        return Validator::make($input, $rules, [], (new ReservationComposer)->attributes())->validate();
    }

    protected function checkAvailability(array $data, $location, $editing = null)
    {
        $mode = $data['assignment_mode'];
        $requested = $this->positiveIds($data['tables'] ?? []);
        $tables = $this->tablesFor($location->getKey());
        $byId = $tables->keyBy(fn($table) => (int)$table->table_id);
        if (count($requested) !== collect($requested)->filter(fn($id) => $byId->has($id))->count()) {
            throw ValidationException::withMessages(['tables' => ['One or more tables are invalid for this location.']]);
        }

        // PMD_COMPOSER_SMART_V192
        $reserveDate = trim(
            (string)($data['reserve_date'] ?? '')
        );

        $reserveTime = trim(
            (string)($data['reserve_time'] ?? '')
        );

        $duration = max(
            1,
            (int)($data['duration'] ?? 45)
        );

        if ($reserveDate === '') {
            throw ValidationException::withMessages([
                'reserve_date' => [
                    'Choose a reservation date.',
                ],
            ]);
        }

        if ($reserveTime === '') {
            throw ValidationException::withMessages([
                'reserve_time' => [
                    'Choose a reservation time.',
                ],
            ]);
        }

        try {
            $start = Carbon::createFromFormat(
                'Y-m-d H:i',
                $reserveDate.' '.$reserveTime
            );
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'reserve_time' => [
                    'Choose a valid reservation date and time.',
                ],
            ]);
        }

        $end = $start
            ->copy()
            ->addMinutes($duration);
        /*
         * PMD_RESERVATION_ACTIVE_TABLE_CONFLICT_20260807
         *
         * A table is occupied by every active reservation,
         * not only by reservations using confirmed_reservation_status.
         *
         * Previously an Open / Geöffnet reservation was ignored,
         * so Auto assignment could recommend the same table again
         * for an overlapping time slot.
         *
         * Only the configured canceled reservation status is
         * excluded from occupancy.
         */
        $canceled = (int)setting('canceled_reservation_status');

        $query = Reservations_model::query()
            ->with(['tables', 'status'])
            ->whereLocationId($location->getKey());

        if ($canceled > 0) {
            $query->where('status_id', '!=', $canceled);
        }
        if ($editing) $query->where($editing->getKeyName(), '!=', $editing->getKey());
        $conflicts = [];
        $blocked = [];
        foreach ($query->get() as $reservation) {
            $existingStart = $reservation->reservation_datetime;
            $existingEnd = $reservation->reservation_end_datetime;
            if ($existingStart->lt($end) && $existingEnd->gt($start)) {
                $ids = $reservation->tables->pluck('table_id')->map(fn($id) => (int)$id)->values()->all();
                $blocked = array_merge($blocked, $ids);
                $conflicts[] = [
                    'reservationId' => (int)$reservation->reservation_id,
                    'tableIds' => $ids,
                    'startsAt' => $existingStart->toIso8601String(),
                    'endsAt' => $existingEnd->toIso8601String(),
                    'statusId' => (int)$reservation->status_id,
                    'statusName' => optional($reservation->status)->status_name,
                ];
            }
        }
        $blocked = array_values(array_unique($blocked));

        /*
         * PMD_MANUAL_TABLE_60_MIN_AVAILABILITY_V2_20260807
         *
         * AUTO availability keeps using the exact reservation
         * duration below.
         *
         * Manual "Choose table(s)" gets a stricter catalog:
         * a table must stay free for AT LEAST 60 minutes from
         * the requested start time.
         *
         * Longer reservations keep their real duration.
         *
         * Examples:
         *
         * 45 min reservation -> manual window = 60 min
         * 60 min reservation -> manual window = 60 min
         * 90 min reservation -> manual window = 90 min
         */
        $manualWindowMinutes = max(
            60,
            (int)$duration
        );

        $manualEnd = $start
            ->copy()
            ->addMinutes($manualWindowMinutes);

        $manualBlocked = [];

        foreach ($query->get() as $manualReservation) {
            $manualExistingStart =
                $manualReservation->reservation_datetime;

            $manualExistingEnd =
                $manualReservation->reservation_end_datetime;

            if (
                $manualExistingStart->lt($manualEnd)
                && $manualExistingEnd->gt($start)
            ) {
                $manualBlocked = array_merge(
                    $manualBlocked,
                    $manualReservation
                        ->tables
                        ->pluck('table_id')
                        ->map(
                            fn($id) => (int)$id
                        )
                        ->values()
                        ->all()
                );
            }
        }

        $manualBlocked = array_values(
            array_unique($manualBlocked)
        );

        $manualAvailable = $tables->reject(
            fn($table) => in_array(
                (int)$table->table_id,
                $manualBlocked,
                true
            )
        );

        $available = $tables->reject(fn($table) => in_array((int)$table->table_id, $blocked, true));
        $recommended = [];
        $capacity = 0;
        $ok = true;

        if ($mode === 'choose') {
            /*
             * PMD_MANUAL_TABLE_DISCOVERY_422_FIX_20260807
             *
             * Opening "Choose table(s)" is a DISCOVERY request.
             *
             * At that moment zero tables selected is valid:
             * the client first needs availableTableIds and
             * manualAvailableTableIds in order to render the dropdown.
             *
             * Actual Save still requires at least one selected table.
             */
            if (!$requested) {
                $capacity = 0;
                $ok = true;
            } else {
                $selected = collect($requested)
                    ->map(fn($id) => $byId->get($id));

                $capacity = $selected->sum('max_capacity');

                $ok = !array_intersect(
                    $requested,
                    $blocked
                );

                if ($selected->count() === 1) {
                    $table = $selected->first();

                    $ok =
                        $ok
                        && $table
                            && $table->min_capacity <= $data['guest_num']
                        && $table->max_capacity >= $data['guest_num'];
                } else {
                    $ok =
                        $ok
                        && $selected->every(
                            fn($table) =>
                                $table
                                && $table->is_joinable
                        )
                        && $capacity >= $data['guest_num'];
                }
            }
        } elseif ($mode === 'auto') {
            $recommended = $this->recommend($available, (int)$data['guest_num']);
            $capacity = collect($recommended)->sum(fn($id) => (int)$byId->get($id)->max_capacity);
            $ok = (bool)$recommended;
        }

        return [
            'available' => $ok,
            'assignmentMode' => $mode,
            'requestedTableIds' => $requested,
            'availableTableIds' => $available->pluck('table_id')->map(fn($id) => (int)$id)->values()->all(),

            /*
             * PMD_MANUAL_TABLE_60_MIN_AVAILABILITY_V2_20260807
             *
             * Used ONLY by the manual dropdown.
             */
            'manualAvailableTableIds' => $manualAvailable
                ->pluck('table_id')
                ->map(fn($id) => (int)$id)
                ->values()
                ->all(),

            'manualAvailabilityWindowMinutes' =>
                $manualWindowMinutes,

            'recommendedTableIds' => $recommended,
            'combinedCapacity' => $capacity,
            'conflicts' => array_values(array_filter($conflicts, fn($conflict) => $mode === 'auto' || array_intersect($conflict['tableIds'], $requested))),
        ];
    }

    protected function recommend($tables, $guests)
    {
        /*
         * PMD_SMART_CONTEXT_TABLES_V224
         *
         * Recommendation priorities:
         *
         * 1. A single available table that fits the party.
         * 2. Lowest unused capacity.
         * 3. Lowest configured Floor priority.
         * 4. For merged tables, the physically closest combination
         *    based on the saved Full Floor x/y coordinates.
         * 5. Fewer tables are preferred when distance is similar.
         */

        $guests = max(1, (int)$guests);

        /*
         * PMD_AUTO_SINGLE_TABLE_FIRST_20260807
         *
         * AUTO ASSIGNMENT CONTRACT
         *
         * A single available table always wins over a merged
         * combination when that table can physically seat the
         * party.
         *
         * min_capacity is treated as a preference for Auto
         * ranking, NOT as a reason to merge multiple tables
         * for a smaller party.
         *
         * Example:
         *
         * 1 guest + free 2-seat table
         * => ONE 2-seat table
         *
         * Never:
         * => Tisch 6 + Tisch 12
         */
        $singleCandidates = $tables
            ->filter(function ($table) use ($guests) {
                return (int)$table->max_capacity >= $guests;
            })
            ->sortBy(function ($table) use ($guests) {
                $min = max(
                    0,
                    (int)$table->min_capacity
                );

                $max = max(
                    0,
                    (int)$table->max_capacity
                );

                /*
                 * Prefer tables where the party also satisfies
                 * configured min_capacity.
                 *
                 * But a party below min_capacity still gets a
                 * single table before any merge is considered.
                 */
                $belowPreferredMin =
                    $guests < $min
                        ? 1
                        : 0;

                $unusedSeats =
                    max(
                        0,
                        $max - $guests
                    );

                $priority = (int)(
                    $table->priority
                    ?? 0
                );

                $tableId = (int)$table->table_id;

                return sprintf(
                    '%01d:%08d:%08d:%08d',
                    $belowPreferredMin,
                    $unusedSeats,
                    $priority,
                    $tableId
                );
            })
            ->values();

        if ($singleCandidates->isNotEmpty()) {
            return [
                (int)$singleCandidates
                    ->first()
                    ->table_id,
            ];
        }

        $tables = collect($tables)
            ->filter(fn($table) => $table && (int)$table->table_id > 0)
            ->values();

        $single = $tables
            ->filter(function ($table) use ($guests) {
                return (int)$table->min_capacity <= $guests
                    && (int)$table->max_capacity >= $guests;
            })
            ->sortBy(function ($table) use ($guests) {
                $waste = max(
                    0,
                    (int)$table->max_capacity - $guests
                );

                return sprintf(
                    '%08d-%08d-%08d',
                    $waste,
                    (int)($table->priority ?? 0),
                    (int)$table->table_id
                );
            })
            ->first();

        if ($single) {
            return [(int)$single->table_id];
        }

        $joinable = $tables
            ->filter(fn($table) => (bool)$table->is_joinable)
            ->sortBy(fn($table) => (int)($table->priority ?? 0))
            ->values();

        if ($joinable->count() < 2) {
            return [];
        }

        $best = null;
        $count = $joinable->count();
        $maximumTables = min(4, $count);

        $coordinate = function ($table, $axis) {
            $property = $axis === 'x'
                ? 'floor_x'
                : 'floor_y';

            return is_numeric($table->{$property} ?? null)
                ? (float)$table->{$property}
                : 0.0;
        };

        $distanceScore = function ($combination) use ($coordinate) {
            $largestSquaredDistance = 0.0;
            $totalSquaredDistance = 0.0;
            $pairs = 0;

            for ($left = 0; $left < count($combination); $left++) {
                for (
                    $right = $left + 1;
                    $right < count($combination);
                    $right++
                ) {
                    $dx = $coordinate(
                        $combination[$left],
                        'x'
                    ) - $coordinate(
                        $combination[$right],
                        'x'
                    );

                    $dy = $coordinate(
                        $combination[$left],
                        'y'
                    ) - $coordinate(
                        $combination[$right],
                        'y'
                    );

                    $squared = ($dx * $dx) + ($dy * $dy);

                    $largestSquaredDistance = max(
                        $largestSquaredDistance,
                        $squared
                    );

                    $totalSquaredDistance += $squared;
                    $pairs++;
                }
            }

            return [
                'largest' => $largestSquaredDistance,
                'average' => $pairs
                    ? $totalSquaredDistance / $pairs
                    : 0.0,
            ];
        };

        $evaluate = function ($combination) use (
            &$best,
            $guests,
            $distanceScore
        ) {
            $capacity = collect($combination)
                ->sum(fn($table) => (int)$table->max_capacity);

            if ($capacity < $guests) {
                return;
            }

            $distance = $distanceScore($combination);
            $waste = max(0, $capacity - $guests);

            $priority = collect($combination)
                ->sum(fn($table) => (int)($table->priority ?? 0));

            $score = [
                round($distance['largest'], 4),
                round($distance['average'], 4),
                count($combination),
                $waste,
                $priority,
            ];

            if ($best === null || $score < $best['score']) {
                $best = [
                    'score' => $score,
                    'ids' => collect($combination)
                        ->pluck('table_id')
                        ->map(fn($id) => (int)$id)
                        ->values()
                        ->all(),
                ];
            }
        };

        $walk = function (
            $start,
            $remaining,
            $combination
        ) use (
            &$walk,
            $joinable,
            $maximumTables,
            $evaluate
        ) {
            if ($remaining === 0) {
                $evaluate($combination);
                return;
            }

            $lastStart = $joinable->count() - $remaining;

            for ($index = $start; $index <= $lastStart; $index++) {
                $next = $combination;
                $next[] = $joinable[$index];

                $walk(
                    $index + 1,
                    $remaining - 1,
                    $next
                );
            }
        };

        for ($size = 2; $size <= $maximumTables; $size++) {
            $walk(0, $size, []);
        }

        return $best
            ? $best['ids']
            : [];
    }

    protected function tablesFor($locationId)
    {
        /*
         * PMD_COMPOSER_CANONICAL_TABLES_V205
         *
         * Reservations2 Floor does not obtain its table catalog through the
         * legacy location_tables relationship. Its canonical tenant source is
         * the physical `tables` table, as used by
         * PmdWaiterDashboardV149::loadTables().
         *
         * Some tenant databases no longer contain location_tables. Using
         * Tables_model::whereHasLocation() therefore returned only a stale
         * subset of the visible Floor tables.
         *
         * Keep $locationId in the signature for API compatibility, but mirror
         * the canonical Floor filters and normalize the rows into the shape
         * required by Composer availability and assignment logic.
         */
        $schema = DB::connection()->getSchemaBuilder();

        if (!$schema->hasTable('tables')) {
            return collect();
        }

        $columns = $schema->getColumnListing('tables');

        $primaryKey = collect([
            'table_id',
            'id',
        ])->first(fn($column) => in_array($column, $columns, true));

        if (!$primaryKey) {
            return collect();
        }

        $query = DB::table('tables');

        if (in_array('deleted_at', $columns, true)) {
            $query->whereNull('deleted_at');
        }

        if (in_array('table_status', $columns, true)) {
            $query->where('table_status', 1);
        }

        if (in_array('visible_on_floor_plan', $columns, true)) {
            $query->where(function ($visibleQuery) {
                $visibleQuery
                    ->whereNull('visible_on_floor_plan')
                    ->orWhere('visible_on_floor_plan', '<>', 0);
            });
        }

        if (in_array('priority', $columns, true)) {
            $query->orderBy('priority');
        }

        if (in_array('table_no', $columns, true)) {
            $query->orderBy('table_no');
        } else {
            $query->orderBy($primaryKey);
        }

        return $query
            ->get()
            ->map(function ($row) use ($primaryKey) {
                $data = (array)$row;

                $id = (int)($data[$primaryKey] ?? 0);

                $name = trim((string)(
                    $data['table_name']
                    ?? $data['pos_table_label']
                    ?? $data['table_no']
                    ?? $id
                ));

                $qrCode = strtolower(trim((string)(
                    $data['qr_code'] ?? ''
                )));

                if (
                    in_array(strtolower($name), [
                        'cashier',
                        'delivery',
                    ], true)
                    || in_array($qrCode, [
                        'cashier',
                        'delivery',
                    ], true)
                ) {
                    return null;
                }

                $number = trim((string)(
                    $data['table_no']
                    ?? $data['pos_table_label']
                    ?? $id
                ));

                $capacity = (int)(
                    $data['capacity']
                    ?? $data['table_capacity']
                    ?? $data['preferred_capacity']
                    ?? $data['max_capacity']
                    ?? $data['min_capacity']
                    ?? 4
                );

                if ($capacity < 1) {
                    $capacity = 4;
                }

                $minimumCapacity = (int)(
                    $data['min_capacity']
                    ?? 1
                );

                if ($minimumCapacity < 1) {
                    $minimumCapacity = 1;
                }

                $maximumCapacity = (int)(
                    $data['max_capacity']
                    ?? $capacity
                );

                if ($maximumCapacity < $minimumCapacity) {
                    $maximumCapacity = max(
                        $minimumCapacity,
                        $capacity
                    );
                }

                return (object)[
                    'table_id' => $id,

                    'table_name' => $name !== ''
                        ? $name
                        : 'Table '.$number,

                    'table_no' => $number,

                    'min_capacity' => $minimumCapacity,

                    'max_capacity' => $maximumCapacity,

                    'is_joinable' => array_key_exists(
                        'is_joinable',
                        $data
                    )
                        ? (bool)$data['is_joinable']
                        : true,

                    /*
                     * PMD_SMART_CONTEXT_TABLES_V224
                     *
                     * Keep the canonical Full Floor coordinates with
                     * the reservation table catalog. Different tenant
                     * versions use either floor_x/floor_y or x/y.
                     */
                    'floor_x' => (float)(
                        $data['floor_x']
                        ?? $data['position_x']
                        ?? $data['pos_x']
                        ?? $data['x']
                        ?? 0
                    ),

                    'floor_y' => (float)(
                        $data['floor_y']
                        ?? $data['position_y']
                        ?? $data['pos_y']
                        ?? $data['y']
                        ?? 0
                    ),

                    'priority' => (int)(
                        $data['priority']
                        ?? $data['sort_order']
                        ?? $number
                        ?? $id
                    ),
                ];
            })
            ->filter(fn($table) => $table && $table->table_id > 0)
            ->values();
    }

    protected function resolveReservationStatusId($candidate = null)
    {
        $candidates = array_values(array_unique(array_filter([
            (int)$candidate,
            (int)setting('default_reservation_status'),
            (int)setting('confirmed_reservation_status'),
        ])));

        foreach ($candidates as $statusId) {
            if (
                $statusId > 0
                && Statuses_model::isForReservation()
                    ->whereKey($statusId)
                    ->exists()
            ) {
                return $statusId;
            }
        }

        $status = Statuses_model::isForReservation()->first();

        if (!$status) {
            throw ValidationException::withMessages([
                'status_id' => [
                    'No reservation status has been configured.',
                ],
            ]);
        }

        return (int)$status->status_id;
    }

    protected function serialize($reservation)
    {
        $data = $reservation->attributesToArray();
        // PMD_RESERVATION_TABLE_PREFERENCES_V1
        $data['pmd_table_features'] = $this->pmdReservationTableFeatures($reservation);
        $data['full_name'] = $reservation->customer_name;
        $data['customer_name'] = $reservation->customer_name;
        $data['reserve_date'] = $reservation->reserve_date->toDateString();
        $data['reserve_time'] = (string)$reservation->reserve_time;
        $data['status_id'] = (int)$reservation->status_id;
        $data['status_name'] = optional($reservation->status)->status_name;
        $data['status'] = $reservation->status ? [
            'status_id' => (int)$reservation->status->status_id,
            'status_name' => $reservation->status->status_name,
            'status_color' => $reservation->status->status_color,
        ] : null;
        $data['tables'] = $reservation->tables->map(fn($table) => $this->tablePayload($table))->values()->all();
        $data['table_name'] = $reservation->table_name;
        $data['location'] = $reservation->location ? $this->locationPayload($reservation->location) : null;
        $data['editUrl'] = admin_url('reservations/edit/'.$reservation->reservation_id);
        return $data;
    }

    /*
     * PMD_RESERVATION_TABLE_PREFERENCES_V1
     *
     * The selected table features are reservation intent, not assignment output.
     * They therefore live in one PMD-owned tenant row keyed by reservation_id.
     */
    protected function pmdNormalizeReservationTableFeatures($features): array
    {
        $allowed = ['near_window', 'quiet_area', 'accessible'];

        return collect((array)$features)
            ->map(fn($feature) => trim((string)$feature))
            ->filter(fn($feature) => in_array($feature, $allowed, true))
            ->unique()
            ->values()
            ->all();
    }

    protected function pmdReservationTableFeatures($reservation): array
    {
        $reservationId = (int)($reservation->reservation_id ?? 0);
        if ($reservationId <= 0) {
            return [];
        }

        $encoded = DB::table('pmd_reservation_preferences')
            ->where('reservation_id', $reservationId)
            ->value('table_features');

        if (!is_string($encoded) || trim($encoded) === '') {
            return [];
        }

        $decoded = json_decode($encoded, true);
        if (!is_array($decoded)) {
            return [];
        }

        return $this->pmdNormalizeReservationTableFeatures($decoded);
    }

    protected function pmdPersistReservationTableFeatures($reservation, $features): void
    {
        $reservationId = (int)($reservation->reservation_id ?? 0);
        if ($reservationId <= 0) {
            throw new \RuntimeException('Reservation preference persistence requires a saved reservation id.');
        }

        $normalized = $this->pmdNormalizeReservationTableFeatures($features);
        $query = DB::table('pmd_reservation_preferences')
            ->where('reservation_id', $reservationId);

        if (!$normalized) {
            $query->delete();
            return;
        }

        $encoded = json_encode(
            $normalized,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        );

        if (!is_string($encoded)) {
            throw new \RuntimeException('Unable to encode reservation table preferences.');
        }

        DB::table('pmd_reservation_preferences')->updateOrInsert(
            ['reservation_id' => $reservationId],
            ['table_features' => $encoded]
        );
    }

    protected function tablePayload($table)
    {
        return [
            'table_id' => (int)$table->table_id,
            'table_name' => $table->table_name,
            'table_number' => $table->table_name,
            'name' => $table->table_name,
            'table_no' => (string)$table->table_no,
            'min_capacity' => (int)$table->min_capacity,
            'max_capacity' => (int)$table->max_capacity,
            'is_joinable' => (bool)$table->is_joinable,

            // PMD_SMART_CONTEXT_TABLES_V224
            'floor_x' => (float)($table->floor_x ?? 0),
            'floor_y' => (float)($table->floor_y ?? 0),
            'priority' => (int)($table->priority ?? 0),
        ];
    }

    protected function locationPayload($location)
    {
        return ['location_id' => (int)$location->getKey(), 'location_name' => $location->location_name];
    }

    protected function positiveIds($values)
    {
        return collect((array)$values)->map(fn($id) => (int)$id)->filter(fn($id) => $id > 0)->unique()->values()->all();
    }

    protected function dateHint($value)
    {
        try { return Carbon::createFromFormat('Y-m-d', (string)$value)->toDateString(); }
        catch (Throwable $exception) { return Carbon::now()->toDateString(); }
    }

    protected function timeHint($value)
    {
        return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', (string)$value) ? (string)$value : '';
    }

    protected function error(Throwable $exception)
    {
        if ($exception instanceof ValidationException) {
            return response()->json(['success' => false, 'error' => [
                'code' => 'VALIDATION_FAILED', 'message' => 'Please correct the highlighted fields.',
                'fields' => $exception->errors(),
            ]], 422);
        }
        if ($exception instanceof HttpResponseException) return $exception->getResponse();
        if ($exception instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
            $status = $exception->getStatusCode();
            $codes = [401 => 'UNAUTHENTICATED', 403 => 'FORBIDDEN', 404 => 'NOT_FOUND', 409 => 'RESERVATION_CONFLICT'];
            return response()->json(['success' => false, 'error' => [
                'code' => $codes[$status] ?? 'REQUEST_FAILED', 'message' => $exception->getMessage(),
            ]], $status);
        }
        $requestId = bin2hex(random_bytes(6));
        Log::error('Reservation Composer failure', ['request_id' => $requestId, 'exception' => $exception]);
        return response()->json(['success' => false, 'error' => [
            'code' => 'UNEXPECTED_ERROR', 'message' => 'The reservation could not be processed.', 'requestId' => $requestId,
        ]], 500);
    }
}
