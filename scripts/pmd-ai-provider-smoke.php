<?php

use App\Services\AI\AiHealthService;
use App\Services\AI\GeminiGenerateContentProvider;
use App\Services\AI\OpenAiResponsesProvider;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$providerName = strtolower(trim((string)config('pmd_ai.provider', '')));
$model = trim((string)config('pmd_ai.model', ''));
$health = app(AiHealthService::class);

if (!$health->configured($providerName, $model)) {
    fwrite(STDERR, "RESULT: FAIL\nREASON: PMD AI provider/model/key is not explicitly configured.\n");
    exit(10);
}

$provider = match ($providerName) {
    'gemini' => new GeminiGenerateContentProvider(),
    'openai' => new OpenAiResponsesProvider(),
    default => null,
};

if (!$provider) {
    fwrite(STDERR, "RESULT: FAIL\nREASON: Unsupported provider.\n");
    exit(11);
}

try {
    $result = $provider->create([
        'model' => $model,
        'instructions' => 'Return exactly PMD_PROVIDER_OK and nothing else.',
        'input' => [[
            'role' => 'user',
            'content' => 'Reply exactly PMD_PROVIDER_OK',
        ]],
        'tools' => [],
        'tool_choice' => 'auto',
        'max_output_tokens' => 256,
        'store' => false,
    ]);

    $body = (array)($result['body'] ?? []);
    $text = trim($provider->outputText($body));
    $latency = (int)($result['latency_ms'] ?? 0);

    if ($text !== 'PMD_PROVIDER_OK') {
        throw new RuntimeException('Provider returned unexpected smoke output.');
    }

    $health->markSuccess($providerName, $model, $latency);

    echo 'HTTP: '.(int)($result['http_status'] ?? 0).PHP_EOL;
    echo 'PROVIDER: '.$providerName.PHP_EOL;
    echo 'MODEL: '.$provider->responseModel($body).PHP_EOL;
    echo 'LATENCY_MS: '.$latency.PHP_EOL;
    echo 'OUTPUT: '.$text.PHP_EOL;
    echo "RESULT: PASS\n";
} catch (Throwable $error) {
    $state = $health->markFailure($providerName, $model, $error);
    echo "RESULT: FAIL\n";
    echo 'ERROR_CLASS: '.($state['last_error_class'] ?? 'provider').PHP_EOL;
    echo 'MESSAGE: '.$error->getMessage().PHP_EOL;
    exit(20);
}
