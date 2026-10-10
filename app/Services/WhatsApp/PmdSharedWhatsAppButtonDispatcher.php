<?php

namespace App\Services\WhatsApp;

use Carbon\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * R34 intentionally LIMITED bot: two verified WhatsApp quick-reply actions.
 *
 * The customer never types; a native Meta quick reply creates a signed
 * inbound event, correlated by R33 to one booking. No arbitrary "AI chat".
 * A claim remains "processing" after worker crashes so it cannot silently
 * send the same link twice. Operators may inspect failed/processing jobs.
 */
final class PmdSharedWhatsAppButtonDispatcher
{
    public function dispatch(int $limit = 20): array
    {
        if (config('pmd_whatsapp.shared_quick_reply_enabled', false) !== true
            || config('pmd_whatsapp.shared_enabled', false) !== true
            || !app(PmdSharedWhatsAppService::class)->installed()) {
            return ['processed' => 0, 'sent' => 0, 'failed' => 0];
        }

        $db = DB::connection('mysql');
        $ids = $db->table('pmd_wa_shared_action_jobs')
            ->where('status', 'pending')
            ->orderBy('id')->limit(min(max($limit, 1), 50))->pluck('id');

        $sent = 0;
        $failed = 0;
        foreach ($ids as $jobId) {
            $job = $db->transaction(function () use ($db, $jobId) {
                $row = $db->table('pmd_wa_shared_action_jobs')
                    ->where('id', $jobId)->lockForUpdate()->first();
                if (!$row || $row->status !== 'pending' || (int)$row->attempts > 0) {
                    return null;
                }
                $db->table('pmd_wa_shared_action_jobs')->where('id', $jobId)
                    ->update([
                        'status' => 'processing',
                        'attempts' => 1,
                        'updated_at' => now(),
                    ]);
                return $row;
            });
            if (!$job) {
                continue;
            }

            try {
                $incoming = $db->table('pmd_wa_shared_messages')
                    ->where('id', (int)$job->incoming_message_id)
                    ->where('tenant_id', (int)$job->tenant_id)
                    ->where('location_id', (int)$job->location_id)
                    ->where('direction', 'in')
                    ->where('kind', 'button')
                    ->first();
                if (!$incoming
                    || Carbon::parse((string)$incoming->received_at)->lte(now()->subHours(23))) {
                    throw new RuntimeException('Button has expired or is not from this tenant.');
                }

                $outbound = $db->table('pmd_wa_shared_messages')
                    ->where('external_message_id', (string)$job->outbound_message_id)
                    ->where('sender_id', (int)$incoming->sender_id)
                    ->where('tenant_id', (int)$job->tenant_id)
                    ->where('location_id', (int)$job->location_id)
                    ->where('wa_id_hash', (string)$incoming->wa_id_hash)
                    ->where('direction', 'out')
                    ->where('kind', 'template')
                    ->first();
                if (!$outbound
                    || !$outbound->reservation_id
                    || !$outbound->manage_url_ciphertext) {
                    throw new RuntimeException('Original booking template is unavailable.');
                }
                $phone = Crypt::decryptString((string)$incoming->wa_id_ciphertext);
                $locale = app(PmdSharedWhatsAppService::class)->reservationLocale(
                    (int)$job->tenant_id,
                    (int)$job->location_id,
                    (int)$outbound->reservation_id,
                    $phone
                );
                if ($locale === null) {
                    throw new RuntimeException('Customer booking consent is not active.');
                }
                $link = Crypt::decryptString((string)$outbound->manage_url_ciphertext);
                $text = PmdWhatsAppButtonPolicy::textForAction(
                    (string)$job->action, $link, $locale,
                    (string)config('pmd_whatsapp.shared_booking_hosts', '')
                );
                if ($text === null) {
                    throw new RuntimeException('Booking link is untrusted or expired.');
                }
                // This method revalidates active tenant grants, same incoming
                // phone, global STOP, rate limits and the 24h service window.
                app(PmdSharedWhatsAppService::class)->reply(
                    (int)$job->tenant_id,
                    (int)$job->location_id,
                    (int)$incoming->id,
                    $text
                );
                $db->table('pmd_wa_shared_action_jobs')->where('id', $jobId)
                    ->where('status', 'processing')
                    ->update(['status' => 'sent', 'updated_at' => now()]);
                $sent++;
            } catch (Throwable $error) {
                // Never retry an ambiguous API call automatically: a Meta
                // response may have been accepted before DB logging failed.
                $db->table('pmd_wa_shared_action_jobs')->where('id', $jobId)
                    ->where('status', 'processing')
                    ->update(['status' => 'failed', 'updated_at' => now()]);
                Log::warning('PMD shared WhatsApp button action failed', [
                    'job_id' => (int)$jobId,
                    'type' => get_class($error),
                ]);
                $failed++;
            }
        }
        return ['processed' => $sent + $failed, 'sent' => $sent, 'failed' => $failed];
    }
}
