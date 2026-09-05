#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
import sys

MARK = "PMD_VR_SIM_VISIBILITY_R2_20260905"

MODEL_REL = "app/admin/models/Terminal_devices_model.php"
PROVIDERS_REL = "app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php"


def fail(msg: str) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected one exact anchor, found {count}. The live file differs from the audited main branch.")
    return text.replace(old, new, 1)


def lint_php(path: Path) -> None:
    proc = subprocess.run(["php", "-l", str(path)], text=True, capture_output=True)
    output = (proc.stdout or proc.stderr).strip()
    if output:
        print(output)
    if proc.returncode != 0:
        raise RuntimeError(f"PHP lint failed: {path}")


def patch_model(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print(f"SKIP already patched: {path}")
        return

    old = r'''    public static function listProviderOptions(): array
    {
        // PMD_TERMINAL_DEVICE_MARKET_OPTIONS_R6B
        $implemented = [
            'sumup' => 'SumUp',
            'vr_payment' => 'VR Payment',
            'worldline' => 'Worldline Terminal API',
            'square' => 'Square Terminal API',
        ];

        try {
            $state = app(\App\Services\Platform\LocationPlatformContext::class)->state();
            if (!($state['resolved'] ?? false) || empty($state['profile'])) {
                return [];
            }
            $allowed = array_keys((array)($state['profile']['terminals']['providers'] ?? []));
            return array_intersect_key($implemented, array_fill_keys($allowed, true));
        } catch (\Throwable $error) {
            return [];
        }
    }
'''

    new = r'''    public static function listProviderOptions(): array
    {
        // PMD_TERMINAL_DEVICE_MARKET_OPTIONS_R6B
        $implemented = [
            'sumup' => 'SumUp',
            'vr_payment' => 'VR Payment',
            'worldline' => 'Worldline Terminal API',
            'square' => 'Square Terminal API',
        ];

        $options = [];

        try {
            $state = app(\App\Services\Platform\LocationPlatformContext::class)->state();
            if (($state['resolved'] ?? false) && !empty($state['profile'])) {
                $allowed = array_keys((array)($state['profile']['terminals']['providers'] ?? []));
                $options = array_intersect_key($implemented, array_fill_keys($allowed, true));
            }
        } catch (\Throwable $error) {
            $options = [];
        }

        // PMD_VR_SIM_VISIBILITY_R2_20260905
        // PMD's internal VR simulator is TEST-only and deliberately has no provider
        // hardware object. If it exists in this tenant, keep VR Payment visible even
        // when LocationPlatformContext is temporarily unresolved. This does NOT make
        // a real VR terminal eligible and does not relax market gating for any other
        // provider.
        try {
            if (
                \Illuminate\Support\Facades\Schema::hasTable('terminal_devices')
                && \Illuminate\Support\Facades\DB::table('terminal_devices')
                    ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                    ->where('is_active', 1)
                    ->where('reader_id', 'like', 'PMD-VR-SIM-%')
                    ->where(function ($query) {
                        if (\Illuminate\Support\Facades\Schema::hasColumn('terminal_devices', 'environment')) {
                            $query->whereRaw("LOWER(COALESCE(environment, 'test')) = ?", ['test']);
                        }
                    })
                    ->exists()
            ) {
                $options['vr_payment'] = $implemented['vr_payment'];
            }
        } catch (\Throwable $error) {
            // Keep the normal market-derived options if the supplemental probe fails.
        }

        return $options;
    }
'''
    text = replace_once(text, old, new, "Terminal_devices_model::listProviderOptions")
    path.write_text(text, encoding="utf-8")


def patch_terminal_provider_trait(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print(f"SKIP already patched: {path}")
        return

    anchor = r'''        // Worldline terminals are sourced from terminal_devices above.
        return $providers;
'''

    supplemental = r'''        // PMD_VR_SIM_VISIBILITY_R2_20260905
        // Always expose PMD's own TEST-only VR simulator rows to Waiter/Cashier POS,
        // even if the location market context has not resolved yet. Real provider
        // terminals are still handled exclusively by the market-gated loop above.
        try {
            $existingIds = array_map(
                static fn ($row): int => (int)($row['terminal_device_id'] ?? 0),
                $providers
            );

            $simulatorQuery = DB::table('terminal_devices')
                ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                ->where('is_active', 1)
                ->where('reader_id', 'like', 'PMD-VR-SIM-%')
                ->whereNotNull('reader_id')
                ->where('reader_id', '!=', '')
                ->orderBy('terminal_device_id');

            if (in_array('environment', $columns, true)) {
                $simulatorQuery->whereRaw("LOWER(COALESCE(environment, 'test')) = ?", ['test']);
            }

            foreach ($simulatorQuery->get() as $terminal) {
                $terminalDeviceId = (int)($terminal->terminal_device_id ?? 0);
                if ($terminalDeviceId <= 0 || in_array($terminalDeviceId, $existingIds, true)) {
                    continue;
                }

                $label = trim((string)($terminal->reader_label ?? ''));
                $status = strtolower(trim((string)($terminal->terminal_status ?? 'online')));
                $pairing = strtolower(trim((string)($terminal->pairing_state ?? 'paired')));

                $providers[] = [
                    'provider_code' => 'vr_payment',
                    'terminal_device_id' => $terminalDeviceId,
                    'provider_terminal_id' => null,
                    'reader_id' => (string)$terminal->reader_id,
                    'name' => $label !== '' ? $label : 'PMD VR Simulator',
                    'terminal_status' => $status !== '' ? $status : 'online',
                    'pairing_state' => $pairing !== '' ? $pairing : 'paired',
                    'environment' => in_array('environment', $columns, true)
                        ? (string)($terminal->environment ?? 'test')
                        : 'test',
                ];
            }
        } catch (\Throwable $ignored) {
        }

        // Worldline terminals are sourced from terminal_devices above.
        return $providers;
'''
    text = replace_once(text, anchor, supplemental, "PmdWaiterPosTerminalProvidersConcern return")
    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fix PMD VR Simulator visibility in Cashier/Waiter POS and Devices."
    )
    parser.add_argument("--root", default="/var/www/paymydine")
    parser.add_argument("--tenant", default="tomo")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    model = root / MODEL_REL
    providers = root / PROVIDERS_REL

    for path in [model, providers]:
        if not path.is_file():
            fail(f"Missing required file: {path}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup = root / "storage" / "pmd-vr-terminal-simulator-r1" / f"visibility-r2-{stamp}"
    backup.mkdir(parents=True, exist_ok=True)

    for rel in [MODEL_REL, PROVIDERS_REL]:
        src = root / rel
        dst = backup / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    print("Backup directory:", backup)

    try:
        patch_model(model)
        patch_terminal_provider_trait(providers)

        lint_php(model)
        lint_php(providers)

        seed = root / "scripts" / "pmd-vr-terminal-simulator-r1-seed.php"
        if seed.is_file():
            print("+ php", seed, f"--tenant={args.tenant}")
            proc = subprocess.run(
                ["php", str(seed), f"--tenant={args.tenant}"],
                cwd=root,
                text=True,
            )
            if proc.returncode != 0:
                raise RuntimeError("Simulator seed/verification failed after visibility patch.")
        else:
            print("WARNING: simulator seed script not found; source visibility patch is still installed.")

        print("\nSUCCESS")
        print("Patch marker:", MARK)
        print("Backup:", backup)
        print("\nExpected result:")
        print("  - /admin/settings/devices can expose VR Payment simulator inventory.")
        print("  - Cashier/Waiter Pay modal shows a Terminal option.")
        print("  - Terminal list contains the 5 PMD VR Simulator scenarios.")
        print("\nIf the browser was already open, hard-refresh it before testing.")

    except Exception as exc:
        print(f"\nPATCH FAILED: {exc}", file=sys.stderr)
        print("Restoring backups...", file=sys.stderr)
        for rel in [MODEL_REL, PROVIDERS_REL]:
            src = backup / rel
            dst = root / rel
            if src.is_file():
                shutil.copy2(src, dst)
        raise


if __name__ == "__main__":
    main()
