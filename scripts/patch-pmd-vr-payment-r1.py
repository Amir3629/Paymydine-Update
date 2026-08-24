#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MARKER_SERVICE = "PMD_VR_TERMINAL_ROUTING_R1"
MARKER_BASELINE = "PMD_VR_TERMINAL_SCHEMA_R1"
MARKER_ADMIN = "PMD_VR_PAYMENT_ADMIN_R1"


def fail(msg):
    raise SystemExit("ERROR: " + msg)


def patch_terminal_service(path: Path):
    text = path.read_text(encoding="utf-8")
    if MARKER_SERVICE in text:
        return

    create_anchor = "        $validation=$provider->validateConfiguration($config);if(!($validation['ok']??false)) return ['success'=>false,'error'=>$validation['message']??'Provider is not configured.'];"
    if create_anchor not in text:
        fail("TerminalPaymentService create validation anchor missing")
    create_insert = r'''        // PMD_VR_TERMINAL_ROUTING_R1
        if($providerCode==='vr_payment'){
            $terminal=$this->resolveVrPaymentTerminal($terminalId);
            if(!$terminal) return ['success'=>false,'error'=>'No active VR Payment terminal is synced. Test the VR Payment connection first.'];
            $providerTerminalId=Schema::hasColumn('terminal_devices','provider_terminal_id')?(string)($terminal->provider_terminal_id??''):'';
            if($providerTerminalId===''&&ctype_digit((string)($terminal->reader_id??'')))$providerTerminalId=(string)$terminal->reader_id;
            if($providerTerminalId==='')return ['success'=>false,'error'=>'Selected VR Payment terminal has no provider terminal ID. Re-test the provider connection.'];
            $config['terminal_id']=$providerTerminalId;
            $config['provider_terminal_id']=$providerTerminalId;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $terminalId=(string)$terminal->reader_id;
        }
'''
    text = text.replace(create_anchor, create_insert + create_anchor, 1)

    refresh_anchor = "        $result=$provider->checkStatus($attempt,$config);$status=(string)($result['status']??($attempt['status']??'pending'));"
    if refresh_anchor not in text:
        fail("TerminalPaymentService refresh anchor missing")
    refresh_insert = r'''        if($providerCode==='vr_payment'){
            $terminal=$this->resolveVrPaymentTerminal((string)($attempt['terminal_id']??''));
            if(!$terminal)return ['success'=>false,'error'=>'VR Payment terminal for this attempt was not found.'];
            $providerTerminalId=Schema::hasColumn('terminal_devices','provider_terminal_id')?(string)($terminal->provider_terminal_id??''):'';
            if($providerTerminalId===''&&ctype_digit((string)($terminal->reader_id??'')))$providerTerminalId=(string)$terminal->reader_id;
            $config['terminal_id']=$providerTerminalId;
            $config['provider_terminal_id']=$providerTerminalId;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            $config['reader_id']=(string)$terminal->reader_id;
        }
'''
    text = text.replace(refresh_anchor, refresh_insert + refresh_anchor, 1)

    method_anchor = "    private function sumupReturnUrl(?int $attemptId=null):string"
    if method_anchor not in text:
        fail("TerminalPaymentService method insertion anchor missing")
    method = r'''    private function resolveVrPaymentTerminal(?string $terminalId=null)
    {
        if(!Schema::hasTable('terminal_devices'))return null;
        $query=DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?',['vr_payment'])->where('is_active',1)->whereNotNull('reader_id')->where('reader_id','!=','');
        $terminalId=trim((string)$terminalId);
        if($terminalId!=='')$query->where(function($q)use($terminalId){
            if(ctype_digit($terminalId)){
                $q->orWhere('terminal_device_id',(int)$terminalId);
                if(Schema::hasColumn('terminal_devices','provider_terminal_id'))$q->orWhere('provider_terminal_id',(int)$terminalId);
            }
            $q->orWhere('reader_id',$terminalId);
        });
        return $query->orderBy('terminal_device_id')->first();
    }

'''
    text = text.replace(method_anchor, method + method_anchor, 1)

    text = text.replace(
        "'error_message'=>'SumUp approved the terminal charge after another partial payment was recorded. Manual reconciliation required.'",
        "'error_message'=>'The terminal provider approved the charge after another partial payment was recorded. Manual reconciliation required.'"
    )
    text = text.replace("'notes'=>'Confirmed by SumUp Cloud terminal.'", "'notes'=>'Confirmed by terminal provider.'")

    path.write_text(text, encoding="utf-8")


