<?php

/**
 * Secret-safe PMD OpenAI connectivity smoke test.
 *
 * Usage from repository root:
 *   php scripts/pmd-ai-openai-smoke.php
 *
 * It reads OPENAI_API_KEY through Laravel config and never prints the key.
 */

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$keyPresent = trim((string)config('pmd_ai.openai_api_key', '')) !== '';
echo 'OPENAI_API_KEY: '.($keyPresent ? 'PRESENT' : 'MISSING').PHP_EOL;
echo 'PMD_AI_ENABLED: '.((bool)config('pmd_ai.enabled', false) ? 'true' : 'false').PHP_EOL;
echo 'PMD_AI_MODEL: '.(string)config('pmd_ai.model', 'gpt-5.6-luna').PHP_EOL;

if (!$keyPresent) {
    fwrite(STDERR, 'Smoke test stopped: configure OPENAI_API_KEY server-side first.'.PHP_EOL);
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
