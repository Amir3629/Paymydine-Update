#!/usr/bin/env bash
set -euo pipefail

# مسیر backup
BACKUP="/var/www/paymydine/.deploy-backups/food-attribute-tags-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP/mysql"

echo "================ BACKUP DATABASES ================"
# بکاپ tenant ها
for tenant in mimoza rosana; do
    mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" $tenant > "$BACKUP/mysql/${tenant}.sql"
done
echo "Backup completed at $BACKUP"

echo "================ RUNNING MIGRATIONS & SEEDS ================"
php -r '
require __DIR__ . "/vendor/autoload.php";
$app = require __DIR__ . "/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

$tenants = ["mimoza","rosana"];

foreach ($tenants as $db) {
    echo "Running migration on tenant: $db\n";
    config(["database.connections.mysql.database"=>$db]);
    DB::purge("mysql");
    DB::reconnect("mysql");

    # جدول ti_menus
    if (!Schema::hasTable("ti_menus")) {
        Schema::create("ti_menus", function (Blueprint $table) {
            $table->increments("id");
            $table->string("name");
            $table->tinyInteger("menu_status")->default(0);
            $table->timestamps();
        });
        echo "Created ti_menus for $db\n";
    }

    # اضافه کردن ستون‌ها
    Schema::table("ti_menus", function (Blueprint $table) {
        if (!Schema::hasColumn("ti_menus","is_halal")) $table->boolean("is_halal")->default(0)->after("menu_status");
        if (!Schema::hasColumn("ti_menus","is_vegetarian")) $table->boolean("is_vegetarian")->default(0)->after("is_halal");
        if (!Schema::hasColumn("ti_menus","is_vegan")) $table->boolean("is_vegan")->default(0)->after("is_vegetarian");
    });

    # جدول allergens
    if (!Schema::hasTable("allergens")) {
        Schema::create("allergens", function (Blueprint $table) {
            $table->increments("id");
            $table->string("name")->unique();
            $table->text("description")->nullable();
            $table->tinyInteger("status")->default(1);
            $table->timestamps();
        });
        echo "Created allergens table for $db\n";
    }

    # seed آلرژی‌ها
    $presets = ["Gluten","Crustaceans","Eggs","Fish","Peanuts","Soy","Milk / Lactose","Nuts","Celery","Mustard","Sesame","Sulphites","Lupin","Molluscs"];
    $now = date("Y-m-d H:i:s");
    foreach ($presets as $name) {
        if (!DB::table("allergens")->where("name",$name)->exists()) {
            DB::table("allergens")->insert([
                "name"=>$name,
                "description"=>"Display tag for restaurant-provided allergy information only.",
                "status"=>1,
                "created_at"=>$now,
                "updated_at"=>$now
            ]);
        }
    }
}
echo "Migrations and seeding completed for all tenants.\n";
'
