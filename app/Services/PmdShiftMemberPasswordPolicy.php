<?php

namespace App\Services;

/**
 * PMD_SHIFTS_MEMBER_PASSWORD_POLICY_V18H
 *
 * Applies to a newly issued/changed Shifts member web password only.
 * Existing linked member credentials remain untouched when the field is blank.
 * Keep the browser guidance in pmd-shifts-inpage-day-nav-v18h.js in sync.
 */
final class PmdShiftMemberPasswordPolicy
{
    public const MIN_LENGTH = 12;
    public const MAX_LENGTH = 32;

    public static function rejectionReason(string $password, string $username = '', string $displayName = ''): ?string
    {
        $length = function_exists('mb_strlen') ? mb_strlen($password, 'UTF-8') : strlen($password);

        if ($length < self::MIN_LENGTH) {
            return 'Too weak: use at least 12 characters for the web password.';
        }
        if ($length > self::MAX_LENGTH) {
            return 'Password is too long: use at most 32 characters.';
        }

        $lower = self::lower($password);
        foreach ([
            'password', 'passw0rd', 'qwerty', 'letmein', 'welcome',
            'changeme', 'admin123', '123456', 'abcdef',
            '111111', '000000', 'paymydine',
        ] as $guessable) {
            if (str_contains($lower, $guessable)) {
                return 'Too weak: avoid common words, keyboard sequences and predictable numbers.';
            }
        }

        $username = trim($username);
        if (self::length($username) >= 3 && str_contains($lower, self::lower($username))) {
            return 'Too weak: the password must not contain the username.';
        }

        $nameParts = preg_split('/[\s._-]+/u', self::lower(trim($displayName)), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        foreach ($nameParts as $part) {
            if (self::length($part) >= 4 && str_contains($lower, $part)) {
                return 'Too weak: the password must not contain the member name.';
            }
        }

        if (preg_match('/(.)\1{5,}/u', $password)) {
            return 'Too weak: avoid repeating the same character six times.';
        }

        $types = 0;
        foreach (['/[a-z]/', '/[A-Z]/', '/[0-9]/', '/[^A-Za-z0-9]/u'] as $pattern) {
            $types += preg_match($pattern, $password) ? 1 : 0;
        }
        // Length matters most. Allow a 16+ character passphrase with two
        // character types; shorter 12-15 character passwords need three.
        if ($types < 3 && !($length >= 16 && $types >= 2)) {
            return 'Needs improvement: mix upper/lowercase letters, numbers or symbols, or use a 16+ character passphrase.';
        }

        return null;
    }

    private static function length(string $value): int
    {
        return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    }

    private static function lower(string $value): string
    {
        return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    }
}
