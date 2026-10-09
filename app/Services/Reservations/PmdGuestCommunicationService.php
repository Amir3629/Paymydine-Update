<?php

namespace App\Services\Reservations;

use Admin\Models\Reservations_model;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

final class PmdGuestCommunicationService
{
    private const EVENTS = ['created', 'updated', 'canceled'];

    public function settingsPayload(): array
    {
        $protocol = strtolower(trim((string)$this->setting('protocol', 'mail')));
        $emailEnabled = $this->boolSetting('pmd_reservation_messages_email_enabled', true);
        $whatsappEnabled = $this->boolSetting('pmd_reservation_messages_whatsapp_enabled', false);
        $senderEmail = strtolower(trim((string)$this->setting('sender_email', '')));
        if ($senderEmail === '') {
            $senderEmail = strtolower(trim((string)$this->setting('site_email', '')));
        }

        $senderName = trim((string)$this->setting('sender_name', ''));
        if ($senderName === '') {
            $senderName = trim((string)$this->setting('site_name', ''));
        }
        $whatsappProvider = strtolower(trim((string)$this->setting(
            'pmd_reservation_messages_whatsapp_provider',
            'meta_cloud'
        )));
        if (!in_array($whatsappProvider, ['meta_cloud', 'webhook'], true)) {
            $whatsappProvider = 'meta_cloud';
        }

        $whatsappEndpoint = trim((string)$this->setting(
            'pmd_reservation_messages_whatsapp_endpoint',
            ''
        ));
        $whatsappSenderReference = trim((string)$this->setting(
            'pmd_reservation_messages_whatsapp_sender_reference',
            ''
        ));
        $hasWhatsappToken = trim((string)$this->setting(
            'pmd_reservation_messages_whatsapp_token',
            ''
        )) !== '';

        $events = [];
        foreach (self::EVENTS as $event) {
            $events[$event] = $this->boolSetting(
                'pmd_reservation_messages_event_'.$event,
                true
            );
        }

        return [
            'email_enabled' => $emailEnabled,
            'email_ready' => $emailEnabled
                && filter_var($senderEmail, FILTER_VALIDATE_EMAIL)
                && $this->emailProtocolReady($protocol),
            'sender_name' => $senderName,
            'sender_email' => $senderEmail,
            'protocol' => $protocol,
            'smtp_host' => (string)$this->setting('smtp_host', ''),
            'smtp_port' => (int)$this->setting('smtp_port', 587),
            'smtp_encryption' => (string)$this->setting('smtp_encryption', 'tls'),
            'smtp_user' => (string)$this->setting('smtp_user', ''),
            'has_smtp_pass' => trim((string)$this->setting('smtp_pass', '')) !== '',
            'mailgun_domain' => (string)$this->setting('mailgun_domain', ''),
            'has_mailgun_secret' => trim((string)$this->setting('mailgun_secret', '')) !== '',
            'has_postmark_token' => trim((string)$this->setting('postmark_token', '')) !== '',
            'ses_region' => (string)$this->setting('ses_region', ''),
            'has_ses_key' => trim((string)$this->setting('ses_key', '')) !== '',
            'has_ses_secret' => trim((string)$this->setting('ses_secret', '')) !== '',
            'test_email' => (string)$this->setting('test_email', ''),
            'whatsapp_enabled' => $whatsappEnabled,
            'whatsapp_ready' => $whatsappEnabled
                && $this->safeHttpsUrl($whatsappEndpoint)
                && ($whatsappProvider !== 'meta_cloud' || $hasWhatsappToken),
            'whatsapp_provider' => $whatsappProvider,
            'whatsapp_endpoint' => $whatsappEndpoint,
            'whatsapp_sender_reference' => $whatsappSenderReference,
            'has_whatsapp_token' => $hasWhatsappToken,
            'whatsapp_test_recipient' => (string)$this->setting(
                'pmd_reservation_messages_whatsapp_test_recipient',
                ''
            ),
            'whatsapp_template_created' => (string)$this->setting(
                'pmd_reservation_messages_whatsapp_template_created',
                ''
            ),
            'whatsapp_template_updated' => (string)$this->setting(
                'pmd_reservation_messages_whatsapp_template_updated',
                ''
            ),
            'whatsapp_template_canceled' => (string)$this->setting(
                'pmd_reservation_messages_whatsapp_template_canceled',
                ''
            ),
            'events' => $events,
        ];
    }

