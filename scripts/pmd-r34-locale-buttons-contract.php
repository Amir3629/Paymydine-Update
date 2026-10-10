<?php

require __DIR__.'/../app/Services/WhatsApp/PmdWhatsAppLocalePolicy.php';
require __DIR__.'/../app/Services/WhatsApp/PmdWhatsAppButtonPolicy.php';

use App\Services\WhatsApp\PmdWhatsAppLocalePolicy as Lang;
use App\Services\WhatsApp\PmdWhatsAppButtonPolicy as Buttons;

function checkR34(bool $ok, string $message): void
{
    if (!$ok) {
        fwrite(STDERR, "FAIL R34: {$message}\n");
        exit(1);
    }
    echo "PASS: {$message}\n";
}
foreach ([
    'de' => 'de_DE',
    'en' => 'en_GB',
    'tr' => 'tr',
    'ar' => 'ar',
] as $locale => $code) {
    checkR34(Lang::metaCode($locale) === $code, "Meta locale {$locale}");
    checkR34(Lang::isApproved($locale, 'de_DE,en_GB,tr,ar'), "Approved locale {$locale}");
    checkR34(!Lang::isApproved($locale, ''), "No implicit locale approval {$locale}");
}
checkR34(Lang::normalize('invalid', 'de') === 'de', 'German restaurant fallback');
checkR34(!Lang::isApproved('de', 'en_GB'), 'German never silently falls back to English');
checkR34(!Lang::isApproved('en', 'de_DE'), 'English never silently falls back to German');
checkR34(Buttons::action('PMD_MANAGE') === 'manage', 'Manage quick reply');
checkR34(Buttons::action('PMD_NEW_BOOKING') === 'new', 'New booking quick reply');
checkR34(Buttons::action('hello') === null, 'Free text never runs bot action');
checkR34(Buttons::action('PMD_GUARANTEE') === null, 'Payment action not guessed');
$manage = 'https://tomo.paymydine.com/book?manage='.str_repeat('a', 32).'&lang=de';
checkR34(Buttons::safeManageUrl($manage) === $manage, 'Trusted tenant manage URL');
checkR34(
    Buttons::newBookingUrl($manage, 'de') === 'https://tomo.paymydine.com/book?lang=de',
    'New booking points to tenant German booking page'
);
checkR34(str_contains((string)Buttons::textForAction('manage', $manage, 'de'),
    'Reservierung sicher ändern:'), 'German managed action copy');
checkR34(str_contains((string)Buttons::textForAction('new', $manage, 'en'),
    'Create a new booking:'), 'English new-booking action copy');
foreach ([
    'https://evil.com/book?manage='.str_repeat('a', 32),
    'http://tomo.paymydine.com/book?manage='.str_repeat('a', 32),
    'https://evil.paymydine.com.evil.com/book?manage='.str_repeat('a', 32),
    'https://tomo.paymydine.com/redirect?manage='.str_repeat('a', 32),
    'https://user:pass@tomo.paymydine.com/book?manage='.str_repeat('a', 32),
    'https://tomo.paymydine.com/book?manage=guess',
] as $invalid) {
    checkR34(Buttons::safeManageUrl($invalid) === null, 'Reject untrusted management URL');
}
checkR34(Buttons::safeManageUrl(
    'https://restaurant.example.org/book?manage='.str_repeat('b', 32).'&lang=de',
    'restaurant.example.org'
) !== null, 'Operator allowlisted custom domain supported');
echo "PASS: R34 localized WhatsApp button contracts.\n";
