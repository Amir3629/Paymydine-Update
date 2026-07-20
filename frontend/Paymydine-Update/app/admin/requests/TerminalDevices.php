<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class TerminalDevices extends FormRequest
{
    public function rules()
    {
        return [
            'provider_code' => ['required', 'in:sumup'],
            'location_id' => ['nullable', 'integer'],
            'affiliate_key' => ['nullable', 'string', 'max:191'],
            'reader_id' => ['nullable', 'string', 'max:191'],
            'reader_label' => ['nullable', 'string', 'max:191'],
            'pairing_state' => ['nullable', 'string', 'max:50'],
            'terminal_status' => ['nullable', 'string', 'max:191'],
            'metadata' => ['nullable'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function attributes()
    {
        return [
            'provider_code' => 'Provider Type',
            'location_id' => 'Location',
            'affiliate_key' => 'Affiliate Key',
            'reader_id' => 'Reader ID',
            'reader_label' => 'Reader Label',
            'pairing_state' => 'Pairing State',
            'terminal_status' => 'Terminal Status',
        ];
    }
}
