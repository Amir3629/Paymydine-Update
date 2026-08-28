<?php

return [
    // PMD_PAYMOB_OMAN_CONFIG_R11
    // Test-only software QA gate. Production guest readiness remains controlled
    // separately in PaymobOmanRuntimeGate::guestReady().
    'sandbox_qa' => env('PMD_PAYMOB_OMAN_SANDBOX_QA', false),
];
