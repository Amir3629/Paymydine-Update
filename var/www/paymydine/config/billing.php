<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Billing tax display mode
    |--------------------------------------------------------------------------
    | included   => item prices already include VAT, but VAT amount is shown
    | add_at_end => VAT is added as a separate line at the end
    */
    'tax_mode' => env('PMD_TAX_MODE', 'included'),

    /*
    |--------------------------------------------------------------------------
    | Tip handling in stored bill snapshot
    |--------------------------------------------------------------------------
    */
    'tip_label' => env('PMD_TIP_LABEL', 'Tip'),

    /*
    |--------------------------------------------------------------------------
    | Money rounding
    |--------------------------------------------------------------------------
    */
    'round_scale' => 2,
];
