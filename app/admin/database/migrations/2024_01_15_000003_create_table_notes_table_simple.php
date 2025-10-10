<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTableNotesTableSimple extends Migration
{
    public function up()
    {
        Schema::create('ti_table_notes', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('table_id')->unsigned();
            $table->text('note');
            $table->timestamp('timestamp'); // Original timestamp from frontend
            $table->enum('status', ['new', 'resolved'])->default('new');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable();

            $table->index('table_id');
            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('ti_table_notes');
    }
}