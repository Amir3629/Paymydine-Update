<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * R31 PayMyDine-managed WhatsApp connector.
 *
 * One Meta App, one operator-managed system-user credential, separate Meta
 * business numbers per location. NEVER take a phone ID, tenant ID, sender URL
 * or token from an owner form or a customer webhook.
 *
 * All sending is fail-closed until an operator binds and activates a
 * phone_number_id + WABA for an active tenant and config is enabled.
 */
final class PmdManagedWhatsAppService
{
    public function currentTenantId(): int
    {
        try {
            $tenant = request()->attributes->get('tenant');
            if (!$tenant && app()->bound('tenant')) {
                $tenant = app('tenant');
            }
            return (int)($tenant->id ?? 0);
        } catch (Throwable $error) {
            return 0;
        }
    }

    public function state(int $tenantId, int $locationId): array
    {
        if (config('pmd_whatsapp.shared_enabled', false) === true) {
            return app(PmdSharedWhatsAppService::class)->state($tenantId, $locationId);
        }

        $result = [
            'connected' => false,
            'ready' => false,
            'status' => 'not_connected',
            'phone_last4' => '',
        ];

        if ($tenantId < 1 || $locationId < 1) {
            return $result;
        }

        try {
            if (!app(PmdWhatsAppSchema::class)->installed()) {
                $result['status'] = 'not_installed';
                return $result;
            }
            $db = DB::connection('mysql');
            $channel = $db->table('pmd_whatsapp_channels as c')
                ->join('tenants as t', 't.id', '=', 'c.tenant_id')
                ->where('c.tenant_id', $tenantId)
                ->where('c.location_id', $locationId)
                ->where('c.enabled', 1)
                ->where('t.status', 'active')
                ->first(['c.phone_number_id']);
            if ($channel) {
                $result['connected'] = true;
                $result['phone_last4'] = substr((string)$channel->phone_number_id, -4);
            }

            $result['ready'] = $result['connected'] && $this->credentialsReady()
                && (bool)config('pmd_whatsapp.enabled', false)
                && strlen((string)config('pmd_whatsapp.verify_token', '')) >= 32
                && strlen((string)config('pmd_whatsapp.app_secret', '')) >= 16
                && trim((string)config('pmd_whatsapp.webhook_host', '')) !== '';

            $result['status'] = $result['ready'] ? 'ready'
                : ($result['connected'] ? 'awaiting_platform' : 'not_connected');
        } catch (Throwable $error) {
            // Fail closed when central DB is unavailable; no tokens or
            // provider diagnostics are rendered into restaurant settings.
            $result['status'] = 'unavailable';
        }

        return $result;
    }

    public function credentialsReady(): bool
    {
        return config('pmd_whatsapp.managed_enabled', false) === true
            && strlen((string)config('pmd_whatsapp.system_user_token', '')) >= 32
            && preg_match('/^v[0-9]+\.[0-9]+$/D',
                (string)config('pmd_whatsapp.graph_version', '')) === 1;
    }

    public function transport(int $tenantId, int $locationId): array
    {
        if (config('pmd_whatsapp.shared_enabled', false) === true) {
            return app(PmdSharedWhatsAppService::class)->transport($tenantId, $locationId);
        }

        if ($tenantId < 1 || $locationId < 1
            || $this->state($tenantId, $locationId)['ready'] !== true) {
            throw new RuntimeException('PayMyDine WhatsApp channel is not ready.');
        }
        $channel = DB::connection('mysql')->table('pmd_whatsapp_channels')
            ->where('tenant_id', $tenantId)
            ->where('location_id', $locationId)
            ->where('enabled', 1)
            ->first(['phone_number_id']);
        if (!$channel) {
            throw new RuntimeException('The WhatsApp sender is not provisioned.');
        }
        $phone = (string)$channel->phone_number_id;
        if (!preg_match('/^[0-9]{5,32}$/D', $phone)) {
            throw new RuntimeException('Invalid managed WhatsApp sender.');
        }

        // Only Graph endpoint derived from a central operator-provisioned ID.
        return [
            'url' => 'https://graph.facebook.com/'
                .(string)config('pmd_whatsapp.graph_version')
                .'/'.$phone.'/messages',
            'token' => (string)config('pmd_whatsapp.system_user_token'),
            'phone_number_id' => $phone,
        ];
    }

    public function hasTemplatesForEvents(array $events): bool
    {
        $any = false;
        foreach (['created', 'updated', 'canceled'] as $event) {
            if (empty($events[$event])) {
                continue;
            }
            $any = true;
            $name = trim((string)config('pmd_whatsapp.templates.'.$event, ''));
            if (!preg_match('/^[a-z0-9_]{1,512}$/D', $name)) {
                return false;
            }
        }

        // R34: shared senders must explicitly list languages with approved
        // templates. Merely entering valid template names is not enough.
        if (config('pmd_whatsapp.shared_enabled', false) === true
            && !PmdWhatsAppLocalePolicy::approvedCodes((string)config(
                'pmd_whatsapp.shared_approved_template_locales', ''
            ))) {
            return false;
        }
        // This validates operator configuration only. Real Meta approval and
        // delivery must still be verified from WhatsApp Manager/webhooks.
        return $any;
    }

