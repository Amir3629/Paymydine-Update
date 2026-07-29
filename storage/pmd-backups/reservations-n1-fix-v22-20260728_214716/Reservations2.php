<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Igniter\Flame\Exception\ApplicationException;
use Illuminate\Support\Facades\DB;

/**
 * Clean Reservations workspace.
 *
 * This controller intentionally keeps the proven native reservation model,
 * permissions and list configuration, while rendering a completely isolated
 * index page at /admin/reservations2.
 */
class Reservations2 extends Reservations
{
    protected $pmdProfileEnabled = false;

    protected $pmdProfileId;

    protected $pmdProfileStartedAt;

    protected $pmdProfileIndexEndedAt;

    protected $pmdProfileQueryCount = 0;

    protected $pmdProfileQueryMs = 0.0;

    protected $pmdProfileQueries = [];

    public function __construct()
    {
        $profileRequested = (
            isset($_GET['pmd_profile'])
            && (string)$_GET['pmd_profile'] === '1'
        );

        $parentStartedAt = microtime(true);

        parent::__construct();

        $parentMs = (
            microtime(true) - $parentStartedAt
        ) * 1000;

        $this->pmdProfileEnabled =
            $profileRequested;

        if ($this->pmdProfileEnabled) {
            $this->pmdProfileStartedAt =
                isset($_SERVER['REQUEST_TIME_FLOAT'])
                    ? (float)$_SERVER['REQUEST_TIME_FLOAT']
                    : $parentStartedAt;

            $this->pmdProfileId =
                date('Ymd-His')
                . '-'
                . getmypid()
                . '-'
                . substr(
                    hash(
                        'sha256',
                        uniqid('', true)
                    ),
                    0,
                    8
                );

            $this->pmdProfileLog(
                'request.start',
                [
                    'method' =>
                        $_SERVER['REQUEST_METHOD']
                        ?? null,

                    'uri' =>
                        $_SERVER['REQUEST_URI']
                        ?? null,

                    'parent_constructor_ms' =>
                        round($parentMs, 2),

                    'php_sapi' => PHP_SAPI,
                    'php_version' => PHP_VERSION,
                ]
            );

            DB::listen(function ($query) {
                $time = isset($query->time)
                    ? (float)$query->time
                    : 0.0;

                $this->pmdProfileQueryCount++;
                $this->pmdProfileQueryMs += $time;

                $sql = preg_replace(
                    '/\s+/',
                    ' ',
                    trim((string)$query->sql)
                );

                $this->pmdProfileQueries[] = [
                    'ms' => round($time, 2),
                    'sql' => mb_substr(
                        $sql,
                        0,
                        700
                    ),
                ];

                $this->pmdProfileLog(
                    'sql.query',
                    [
                        'number' =>
                            $this->pmdProfileQueryCount,

                        'ms' =>
                            round($time, 2),

                        'sql' =>
                            mb_substr(
                                $sql,
                                0,
                                700
                            ),
                    ]
                );
            });

            register_shutdown_function(
                function () {
                    $now = microtime(true);

                    $totalMs = (
                        $now
                        - $this->pmdProfileStartedAt
                    ) * 1000;

                    $afterIndexMs = null;

                    if (
                        $this->pmdProfileIndexEndedAt
                    ) {
                        $afterIndexMs = (
                            $now
                            - $this
                                ->pmdProfileIndexEndedAt
                        ) * 1000;
                    }

                    $slowest =
                        $this->pmdProfileQueries;

                    usort(
                        $slowest,
                        function ($left, $right) {
                            return (
                                $right['ms']
                                <=>
                                $left['ms']
                            );
                        }
                    );

                    $slowest = array_slice(
                        $slowest,
                        0,
                        10
                    );

                    $fatal = error_get_last();

                    $this->pmdProfileLog(
                        'request.shutdown',
                        [
                            'total_ms' =>
                                round($totalMs, 2),

                            'after_index_ms' =>
                                $afterIndexMs === null
                                    ? null
                                    : round(
                                        $afterIndexMs,
                                        2
                                    ),

                            'query_count' =>
                                $this
                                    ->pmdProfileQueryCount,

                            'query_total_ms' =>
                                round(
                                    $this
                                        ->pmdProfileQueryMs,
                                    2
                                ),

                            'widgets_count' =>
                                is_array($this->widgets)
                                    ? count(
                                        $this->widgets
                                    )
                                    : null,

                            'memory_mb' =>
                                round(
                                    memory_get_usage(true)
                                    / 1048576,
                                    2
                                ),

                            'peak_memory_mb' =>
                                round(
                                    memory_get_peak_usage(true)
                                    / 1048576,
                                    2
                                ),

                            'http_status' =>
                                http_response_code(),

                            'slowest_queries' =>
                                $slowest,

                            'fatal_error' =>
                                $fatal,
                        ]
                    );
                }
            );
        }

        $menuStartedAt = microtime(true);

        AdminMenu::setContext(
            'reservations',
            'sales'
        );

        $this->pmdProfileStage(
            'constructor.admin_menu',
            $menuStartedAt
        );
    }

