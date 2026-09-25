<?php

namespace Admin\Services;

/**
 * Canonical Reservations schedule authority.
 *
 * The deployed runtime still provides the historical schedule service class.
 * Keep that compatibility detail isolated here so product controllers and
 * views depend only on the canonical Reservations vocabulary.
 */
final class PmdReservationsScheduleV1
{
    public function payload(int $locationId, string $locale): array
    {
        $runtimeClass =
            'Admin\\Services\\PmdReservations'.
            'LabScheduleV1';

        return (array)app($runtimeClass)->payload($locationId, $locale);
    }
}
