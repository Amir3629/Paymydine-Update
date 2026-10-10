<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminLocation;
use Admin\Facades\Template;
use App\Services\WhatsApp\PmdWhatsAppGateway;
use App\Services\WhatsApp\PmdWhatsAppSchema;
use Illuminate\Validation\ValidationException;

/**
 * R30 owner/staff WhatsApp conversation view. Uses canonical Admin auth,
 * CSRF protection and Site.Settings permission (separate role later).
 */
final class Pmdwhatsappinbox extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function index()
    {
        Template::setTitle('WhatsApp Inbox');
        Template::setHeading('WhatsApp Inbox');

        [$tenantId, $locationId] = $this->scope();
        $this->vars['pmdWhatsAppInstalled'] = app(PmdWhatsAppSchema::class)->installed();
        $this->vars['pmdWhatsAppMessages'] = app(PmdWhatsAppGateway::class)
            ->recent($tenantId, $locationId);
        $this->vars['pmdWhatsAppLocation'] = $locationId;

        return $this->makeView('pmdwhatsappinbox/index');
    }

    public function onReply()
    {
        [$tenantId, $locationId] = $this->scope();
        $id = (int)post('message_id', 0);
        $reply = trim((string)post('reply_text', ''));

        if ($id < 1 || $reply === '' || mb_strlen($reply) > 1600) {
            throw ValidationException::withMessages([
                'reply_text' => ['Please enter a reply of at most 1600 characters.'],
            ]);
        }

        try {
            app(PmdWhatsAppGateway::class)->reply($tenantId, $locationId, $id, $reply);
        } catch (\Throwable $error) {
            // No provider details/tokens in the browser or flash session.
            throw ValidationException::withMessages([
                'reply_text' => ['Reply not sent. Check the channel setup and 24-hour reply window.'],
            ]);
        }

        flash()->success('WhatsApp reply accepted by Meta.');
        return [
            '#pmd-wa-reply-status' => '<span role="status">Reply accepted by Meta.</span>',
        ];
    }

    private function scope(): array
    {
        // R30: never accept tenant_id or location_id from browser input.
        $tenant = request()->attributes->get('tenant');
        if (!$tenant && app()->bound('tenant')) {
            $tenant = app('tenant');
        }
        $tenantId = (int)($tenant->id ?? 0);

        $location = AdminLocation::current();
        $locationId = (int)($location->location_id ?? 0);
        if ($tenantId < 1 || $locationId < 1) {
            abort(403);
        }

        return [$tenantId, $locationId];
    }
}