    public function sendReservationEvent(
        Reservations_model $reservation,
        string $event,
        string $locale = 'de'
    ): array {
        $event = strtolower(trim($event));
        if (!in_array($event, self::EVENTS, true)) {
            throw new \InvalidArgumentException('Unsupported reservation communication event.');
        }

        $config = $this->settingsPayload();
        if (empty($config['events'][$event])) {
            return [
                'event' => $event,
                'email' => 'disabled_for_event',
                'whatsapp' => 'disabled_for_event',
            ];
        }

        $reservation->loadMissing('location');
        $locale = $this->locale($locale);
        $message = $this->reservationMessage($reservation, $event, $locale);

        $result = [
            'event' => $event,
            'email' => 'disabled',
            'whatsapp' => 'disabled',
        ];

        if (!empty($config['email_enabled'])) {
            if (empty($config['email_ready'])) {
                $result['email'] = 'not_ready';
            } else {
                $result['email'] = $this->sendGuestEmail(
                    $reservation,
                    $message,
                    $config
                ) ? 'sent' : 'failed';
            }
        }

        if (!empty($config['whatsapp_enabled'])) {
            if (empty($config['whatsapp_ready'])) {
                $result['whatsapp'] = 'not_ready';
            } else {
                $result['whatsapp'] = $this->sendWhatsApp(
                    (string)$reservation->telephone,
                    (string)$message['whatsapp_text'],
                    [
                        'event' => $event,
                        'locale' => $locale,
                        'reservation_id' => (int)$reservation->getKey(),
                        'reference' => (string)$message['reference'],
                        'restaurant_name' => (string)$message['restaurant_name'],
                        'reservation_date' => (string)$message['reservation_date'],
                        'reservation_time' => (string)$message['reservation_time'],
                        'reservation_guests' => (int)$message['reservation_guests'],
                        'manage_url' => (string)$message['manage_url'],
                    ],
                    $config
                ) ? 'sent' : 'failed';
            }
        }

        Log::info('PMD reservation guest communication', [
            'reservation_id' => (int)$reservation->getKey(),
            'event' => $event,
            'email' => $result['email'],
            'whatsapp' => $result['whatsapp'],
        ]);

        return $result;
    }

    public function sendTestEmail(string $recipient): bool
    {
        $recipient = strtolower(trim($recipient));
        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Enter a valid test email address.');
        }

        $config = $this->settingsPayload();
        if (empty($config['email_ready'])) {
            throw new \RuntimeException('Email delivery is not fully configured.');
        }

        $vars = [
            'email_subject' => 'PayMyDine email test',
            'locale' => 'en',
            'customer_name' => 'PayMyDine test',
            'headline' => 'Email delivery is connected.',
            'intro' => 'This test confirms that the saved restaurant email delivery settings can create a message.',
            'reference' => 'TEST',
            'restaurant_name' => (string)($config['sender_name'] ?: 'PayMyDine'),
            'reservation_date' => date('Y-m-d'),
            'reservation_time' => date('H:i'),
            'reservation_guests' => 0,
            'manage_url' => url('/book'),
            'footer' => 'No reservation was created.',
        ];

        Mail::send(
            'admin::_mail.reservation_guest_message',
            $vars,
            function ($mail) use ($recipient, $config) {
                $mail->to($recipient, 'PayMyDine test');
                if (filter_var($config['sender_email'], FILTER_VALIDATE_EMAIL)) {
                    $mail->from(
                        $config['sender_email'],
                        $config['sender_name'] ?: 'PayMyDine'
                    );
                }
            }
        );

