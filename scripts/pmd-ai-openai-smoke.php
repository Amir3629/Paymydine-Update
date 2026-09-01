<?php

/**
 * Secret-safe PMD OpenAI connectivity smoke test.
 *
 * Usage from repository root:
 *   php scripts/pmd-ai-openai-smoke.php
 *
 * OPENAI_API_KEY may come from Laravel config or an exported environment
 * variable for this one process. The key is never printed. The environment
 * override also lets this smoke run safely before changing a production
 * config cache.
 */

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$processKey = getenv('OPENAI_API_KEY');
if (is_string($processKey) && trim($processKey) !== '') {
    config(['pmd_ai.openai_api_key' => trim($processKey)]);
}

$processModel = getenv('PMD_AI_MODEL');
if (is_string($processModel) && trim($processModel) !== '') {
    config(['pmd_ai.model' => trim($processModel)]);
}

$processBaseUrl = getenv('OPENAI_BASE_URL');
config([
    'pmd_ai.openai_base_url' => rtrim(
        is_string($processBaseUrl) && trim($processBaseUrl) !== ''
            ? trim($processBaseUrl)
            : (string)config('pmd_ai.openai_base_url', 'https://api.openai.com/v1'),
        '/'
    ),
    'pmd_ai.request_timeout_seconds' => max(
        3,
        (int)(getenv('PMD_AI_TIMEOUT_SECONDS') ?: config('pmd_ai.request_timeout_seconds', 25))
    ),
    'pmd_ai.store_provider_response' => false,
]);

$keyPresent = trim((string)config('pmd_ai.openai_api_key', '')) !== '';
echo 'OPENAI_API_KEY: '.($keyPresent ? 'PRESENT' : 'MISSING').PHP_EOL;
echo 'PMD_AI_ENABLED: '.((bool)config('pmd_ai.enabled', false) ? 'true' : 'false').PHP_EOL;
echo 'PMD_AI_MODEL: '.(string)config('pmd_ai.model', 'gpt-5.6-luna').PHP_EOL;

if (!$keyPresent) {
    fwrite(STDERR, 'Smoke test stopped: provide OPENAI_API_KEY server-side or export it for this shell process.'.PHP_EOL);
    exit(2);
}

try {
    $provider = app(App\Services\AI\OpenAiResponsesProvider::class);
    $result = $provider->create([
        'model' => (string)config('pmd_ai.model', 'gpt-5.6-luna'),
        'input' => 'Reply with exactly PMD_OPENAI_OK.',
        'max_output_tokens' => 40,
        'store' => false,
    ]);

    $text = $provider->outputText((array)$result['body']);
    echo 'HTTP: '.(int)$result['http_status'].PHP_EOL;
    echo 'REQUEST_ID: '.($result['request_id'] ?: 'not-returned').PHP_EOL;
    echo 'LATENCY_MS: '.(int)$result['latency_ms'].PHP_EOL;
    echo 'OUTPUT: '.$text.PHP_EOL;

    if (trim($text) !== 'PMD_OPENAI_OK') {
        fwrite(STDERR, 'Smoke test reached OpenAI but output validation failed.'.PHP_EOL);
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
