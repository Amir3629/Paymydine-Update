#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${PMD_APP_DIR:-$(pwd)}"
TENANT_DB="${1:---list}"

echo "=================================================="
echo " PMD - Test Tenant Roles / Users"
echo "=================================================="
echo "App: $APP_DIR"
echo

for REQUIRED in artisan bootstrap/app.php vendor/autoload.php; do
    if [ ! -f "$APP_DIR/$REQUIRED" ]; then
        echo "ERROR: $APP_DIR does not look like the PMD application root."
        echo "Missing: $REQUIRED"
        echo
        echo "cd into the PMD installation first, then run this script."
        exit 1
    fi
done

TMP_PHP="$(mktemp /tmp/pmd-test-users-XXXXXX.php)"
trap 'rm -f "$TMP_PHP"' EXIT

cat > "$TMP_PHP" <<'PHP'
<?php

use App\Helpers\TenantContextHelper;
use Admin\Models\Staff_roles_model;
use Admin\Models\Staffs_model;
use Admin\Models\Locations_model;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

$root = getenv('PMD_APP_DIR');

if (!$root) {
    fwrite(STDERR, "PMD_APP_DIR is missing.\n");
    exit(1);
}

require $root.'/vendor/autoload.php';

$app = require $root.'/bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$tenantDb = $argv[1] ?? '--list';

//
// -------------------------------------------------
// ACTIVE TENANTS
// -------------------------------------------------
//

$activeTenants = TenantContextHelper::getActiveTenantDatabases();

if ($tenantDb === '--list' || $tenantDb === '') {
    echo "\nACTIVE PMD TENANT DATABASES\n";
    echo "---------------------------\n";

    if (!$activeTenants) {
        echo "No active tenant databases found.\n";
        exit(1);
    }

    foreach ($activeTenants as $db) {
        echo "  - {$db}\n";
    }

    echo "\nRun again with the tenant database name:\n";
    echo "  ./pmd-create-test-users.sh TENANT_DATABASE\n\n";
    exit(0);
}

if (!in_array($tenantDb, $activeTenants, true)) {
    fwrite(STDERR, "\nERROR: '{$tenantDb}' is not an active tenant database.\n\n");
    fwrite(STDERR, "Available tenant databases:\n");

    foreach ($activeTenants as $db) {
        fwrite(STDERR, "  - {$db}\n");
    }

    exit(1);
}

echo "\nUsing tenant database: {$tenantDb}\n";

//
// -------------------------------------------------
// SWITCH TO TENANT DB
// -------------------------------------------------
//

TenantContextHelper::restoreTenantByDatabase($tenantDb);

//
// -------------------------------------------------
// HELPERS
// -------------------------------------------------
//

function permissionMap(array $permissions): array
{
    $result = [];

    foreach ($permissions as $permission) {
        $result[$permission] = 1;
    }

    return $result;
}

function generatePassword(): string
{
    // Example:
    // PMD!8f54ac04d07c4871Aa9
    return 'password';
}

//
// -------------------------------------------------
// PMD TEST ROLES
// -------------------------------------------------
//
// Owner is super_user = 1.
// Other roles use least-privilege PMD permissions.
//
// These core permission names exist in the PMD Admin code:
// Admin.Dashboard
// Admin.Locations
// Admin.Menus
// Admin.Categories
// Admin.Mealtimes
// Admin.Tables
// Admin.Orders
// Admin.Reservations
// Admin.Payments
// Admin.Tips
//

$roles = [

    'owner' => [
        'name' => 'Owner',
        'code' => 'pmd_owner',
        'description' => 'Restaurant owner - full PMD tenant access',
        'super_user' => true,
        'sale_permission' => 1,
        'permissions' => [],
    ],

    'manager' => [
        'name' => 'Manager',
        'code' => 'pmd_manager',
        'description' => 'Restaurant manager - operational management access',
        'super_user' => false,
        'sale_permission' => 1,
        'permissions' => [
            'Admin.Dashboard',
            'Admin.Locations',
            'Admin.Menus',
            'Admin.Categories',
            'Admin.Mealtimes',
            'Admin.Tables',
            'Admin.Orders',
            'Admin.Reservations',
            'Admin.Payments',
            'Admin.Tips',
        ],
    ],

    'accountant' => [
        'name' => 'Accountant',
        'code' => 'pmd_accountant',
        'description' => 'Finance/accounting test role',
        'super_user' => false,
        'sale_permission' => 3,
        'permissions' => [
            'Admin.Dashboard',
            'Admin.Orders',
            'Admin.Payments',
            'Admin.Tips',
        ],
    ],

    'waiter' => [
        'name' => 'Waiter',
        'code' => 'pmd_waiter',
        'description' => 'Waiter - tables and order handling',
        'super_user' => false,
        'sale_permission' => 3,
        'permissions' => [
            'Admin.Dashboard',
            'Admin.Tables',
            'Admin.Orders',
        ],
    ],

    'cashier' => [
        'name' => 'Cashier',
        'code' => 'pmd_cashier',
        'description' => 'Cashier - checkout and payment operations',
        'super_user' => false,
        'sale_permission' => 3,
        'permissions' => [
            'Admin.Dashboard',
            'Admin.Orders',
            'Admin.Payments',
            'Admin.Tips',
        ],
    ],

    'reservation' => [
        'name' => 'Reservations',
        'code' => 'pmd_reservations',
        'description' => 'Reservations/front desk role',
        'super_user' => false,
        'sale_permission' => 3,
        'permissions' => [
            'Admin.Dashboard',
            'Admin.Reservations',
            'Admin.Tables',
        ],
    ],
];

//
// -------------------------------------------------
// TEST LOGIN DEFINITIONS
// -------------------------------------------------
//

