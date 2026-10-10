<?php

namespace App\Services\WhatsApp;

/**
 * Pure R34 policy for template quick-reply buttons.
 *
 * A WhatsApp reply-to context is first authenticated by R33. The button
 * payload itself never contains customer credentials or reservation tokens.
 */
final class PmdWhatsAppButtonPolicy
{
    public static function action(string $payload): ?string
    {
        return [
            'PMD_MANAGE' => 'manage',
            'PMD_NEW_BOOKING' => 'new',
        ][$payload] ?? null;
    }

    public static function safeManageUrl(string $url, string $customHosts = ''): ?string
    {
        if ($url === '' || strlen($url) > 2048 || preg_match('/[\x00-\x20]/', $url)) {
            return null;
        }
        $parts = parse_url($url);
        if (!is_array($parts)
            || strtolower((string)($parts['scheme'] ?? '')) !== 'https'
            || isset($parts['user']) || isset($parts['pass'])
            || isset($parts['port']) || isset($parts['fragment'])
            || ($parts['path'] ?? '') !== '/book') {
            return null;
        }
        $host = strtolower((string)($parts['host'] ?? ''));
        $platformHost = preg_match('/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.paymydine\.com$/D', $host);
        $allowed = array_map('trim', explode(',', strtolower($customHosts)));
        if (!$platformHost && !($host !== '' && in_array($host, $allowed, true))) {
            return null;
        }
        parse_str((string)($parts['query'] ?? ''), $query);
        $manage = $query['manage'] ?? null;
        if (!is_string($manage) || !preg_match('/^[a-zA-Z0-9_-]{12,256}$/D', $manage)) {
            return null;
        }
        $lang = $query['lang'] ?? 'de';
        if (!is_string($lang) || !in_array($lang, ['de','en','tr','ar'], true)) {
            return null;
        }
        return $url;
    }

    public static function newBookingUrl(string $safeManageUrl, string $locale): ?string
    {
        $checked = self::safeManageUrl($safeManageUrl);
        if ($checked === null) {
            return null;
        }
        $parts = parse_url($checked);
        return 'https://'.$parts['host'].'/book?lang='
            .rawurlencode(PmdWhatsAppLocalePolicy::normalize($locale));
    }

    public static function textForAction(string $action, string $url, string $locale): ?string
    {
        if (self::safeManageUrl($url) === null) {
            return null;
        }
        $locale = PmdWhatsAppLocalePolicy::normalize($locale);
        if ($action === 'new') {
            $url = self::newBookingUrl($url, $locale);
        } elseif ($action !== 'manage') {
            return null;
        }
        if ($url === null) {
            return null;
        }
        $copy = [
            'de' => ['manage' => 'Reservierung sicher ändern:', 'new' => 'Neue Reservierung öffnen:'],
            'en' => ['manage' => 'Manage your booking securely:', 'new' => 'Create a new booking:'],
            'tr' => ['manage' => 'Rezervasyonunuzu güvenle yönetin:', 'new' => 'Yeni rezervasyon oluşturun:'],
            'ar' => ['manage' => 'إدارة حجزك بشكل آمن:', 'new' => 'إنشاء حجز جديد:'],
        ];
        return $copy[$locale][$action]."\n".$url;
    }
}
