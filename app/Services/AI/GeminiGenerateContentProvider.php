<?php

namespace App\Services\AI;

use RuntimeException;

final class GeminiGenerateContentProvider implements AiProvider
{
    public function create(array $payload): array
    {
        $key = trim((string)config('pmd_ai.gemini_api_key', ''));
        if ($key === '') {
            throw new RuntimeException('GEMINI_API_KEY is not configured on the server.');
        }

        if (!function_exists('curl_init')) {
            throw new RuntimeException('PHP cURL extension is required for PMD Intelligence.');
        }

        $model = trim((string)($payload['model'] ?? config('pmd_ai.model', 'gemini-3.7-flash')));
        if ($model === '') {
            $model = 'gemini-3.7-flash';
        }

        $baseUrl = rtrim(
            (string)config(
                'pmd_ai.gemini_base_url',
                'https://generativelanguage.googleapis.com'
            ),
            '/'
        );
        $url = $baseUrl.'/v1beta/models/'.rawurlencode($model).':generateContent';
        $timeout = max(3, (int)config('pmd_ai.request_timeout_seconds', 25));

        $request = [
            'contents' => $this->translateInput((array)($payload['input'] ?? [])),
            'generationConfig' => [
                'maxOutputTokens' => max(
                    128,
                    (int)($payload['max_output_tokens'] ?? config('pmd_ai.max_output_tokens', 1400))
                ),
                'thinkingConfig' => [
                    'thinkingLevel' => (string)config('pmd_ai.gemini_thinking_level', 'low'),
                ],
            ],
        ];

        $instructions = trim((string)($payload['instructions'] ?? ''));
        if ($instructions !== '') {
            $request['systemInstruction'] = [
                'parts' => [
                    ['text' => $instructions],
                ],
            ];
        }

        $functionDeclarations = $this->functionDeclarations(
            (array)($payload['tools'] ?? [])
        );
        if ($functionDeclarations) {
            $request['tools'] = [[
                'functionDeclarations' => $functionDeclarations,
            ]];
        }

        $requestId = null;
        $started = microtime(true);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => min(8, $timeout),
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_IPRESOLVE => (bool)config('pmd_ai.gemini_force_ipv4', true)
                ? CURL_IPRESOLVE_V4
                : CURL_IPRESOLVE_WHATEVER,
            CURLOPT_HTTPHEADER => [
                'x-goog-api-key: '.$key,
                'x-goog-api-client: paymydine-ai/1.0',
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode(
                $request,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            ),
            CURLOPT_HEADERFUNCTION => function ($curl, $header) use (&$requestId) {
                $length = strlen($header);
                foreach (['x-request-id:', 'x-goog-request-id:'] as $prefix) {
                    if (stripos($header, $prefix) === 0) {
                        $requestId = trim(substr($header, strlen($prefix)));
                        break;
                    }
                }
                return $length;
            },
        ]);

        $raw = curl_exec($ch);
        $curlError = curl_error($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        $latencyMs = (int)round((microtime(true) - $started) * 1000);

        if ($raw === false || $curlError !== '') {
            throw new RuntimeException('Gemini transport failed: '.$curlError);
        }

        $decoded = json_decode((string)$raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Gemini returned an invalid JSON response.');
        }

        if ($status < 200 || $status >= 300) {
            $message = $decoded['error']['message'] ?? ('Gemini HTTP '.$status);
            throw new RuntimeException((string)$message);
        }

        return [
            'body' => $decoded,
            'http_status' => $status,
            'request_id' => $requestId,
            'latency_ms' => $latencyMs,
        ];
    }

    public function outputText(array $response): string
    {
        $parts = [];
        foreach ($this->candidateParts($response) as $part) {
            if (!empty($part['thought'])) {
                continue;
            }
            if (isset($part['text']) && is_string($part['text'])) {
                $text = trim($part['text']);
                if ($text !== '') {
                    $parts[] = $text;
                }
            }
        }

        return trim(implode("\n", $parts));
    }

