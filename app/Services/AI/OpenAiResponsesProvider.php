<?php

namespace App\Services\AI;

use RuntimeException;

final class OpenAiResponsesProvider implements AiProvider
{
    public function create(array $payload): array
    {
        $key = trim((string)config('pmd_ai.openai_api_key', ''));
        if ($key === '') {
            throw new RuntimeException('OPENAI_API_KEY is not configured on the server.');
        }

        if (!function_exists('curl_init')) {
            throw new RuntimeException('PHP cURL extension is required for PMD Intelligence.');
        }

        $url = (string)config('pmd_ai.openai_base_url', 'https://api.openai.com/v1').'/responses';
        $timeout = max(3, (int)config('pmd_ai.request_timeout_seconds', 25));
        $requestId = null;
        $started = microtime(true);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => min(8, $timeout),
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer '.$key,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            CURLOPT_HEADERFUNCTION => function ($curl, $header) use (&$requestId) {
                $length = strlen($header);
                if (stripos($header, 'x-request-id:') === 0) {
                    $requestId = trim(substr($header, strlen('x-request-id:')));
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
            throw new RuntimeException('OpenAI transport failed: '.$curlError);
        }

        $decoded = json_decode((string)$raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('OpenAI returned an invalid JSON response.');
        }

        if ($status < 200 || $status >= 300) {
            $message = $decoded['error']['message'] ?? ('OpenAI HTTP '.$status);
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
        foreach ((array)($response['output'] ?? []) as $item) {
            if (($item['type'] ?? null) !== 'message') {
                continue;
            }
            foreach ((array)($item['content'] ?? []) as $content) {
                if (($content['type'] ?? null) === 'output_text' && isset($content['text'])) {
                    $parts[] = (string)$content['text'];
                }
            }
        }
        return trim(implode("\n", $parts));
    }

    public function functionCalls(array $response): array
    {
        $calls = [];
        foreach ((array)($response['output'] ?? []) as $item) {
            if (($item['type'] ?? null) !== 'function_call') {
                continue;
            }
            $calls[] = [
                'call_id' => (string)($item['call_id'] ?? ''),
                'name' => (string)($item['name'] ?? ''),
                'arguments' => (string)($item['arguments'] ?? '{}'),
                'raw' => $item,
            ];
        }
        return $calls;
    }

    public function modelHistoryItems(array $response): array
    {
        return array_values((array)($response['output'] ?? []));
    }

    public function toolResultItem(array $call, $output): array
    {
        return [
            'type' => 'function_call_output',
            'call_id' => (string)($call['call_id'] ?? ''),
            'output' => json_encode(
                $output,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            ),
        ];
    }

    public function usage(array $response): array
    {
        return (array)($response['usage'] ?? []);
    }

    public function responseModel(array $response): string
    {
        return (string)($response['model'] ?? config('pmd_ai.model', 'gpt-5.6-luna'));
    }

    public function name(): string
    {
        return 'openai';
    }
}
