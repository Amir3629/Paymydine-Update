<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/** PMD_SITE_ACCESS_QR_TOKEN_V2 */
class PmdSiteAccessQrTokenService
{
    public function signedUrl($challenge): string
    {
        if (!$challenge) return '';
        $id = (int)$challenge->id;
        $signature = $this->signature($id, (int)$challenge->location_id, (string)$challenge->public_id);
        return admin_url('siteaccess/q').'?i='.$id.'&s='.$signature;
    }

    public function challengeForToken(int $id, string $signature)
    {
        if ($id < 1 || $signature === '') return null;
        $challenge = DB::table('pmd_site_access_challenges')->where('id', $id)->first();
        if (!$challenge || $challenge->status !== 'pending' || Carbon::parse($challenge->expires_at)->isPast()) return null;
        $expected = $this->signature($id, (int)$challenge->location_id, (string)$challenge->public_id);
        return hash_equals($expected, strtolower(trim($signature))) ? $challenge : null;
    }

    private function signature(int $id, int $locationId, string $publicId): string
    {
        // 80-bit truncated HMAC; challenge expires in 90 seconds and is also
        // bound to the authenticated requester's session/user before finalize.
        return substr(hash_hmac(
            'sha256',
            'pmd-site-qr|'.$id.'|'.$locationId.'|'.$publicId,
            (string)config('app.key', 'pmd-site-access')
        ), 0, 20);
    }
}
