<?php
namespace App\Services\RestaurantGroups;

/** MySQL connection-scoped locks; no global default connection is changed. */
final class PublicationLock
{
    public static function run($db, string $key, callable $work)
    {
        if ($db->getDriverName() !== 'mysql') {
            throw new \RuntimeException('Restaurant publication requires MySQL-compatible locking.');
        }
        $name = 'pmd-publish:'.substr(hash('sha256', $db->getDatabaseName().'|'.$key), 0, 48);
        $lock = $db->selectOne('SELECT GET_LOCK(?, 5) AS acquired', [$name]);
        if (!$lock || (int)$lock->acquired !== 1) {
            throw new \DomainException('Another publication is using this location. Retry after it completes.');
        }
        try { return $work(); }
        finally { $db->selectOne('SELECT RELEASE_LOCK(?) AS released', [$name]); }
    }

    public static function transactional($db, array $tables): void
    {
        $names = array_map(fn ($table) => $db->getTablePrefix().$table, array_values(array_unique($tables)));
        if (!$names) return;
        $marks = implode(',', array_fill(0, count($names), '?'));
        $rows = $db->select('SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('.$marks.')', array_merge([$db->getDatabaseName()], $names));
        $engines = [];
        foreach ($rows as $row) $engines[$row->TABLE_NAME] = strtolower((string)$row->ENGINE);
        $invalid = [];

        foreach ($names as $table) {
            if (($engines[$table] ?? '') !== 'innodb') {
                $invalid[] = $table.'('.($engines[$table] ?? 'missing').')';
            }
        }

        if ($invalid) {
            throw new \DomainException(
                'Provisioning requires InnoDB central tables: '.implode(', ', $invalid).'.'
            );
        }
    }
}
