 <?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateValetRequestsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('ti_valet_requests', function (Blueprint $table) {
            $table->id('request_id');
            $table->unsignedBigInteger('table_id');
            $table->string('customer_name', 255);
            $table->string('car_make', 255);
            $table->string('license_plate', 20);
            $table->enum('status', ['pending', 'acknowledged', 'in_progress', 'completed', 'cancelled'])->default('pending');
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
        Schema::dropIfExists('ti_valet_requests');
    }
}