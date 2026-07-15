<?php

namespace Admin\Controllers\Concerns;

/**
 * Resolves the same physical table across the historical order schemas used by
 * PayMyDine tenants. Some tenants store the table primary key, others store the
 * visible table number, and older rows only keep a textual order_type value.
 */
trait PmdWaiterPosRobustTableScopeV11Concern
{
    protected function applyTableScope($query, array $cols, array $table): void
    {
        $id = (int)($table['id'] ?? 0);
        $number = trim((string)($table['number'] ?? ''));
        $name = trim((string)($table['name'] ?? ''));

        $numericReferences = array_values(array_unique(array_filter([
            $id > 0 ? $id : null,
            $number !== '' && ctype_digit($number) ? (int)$number : null,
        ], static fn ($value) => $value !== null && (int)$value > 0)));

        $textReferences = array_values(array_unique(array_filter([
            $id > 0 ? (string)$id : null,
            $number !== '' ? $number : null,
            $name !== '' ? $name : null,
            $number !== '' ? 'Table '.$number : null,
        ], static fn ($value) => $value !== null && trim((string)$value) !== '')));

        $query->where(function ($scope) use ($cols, $numericReferences, $textReferences) {
            $hasCondition = false;

            foreach (['table_id', 'location_table_id'] as $column) {
                if (!in_array($column, $cols, true) || !$numericReferences) {
                    continue;
                }

                if ($hasCondition) {
                    $scope->orWhereIn($column, $numericReferences);
                } else {
                    $scope->whereIn($column, $numericReferences);
                    $hasCondition = true;
                }
            }

            foreach (['table_no', 'table_number', 'table_ref', 'order_type', 'table_name'] as $column) {
                if (!in_array($column, $cols, true) || !$textReferences) {
                    continue;
                }

                if ($hasCondition) {
                    $scope->orWhereIn($column, $textReferences);
                } else {
                    $scope->whereIn($column, $textReferences);
                    $hasCondition = true;
                }
            }

            if (!$hasCondition) {
                $scope->whereRaw('1 = 0');
            }
        });
    }
}
