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
            $assignmentChanged = $assignment !== 'later'
                || $existingIds !== $requestedIds;

            if (($assignment === 'auto' || $assignment === 'choose' || ($mode === 'edit' && $assignmentChanged))
                && !$user->hasPermission('Admin.AssignReservations')) {
                abort(403, 'You are not allowed to assign reservation tables.');
            }

            $statusId = (int)($validated['status_id'] ?? 0);
            if (!$statusId) $statusId = (int)setting('default_reservation_status');
            $status = Statuses_model::isForReservation()->whereKey($statusId)->first();
            if (!$status) throw ValidationException::withMessages(['status_id' => ['Invalid reservation status.']]);
            if (!array_key_exists((int)($validated['occasion_id'] ?? 0), (new Reservations_model)->getOccasionOptions())) {
                throw ValidationException::withMessages(['occasion_id' => ['Invalid occasion.']]);
            }

            $saved = DB::transaction(function () use (
                $validated, $reservation, $location, $assignment, $requestedIds, $statusId
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

                $oldStatusId = (int)$reservation->status_id;
                $reservation->fill(collect($validated)->only([
                    'first_name', 'last_name', 'telephone', 'email', 'guest_num',
                    'reserve_date', 'reserve_time', 'duration', 'comment',
                    'occasion_id', 'notify',
                ])->all());
                $reservation->location_id = (int)$location->getKey();
                $reservation->status_id = $statusId;

                if ($assignment === 'choose') {
                    $reservation->tables = $requestedIds;
                } elseif ($assignment === 'auto') {
                    $reservation->tables = [];
                } else {
                    $reservation->tables = [];
                    $reservation->skipAutoTableAllocation = true;
                }

                $reservation->save();
                if ($oldStatusId && $oldStatusId !== $statusId) {
                    $reservation->addStatusHistory($statusId, ['notify' => false]);
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

        $start = Carbon::createFromFormat('Y-m-d H:i', $data['reserve_date'].' '.$data['reserve_time']);
        $end = $start->copy()->addMinutes((int)$data['duration']);
        $confirmed = (int)setting('confirmed_reservation_status');
        $query = Reservations_model::query()->with(['tables', 'status'])
            ->whereLocationId($location->getKey())->where('status_id', $confirmed);
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
        $available = $tables->reject(fn($table) => in_array((int)$table->table_id, $blocked, true));
        $recommended = [];
        $capacity = 0;
        $ok = true;

        if ($mode === 'choose') {
            if (!$requested) throw ValidationException::withMessages(['tables' => ['Choose at least one table.']]);
            $selected = collect($requested)->map(fn($id) => $byId->get($id));
            $capacity = $selected->sum('max_capacity');
            $ok = !array_intersect($requested, $blocked);
            if ($selected->count() === 1) {
                $table = $selected->first();
                $ok = $ok && $table->min_capacity <= $data['guest_num'] && $table->max_capacity >= $data['guest_num'];
            } else {
                $ok = $ok && $selected->every(fn($table) => $table->is_joinable) && $capacity >= $data['guest_num'];
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
            'recommendedTableIds' => $recommended,
            'combinedCapacity' => $capacity,
            'conflicts' => array_values(array_filter($conflicts, fn($conflict) => $mode === 'auto' || array_intersect($conflict['tableIds'], $requested))),
        ];
    }

    protected function recommend($tables, $guests)
    {
        $tables = $tables->sortBy('priority');
        foreach ($tables as $table) {
            if ($table->min_capacity <= $guests && $table->max_capacity >= $guests) return [(int)$table->table_id];
        }
        $ids = []; $remaining = $guests;
        foreach ($tables as $table) {
            if ($table->is_joinable && $remaining >= $table->min_capacity) {
                $ids[] = (int)$table->table_id;
                $remaining -= $table->max_capacity;
                if ($remaining <= 0) return $ids;
            }
        }
        return [];
    }

    protected function tablesFor($locationId)
    {
        return Tables_model::query()->isEnabled()->whereHasLocation($locationId)
            ->orderBy('priority')->get();
    }

    protected function serialize($reservation)
    {
        $data = $reservation->attributesToArray();
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