def patch_baseline(path: Path):
    text = path.read_text(encoding="utf-8")
    if MARKER_BASELINE in text:
        return

    text = re.sub(r"public const VERSION = '[^']+';", "public const VERSION = '1.2.0';", text, count=1)

    step = "            $this->step($report, 'terminal_devices', fn () => $this->ensureTerminalDevices());"
    if step not in text:
        fail("baseline terminal_devices step missing")
    text = text.replace(step, step + "\n            $this->step($report, 'vr_terminal_device_fields', fn () => $this->ensureVrTerminalDeviceFields());", 1)

    anchor = "    protected function ensureSumupPosConfigFields(): array"
    if anchor not in text:
        fail("baseline ensureSumupPosConfigFields anchor missing")
    method = r'''    // PMD_VR_TERMINAL_SCHEMA_R1
    protected function ensureVrTerminalDeviceFields(): array
    {
        $schema = $this->schema();
        if (!$schema->hasTable('terminal_devices')) return ['skipped' => true, 'reason' => 'terminal_devices missing'];
        $columns = $schema->getColumnListing('terminal_devices');
        $missing = array_values(array_diff(['provider_terminal_id', 'serial_number', 'environment', 'last_seen_at'], $columns));
        if ($missing) {
            $schema->table('terminal_devices', function (Blueprint $table) use ($missing): void {
                if (in_array('provider_terminal_id', $missing, true)) $table->unsignedBigInteger('provider_terminal_id')->nullable()->index();
                if (in_array('serial_number', $missing, true)) $table->string('serial_number', 191)->nullable();
                if (in_array('environment', $missing, true)) $table->string('environment', 20)->nullable()->index();
                if (in_array('last_seen_at', $missing, true)) $table->timestamp('last_seen_at')->nullable();
            });
        }
        return ['columns_added' => $missing];
    }

'''
    text = text.replace(anchor, method + anchor, 1)
    path.write_text(text, encoding="utf-8")


