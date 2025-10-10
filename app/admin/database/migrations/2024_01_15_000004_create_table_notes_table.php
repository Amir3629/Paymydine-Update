<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTableNotesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('ti_table_notes', function (Blueprint $table) {
            $table->id('note_id');
            $table->unsignedBigInteger('table_id');
            $table->text('note');
            $table->timestamp('timestamp');
            $table->enum('status', ['new', 'read', 'archived'])->default('new');
            $table->timestamps();
            
            // Indexes
            $table->index(['table_id', 'status']);
            $table->index('created_at');
            
            // Foreign keys
            $table->foreign('table_id')->references('table_id')->on('ti_tables')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('ti_table_notes');
    }
}