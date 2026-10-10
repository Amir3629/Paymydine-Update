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

        // Pending connection requests are not Meta authorizations. An operator
        // must verify ownership and provision a real WABA/number separately.
        if (!$schema->hasTable('pmd_whatsapp_connection_requests')) {
            $schema->create('pmd_whatsapp_connection_requests', function (Blueprint $table): void {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('location_id');
                $table->string('status', 24)->default('requested');
                $table->timestamps();
                $table->unique(['tenant_id', 'location_id'], 'pmd_wa_connect_tenant_location_uq');
                $table->index(['status', 'created_at'], 'pmd_wa_connection_queue_idx');
            });
        }

        // R33: independent shared-number plane. A Meta phone remains UNIQUE
        // to PayMyDine itself; each tenant gets a scoped permission grant.
        // Never insert the shared number into pmd_whatsapp_channels.
        if (!$schema->hasTable('pmd_wa_shared_senders')) {
            $schema->create('pmd_wa_shared_senders', function (Blueprint $table): void {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->string('phone_number_id', 32)->unique();
                $table->string('waba_id', 32);
                $table->boolean('enabled')->default(false);
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_wa_shared_locations')) {
            $schema->create('pmd_wa_shared_locations', function (Blueprint $table): void {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('sender_id');
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('location_id');
                $table->boolean('enabled')->default(false);
                $table->timestamps();
                $table->unique(['sender_id', 'tenant_id', 'location_id'], 'pmd_wa_shared_scope_unique');
                $table->index(['tenant_id', 'location_id', 'enabled'], 'pmd_wa_shared_location_idx');
            });
        }

        if (!$schema->hasTable('pmd_wa_shared_consents')) {
            $schema->create('pmd_wa_shared_consents', function (Blueprint $table): void {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('reservation_id');
                $table->char('wa_id_hash', 64);
                $table->string('source', 48)->default('public_booking_opt_in');
                $table->string('locale', 2)->nullable();
                $table->timestamp('consented_at');
                $table->timestamp('revoked_at')->nullable();
                $table->timestamps();
                $table->unique(['tenant_id', 'location_id', 'reservation_id'], 'pmd_wa_shared_consent_res_unique');
                $table->index(['wa_id_hash', 'revoked_at'], 'pmd_wa_shared_consent_phone_idx');
            });
        }

        // STOP is global to the single PayMyDine sender: never continue
        // sending another restaurant's reservation after a shared opt-out.
        // R34 additive upgrade. R33 may already have installed this table.
        // Historical rows have an unknown language; do not invent English.
        if ($schema->hasTable('pmd_wa_shared_consents')
            && !$schema->hasColumn('pmd_wa_shared_consents', 'locale')) {
            $schema->table('pmd_wa_shared_consents', function (Blueprint $table): void {
                $table->string('locale', 2)->nullable();
            });
        }

        if (!$schema->hasTable('pmd_wa_shared_optouts')) {
            $schema->create('pmd_wa_shared_optouts', function (Blueprint $table): void {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->char('wa_id_hash', 64)->unique();
                $table->timestamp('stopped_at');
                $table->timestamps();
            });
        }

        if (!$schema->hasTable('pmd_wa_shared_messages')) {
            $schema->create('pmd_wa_shared_messages', function (Blueprint $table): void {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('sender_id');
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('reservation_id')->nullable();
                $table->string('external_message_id', 191)->unique();
                $table->char('wa_id_hash', 64);
                $table->text('wa_id_ciphertext');
                $table->string('direction', 12);
                $table->string('kind', 24);
                $table->text('body_ciphertext');
                $table->string('delivery_status', 24)->default('received');
                $table->timestamp('received_at');
                $table->timestamps();
                $table->index(['tenant_id', 'location_id', 'received_at'], 'pmd_wa_shared_inbox_idx');
                $table->index(['sender_id', 'wa_id_hash', 'direction'], 'pmd_wa_shared_thread_idx');
            });
        }

        // Inbound without an authenticated Meta reply-to correlation is held
        // centrally only. Never guess a tenant from phone/name/reference.
        if (!$schema->hasTable('pmd_wa_shared_unrouted')) {
            $schema->create('pmd_wa_shared_unrouted', function (Blueprint $table): void {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->unsignedBigInteger('sender_id');
                $table->string('external_message_id', 191)->unique();
                $table->char('wa_id_hash', 64);
                $table->text('wa_id_ciphertext');
                $table->text('body_ciphertext');
                $table->string('kind', 24);
                $table->string('reason', 32);
                $table->timestamp('received_at');
                $table->timestamps();
                $table->index(['sender_id', 'received_at'], 'pmd_wa_shared_held_idx');
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
