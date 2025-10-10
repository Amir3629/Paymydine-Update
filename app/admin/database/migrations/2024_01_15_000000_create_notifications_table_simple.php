<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotificationsTableSimple extends Migration
{
    public function up()
    {
        Schema::create('ti_notifications', function (Blueprint $table) {
            $table->increments('notification_id');
            $table->integer('tenant_id')->unsigned(); // Explicit tenant_id
            $table->string('type'); // e.g., 'waiter_call', 'valet_request', 'table_note'
            $table->string('title');
            $table->text('message')->nullable();
            $table->integer('table_id')->nullable();
            $table->string('table_name')->nullable();
            $table->json('payload')->nullable(); // Store additional data
            $table->enum('status', ['new', 'seen', 'in_progress', 'resolved'])->default('new');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('seen_at')->nullable();
            $table->integer('acted_by')->nullable(); // Staff ID who acted on it
            $table->timestamp('acted_at')->nullable();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable();

            // Indexes for performance
            $table->index('tenant_id');
            $table->index('status');
            $table->index('type');
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'table_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('ti_notifications');
    }
}