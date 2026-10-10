<?php

namespace App\Services\WhatsApp;

use Carbon\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * R33 shared-number control plane.
 *
 * A single PayMyDine-owned Meta sender belongs to the PLATFORM, not to any
 * tenant. Tenant grants live in a separate central table. Inbound routing
 * REQUIRES signed Meta reply-to-context correlation to an accepted outbound
 * message for the exact WhatsApp sender + recipient. No fallback guess.
 */
final class PmdSharedWhatsAppService
{
    private const TABLES = [
        'pmd_wa_shared_senders',
        'pmd_wa_shared_locations',
        'pmd_wa_shared_consents',
        'pmd_wa_shared_optouts',
        'pmd_wa_shared_action_jobs',
        'pmd_wa_shared_messages',
        'pmd_wa_shared_unrouted',
    ];

    public function installed(): bool
    {
        try {
            $schema = DB::connection('mysql')->getSchemaBuilder();
            foreach (self::TABLES as $table) {
                if (!$schema->hasTable($table)) {
                    return false;
                }
            }
            return true;
        } catch (Throwable $error) {
            return false;
        }
    }

    public function globalReady(): bool
    {
        return config('pmd_whatsapp.shared_enabled', false) === true
            && config('pmd_whatsapp.enabled', false) === true
            && app(PmdManagedWhatsAppService::class)->credentialsReady()
            && strlen((string)config('pmd_whatsapp.verify_token', '')) >= 32
            && strlen((string)config('pmd_whatsapp.app_secret', '')) >= 16
            && trim((string)config('pmd_whatsapp.webhook_host', '')) !== '';
    }

    public function consentFormEnabled(): bool
    {
        return config('pmd_whatsapp.shared_consent_form_enabled', false) === true
            && config('pmd_whatsapp.shared_enabled', false) === true;
    }

    public function activeSender(int $tenantId, int $locationId): ?object
    {
        if (!$this->globalReady() || !$this->installed()
            || $tenantId < 1 || $locationId < 1) {
            return null;
        }

        $rows = DB::connection('mysql')->table('pmd_wa_shared_locations as l')
            ->join('pmd_wa_shared_senders as s', 's.id', '=', 'l.sender_id')
            ->join('tenants as t', 't.id', '=', 'l.tenant_id')
            ->where('l.tenant_id', $tenantId)
            ->where('l.location_id', $locationId)
            ->where('l.enabled', 1)
            ->where('s.enabled', 1)
            ->where('t.status', 'active')
            ->limit(2)
            ->get(['s.id', 's.phone_number_id', 's.waba_id']);

        // A restaurant having two active shared senders is an ambiguous
        // infrastructure configuration. Never silently pick one.
        return $rows->count() === 1 ? $rows->first() : null;
    }

    public function state(int $tenantId, int $locationId): array
    {
        try {
            $sender = $this->activeSender($tenantId, $locationId);
            return [
                'ready' => $sender !== null,
                'connected' => $sender !== null,
                'status' => $sender !== null ? 'ready' : 'awaiting_platform',
                'phone_last4' => $sender ? substr((string)$sender->phone_number_id, -4) : '',
                'shared' => true,
                'test_allowed' => false,
            ];
        } catch (Throwable $error) {
            return [
                'ready' => false, 'connected' => false,
                'status' => 'unavailable', 'phone_last4' => '',
                'shared' => true, 'test_allowed' => false,
            ];
        }
    }

    public function transport(int $tenantId, int $locationId): array
    {
        $sender = $this->activeSender($tenantId, $locationId);
        if (!$sender) {
            throw new RuntimeException('Shared sender is not ready for this restaurant.');
        }

        $id = (string)$sender->phone_number_id;
        $version = (string)config('pmd_whatsapp.graph_version', '');
        $token = (string)config('pmd_whatsapp.system_user_token', '');

        if (!preg_match('/^[0-9]{5,32}$/D', $id)
            || !preg_match('/^v[0-9]+\.[0-9]+$/D', $version)
            || strlen($token) < 32) {
            throw new RuntimeException('Platform Meta configuration is incomplete.');
        }

        return [
            'sender_id' => (int)$sender->id,
            'phone_number_id' => $id,
            'url' => 'https://graph.facebook.com/'.$version.'/'.$id.'/messages',
            'token' => $token,
            'mode' => 'shared',
        ];
    }

