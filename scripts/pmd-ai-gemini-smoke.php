<?php

/**
 * Secret-safe PMD Gemini connectivity smoke test.
 *
 * Usage from repository root:
 *   php scripts/pmd-ai-gemini-smoke.php
 *
 * GEMINI_API_KEY may come from Laravel config or an exported environment
 * variable for this one process. The key is never printed.
 */

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$processKey = getenv('GEMINI_API_KEY');
if (is_string($processKey) && trim($processKey) !== '') {
    config(['pmd_ai.gemini_api_key' => trim($processKey)]);
}

$processModel = getenv('PMD_AI_MODEL');
if (is_string($processModel) && trim($processModel) !== '') {
    config(['pmd_ai.model' => trim($processModel)]);
}

$processBaseUrl = getenv('GEMINI_BASE_URL');
if (is_string($processBaseUrl) && trim($processBaseUrl) !== '') {
    config(['pmd_ai.gemini_base_url' => rtrim(trim($processBaseUrl), '/')]);
}

config([
    'pmd_ai.provider' => 'gemini',
    'pmd_ai.gemini_thinking_level' => 'low',
    'pmd_ai.store_provider_response' => false,
]);

$keyPresent = trim((string)config('pmd_ai.gemini_api_key', '')) !== '';
echo 'GEMINI_API_KEY: '.($keyPresent ? 'PRESENT' : 'MISSING').PHP_EOL;
echo 'PMD_AI_PROVIDER: gemini'.PHP_EOL;
echo 'PMD_AI_MODEL: '.(string)config('pmd_ai.model', 'gemini-3.7-flash').PHP_EOL;

if (!$keyPresent) {
    fwrite(
        STDERR,
        'Smoke test stopped: provide GEMINI_API_KEY server-side or export it for this shell process.'.PHP_EOL
    );
    exit(2);
}

try {
    $provider = app(App\Services\AI\GeminiGenerateContentProvider::class);
    $result = $provider->create([
        'model' => (string)config('pmd_ai.model', 'gemini-3.7-flash'),
        'instructions' => 'Return only the exact requested text. Do not add punctuation or formatting.',
        'input' => [[
            'role' => 'user',
            'content' => 'Reply with exactly PMD_GEMINI_OK.',
        ]],
        'tools' => [],
        'max_output_tokens' => 128,
        'store' => false,
    ]);

    $text = $provider->outputText((array)$result['body']);
    echo 'HTTP: '.(int)$result['http_status'].PHP_EOL;
    echo 'REQUEST_ID: '.($result['request_id'] ?: 'not-returned').PHP_EOL;
    echo 'LATENCY_MS: '.(int)$result['latency_ms'].PHP_EOL;
    echo 'OUTPUT: '.$text.PHP_EOL;

    if (trim($text) !== 'PMD_GEMINI_OK') {
        fwrite(
            STDERR,
            'Smoke test reached Gemini but output validation failed.'.PHP_EOL
        );
        exit(3);
    }

    echo 'RESULT: PASS'.PHP_EOL;
    exit(0);
} catch (Throwable $error) {
    fwrite(STDERR, 'RESULT: FAIL'.PHP_EOL);
    fwrite(STDERR, 'ERROR_TYPE: '.get_class($error).PHP_EOL);
    fwrite(STDERR, 'ERROR: '.$error->getMessage().PHP_EOL);
    exit(1);
}
