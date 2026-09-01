<?php

namespace App\Services\AI;

final class AiRedactor
{
    private array $blockedKeys = [
        'password', 'passcode', 'pin', 'secret', 'token', 'api_key',
        'authorization', 'cookie', 'card_number', 'pan', 'cvv', 'cvc',
        'iban', 'account_number', 'email', 'phone', 'telephone',
        'mobile', 'address', 'ip_address', 'device_token',
    ];

    public function forModel($value, $key = null)
    {
        if ($key !== null && $this->blocked((string)$key)) {
            return '[REDACTED]';
        }

        if (is_array($value)) {
            $out = [];
            foreach ($value as $childKey => $childValue) {
                $out[$childKey] = $this->forModel($childValue, $childKey);
            }
            return $out;
        }

        if (is_object($value)) {
            return $this->forModel((array)$value, $key);
        }

        if (is_string($value)) {
            $value = preg_replace('/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i', '[REDACTED_EMAIL]', $value);
            $value = preg_replace('/(?<!\d)(?:\d[ -]?){13,19}(?!\d)/', '[REDACTED_NUMBER]', $value);
            $value = preg_replace('/\bsk-[A-Za-z0-9_\-]{12,}\b/', '[REDACTED_API_KEY]', $value);
            $value = preg_replace('/\bBearer\s+[A-Za-z0-9._\-]{12,}\b/i', 'Bearer [REDACTED]', $value);
        }

        return $value;
    }

    private function blocked(string $key): bool
    {
        $key = strtolower($key);
        foreach ($this->blockedKeys as $needle) {
            if ($key === $needle || strpos($key, $needle) !== false) {
                return true;
            }
        }
        return false;
    }
}
