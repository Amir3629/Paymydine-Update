<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotificationRecipientsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('ti_notification_recipients', function (Blueprint $table) {
            $table->id('recipient_id');
            $table->unsignedBigInteger('notification_id');
            $table->unsignedBigInteger('staff_id');
            $table->string('role', 50);
            $table->enum('status', ['unread', 'read', 'dismissed'])->default('unread');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->unique(['notification_id', 'staff_id']);
            $table->index(['staff_id', 'status']);
            $table->index('notification_id');
            
            // Foreign keys
            $table->foreign('notification_id')->references('notification_id')->on('ti_notifications')->onDelete('cascade');
            $table->foreign('staff_id')->references('staff_id')->on('ti_staffs')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('ti_notification_recipients');
    }
}