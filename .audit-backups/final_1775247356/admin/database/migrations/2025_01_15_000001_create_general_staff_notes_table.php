<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateGeneralStaffNotesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (!Schema::hasTable('general_staff_notes')) {
            Schema::create('general_staff_notes', function (Blueprint $table) {
                $table->id('note_id');
                $table->unsignedBigInteger('staff_id')->nullable();
                $table->text('note');
                $table->enum('status', ['active', 'archived'])->default('active');
                $table->timestamps();
                
                // Indexes for performance
                $table->index('staff_id');
                $table->index('status');
                $table->index('created_at');
                
                // Foreign key (if staffs table exists)
                // $table->foreign('staff_id')->references('staff_id')->on('ti_staffs')->onDelete('set null');
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
        Schema::dropIfExists('general_staff_notes');
    }
}