    public function functionCalls(array $response): array
    {
        $calls = [];

        foreach ($this->candidateParts($response) as $part) {
            $functionCall = $part['functionCall'] ?? null;
            if (!is_array($functionCall)) {
                continue;
            }

            $name = trim((string)($functionCall['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $arguments = $functionCall['args'] ?? [];
            if (!is_array($arguments)) {
                $arguments = [];
            }

            $argumentsJson = $arguments === []
                ? '{}'
                : json_encode(
                    $arguments,
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                );

            $calls[] = [
                'call_id' => (string)($functionCall['id'] ?? ''),
                'name' => $name,
                'arguments' => $argumentsJson,
                'raw' => $functionCall,
            ];
        }

        return $calls;
    }

    public function modelHistoryItems(array $response): array
    {
        $content = $response['candidates'][0]['content'] ?? null;
        if (!is_array($content)) {
            return [];
        }

        // Preserve Gemini's complete model content, including encrypted
        // thoughtSignature fields required by Gemini 3 function-call turns.
        return [[
            'type' => 'gemini_model_content',
            'content' => $content,
        ]];
    }

    public function toolResultItem(array $call, $output): array
    {
        return [
            'type' => 'gemini_function_response',
            'call_id' => (string)($call['call_id'] ?? ''),
            'name' => (string)($call['name'] ?? ''),
            'response' => [
                'result' => $output,
            ],
        ];
    }

    public function usage(array $response): array
    {
        return (array)($response['usageMetadata'] ?? []);
    }

    public function responseModel(array $response): string
    {
        return (string)(
            $response['modelVersion']
            ?? config('pmd_ai.model', 'gemini-3.7-flash')
        );
    }

    public function name(): string
    {
        return 'gemini';
    }

    private function candidateParts(array $response): array
    {
        return array_values(
            (array)($response['candidates'][0]['content']['parts'] ?? [])
        );
    }

    private function translateInput(array $input): array
    {
        $contents = [];
        $pendingFunctionParts = [];

        // Gemini requires responses to parallel function calls from one model
        // turn to be grouped together in the immediately following user turn.
        $flushFunctionResponses = static function () use (&$contents, &$pendingFunctionParts): void {
            if (!$pendingFunctionParts) {
                return;
            }

            $contents[] = [
                'role' => 'user',
                'parts' => $pendingFunctionParts,
            ];
            $pendingFunctionParts = [];
        };

        foreach ($input as $item) {
            if (!is_array($item)) {
                continue;
            }

            if (($item['type'] ?? null) === 'gemini_function_response') {
                $functionResponse = [
                    'name' => (string)($item['name'] ?? ''),
                    'response' => is_array($item['response'] ?? null)
                        ? $item['response']
                        : ['result' => $item['response'] ?? null],
                ];

                $callId = trim((string)($item['call_id'] ?? ''));
                if ($callId !== '') {
                    $functionResponse['id'] = $callId;
                }

                $pendingFunctionParts[] = [
                    'functionResponse' => $functionResponse,
                ];
                continue;
            }

            $flushFunctionResponses();

            if (isset($item['role']) && array_key_exists('content', $item)) {
                $text = trim((string)$item['content']);
                if ($text === '') {
                    continue;
                }

                $contents[] = [
                    'role' => ((string)$item['role'] === 'assistant') ? 'model' : 'user',
                    'parts' => [
                        ['text' => $text],
                    ],
                ];
                continue;
            }

            if (($item['type'] ?? null) === 'gemini_model_content') {
                $content = $item['content'] ?? null;
                if (is_array($content)) {
                    $contents[] = $this->normalizeModelContentForReplay($content);
                }
            }
        }

        $flushFunctionResponses();

        if (!$contents) {
            throw new RuntimeException('Gemini request has no conversation content.');
        }

        return $contents;
    }

    private function normalizeModelContentForReplay(array $content): array
    {
        $parts = $content['parts'] ?? null;
        if (!is_array($parts)) {
            return $content;
        }

        foreach ($parts as $index => $part) {
            if (!is_array($part)) {
                continue;
            }

            $functionCall = $part['functionCall'] ?? null;
            if (!is_array($functionCall)) {
                continue;
            }

            // json_decode(..., true) cannot retain the distinction between
            // an empty JSON object and an empty JSON array. Gemini function
            // args are an object, so restore {} before replaying model history.
            if (($functionCall['args'] ?? null) === []) {
                $functionCall['args'] = (object)[];
            }

            $part['functionCall'] = $functionCall;
            $parts[$index] = $part;
        }

        $content['parts'] = $parts;
        return $content;
    }

    private function functionDeclarations(array $tools): array
    {
        $declarations = [];

        foreach ($tools as $tool) {
            if (!is_array($tool) || ($tool['type'] ?? null) !== 'function') {
                continue;
            }

            $name = trim((string)($tool['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $declaration = [
                'name' => $name,
                'description' => (string)($tool['description'] ?? ''),
                'parameters' => $this->normalizeSchema(
                    $tool['parameters'] ?? [
                        'type' => 'object',
                        'properties' => (object)[],
                    ]
                ),
            ];

            $declarations[] = $declaration;
        }

        return $declarations;
    }

    private function normalizeSchema($value)
    {
        if (is_object($value)) {
            $value = get_object_vars($value);
        }

        if (!is_array($value)) {
            return $value;
        }

        $normalized = [];
        foreach ($value as $key => $child) {
            if (in_array((string)$key, ['additionalProperties', 'strict', '$schema'], true)) {
                continue;
            }

            $normalized[$key] = $this->normalizeSchema($child);

            if ($key === 'properties' && $normalized[$key] === []) {
                $normalized[$key] = (object)[];
            }
        }

        return $normalized;
    }
}
