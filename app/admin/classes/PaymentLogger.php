<?php

namespace Admin\Classes;

use Illuminate\Support\Facades\Log;

class PaymentLogger
{
    public static function info(string $message, array $context = []): void
    {
        Log::info($message, self::normalizeContext($context));
    }

    public static function warning(string $message, array $context = []): void
    {
        Log::warning($message, self::normalizeContext($context));
    }

    public static function error(string $message, array $context = []): void
    {
        Log::error($message, self::normalizeContext($context));
    }

    public static function exception(string $message, \Throwable $exception, array $context = []): void
    {
        self::error($message, array_merge($context, [
            'error_class' => get_class($exception),
            'error_message' => $exception->getMessage(),
            'error_code' => method_exists($exception, 'getCode') ? $exception->getCode() : null,
            'provider_error_id' => method_exists($exception, 'getErrorId') ? $exception->getErrorId() : null,
            'provider_status_code' => method_exists($exception, 'getStatusCode') ? $exception->getStatusCode() : null,
            'provider_response_body' => method_exists($exception, 'getResponseBody') ? self::truncate((string)$exception->getResponseBody(), 2000) : null,
        ]));
    }

    private static function normalizeContext(array $context): array
    {
        $request = request();

        $defaultContext = [
            'provider' => $context['provider'] ?? null,
            'payment_method' => $context['payment_method'] ?? null,
            'host' => $request ? $request->getHost() : null,
            'tenant' => $request ? $request->header('X-Tenant', null) : null,
            'request_meta' => $context['request_meta'] ?? [],
            'response_meta' => $context['response_meta'] ?? [],
        ];

        $combined = array_merge($defaultContext, $context);

        return self::sanitize($combined);
    }

    private static function sanitize(array $payload): array
    {
        $sanitized = [];

        foreach ($payload as $key => $value) {
            $stringKey = (string)$key;

            if (is_array($value)) {
                $sanitized[$stringKey] = self::sanitize($value);
                continue;
            }

            if (is_object($value)) {
                $sanitized[$stringKey] = self::sanitize((array)$value);
                continue;
            }

            if (preg_match('/secret|token|password|api[_-]?key|authorization/i', $stringKey)) {
                $sanitized[$stringKey] = self::redactValue($value);
                continue;
            }

            if (is_string($value)) {
                $sanitized[$stringKey] = self::truncate($value, 2000);
                continue;
            }

            $sanitized[$stringKey] = $value;
        }

        return $sanitized;
    }

    private static function redactValue($value)
    {
        if (!is_string($value)) {
            return $value;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }

        if (strlen($trimmed) <= 6) {
            return '***';
        }

        return substr($trimmed, 0, 3).'***'.substr($trimmed, -2);
    }

    private static function truncate(string $value, int $maxLength): string
    {
        if (mb_strlen($value) <= $maxLength) {
            return $value;
        }

        return mb_substr($value, 0, $maxLength).'…';
    }
}
