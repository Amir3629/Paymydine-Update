<?php

namespace App\Services\WhatsApp;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

/**
 * R30 opt-in CENTRAL WhatsApp storage. Never run against a tenant connection.
 * No schema changes occur merely by visiting a customer or admin page.
 */
final class PmdWhatsAppSchema
{
    public function installed(): bool
    {
        $schema = DB::connection('mysql')->getSchemaBuilder();

        return $schema->hasTable('pmd_whatsapp_channels')
            && $schema->hasTable('pmd_whatsapp_messages');
    }

    public function install(): void
    {
        $schema = DB::connection('mysql')->getSchemaBuilder();

        if (!$schema->hasTable('pmd_whatsapp_channels')) {
            $schema->create('pmd_whatsapp_channels', function (Blueprint $table): void {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('tenant_id')->index();
                $table->unsignedBigInteger('location_id');
                $table->string('phone_number_id', 32)->unique();
                $table->string('waba_id', 32);
                $table->boolean('enabled')->default(false);
                $table->timestamps();
                $table->index(['tenant_id', 'location_id', 'enabled'], 'pmd_wa_channel_scope_idx');
            });
        }

        if (!$schema->hasTable('pmd_whatsapp_messages')) {
            $schema->create('pmd_whatsapp_messages', function (Blueprint $table): void {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('channel_id');
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('location_id');
                $table->string('external_message_id', 191)->unique();
                $table->char('wa_id_hash', 64);
                $table->text('wa_id_ciphertext');
                $table->string('direction', 12);
                $table->string('kind', 24);
                $table->text('body_ciphertext');
                $table->string('delivery_status', 24)->default('received');
                $table->timestamp('received_at');
                $table->timestamps();
                $table->index(['tenant_id', 'location_id', 'received_at'], 'pmd_wa_inbox_scope_idx');
                $table->index(['channel_id', 'wa_id_hash', 'received_at'], 'pmd_wa_conversation_idx');
            });
        }
    }
}