    public function sendTemplate(
        int $tenantId,
        int $locationId,
        string $recipient,
        string $event,
        array $context,
        string $previewText
    ): bool {
        if (!in_array($event, ['created', 'updated', 'canceled'], true)) {
            return false;
        }
        $name = trim((string)config('pmd_whatsapp.templates.'.$event, ''));
        $language = trim((string)config('pmd_whatsapp.template_language', ''));
        $to = preg_replace('/[^0-9]/', '', $recipient);
        if (!preg_match('/^[a-z0-9_]{1,512}$/D', $name)
            || !preg_match('/^[a-z]{2}(?:_[A-Z]{2})?$/D', $language)
            || !preg_match('/^[0-9]{6,20}$/D', $to)) {
            return false;
        }

        try {
            $transport = $this->transport($tenantId, $locationId);
            $isShared = ($transport['mode'] ?? '') === 'shared';
            $reservationId = (int)($context['reservation_id'] ?? 0);
            // Public guests must individually opt in for proactive
            // PayMyDine-branded WhatsApp templates. A test recipient or a
            // different reservation/phone is NOT a valid opt-in.
            if ($isShared) {
                $shared = app(PmdSharedWhatsAppService::class);
                $bookingLocale = $shared->reservationLocale(
                    $tenantId, $locationId, $reservationId, $to
                );
                // Only the language recorded with the guest's explicit
                // booking consent can choose the Meta template variant.
                if ($bookingLocale === null
                    || !PmdWhatsAppLocalePolicy::isApproved(
                        $bookingLocale,
                        (string)config('pmd_whatsapp.shared_approved_template_locales', '')
                    )) {
                    return false;
                }
                $language = PmdWhatsAppLocalePolicy::metaCode($bookingLocale);
            }
            $parameters = [];
            foreach ([
                'restaurant_name', 'reference', 'reservation_date',
                'reservation_time', 'reservation_guests', 'manage_url',
            ] as $key) {
                $parameters[] = [
                    'type' => 'text',
                    'text' => mb_substr((string)($context[$key] ?? ''), 0, 1024),
                ];
            }
            $components = [[
                'type' => 'body',
                'parameters' => $parameters,
            ]];
            if ($isShared && config('pmd_whatsapp.shared_quick_reply_enabled', false) === true) {
                // These are native Meta quick-reply buttons. The approved
                // templates MUST have two buttons at indices 0 and 1.
                // The payload has NO reservation token or customer data.
                if (PmdWhatsAppButtonPolicy::safeManageUrl(
                    (string)($context['manage_url'] ?? ''),
                    (string)config('pmd_whatsapp.shared_booking_hosts', '')
                ) === null) {
                    return false;
                }
                $components[] = [
                    'type' => 'button', 'sub_type' => 'quick_reply', 'index' => '0',
                    'parameters' => [['type' => 'payload', 'payload' => 'PMD_MANAGE']],
                ];
                $components[] = [
                    'type' => 'button', 'sub_type' => 'quick_reply', 'index' => '1',
                    'parameters' => [['type' => 'payload', 'payload' => 'PMD_NEW_BOOKING']],
                ];
            }
            $res = Http::asJson()->acceptJson()
                ->withToken($transport['token'])->timeout(8)->connectTimeout(3)
                ->withOptions(['allow_redirects' => false])
                ->post($transport['url'], [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $to,
                    'type' => 'template',
                    'template' => [
                        'name' => $name,
                        'language' => ['code' => $language],
                        'components' => $components,
                    ],
                ]);
            if (!$res->successful()) {
                Log::warning('PMD managed WhatsApp template was rejected', [
                    'event' => $event,
                    'http_status' => $res->status(),
                ]);
                return false;
            }

            // A successful Meta API request is an accepted message, NOT proof
            // the customer received it. Actual delivery arrives via webhook.
            try {
                $metaId = (string)$res->json('messages.0.id', '');
                if ($isShared) {
                    app(PmdSharedWhatsAppService::class)->recordAccepted(
                        (int)$transport['sender_id'], $tenantId, $locationId,
                        $reservationId, $to, $metaId, $previewText,
                        (string)($context['manage_url'] ?? '')
                    );
                } else {
                    app(PmdWhatsAppGateway::class)->recordAcceptedReservationMessage(
                        $tenantId, $locationId, $transport['phone_number_id'],
                        $to, $metaId, $previewText
                    );
                }
            } catch (Throwable $ignored) {
                // Already accepted by Meta. Missing receipt causes replies to
                // be quarantined centrally, never guessed into a tenant.
                Log::warning('PMD WhatsApp delivery receipt unavailable', [
                    'event' => $event,
                    'mode' => $isShared ? 'shared' : 'dedicated',
                ]);
            }
            return true;
        } catch (Throwable $error) {
            Log::warning('PMD managed WhatsApp send unavailable', [
                'error_type' => get_class($error),
            ]);
            return false;
        }
    }
}
