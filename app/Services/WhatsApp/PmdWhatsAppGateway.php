<?php

namespace App\Services\WhatsApp;

use Carbon\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * R30 WhatsApp central control plane. All registry/inbox writes explicitly use
 * mysql (landlord). Never trust the callback Host or a sender-supplied tenant ID
 * for routing. A phone_number_id must be mapped by a privileged operator.
 */
final class PmdWhatsAppGateway
{
    public function validSignature(string $raw, string $provided, string $secret): bool
    {
        if (strlen($secret) < 16 || !preg_match('/^sha256=[a-f0-9]{64}$/D', $provided)) {
            return false;
        }

        return hash_equals('sha256='.hash_hmac('sha256', $raw, $secret), $provided);
    }

    public function ingest(array $payload): void
    {
        if (!app(PmdWhatsAppSchema::class)->installed()) {
            throw new RuntimeException('Central WhatsApp schema not installed.');
        }

        $db = DB::connection('mysql');
        $entries = $payload['entry'] ?? [];
        if (!is_array($entries) || count($entries) > 25) {
            throw new RuntimeException('Invalid Meta entry batch.');
        }

        foreach ($entries as $entry) {
            $wabaId = is_array($entry) ? trim((string)($entry['id'] ?? '')) : '';
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
                $numberId = trim((string)($value['metadata']['phone_number_id'] ?? ''));
                if (!preg_match('/^[0-9]{5,32}$/D', $numberId)) {
                    continue;
                }

                $channel = $db->table('pmd_whatsapp_channels as c')
                    ->join('tenants as t', 't.id', '=', 'c.tenant_id')
                    ->where('c.phone_number_id', $numberId)
                    ->where('c.waba_id', $wabaId)
                    ->where('c.enabled', 1)
                    ->where('t.status', 'active')
                    ->first(['c.id', 'c.tenant_id', 'c.location_id']);

                // Unprovisioned numbers must not be written to any tenant.
                if (!$channel) {
                    continue;
                }

                $messages = $value['messages'] ?? [];
                $statuses = $value['statuses'] ?? [];
                if (!is_array($messages) || !is_array($statuses)
                    || count($messages) > 100 || count($statuses) > 100) {
                    throw new RuntimeException('Meta batch exceeds limits.');
                }

                foreach ($messages as $message) {
                    if (is_array($message)) {
                        $this->storeInbound($db, $channel, $message);
                    }
                }
                foreach ($statuses as $status) {
                    if (is_array($status)) {
                        $this->updateDeliveryStatus($db, $channel, $status);
                    }
                }
            }
        }
    }

    private function storeInbound($db, object $channel, array $message): void
    {
        $messageId = trim((string)($message['id'] ?? ''));
        $waId = preg_replace('/[^0-9]/', '', (string)($message['from'] ?? ''));
        if ($messageId === '' || strlen($messageId) > 190
            || !preg_match('/^[0-9]{6,20}$/D', $waId)) {
            return;
        }

        $rawTimestamp = (string)($message['timestamp'] ?? '');
        if (!preg_match('/^[0-9]{10,11}$/D', $rawTimestamp)) {
            return;
        }
        $timestamp = (int)$rawTimestamp;
        if ($timestamp < 1577836800 || $timestamp > time() + 300) {
            return;
        }
        $kind = strtolower((string)($message['type'] ?? 'unknown'));
        if (!in_array($kind, ['text', 'button', 'interactive', 'image', 'video', 'audio',
            'document', 'location', 'contacts', 'sticker', 'reaction', 'unknown'], true)) {
            $kind = 'unknown';
        }

        $body = '';
        if ($kind === 'text') {
            $body = (string)($message['text']['body'] ?? '');
        } elseif ($kind === 'button') {
            $body = (string)($message['button']['text'] ?? '');
        } elseif ($kind === 'interactive') {
            $reply = $message['interactive']['button_reply']
                ?? ($message['interactive']['list_reply'] ?? []);
            $body = (string)($reply['title'] ?? '');
        } else {
            // Do not fetch/download media or retain raw webhook payloads.
            $body = '['.$kind.' message]';
        }
        $body = mb_substr($body, 0, 4000);

        $db->table('pmd_whatsapp_messages')->insertOrIgnore([
            'channel_id' => (int)$channel->id,
            'tenant_id' => (int)$channel->tenant_id,
            'location_id' => (int)$channel->location_id,
            'external_message_id' => $messageId,
            'wa_id_hash' => $this->phoneHash($waId),
            'wa_id_ciphertext' => Crypt::encryptString($waId),
            'direction' => 'in',
            'kind' => $kind,
            'body_ciphertext' => Crypt::encryptString($body),
            'delivery_status' => 'received',
            'received_at' => Carbon::createFromTimestampUTC($timestamp),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function updateDeliveryStatus($db, object $channel, array $status): void
    {
        $messageId = (string)($status['id'] ?? '');
        $new = strtolower((string)($status['status'] ?? ''));
        if ($messageId === '' || strlen($messageId) > 190
            || !in_array($new, ['sent', 'delivered', 'read', 'failed'], true)) {
            return;
        }

        $query = $db->table('pmd_whatsapp_messages')
            ->where('channel_id', (int)$channel->id)
            ->where('tenant_id', (int)$channel->tenant_id)
            ->where('external_message_id', $messageId)
            ->where('direction', 'out');

        $old = $query->value('delivery_status');
        $rank = ['pending' => 0, 'accepted' => 0, 'sent' => 1, 'failed' => 1,
            'delivered' => 2, 'read' => 3];
        if ($old && ($rank[$new] ?? -1) >= ($rank[$old] ?? 0)) {
            $query->update([
                'delivery_status' => $new,
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Only the authenticated tenant/location's messages can be returned.
     * Decryption occurs after central DB tenant scoping.
     */
    public function recent(int $tenantId, int $locationId): array
    {
        if ($tenantId < 1 || $locationId < 1
            || !app(PmdWhatsAppSchema::class)->installed()) {
            return [];
        }

        $records = DB::connection('mysql')->table('pmd_whatsapp_messages')
            ->where('tenant_id', $tenantId)
            ->where('location_id', $locationId)
            ->orderBy('received_at', 'desc')
            ->orderBy('id', 'desc')
            ->limit(80)
            ->get();

        $results = [];
        foreach ($records as $record) {
            try {
                $phone = Crypt::decryptString((string)$record->wa_id_ciphertext);
                $body = Crypt::decryptString((string)$record->body_ciphertext);
            } catch (Throwable $error) {
                continue;
            }
            $results[] = [
                'id' => (int)$record->id,
                'direction' => (string)$record->direction,
                'kind' => (string)$record->kind,
                'phone' => '••••'.substr($phone, -4),
                'body' => $body,
                'status' => (string)$record->delivery_status,
                'received_at' => (string)$record->received_at,
                'can_reply' => $record->direction === 'in'
                    && Carbon::parse($record->received_at)->gt(now()->subHours(24)),
            ];
        }

        return $results;
    }

    /**
     * Manual human reply: only for an existing incoming conversation within
     * Meta's customer-service window. Never accepts a recipient from the POST.
     */
    public function reply(int $tenantId, int $locationId, int $inboundId, string $text): void
    {
        $text = trim($text);
        if ($tenantId < 1 || $locationId < 1 || $inboundId < 1
            || $text === '' || mb_strlen($text) > 1600) {
            throw new RuntimeException('Invalid reply.');
        }
        if (!app(PmdWhatsAppSchema::class)->installed()) {
            throw new RuntimeException('WhatsApp inbox is not configured.');
        }

        $central = DB::connection('mysql');
        $incoming = $central->table('pmd_whatsapp_messages')
            ->where('id', $inboundId)
            ->where('tenant_id', $tenantId)
            ->where('location_id', $locationId)
            ->where('direction', 'in')
            ->first();

        if (!$incoming) {
            throw new RuntimeException('Conversation not found.');
        }
        $lastInbound = $central->table('pmd_whatsapp_messages')
            ->where('tenant_id', $tenantId)
            ->where('location_id', $locationId)
            ->where('channel_id', (int)$incoming->channel_id)
            ->where('wa_id_hash', (string)$incoming->wa_id_hash)
            ->where('direction', 'in')
            ->max('received_at');
        if (!$lastInbound || Carbon::parse($lastInbound)->lte(now()->subHours(24))) {
            throw new RuntimeException('The 24-hour WhatsApp service window is closed.');
        }

        $channel = $central->table('pmd_whatsapp_channels as c')
            ->join('tenants as t', 't.id', '=', 'c.tenant_id')
            ->where('c.id', (int)$incoming->channel_id)
            ->where('c.tenant_id', $tenantId)
            ->where('c.location_id', $locationId)
            ->where('c.enabled', 1)
            ->where('t.status', 'active')
            ->first(['c.id', 'c.phone_number_id']);

        if (!$channel) {
            throw new RuntimeException('WhatsApp channel is not active.');
        }

        $minuteAgo = now()->subMinute();
        $outboundCount = $central->table('pmd_whatsapp_messages')
            ->where('tenant_id', $tenantId)
            ->where('location_id', $locationId)
            ->where('direction', 'out')
            ->where('created_at', '>=', $minuteAgo)
            ->count();
        if ($outboundCount >= 10) {
            throw new RuntimeException('Too many messages. Wait a minute.');
        }

        // Tenant middleware selects this connection BEFORE Admin authentication.
        // Never fetch another restaurant's token from the central database.
        $settings = DB::connection('tenant')->table('settings')
            ->whereIn('item', [
                'pmd_reservation_messages_whatsapp_enabled',
                'pmd_reservation_messages_whatsapp_provider',
                'pmd_reservation_messages_whatsapp_endpoint',
                'pmd_reservation_messages_whatsapp_token',
            ])->pluck('value', 'item');

        $provider = (string)($settings['pmd_reservation_messages_whatsapp_provider'] ?? '');
        if ((string)($settings['pmd_reservation_messages_whatsapp_enabled'] ?? '') !== '1') {
            throw new RuntimeException('This restaurant has not enabled WhatsApp replies.');
        }

        if ($provider === 'managed') {
            // No owner-provided URL, recipient or API token participates in
            // managed WhatsApp replies. The central number must exactly match
            // the verified incoming thread's channel.
            $transport = app(PmdManagedWhatsAppService::class)->transport($tenantId, $locationId);
            if ((string)$transport['phone_number_id'] !== (string)$channel->phone_number_id) {
                throw new RuntimeException('WhatsApp sender and conversation do not match.');
            }
            $endpoint = $transport['url'];
            $token = $transport['token'];
        } else {
            // Preserve R30 direct Meta mode for existing restaurant accounts.
            $endpoint = trim((string)($settings['pmd_reservation_messages_whatsapp_endpoint'] ?? ''));
            $token = trim((string)($settings['pmd_reservation_messages_whatsapp_token'] ?? ''));
            $parts = parse_url($endpoint);
            $path = is_array($parts) ? (string)($parts['path'] ?? '') : '';
            $host = is_array($parts) ? strtolower((string)($parts['host'] ?? '')) : '';
            if (!is_array($parts) || isset($parts['user']) || isset($parts['pass'])
                || isset($parts['query']) || isset($parts['fragment'])
                || (isset($parts['port']) && (int)$parts['port'] !== 443)
                || $provider !== 'meta_cloud'
                || $host !== 'graph.facebook.com'
                || !preg_match('#^/v[0-9]+\.[0-9]+/([0-9]+)/messages/?$#', $path, $match)
                || ($match[1] ?? '') !== (string)$channel->phone_number_id
                || strtolower((string)parse_url($endpoint, PHP_URL_SCHEME)) !== 'https'
                || $token === '') {
                throw new RuntimeException('Connect the matching Meta account in Restaurant Profile first.');
            }
        }

        $waId = Crypt::decryptString((string)$incoming->wa_id_ciphertext);
        if (!preg_match('/^[0-9]{6,20}$/D', $waId)) {
            throw new RuntimeException('Invalid conversation recipient.');
        }

        $response = Http::asJson()->acceptJson()
            ->timeout(8)->connectTimeout(3)
            ->withOptions(['allow_redirects' => false])
            ->withToken($token)
            ->post($endpoint, [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $waId,
                'type' => 'text',
                'text' => ['preview_url' => false, 'body' => $text],
            ]);

        if (!$response->successful()) {
            // Do not return the provider response because it can contain PII.
            throw new RuntimeException('Meta did not accept this reply.');
        }
        $outgoingId = (string)$response->json('messages.0.id', '');
        if ($outgoingId === '' || strlen($outgoingId) > 190) {
            throw new RuntimeException('Meta did not provide a message receipt.');
        }

        $central->table('pmd_whatsapp_messages')->insertOrIgnore([
            'channel_id' => (int)$channel->id,
            'tenant_id' => $tenantId,
            'location_id' => $locationId,
            'external_message_id' => $outgoingId,
            'wa_id_hash' => (string)$incoming->wa_id_hash,
            'wa_id_ciphertext' => Crypt::encryptString($waId),
            'direction' => 'out',
            'kind' => 'text',
            'body_ciphertext' => Crypt::encryptString($text),
            'delivery_status' => 'accepted',
            'received_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Track successfully accepted outbound reservation templates too, so Meta
     * delivery/read/failed status callbacks can be linked to their receipts.
     * This is inert unless the central gateway is enabled AND number mapped.
     */
    public function recordAcceptedReservationMessage(
        int $tenantId,
        int $locationId,
        string $phoneNumberId,
        string $recipient,
        string $externalMessageId,
        string $displayText
    ): void {
        if (!config('pmd_whatsapp.enabled', false)
            || $tenantId < 1 || $locationId < 1
            || !preg_match('/^[0-9]{5,32}$/D', $phoneNumberId)
            || !app(PmdWhatsAppSchema::class)->installed()) {
            return;
        }

        $waId = preg_replace('/[^0-9]/', '', $recipient);
        if (!preg_match('/^[0-9]{6,20}$/D', $waId)
            || $externalMessageId === '' || strlen($externalMessageId) > 190) {
            return;
        }

        $db = DB::connection('mysql');
        $channel = $db->table('pmd_whatsapp_channels as c')
            ->join('tenants as t', 't.id', '=', 'c.tenant_id')
            ->where('c.tenant_id', $tenantId)
            ->where('c.location_id', $locationId)
            ->where('c.phone_number_id', $phoneNumberId)
            ->where('c.enabled', 1)
            ->where('t.status', 'active')
            ->first(['c.id']);
        if (!$channel) {
            return;
        }

        $db->table('pmd_whatsapp_messages')->insertOrIgnore([
            'channel_id' => (int)$channel->id,
            'tenant_id' => $tenantId,
            'location_id' => $locationId,
            'external_message_id' => $externalMessageId,
            'wa_id_hash' => $this->phoneHash($waId),
            'wa_id_ciphertext' => Crypt::encryptString($waId),
            'direction' => 'out',
            'kind' => 'template',
            'body_ciphertext' => Crypt::encryptString(mb_substr($displayText, 0, 4000)),
            'delivery_status' => 'accepted',
            'received_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function purgeOlderThan(int $days): int
    {
        if ($days < 30 || $days > 365 || !app(PmdWhatsAppSchema::class)->installed()) {
            throw new RuntimeException('Invalid retention policy or missing schema.');
        }

        return DB::connection('mysql')->table('pmd_whatsapp_messages')
            ->where('received_at', '<', now()->subDays($days))->delete();
    }

    private function phoneHash(string $phone): string
    {
        // Keyed, deterministic scope index. Not a plain phone hash.
        $key = (string)config('app.key', '');
        if ($key === '') {
            throw new RuntimeException('APP_KEY is missing.');
        }

        return hash_hmac('sha256', $phone, $key);
    }
}
