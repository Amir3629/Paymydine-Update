<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCardSupportToMappings extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Add card fields to staff_device_mappings if table exists
        if (Schema::hasTable('ti_staff_device_mappings')) {
            Schema::table('ti_staff_device_mappings', function (Blueprint $table) {
                if (!Schema::hasColumn('ti_staff_device_mappings', 'card_uid')) {
                    $table->string('card_uid', 50)->nullable()->after('device_user_id');
                }
                if (!Schema::hasColumn('ti_staff_device_mappings', 'card_label')) {
                    $table->string('card_label', 100)->nullable()->after('card_uid');
                }
            });
            
            // Add index for card_uid
            Schema::table('ti_staff_device_mappings', function (Blueprint $table) {
                $sm = Schema::getConnection()->getDoctrineSchemaManager();
                $indexesFound = $sm->listTableIndexes('ti_staff_device_mappings');
                
                if (!array_key_exists('idx_card_uid', $indexesFound)) {
                    $table->index('card_uid', 'idx_card_uid');
                }
            });
        }
        
        // Create unassigned_cards table
        if (!Schema::hasTable('ti_unassigned_cards')) {
            Schema::create('ti_unassigned_cards', function (Blueprint $table) {
                $table->increments('id');
                $table->string('card_uid', 50)->unique();
                $table->integer('device_id')->nullable();
                $table->dateTime('first_seen_at')->nullable();
                $table->dateTime('last_seen_at')->nullable();
                $table->integer('times_scanned')->default(1);
                $table->integer('location_id')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                
                $table->index('card_uid', 'idx_card_uid');
                $table->index('device_id', 'idx_device_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (Schema::hasTable('ti_staff_device_mappings')) {
            Schema::table('ti_staff_device_mappings', function (Blueprint $table) {
                if (Schema::hasColumn('ti_staff_device_mappings', 'card_label')) {
                    $table->dropColumn('card_label');
                }
                if (Schema::hasColumn('ti_staff_device_mappings', 'card_uid')) {
                    $table->dropColumn('card_uid');
                }
            });
        }
        
        if (Schema::hasTable('ti_unassigned_cards')) {
            Schema::dropIfExists('ti_unassigned_cards');
        }
    }
}

