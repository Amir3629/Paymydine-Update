<?php
// Standalone PHP contract checks: no database, framework bootstrap or network.
namespace App\Services\Reservations {
    final class PmdR29TestSettings
    {
        public static array $values = [];
    }

    function setting($key, $fallback = null)
    {
        return array_key_exists($key, PmdR29TestSettings::$values)
            ? PmdR29TestSettings::$values[$key]
            : $fallback;
    }
}

namespace {
    require __DIR__.'/../app/Services/Reservations/PmdGuestCommunicationService.php';

    use App\Services\Reservations\PmdGuestCommunicationService as Service;
    use App\Services\Reservations\PmdR29TestSettings as Settings;

    function verify(bool $condition, string $label): void
    {
        if (!$condition) {
            fwrite(STDERR, "FAIL: ".$label."\n");
            exit(1);
        }
        echo "PASS: ".$label."\n";
    }

    $service = new Service();
    $method = new \ReflectionMethod(Service::class, 'isAllowedWhatsappEndpoint');
    $method->setAccessible(true);

    verify($method->invoke($service, 'https://graph.facebook.com/v22.0/123/messages', 'meta_cloud'),
        'Meta Graph host accepted');
    verify(!$method->invoke($service, 'https://example.com/v22.0/123/messages', 'meta_cloud'),
        'Unknown Meta endpoint rejected');
    verify(!$method->invoke($service, 'http://graph.facebook.com/v22.0/123/messages', 'meta_cloud'),
        'Unencrypted Meta endpoint rejected');
    verify(!$method->invoke($service, 'https://user:pass@graph.facebook.com/v22.0/123/messages', 'meta_cloud'),
        'Embedded credentials rejected');
    verify(!$method->invoke($service, 'https://127.0.0.1/send', 'webhook'),
        'Loopback webhook rejected');

    $dns = new \ReflectionMethod(Service::class, 'resolvesToPublicAddress');
    $dns->setAccessible(true);
    verify(!$dns->invoke($service, 'https://127.0.0.1/'),
        'Loopback IP cannot be a delivery target');
    verify($dns->invoke($service, 'https://8.8.8.8/'),
        'Public IP passes address classification');

    Settings::$values = [
        'sender_email' => 'restaurant@example.com',
        'sender_name' => 'Example Restaurant',
    ];
    $config = $service->settingsPayload();
    verify(!$config['email_enabled'] && !$config['email_ready'],
        'Email remains off until owner explicitly opts in');

    Settings::$values['pmd_reservation_messages_email_enabled'] = 1;
    verify($service->settingsPayload()['email_ready'],
        'Owner-enabled mail transport can report configured');

    Settings::$values['protocol'] = 'smtp';
    verify(!$service->settingsPayload()['email_ready'],
        'Incomplete owner SMTP configuration fails closed');

    Settings::$values = [
        'pmd_reservation_messages_whatsapp_enabled' => 1,
        'pmd_reservation_messages_whatsapp_provider' => 'meta_cloud',
        'pmd_reservation_messages_whatsapp_endpoint' => 'https://graph.facebook.com/v22.0/123/messages',
        'pmd_reservation_messages_whatsapp_token' => 'TEST_TOKEN',
        'pmd_reservation_messages_event_created' => 1,
        'pmd_reservation_messages_event_updated' => 0,
        'pmd_reservation_messages_event_canceled' => 0,
    ];
    verify(!$service->settingsPayload()['whatsapp_ready'],
        'Meta messaging without a matching approved template is not ready');

    Settings::$values['pmd_reservation_messages_whatsapp_template_created'] = 'reservation_created';
    verify($service->settingsPayload()['whatsapp_ready'],
        'Meta message with approved enabled template can report configured');

    Settings::$values['pmd_reservation_messages_event_updated'] = 1;
    verify(!$service->settingsPayload()['whatsapp_ready'],
        'Each enabled proactive event must have an approved template');

    echo "R29 guest communication contract tests passed.\n";
}
