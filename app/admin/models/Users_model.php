<?php

namespace Admin\Models;

use Admin\Classes\PermissionManager;
use Admin\Services\PmdDefaultStaffRoleService;
use Carbon\Carbon;
use Igniter\Flame\Auth\Models\User as AuthUserModel;
use Igniter\Flame\Database\Traits\Purgeable;
use System\Traits\SendsMailTemplate;

/**
 * Users Model Class
 */
class Users_model extends AuthUserModel
{
    use Purgeable;
    use SendsMailTemplate;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    protected $fillable = ['username', 'super_user'];
    protected $appends = ['staff_name'];
    protected $hidden = ['password'];

    protected $casts = [
        'staff_id' => 'integer',
        'super_user' => 'boolean',
        'is_activated' => 'boolean',
        'reset_time' => 'datetime',
        'date_invited' => 'datetime',
        'date_activated' => 'datetime',
        'last_login' => 'datetime',
    ];

    public $relation = [
        'belongsTo' => [
            'staff' => ['Admin\Models\Staffs_model', 'foreignKey' => 'staff_id'],
        ],
    ];

    protected $with = ['staff'];
    protected $purgeable = ['password_confirm', 'send_invite'];

    protected function afterCreate()
    {
        $this->restorePurgedValues();
        if ($this->send_invite) $this->sendInvite();
    }

    protected function sendInvite()
    {
        $this->bindEventOnce('model.mailGetData', function ($view, $recipientType) {
            if ($view === 'admin::_mail.invite') {
                $this->reset_code = $inviteCode = $this->generateResetCode();
                $this->reset_time = now();
                $this->save();
                return ['invite_code' => $inviteCode];
            }
        });
        $this->mailSend('admin::_mail.invite');
    }

    public function beforeLogin()
    {
        app('translator.localization')->setSessionLocale(
            optional($this->staff->language)->code ?? setting('default_language')
        );
    }

    public function afterLogin()
    {
        $this->last_login = Carbon::now();
        $this->save();
    }

    public function getStaffNameAttribute()
    {
        if (!$staff = $this->staff) return null;
        return $staff->staff_name;
    }

    public function isSuperUser()
    {
        return $this->super_user == 1;
    }

    public function resetPassword()
    {
        $this->reset_code = $resetCode = $this->generateResetCode();
        $this->reset_time = Carbon::now();
        $this->save();
        return $resetCode;
    }

    public function getReminderEmail()
    {
        return $this->staff->staff_email;
    }

    //
    // Permissions
    //

    public function hasAnyPermission($permissions)
    {
        return $this->hasPermission($permissions, false);
    }

    public function hasPermission($permissions, $checkAll = true)
    {
        if ($this->isSuperUser()) return true;

        /*
         * PMD_DEFAULT_ROLE_ROUTE_BOUNDARY_V1
         *
         * Default PMD roles deliberately keep the minimum legacy permission
         * bits required by their canonical workspace/controller. Those bits
         * must never become a way to browse another admin route directly.
         * Apply the product-role route boundary before matching permission bits.
         */
        try {
            $roleService = app(PmdDefaultStaffRoleService::class);
            $roleCode = $roleService->roleCodeForUser($this);
            if (
                $roleService->isManagedCode($roleCode)
                && !$roleService->mayOpenPath($roleCode, request()->path())
            ) {
                return false;
            }
        } catch (\Throwable $error) {
            // Preserve legacy permission behavior for custom/unmanaged roles if
            // role resolution is unavailable for any reason.
        }

        $staffPermissions = $this->getPermissions();
        if (!is_array($permissions)) $permissions = [$permissions];

        if (PermissionManager::instance()->checkPermission(
            $staffPermissions,
            $permissions,
            $checkAll
        )) return true;

        return false;
    }

    public function getPermissions()
    {
        $role = $this->staff->role;
        $permissions = [];
        if ($role && is_array($role->permissions)) $permissions = $role->permissions;
        return $permissions;
    }

    //
    // Location
    //

    public function hasLocationAccess($location)
    {
        return $this->staff->locations->contains(function ($model) use ($location) {
            return $model->location_id === $location->location_id;
        });
    }

    public function mailGetRecipients($type)
    {
        return [[$this->staff->staff_email, $this->staff_name]];
    }

    public function mailGetData()
    {
        $model = $this->fresh();
        return array_merge($model->toArray(), [
            'staff' => $model,
            'staff_name' => $model->staff_name,
            'staff_email' => $model->staff->staff_email,
            'username' => $model->username,
        ]);
    }
}
