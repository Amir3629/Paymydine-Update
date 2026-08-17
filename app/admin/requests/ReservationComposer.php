<?php

namespace Admin\Requests;

class ReservationComposer extends Reservation
{
    public function rules()
    {
        return array_merge(parent::rules(), [
            // PMD_COMPOSER_SMART_V192
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:128'],
            'telephone' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:255'],
            'guest_num' => ['required', 'integer', 'min:1', 'max:999'],
            'reserve_date' => ['required', 'date_format:Y-m-d'],
            'reserve_time' => ['required', 'date_format:H:i'],
            'duration' => ['required', 'integer', 'min:1', 'max:1440'],
            'assignment_mode' => ['required', 'in:auto,choose,later'],
            'tables' => ['sometimes', 'array'],
            'tables.*' => ['integer', 'distinct'],
            // PMD_RESERVATION_TABLE_PREFERENCES_V1
            'pmd_table_features' => ['sometimes', 'array'],
            'pmd_table_features.*' => ['string', 'distinct', 'in:near_window,quiet_area,accessible'],
            'status_id' => ['nullable', 'integer'],
            'occasion_id' => ['nullable', 'integer'],
            'notify' => ['boolean'],
            'comment' => ['nullable', 'string'],
            'reservation_id' => ['nullable', 'integer'],
            'source' => ['nullable', 'string', 'max:48'],
        ]);
    }
}