def patch_payments(path: Path):
    text = path.read_text(encoding="utf-8")
    if MARKER_ADMIN in text:
        return

    old_block = r'''            'vr_payment' => [
                'mode' => ['label' => 'Mode', 'type' => 'select', 'span' => 'left', 'default' => 'test', 'options' => ['test' => 'Test / Sandbox', 'live' => 'Live / Production']],
                'api_base_url' => ['label' => 'API Base URL', 'type' => 'text', 'span' => 'left', 'comment' => 'Base URL for VR Payment API (no trailing slash required).'],
                'space_id' => ['label' => 'Space ID', 'type' => 'text', 'span' => 'right'],
                'user_id' => ['label' => 'User ID', 'type' => 'text', 'span' => 'left'],
                'auth_key' => ['label' => 'Auth Key', 'type' => 'text', 'span' => 'right', 'comment' => 'Saved value is shown; replace to update.'],
                'webhook_signing_key' => ['label' => 'Webhook Signing Key', 'type' => 'text', 'span' => 'left', 'comment' => 'Saved value is shown; replace to update.'],
                'preferred_integration_mode' => ['label' => 'Preferred Integration', 'type' => 'select', 'span' => 'right', 'default' => 'payment_page', 'options' => ['payment_page' => 'Hosted Payment Page']],
                'api_endpoint' => ['label' => 'Terminal API Endpoint', 'type' => 'text', 'span' => 'left', 'comment' => 'VR Payment / VR Bank terminal API base URL when provided.'],
                'merchant_id' => ['label' => 'Terminal Merchant ID', 'type' => 'text', 'span' => 'right'],
                'terminal_id' => ['label' => 'Terminal Device ID', 'type' => 'text', 'span' => 'left', 'comment' => 'Required for terminal/POS payments. Does not enable fake charges; certified terminal API mapping is still required.'],
            ],'''
    new_block = r'''            // PMD_VR_PAYMENT_ADMIN_R1
            'vr_payment' => [
                'vr_setup_guide' => [
                    'type' => 'section',
                    'label' => 'VR Payment Gateway + Cloud Till',
                    'comment' => 'Create an Application User in VR Payment, then enter the Space ID, Application User ID and Authentication Key. Test Connection performs a real API v2.0 audit, discovers active payment methods (including Wero/wallets when enabled in the Space), and syncs physical Cloud Till terminals automatically.',
                ],
                'mode' => ['label' => 'Mode', 'type' => 'select', 'span' => 'left', 'default' => 'test', 'options' => ['test' => 'Test / Sandbox', 'live' => 'Live / Production']],
                'api_base_url' => ['label' => 'Gateway Base URL', 'type' => 'text', 'span' => 'right', 'default' => 'https://gateway.vr-payment.de', 'comment' => 'Normally https://gateway.vr-payment.de. Do not append /api/v2.0.'],
                'space_id' => ['label' => 'Space ID', 'type' => 'text', 'span' => 'left', 'comment' => 'Numeric VR Payment Space ID.'],
                'user_id' => ['label' => 'Application User ID', 'type' => 'text', 'span' => 'right', 'comment' => 'Numeric Application User ID from Account → Users → Application Users.'],
                'auth_key' => ['label' => 'Authentication Key', 'type' => 'password', 'span' => 'left', 'comment' => 'Base64 authentication key shown when the VR Payment Application User key is created. Leave blank to keep the saved key.'],
                'currency' => ['label' => 'Currency', 'type' => 'text', 'span' => 'right', 'default' => 'EUR', 'comment' => 'Default transaction currency.'],
                'preferred_integration_mode' => ['label' => 'Guest Checkout', 'type' => 'select', 'span' => 'left', 'default' => 'payment_page', 'options' => ['payment_page' => 'VR Payment Page']],
                'language' => ['label' => 'Terminal Language', 'type' => 'text', 'span' => 'right', 'default' => 'de-DE', 'comment' => 'Used by Cloud Till terminal transactions.'],
            ],'''
    if old_block not in text:
        fail("Payments.php VR field block not found")
    text = text.replace(old_block, new_block, 1)

    text = text.replace("'vr_payment' => ['auth_key', 'webhook_signing_key'],", "'vr_payment' => ['auth_key'],")
    text = text.replace(
        "['code' => 'sumup', 'name' => 'SumUp', 'supported_methods' => ['card']],",
        "['code' => 'sumup', 'name' => 'SumUp', 'supported_methods' => ['card', 'apple_pay', 'google_pay']],"
    )

    old_test = r'''        } elseif ($code === 'vr_payment') {
            $diagnostics = app(\Admin\Classes\VRPaymentGatewayService::class)->getConfigForDiagnostics();
            $result = ['success' => (bool)($diagnostics['provider_enabled'] ?? false), 'message' => 'VR Payment diagnostics resolved.', 'diagnostics' => $diagnostics];
        }'''
    new_test = r'''        } elseif ($code === 'vr_payment') {
            $probe = app(\Admin\Classes\VRPaymentGatewayService::class)->probeConnectivity();
            $result = [
                'success' => (bool)($probe['ok'] ?? false),
                'message' => (string)($probe['message'] ?? $probe['error'] ?? 'VR Payment connection test completed.'),
                'connected' => (bool)($probe['connected'] ?? false),
                'space_id' => $probe['space_id'] ?? null,
                'available_method_codes' => $probe['available_method_codes'] ?? [],
                'terminal_count' => $probe['terminal_count'] ?? 0,
                'terminal_sync' => $probe['terminal_sync'] ?? null,
            ];
        }'''
    if old_test not in text:
        fail("Payments.php VR connection-test block not found")
    text = text.replace(old_test, new_test, 1)

    path.write_text(text, encoding="utf-8")


def main():
    if len(sys.argv) != 4:
        fail("usage: patch-pmd-vr-payment-r1.py <TerminalPaymentService.php> <PmdTenantProductBaselineR1.php> <Payments.php>")
    paths = [Path(p).resolve() for p in sys.argv[1:]]
    for p in paths:
        if not p.is_file(): fail(f"missing target: {p}")
    patch_terminal_service(paths[0])
    patch_baseline(paths[1])
    patch_payments(paths[2])
    print("PMD_VR_PAYMENT_R1_PATCH=OK")


if __name__ == '__main__':
    main()
