<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Illuminate\Support\Facades\Cache;

class PmdFloorV1 extends AdminController
{
    protected $requiredPermissions = 'Admin.Orders';

    public function index()
    {
        return view()->file(
            base_path(
                'app/admin/views/floor/index.blade.php'
            ),
            [
                'dataUrl' => admin_url(
                    'pmd-waiter-dashboard-v9-tenant-data'
                ),

                'layoutUrl' => admin_url(
                    'pmd-owner-dashboard-floor-layout'
                ),

                'stateUrl' => admin_url(
                    'pmd-floor-v1/state'
                ),

                'orderUrl' => admin_url(
                    'waiter-pos/{table}'
                ),
            ]
        );
    }

    public function state()
    {
        $state = $this->readState();

        /*
         * Older versions allowed the same table to exist in
         * several Merge groups.
         *
         * Reading the state repairs those old records and stores
         * the canonical result.
         */
        $canonical = $this->canonicalizeState($state);

        if ($canonical !== $state) {
            $this->writeState($canonical);
        }

        return response()->json([
            'ok' => true,
            'version' => 'pmd-floor-v1',
            'state' => $canonical,
        ]);
    }

    public function saveState()
    {
        $payload =
            request()->json()->all()
            ?: request()->all();

        /*
         * Repair old corrupted groups before applying a new action.
         */
        $state = $this->canonicalizeState(
            $this->readState()
        );

        $action = (string)(
            $payload['action'] ?? ''
        );

        if ($action === 'table-state') {
            $response = $this->applyTableState(
                $state,
                $payload
            );

            if ($response !== null) {
                return $response;
            }
        } elseif ($action === 'note') {
            $response = $this->applyNote(
                $state,
                $payload
            );

            if ($response !== null) {
                return $response;
            }
        } elseif ($action === 'merge') {
            $response = $this->applyCanonicalMerge(
                $state,
                $payload
            );

            if ($response !== null) {
                return $response;
            }
        } elseif ($action === 'unmerge') {
            $mergeId = trim(
                (string)(
                    $payload['merge_id'] ?? ''
                )
            );

            if ($mergeId !== '') {
                unset(
                    $state['merges'][$mergeId]
                );
            }
        } else {
            return response()->json([
                'ok' => false,
                'message' => 'Unknown action',
            ], 422);
        }

        /*
         * Final integrity pass before persistence.
         */
        $state = $this->canonicalizeState(
            $state
        );

        $this->writeState($state);

        return response()->json([
            'ok' => true,
            'version' => 'pmd-floor-v1',
            'state' => $state,
        ]);
    }

    protected function applyTableState(
        array &$state,
        array $payload
    ) {
        $id = trim(
            (string)(
                $payload['table_id'] ?? ''
            )
        );

        if ($id === '') {
            return response()->json([
                'ok' => false,
                'message' => 'Missing table_id',
            ], 422);
        }

        $allowed = [
            'available',
            'occupied',
            'reserved',
            'cleaning',
            'waiter-call',
        ];

        $status = (string)(
            $payload['status'] ?? 'available'
        );

        if (
            !in_array(
                $status,
                $allowed,
                true
            )
        ) {
            return response()->json([
                'ok' => false,
                'message' => 'Invalid status',
            ], 422);
        }

        $existing =
            $state['tables'][$id] ?? [];

        $state['tables'][$id] =
            array_merge(
                $existing,
                [
                    'status' => $status,

                    'note' => mb_substr(
                        trim(
                            (string)(
                                $payload['note']
                                ?? (
                                    $existing['note']
                                    ?? ''
                                )
                            )
                        ),
                        0,
                        500
                    ),

                    'updated_at' =>
                        now()->toIso8601String(),
                ]
            );

        return null;
    }

    protected function applyNote(
        array &$state,
        array $payload
    ) {
        $id = trim(
            (string)(
                $payload['table_id'] ?? ''
            )
        );

        if ($id === '') {
            return response()->json([
                'ok' => false,
                'message' => 'Missing table_id',
            ], 422);
        }

        $state['tables'][$id] =
            array_merge(
                $state['tables'][$id] ?? [],
                [
                    'note' => mb_substr(
                        trim(
                            (string)(
                                $payload['note'] ?? ''
                            )
                        ),
                        0,
                        500
                    ),

                    'updated_at' =>
                        now()->toIso8601String(),
                ]
            );

        return null;
    }

