<?php

namespace Admin\Services;

use Admin\Classes\PmdPlatformI18n;
use Illuminate\Support\Carbon;

/**
 * PMD_ONLINE_STAFF_SHARED_CARD_V1
 *
 * One presentation authority for Owner and Manager. Reads only the
 * tenant/location-scoped admin session registry; never infers presence from
 * shifts, payroll, biometric clock-ins, or the legacy two-minute last-seen.
 */
class PmdOnlineStaffCardV1
{
    public function snapshot(int $locationId, string $locale = 'en'): array
    {
        if ($locationId < 1) {
            return $this->format([
                'connected' => false,
                'rows' => [],
                'source' => 'PMD location context unavailable',
            ], $locale);
        }

        try {
            $presence = app(PmdAdminPresenceService::class)
                ->onlineStaffAtLocation($locationId);
        } catch (\Throwable $error) {
            logger()->warning('PMD online staff snapshot failed', [
                'exception' => get_class($error),
            ]);
            $presence = [
                'connected' => false,
                'rows' => [],
                'source' => 'PmdAdminPresenceService unavailable',
            ];
        }

        return $this->format((array)$presence, $locale);
    }

    /**
     * Pure formatting seam so both dashboards use exactly the same contract.
     * An unavailable presence registry is UNKNOWN, not zero signed-in staff.
     */
    public function format(
        array $presence,
        string $locale = 'en',
        ?Carbon $at = null
    ): array {
        $locale = strtolower(trim((string)preg_split('/[-_]/', $locale)[0]));
        $isDe = $locale === 'de';
        $isTr = $locale === 'tr';
        $t = static function (string $english, string $german) use ($isDe, $isTr): string {
            if ($isDe) return $german;
            if (!$isTr) return $english;
            try {
                return PmdPlatformI18n::fromEnglish(
                    $english, '', [], 'tr', $english
                );
            } catch (\Throwable $ignored) {
                return $english;
            }
        };

        $now = $at ? $at->copy()->setTimezone('Europe/Berlin')
            : Carbon::now('Europe/Berlin');
        $connected = ($presence['connected'] ?? false) === true;
        $rows = [];

        if ($connected) {
            foreach (($presence['rows'] ?? []) as $record) {
                if (!is_array($record)) continue;
                $staffId = (int)($record['staff_id'] ?? 0);
                if ($staffId <= 0) continue;

                $loginAt = null;
                $rawLogin = trim((string)($record['login_at'] ?? ''));
                if ($rawLogin !== '') {
                    try {
                        $loginAt = Carbon::parse(
                            $rawLogin,
                            (string)config('app.timezone', 'UTC')
                        )->setTimezone('Europe/Berlin');
                    } catch (\Throwable $ignored) {
                        $loginAt = null;
                    }
                }

                $minutes = $loginAt
                    ? max(0, (int)$loginAt->diffInMinutes($now))
                    : 0;
                $duration = $minutes < 60
                    ? $minutes.' min'
                    : intdiv($minutes, 60).'h '.($minutes % 60).'m';

                $rows[] = [
                    'staff_id' => $staffId,
                    'user_id' => (int)($record['user_id'] ?? 0),
                    'name' => trim((string)($record['name'] ?? ''))
                        ?: $t('Staff', 'Mitarbeiter'),
                    'role' => trim((string)($record['role'] ?? ''))
                        ?: $t('Staff', 'Mitarbeiter'),
                    'since' => $loginAt
                        ? $t('Since', 'Seit').' '.$loginAt->format('H:i')
                        : $t('Signed in', 'Angemeldet'),
                    'duration' => $duration,
                    'session_count' => max(1, (int)($record['session_count'] ?? 1)),
                ];
            }
        }

        return [
            'title' => $t('Staff online', 'Mitarbeiter online'),
            'subtitle' => $t(
                'Signed-in admin sessions at this location',
                'Angemeldete Admin-Sitzungen an diesem Standort'
            ),
            'count' => count($rows),
            'count_label' => $t('online', 'online'),
            'empty' => $connected
                ? $t(
                    'No staff are currently signed in.',
                    'Aktuell ist kein Mitarbeiter angemeldet.'
                )
                : $t(
                    'Staff presence is unavailable for this location.',
                    'Die Mitarbeiter-Anwesenheit ist für diesen Standort nicht verfügbar.'
                ),
            'as_of' => $t('As of', 'Stand').' '.$now->format('H:i'),
            'connected' => $connected,
            'rows' => $rows,
            'source' => (string)($presence['source'] ?? 'PmdAdminPresenceService'),
        ];
    }
}
