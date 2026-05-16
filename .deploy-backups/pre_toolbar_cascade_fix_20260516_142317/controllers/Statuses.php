<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;
use Admin\Facades\AdminAuth;
use App\Helpers\SettingsHelper;
use Illuminate\Support\Facades\Request;

class Statuses extends \Admin\Classes\AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Statuses_model',
            'title' => 'lang:admin::lang.statuses.text_title',
            'emptyMessage' => 'lang:admin::lang.statuses.text_empty',
            'defaultSort' => ['status_id', 'DESC'],
            'configFile' => 'statuses_model',
        ],
    ];

    public $formConfig = [
        'name' => 'lang:admin::lang.statuses.text_form_name',
        'model' => 'Admin\Models\Statuses_model',
        'request' => 'Admin\Requests\Status',
        'create' => [
            'title' => 'lang:admin::lang.form.create_title',
            'redirect' => 'statuses/edit/{status_id}',
            'redirectClose' => 'statuses',
            'redirectNew' => 'statuses/create',
        ],
        'edit' => [
            'title' => 'lang:admin::lang.form.edit_title',
            'redirect' => 'statuses/edit/{status_id}',
            'redirectClose' => 'statuses',
            'redirectNew' => 'statuses/create',
        ],
        'preview' => [
            'title' => 'lang:admin::lang.form.preview_title',
            'redirect' => 'statuses',
        ],
        'delete' => [
            'redirect' => 'statuses',
        ],
        'configFile' => 'statuses_model',
    ];

    protected $requiredPermissions = 'Admin.Statuses';

    /**
     * Disable checkboxes and bulk actions for read-only view
     */
    public function listExtendColumns($widget)
    {
        $widget->showCheckboxes = false;
        $widget->bulkActions = [];
        $widget->rowClickable = false;
    }

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('statuses', 'sales');
    }

    public function index()
    {
        $this->asExtension('ListController')->index();
    }

    /**
     * Save order notifications settings (user-specific)
     */
    public function onSaveOrderNotificationSettings()
    {
        $enabled = (bool) post('order_notifications_enabled', false);
        $user = AdminAuth::getUser();
        
        $success = SettingsHelper::setOrderNotificationsEnabledForUser($enabled, $user);
        
        if (Request::ajax()) {
            return [
                'result' => $success ? 'success' : 'error',
                'enabled' => $enabled,
            ];
        }

        if ($success) {
            $message = $enabled ? 'Order notifications enabled' : 'Order notifications disabled';
            flash()->success($message);
        } else {
            flash()->error('Failed to update order notification settings');
        }
        
        return $this->redirectBack();
    }

    public function comment_notify()
    {
        if (get('status_id')) {
            $status = $this->Statuses_model->getStatus(get('status_id'));

            $json = ['comment' => $status['status_comment'], 'notify' => $status['notify_customer']];

            return $json;
        }
    }

    public function formValidate($model, $form)
    {
        $rules = [
        ];

        return $this->validatePasses($form->getSaveData(), $rules);
    }
}