$accounts = [

    'owner' => [
        'name' => 'PMD Test Owner',
        'username' => 'pmd_owner',
        'email' => 'pmd.owner@test.paymydine.com',
    ],

    'manager' => [
        'name' => 'PMD Test Manager',
        'username' => 'pmd_manager',
        'email' => 'pmd.manager@test.paymydine.com',
    ],

    'accountant' => [
        'name' => 'PMD Test Accountant',
        'username' => 'pmd_accountant',
        'email' => 'pmd.accountant@test.paymydine.com',
    ],

    'waiter' => [
        'name' => 'PMD Test Waiter',
        'username' => 'pmd_waiter',
        'email' => 'pmd.waiter@test.paymydine.com',
    ],

    'cashier' => [
        'name' => 'PMD Test Cashier',
        'username' => 'pmd_cashier',
        'email' => 'pmd.cashier@test.paymydine.com',
    ],

    'reservation' => [
        'name' => 'PMD Test Reservations',
        'username' => 'pmd_reservation',
        'email' => 'pmd.reservation@test.paymydine.com',
    ],
];

//
// -------------------------------------------------
// LOCATIONS
// -------------------------------------------------
//

$locationIds = Locations_model::query()
    ->pluck('location_id')
    ->all();

echo "Locations found: ".count($locationIds)."\n";

//
// -------------------------------------------------
// CREATE / UPDATE EVERYTHING
// -------------------------------------------------
//

$credentials = [];

DB::beginTransaction();

try {

    $savedRoles = [];

    foreach ($roles as $key => $definition) {

        $role = Staff_roles_model::query()
            ->where('code', $definition['code'])
            ->first();

        if (!$role) {
            $role = new Staff_roles_model;
        }

        $role->name = $definition['name'];
        $role->code = $definition['code'];
        $role->description = $definition['description'];
        $role->permissions = permissionMap($definition['permissions']);
        $role->save();

        $savedRoles[$key] = $role;

        echo "[ROLE] {$definition['name']} => role_id={$role->getKey()}\n";
    }

    foreach ($accounts as $roleKey => $account) {

        $roleDefinition = $roles[$roleKey];
        $role = $savedRoles[$roleKey];

        //
        // Fresh random password on every run.
        // Re-running this script therefore RESETs these six QA passwords.
        //
        $password = generatePassword();

        $staff = Staffs_model::query()
            ->where('staff_email', $account['email'])
            ->first();

        $created = false;

        if (!$staff) {
            $staff = new Staffs_model;
            $created = true;
        }

        $staff->staff_name = $account['name'];
        $staff->staff_email = $account['email'];
        $staff->staff_role_id = $role->getKey();
        $staff->staff_status = 1;
        $staff->sale_permission = $roleDefinition['sale_permission'];

        //
        // IMPORTANT:
        // Use PMD's Staff -> User model flow.
        // Do NOT insert the password directly into ti_users.
        //
        $staff->user = [
            'username' => $account['username'],
            'password' => $password,
            'super_user' => $roleDefinition['super_user'] ? 1 : 0,
            'activate' => true,
            'send_invite' => false,
        ];

        $staff->save();

        //
        // Give each QA account access to all locations in this TEST tenant.
        //
        if (!empty($locationIds)) {
            $staff->addStaffLocations($locationIds);
        }

        $credentials[] = [
            'role' => $roleDefinition['name'],
            'username' => $account['username'],
            'password' => $password,
            'email' => $account['email'],
            'status' => $created ? 'CREATED' : 'UPDATED',
        ];

        echo "[USER] {$account['username']} => {$roleDefinition['name']} ";
        echo $created ? "(created)\n" : "(updated / password reset)\n";
    }

    DB::commit();

} catch (Throwable $e) {

    DB::rollBack();
    TenantContextHelper::restoreMainConnection();

    fwrite(STDERR, "\nFAILED - all changes rolled back.\n");
    fwrite(STDERR, $e->getMessage()."\n");
    fwrite(STDERR, $e->getFile().":".$e->getLine()."\n");

    exit(1);
}

//
// -------------------------------------------------
// CREDENTIAL REPORT
// -------------------------------------------------
//

$report = [];
$report[] = '============================================================';
$report[] = ' PMD TEST TENANT LOGIN CREDENTIALS';
$report[] = '============================================================';
$report[] = 'Tenant DB : '.$tenantDb;
$report[] = 'Admin URL : https://test.paymydine.com/admin/';
$report[] = 'Generated : '.date('Y-m-d H:i:s');
$report[] = '';

foreach ($credentials as $item) {
    $report[] = 'ROLE     : '.$item['role'];
    $report[] = 'USERNAME : '.$item['username'];
    $report[] = 'PASSWORD : '.$item['password'];
    $report[] = 'EMAIL    : '.$item['email'];
    $report[] = 'STATUS   : '.$item['status'];
    $report[] = '------------------------------------------------------------';
}

$reportText = implode(PHP_EOL, $report).PHP_EOL;

echo "\n";
echo $reportText;

//
// Save a protected copy outside public/ directory.
//
$credentialDir = $root.'/storage/app';
$credentialFile = $credentialDir.'/pmd-test-logins-'.date('Ymd-His').'.txt';

if (is_dir($credentialDir) && is_writable($credentialDir)) {
    file_put_contents($credentialFile, $reportText);
    @chmod($credentialFile, 0600);

    echo "\nCredentials saved to:\n";
    echo $credentialFile."\n";
}

TenantContextHelper::restoreMainConnection();

echo "\nDONE.\n";
echo "Open: https://test.paymydine.com/admin/\n\n";
PHP

PMD_APP_DIR="$APP_DIR" php "$TMP_PHP" "$TENANT_DB"

