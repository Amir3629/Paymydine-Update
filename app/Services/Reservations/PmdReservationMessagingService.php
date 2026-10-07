<?php

namespace App\Services\Reservations;

use Admin\Models\Reservations_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Throwable;

class PmdReservationMessagingService
{
    private const EVENTS = ['created', 'updated', 'canceled'];

    public function guestEmailEnabled(): bool
    {
        return $this->boolSetting('pmd_reservation_email_enabled', false);
    }

    public function guestEmailOperational(): bool
    {
        return $this->guestEmailEnabled() && $this->mailReady();
    }

    public function whatsappEnabled(): bool
    {
        return $this->boolSetting('pmd_reservation_whatsapp_enabled', false);
    }

    public function whatsappOperational(): bool
    {
        if (!$this->whatsappEnabled()) {
            return false;
        }

        $phoneNumberId = trim((string)$this->setting('pmd_whatsapp_phone_number_id', ''));
        $token = trim((string)$this->setting('pmd_whatsapp_access_token', ''));

        if ($phoneNumberId === '' || $token === '') {
            return false;
        }

        foreach (self::EVENTS as $event) {
            if (
                $this->eventEnabled($event)
                && trim((string)$this->setting('pmd_whatsapp_template_'.$event, '')) !== ''
            ) {
                return true;
            }
        }

        return false;
    }

    public function notifyAfterResponse(
        Reservations_model $reservation,
        string $event,
        string $locale = 'de',
        array $changes = []
    ): void {
        $reservationId = (int)$reservation->getKey();
        if ($reservationId < 1) {
            return;
        }

        $event = strtolower(trim($event));
        $locale = $this->locale($locale);
        $changes = array_values(array_map('strval', $changes));

        try {
            app()->terminating(function () use (
                $reservationId,
                $event,
                $locale,
                $changes
            ): void {
                try {
                    $fresh = Reservations_model::query()
                        ->with(['location'])
                        ->where('reservation_id', $reservationId)
                        ->first();

                    if ($fresh) {
                        $this->notify($fresh, $event, $locale, $changes);
                    }
                } catch (Throwable $error) {
                    Log::warning('PMD reservation after-response messaging failed', [
                        'reservation_id' => $reservationId,
                        'event' => $event,
                        'message' => $error->getMessage(),
                    ]);
                }
            });
        } catch (Throwable $error) {
            Log::warning('PMD reservation after-response hook unavailable', [
                'reservation_id' => $reservationId,
                'event' => $event,
                'message' => $error->getMessage(),
            ]);
        }
    }

    public function notify(
        Reservations_model $reservation,
        string $event,
        string $locale = 'de',
        array $changes = []
    ): array {
        $event = strtolower(trim($event));
        if (!in_array($event, self::EVENTS, true) || !$this->eventEnabled($event)) {
            return ['email' => 'skipped', 'whatsapp' => 'skipped'];
        }

        $reservation->loadMissing('location');
        $locale = $this->locale($locale);

        $result = [
            'email' => $this->sendGuestEmail($reservation, $event, $locale, $changes)
                ? 'sent'
                : 'skipped',
            'owner_email' => $this->sendOwnerEmail($reservation, $event, $locale, $changes)
                ? 'sent'
                : 'skipped',
            'whatsapp' => $this->sendGuestWhatsapp($reservation, $event, $locale, $changes)
                ? 'sent'
                : 'skipped',
        ];

        return $result;
    }

    public function savePreference(
        int $reservationId,
        bool $whatsappOptIn,
        string $locale
    ): void {
        if ($reservationId < 1 || !Schema::hasTable('pmd_reservation_message_preferences')) {
            return;
        }

        try {
            $now = now();
            $existing = DB::table('pmd_reservation_message_preferences')
                ->where('reservation_id', $reservationId)
                ->exists();

            $values = [
                'whatsapp_opt_in' => $whatsappOptIn ? 1 : 0,
                'locale' => $this->locale($locale),
                'updated_at' => $now,
            ];
            if (!$existing) {
                $values['created_at'] = $now;
            }

            DB::table('pmd_reservation_message_preferences')->updateOrInsert(
                ['reservation_id' => $reservationId],
                $values
            );
        } catch (Throwable $error) {
            Log::warning('PMD reservation messaging preference save failed', [
                'reservation_id' => $reservationId,
                'message' => $error->getMessage(),
            ]);
        }
    }

