<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('pmd_google_business_connections')) {
            Schema::create('pmd_google_business_connections', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->unique();
                $table->string('tenant_host', 191)->nullable()->index();
                $table->string('google_account_name', 191)->nullable()->index();
                $table->string('google_account_display_name', 191)->nullable();
                $table->string('google_location_name', 191)->nullable()->index();
                $table->string('google_location_title', 191)->nullable();
                $table->string('google_place_id', 191)->nullable()->index();
                $table->text('google_maps_uri')->nullable();
                $table->text('google_write_review_uri')->nullable();
                $table->text('google_reviews_uri')->nullable();
                $table->text('access_token_encrypted')->nullable();
                $table->text('refresh_token_encrypted')->nullable();
                $table->timestamp('token_expires_at')->nullable();
                $table->text('scopes')->nullable();
                $table->string('status', 30)->default('disconnected')->index();
                $table->decimal('google_average_rating', 3, 2)->nullable();
                $table->unsignedInteger('google_total_review_count')->default(0);
                $table->boolean('notifications_enabled')->default(false);
                $table->timestamp('last_synced_at')->nullable()->index();
                $table->text('last_error')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('pmd_external_reviews')) {
            Schema::create('pmd_external_reviews', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('location_id')->index();
                $table->string('provider', 30)->default('google')->index();
                $table->string('provider_review_id', 128);
                $table->string('google_location_name', 191)->nullable()->index();
                $table->string('reviewer_name', 191)->nullable();
                $table->text('reviewer_photo_url')->nullable();
                $table->unsignedTinyInteger('rating')->default(0)->index();
                $table->text('comment')->nullable();
                $table->timestamp('review_created_at')->nullable()->index();
                $table->timestamp('review_updated_at')->nullable()->index();
                $table->text('owner_reply')->nullable();
                $table->timestamp('owner_reply_updated_at')->nullable();
                $table->longText('raw_payload')->nullable();
                $table->timestamp('synced_at')->nullable()->index();
                $table->timestamps();

                $table->unique(
                    ['provider', 'location_id', 'provider_review_id'],
                    'pmd_external_reviews_provider_location_review_unique'
                );
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pmd_external_reviews');
        Schema::dropIfExists('pmd_google_business_connections');
    }
};
