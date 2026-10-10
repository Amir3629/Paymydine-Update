<?php

namespace App\Services\WhatsApp;

/**
 * Pure, fail-closed routing policy for ONE central PayMyDine WhatsApp sender.
 *
 * Never infer a restaurant from a customer phone, displayed reservation
 * reference, profile name, or the latest conversation. Only Meta's signed
 * reply-to "context.id" referencing an accepted OUTBOUND message to this
 * exact customer may assign a tenant/location. Signed webhook validation
 * occurs before this policy is called.
 */
final class PmdSharedWhatsAppRoutingPolicy
{
    public function choose(
        string $replyTo,
        int $senderId,
        string $waIdHash,
        array $candidates,
        int $minimumUnixTime
    ): ?object {
        if ($replyTo === '' || strlen($replyTo) > 190
            || $senderId < 1
            || !preg_match('/^[a-f0-9]{64}$/D', $waIdHash)
            || count($candidates) !== 1) {
            return null;
        }

        $row = $candidates[0] ?? null;
        if (!is_object($row)
            || !hash_equals($replyTo, (string)($row->external_message_id ?? ''))
            || (int)($row->sender_id ?? 0) !== $senderId
            || !hash_equals($waIdHash, (string)($row->wa_id_hash ?? ''))
            || (string)($row->direction ?? '') !== 'out'
            || (int)($row->tenant_id ?? 0) < 1
            || (int)($row->location_id ?? 0) < 1
            || (int)($row->binding_enabled ?? 0) !== 1
            || (int)($row->sender_enabled ?? 0) !== 1
            || (string)($row->tenant_status ?? '') !== 'active') {
            return null;
        }

        $timestamp = strtotime((string)($row->received_at ?? ''));
        if ($timestamp === false || $timestamp < $minimumUnixTime
            || $timestamp > time() + 300) {
            return null;
        }

        return $row;
    }
}