    public function initialize()
    {
        $startedAt = microtime(true);

        $result = parent::initialize();

        $this->pmdProfileStage(
            'controller.initialize',
            $startedAt,
            [
                'widgets_count' =>
                    is_array($this->widgets)
                        ? count($this->widgets)
                        : null,

                'widget_aliases' =>
                    is_array($this->widgets)
                        ? array_keys($this->widgets)
                        : [],
            ]
        );

        return $result;
    }

    public function index()
    {
        $indexStartedAt = microtime(true);

        $startedAt = microtime(true);

        $this
            ->asExtension('ListController')
            ->index();

        $this->pmdProfileStage(
            'index.list_controller',
            $startedAt,
            [
                'widgets_count' =>
                    is_array($this->widgets)
                        ? count($this->widgets)
                        : null,

                'widget_aliases' =>
                    is_array($this->widgets)
                        ? array_keys($this->widgets)
                        : [],
            ]
        );

        $startedAt = microtime(true);

        $this->vars['statusesOptions'] =
            Statuses_model::
                getDropdownOptionsForReservation();

        $this->pmdProfileStage(
            'index.status_options',
            $startedAt,
            [
                'status_count' =>
                    is_countable(
                        $this->vars[
                            'statusesOptions'
                        ]
                    )
                        ? count(
                            $this->vars[
                                'statusesOptions'
                            ]
                        )
                        : null,
            ]
        );

        $startedAt = microtime(true);

        $this->vars['pmdReservations2'] =
            Reservations_model::query()
                ->orderBy(
                    'reservation_id',
                    'desc'
                )
                ->orderBy('reserve_date')
                ->orderBy('reserve_time')
                ->limit(1500)
                ->get();

        $this->pmdProfileStage(
            'index.reservations_query',
            $startedAt,
            [
                'reservation_count' =>
                    count(
                        $this->vars[
                            'pmdReservations2'
                        ]
                    ),
            ]
        );

        $this->pmdProfileStage(
            'index.total',
            $indexStartedAt,
            [
                'query_count_so_far' =>
                    $this->pmdProfileQueryCount,

                'query_total_ms_so_far' =>
                    round(
                        $this->pmdProfileQueryMs,
                        2
                    ),
            ]
        );

        $this->pmdProfileIndexEndedAt =
            microtime(true);
    }

    public function index_onDelete()
    {
        if (
            !$this
                ->getUser()
                ->hasPermission(
                    'Admin.DeleteReservations'
                )
        ) {
            throw new ApplicationException(
                lang(
                    'admin::lang.'
                    . 'alert_user_restricted'
                )
            );
        }

        return $this
            ->asExtension(
                'Admin\Actions\ListController'
            )
            ->index_onDelete();
    }

    protected function pmdProfileStage(
        $stage,
        $startedAt,
        array $extra = []
    ) {
        if (!$this->pmdProfileEnabled) {
            return;
        }

        $extra['ms'] = round(
            (
                microtime(true)
                - $startedAt
            ) * 1000,
            2
        );

        $this->pmdProfileLog(
            $stage,
            $extra
        );
    }

    protected function pmdProfileLog(
        $stage,
        array $data = []
    ) {
        if (!$this->pmdProfileEnabled) {
            return;
        }

        $record = [
            'timestamp' =>
                date('Y-m-d H:i:s.u'),

            'request_id' =>
                $this->pmdProfileId,

            'stage' =>
                $stage,

            'elapsed_ms' =>
                round(
                    (
                        microtime(true)
                        - $this->pmdProfileStartedAt
                    ) * 1000,
                    2
                ),

            'data' =>
                $data,
        ];

        @file_put_contents(
            storage_path(
                'logs/'
                . 'pmd-reservations-profile.log'
            ),
            json_encode(
                $record,
                JSON_UNESCAPED_SLASHES
                | JSON_UNESCAPED_UNICODE
            )
            . PHP_EOL,
            FILE_APPEND | LOCK_EX
        );
    }
}
