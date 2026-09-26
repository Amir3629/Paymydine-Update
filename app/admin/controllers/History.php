<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Facades\AdminAuth;
use Admin\Classes\AdminController;
use Admin\Services\PmdDefaultStaffRoleService;

class History extends AdminController
{
    public $implement = ['Admin\\Actions\\ListController'];

    public $listConfig = [
        'list' => [
            'model'        => 'Admin\\Models\\History_model',
            'title'        => 'History',
            'emptyMessage' => 'No history records.',
            'defaultSort'  => ['created_at', 'DESC'],
            'configFile'   => 'history_model',
        ],
    ];

    // PMD_HISTORY_ROLE_ACCESS_V154
    // Admin.History was never registered in PermissionManager, so managed
    // Owner/Manager roles could be rejected before the page rendered.
    protected $requiredPermissions = null;

    public function __construct()
    {
        parent::__construct();
        $this->pmdAssertHistoryAccess();

        /* PMD_HISTORY_ENGLISH_RUNTIME_R22
         * History is intentionally an English-only clean PayMyDine surface.
         * Force the server-side translator too, so framework flash/toast copy
         * generated during History AJAX actions cannot come from the German
         * admin language pack. The user's global Admin locale preference is not
         * changed; this authority exists only for requests handled by History.
         */
        $this->pmdForceEnglishHistoryLocale();

        /* PMD_HISTORY_SHELL_R18
         * History joins the stable PayMyDine normal-flow shell from the server.
         * The final History-specific background/motion/list-control authority is
         * inline in history/index.blade.php so tenant vhost asset routing cannot
         * redirect or replace it with the public Next.js site.
         */
        $this->bodyClass = trim(
            ($this->bodyClass ?? '')
            .' pmd-settings-suite pmd-history-shell-r18'
        );

        AdminMenu::setContext('history', 'sales');
    }

    private function pmdAssertHistoryAccess(): void
    {
        try {
            $code = app(PmdDefaultStaffRoleService::class)->roleCodeForUser(AdminAuth::getUser());
            if (in_array($code, [
                PmdDefaultStaffRoleService::OWNER,
                PmdDefaultStaffRoleService::MANAGER,
            ], true)) {
                return;
            }
        } catch (\Throwable $error) {
        }

        abort(403);
    }

    private function pmdForceEnglishHistoryLocale(): void
    {
        app()->setLocale('en');

        if (app()->bound('translator.localization')) {
            app('translator.localization')->setLocale('en', false);
        }
    }

    public function index()
    {
        $this->pmdForceEnglishHistoryLocale();

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
        // AJAX requests may re-bootstrap locale independently of the page load.
        // Re-assert English immediately before ListController builds flash copy.
        $this->pmdForceEnglishHistoryLocale();

        // Access was already checked by the managed Owner/Manager role guard.
        // Delegate to ListController's built-in bulk delete handler.
        return $this->asExtension('Admin\\Actions\\ListController')->index_onDelete();
    }
}
