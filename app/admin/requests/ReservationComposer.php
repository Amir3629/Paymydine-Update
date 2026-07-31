<?php

namespace Admin\Requests;

class ReservationComposer extends Reservation
{
    public function rules()
    {
        return array_merge(parent::rules(), [
            'assignment_mode' => ['required', 'in:auto,choose,later'],
            'tables' => ['sometimes', 'array'],
            'tables.*' => ['integer', 'distinct'],
            'status_id' => ['nullable', 'integer'],
            'occasion_id' => ['nullable', 'integer'],
            'notify' => ['boolean'],
            'comment' => ['nullable', 'string'],
            'reservation_id' => ['nullable', 'integer'],
            'source' => ['nullable', 'string', 'max:48'],
        ]);
    }
}
