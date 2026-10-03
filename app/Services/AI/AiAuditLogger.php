<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Log;

final class AiAuditLogger
{
    public function write(string $event, AiContext $context, array $meta = []): void
    {
        $payload = array_merge($context->audit(), [
            'event' => $event,
            'provider' => (string)config('pmd_ai.provider', 'openai'),
            'model' => (string)config('pmd_ai.model', ''),
            'read_only' => (bool)config('pmd_ai.read_only', true),
        ], $this->redact($meta));

        $channel = config('pmd_ai.audit_log_channel');
        if ($channel) {
            Log::channel($channel)->info('PMD AI', $payload);
            return;
        }

        Log::info('PMD AI', $payload);
    }

    private function redact(array $value): array
    {
        $blocked = ['api_key', 'authorization', 'password', 'token', 'secret', 'cookie'];
        $walk = function ($item, $key = null) use (&$walk, $blocked) {
            if ($key !== null) {
                $lower = strtolower((string)$key);
                foreach ($blocked as $needle) {
                    if (strpos($lower, $needle) !== false) {
                        return '[REDACTED]';
                    }
                }
            }
            if (is_array($item)) {
                $out = [];
                foreach ($item as $k => $v) {
                    $out[$k] = $walk($v, $k);
                }
                return $out;
            }
            return $item;
        };

        return $walk($value);
    }
}
