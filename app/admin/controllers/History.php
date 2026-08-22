<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Classes\AdminController;
use System\Classes\ApplicationException;

class History extends AdminController
{
    public $implement = ['Admin\Actions\ListController'];

    public $listConfig = [
        'list' => [
            'model'        => 'Admin\Models\History_model',
            'title'        => 'lang:admin::lang.history.text_title',
            'emptyMessage' => 'lang:admin::lang.history.text_empty',
            'defaultSort'  => ['created_at', 'DESC'],
            'configFile'   => 'history_model', // <- file in app/admin/models/config/
        ],
    ];

    protected $requiredPermissions = 'Admin.History';

    public function __construct()
    {
        parent::__construct();

        /* PMD_HISTORY_SHELL_R17
         * History is a clean PayMyDine owner surface, not a legacy absolute
         * admin page. Declare the flow/static shell on the server so the global
         * exact-layout runtime sees it before it initializes. The dedicated
         * R17 head CSS also removes legacy cream and global fade/slide effects
         * before the first visible paint.
         */
        $this->bodyClass = trim(
            ($this->bodyClass ?? '')
            .' pmd-settings-suite pmd-history-shell-r17'
        );
        $this->addCss('css/pmd-history-shell-r17.css');

        AdminMenu::setContext('history', 'sales');
    }

    public function index()
    {
        \Log::info('TRACE', [
            'where'  => __FILE__ . ':' . __LINE__,
            'route'  => request()->path() ?? null,
            'method' => request()->method() ?? null,
            'conn'   => \DB::getDefaultConnection(),
            'db'     => \DB::connection()->getDatabaseName(),
            'tenant' => request()->attributes->get('tenant_id')
                         ?? (app()->bound('tenant') ? optional(app('tenant'))->id : null),
        ]);
        
        $this->asExtension('ListController')->index();
    }

    public function index_onDelete()
    {
        if (!$this->getUser()->hasPermission('Admin.History'))
            throw new ApplicationException(lang('admin::lang.alert_user_restricted'));

        // Delegate to ListController's built-in bulk delete handler
        return $this->asExtension('Admin\Actions\ListController')->index_onDelete();
    }
}
