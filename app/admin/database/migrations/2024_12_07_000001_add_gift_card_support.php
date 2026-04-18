<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add Gift Card, Voucher, and Credit support to coupons system
 */
class AddGiftCardSupport extends Migration
{
    public function up()
    {
        // Extend coupons table with gift card fields
        Schema::table('igniter_coupons', function (Blueprint $table) {
            // Card type field
            $table->enum('card_type', ['coupon', 'gift_card', 'voucher', 'credit', 'comp'])
                ->default('coupon')
                ->after('code')
                ->comment('Type of card: coupon, gift_card, voucher, credit, or comp');
            
            // Gift card balance fields
            $table->decimal('initial_balance', 15, 4)
                ->nullable()
                ->after('card_type')
                ->comment('Initial balance for gift cards');
            
            $table->decimal('current_balance', 15, 4)
                ->nullable()
                ->after('initial_balance')
                ->comment('Current remaining balance');
            
            // Gift card settings
            $table->boolean('is_reloadable')
                ->default(false)
                ->after('current_balance')
                ->comment('Can balance be reloaded');
            
            $table->boolean('is_purchasable')
                ->default(false)
                ->after('is_reloadable')
                ->comment('Can be purchased by customers');
            
            $table->decimal('purchase_price', 15, 4)
                ->nullable()
                ->after('is_purchasable')
                ->comment('Price to purchase gift card');
            
            // Purchase tracking
            $table->unsignedBigInteger('purchased_by')
                ->nullable()
                ->after('purchase_price')
                ->comment('Customer who purchased this card');
            
            $table->timestamp('purchase_date')
                ->nullable()
                ->after('purchased_by')
                ->comment('When card was purchased');
            
            // Usage tracking
            $table->timestamp('first_use_date')
                ->nullable()
                ->after('purchase_date')
                ->comment('First redemption date');
            
            $table->timestamp('last_use_date')
                ->nullable()
                ->after('first_use_date')
                ->comment('Last redemption date');
            
            // Gift card features
            $table->boolean('is_transferable')
                ->default(false)
                ->after('last_use_date')
                ->comment('Can be transferred to another customer');
            
            $table->string('recipient_name', 255)
                ->nullable()
                ->after('is_transferable')
                ->comment('Gift recipient name');
            
            $table->string('recipient_email', 255)
                ->nullable()
                ->after('recipient_name')
                ->comment('Gift recipient email');
            
            $table->text('recipient_message')
                ->nullable()
                ->after('recipient_email')
                ->comment('Personal message for recipient');
            
            $table->boolean('is_digital')
                ->default(true)
                ->after('recipient_message')
                ->comment('Digital or physical card');
            
            $table->timestamp('expiry_date')
                ->nullable()
                ->after('is_digital')
                ->comment('Card expiry date (if applicable)');
            
            $table->decimal('max_discount_cap', 15, 4)
                ->nullable()
                ->after('expiry_date')
                ->comment('Maximum discount amount for percentage coupons');
            
            $table->unsignedInteger('design_id')
                ->nullable()
                ->after('max_discount_cap')
                ->comment('Gift card design template ID');
            
            // Add indexes
            $table->index(['card_type', 'status'], 'idx_card_type_status');
            $table->index('purchased_by', 'idx_purchased_by');
            $table->index('expiry_date', 'idx_expiry_date');
        });
        
        // Extend coupons_history table for partial redemptions
        Schema::table('igniter_coupons_history', function (Blueprint $table) {
            $table->decimal('balance_before', 15, 4)
                ->nullable()
                ->after('amount')
                ->comment('Balance before redemption');
            
            $table->decimal('balance_after', 15, 4)
                ->nullable()
                ->after('balance_before')
                ->comment('Balance after redemption');
            
            $table->decimal('amount_redeemed', 15, 4)
                ->nullable()
                ->after('balance_after')
                ->comment('Amount used in this transaction');
            
            $table->enum('redemption_type', ['full', 'partial'])
                ->default('full')
                ->after('amount_redeemed')
                ->comment('Full or partial redemption');
        });
        
        // Create gift card transactions table
        Schema::create('gift_card_transactions', function (Blueprint $table) {
            $table->bigIncrements('transaction_id');
            $table->unsignedBigInteger('coupon_id');
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->enum('transaction_type', ['purchase', 'reload', 'redemption', 'refund', 'adjustment'])
                ->comment('Type of transaction');
            $table->decimal('amount', 15, 4)->comment('Transaction amount');
            $table->decimal('balance_before', 15, 4)->comment('Balance before transaction');
            $table->decimal('balance_after', 15, 4)->comment('Balance after transaction');
            $table->string('payment_method', 50)->nullable()->comment('Payment method used');
            $table->string('payment_reference', 255)->nullable()->comment('Payment reference/transaction ID');
            $table->text('notes')->nullable()->comment('Additional notes');
            $table->unsignedBigInteger('staff_id')->nullable()->comment('Staff who processed transaction');
            $table->timestamps();
            
            // Indexes
            $table->index('coupon_id', 'idx_coupon_id');
            $table->index('customer_id', 'idx_customer_id');
            $table->index('order_id', 'idx_order_id');
            $table->index('transaction_type', 'idx_transaction_type');
            $table->index('created_at', 'idx_created_at');
            
            // Foreign key
            $table->foreign('coupon_id', 'fk_gift_card_txn_coupon')
                ->references('coupon_id')
                ->on('igniter_coupons')
                ->onDelete('cascade');
        });
        
        // Create gift card designs table
        Schema::create('gift_card_designs', function (Blueprint $table) {
            $table->increments('design_id');
            $table->string('name', 128);
            $table->text('description')->nullable();
            $table->string('image_path', 255)->nullable();
            $table->text('template_html')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            
            $table->index('is_active', 'idx_is_active');
        });
        
        // Insert default designs
        DB::table('gift_card_designs')->insert([
            [
                'name' => 'Classic',
                'description' => 'Classic gift card design',
                'is_active' => true,
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Birthday',
                'description' => 'Birthday celebration design',
                'is_active' => true,
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Holiday',
                'description' => 'Holiday season design',
                'is_active' => true,
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Thank You',
                'description' => 'Thank you appreciation design',
                'is_active' => true,
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
    
    public function down()
    {
        // Drop new tables
        Schema::dropIfExists('gift_card_designs');
        Schema::dropIfExists('gift_card_transactions');
        
        // Remove columns from coupons_history
        Schema::table('igniter_coupons_history', function (Blueprint $table) {
            $table->dropColumn([
                'balance_before',
                'balance_after',
                'amount_redeemed',
                'redemption_type',
            ]);
        });
        
        // Remove columns from coupons
        Schema::table('igniter_coupons', function (Blueprint $table) {
            $table->dropIndex('idx_card_type_status');
            $table->dropIndex('idx_purchased_by');
            $table->dropIndex('idx_expiry_date');
            
            $table->dropColumn([
                'card_type',
                'initial_balance',
                'current_balance',
                'is_reloadable',
                'is_purchasable',
                'purchase_price',
                'purchased_by',
                'purchase_date',
                'first_use_date',
                'last_use_date',
                'is_transferable',
                'recipient_name',
                'recipient_email',
                'recipient_message',
                'is_digital',
                'expiry_date',
                'max_discount_cap',
                'design_id',
            ]);
        });
    }
}

