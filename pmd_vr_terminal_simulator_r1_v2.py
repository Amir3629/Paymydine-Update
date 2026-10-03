#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import shlex

MARK = "PMD_VR_TERMINAL_SIMULATOR_R1_20260905"


def fail(msg: str) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def run(cmd, cwd=None, check=True):
    print("+", " ".join(str(x) for x in cmd))
    return subprocess.run(cmd, cwd=cwd, check=check, text=True)


def backup_file(root: Path, backup: Path, rel: str) -> None:
    src = root / rel
    dst = backup / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def replace_exact(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly one anchor, found {count}. Live code differs from the audited main branch.")
    return text.replace(old, new, 1)


def replace_regex(text: str, pattern: str, replacement: str, label: str) -> str:
    # Use a callable replacement so backslashes in generated PHP namespaces
    # (for example \Admin\Classes\...) are treated literally rather than
    # interpreted as Python regex replacement escapes such as \A.
    compiled = re.compile(pattern, flags=re.S)
    out, count = compiled.subn(lambda _m: replacement, text, count=1)
    if count != 1:
        fail(f"{label}: expected exactly one regex anchor, found {count}. Live code differs from the audited main branch.")
    return out


def patch_vr_gateway(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print(f"SKIP already patched: {path}")
        return

    old = """        $sync = $this->syncTerminalDevices($audit['terminals'] ?? [], $config);
        $methodSync = $this->syncAssignedMethodStatuses((array)($audit['available_method_codes'] ?? [])); // PMD_VR_METHOD_STATUS_SYNC_R1_3
        $this->forgetReadinessCache($config);

        return [
"""
    new = f"""        $sync = $this->syncTerminalDevices($audit['terminals'] ?? [], $config);
        $methodSync = $this->syncAssignedMethodStatuses((array)($audit['available_method_codes'] ?? [])); // PMD_VR_METHOD_STATUS_SYNC_R1_3

        // {MARK}
        // Provider API inventory is not the same thing as a usable device.
        // Internal PMD simulators are deliberately counted separately.
        $usableRealTerminalCount = 0;
        $pmdSimulatorCount = 0;
        if (Schema::hasTable('terminal_devices')) {{
            $vrInventory = DB::table('terminal_devices')
                ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                ->where('is_active', 1)
                ->whereNotNull('reader_id')
                ->where('reader_id', '!=', '');

            $pmdSimulatorCount = (clone $vrInventory)
                ->where('reader_id', 'like', 'PMD-VR-SIM-%')
                ->count();

            $usableRealTerminalCount = (clone $vrInventory)
                ->where('reader_id', 'not like', 'PMD-VR-SIM-%')
                ->count();
        }}

        $this->forgetReadinessCache($config);

        return [
"""
    text = replace_exact(text, old, new, "VR probe inventory split")

    old = """            'terminal_count' => (int)($audit['terminal_count'] ?? 0),
            'terminal_sync' => $sync,
            'method_sync' => $methodSync,
"""
    new = """            'api_terminal_count' => (int)($audit['terminal_count'] ?? 0),
            'terminal_count' => (int)$usableRealTerminalCount,
            'usable_terminal_count' => (int)$usableRealTerminalCount,
            'pmd_simulator_count' => (int)$pmdSimulatorCount,
            'pmd_simulator_ready' => $pmdSimulatorCount > 0,
            'terminal_sync' => $sync,
            'method_sync' => $methodSync,
"""
    text = replace_exact(text, old, new, "VR probe return counts")

    old = """        $columns = Schema::getColumnListing('terminal_devices');
        $synced = 0;
        $seenReaderIds = [];
"""
    new = f"""        $columns = Schema::getColumnListing('terminal_devices');
        $synced = 0;
        $usableSynced = 0;
        $seenReaderIds = [];

        // {MARK}
        // A VR terminal is selectable only when the provider says it is online
        // AND the API exposes a concrete device serial. This intentionally fails
        // closed for logical/unlinked terminal records.
"""
    text = replace_exact(text, old, new, "VR sync counters")

    old = """            $readerId = trim((string)($terminal['identifier'] ?? '')) ?: (string)$providerId;
            $seenReaderIds[] = $readerId;

            $payload = [
"""
    new = """            $readerId = trim((string)($terminal['identifier'] ?? '')) ?: (string)$providerId;
            $seenReaderIds[] = $readerId;
            $usable = (bool)($terminal['online'] ?? false)
                && trim((string)($terminal['serial_number'] ?? '')) !== '';

            $payload = [
"""
    text = replace_exact(text, old, new, "VR usable decision")

    old = """                'terminal_status' => ($terminal['online'] ?? false) ? 'online' : (string)($terminal['state'] ?? 'unknown'),
                'pairing_state' => (string)($terminal['state'] ?? 'unknown'),
                'environment' => (string)($config['mode'] ?? 'test'),
                'is_active' => 1,
"""
    new = """                'terminal_status' => $usable ? 'online' : (string)($terminal['state'] ?? 'unknown'),
                'pairing_state' => $usable ? 'ready' : (string)($terminal['state'] ?? 'unknown'),
                'environment' => (string)($config['mode'] ?? 'test'),
                'is_active' => $usable ? 1 : 0,
"""
    text = replace_exact(text, old, new, "VR sync active state")

    old = """            $synced++;
        }

        if ($seenReaderIds && in_array('reader_id', $columns, true) && in_array('is_active', $columns, true)) {
"""
    new = """            $synced++;
            if ($usable) $usableSynced++;
        }

        if ($seenReaderIds && in_array('reader_id', $columns, true) && in_array('is_active', $columns, true)) {
"""
    text = replace_exact(text, old, new, "VR usable sync count")

    old = """                ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                ->whereNotIn('reader_id', $seenReaderIds)
                ->update(array_intersect_key([
"""
    new = """                ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                ->where('reader_id', 'not like', 'PMD-VR-SIM-%')
                ->whereNotIn('reader_id', $seenReaderIds)
                ->update(array_intersect_key([
"""
    text = replace_exact(text, old, new, "VR simulator sync exclusion")

    old = """        return ['ok' => true, 'synced' => $synced];
"""
    new = """        return [
            'ok' => true,
            'synced' => $synced,
            'usable' => $usableSynced,
        ];
"""
    text = replace_exact(text, old, new, "VR sync result")
    write_text(path, text)


def patch_payments_controller(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print(f"SKIP already patched: {path}")
        return
    old = """                'available_method_codes' => $probe['available_method_codes'] ?? [],
                'terminal_count' => $probe['terminal_count'] ?? 0,
                'terminal_sync' => $probe['terminal_sync'] ?? null,
"""
    new = f"""                'available_method_codes' => $probe['available_method_codes'] ?? [],
                // {MARK}
                'api_terminal_count' => $probe['api_terminal_count'] ?? 0,
                'terminal_count' => $probe['terminal_count'] ?? 0,
                'usable_terminal_count' => $probe['usable_terminal_count'] ?? ($probe['terminal_count'] ?? 0),
                'pmd_simulator_count' => $probe['pmd_simulator_count'] ?? 0,
                'pmd_simulator_ready' => (bool)($probe['pmd_simulator_ready'] ?? false),
                'terminal_sync' => $probe['terminal_sync'] ?? null,
"""
    text = replace_exact(text, old, new, "Payments VR test response")
    write_text(path, text)


def patch_terminal_service(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print(f"SKIP already patched: {path}")
        return

    create_pattern = r"""        // PMD_VR_TERMINAL_ROUTING_R1
        if\(\$providerCode==='vr_payment'\)\{.*?
        \}
        if\(\$providerCode==='worldline'\)\{"""
    create_replacement = f"""        // PMD_VR_TERMINAL_ROUTING_R1
        // {MARK}
        if($providerCode==='vr_payment'){{
            $terminal=$this->resolveVrPaymentTerminal($terminalId);
            if(!$terminal) return ['success'=>false,'error'=>'No ready VR Payment terminal is available. Use a PMD VR Simulator in TEST mode or link a real VR terminal.'];
            $simulatorScenario=$this->vrPaymentSimulatorScenario($terminal);
            if($simulatorScenario!==null){{
                $vrConfig=app(\\Admin\\Classes\\VRPaymentGatewayService::class)->getConfig();
                $config=array_merge($config,$vrConfig);
                if(strtolower(trim((string)($config['mode']??'test')))!=='test'){{
                    return ['success'=>false,'error'=>'PMD VR Simulator is TEST-only and is blocked while VR Payment is in live mode.'];
                }}
                $config['pmd_vr_simulator']=true;
                $config['pmd_vr_simulator_scenario']=$simulatorScenario;
                $config['environment']='test';
                $config['terminal_device_id']=(int)$terminal->terminal_device_id;
                $config['reader_id']=(string)$terminal->reader_id;
                $terminalId=(string)$terminal->reader_id;
            }}else{{
                $providerTerminalId=Schema::hasColumn('terminal_devices','provider_terminal_id')?(string)($terminal->provider_terminal_id??''):'';
                if($providerTerminalId===''&&ctype_digit((string)($terminal->reader_id??'')))$providerTerminalId=(string)$terminal->reader_id;
                if($providerTerminalId==='')return ['success'=>false,'error'=>'Selected VR Payment terminal has no provider terminal ID. Re-test the provider connection.'];
                $config['terminal_id']=$providerTerminalId;
                $config['provider_terminal_id']=$providerTerminalId;
                $config['terminal_device_id']=(int)$terminal->terminal_device_id;
                $config['reader_id']=(string)$terminal->reader_id;
                $terminalId=(string)$terminal->reader_id;
            }}
        }}
        if($providerCode==='worldline'){{"""
    text = replace_regex(text, create_pattern, create_replacement, "Terminal create VR branch")

    refresh_pattern = r"""        if\(\$providerCode==='vr_payment'\)\{
            \$terminal=\$this->resolveVrPaymentTerminal\(\(string\)\(\$attempt\['terminal_id'\]\?\?''\)\);.*?
        \}
        if\(\$providerCode==='worldline'\)\{"""
    refresh_replacement = f"""        if($providerCode==='vr_payment'){{
            $terminal=$this->resolveVrPaymentTerminal((string)($attempt['terminal_id']??''));
            if(!$terminal)return ['success'=>false,'error'=>'VR Payment terminal for this attempt was not found.'];
            $simulatorScenario=$this->vrPaymentSimulatorScenario($terminal);
            if($simulatorScenario!==null){{
                $vrConfig=app(\\Admin\\Classes\\VRPaymentGatewayService::class)->getConfig();
                $config=array_merge($config,$vrConfig);
                if(strtolower(trim((string)($config['mode']??'test')))!=='test'){{
                    return ['success'=>false,'error'=>'PMD VR Simulator is TEST-only and is blocked while VR Payment is in live mode.'];
                }}
                $config['pmd_vr_simulator']=true;
                $config['pmd_vr_simulator_scenario']=$simulatorScenario;
                $config['environment']='test';
                $config['terminal_device_id']=(int)$terminal->terminal_device_id;
                $config['reader_id']=(string)$terminal->reader_id;
            }}else{{
                $providerTerminalId=Schema::hasColumn('terminal_devices','provider_terminal_id')?(string)($terminal->provider_terminal_id??''):'';
                if($providerTerminalId===''&&ctype_digit((string)($terminal->reader_id??'')))$providerTerminalId=(string)$terminal->reader_id;
                $config['terminal_id']=$providerTerminalId;
                $config['provider_terminal_id']=$providerTerminalId;
                $config['terminal_device_id']=(int)$terminal->terminal_device_id;
                $config['reader_id']=(string)$terminal->reader_id;
            }}
        }}
        if($providerCode==='worldline'){{"""
    text = replace_regex(text, refresh_pattern, refresh_replacement, "Terminal refresh VR branch")

    helper_anchor = """    private function resolveSquareTerminal(?string $terminalId=null)
"""
    helper = f"""    // {MARK}
    private function vrPaymentSimulatorScenario($terminal): ?string
    {{
        if(!$terminal)return null;
        $readerId=strtoupper(trim((string)($terminal->reader_id??'')));
        if(!str_starts_with($readerId,'PMD-VR-SIM-'))return null;
        $allowed=['approve','decline','cancel','timeout','delayed_success'];
        $metadata=[];
        $raw=(string)($terminal->metadata??'');
        if($raw!==''){{
            $decoded=json_decode($raw,true);
            if(is_array($decoded))$metadata=$decoded;
        }}
        $scenario=strtolower(trim((string)($metadata['scenario']??'')));
        if(in_array($scenario,$allowed,true))return $scenario;
        $suffix=substr($readerId,strlen('PMD-VR-SIM-'));
        return match($suffix){{
            'APPROVE'=>'approve',
            'DECLINE'=>'decline',
            'CANCEL'=>'cancel',
            'TIMEOUT'=>'timeout',
            'DELAYED'=>'delayed_success',
            default=>null,
        }};
    }}

"""
    text = replace_exact(text, helper_anchor, helper + helper_anchor, "VR simulator scenario helper")
    write_text(path, text)


def patch_vr_terminal_provider(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print(f"SKIP already patched: {path}")
        return

    old = """        $client = new VrPaymentApiClient($config);
        $validation = $client->validateConfiguration();
        if (!($validation['ok'] ?? false)) return $validation;

        $terminalId = trim((string)($config['terminal_id'] ?? $config['provider_terminal_id'] ?? ''));
"""
    new = f"""        $client = new VrPaymentApiClient($config);
        $validation = $client->validateConfiguration();
        if (!($validation['ok'] ?? false)) return $validation;

        // {MARK}
        if (!empty($config['pmd_vr_simulator'])) {{
            if (strtolower(trim((string)($config['mode'] ?? 'test'))) !== 'test') {{
                return ['ok' => false, 'message' => 'PMD VR Simulator is blocked outside VR Payment TEST mode.'];
            }}
            $scenario = $this->simulatorScenario($config);
            if ($scenario === '') {{
                return ['ok' => false, 'message' => 'PMD VR Simulator scenario is invalid.'];
            }}
            return ['ok' => true, 'message' => 'PMD VR Simulator is ready. No request will be sent to VR Payment.'];
        }}

        $terminalId = trim((string)($config['terminal_id'] ?? $config['provider_terminal_id'] ?? ''));
"""
    text = replace_exact(text, old, new, "VR provider validate simulator")

    old = """        if ($amount <= 0) {
            return ['ok' => false, 'status' => 'failed', 'message' => 'VR Payment terminal amount must be greater than zero.'];
        }

        $currency = strtoupper(trim((string)($attempt['currency'] ?? $config['currency'] ?? 'EUR'))) ?: 'EUR';
"""
    new = """        if ($amount <= 0) {
            return ['ok' => false, 'status' => 'failed', 'message' => 'VR Payment terminal amount must be greater than zero.'];
        }

        if (!empty($config['pmd_vr_simulator'])) {
            return $this->simulateCreate($attempt, $config);
        }

        $currency = strtoupper(trim((string)($attempt['currency'] ?? $config['currency'] ?? 'EUR'))) ?: 'EUR';
"""
    text = replace_exact(text, old, new, "VR provider create simulator")

    old = """        $validation = $this->validateConfiguration($config);
        if (!($validation['ok'] ?? false)) {
            return ['ok' => false, 'status' => (string)($attempt['status'] ?? 'pending'), 'message' => $validation['message'] ?? 'VR Payment terminal configuration is invalid.'];
        }

        $reference = trim((string)($attempt['provider_reference'] ?? ''));
"""
    new = """        $validation = $this->validateConfiguration($config);
        if (!($validation['ok'] ?? false)) {
            return ['ok' => false, 'status' => (string)($attempt['status'] ?? 'pending'), 'message' => $validation['message'] ?? 'VR Payment terminal configuration is invalid.'];
        }

        if (!empty($config['pmd_vr_simulator'])) {
            return $this->simulateStatus($attempt, $config);
        }

        $reference = trim((string)($attempt['provider_reference'] ?? ''));
"""
    text = replace_exact(text, old, new, "VR provider status simulator")

    helpers = f"""
    // {MARK}
    private function simulatorScenario(array $config): string
    {{
        $scenario = strtolower(trim((string)($config['pmd_vr_simulator_scenario'] ?? '')));
        return in_array($scenario, ['approve', 'decline', 'cancel', 'timeout', 'delayed_success'], true) ? $scenario : '';
    }}

    private function simulatorReference(array $attempt, string $scenario): string
    {{
        $attemptId = (int)($attempt['id'] ?? 0);
        return 'PMD-VR-SIM-'.strtoupper($scenario).'-'.$attemptId;
    }}

    private function simulateCreate(array $attempt, array $config): array
    {{
        $scenario = $this->simulatorScenario($config);
        $reference = $this->simulatorReference($attempt, $scenario);
        $base = [
            'provider_reference' => $reference,
            'transaction_id' => $reference,
            'merchant_reference' => $reference,
            'simulator' => true,
            'simulator_scenario' => $scenario,
        ];

        return match ($scenario) {{
            'approve' => $base + ['ok'=>true,'status'=>'paid','message'=>'PMD VR Simulator approved the payment. No request was sent to VR Payment.'],
            'decline' => $base + ['ok'=>false,'status'=>'failed','message'=>'PMD VR Simulator declined the payment. No request was sent to VR Payment.'],
            'cancel' => $base + ['ok'=>true,'status'=>'cancelled','message'=>'PMD VR Simulator cancelled the payment. No request was sent to VR Payment.'],
            'timeout' => $base + ['ok'=>true,'status'=>'sent_to_terminal','message'=>'PMD VR Simulator is simulating a terminal timeout. Refresh will remain pending.'],
            'delayed_success' => $base + ['ok'=>true,'status'=>'sent_to_terminal','message'=>'PMD VR Simulator accepted the request. Refresh after about 5 seconds to simulate approval.'],
            default => ['ok'=>false,'status'=>'failed','message'=>'PMD VR Simulator scenario is invalid.','simulator'=>true],
        }};
    }}

    private function simulateStatus(array $attempt, array $config): array
    {{
        $scenario = $this->simulatorScenario($config);
        $reference = trim((string)($attempt['provider_reference'] ?? ''));
        if ($reference === '') $reference = $this->simulatorReference($attempt, $scenario);
        $base = [
            'ok'=>true,
            'provider_reference'=>$reference,
            'transaction_id'=>$reference,
            'simulator'=>true,
            'simulator_scenario'=>$scenario,
        ];

        if ($scenario === 'delayed_success') {{
            $createdAt = strtotime((string)($attempt['created_at'] ?? '')) ?: time();
            $elapsed = max(0, time() - $createdAt);
            if ($elapsed >= 5) return $base + ['status'=>'paid','message'=>'PMD VR Simulator delayed payment is now approved. No request was sent to VR Payment.'];
            return $base + ['status'=>'sent_to_terminal','message'=>'PMD VR Simulator delayed payment is still pending ('.$elapsed.'s / 5s).'];
        }}

        return match ($scenario) {{
            'approve' => $base + ['status'=>'paid','message'=>'PMD VR Simulator payment is approved.'],
            'decline' => $base + ['status'=>'failed','message'=>'PMD VR Simulator payment is declined.'],
            'cancel' => $base + ['status'=>'cancelled','message'=>'PMD VR Simulator payment is cancelled.'],
            'timeout' => $base + ['status'=>'sent_to_terminal','message'=>'PMD VR Simulator timeout remains pending by design.'],
            default => ['ok'=>false,'status'=>(string)($attempt['status']??'pending'),'message'=>'PMD VR Simulator scenario is invalid.','simulator'=>true],
        }};
    }}
"""
    idx = text.rfind("\n}")
    if idx < 0:
        fail("VR provider class closing brace not found.")
    text = text[:idx] + helpers + text[idx:]
    write_text(path, text)


SEED_PHP = r'''#!/usr/bin/env php
<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}

$options = getopt('', ['tenant:', 'remove', 'help']);
if (isset($options['help'])) {
    echo "Usage:\n";
    echo "  php scripts/pmd-vr-terminal-simulator-r1-seed.php --tenant=tomo\n";
    echo "  php scripts/pmd-vr-terminal-simulator-r1-seed.php --tenant=tomo --remove\n";
    exit(0);
}

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Admin\Classes\VRPaymentGatewayService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$tenantDomain = strtolower(trim((string)($options['tenant'] ?? '')));
if ($tenantDomain === '') {
    fwrite(STDERR, "--tenant is required.\n");
    exit(3);
}
if (!str_contains($tenantDomain, '.')) $tenantDomain .= '.paymydine.com';

$tenant = DB::connection('mysql')->table('tenants')->whereRaw('LOWER(domain) = ?', [$tenantDomain])->first();
if (!$tenant) {
    fwrite(STDERR, "Tenant not found: {$tenantDomain}\n");
    exit(4);
}
$tenantDb = trim((string)($tenant->database ?? $tenant->database_name ?? ''));
if ($tenantDb === '') {
    fwrite(STDERR, "Tenant database is missing for {$tenantDomain}\n");
    exit(5);
}

Config::set('database.connections.mysql.database', $tenantDb);
DB::purge('mysql');
DB::reconnect('mysql');

if (!Schema::hasTable('terminal_devices')) {
    fwrite(STDERR, "terminal_devices table is missing in {$tenantDb}\n");
    exit(6);
}

$service = app(VRPaymentGatewayService::class);
$config = $service->getConfig();
if (strtolower(trim((string)($config['mode'] ?? 'test'))) !== 'test') {
    fwrite(STDERR, "Refusing to seed PMD VR Simulator because VR Payment is not in TEST mode.\n");
    exit(7);
}

$prefix = 'PMD-VR-SIM-';

if (isset($options['remove'])) {
    $deleted = DB::table('terminal_devices')
        ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
        ->where('reader_id', 'like', $prefix.'%')
        ->delete();
    echo "Removed {$deleted} PMD VR simulator terminal row(s) from {$tenantDomain}.\n";
    exit(0);
}

$columns = Schema::getColumnListing('terminal_devices');
$scenarios = [
    'APPROVE' => ['label' => 'PMD VR Simulator - Approve', 'scenario' => 'approve'],
    'DECLINE' => ['label' => 'PMD VR Simulator - Decline', 'scenario' => 'decline'],
    'CANCEL' => ['label' => 'PMD VR Simulator - Cancel', 'scenario' => 'cancel'],
    'TIMEOUT' => ['label' => 'PMD VR Simulator - Timeout', 'scenario' => 'timeout'],
    'DELAYED' => ['label' => 'PMD VR Simulator - Delayed Success', 'scenario' => 'delayed_success'],
];

foreach ($scenarios as $suffix => $row) {
    $readerId = $prefix.$suffix;
    $payload = [
        'provider_code' => 'vr_payment',
        'environment' => 'test',
        'location_id' => null,
        'affiliate_key' => null,
        'reader_id' => $readerId,
        'reader_label' => $row['label'],
        'pairing_state' => 'paired',
        'terminal_status' => 'online',
        'metadata' => json_encode([
            'pmd_vr_simulator' => true,
            'scenario' => $row['scenario'],
            'provider_network_call' => false,
            'seed_version' => 'R1_20260905',
        ], JSON_UNESCAPED_SLASHES),
        'is_active' => 1,
        'provider_terminal_id' => null,
        'serial_number' => null,
        'updated_at' => now(),
    ];
    $payload = array_intersect_key($payload, array_flip($columns));

    $existing = DB::table('terminal_devices')
        ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
        ->where('reader_id', $readerId)
        ->first();

    if ($existing) {
        DB::table('terminal_devices')
            ->where('terminal_device_id', (int)$existing->terminal_device_id)
            ->update($payload);
    } else {
        if (in_array('created_at', $columns, true)) $payload['created_at'] = now();
        DB::table('terminal_devices')->insert($payload);
    }
}

$probe = $service->probeConnectivity();

echo "\nPMD VR simulator seed complete.\n";
echo "Tenant: {$tenantDomain}\n";
echo "Tenant DB: {$tenantDb}\n";
echo "VR Space: ".($probe['space_id'] ?? 'unknown')."\n";
echo "VR API terminal records: ".(int)($probe['api_terminal_count'] ?? 0)."\n";
echo "Usable real VR terminals: ".(int)($probe['terminal_count'] ?? 0)."\n";
echo "PMD VR simulators: ".(int)($probe['pmd_simulator_count'] ?? 0)."\n";
echo "Available online methods: ".implode(', ', (array)($probe['available_method_codes'] ?? []))."\n";
echo "\nVR terminal rows:\n";

$rows = DB::table('terminal_devices')
    ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
    ->orderBy('terminal_device_id')
    ->get();

foreach ($rows as $terminal) {
    echo sprintf(
        "  #%s | active=%s | %s | reader=%s | status=%s | pairing=%s\n",
        (string)($terminal->terminal_device_id ?? ''),
        !empty($terminal->is_active) ? 'yes' : 'no',
        (string)($terminal->reader_label ?? ''),
        (string)($terminal->reader_id ?? ''),
        (string)($terminal->terminal_status ?? ''),
        (string)($terminal->pairing_state ?? '')
    );
}

echo "\nIMPORTANT: PMD VR Simulator is internal TEST-only simulation. It never calls VR Payment.\n";
echo "Real VR certification still requires a provider-linked VR terminal/simulator.\n";
'''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="/var/www/paymydine")
    parser.add_argument("--tenant", default="tomo")
    parser.add_argument("--no-seed", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    targets = [
        "app/admin/classes/VRPaymentGatewayService.php",
        "app/admin/controllers/Payments.php",
        "app/Services/TerminalPayments/TerminalPaymentService.php",
        "app/Services/TerminalPayments/VrPaymentTerminalProvider.php",
    ]
    for rel in targets:
        if not (root / rel).is_file():
            fail(f"Missing required file: {root / rel}")
    if not (root / "bootstrap/app.php").is_file():
        fail(f"{root} does not look like the PayMyDine project root.")

    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup = root / "storage" / "pmd-vr-terminal-simulator-r1" / stamp
    backup.mkdir(parents=True, exist_ok=True)
    print(f"Backup directory: {backup}")

    for rel in targets:
        backup_file(root, backup, rel)

    try:
        patch_vr_gateway(root / targets[0])
        patch_payments_controller(root / targets[1])
        patch_terminal_service(root / targets[2])
        patch_vr_terminal_provider(root / targets[3])

        seed_path = root / "scripts" / "pmd-vr-terminal-simulator-r1-seed.php"
        seed_path.parent.mkdir(parents=True, exist_ok=True)
        write_text(seed_path, SEED_PHP)
        os.chmod(seed_path, 0o755)

        for file in [root / rel for rel in targets] + [seed_path]:
            result = subprocess.run(["php", "-l", str(file)], text=True, capture_output=True)
            print(result.stdout.strip() or result.stderr.strip())
            if result.returncode != 0:
                raise RuntimeError(f"PHP lint failed: {file}")

        rollback = backup / "ROLLBACK.sh"
        lines = ["#!/usr/bin/env bash", "set -e"]
        for rel in targets:
            lines.append(f"cp {shlex.quote(str(backup / rel))} {shlex.quote(str(root / rel))}")
        lines.append("echo 'Source files restored.'")
        lines.append(f"echo 'Remove simulator rows with: php {shlex.quote(str(seed_path))} --tenant={shlex.quote(args.tenant)} --remove'")
        write_text(rollback, "\n".join(lines) + "\n")
        os.chmod(rollback, 0o755)

        if not args.no_seed:
            run(["php", str(seed_path), f"--tenant={args.tenant}"], cwd=root)

        print("\nSUCCESS")
        print("Patch marker:", MARK)
        print("Backup:", backup)
        print("\nNext:")
        print("  Open TOMO Waiter POS -> Pay -> VR Payment.")
        print("  Start with 'PMD VR Simulator - Approve'.")
        print("  Then test Decline, Cancel, Timeout, and Delayed Success.")
        print("\nThe PMD simulator never calls VR Payment.")
        print(f"Remove simulators: php {seed_path} --tenant={args.tenant} --remove")

    except Exception as exc:
        print(f"\nPATCH FAILED: {exc}", file=sys.stderr)
        print("Restoring source backups...", file=sys.stderr)
        for rel in targets:
            src = backup / rel
            dst = root / rel
            if src.is_file():
                shutil.copy2(src, dst)
        raise


if __name__ == "__main__":
    main()