    public function preferenceForReservation(int $reservationId): array
    {
        if ($reservationId < 1 || !Schema::hasTable('pmd_reservation_message_preferences')) {
            return ['whatsapp_opt_in' => false, 'locale' => 'de'];
        }

        try {
            $row = DB::table('pmd_reservation_message_preferences')
                ->where('reservation_id', $reservationId)
                ->first();

            if (!$row) {
                return ['whatsapp_opt_in' => false, 'locale' => 'de'];
            }

            return [
                'whatsapp_opt_in' => (bool)($row->whatsapp_opt_in ?? false),
                'locale' => $this->locale((string)($row->locale ?? 'de')),
            ];
        } catch (Throwable $error) {
            Log::warning('PMD reservation messaging preference read failed', [
                'reservation_id' => $reservationId,
                'message' => $error->getMessage(),
            ]);

            return ['whatsapp_opt_in' => false, 'locale' => 'de'];
        }
    }

    public function publicWhatsappNumber(): string
    {
        if (!$this->whatsappEnabled()) {
            return '';
        }

        return $this->normalizePhone(
            (string)$this->setting('pmd_whatsapp_public_number', '')
        );
    }

    public function testEmail(?string $recipient = null): array
    {
        $recipient = strtolower(trim((string)(
            $recipient
            ?: $this->setting('pmd_reservation_test_email', '')
            ?: $this->setting('site_email', '')
        )));

        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'message' => 'Set a valid test email address first.',
            ];
        }

        if (!$this->mailReady()) {
            return [
                'success' => false,
                'message' => 'Email delivery is not configured yet.',
            ];
        }

        try {
            $this->applyMailConfig();
            $restaurantName = trim((string)$this->setting('site_name', 'PayMyDine')) ?: 'PayMyDine';

            Mail::send([], [], function ($message) use ($recipient, $restaurantName) {
                $message->to($recipient);
                $message->subject($restaurantName.' · PayMyDine email test');
                $message->setBody(
                    '<div style="font-family:Arial,sans-serif;line-height:1.6">'
                    .'<h2 style="margin:0 0 12px">Email delivery is ready.</h2>'
                    .'<p style="margin:0">PayMyDine can use this connection for reservation messages.</p>'
                    .'</div>',
                    'text/html'
                );
            });

            return [
                'success' => true,
                'message' => 'Test email sent to '.$recipient.'.',
            ];
        } catch (Throwable $error) {
            Log::warning('PMD reservation messaging email test failed', [
                'message' => $error->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Email test failed: '.$error->getMessage(),
            ];
        }
    }

    public function testWhatsapp(): array
    {
        $phoneNumberId = trim((string)$this->setting('pmd_whatsapp_phone_number_id', ''));
        $token = trim((string)$this->setting('pmd_whatsapp_access_token', ''));

        if ($phoneNumberId === '' || $token === '') {
            return [
                'success' => false,
                'message' => 'WhatsApp Phone Number ID and access token are required.',
            ];
        }

        try {
            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(12)
                ->get(
                    $this->whatsappGraphBase().'/'.rawurlencode($phoneNumberId),
                    ['fields' => 'display_phone_number,verified_name']
                );

            if (!$response->successful()) {
                $message = (string)($response->json('error.message') ?: 'WhatsApp connection test failed.');
                return ['success' => false, 'message' => $message];
            }

            $display = trim((string)$response->json('display_phone_number'));
            $verified = trim((string)$response->json('verified_name'));
            $label = trim($verified.($display !== '' ? ' · '.$display : ''));

            return [
                'success' => true,
                'message' => $label !== ''
                    ? 'WhatsApp Business connected: '.$label
                    : 'WhatsApp Business connection is ready.',
            ];
        } catch (Throwable $error) {
            Log::warning('PMD WhatsApp connection test failed', [
                'message' => $error->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'WhatsApp test failed: '.$error->getMessage(),
            ];
        }
    }

    private function sendGuestEmail(
        Reservations_model $reservation,
        string $event,
        string $locale,
        array $changes
    ): bool {
        if (!$this->guestEmailEnabled() || !$this->mailReady()) {
            return false;
        }

        $email = strtolower(trim((string)$reservation->email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        try {
            $this->applyMailConfig();
            $copy = $this->copy($event, $locale, $reservation, $changes);
            $customerName = trim((string)$reservation->first_name.' '.(string)$reservation->last_name);
            $restaurantEmail = $reservation->location
                ? strtolower(trim((string)$reservation->location->location_email))
                : strtolower(trim((string)$this->setting('site_email', '')));
            $html = $this->emailHtml($copy, $reservation, $locale);

            Mail::send([], [], function ($message) use (
                $email,
                $customerName,
                $restaurantEmail,
                $reservation,
                $copy,
                $html
            ) {
                $message->to($email, $customerName);
                $message->subject($copy['subject']);

                if (filter_var($restaurantEmail, FILTER_VALIDATE_EMAIL)) {
                    $message->replyTo(
                        $restaurantEmail,
                        $reservation->location
                            ? trim((string)$reservation->location->location_name)
                            : null
                    );
                }

                $message->setBody($html, 'text/html');
            });

            return true;
        } catch (Throwable $error) {
            Log::warning('PMD reservation guest email failed', [
                'reservation_id' => (int)$reservation->getKey(),
                'event' => $event,
                'message' => $error->getMessage(),
            ]);

            return false;
        }
    }

    private function sendOwnerEmail(
        Reservations_model $reservation,
        string $event,
        string $locale,
        array $changes
    ): bool {
        if (!$this->boolSetting('pmd_reservation_owner_email_enabled', false) || !$this->mailReady()) {
            return false;
        }

        $recipient = strtolower(trim((string)$this->setting('pmd_reservation_owner_email', '')));
        if ($recipient === '' && $reservation->location) {
            $recipient = strtolower(trim((string)$reservation->location->location_email));
        }

        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        try {
            $this->applyMailConfig();
            $copy = $this->copy($event, $locale, $reservation, $changes);
            $reference = $this->reference($reservation);
            $subject = '[PayMyDine] '.$copy['owner_subject'].' · '.$reference;
            $html = $this->emailHtml($copy, $reservation, $locale, true);

            Mail::send([], [], function ($message) use ($recipient, $subject, $html) {
                $message->to($recipient);
                $message->subject($subject);
                $message->setBody($html, 'text/html');
            });

            return true;
        } catch (Throwable $error) {
            Log::warning('PMD reservation owner email failed', [
                'reservation_id' => (int)$reservation->getKey(),
                'event' => $event,
                'message' => $error->getMessage(),
            ]);

            return false;
        }
    }

    private function sendGuestWhatsapp(
        Reservations_model $reservation,
        string $event,
        string $locale,
        array $changes
    ): bool {
        if (!$this->boolSetting('pmd_reservation_whatsapp_enabled', false)) {
            return false;
        }

        $preference = $this->preferenceForReservation((int)$reservation->getKey());
        if (empty($preference['whatsapp_opt_in'])) {
            return false;
        }

        $phoneNumberId = trim((string)$this->setting('pmd_whatsapp_phone_number_id', ''));
        $token = trim((string)$this->setting('pmd_whatsapp_access_token', ''));
        $template = trim((string)$this->setting('pmd_whatsapp_template_'.$event, ''));

        if ($phoneNumberId === '' || $token === '' || $template === '') {
            return false;
        }

        $to = $this->normalizePhone((string)$reservation->telephone);
        if ($to === '') {
            Log::warning('PMD reservation WhatsApp skipped: unusable guest phone', [
                'reservation_id' => (int)$reservation->getKey(),
            ]);

            return false;
        }

        $copy = $this->copy($event, $locale, $reservation, $changes);
        $language = trim((string)$this->setting('pmd_whatsapp_template_language', ''));
        if ($language === '') {
            $language = [
                'de' => 'de',
                'en' => 'en_GB',
                'tr' => 'tr',
                'ar' => 'ar',
            ][$locale] ?? 'en_GB';
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $to,
            'type' => 'template',
            'template' => [
                'name' => $template,
                'language' => ['code' => $language],
                'components' => [[
                    'type' => 'body',
                    'parameters' => [
                        ['type' => 'text', 'text' => $copy['restaurant']],
                        ['type' => 'text', 'text' => $copy['reference']],
                        ['type' => 'text', 'text' => $copy['date']],
                        ['type' => 'text', 'text' => $copy['time']],
                        ['type' => 'text', 'text' => (string)$copy['guests']],
                        ['type' => 'text', 'text' => $copy['manage_url']],
                    ],
                ]],
            ],
        ];

        try {
            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(12)
                ->post(
                    $this->whatsappGraphBase().'/'.rawurlencode($phoneNumberId).'/messages',
                    $payload
                );

            if (!$response->successful()) {
                Log::warning('PMD reservation WhatsApp send failed', [
                    'reservation_id' => (int)$reservation->getKey(),
                    'event' => $event,
                    'http_status' => $response->status(),
                    'provider_message' => (string)($response->json('error.message') ?: ''),
                ]);
                return false;
            }

            return true;
        } catch (Throwable $error) {
            Log::warning('PMD reservation WhatsApp send exception', [
                'reservation_id' => (int)$reservation->getKey(),
                'event' => $event,
                'message' => $error->getMessage(),
            ]);

            return false;
        }
    }

    private function copy(
        string $event,
        string $locale,
        Reservations_model $reservation,
        array $changes
    ): array {
        $restaurant = $reservation->location
            ? trim((string)$reservation->location->location_name)
            : trim((string)$this->setting('site_name', 'Restaurant'));
        $reference = $this->reference($reservation);
        $date = $reservation->reserve_date instanceof \DateTimeInterface
            ? $reservation->reserve_date->format('Y-m-d')
            : substr((string)$reservation->reserve_date, 0, 10);
        $time = $reservation->reserve_time instanceof \DateTimeInterface
            ? $reservation->reserve_time->format('H:i')
            : substr((string)$reservation->reserve_time, 0, 5);
        $manageUrl = url('/book').'?manage='.rawurlencode((string)$reservation->hash).'&lang='.rawurlencode($locale);

        $packs = [
            'en' => [
                'created' => ['Reservation received', 'We received your reservation request.', 'New reservation'],
                'updated' => ['Reservation updated', 'Your reservation has been updated.', 'Reservation updated'],
                'canceled' => ['Reservation canceled', 'Your reservation has been canceled.', 'Reservation canceled'],
                'manage' => 'Manage reservation',
                'details' => 'Reservation details',
                'changes' => 'Changes',
            ],
            'de' => [
                'created' => ['Reservierung eingegangen', 'Ihre Reservierungsanfrage ist eingegangen.', 'Neue Reservierung'],
                'updated' => ['Reservierung aktualisiert', 'Ihre Reservierung wurde aktualisiert.', 'Reservierung aktualisiert'],
                'canceled' => ['Reservierung storniert', 'Ihre Reservierung wurde storniert.', 'Reservierung storniert'],
                'manage' => 'Reservierung verwalten',
                'details' => 'Reservierungsdetails',
                'changes' => 'Änderungen',
            ],
            'tr' => [
                'created' => ['Rezervasyon alındı', 'Rezervasyon talebiniz alındı.', 'Yeni rezervasyon'],
                'updated' => ['Rezervasyon güncellendi', 'Rezervasyonunuz güncellendi.', 'Rezervasyon güncellendi'],
                'canceled' => ['Rezervasyon iptal edildi', 'Rezervasyonunuz iptal edildi.', 'Rezervasyon iptal edildi'],
                'manage' => 'Rezervasyonu yönet',
                'details' => 'Rezervasyon bilgileri',
                'changes' => 'Değişiklikler',
            ],
            'ar' => [
                'created' => ['تم استلام الحجز', 'تم استلام طلب الحجز الخاص بك.', 'حجز جديد'],
                'updated' => ['تم تحديث الحجز', 'تم تحديث حجزك.', 'تم تحديث الحجز'],
                'canceled' => ['تم إلغاء الحجز', 'تم إلغاء حجزك.', 'تم إلغاء الحجز'],
                'manage' => 'إدارة الحجز',
                'details' => 'تفاصيل الحجز',
                'changes' => 'التغييرات',
            ],
        ];

        $pack = $packs[$locale] ?? $packs['en'];
        $eventCopy = $pack[$event] ?? $pack['updated'];

        return [
            'subject' => $restaurant.' · '.$eventCopy[0].' '.$reference,
            'headline' => $eventCopy[0],
            'intro' => $eventCopy[1],
            'owner_subject' => $eventCopy[2],
            'manage_label' => $pack['manage'],
            'details_label' => $pack['details'],
            'changes_label' => $pack['changes'],
            'restaurant' => $restaurant !== '' ? $restaurant : 'Restaurant',
            'reference' => $reference,
            'date' => $date,
            'time' => $time,
            'guests' => (int)$reservation->guest_num,
            'manage_url' => $manageUrl,
            'changes' => $this->localizedChanges($changes, $locale),
        ];
    }

    private function localizedChanges(array $changes, string $locale): array
    {
        $maps = [
            'de' => [
                'date' => 'Datum',
                'time' => 'Uhrzeit',
                'party size' => 'Personenzahl',
                'first name' => 'Vorname',
                'last name' => 'Nachname',
                'email' => 'E-Mail',
                'phone' => 'Telefon',
                'table preferences' => 'Tischwunsch',
                'notes' => 'Hinweise',
                'changed' => 'geändert',
            ],
            'tr' => [
                'date' => 'Tarih',
                'time' => 'Saat',
                'party size' => 'Kişi sayısı',
                'first name' => 'Ad',
                'last name' => 'Soyad',
                'email' => 'E-posta',
                'phone' => 'Telefon',
                'table preferences' => 'Masa tercihi',
                'notes' => 'Notlar',
                'changed' => 'değiştirildi',
            ],
            'ar' => [
                'date' => 'التاريخ',
                'time' => 'الوقت',
                'party size' => 'عدد الأشخاص',
                'first name' => 'الاسم الأول',
                'last name' => 'اسم العائلة',
                'email' => 'البريد الإلكتروني',
                'phone' => 'الهاتف',
                'table preferences' => 'تفضيلات الطاولة',
                'notes' => 'ملاحظات',
                'changed' => 'تم التغيير',
            ],
        ];

        $map = $maps[$locale] ?? [];
        $result = [];

        foreach ($changes as $change) {
            $change = trim((string)$change);
            if ($change === '') {
                continue;
            }

            if (!$map) {
                $result[] = $change;
                continue;
            }

            $translated = $change;
            foreach ([
                'table preferences',
                'party size',
                'first name',
                'last name',
                'date',
                'time',
                'email',
                'phone',
                'notes',
            ] as $label) {
                if (str_starts_with($translated, $label.' ')) {
                    $translated = $map[$label].substr($translated, strlen($label));
                    break;
                }
            }

            if (str_ends_with($translated, ' changed')) {
                $translated = substr($translated, 0, -8).' '.$map['changed'];
            }

            $result[] = $translated;
        }

        return $result;
    }

    private function emailHtml(
        array $copy,
        Reservations_model $reservation,
        string $locale,
        bool $ownerCopy = false
    ): string {
        $dir = $locale === 'ar' ? 'rtl' : 'ltr';
        $name = trim((string)$reservation->first_name.' '.(string)$reservation->last_name);
        $partyLabel = [
            'de' => 'Personen',
            'tr' => 'kişi',
            'ar' => 'أشخاص',
            'en' => 'guests',
        ][$locale] ?? 'guests';

        $details = [
            $copy['reference'],
            $copy['date'].' · '.$copy['time'],
            (string)$copy['guests'].' '.$partyLabel,
        ];

        if ($ownerCopy && $name !== '') {
            $details[] = $name;
        }

        $changesHtml = '';
        if (!empty($copy['changes'])) {
            $items = '';
            foreach ($copy['changes'] as $change) {
                $items .= '<li style="margin:4px 0">'.e($change).'</li>';
            }
            $changesHtml = '<div style="margin-top:20px"><strong>'.e($copy['changes_label']).'</strong><ul style="padding-inline-start:20px;margin:8px 0 0">'.$items.'</ul></div>';
        }

        $guaranteeHtml = '';
        try {
            $guarantee = app(PmdReservationGuaranteeService::class)
                ->publicGuaranteePayload((int)$reservation->getKey());

            if ($guarantee && in_array((string)($guarantee['status'] ?? ''), ['active', 'charge_failed', 'action_required'], true)) {
                $amount = number_format(
                    max(0, (int)($guarantee['amount_cents'] ?? 0)) / 100,
                    2,
                    $locale === 'de' ? ',' : '.',
                    $locale === 'de' ? '.' : ','
                ).' '.strtoupper((string)($guarantee['currency'] ?? 'EUR'));

                $guaranteeLabel = $locale === 'de'
                    ? 'Reservierungsgarantie'
                    : ($locale === 'tr'
                        ? 'Rezervasyon garantisi'
                        : ($locale === 'ar' ? 'ضمان الحجز' : 'Reservation guarantee'));

                $terms = trim((string)($guarantee['terms_text'] ?? ''));
                $guaranteeHtml = '<div style="margin-top:20px;padding:14px 16px;border:1px solid #b7c9c1;background:#f4f8f6">'
                    .'<strong style="color:#0a6952">'.e($guaranteeLabel).'</strong>'
                    .'<div style="margin-top:4px;font-family:Georgia,serif;font-size:18px">'.e($amount).'</div>'
                    .($terms !== '' ? '<p style="margin:8px 0 0;color:#64716b;font-size:13px">'.e($terms).'</p>' : '')
                    .'</div>';
            }
        } catch (Throwable $ignored) {
        }

        return '<div dir="'.e($dir).'" style="font-family:Arial,sans-serif;color:#1d2722;line-height:1.6;max-width:620px;margin:0 auto;padding:28px">'
            .'<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0a6952;font-weight:700">'.e($copy['restaurant']).'</div>'
            .'<h1 style="font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.1;margin:10px 0 14px">'.e($copy['headline']).'</h1>'
            .'<p style="margin:0 0 22px;color:#64716b">'.e($copy['intro']).'</p>'
            .'<div style="border-top:1px solid #d9d2c5;border-bottom:1px solid #d9d2c5;padding:16px 0">'
            .'<strong style="display:block;margin-bottom:8px">'.e($copy['details_label']).'</strong>'
            .'<div>'.e(implode(' · ', $details)).'</div>'
            .'</div>'
            .$changesHtml
            .$guaranteeHtml
            .'<p style="margin:24px 0 0"><a href="'.e($copy['manage_url']).'" style="display:inline-block;background:#1d2722;color:#fff;text-decoration:none;padding:13px 18px;font-weight:700">'.e($copy['manage_label']).'</a></p>'
            .'</div>';
    }

    private function mailReady(): bool
    {
        $sender = strtolower(trim((string)$this->setting('sender_email', '')));
        if ($sender === '') {
            $sender = strtolower(trim((string)$this->setting('site_email', '')));
        }

        if (filter_var($sender, FILTER_VALIDATE_EMAIL) === false) {
            return false;
        }

        $protocol = strtolower(trim((string)$this->setting('protocol', 'mail'))) ?: 'mail';

        if ($protocol === 'smtp') {
            return trim((string)$this->setting('smtp_host', '')) !== '';
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

        return in_array($protocol, ['mail', 'sendmail'], true);
    }

    private function applyMailConfig(): void
    {
        $protocol = trim((string)$this->setting('protocol', 'mail')) ?: 'mail';
        $senderName = trim((string)$this->setting('sender_name', ''))
            ?: trim((string)$this->setting('site_name', 'PayMyDine'));
        $senderEmail = strtolower(trim((string)$this->setting('sender_email', '')))
            ?: strtolower(trim((string)$this->setting('site_email', '')));

        config([
            'mail.default' => $protocol,
            'mail.from.name' => $senderName,
            'mail.from.address' => $senderEmail,
        ]);

        if ($protocol === 'smtp') {
            config([
                'mail.mailers.smtp.host' => $this->setting('smtp_host', ''),
                'mail.mailers.smtp.port' => (int)$this->setting('smtp_port', 587),
                'mail.mailers.smtp.encryption' => trim((string)$this->setting('smtp_encryption', 'tls')) ?: null,
                'mail.mailers.smtp.username' => trim((string)$this->setting('smtp_user', '')) ?: null,
                'mail.mailers.smtp.password' => trim((string)$this->setting('smtp_pass', '')) ?: null,
            ]);
        } elseif ($protocol === 'mailgun') {
            config([
                'services.mailgun.domain' => $this->setting('mailgun_domain', ''),
                'services.mailgun.secret' => $this->setting('mailgun_secret', ''),
            ]);
        } elseif ($protocol === 'postmark') {
            config(['services.postmark.token' => $this->setting('postmark_token', '')]);
        } elseif ($protocol === 'ses') {
            config([
                'services.ses.key' => $this->setting('ses_key', ''),
                'services.ses.secret' => $this->setting('ses_secret', ''),
                'services.ses.region' => $this->setting('ses_region', ''),
            ]);
        }
    }

    private function eventEnabled(string $event): bool
    {
        return $this->boolSetting('pmd_reservation_notify_'.$event, true);
    }

    private function whatsappGraphBase(): string
    {
        $version = preg_replace(
            '/[^0-9v.]/',
            '',
            trim((string)$this->setting('pmd_whatsapp_graph_version', 'v23.0'))
        );

        if ($version === '' || $version === 'v') {
            $version = 'v23.0';
        }
        if ($version[0] !== 'v') {
            $version = 'v'.$version;
        }

        return 'https://graph.facebook.com/'.$version;
    }

    private function normalizePhone(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return '';
        }

        $digits = preg_replace('/\D+/', '', $raw) ?: '';
        if ($digits === '') {
            return '';
        }

        if (str_starts_with($raw, '+')) {
            return $digits;
        }

        if (str_starts_with($digits, '00')) {
            return substr($digits, 2);
        }

        $country = preg_replace(
            '/\D+/',
            '',
            (string)$this->setting('pmd_whatsapp_default_country_code', '')
        ) ?: '';

        if ($country === '') {
            return '';
        }

        return $country.ltrim($digits, '0');
    }

    private function reference(Reservations_model $reservation): string
    {
        return 'R'.str_pad((string)$reservation->getKey(), 6, '0', STR_PAD_LEFT);
    }

    private function locale(string $locale): string
    {
        $locale = strtolower(substr(trim($locale), 0, 2));
        return in_array($locale, ['en', 'de', 'tr', 'ar'], true) ? $locale : 'de';
    }

    private function boolSetting(string $key, bool $fallback): bool
    {
        $value = $this->setting($key, $fallback ? '1' : '0');
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private function setting(string $key, $fallback = '')
    {
        try {
            $value = DB::table('settings')->where('item', $key)->value('value');
            return $value !== null ? $value : $fallback;
        } catch (Throwable $error) {
            try {
                return setting($key, $fallback);
            } catch (Throwable $ignored) {
                return $fallback;
            }
        }
    }
}
