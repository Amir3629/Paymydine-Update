<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\AdminLocation;
use Admin\Models\Tips_shifts_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class Tips extends AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
        'Admin\Actions\LocationAwareController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Tips_shifts_model',
            'title' => 'Tips Management',
            'emptyMessage' => 'No tips found',
            'defaultSort' => ['shift_date', 'DESC'],
            'configFile' => 'tips_shifts_model',
        ],
    ];

    public $formConfig = [
        'name' => 'Tips Shift',
        'model' => 'Admin\Models\Tips_shifts_model',
        'create' => [
            'title' => 'Create Shift',
            'redirect' => 'tips',
        ],
        'edit' => [
            'title' => 'Edit Shift',
            'redirect' => 'tips',
        ],
        'preview' => [
            'title' => 'View Shift',
            'redirect' => 'tips',
        ],
        'delete' => [
            'redirect' => 'tips',
        ],
        'configFile' => 'tips_shifts_model',
    ];

    protected $requiredPermissions = ['Admin.Tips'];

    public function __construct()
    {
        parent::__construct();
        AdminMenu::setContext('tips', 'sales');
    }
    
    public function index()
    {
        $this->asExtension('ListController')->index();
        
        // Get filter date or default to today
        $filterDate = request()->get('date', date('Y-m-d'));
        $locationId = AdminLocation::getId();
        
        // Get tips statistics for the selected date
        $stats = $this->getTipsStatistics($filterDate, $locationId);
        
        $this->vars['filterDate'] = $filterDate;
        $this->vars['stats'] = $stats;
        $this->vars['locationId'] = $locationId;
    }

    public function getTipsStatistics($date, $locationId = null)
    {
        // Base query for all tips
        $baseQuery = DB::table('order_totals as ot')
            ->join('orders as o', 'ot.order_id', '=', 'o.order_id')
            ->where('ot.code', 'tip')
            ->whereDate('o.order_date', $date);
        
        if ($locationId) {
            $baseQuery->where('o.location_id', $locationId);
        }
        
        // Get all tips
        $allTips = (clone $baseQuery)->sum('ot.value');
        
        // Get tip count
        $tipCount = (clone $baseQuery)->count();
        
        // Get cash tips
        $cashTipsQuery = DB::table('order_totals as ot')
            ->join('orders as o', 'ot.order_id', '=', 'o.order_id')
            ->join('order_totals as pm', function($join) {
                $join->on('pm.order_id', '=', 'o.order_id')
                     ->where('pm.code', '=', 'payment_method');
            })
            ->where('ot.code', 'tip')
            ->whereDate('o.order_date', $date)
            ->where(function($q) {
                $q->where('pm.value', 'like', '%cash%')
                  ->orWhere('pm.value', 'like', '%Cash%')
                  ->orWhere('pm.value', '=', 'cash');
            });
        
        if ($locationId) {
            $cashTipsQuery->where('o.location_id', $locationId);
        }
        
        $cashTips = $cashTipsQuery->sum('ot.value');
        
        // Get cash tip count
        $cashTipCount = (clone $cashTipsQuery)->count();
        
        // Card tips = all tips - cash tips
        $cardTips = $allTips - $cashTips;
        $cardTipCount = $tipCount - $cashTipCount;
        
        return [
            'total' => $allTips ?? 0,
            'cash' => $cashTips ?? 0,
            'card' => $cardTips ?? 0,
            'count' => $tipCount,
            'cash_count' => $cashTipCount,
            'card_count' => $cardTipCount,
        ];
    }

    public function getTipsByDateRange($startDate, $endDate, $locationId = null)
    {
        $query = DB::table('order_totals as ot')
            ->join('orders as o', 'ot.order_id', '=', 'o.order_id')
            ->where('ot.code', 'tip')
            ->whereBetween('o.order_date', [$startDate, $endDate])
            ->select(
                DB::raw('DATE(o.order_date) as shift_date'),
                DB::raw('SUM(ot.value) as total_tips'),
                DB::raw('COUNT(DISTINCT o.order_id) as order_count')
            )
            ->groupBy('shift_date')
            ->orderBy('shift_date', 'DESC');
        
        if ($locationId) {
            $query->where('o.location_id', $locationId);
    }
        
        return $query->get();
    }
}
