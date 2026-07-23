<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Models\Mealtimes_model;

class Mealtimes extends \Admin\Classes\AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
        'Admin\Actions\LocationAwareController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Mealtimes_model',
            'title' => 'lang:admin::lang.mealtimes.text_title',
            'emptyMessage' => 'lang:admin::lang.mealtimes.text_empty',
            'defaultSort' => ['mealtime_id', 'DESC'],
            'configFile' => 'mealtimes_model',
        ],
    ];

    public $formConfig = [
        'name' => 'lang:admin::lang.mealtimes.text_form_name',
        'model' => 'Admin\Models\Mealtimes_model',
        'request' => 'Admin\Requests\Mealtime',
        'create' => [
            'title' => 'lang:admin::lang.form.create_title',
            'redirect' => 'mealtimes/edit/{mealtime_id}',
            'redirectClose' => 'mealtimes',
            'redirectNew' => 'mealtimes/create',
        ],
        'edit' => [
            'title' => 'lang:admin::lang.form.edit_title',
            'redirect' => 'mealtimes/edit/{mealtime_id}',
            'redirectClose' => 'mealtimes',
            'redirectNew' => 'mealtimes/create',
        ],
        'preview' => [
            'title' => 'lang:admin::lang.form.preview_title',
            'redirect' => 'mealtimes',
        ],
        'delete' => [
            'redirect' => 'mealtimes',
        ],
        'configFile' => 'mealtimes_model',
    ];

    protected $requiredPermissions = 'Admin.Mealtimes';

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('mealtimes', 'restaurant');
        $this->addCss('assets/css/pmd-admin-universal-list-v1.css', 'pmd-admin-universal-list-v1');
    }

    public function index()
    {
        $this->vars['pmdUniversalList'] = $this->pmdBuildUniversalListData();

        $this->asExtension('ListController')->index();
    }

    protected function pmdBuildUniversalListData(): array
    {
        try {
            $mealtimes = Mealtimes_model::query()->with('locations')->get();
            $total = $mealtimes->count();
            $enabled = $mealtimes->where('mealtime_status', 1)->count();
            $locationIds = [];

            foreach ($mealtimes as $mealtime) {
                foreach (($mealtime->locations ?? []) as $location) {
                    if (isset($location->location_id)) {
                        $locationIds[(int)$location->location_id] = true;
                    }
                }
            }

            $locationsCovered = count($locationIds);
            $overlaps = $this->pmdCountMealtimeOverlaps($mealtimes);
        } catch (\Throwable $exception) {
            $total = $enabled = $locationsCovered = $overlaps = 0;
        }

        return [
            'pageKey' => 'mealtimes',
            'title' => 'Mealtimes',
            'description' => 'Read-only service window summary and existing mealtime list.',
            'kpis' => [
                ['label' => 'Total mealtimes', 'value' => $total, 'icon' => 'fa-clock', 'meaning' => 'Configured service windows'],
                ['label' => 'Enabled', 'value' => $enabled, 'icon' => 'fa-toggle-on', 'meaning' => 'Active windows'],
                ['label' => 'Locations covered', 'value' => $locationsCovered, 'icon' => 'fa-location-dot', 'meaning' => 'Coverage by restaurant'],
                ['label' => 'Overlaps to review', 'value' => $overlaps, 'icon' => 'fa-triangle-exclamation', 'meaning' => 'Scheduling conflict risk'],
            ],
        ];
    }

    protected function pmdCountMealtimeOverlaps($mealtimes): int
    {
        $windows = [];

        foreach ($mealtimes as $mealtime) {
            $start = strtotime((string)$mealtime->start_time);
            $end = strtotime((string)$mealtime->end_time);

            if ($start === false || $end === false || $start >= $end) {
                continue;
            }

            $windows[] = [$start, $end];
        }

        $overlaps = 0;
        $count = count($windows);

        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                if ($windows[$i][0] < $windows[$j][1] && $windows[$j][0] < $windows[$i][1]) {
                    $overlaps++;
                }
            }
        }

        return $overlaps;
    }
}
