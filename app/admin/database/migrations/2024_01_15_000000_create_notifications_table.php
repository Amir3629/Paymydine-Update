<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotificationsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('ti_notifications', function (Blueprint $table) {
            $table->id('notification_id');
            $table->unsignedBigInteger('tenant_id');
            $table->string('type', 50);
            $table->string('title', 255);
            $table->text('message');
            $table->unsignedBigInteger('table_id')->nullable();
            $table->string('table_name', 128)->nullable();
            $table->json('payload')->nullable();
            $table->enum('status', ['new', 'seen', 'in_progress', 'resolved'])->default('new');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->timestamp('seen_at')->nullable();
            $table->unsignedBigInteger('acted_by')->nullable();
            $table->timestamp('acted_at')->nullable();
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'created_at']);
            $table->index(['type', 'status']);
            $table->index('table_id');
            $table->index('acted_by');
            
            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('ti_tenants')->onDelete('cascade');
            $table->foreign('table_id')->references('table_id')->on('ti_tables')->onDelete('set null');
            $table->foreign('acted_by')->references('staff_id')->on('ti_staffs')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('ti_notifications');
    }
}