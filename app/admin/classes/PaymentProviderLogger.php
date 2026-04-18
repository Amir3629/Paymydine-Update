<?php

namespace Admin\Classes;

class PaymentProviderLogger
{
    protected array $sensitivePatterns = [
        'secret',
        'token',
        'password',
        'api_key',
        'authorization',
        'client_secret',
        'webhook',
    ];

    public function sanitize($value)
    {
        if (is_array($value)) {
            $out = [];
            foreach ($value as $k => $v) {
                $key = (string)$k;
                if ($this->isSensitiveKey($key)) {
                    $out[$key] = is_string($v) && $v !== '' ? '***redacted***' : $v;
                    continue;
                }
                $out[$key] = $this->sanitize($v);
            }
            return $out;
        }

        if (is_object($value)) {
            return $this->sanitize(json_decode(json_encode($value), true) ?: []);
        }

        return $value;
    }

    public function error(string $message, array $context = []): void
    {
        \Log::error($message, $this->sanitize($context));
    }

    public function info(string $message, array $context = []): void
    {
        \Log::info($message, $this->sanitize($context));
    }

    protected function isSensitiveKey(string $key): bool
    {
        $key = strtolower($key);
        foreach ($this->sensitivePatterns as $pattern) {
            if (str_contains($key, $pattern)) {
                return true;
            }
        }

        return false;
    }
}

