<?php
declare(strict_types=1);

$accountToken = $_GET['accountToken'] ?? '';
$grantAccessToken = $_GET['grantAccessToken'] ?? '';
$status = $_GET['status'] ?? '';

function fp(string $t): array {
    $t = trim($t);
    return [
        'len' => strlen($t),
        'prefix10' => $t !== '' ? substr($t, 0, 10) : '',
        'suffix10' => $t !== '' ? substr($t, -10) : '',
    ];
}

$dir = '/var/www/paymydine/storage/app';
@mkdir($dir, 0770, true);

if ($accountToken !== '') {
    file_put_contents($dir.'/r2o_account_token.txt', trim($accountToken));
}

header('Content-Type: text/plain; charset=utf-8');
echo "ready2order callback received\n";
echo "status={$status}\n";
echo "accountToken_fp=" . json_encode(fp((string)$accountToken), JSON_UNESCAPED_SLASHES) . "\n";
echo "grantAccessToken_fp=" . json_encode(fp((string)$grantAccessToken), JSON_UNESCAPED_SLASHES) . "\n";
echo "saved=" . ($accountToken !== '' ? 'yes' : 'no') . "\n";
