<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class UpdateReviewsForPmdCheckout extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $table) {
                $table->increments('review_id');
                $table->unsignedInteger('customer_id')->nullable()->index();
                $table->unsignedInteger('sale_id')->nullable()->index();
                $table->string('sale_type')->nullable()->index();
                $table->unsignedInteger('location_id')->nullable()->index();
                $table->string('author')->nullable();
                $table->unsignedTinyInteger('quality')->default(0);
                $table->unsignedTinyInteger('service')->default(0);
                $table->unsignedTinyInteger('delivery')->default(0);
                $table->text('review_text')->nullable();
                $table->boolean('review_status')->default(false);
                $table->timestamps();
            });
        }

        Schema::table('reviews', function (Blueprint $table) {
            if (!Schema::hasColumn('reviews', 'public_share_consent')) {
                $table->boolean('public_share_consent')->nullable()->after('review_status');
            }
            if (!Schema::hasColumn('reviews', 'tenant_host')) {
                $table->string('tenant_host')->nullable()->after('location_id');
            }
        });
    }

    public function down()
    {
        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                if (Schema::hasColumn('reviews', 'public_share_consent')) {
                    $table->dropColumn('public_share_consent');
                }
                if (Schema::hasColumn('reviews', 'tenant_host')) {
                    $table->dropColumn('tenant_host');
                }
            });
        }
    }
}