        return true;
    }

    public function sendTestWhatsApp(string $recipient): bool
    {
        $config = $this->settingsPayload();
        if (empty($config['whatsapp_ready'])) {
            throw new \RuntimeException('WhatsApp delivery is not fully configured.');
        }

        $recipient = $this->normalizePhone($recipient);
        if ($recipient === '') {
            throw new \InvalidArgumentException(
                'Enter the WhatsApp test number with country code.'
            );
        }

        return $this->sendWhatsApp(
            $recipient,
            'PayMyDine WhatsApp test: reservation messaging is connected.',
            [
                'event' => 'test',
                'locale' => 'en',
                'reservation_id' => 0,
                'reference' => 'TEST',
                'restaurant_name' => '',
            ],
            $config
        );
    }

    private function sendGuestEmail(
        Reservations_model $reservation,
        array $message,
        array $config
    ): bool {
        $email = strtolower(trim((string)$reservation->email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Log::warning('PMD guest reservation email skipped', [
                'reservation_id' => (int)$reservation->getKey(),
                'reason' => 'invalid_customer_email',
            ]);
            return false;
        }

        try {
            $restaurantEmail = $reservation->location
                ? strtolower(trim((string)$reservation->location->location_email))
                : '';

            Mail::send(
                'admin::_mail.reservation_guest_message',
                $message,
                function ($mail) use (
                    $email,
                    $reservation,
                    $restaurantEmail,
                    $config,
                    $message
                ) {
                    $name = trim(
                        (string)$reservation->first_name.' '
                        .(string)$reservation->last_name
                    );
                    $mail->to($email, $name);

                    if (filter_var($config['sender_email'], FILTER_VALIDATE_EMAIL)) {
                        $mail->from(
                            $config['sender_email'],
                            $config['sender_name'] ?: ($message['restaurant_name'] ?? 'PayMyDine')
                        );
                    }

                    if (filter_var($restaurantEmail, FILTER_VALIDATE_EMAIL)) {
                        $mail->replyTo(
                            $restaurantEmail,
                            (string)($reservation->location->location_name ?? '')
                        );
                    }
                }
            );

            return true;
        } catch (Throwable $error) {
            Log::warning('PMD guest reservation email failed', [
                'reservation_id' => (int)$reservation->getKey(),
                'message' => $error->getMessage(),
            ]);
            return false;
        }
    }

    private function sendWhatsApp(
        string $recipient,
        string $text,
        array $context,
        array $config
    ): bool {
        $recipient = $this->normalizePhone($recipient);
        if ($recipient === '') {
            Log::warning('PMD reservation WhatsApp skipped', [
                'reservation_id' => (int)($context['reservation_id'] ?? 0),
                'reason' => 'invalid_customer_phone',
            ]);
            return false;
        }

        $endpoint = trim((string)($config['whatsapp_endpoint'] ?? ''));
        if (!$this->safeHttpsUrl($endpoint)) {
            return false;
        }

        $token = trim((string)$this->setting(
            'pmd_reservation_messages_whatsapp_token',
            ''
        ));
        $provider = (string)($config['whatsapp_provider'] ?? 'meta_cloud');

        try {
            $request = Http::asJson()
                ->acceptJson()
                ->timeout(5)
                ->connectTimeout(3);

            if ($token !== '') {
                $request = $request->withToken($token);
            }

            if ($provider === 'webhook') {
                $payload = [
                    'channel' => 'whatsapp',
                    'recipient' => $recipient,
                    'message' => $text,
                    'sender_reference' => (string)(
                        $config['whatsapp_sender_reference'] ?? ''
                    ),
                    'event' => (string)($context['event'] ?? ''),
                    'reservation' => [
                        'id' => (int)($context['reservation_id'] ?? 0),
                        'reference' => (string)($context['reference'] ?? ''),
                        'restaurant_name' => (string)(
                            $context['restaurant_name'] ?? ''
                        ),
                    ],
                ];
            } else {
                $event = strtolower((string)($context['event'] ?? ''));
                $templateKey = in_array($event, self::EVENTS, true)
                    ? 'whatsapp_template_'.$event
                    : '';
                $templateName = $templateKey !== ''
                    ? trim((string)($config[$templateKey] ?? ''))
                    : '';

                if ($templateName !== '') {
                    $payload = [
                        'messaging_product' => 'whatsapp',
                        'recipient_type' => 'individual',
                        'to' => $recipient,
                        'type' => 'template',
                        'template' => [
                            'name' => $templateName,
                            'language' => [
                                'code' => $this->whatsappTemplateLanguage(
                                    (string)($context['locale'] ?? 'en')
                                ),
                            ],
                            'components' => [[
                                'type' => 'body',
                                'parameters' => [
                                    ['type' => 'text', 'text' => (string)($context['restaurant_name'] ?? '')],
                                    ['type' => 'text', 'text' => (string)($context['reference'] ?? '')],
                                    ['type' => 'text', 'text' => (string)($context['reservation_date'] ?? '')],
                                    ['type' => 'text', 'text' => (string)($context['reservation_time'] ?? '')],
                                    ['type' => 'text', 'text' => (string)($context['reservation_guests'] ?? '')],
                                    ['type' => 'text', 'text' => (string)($context['manage_url'] ?? '')],
                                ],
                            ]],
                        ],
                    ];
                } else {
                    // Text messages work only when the provider permits a free-form
                    // customer-service conversation. For proactive confirmations,
                    // configure approved WhatsApp templates in Restaurant Profile.
                    $payload = [
                        'messaging_product' => 'whatsapp',
                        'recipient_type' => 'individual',
                        'to' => $recipient,
                        'type' => 'text',
                        'text' => [
                            'preview_url' => false,
                            'body' => $text,
                        ],
                    ];
                }
            }

            $response = $request->post($endpoint, $payload);

            if (!$response->successful()) {
                Log::warning('PMD reservation WhatsApp provider rejected message', [
                    'reservation_id' => (int)($context['reservation_id'] ?? 0),
                    'provider' => $provider,
                    'http_status' => $response->status(),
                    'body' => mb_substr((string)$response->body(), 0, 1000),
                ]);
                return false;
            }

            return true;
        } catch (Throwable $error) {
            Log::warning('PMD reservation WhatsApp send failed', [
                'reservation_id' => (int)($context['reservation_id'] ?? 0),
                'provider' => $provider,
                'message' => $error->getMessage(),
            ]);
            return false;
        }
    }

    private function reservationMessage(
        Reservations_model $reservation,
        string $event,
        string $locale
    ): array {
        $reservation->loadMissing('location');

        $restaurantName = $reservation->location
            ? trim((string)$reservation->location->location_name)
            : 'Restaurant';

        $reference = 'R'.str_pad(
            (string)$reservation->getKey(),
            6,
            '0',
            STR_PAD_LEFT
        );

        $date = $reservation->reserve_date instanceof \DateTimeInterface
            ? $reservation->reserve_date->format('Y-m-d')
            : substr((string)$reservation->reserve_date, 0, 10);
        $time = $reservation->reserve_time instanceof \DateTimeInterface
            ? $reservation->reserve_time->format('H:i')
            : substr((string)$reservation->reserve_time, 0, 5);
        $guests = (int)$reservation->guest_num;
        $name = trim(
            (string)$reservation->first_name.' '
            .(string)$reservation->last_name
        );
        $manageUrl = url('/book')
            .'?manage='.rawurlencode((string)$reservation->hash)
            .'&lang='.rawurlencode($locale);

        $copy = $this->copy($locale, $event, $restaurantName, $reference);

        $details = $date.' · '.$time.' · '.$guests.' '
            .$this->guestWord($locale, $guests);

        $whatsapp = $copy['headline']."\n"
            .$restaurantName."\n"
            .$reference.' · '.$details."\n"
            .$copy['manage'].': '.$manageUrl;

        return [
            'email_subject' => $copy['subject'],
            'locale' => $locale,
            'customer_name' => $name,
            'headline' => $copy['headline'],
            'intro' => $copy['intro'],
            'reference' => $reference,
            'restaurant_name' => $restaurantName,
            'reservation_date' => $date,
            'reservation_time' => $time,
            'reservation_guests' => $guests,
            'manage_url' => $manageUrl,
            'footer' => $copy['footer'],
            'whatsapp_text' => $whatsapp,
        ];
    }

    private function copy(
        string $locale,
        string $event,
        string $restaurantName,
        string $reference
    ): array {
        $packs = [
            'de' => [
                'created' => [
                    'subject' => 'Reservierung '.$reference.' bei '.$restaurantName,
                    'headline' => 'Ihre Reservierung ist eingegangen.',
                    'intro' => 'Ihre Reservierungsdaten wurden an das Restaurant übermittelt.',
                    'footer' => 'Über den Link können Sie Ihre Reservierung jederzeit verwalten.',
                ],
                'updated' => [
                    'subject' => 'Reservierung '.$reference.' wurde aktualisiert',
                    'headline' => 'Ihre Reservierung wurde aktualisiert.',
                    'intro' => 'Die aktuellen Reservierungsdaten sind unten aufgeführt.',
                    'footer' => 'Über den Link können Sie Ihre Reservierung erneut verwalten.',
                ],
                'canceled' => [
                    'subject' => 'Reservierung '.$reference.' wurde storniert',
                    'headline' => 'Ihre Reservierung wurde storniert.',
                    'intro' => 'Die Stornierung wurde erfolgreich gespeichert.',
                    'footer' => 'Wenn Sie erneut reservieren möchten, öffnen Sie die Reservierungsseite.',
                ],
                'manage' => 'Reservierung verwalten',
            ],
            'tr' => [
                'created' => [
                    'subject' => $restaurantName.' rezervasyonu '.$reference,
                    'headline' => 'Rezervasyon talebiniz alındı.',
                    'intro' => 'Rezervasyon bilgileriniz restorana iletildi.',
                    'footer' => 'Bağlantı üzerinden rezervasyonunuzu yönetebilirsiniz.',
                ],
                'updated' => [
                    'subject' => 'Rezervasyon '.$reference.' güncellendi',
                    'headline' => 'Rezervasyonunuz güncellendi.',
                    'intro' => 'Güncel rezervasyon bilgileri aşağıdadır.',
                    'footer' => 'Bağlantı üzerinden rezervasyonunuzu tekrar yönetebilirsiniz.',
                ],
                'canceled' => [
                    'subject' => 'Rezervasyon '.$reference.' iptal edildi',
                    'headline' => 'Rezervasyonunuz iptal edildi.',
                    'intro' => 'İptal işlemi başarıyla kaydedildi.',
                    'footer' => 'Yeni bir rezervasyon için rezervasyon sayfasını açabilirsiniz.',
                ],
                'manage' => 'Rezervasyonu yönet',
            ],
            'ar' => [
                'created' => [
                    'subject' => 'الحجز '.$reference.' لدى '.$restaurantName,
                    'headline' => 'تم استلام حجزك.',
                    'intro' => 'تم إرسال تفاصيل الحجز إلى المطعم.',
                    'footer' => 'يمكنك إدارة الحجز من خلال الرابط.',
                ],
                'updated' => [
                    'subject' => 'تم تحديث الحجز '.$reference,
                    'headline' => 'تم تحديث حجزك.',
                    'intro' => 'تظهر تفاصيل الحجز الحالية أدناه.',
                    'footer' => 'يمكنك إدارة الحجز مرة أخرى من خلال الرابط.',
                ],
                'canceled' => [
                    'subject' => 'تم إلغاء الحجز '.$reference,
                    'headline' => 'تم إلغاء حجزك.',
                    'intro' => 'تم حفظ الإلغاء بنجاح.',
                    'footer' => 'يمكنك فتح صفحة الحجز لإنشاء حجز جديد.',
                ],
                'manage' => 'إدارة الحجز',
            ],
            'en' => [
                'created' => [
                    'subject' => 'Reservation '.$reference.' at '.$restaurantName,
                    'headline' => 'Your reservation has been received.',
                    'intro' => 'Your reservation details were sent to the restaurant.',
                    'footer' => 'Use the link below to manage your reservation at any time.',
                ],
                'updated' => [
                    'subject' => 'Reservation '.$reference.' was updated',
                    'headline' => 'Your reservation was updated.',
                    'intro' => 'Your current reservation details are shown below.',
                    'footer' => 'Use the link below to manage the reservation again.',
                ],
                'canceled' => [
                    'subject' => 'Reservation '.$reference.' was canceled',
                    'headline' => 'Your reservation was canceled.',
                    'intro' => 'The cancellation was saved successfully.',
                    'footer' => 'Open the booking page if you would like to make another reservation.',
                ],
                'manage' => 'Manage reservation',
            ],
        ];

        $pack = $packs[$locale] ?? $packs['en'];
        $eventCopy = $pack[$event] ?? $pack['created'];
        $eventCopy['manage'] = $pack['manage'];

        return $eventCopy;
    }

    private function guestWord(string $locale, int $guests): string
    {
        if ($locale === 'de') {
            return $guests === 1 ? 'Person' : 'Personen';
        }
        if ($locale === 'tr') {
            return 'kişi';
        }
        if ($locale === 'ar') {
            return 'أشخاص';
        }

        return $guests === 1 ? 'guest' : 'guests';
    }

    private function emailProtocolReady(string $protocol): bool
    {
        if (in_array($protocol, ['mail', 'sendmail'], true)) {
            return true;
        }

        if ($protocol === 'smtp') {
            return trim((string)$this->setting('smtp_host', '')) !== ''
                && trim((string)$this->setting('smtp_user', '')) !== ''
                && trim((string)$this->setting('smtp_pass', '')) !== '';
        }

        if ($protocol === 'mailgun') {
            return trim((string)$this->setting('mailgun_domain', '')) !== ''
                && trim((string)$this->setting('mailgun_secret', '')) !== '';
        }

        if ($protocol === 'postmark') {
            return trim((string)$this->setting('postmark_token', '')) !== '';
        }

        if ($protocol === 'ses') {
            return trim((string)$this->setting('ses_key', '')) !== ''
                && trim((string)$this->setting('ses_secret', '')) !== ''
                && trim((string)$this->setting('ses_region', '')) !== '';
        }

        return false;
    }

    private function normalizePhone(string $value): string
    {
        $digits = preg_replace('/\D+/', '', trim($value)) ?? '';
        if (strlen($digits) < 8 || strlen($digits) > 15) {
            return '';
        }

        return $digits;
    }

    private function safeHttpsUrl(string $url): bool
    {
        if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }

        $parts = parse_url($url);
        if (
            strtolower((string)($parts['scheme'] ?? '')) !== 'https'
            || trim((string)($parts['host'] ?? '')) === ''
        ) {
            return false;
        }

        $host = strtolower((string)$parts['host']);
        if ($host === 'localhost' || str_ends_with($host, '.local')) {
            return false;
        }

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return filter_var(
                $host,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            ) !== false;
        }

        return true;
    }

    private function whatsappTemplateLanguage(string $locale): string
    {
        $locale = $this->locale($locale);

        return [
            'de' => 'de_DE',
            'en' => 'en_GB',
            'tr' => 'tr',
            'ar' => 'ar',
        ][$locale] ?? 'en_GB';
    }

    private function locale(string $locale): string
    {
        $locale = strtolower(substr(trim($locale), 0, 2));
        return in_array($locale, ['en', 'de', 'tr', 'ar'], true)
            ? $locale
            : 'en';
    }

    private function boolSetting(string $key, bool $fallback): bool
    {
        $value = $this->setting($key, $fallback ? 1 : 0);
        if (is_bool($value)) {
            return $value;
        }

        return !in_array(
            strtolower(trim((string)$value)),
            ['', '0', 'false', 'off', 'no'],
            true
        );
    }

    private function setting(string $key, $fallback = null)
    {
        try {
            return setting($key, $fallback);
        } catch (Throwable $error) {
            return $fallback;
        }
    }
}
