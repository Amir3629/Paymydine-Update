<?php

namespace Admin\Requests;

use Admin\Models\Terminal_devices_model;
use Illuminate\Validation\Rule;
use System\Classes\FormRequest;

class TerminalDevices extends FormRequest
{
    public function rules()
    {
        // PMD_SQUARE_TERMINAL_CANADA_R7_REQUEST
        // Server-side validation uses the same market-scoped provider list as
        // Settings > Devices. This prevents a tenant from POSTing a terminal
        // provider that is unavailable for its active restaurant market.
        $providerCodes = array_keys(Terminal_devices_model::listProviderOptions());

        return [
            'provider_code' => ['required', Rule::in($providerCodes)],
            'environment' => ['nullable', Rule::in(['test', 'production', 'live'])],
            'location_id' => ['nullable', 'integer'],
            'affiliate_key' => ['nullable', 'string', 'max:191'],
            // SumUp uses rdr_..., Square uses UUID/device: IDs, and the other
            // providers use their own alphanumeric terminal identifiers.
            'reader_id' => ['nullable', 'string', 'max:191', 'regex:/^[A-Za-z0-9][A-Za-z0-9:._-]*$/'],
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
            'environment' => 'Environment',
            'location_id' => 'Location',
            'affiliate_key' => 'Affiliate Key',
            'reader_id' => 'Reader ID',
            'reader_label' => 'Reader Label',
            'pairing_state' => 'Pairing State',
            'terminal_status' => 'Terminal Status',
        ];
    }
}
