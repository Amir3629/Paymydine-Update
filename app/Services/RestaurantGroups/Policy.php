<?php

namespace App\Services\RestaurantGroups;

final class Policy
{
    public const TYPES = ['independent', 'multi_location', 'food_court'];

    public static function type(string $value): string
    {
        $value = strtolower(trim($value));
        if (!in_array($value, self::TYPES, true)) {
            throw new \InvalidArgumentException('Choose a valid business account type.');
        }
        return $value;
    }

    public static function slug(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/\.paymydine\.com$/', '', $value) ?? '';

        if (
            !preg_match('/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/D', $value)
            || in_array($value, ['www', 'admin', 'api', 'mail', 'superadmin', 'auth', 'static'], true)
        ) {
            throw new \InvalidArgumentException('Choose a valid PayMyDine subdomain.');
        }

        return $value;
    }

    public static function targets(array $requested, array $allowed): array
    {
        $limit = max(1, (int)config('pmd_groups.max_publish_targets', 20));
        if (!$requested || count($requested) > $limit) {
            throw new \InvalidArgumentException('Choose between 1 and '.$limit.' locations.');
        }

        $allowed = array_map('intval', $allowed);
        $result = [];

        foreach ($requested as $value) {
            if (!(is_int($value) || (is_string($value) && ctype_digit($value)))) {
                throw new \InvalidArgumentException('Invalid location.');
            }

            $id = (int)$value;
            if ($id < 1 || !in_array($id, $allowed, true)) {
                throw new \DomainException('Location access denied.');
            }

            $result[$id] = $id;
        }

        return array_values($result);
    }

    public static function canonical(array $value): string
    {
        $normalize = function ($item) use (&$normalize) {
            if (!is_array($item)) return $item;

            if ($item !== [] && array_keys($item) !== range(0, count($item) - 1)) {
                ksort($item);
            }

            foreach ($item as $key => $child) {
                $item[$key] = $normalize($child);
            }

            return $item;
        };

        return json_encode(
            $normalize($value),
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        );
    }

    public static function digest(array $value): string
    {
        return hash('sha256', self::canonical($value));
    }

    public static function totp(string $secret, int $step): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $buffer = 0;
        $bits = 0;
        $key = '';

        foreach (str_split(strtoupper(trim($secret))) as $char) {
            $index = strpos($alphabet, $char);
            if ($index === false) {
                throw new \InvalidArgumentException('Invalid Authenticator secret.');
            }

            $buffer = ($buffer << 5) | $index;
            $bits += 5;

            if ($bits >= 8) {
                $bits -= 8;
                $key .= chr(($buffer >> $bits) & 255);
                $buffer &= (1 << $bits) - 1;
            }
        }

        $digest = hash_hmac(
            'sha1',
            pack('N2', intdiv($step, 4294967296), $step % 4294967296),
            $key,
            true
        );

        $offset = ord($digest[19]) & 15;
        $number = unpack('N', substr($digest, $offset, 4))[1] & 0x7fffffff;

        return str_pad((string)($number % 1000000), 6, '0', STR_PAD_LEFT);
    }

    public static function matchingTotpStep(
        string $secret,
        string $code,
        int $timestamp,
        ?int $lastUsedStep
    ): ?int {
        if (!preg_match('/^[0-9]{6}$/D', $code)) return null;

        $step = intdiv($timestamp, 30);

        foreach ([$step, $step - 1, $step + 1] as $candidate) {
            if ($candidate < 0 || ($lastUsedStep !== null && $candidate <= $lastUsedStep)) {
                continue;
            }

            if (hash_equals(self::totp($secret, $candidate), $code)) {
                return $candidate;
            }
        }

        return null;
    }
}