    public function recordBookingConsent(
        int $tenantId,
        int $locationId,
        int $reservationId,
        string $guestPhone,
        string $locale = 'de',
        string $source = 'public_booking_opt_in'
    ): bool {
        // Only called by the server AFTER a successful public booking with
        // a separately checked, optional WhatsApp opt-in. No public endpoint.
        if (!$this->consentFormEnabled() || !$this->installed()
            || $tenantId < 1 || $locationId < 1 || $reservationId < 1) {
            return false;
        }

        $phone = $this->normalizePhone($guestPhone);
        if ($phone === ''
            || !in_array($source, [
                'public_booking_opt_in',
                'admin_verified_guest_consent',
            ], true)) {
            return false;
        }
        $locale = PmdWhatsAppLocalePolicy::normalize($locale);
        $db = DB::connection('mysql');
        // A new separately checked consent overrides a previous STOP for
        // future bookings only; older reservation consents remain revoked.
        $db->table('pmd_wa_shared_optouts')
            ->where('wa_id_hash', $this->phoneHash($phone))->delete();
        $db->table('pmd_wa_shared_consents')->updateOrInsert(
            [
                'tenant_id' => $tenantId,
                'location_id' => $locationId,
                'reservation_id' => $reservationId,
            ],
            [
                'wa_id_hash' => $this->phoneHash($phone),
                'source' => $source,
                'locale' => $locale,
                'consented_at' => now(),
                'revoked_at' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
        return true;
    }

    public function hasBookingConsent(
        int $tenantId,
        int $locationId,
        int $reservationId,
        string $recipient
    ): bool {
        if (!$this->installed() || $tenantId < 1 || $locationId < 1
            || $reservationId < 1) {
            return false;
        }

        $phone = $this->normalizePhone($recipient);
        if ($phone === '') {
            return false;
        }

        $db = DB::connection('mysql');
        if ($db->table('pmd_wa_shared_optouts')
            ->where('wa_id_hash', $this->phoneHash($phone))->exists()) {
            return false;
        }
        return $db->table('pmd_wa_shared_consents')
            ->where('tenant_id', $tenantId)
            ->where('location_id', $locationId)
            ->where('reservation_id', $reservationId)
            ->where('wa_id_hash', $this->phoneHash($phone))
            ->whereNotNull('locale')
            ->whereNull('revoked_at')
            ->exists();
    }

    /**
     * Locale is bound to an explicitly opted-in booking, never inferred
     * from a German phone prefix or the current web/admin language.
     */
    public function reservationLocale(
        int $tenantId,
        int $locationId,
        int $reservationId,
        string $recipient
    ): ?string {
        $phone = $this->normalizePhone($recipient);
        if (!$this->installed() || $tenantId < 1 || $locationId < 1
            || $reservationId < 1 || $phone === '') {
            return null;
        }
        $db = DB::connection('mysql');
        if ($db->table('pmd_wa_shared_optouts')
            ->where('wa_id_hash', $this->phoneHash($phone))->exists()) {
            return null;
        }
        $locale = $db->table('pmd_wa_shared_consents')
            ->where('tenant_id', $tenantId)
            ->where('location_id', $locationId)
            ->where('reservation_id', $reservationId)
            ->where('wa_id_hash', $this->phoneHash($phone))
            ->whereNull('revoked_at')
            ->value('locale');

        return is_string($locale) && in_array($locale, ['de','en','tr','ar'], true)
            ? $locale : null;
    }

    public function recordAccepted(
        int $senderId,
        int $tenantId,
        int $locationId,
        int $reservationId,
        string $recipient,
        string $metaMessageId,
        string $preview,
        string $manageUrl = ''
    ): void {
        if ($senderId < 1 || $tenantId < 1 || $locationId < 1
            || $reservationId < 1
            || $metaMessageId === '' || strlen($metaMessageId) > 190
            || !$this->hasBookingConsent($tenantId, $locationId, $reservationId, $recipient)) {
            throw new RuntimeException('Shared reservation receipt cannot be authenticated.');
        }

        $sender = $this->activeSender($tenantId, $locationId);
        if (!$sender || (int)$sender->id !== $senderId) {
            throw new RuntimeException('Shared sender binding changed.');
        }

        $waId = $this->normalizePhone($recipient);
        $db = DB::connection('mysql');
        $db->table('pmd_wa_shared_messages')->insertOrIgnore([
            'sender_id' => $senderId,
            'tenant_id' => $tenantId,
            'location_id' => $locationId,
            'reservation_id' => $reservationId,
            'external_message_id' => $metaMessageId,
            'wa_id_hash' => $this->phoneHash($waId),
            'wa_id_ciphertext' => Crypt::encryptString($waId),
            'direction' => 'out',
            'kind' => 'template',
            'body_ciphertext' => Crypt::encryptString(mb_substr($preview, 0, 4000)),
            // A bearer management link is never part of button payload.
            'manage_url_ciphertext' => PmdWhatsAppButtonPolicy::safeManageUrl($manageUrl)
                ? Crypt::encryptString($manageUrl) : null,
            'delivery_status' => 'accepted',
            'received_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function ingest(array $payload): void
    {
        // Incoming signed STOP messages should continue to be honoured even
        // when the outgoing system-user token is temporarily disabled.
        // Webhook controller has already validated signature, HTTPS and host.
        if (config('pmd_whatsapp.shared_enabled', false) !== true
            || config('pmd_whatsapp.enabled', false) !== true
            || !$this->installed()) {
            return;
        }
        $entries = $payload['entry'] ?? [];
        if (!is_array($entries) || count($entries) > 25) {
            throw new RuntimeException('Invalid Meta entry batch.');
        }

        $db = DB::connection('mysql');
        foreach ($entries as $entry) {
            $wabaId = is_array($entry) ? (string)($entry['id'] ?? '') : '';
            if (!preg_match('/^[0-9]{5,32}$/D', $wabaId)) {
                continue;
            }
            $changes = is_array($entry) ? ($entry['changes'] ?? []) : [];
            if (!is_array($changes) || count($changes) > 25) {
                throw new RuntimeException('Invalid Meta changes batch.');
            }
            foreach ($changes as $change) {
                if (!is_array($change) || ($change['field'] ?? '') !== 'messages') {
                    continue;
                }
                $value = $change['value'] ?? [];
                if (!is_array($value)) {
                    continue;
                }
                $numberId = (string)($value['metadata']['phone_number_id'] ?? '');
                if (!preg_match('/^[0-9]{5,32}$/D', $numberId)) {
                    continue;
                }
                $sender = $db->table('pmd_wa_shared_senders')
                    ->where('phone_number_id', $numberId)
                    ->where('waba_id', $wabaId)
                    ->where('enabled', 1)->first(['id']);
                if (!$sender) {
                    continue;
                }

                $messages = $value['messages'] ?? [];
                $statuses = $value['statuses'] ?? [];
                if (!is_array($messages) || !is_array($statuses)
                    || count($messages) > 100 || count($statuses) > 100) {
                    throw new RuntimeException('Meta event batch exceeds limits.');
                }
                foreach ($messages as $message) {
                    if (is_array($message)) {
                        $this->storeIncoming($db, (int)$sender->id, $message);
                    }
                }
                foreach ($statuses as $status) {
                    if (is_array($status)) {
                        $this->updateDelivery($db, (int)$sender->id, $status);
                    }
                }
            }
        }
    }

    private function storeIncoming($db, int $senderId, array $message): void
    {
        // Serialize all deliveries for one sender. Without a sender-row lock,
        // two webhook retries could race and place the same Meta ID in both
        // the routed and unrouted tables.
        $db->transaction(function () use ($db, $senderId, $message): void {
            $lock = $db->table('pmd_wa_shared_senders')
                ->where('id', $senderId)->lockForUpdate()->first(['id']);
            if (!$lock) {
                return;
            }
            $this->storeIncomingLocked($db, $senderId, $message);
        }, 3);
    }

    private function storeIncomingLocked($db, int $senderId, array $message): void
    {
        $id = trim((string)($message['id'] ?? ''));
        $waId = $this->normalizePhone((string)($message['from'] ?? ''));
        $timestamp = (string)($message['timestamp'] ?? '');
        if ($id === '' || strlen($id) > 190 || $waId === ''
            || !preg_match('/^[0-9]{10,11}$/D', $timestamp)
            || (int)$timestamp < 1577836800
            || (int)$timestamp > time() + 300) {
            return;
        }

        $kind = strtolower((string)($message['type'] ?? 'unknown'));
        if (!in_array($kind, [
            'text', 'button', 'interactive', 'image', 'video', 'audio',
            'document', 'location', 'contacts', 'sticker', 'reaction', 'unknown',
        ], true)) {
            $kind = 'unknown';
        }

        if ($kind === 'text') {
            $body = (string)($message['text']['body'] ?? '');
        } elseif ($kind === 'button') {
            $body = (string)($message['button']['text'] ?? '');
        } elseif ($kind === 'interactive') {
            $reply = $message['interactive']['button_reply']
                ?? ($message['interactive']['list_reply'] ?? []);
            $body = (string)($reply['title'] ?? '');
        } else {
            $body = '['.$kind.' message]';
        }
        $body = mb_substr($body, 0, 4000);
        $hash = $this->phoneHash($waId);

        // Check deduplication BEFORE applying STOP: replaying an older signed
        // event must not revoke an explicit consent granted afterward.
        if ($db->table('pmd_wa_shared_messages')->where('external_message_id', $id)->exists()
            || $db->table('pmd_wa_shared_unrouted')->where('external_message_id', $id)->exists()) {
            return;
        }
        $isStop = in_array(mb_strtolower(trim($body)), ['stop', 'unsubscribe'], true);
        if ($isStop) {
            // One platform phone, one platform-wide opt-out. The signed sender
            // is authenticated upstream. No tenant receives this STOP message.
            $db->table('pmd_wa_shared_optouts')->updateOrInsert(
                ['wa_id_hash' => $hash],
                ['stopped_at' => now(), 'updated_at' => now(), 'created_at' => now()]
            );
            $db->table('pmd_wa_shared_consents')
                ->where('wa_id_hash', $hash)->whereNull('revoked_at')
                ->update(['revoked_at' => now(), 'updated_at' => now()]);
        }

        $contextId = trim((string)($message['context']['id'] ?? ''));
        $candidates = [];
        if ($contextId !== '' && strlen($contextId) <= 190) {
            $candidates = $db->table('pmd_wa_shared_messages as m')
                ->join('pmd_wa_shared_locations as l', function ($join): void {
                    $join->on('l.sender_id', '=', 'm.sender_id')
                        ->on('l.tenant_id', '=', 'm.tenant_id')
                        ->on('l.location_id', '=', 'm.location_id');
                })
                ->join('pmd_wa_shared_senders as s', 's.id', '=', 'm.sender_id')
                ->join('tenants as t', 't.id', '=', 'm.tenant_id')
                ->where('m.external_message_id', $contextId)
                ->where('m.sender_id', $senderId)
                ->where('m.wa_id_hash', $hash)
                ->where('m.direction', 'out')
                ->where('l.enabled', 1)
                ->where('s.enabled', 1)
                ->where('t.status', 'active')
                ->limit(2)
                ->get([
                    'm.external_message_id', 'm.sender_id', 'm.wa_id_hash',
                    'm.direction', 'm.tenant_id', 'm.location_id',
                    'm.reservation_id', 'm.received_at',
                    'l.enabled as binding_enabled',
                    's.enabled as sender_enabled',
                    't.status as tenant_status',
                ])->all();
        }

        $route = !$isStop
            ? app(PmdSharedWhatsAppRoutingPolicy::class)->choose(
                $contextId, $senderId, $hash, $candidates, time() - 30 * 86400
            ) : null;
        $data = [
            'sender_id' => $senderId,
            'external_message_id' => $id,
            'wa_id_hash' => $hash,
            'wa_id_ciphertext' => Crypt::encryptString($waId),
            'kind' => $kind,
            'body_ciphertext' => Crypt::encryptString($body),
            'received_at' => Carbon::createFromTimestampUTC((int)$timestamp),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if ($route) {
            $db->table('pmd_wa_shared_messages')->insertOrIgnore($data + [
                'tenant_id' => (int)$route->tenant_id,
                'location_id' => (int)$route->location_id,
                'reservation_id' => (int)($route->reservation_id ?? 0) ?: null,
                'direction' => 'in',
                'delivery_status' => 'received',
            ]);
        } else {
            // No guess based on phone-only matching, text, booking reference,
            // time proximity or restaurant display name: central quarantine.
            $db->table('pmd_wa_shared_unrouted')->insertOrIgnore($data + [
                'reason' => $isStop ? 'customer_opted_out'
                    : ($contextId === '' ? 'missing_reply_context' : 'unverified_reply_context'),
            ]);
        }
    }

    private function updateDelivery($db, int $senderId, array $status): void
    {
        $id = (string)($status['id'] ?? '');
        $new = strtolower((string)($status['status'] ?? ''));
        if ($id === '' || strlen($id) > 190
            || !in_array($new, ['sent', 'delivered', 'read', 'failed'], true)) {
            return;
        }

        $query = $db->table('pmd_wa_shared_messages')
            ->where('sender_id', $senderId)
            ->where('external_message_id', $id)
            ->where('direction', 'out');

        $old = $query->value('delivery_status');
        $rank = [
            'accepted' => 0, 'sent' => 1, 'failed' => 1,
            'delivered' => 2, 'read' => 3,
        ];
        if ($old && ($rank[$new] ?? -1) >= ($rank[$old] ?? 0)) {
            $query->update(['delivery_status' => $new, 'updated_at' => now()]);
        }
    }

    public function recent(int $tenantId, int $locationId): array
    {
        if (!$this->installed() || $tenantId < 1 || $locationId < 1) {
            return [];
        }

        // A revoked restaurant binding cannot reveal other shared messages.
        $rows = DB::connection('mysql')->table('pmd_wa_shared_messages as m')
            ->join('pmd_wa_shared_locations as l', function ($join): void {
                $join->on('l.sender_id', '=', 'm.sender_id')
                    ->on('l.tenant_id', '=', 'm.tenant_id')
                    ->on('l.location_id', '=', 'm.location_id');
            })
            ->where('m.tenant_id', $tenantId)
            ->where('m.location_id', $locationId)
            ->where('l.enabled', 1)
            ->orderBy('m.received_at', 'desc')
            ->orderBy('m.id', 'desc')
            ->limit(80)
            ->get(['m.*']);

        $messages = [];
        foreach ($rows as $row) {
            try {
                $phone = Crypt::decryptString((string)$row->wa_id_ciphertext);
                $body = Crypt::decryptString((string)$row->body_ciphertext);
            } catch (Throwable $error) {
                continue;
            }
            $messages[] = [
                'id' => 'shared:'.(int)$row->id,
                'direction' => (string)$row->direction,
                'kind' => (string)$row->kind,
                'phone' => '••••'.substr($phone, -4),
                'body' => $body,
                'status' => (string)$row->delivery_status,
                'received_at' => (string)$row->received_at,
                'can_reply' => $row->direction === 'in'
                    && Carbon::parse($row->received_at)->gt(now()->subHours(24)),
                'shared' => true,
            ];
        }

        return $messages;
    }

    public function reply(
        int $tenantId,
        int $locationId,
        int $incomingId,
        string $text
    ): void {
        $text = trim($text);
        if ($tenantId < 1 || $locationId < 1 || $incomingId < 1
            || $text === '' || mb_strlen($text) > 1600 || !$this->installed()) {
            throw new RuntimeException('Invalid shared WhatsApp reply.');
        }

        $db = DB::connection('mysql');
        $incoming = $db->table('pmd_wa_shared_messages')
            ->where('id', $incomingId)
            ->where('tenant_id', $tenantId)
            ->where('location_id', $locationId)
            ->where('direction', 'in')->first();
        if (!$incoming) {
            throw new RuntimeException('Shared conversation does not belong to this restaurant.');
        }

        $lastInbound = $db->table('pmd_wa_shared_messages')
            ->where('sender_id', (int)$incoming->sender_id)
            ->where('tenant_id', $tenantId)
            ->where('location_id', $locationId)
            ->where('wa_id_hash', (string)$incoming->wa_id_hash)
            ->where('direction', 'in')->max('received_at');
        if (!$lastInbound || Carbon::parse($lastInbound)->lte(now()->subHours(24))) {
            throw new RuntimeException('WhatsApp customer-service window has expired.');
        }

        if ($db->table('pmd_wa_shared_optouts')
            ->where('wa_id_hash', (string)$incoming->wa_id_hash)->exists()) {
            throw new RuntimeException('Customer opted out of PayMyDine WhatsApp.');
        }
        $transport = $this->transport($tenantId, $locationId);
        if ((int)$transport['sender_id'] !== (int)$incoming->sender_id) {
            throw new RuntimeException('Shared sender binding mismatch.');
        }
        $minuteAgo = now()->subMinute();
        $tenantCount = $db->table('pmd_wa_shared_messages')
            ->where('tenant_id', $tenantId)
            ->where('location_id', $locationId)
            ->where('direction', 'out')
            ->where('created_at', '>=', $minuteAgo)->count();
        $globalCount = $db->table('pmd_wa_shared_messages')
            ->where('sender_id', (int)$incoming->sender_id)
            ->where('direction', 'out')
            ->where('created_at', '>=', $minuteAgo)->count();
        if ($tenantCount >= 10 || $globalCount >= 100) {
            throw new RuntimeException('WhatsApp reply rate limit exceeded.');
        }

        $phone = Crypt::decryptString((string)$incoming->wa_id_ciphertext);
        if ($this->normalizePhone($phone) !== $phone
            || !hash_equals((string)$incoming->wa_id_hash, $this->phoneHash($phone))) {
            throw new RuntimeException('Shared reply phone identity mismatch.');
        }

        $res = Http::asJson()->acceptJson()
            ->withToken($transport['token'])
            ->timeout(8)->connectTimeout(3)
            ->withOptions(['allow_redirects' => false])
            ->post($transport['url'], [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $phone,
                'context' => ['message_id' => (string)$incoming->external_message_id],
                'type' => 'text',
                'text' => ['preview_url' => false, 'body' => $text],
            ]);

        $metaId = (string)$res->json('messages.0.id', '');
        if (!$res->successful() || $metaId === '' || strlen($metaId) > 190) {
            throw new RuntimeException('Meta did not accept shared WhatsApp reply.');
        }

        $db->table('pmd_wa_shared_messages')->insertOrIgnore([
            'sender_id' => (int)$incoming->sender_id,
            'tenant_id' => $tenantId,
            'location_id' => $locationId,
            'reservation_id' => $incoming->reservation_id,
            'external_message_id' => $metaId,
            'wa_id_hash' => (string)$incoming->wa_id_hash,
            'wa_id_ciphertext' => Crypt::encryptString($phone),
            'direction' => 'out',
            'kind' => 'text',
            'body_ciphertext' => Crypt::encryptString($text),
            'delivery_status' => 'accepted',
            'received_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function purgeOlderThan(int $days): int
    {
        if ($days < 30 || $days > 365 || !$this->installed()) {
            throw new RuntimeException('Invalid shared WhatsApp retention policy.');
        }
        $db = DB::connection('mysql');
        $removed = $db->table('pmd_wa_shared_unrouted')
            ->where('received_at', '<', now()->subDays($days))->delete();
        $removed += $db->table('pmd_wa_shared_messages')
            ->where('received_at', '<', now()->subDays($days))->delete();
        $db->table('pmd_wa_shared_consents')
            ->where('created_at', '<', now()->subDays($days))
            ->delete();
        // Preserve the opt-out registry (hashed only). Deleting STOP markers
        // would silently resume sending to an unsubscribed customer.
        return $removed;
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone);
        return preg_match('/^[0-9]{6,20}$/D', $digits) ? $digits : '';
    }

    private function phoneHash(string $phone): string
    {
        $key = (string)config('app.key', '');
        if ($key === '') {
            throw new RuntimeException('APP_KEY is missing.');
        }
        return hash_hmac('sha256', $phone, $key);
    }
}
