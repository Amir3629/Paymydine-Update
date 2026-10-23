<?php
namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_STAFF_GEOFENCE_SERVER_V1_20261021
 * Clock-event-only proximity evidence, not background tracking.
 * Untrusted device GPS can be spoofed, so do not claim proof of presence.
 * Raw employee coordinates are never persisted.
 */
final class PmdStaffClockGeofenceV1
{
    public const RADIUS_METERS = 150;
    public const MAX_ACCURACY_METERS = 90;
    public const MAX_AGE_SECONDS = 90;

    public function site(int $locationId): array
    {
        $missing = ['configured' => false, 'radius_m' => self::RADIUS_METERS];
        if ($locationId < 1 || !Schema::hasTable('locations')
            || !Schema::hasColumn('locations', 'location_lat')
            || !Schema::hasColumn('locations', 'location_lng')) return $missing;
        $site = DB::table('locations')->where('location_id', $locationId)
            ->select(['location_lat', 'location_lng', 'location_city'])->first();
        if (!$site || !is_numeric($site->location_lat) || !is_numeric($site->location_lng)) return $missing;
        $lat = (float)$site->location_lat;
        $lng = (float)$site->location_lng;
        if (!is_finite($lat) || !is_finite($lng)
            || abs($lat) > 90 || abs($lng) > 180
            || ($lat == 0.0 && $lng == 0.0)) return $missing;
        // PMD_STAFF_DEMO_GEOFENCE_REJECT_V1_20261023:
        // Installer fixture coordinates were copied from Coventry. Do not
        // treat them as a verified entrance after the owner sets another city.
        if (abs($lat - 52.415884) < 0.00005 && abs($lng + 1.603648) < 0.00005
            && !str_contains(strtolower((string)($site->location_city ?? '')), 'coventry')) {
            return ['configured' => false, 'radius_m' => self::RADIUS_METERS, 'demo_pin' => true];
        }
        return ['configured' => true, 'radius_m' => self::RADIUS_METERS, 'lat' => $lat, 'lng' => $lng];
    }

    public function validatePunch(int $locationId, Request $request): array
    {
        $site = $this->site($locationId);
        if (!$site['configured']) {
            if (!empty($site['demo_pin'])) {
                return ['ok' => false, 'message' => 'This restaurant still has a demo GPS pin. Ask the owner to find and confirm the check-in location in Restaurant Settings.'];
            }
            return ['ok' => false, 'message' => 'Restaurant coordinates missing. Ask the manager to update Restaurant Profile.'];
        }
        $inputs = [$request->input('geo_lat'), $request->input('geo_lng'),
            $request->input('geo_accuracy_m'), $request->input('geo_captured_at_ms')];
        foreach ($inputs as $value) {
            if (!is_scalar($value) || !is_numeric($value)) {
                return ['ok' => false, 'message' => 'Allow precise location to clock in or out at your restaurant.'];
            }
        }
        [$lat, $lng, $accuracy] = array_map('floatval', array_slice($inputs, 0, 3));
        $timestamp = (float)$inputs[3];
        if (!is_finite($lat) || !is_finite($lng) || !is_finite($accuracy)
            || abs($lat) > 90 || abs($lng) > 180 || $accuracy < 0
            || $accuracy > self::MAX_ACCURACY_METERS) {
            return ['ok' => false, 'message' => 'Precise GPS unavailable. Move near a window and try again.'];
        }
        if (!is_finite($timestamp) || abs(time() - $timestamp / 1000) > self::MAX_AGE_SECONDS) {
            return ['ok' => false, 'message' => 'Location result is too old. Request a fresh GPS fix.'];
        }
        $h = sin(deg2rad($lat - $site['lat']) / 2) ** 2
            + cos(deg2rad($site['lat'])) * cos(deg2rad($lat))
            * sin(deg2rad($lng - $site['lng']) / 2) ** 2;
        $distance = 6371000 * 2 * asin(min(1.0, sqrt(max(0.0, $h))));
        if ($distance > self::RADIUS_METERS + 25) {
            // PMD_STAFF_GEOFENCE_DISTANCE_AUDIT_V2_20261023:
            // A distance-only audit for diagnosing bad workplace pins vs emulator
            // or phone coordinates. NEVER log staff GPS lat/lng or request body.
            logger()->notice('PMD_STAFF_GEOFENCE_DISTANCE_AUDIT_V2_20261023', [
                'location_id' => $locationId,
                'distance_m' => (int)round($distance),
                'accuracy_m' => (int)round($accuracy),
                'limit_m' => self::RADIUS_METERS + 25,
            ]);
            return ['ok' => false, 'message' => 'You are outside the restaurant check-in area. Move closer and retry.'];
        }
        return ['ok' => true, 'evidence' => [
            'verified' => true, 'distance_m' => round($distance),
            'accuracy_m' => round($accuracy), 'verified_at' => now()->toIso8601String(),
        ]];
    }
}
