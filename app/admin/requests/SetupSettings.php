<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class SetupSettings extends FormRequest
{
    public function attributes()
    {
        return [
            'order_email.*' => lang('system::lang.settings.label_order_email'),
            'processing_order_status' => lang('system::lang.settings.label_processing_order_status'),
            'completed_order_status' => lang('system::lang.settings.label_completed_order_status'),
            'canceled_order_status' => lang('system::lang.settings.label_canceled_order_status'),
            'default_reservation_status' => lang('system::lang.settings.label_default_reservation_status'),
            'confirmed_reservation_status' => lang('system::lang.settings.label_confirmed_reservation_status'),
            'canceled_reservation_status' => lang('system::lang.settings.label_canceled_reservation_status'),
            'menus_page' => lang('system::lang.settings.label_menus_page'),
            'reservation_page' => lang('system::lang.settings.label_reservation_page'),
            'guest_order' => lang('system::lang.settings.label_guest_order'),
            'location_order' => lang('system::lang.settings.label_location_order'),
            'invoice_prefix' => lang('system::lang.settings.label_invoice_prefix'),
            'invoice_logo' => lang('system::lang.settings.label_invoice_logo'),
            'invoice_receipt_mode' => lang('system::lang.settings.label_invoice_receipt_mode'),
            'invoice_paper_width' => lang('system::lang.settings.label_invoice_paper_width'),
            'invoice_auto_print_after_paid' => lang('system::lang.settings.label_invoice_auto_print_after_paid'),
            'invoice_auto_print_dialog' => lang('system::lang.settings.label_invoice_auto_print_dialog'),
            'invoice_show_logo' => lang('system::lang.settings.label_invoice_show_logo'),
            'invoice_show_qr' => lang('system::lang.settings.label_invoice_show_qr'),
            'invoice_show_fiskaly' => lang('system::lang.settings.label_invoice_show_fiskaly'),
            'invoice_compact_mode' => lang('system::lang.settings.label_invoice_compact_mode'),
            'invoice_font_size_preset' => lang('system::lang.settings.label_invoice_font_size_preset'),
            'invoice_print_hint' => lang('system::lang.settings.label_invoice_print_hint'),
            'invoice_customer_template' => 'Customer Invoice Template',
            'invoice_customer_footer_text' => 'Customer Invoice Footer',
            'enable_customer_eta' => 'Show ETA to customers',
            'smart_eta_enabled' => 'Smart ETA',
            'eta_default_prep_minutes' => 'Default prep time',
            'eta_order_load_window_minutes' => 'Kitchen load window',
            'eta_busy_item_threshold' => 'Busy threshold',
            'eta_very_busy_item_threshold' => 'Very busy threshold',
            'eta_busy_extra_minutes' => 'Busy extra minutes',
            'eta_very_busy_extra_minutes' => 'Very busy extra minutes',
            'eta_round_to_nearest_minutes' => 'Round ETA',
            'eta_max_minutes' => 'Maximum ETA',
            'eta_hint_text' => 'ETA note',
        ];
    }

    public function rules()
    {
        return [
            'order_email.*' => ['required', 'alpha'],
            'processing_order_status' => ['required'],
            'completed_order_status' => ['required'],
            'canceled_order_status' => ['required', 'integer'],
            'default_reservation_status' => ['nullable', 'integer'],
            'confirmed_reservation_status' => ['nullable', 'integer'],
            'canceled_reservation_status' => ['nullable', 'integer'],
            'guest_order' => ['required', 'integer'],
            'location_order' => ['required', 'integer'],
            'invoice_logo' => ['nullable'],
            'invoice_paper_width' => ['nullable', 'in:58mm,80mm,112mm,a4'],
            'invoice_font_size_preset' => ['nullable', 'in:small,normal'],
            'invoice_print_hint' => ['nullable', 'string'],
            'invoice_customer_template' => ['nullable', 'in:classic,modern,minimal'],
            'invoice_customer_footer_text' => ['nullable', 'string'],
            'enable_customer_eta' => ['nullable','integer'],
            'smart_eta_enabled' => ['nullable','integer'],
            'eta_default_prep_minutes' => ['nullable','integer','min:1','max:240'],
            'eta_order_load_window_minutes' => ['nullable','integer','in:15,30,45,60'],
            'eta_busy_item_threshold' => ['nullable','integer','min:1','max:200'],
            'eta_very_busy_item_threshold' => ['nullable','integer','min:1','max:300'],
            'eta_busy_extra_minutes' => ['nullable','integer','min:0','max:120'],
            'eta_very_busy_extra_minutes' => ['nullable','integer','min:0','max:180'],
            'eta_round_to_nearest_minutes' => ['nullable','integer','in:1,5,10'],
            'eta_max_minutes' => ['nullable','integer','min:10','max:240'],
            'eta_hint_text' => ['nullable','string'],
            'eta_use_staff_attendance' => ['nullable','integer'],
            'eta_expected_kitchen_staff' => ['nullable','integer','min:1','max:50'],
            'eta_understaffed_extra_minutes' => ['nullable','integer','min:0','max:60'],
        ];
    }

    /**
     * PMD_LOGO_SAVE_GUARD
     *
     * Prevent setup/general saves from overwriting real tenant logo paths
     * with empty MediaFinder placeholders like images.png/images.jpeg.
     */
    protected function prepareForValidation()
    {
        if (method_exists(get_parent_class($this), 'prepareForValidation')) {
            parent::prepareForValidation();
        }

        $all = $this->all();
        $logoKeys = ['site_logo', 'dashboard_logo', 'favicon_logo', 'restaurant_logo', 'invoice_logo'];
        $merge = [];

        foreach ($logoKeys as $key) {
            if (!array_key_exists($key, $all)) {
                continue;
            }

            $normalized = $this->pmdNormalizeLogoValue($all[$key]);

            if ($normalized === null || $this->pmdIsBrokenLogoValue($normalized)) {
                $existing = $this->pmdTenantSettingValue($key);

                if ($key === 'invoice_logo' && ($existing === null || $existing === '')) {
                    $existing = $this->pmdTenantSettingValue('site_logo')
                        ?: $this->pmdTenantSettingValue('dashboard_logo');
                }

                if ($existing !== null && $existing !== '' && !$this->pmdIsBrokenLogoValue($existing)) {
                    $normalized = $existing;
                } else {
                    $normalized = '';
                }
            }

            $merge[$key] = $normalized;
        }

        if (!empty($merge)) {
            $this->merge($merge);
        }
    }

    private function pmdNormalizeLogoValue($value)
    {
        if (is_array($value)) {
            foreach (['path', 'publicUrl', 'url', 'file', 'value', 'name'] as $candidateKey) {
                if (array_key_exists($candidateKey, $value) && $value[$candidateKey]) {
                    return $this->pmdNormalizeLogoValue($value[$candidateKey]);
                }
            }

            foreach ($value as $item) {
                $normalized = $this->pmdNormalizeLogoValue($item);
                if ($normalized !== null && $normalized !== '') {
                    return $normalized;
                }
            }

            return null;
        }

        if (is_object($value)) {
            return $this->pmdNormalizeLogoValue((array)$value);
        }

        $value = trim((string)$value);

        if ($value === '') {
            return null;
        }

        $value = strtok($value, '?') ?: $value;

        if (preg_match('~/assets/media/uploads/([^/]+)$~', $value, $m)) {
            return '/'.$m[1];
        }

        if (preg_match('~^https?://~i', $value)) {
            $path = parse_url($value, PHP_URL_PATH);
            if ($path && preg_match('~/assets/media/uploads/([^/]+)$~', $path, $m)) {
                return '/'.$m[1];
            }
        }

        return $value;
    }

    private function pmdIsBrokenLogoValue($value)
    {
        $value = trim((string)$value);

        if ($value === '') {
            return true;
        }

        $base = basename(strtok($value, '?') ?: $value);
        $lower = strtolower($base);

        if (in_array($lower, ['images.png', 'images.jpeg', 'image.png', 'image.jpeg', 'placeholder.svg', 'no-image.png'], true)) {
            return true;
        }

        if (preg_match('~\.(png|jpe?g|webp|svg)$~i', $base)) {
            $file = public_path('assets/media/uploads/'.$base);
            if (!is_file($file)) {
                return true;
            }
        }

        return false;
    }

    private function pmdTenantSettingValue($key)
    {
        try {
            $value = \Illuminate\Support\Facades\DB::table('settings')
                ->where('item', $key)
                ->value('value');

            if (is_string($value)) {
                return trim($value);
            }

            return $value;
        } catch (\Throwable $e) {
            return null;
        }
    }

}
