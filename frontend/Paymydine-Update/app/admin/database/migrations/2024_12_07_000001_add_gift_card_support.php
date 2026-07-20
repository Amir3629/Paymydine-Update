<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Add Gift Card, Voucher, and Credit support to coupons system
 */
class AddGiftCardSupport extends Migration
{
    protected function hasIndex(string $table, string $indexName): bool
    {
        try {
            $rows = DB::select("SHOW INDEX FROM `".$table."`");
            foreach ($rows as $row) {
                if (($row->Key_name ?? null) === $indexName) {
                    return true;
                }
            }
        } catch (\Throwable $e) {
        }

        return false;
    }

    public function up()
    {
        /*
         |------------------------------------------------------------------
         | Extend igniter_coupons
         |------------------------------------------------------------------
         */
        if (Schema::hasTable('igniter_coupons')) {
            if (!Schema::hasColumn('igniter_coupons', 'card_type')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->enum('card_type', ['coupon', 'gift_card', 'voucher', 'credit', 'comp'])
                        ->default('coupon')
                        ->after('code')
                        ->comment('Type of card: coupon, gift_card, voucher, credit, or comp');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'initial_balance')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->decimal('initial_balance', 15, 4)
                        ->nullable()
                        ->after('card_type')
                        ->comment('Initial balance for gift cards');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'current_balance')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->decimal('current_balance', 15, 4)
                        ->nullable()
                        ->after('initial_balance')
                        ->comment('Current remaining balance');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'is_reloadable')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->boolean('is_reloadable')
                        ->default(false)
                        ->after('current_balance')
                        ->comment('Can balance be reloaded');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'is_purchasable')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->boolean('is_purchasable')
                        ->default(false)
                        ->after('is_reloadable')
                        ->comment('Can be purchased by customers');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'purchase_price')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->decimal('purchase_price', 15, 4)
                        ->nullable()
                        ->after('is_purchasable')
                        ->comment('Price to purchase gift card');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'purchased_by')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->unsignedBigInteger('purchased_by')
                        ->nullable()
                        ->after('purchase_price')
                        ->comment('Customer who purchased this card');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'purchase_date')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->timestamp('purchase_date')
                        ->nullable()
                        ->after('purchased_by')
                        ->comment('When card was purchased');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'first_use_date')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->timestamp('first_use_date')
                        ->nullable()
                        ->after('purchase_date')
                        ->comment('First redemption date');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'last_use_date')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->timestamp('last_use_date')
                        ->nullable()
                        ->after('first_use_date')
                        ->comment('Last redemption date');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'is_transferable')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->boolean('is_transferable')
                        ->default(false)
                        ->after('last_use_date')
                        ->comment('Can be transferred to another customer');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'recipient_name')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->string('recipient_name', 255)
                        ->nullable()
                        ->after('is_transferable')
                        ->comment('Gift recipient name');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'recipient_email')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->string('recipient_email', 255)
                        ->nullable()
                        ->after('recipient_name')
                        ->comment('Gift recipient email');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'recipient_message')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->text('recipient_message')
                        ->nullable()
                        ->after('recipient_email')
                        ->comment('Personal message for recipient');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'is_digital')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->boolean('is_digital')
                        ->default(true)
                        ->after('recipient_message')
                        ->comment('Digital or physical card');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'expiry_date')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->timestamp('expiry_date')
                        ->nullable()
                        ->after('is_digital')
                        ->comment('Card expiry date (if applicable)');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'max_discount_cap')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->decimal('max_discount_cap', 15, 4)
                        ->nullable()
                        ->after('expiry_date')
                        ->comment('Maximum discount amount for percentage coupons');
                });
            }

            if (!Schema::hasColumn('igniter_coupons', 'design_id')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->unsignedInteger('design_id')
                        ->nullable()
                        ->after('max_discount_cap')
                        ->comment('Gift card design template ID');
                });
            }

            if (!$this->hasIndex('ti_igniter_coupons', 'idx_card_type_status')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->index(['card_type', 'status'], 'idx_card_type_status');
                });
            }

            if (!$this->hasIndex('ti_igniter_coupons', 'idx_purchased_by')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->index('purchased_by', 'idx_purchased_by');
                });
            }

            if (!$this->hasIndex('ti_igniter_coupons', 'idx_expiry_date')) {
                Schema::table('igniter_coupons', function (Blueprint $table) {
                    $table->index('expiry_date', 'idx_expiry_date');
                });
            }
        }

        /*
         |------------------------------------------------------------------
         | Extend igniter_coupons_history
         |------------------------------------------------------------------
         */
        if (Schema::hasTable('igniter_coupons_history')) {
            if (!Schema::hasColumn('igniter_coupons_history', 'balance_before')) {
                Schema::table('igniter_coupons_history', function (Blueprint $table) {
                    $table->decimal('balance_before', 15, 4)
                        ->nullable()
                        ->after('amount')
                        ->comment('Balance before redemption');
                });
            }

            if (!Schema::hasColumn('igniter_coupons_history', 'balance_after')) {
                Schema::table('igniter_coupons_history', function (Blueprint $table) {
                    $table->decimal('balance_after', 15, 4)
                        ->nullable()
                        ->after('balance_before')
                        ->comment('Balance after redemption');
                });
            }

            if (!Schema::hasColumn('igniter_coupons_history', 'amount_redeemed')) {
                Schema::table('igniter_coupons_history', function (Blueprint $table) {
                    $table->decimal('amount_redeemed', 15, 4)
                        ->nullable()
                        ->after('balance_after')
                        ->comment('Amount used in this transaction');
                });
            }

            if (!Schema::hasColumn('igniter_coupons_history', 'redemption_type')) {
                Schema::table('igniter_coupons_history', function (Blueprint $table) {
                    $table->enum('redemption_type', ['full', 'partial'])
                        ->default('full')
                        ->after('amount_redeemed')
                        ->comment('Full or partial redemption');
                });
            }
        }

        /*
         |------------------------------------------------------------------
         | gift_card_transactions
         |------------------------------------------------------------------
         */
        if (!Schema::hasTable('gift_card_transactions')) {
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

                $table->index('coupon_id', 'idx_coupon_id');
                $table->index('customer_id', 'idx_customer_id');
                $table->index('order_id', 'idx_order_id');
                $table->index('transaction_type', 'idx_transaction_type');
                $table->index('created_at', 'idx_created_at');

                $table->foreign('coupon_id', 'fk_gift_card_txn_coupon')
                    ->references('coupon_id')
                    ->on('igniter_coupons')
                    ->onDelete('cascade');
            });
        }

        /*
         |------------------------------------------------------------------
         | gift_card_designs
         |------------------------------------------------------------------
         */
        if (!Schema::hasTable('gift_card_designs')) {
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
        }

        /*
         |------------------------------------------------------------------
         | Seed default designs safely
         |------------------------------------------------------------------
         */
        if (Schema::hasTable('gift_card_designs')) {
            $defaults = [
                ['name' => 'Classic',  'description' => 'Classic gift card design',        'is_active' => true, 'is_default' => true],
                ['name' => 'Birthday', 'description' => 'Birthday celebration design',     'is_active' => true, 'is_default' => false],
                ['name' => 'Holiday',  'description' => 'Holiday season design',           'is_active' => true, 'is_default' => false],
                ['name' => 'Thank You','description' => 'Thank you appreciation design',   'is_active' => true, 'is_default' => false],
            ];

            foreach ($defaults as $row) {
                $exists = DB::table('gift_card_designs')->where('name', $row['name'])->exists();
                if (!$exists) {
                    DB::table('gift_card_designs')->insert([
                        'name' => $row['name'],
                        'description' => $row['description'],
                        'is_active' => $row['is_active'],
                        'is_default' => $row['is_default'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down()
    {
        // intentionally conservative
    }
}
