<?php

// Pure routing tests. No Laravel, network, tenant database, real Meta IDs.
require __DIR__.'/../app/Services/WhatsApp/PmdSharedWhatsAppRoutingPolicy.php';

use App\Services\WhatsApp\PmdSharedWhatsAppRoutingPolicy;

function check(bool $value, string $label): void
{
    if (!$value) {
        fwrite(STDERR, 'FAIL: '.$label.PHP_EOL);
        exit(1);
    }
    echo 'PASS: '.$label.PHP_EOL;
}

$policy = new PmdSharedWhatsAppRoutingPolicy();
$hash = str_repeat('a', 64);
$valid = (object)[
    'external_message_id' => 'wamid.sent_to_client_1',
    'sender_id' => 7,
    'wa_id_hash' => $hash,
    'direction' => 'out',
    'tenant_id' => 101,
    'location_id' => 5,
    'reservation_id' => 708,
    'received_at' => gmdate('Y-m-d H:i:s', time() - 90),
    'binding_enabled' => 1,
    'sender_enabled' => 1,
    'tenant_status' => 'active',
];
$chosen = $policy->choose(
    'wamid.sent_to_client_1', 7, $hash, [$valid], time() - 30 * 86400
);
check($chosen && $chosen->tenant_id === 101 && $chosen->reservation_id === 708,
    'Exact signed Meta reply-to message + customer hash returns correct tenant and reservation.');
check($policy->choose('', 7, $hash, [$valid], time() - 30 * 86400) === null,
    'Plain incoming text without Meta context is NEVER routed.');
check($policy->choose('wamid.unrelated', 7, $hash, [$valid], time() - 30 * 86400) === null,
    'Unrelated message ID cannot route.');
check($policy->choose('wamid.sent_to_client_1', 8, $hash, [$valid], time() - 30 * 86400) === null,
    'Wrong shared platform sender cannot route.');
check($policy->choose('wamid.sent_to_client_1', 7, str_repeat('b',64), [$valid], time() - 30 * 86400) === null,
    'Another customer cannot replay a valid reply context.');
check($policy->choose('wamid.sent_to_client_1', 7, $hash, [$valid, clone $valid], time() - 30 * 86400) === null,
    'Multiple matching candidates are ambiguous and never routed.');
check($policy->choose('wamid.sent_to_client_1', 7, $hash, [], time() - 30 * 86400) === null,
    'No matching outbound reference never routes.');

foreach ([
    ['binding_enabled', 0],
    ['sender_enabled', 0],
    ['tenant_status', 'suspended'],
    ['direction', 'in'],
    ['tenant_id', 0],
    ['location_id', 0],
    ['received_at', gmdate('Y-m-d H:i:s', time() - 35 * 86400)],
] as [$key, $value]) {
    $copy = clone $valid;
    $copy->$key = $value;
    check($policy->choose('wamid.sent_to_client_1', 7, $hash, [$copy], time() - 30 * 86400) === null,
        'Closed or invalid routing state rejected: '.$key);
}

echo "PASS: R33 cross-tenant isolation and unassigned-message routing contracts.".PHP_EOL;