    protected function applyCanonicalMerge(
        array &$state,
        array $payload
    ) {
        $requestedIds = $this->normalizeIds(
            $payload['table_ids'] ?? []
        );

        if (count($requestedIds) < 2) {
            return response()->json([
                'ok' => false,
                'message' =>
                    'Select at least two tables',
            ], 422);
        }

        /*
         * Start with the tables selected by the frontend.
         */
        $selected = array_fill_keys(
            $requestedIds,
            true
        );

        $groupsToRemove = [];
        $expanded = true;

        /*
         * Recursively absorb every existing group that touches
         * one of the selected tables.
         *
         * Existing:
         *   [1, 2, 3]
         *
         * New request:
         *   [1, 2, 3, 4]
         *
         * Result:
         *   remove the old group
         *   save exactly [1, 2, 3, 4]
         */
        while ($expanded) {
            $expanded = false;

            foreach (
                $state['merges'] as
                $mergeId => $merge
            ) {
                $mergeId = (string)$mergeId;

                if (
                    isset(
                        $groupsToRemove[$mergeId]
                    )
                ) {
                    continue;
                }

                $memberIds =
                    $this->normalizeIds(
                        $merge['table_ids'] ?? []
                    );

                $overlaps = false;

                foreach (
                    $memberIds as $tableId
                ) {
                    if (
                        isset($selected[$tableId])
                    ) {
                        $overlaps = true;
                        break;
                    }
                }

                if (!$overlaps) {
                    continue;
                }

                $groupsToRemove[$mergeId] =
                    true;

                foreach (
                    $memberIds as $tableId
                ) {
                    if (
                        !isset($selected[$tableId])
                    ) {
                        $selected[$tableId] =
                            true;

                        $expanded = true;
                    }
                }
            }
        }

        /*
         * Delete all old groups connected to the selected tables.
         */
        foreach (
            array_keys($groupsToRemove)
            as $mergeId
        ) {
            unset(
                $state['merges'][$mergeId]
            );
        }

        $finalIds = array_keys(
            $selected
        );

        $this->sortIds($finalIds);

        /*
         * Reuse an existing group ID when expanding a group.
         * Otherwise create one new ID.
         */
        $oldGroupIds = array_keys(
            $groupsToRemove
        );

        $groupId =
            count($oldGroupIds)
                ? (string)$oldGroupIds[0]
                : (
                    'merge-' .
                    substr(
                        sha1(
                            implode(
                                '|',
                                $finalIds
                            ) .
                            microtime(true)
                        ),
                        0,
                        10
                    )
                );

        $state['merges'][$groupId] = [
            'table_ids' => $finalIds,
            'updated_at' =>
                now()->toIso8601String(),
        ];

        return null;
    }

    protected function canonicalizeState(
        array $state
    ): array {
        if (
            !isset($state['tables']) ||
            !is_array($state['tables'])
        ) {
            $state['tables'] = [];
        }

        $rawMerges =
            isset($state['merges']) &&
            is_array($state['merges'])
                ? $state['merges']
                : [];

        /*
         * First clean malformed and one-table groups.
         */
        $remaining = [];

        foreach (
            $rawMerges as $mergeId => $merge
        ) {
            $ids = $this->normalizeIds(
                is_array($merge)
                    ? (
                        $merge['table_ids'] ?? []
                    )
                    : []
            );

            if (count($ids) < 2) {
                continue;
            }

            $remaining[(string)$mergeId] = [
                'table_ids' => $ids,

                'updated_at' =>
                    is_array($merge)
                        ? (
                            $merge['updated_at']
                            ?? now()->toIso8601String()
                        )
                        : now()->toIso8601String(),
            ];
        }

        $canonical = [];

        /*
         * Convert overlapping groups into connected components.
         *
         * [1,2,3] and [1,2,3,4]
         * become one group [1,2,3,4].
         */
        while (count($remaining)) {
            $firstId =
                (string)array_key_first(
                    $remaining
                );

            $first =
                $remaining[$firstId];

            unset($remaining[$firstId]);

            $memberMap = array_fill_keys(
                $first['table_ids'],
                true
            );

            $expanded = true;

            while ($expanded) {
                $expanded = false;

                foreach (
                    $remaining as
                    $mergeId => $merge
                ) {
                    $overlaps = false;

                    foreach (
                        $merge['table_ids']
                        as $tableId
                    ) {
                        if (
                            isset(
                                $memberMap[$tableId]
                            )
                        ) {
                            $overlaps = true;
                            break;
                        }
                    }

                    if (!$overlaps) {
                        continue;
                    }

                    foreach (
                        $merge['table_ids']
                        as $tableId
                    ) {
                        $memberMap[$tableId] =
                            true;
                    }

                    unset(
                        $remaining[$mergeId]
                    );

                    $expanded = true;
                }
            }

            $ids = array_keys(
                $memberMap
            );

            $this->sortIds($ids);

            $canonical[$firstId] = [
                'table_ids' => $ids,
                'updated_at' =>
                    now()->toIso8601String(),
            ];
        }

        $state['merges'] = $canonical;

        return $state;
    }

    protected function normalizeIds(
        $values
    ): array {
        $result = [];

        foreach ((array)$values as $value) {
            $id = trim(
                (string)$value
            );

            if ($id === '') {
                continue;
            }

            $result[$id] = true;
        }

        $ids = array_keys($result);

        $this->sortIds($ids);

        return $ids;
    }

    protected function sortIds(
        array &$ids
    ): void {
        usort(
            $ids,
            static function (
                $left,
                $right
            ) {
                if (
                    is_numeric($left) &&
                    is_numeric($right)
                ) {
                    return
                        (int)$left
                        <=>
                        (int)$right;
                }

                return strnatcasecmp(
                    (string)$left,
                    (string)$right
                );
            }
        );
    }

    protected function readState(): array
    {
        $state = Cache::get(
            $this->cacheKey(),
            [
                'tables' => [],
                'merges' => [],
            ]
        );

        return is_array($state)
            ? $state
            : [
                'tables' => [],
                'merges' => [],
            ];
    }

    protected function writeState(
        array $state
    ): void {
        Cache::forever(
            $this->cacheKey(),
            $state
        );
    }

    protected function cacheKey(): string
    {
        return
            'pmd-floor-v1:' .
            sha1(
                (string)config('app.url')
            );
    }
}
